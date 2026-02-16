'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, RefreshCw, Calendar, Loader2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';

function safeFormatDate(dateStr: string | null | undefined, formatStr: string): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return isValid(date) ? format(date, formatStr) : 'Invalid date';
}

interface AISummaryProps {
  subjectId: string;
  subjectName: string;
  firstObservationDate?: string;
  onSummaryLoaded?: (text: string) => void;
}

interface SummaryData {
  summary_text: string;
  start_date: string;
  end_date: string;
  observation_count: number;
  created_at?: string;
}

export function AISummary({ subjectId, subjectName, firstObservationDate, onSummaryLoaded }: AISummaryProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  async function generateSummary(forceRegenerate = false) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject_id: subjectId,
          start_date: startDate || undefined,
          force_regenerate: forceRegenerate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.observation_count === 0) {
          toast.error('No observations found for the selected period');
        } else {
          toast.error(data.error || 'Failed to generate summary');
        }
        return;
      }

      setSummary(data.summary);
      setCached(data.cached);
      onSummaryLoaded?.(data.summary.summary_text);

      if (data.cached) {
        toast.info('Showing cached summary (no new observations since last summary)');
      } else {
        toast.success('Summary generated successfully');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI Summary
            </CardTitle>
            <CardDescription className="mt-1">
              AI-generated performance summary
            </CardDescription>
          </div>
          {summary && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateSummary(true)}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {!summary ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Generate an AI-powered summary of all observations for {subjectName}.
              The summary will analyze patterns, strengths, and areas for improvement.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Calendar className="w-4 h-4" />
                {showDateFilter ? 'Hide date filter' : 'Filter by start date'}
              </button>

              {showDateFilter && (
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-sm">
                    Start Date (optional)
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={firstObservationDate ? format(new Date(firstObservationDate), 'yyyy-MM-dd') : undefined}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-gray-500">
                    Only include observations from this date onwards
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={() => generateSummary(false)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="px-2 py-1 bg-gray-100 rounded">
                {summary.observation_count} observations
              </span>
              <span className="px-2 py-1 bg-gray-100 rounded">
                {safeFormatDate(summary.start_date, 'MMM d, yyyy')} - {safeFormatDate(summary.end_date, 'MMM d, yyyy')}
              </span>
              {cached && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">
                  Cached
                </span>
              )}
            </div>

            <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-800">
              <ReactMarkdown>{summary.summary_text}</ReactMarkdown>
            </div>

            {summary.created_at && (
              <p className="text-xs text-gray-400 pt-2 border-t">
                Generated on {safeFormatDate(summary.created_at, 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
