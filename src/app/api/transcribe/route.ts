import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function polishTranscription(rawText: string): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are helping format a voice transcription of a staff observation note. The raw transcription is a wall of text without proper formatting. Please:

1. Add paragraph breaks where there are natural topic shifts
2. Fix any obvious transcription errors or awkward phrasing
3. Keep the original meaning and tone intact
4. Do NOT add any new information or interpretation
5. Do NOT add bullet points or headers - just well-formatted paragraphs
6. Keep it concise and professional

Raw transcription:
${rawText}

Formatted observation (just return the formatted text, nothing else):`,
        },
      ],
    });

    const polishedText = message.content[0].type === 'text' ? message.content[0].text : rawText;
    return polishedText;
  } catch (error) {
    console.error('Error polishing transcription:', error);
    return rawText; // Fall back to raw text if polishing fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    });

    // Polish the transcription with Claude to add paragraphs and clean up
    const polishedText = await polishTranscription(transcription.text);

    return NextResponse.json({ text: polishedText });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
