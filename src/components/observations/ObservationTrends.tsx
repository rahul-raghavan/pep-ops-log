'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Observation } from '@/types/database';
import { TrendingUp } from 'lucide-react';

interface ObservationTrendsProps {
  observations: Observation[];
}

export function ObservationTrends({ observations }: ObservationTrendsProps) {
  // Calculate weekly counts for last 8 weeks
  const now = new Date();
  const weeks: { label: string; count: number }[] = [];

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i + 1) * 7);
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);

    const count = observations.filter((obs) => {
      const date = new Date(obs.observed_at);
      return date >= weekStart && date < weekEnd;
    }).length;

    const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    weeks.push({ label, count });
  }

  const maxCount = Math.max(...weeks.map((w) => w.count), 1);

  // Count by observation type
  const typeCounts: Record<string, number> = {};
  observations.forEach((obs) => {
    const type = obs.observation_type ?? 'untagged';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  const typeColors: Record<string, string> = {
    punctuality: 'bg-green-100 text-green-700',
    safety: 'bg-red-100 text-red-700',
    hygiene: 'bg-teal-100 text-teal-700',
    communication: 'bg-blue-100 text-blue-700',
    procedure: 'bg-purple-100 text-purple-700',
    parent_feedback: 'bg-amber-100 text-amber-700',
    other: 'bg-gray-100 text-gray-700',
    untagged: 'bg-gray-100 text-gray-500',
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Observation Trends
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
        {/* Weekly bar chart */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Last 8 weeks</p>
          <div className="flex items-end gap-1 sm:gap-2 h-24">
            {weeks.map((week, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-600 font-medium">
                  {week.count > 0 ? week.count : ''}
                </span>
                <div
                  className="w-full bg-blue-400 rounded-t transition-all"
                  style={{
                    height: `${Math.max((week.count / maxCount) * 100, week.count > 0 ? 8 : 2)}%`,
                    minHeight: week.count > 0 ? '4px' : '2px',
                    opacity: week.count > 0 ? 1 : 0.3,
                  }}
                />
                <span className="text-[10px] text-gray-400 truncate w-full text-center hidden sm:block">
                  {week.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Type breakdown */}
        {Object.keys(typeCounts).length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">By type</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(typeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <Badge
                    key={type}
                    className={`${typeColors[type] ?? 'bg-gray-100 text-gray-700'} text-xs`}
                    variant="secondary"
                  >
                    {type.replace('_', ' ')} ({count})
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
