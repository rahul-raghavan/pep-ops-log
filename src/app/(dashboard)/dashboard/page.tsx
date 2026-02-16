'use client';

import { useEffect, useState } from 'react';
import { useCenterContext } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Observation } from '@/types/database';
import { format } from 'date-fns';
import Link from 'next/link';
import { Plus, Users, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { InactivityBanner } from '@/components/dashboard/InactivityBanner';
import { QuickLogForm } from '@/components/dashboard/QuickLogForm';
import { StaffAttentionWidget } from '@/components/dashboard/StaffAttentionWidget';

export default function DashboardPage() {
  const { selectedCenterId, user } = useCenterContext();
  const [stats, setStats] = useState({
    totalSubjects: 0,
    observationsThisWeek: 0,
    totalObservations: 0,
  });
  const [recentObservations, setRecentObservations] = useState<Observation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboardData() {
    if (!selectedCenterId) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      // Get subjects count
      let subjectsQuery = supabase
        .from('subjects')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      if (selectedCenterId !== 'all') {
        subjectsQuery = subjectsQuery.eq('current_center_id', selectedCenterId);
      }

      const { count: subjectsCount, error: subjectsError } = await subjectsQuery;
      if (subjectsError) throw subjectsError;

      // Get observations this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      let weekObsQuery = supabase
        .from('observations')
        .select('id', { count: 'exact' })
        .gte('logged_at', oneWeekAgo.toISOString());

      if (selectedCenterId !== 'all') {
        weekObsQuery = weekObsQuery.eq('center_id', selectedCenterId);
      }

      const { count: weekCount, error: weekError } = await weekObsQuery;
      if (weekError) throw weekError;

      // Get total observations
      let totalObsQuery = supabase
        .from('observations')
        .select('id', { count: 'exact' });

      if (selectedCenterId !== 'all') {
        totalObsQuery = totalObsQuery.eq('center_id', selectedCenterId);
      }

      const { count: totalCount, error: totalError } = await totalObsQuery;
      if (totalError) throw totalError;

      // Get recent observations
      let recentQuery = supabase
        .from('observations')
        .select(`
          *,
          subject:subjects(id, name, role),
          center:centers(id, name),
          logged_by:users(id, name, email)
        `)
        .order('logged_at', { ascending: false })
        .limit(5);

      if (selectedCenterId !== 'all') {
        recentQuery = recentQuery.eq('center_id', selectedCenterId);
      }

      const { data: recentObs, error: recentError } = await recentQuery;
      if (recentError) throw recentError;

      setStats({
        totalSubjects: subjectsCount ?? 0,
        observationsThisWeek: weekCount ?? 0,
        totalObservations: totalCount ?? 0,
      });
      setRecentObservations(recentObs ?? []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [selectedCenterId]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <InactivityBanner userId={user.id} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link href="/observations/new">
          <Button size="lg" className="shadow-lg">
            <Plus className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Log Observation</span>
            <span className="sm:hidden">Log</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
        <Card className="p-2 sm:p-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-2 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
              <span className="hidden sm:inline">Active </span>Staff
            </CardTitle>
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="text-2xl sm:text-3xl font-bold">{stats.totalSubjects}</div>
          </CardContent>
        </Card>

        <Card className="p-2 sm:p-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-2 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500 whitespace-nowrap">
              <span className="hidden sm:inline">This </span>Week
            </CardTitle>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="text-2xl sm:text-3xl font-bold">{stats.observationsThisWeek}</div>
          </CardContent>
        </Card>

        <Card className="p-2 sm:p-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-2 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
              <span className="hidden sm:inline">All </span>Observations
            </CardTitle>
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="text-2xl sm:text-3xl font-bold">{stats.totalObservations}</div>
          </CardContent>
        </Card>
      </div>

      <QuickLogForm
        selectedCenterId={selectedCenterId}
        userId={user.id}
        onLogged={loadDashboardData}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent Observations</CardTitle>
          <CardDescription>Latest observations logged in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {recentObservations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No observations logged yet.{' '}
              <Link href="/observations/new" className="text-blue-600 hover:underline">
                Log your first observation
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {recentObservations.map((obs) => (
                <Link
                  key={obs.id}
                  href={`/subjects/${obs.subject_id}`}
                  className="block p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-gray-900">
                          {obs.subject?.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">
                          {obs.subject?.role}
                        </span>
                        {obs.observation_type && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 rounded-full text-blue-700">
                            {obs.observation_type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm line-clamp-2">
                        {obs.transcript}
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        {obs.logged_by?.name || obs.logged_by?.email} &middot;{' '}
                        {format(new Date(obs.logged_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <StaffAttentionWidget selectedCenterId={selectedCenterId} />
    </div>
  );
}
