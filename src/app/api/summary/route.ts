import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from our users table
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .single();

    if (!dbUser || !dbUser.is_active) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 403 });
    }

    const body = await request.json();
    const { subject_id, start_date, force_regenerate } = body;

    if (!subject_id) {
      return NextResponse.json({ error: 'subject_id is required' }, { status: 400 });
    }

    // Verify user has access to this subject
    const { data: subject } = await supabase
      .from('subjects')
      .select('*, current_center:centers(*)')
      .eq('id', subject_id)
      .single();

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found or access denied' }, { status: 404 });
    }

    // Build query for observations
    let observationsQuery = supabase
      .from('observations')
      .select('*')
      .eq('subject_id', subject_id)
      .order('observed_at', { ascending: true });

    // Apply start date filter if provided
    if (start_date) {
      observationsQuery = observationsQuery.gte('observed_at', start_date);
    }

    const { data: observations, error: obsError } = await observationsQuery;

    if (obsError) {
      console.error('Error fetching observations:', obsError);
      return NextResponse.json({ error: 'Failed to fetch observations' }, { status: 500 });
    }

    if (!observations || observations.length === 0) {
      return NextResponse.json({
        error: 'No observations found for the selected period',
        observation_count: 0
      }, { status: 404 });
    }

    const lastObservation = observations[observations.length - 1];
    const firstObservation = observations[0];

    // Check if we have an existing summary that's still valid
    if (!force_regenerate) {
      const { data: existingSummary } = await supabase
        .from('observation_summaries')
        .select('*')
        .eq('subject_id', subject_id)
        .eq('last_observation_id', lastObservation.id)
        .gte('start_date', start_date || firstObservation.observed_at)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingSummary) {
        return NextResponse.json({
          summary: existingSummary,
          cached: true,
          observation_count: observations.length,
        });
      }
    }

    // Build the prompt for Claude
    const observationsText = observations.map((obs, index) => {
      const date = new Date(obs.observed_at).toLocaleDateString();
      const type = obs.observation_type ? ` [${obs.observation_type.replace('_', ' ')}]` : '';
      return `${index + 1}. (${date})${type}: ${obs.transcript}`;
    }).join('\n\n');

    const prompt = `You are an HR assistant helping analyze staff performance observations for a school.

Staff Member: ${subject.name}
Role: ${subject.role.replace('_', ' ')}
Center: ${subject.current_center?.name || 'Unknown'}
Period: ${new Date(firstObservation.observed_at).toLocaleDateString()} to ${new Date(lastObservation.observed_at).toLocaleDateString()}
Number of Observations: ${observations.length}

Here are the observations logged for this staff member:

${observationsText}

Please provide a comprehensive summary that includes:
1. Overall performance assessment
2. Key strengths observed
3. Areas that need attention or improvement
4. Notable incidents (positive or negative)
5. Recommendations for management

Keep the summary professional, balanced, and actionable. Focus on patterns and trends rather than individual incidents unless they are significant.`;

    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    const summaryText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Save the summary to the database
    const { data: newSummary, error: saveError } = await supabase
      .from('observation_summaries')
      .insert({
        subject_id,
        summary_text: summaryText,
        start_date: start_date || firstObservation.observed_at,
        end_date: lastObservation.observed_at,
        observation_count: observations.length,
        last_observation_id: lastObservation.id,
        requested_by_user_id: dbUser.id,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving summary:', saveError);
      // Still return the summary even if we couldn't save it
      return NextResponse.json({
        summary: {
          summary_text: summaryText,
          start_date: start_date || firstObservation.observed_at,
          end_date: lastObservation.observed_at,
          observation_count: observations.length,
        },
        cached: false,
        observation_count: observations.length,
        save_error: true,
      });
    }

    return NextResponse.json({
      summary: newSummary,
      cached: false,
      observation_count: observations.length,
    });

  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
