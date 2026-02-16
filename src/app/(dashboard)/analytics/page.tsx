'use client';

import { useEffect, useState } from 'react';
import { useCenterContext } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Subject } from '@/types/database';
import { TrendingUp, Calendar, Users } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface SubjectObservationCount {
  subject: Subject;
  count: number;
}

interface CenterStats {
  center_id: string;
  center_name: string;
  observations_this_week: number;
  observations_this_month: number;
  top_subjects: SubjectObservationCount[];
}

export default function AnalyticsPage() {
  const { selectedCenterId, centers, user } = useCenterContext();
  const [stats, setStats] = useState<CenterStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      if (!selectedCenterId) return;

      setIsLoading(true);
      try {
      const supabase = createClient();

      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setDate(now.getDate() - 30);

      const centersToAnalyze =
        selectedCenterId === 'all'
          ? centers
          : centers.filter((c) => c.id === selectedCenterId);

      const statsPromises = centersToAnalyze.map(async (center) => {
        // Get observations this week
        const { count: weekCount } = await supabase
          .from('observations')
          .select('id', { count: 'exact' })
          .eq('center_id', center.id)
          .gte('logged_at', oneWeekAgo.toISOString());

        // Get observations this month
        const { count: monthCount } = await supabase
          .from('observations')
          .select('id', { count: 'exact' })
          .eq('center_id', center.id)
          .gte('logged_at', oneMonthAgo.toISOString());

        // Get top subjects by observation count (last 30 days)
        const { data: observationsData } = await supabase
          .from('observations')
          .select('subject_id, subject:subjects(id, name, role, current_center_id)')
          .eq('center_id', center.id)
          .gte('logged_at', oneMonthAgo.toISOString());

        // Count observations per subject
        const subjectCounts: Record<string, { subject: Subject; count: number }> = {};
        observationsData?.forEach((obs) => {
          if (obs.subject) {
            const subject = obs.subject as unknown as Subject;
            if (!subjectCounts[obs.subject_id]) {
              subjectCounts[obs.subject_id] = { subject, count: 0 };
            }
            subjectCounts[obs.subject_id].count++;
          }
        });

        const topSubjects = Object.values(subjectCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        return {
          center_id: center.id,
          center_name: center.name,
          observations_this_week: weekCount ?? 0,
          observations_this_month: monthCount ?? 0,
          top_subjects: topSubjects,
        };
      });

      const allStats = await Promise.all(statsPromises);
      setStats(allStats);
      } catch (error) {
        console.error('Error loading analytics:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [selectedCenterId, centers]);

  const roleColors: Record<string, string> = {
    nanny: 'bg-purple-100 text-purple-700',
    driver: 'bg-blue-100 text-blue-700',
    manager_as_subject: 'bg-amber-100 text-amber-700',
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1 hidden sm:block">
          Observation metrics and insights
        </p>
      </div>

      {stats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No analytics data available.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {stats.map((centerStats) => (
            <Card key={centerStats.center_id}>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">{centerStats.center_name}</CardTitle>
                <CardDescription className="hidden sm:block">Observation metrics</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      <span className="text-xs sm:text-sm font-medium text-blue-600">
                        This Week
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-blue-700">
                      {centerStats.observations_this_week}
                    </div>
                    <div className="text-xs sm:text-sm text-blue-600">observations</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                      <span className="text-xs sm:text-sm font-medium text-green-600">
                        30 Days
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-green-700">
                      {centerStats.observations_this_month}
                    </div>
                    <div className="text-xs sm:text-sm text-green-600">observations</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                      Top Staff <span className="hidden sm:inline">(Last 30 Days)</span>
                    </span>
                  </div>
                  {centerStats.top_subjects.length === 0 ? (
                    <p className="text-xs sm:text-sm text-gray-500">
                      No observations in the last 30 days
                    </p>
                  ) : (
                    <div className="space-y-1.5 sm:space-y-2">
                      {centerStats.top_subjects.map((item, index) => (
                        <div
                          key={item.subject.id}
                          className="flex items-center justify-between py-2 px-2 sm:px-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <span className="text-xs sm:text-sm font-medium text-gray-400 w-4 sm:w-5 flex-shrink-0">
                              #{index + 1}
                            </span>
                            <Link
                              href={`/subjects/${item.subject.id}`}
                              className="text-xs sm:text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                            >
                              {item.subject.name}
                            </Link>
                            <Badge
                              className={`${roleColors[item.subject.role]} text-xs hidden sm:inline-flex`}
                              variant="secondary"
                            >
                              {item.subject.role.replace('_', ' ')}
                            </Badge>
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-gray-700 flex-shrink-0 ml-2">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
