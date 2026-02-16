'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Eye } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface StaffItem {
  id: string;
  name: string;
  role: string;
  count: number;
}

interface StaffAttentionWidgetProps {
  selectedCenterId: string | null;
}

export function StaffAttentionWidget({ selectedCenterId }: StaffAttentionWidgetProps) {
  const [mostObserved, setMostObserved] = useState<StaffItem[]>([]);
  const [overlooked, setOverlooked] = useState<StaffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!selectedCenterId) return;

      setIsLoading(true);
      try {
        const supabase = createClient();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get all active subjects for this center
        let subjectsQuery = supabase
          .from('subjects')
          .select('id, name, role')
          .eq('is_active', true);

        if (selectedCenterId !== 'all') {
          subjectsQuery = subjectsQuery.eq('current_center_id', selectedCenterId);
        }

        const { data: subjects, error: subjectsError } = await subjectsQuery;
        if (subjectsError) throw subjectsError;

        // Get observations from last 30 days
        let obsQuery = supabase
          .from('observations')
          .select('subject_id')
          .gte('logged_at', thirtyDaysAgo.toISOString());

        if (selectedCenterId !== 'all') {
          obsQuery = obsQuery.eq('center_id', selectedCenterId);
        }

        const { data: obsData, error: obsError } = await obsQuery;
        if (obsError) throw obsError;

        // Count observations per subject
        const counts: Record<string, number> = {};
        obsData?.forEach((obs) => {
          counts[obs.subject_id] = (counts[obs.subject_id] || 0) + 1;
        });

        // Map subjects with counts
        const staffWithCounts = (subjects ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          count: counts[s.id] || 0,
        }));

        // Top 3 most observed
        const sorted = [...staffWithCounts].sort((a, b) => b.count - a.count);
        setMostObserved(sorted.filter((s) => s.count > 0).slice(0, 3));

        // Staff with zero observations
        setOverlooked(staffWithCounts.filter((s) => s.count === 0));
      } catch (error) {
        console.error('Error loading staff attention data:', error);
        toast.error('Failed to load staff attention data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [selectedCenterId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mostObserved.length === 0 && overlooked.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Eye className="w-5 h-5 text-amber-500" />
          Staff Needing Attention
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
        {mostObserved.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Most observed (last 30 days)</p>
            <div className="space-y-1.5">
              {mostObserved.map((staff) => (
                <Link
                  key={staff.id}
                  href={`/subjects/${staff.id}`}
                  className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{staff.name}</span>
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                      {staff.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold text-amber-700">{staff.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {overlooked.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              No observations in 30 days
            </p>
            <div className="space-y-1.5">
              {overlooked.map((staff) => (
                <Link
                  key={staff.id}
                  href={`/subjects/${staff.id}`}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{staff.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {staff.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-400">0 obs</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
