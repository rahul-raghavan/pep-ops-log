'use client';

import { useEffect, useState } from 'react';
import { useCenterContext } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Observation, ObservationTypeConfig } from '@/types/database';
import { format } from 'date-fns';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function ObservationsPage() {
  const { selectedCenterId } = useCenterContext();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [observationTypes, setObservationTypes] = useState<ObservationTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loggers, setLoggers] = useState<{ id: string; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loggedByFilter, setLoggedByFilter] = useState('all');

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Load observation types
      const { data: typesData } = await supabase
        .from('observation_type_config')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      setObservationTypes(typesData ?? []);
    }

    loadData();
  }, []);

  // Load distinct loggers for the selected center
  useEffect(() => {
    async function loadLoggers() {
      if (!selectedCenterId) return;
      const supabase = createClient();

      let query = supabase
        .from('observations')
        .select('logged_by_user_id, logged_by:users(id, name, email)');

      if (selectedCenterId !== 'all') {
        query = query.eq('center_id', selectedCenterId);
      }

      const { data } = await query;

      // Deduplicate loggers
      const loggerMap = new Map<string, { id: string; name: string }>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data?.forEach((obs: any) => {
        const loggedBy = Array.isArray(obs.logged_by) ? obs.logged_by[0] : obs.logged_by;
        if (loggedBy && !loggerMap.has(obs.logged_by_user_id)) {
          loggerMap.set(obs.logged_by_user_id, {
            id: loggedBy.id,
            name: loggedBy.name || loggedBy.email,
          });
        }
      });

      setLoggers(Array.from(loggerMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    }

    loadLoggers();
  }, [selectedCenterId]);

  useEffect(() => {
    async function loadObservations() {
      if (!selectedCenterId) return;

      setIsLoading(true);
      try {
        const supabase = createClient();

        let query = supabase
          .from('observations')
          .select(`
            *,
            subject:subjects(id, name, role),
            center:centers(id, name),
            logged_by:users(id, name, email)
          `)
          .order('observed_at', { ascending: false })
          .limit(100);

        if (selectedCenterId !== 'all') {
          query = query.eq('center_id', selectedCenterId);
        }

        if (typeFilter && typeFilter !== 'all') {
          query = query.eq('observation_type', typeFilter);
        }

        if (loggedByFilter && loggedByFilter !== 'all') {
          query = query.eq('logged_by_user_id', loggedByFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        let filtered = data ?? [];
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(
            (obs) =>
              (obs.transcript ?? '').toLowerCase().includes(term) ||
              obs.subject?.name?.toLowerCase().includes(term)
          );
        }

        setObservations(filtered);
      } catch (error) {
        console.error('Error loading observations:', error);
        toast.error('Failed to load observations');
      } finally {
        setIsLoading(false);
      }
    }

    loadObservations();
  }, [selectedCenterId, typeFilter, searchTerm, loggedByFilter]);

  const typeColors: Record<string, string> = {
    punctuality: 'bg-green-100 text-green-700',
    safety: 'bg-red-100 text-red-700',
    hygiene: 'bg-teal-100 text-teal-700',
    communication: 'bg-blue-100 text-blue-700',
    procedure: 'bg-purple-100 text-purple-700',
    parent_feedback: 'bg-amber-100 text-amber-700',
    other: 'bg-gray-100 text-gray-700',
  };

  const roleColors: Record<string, string> = {
    nanny: 'bg-purple-100 text-purple-700',
    driver: 'bg-blue-100 text-blue-700',
    manager_as_subject: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Observations</h1>
          <p className="text-gray-500 text-sm mt-1 hidden sm:block">
            View and search all logged observations
          </p>
        </div>
        <Link href="/observations/new">
          <Button size="sm" className="sm:size-default">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Log Observation</span>
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-3 sm:pt-6 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search observations or staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {observationTypes.map((type) => (
                    <SelectItem key={type.id} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loggers.length > 1 && (
                <Select value={loggedByFilter} onValueChange={setLoggedByFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Logged by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Loggers</SelectItem>
                    {loggers.map((logger) => (
                      <SelectItem key={logger.id} value={logger.id}>
                        {logger.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : observations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              No observations found.{' '}
              {searchTerm || typeFilter !== 'all' || loggedByFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('all');
                    setLoggedByFilter('all');
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              ) : (
                <Link href="/observations/new" className="text-blue-600 hover:underline">
                  Log your first observation
                </Link>
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {observations.map((obs) => (
            <Card key={obs.id}>
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <Link
                      href={`/subjects/${obs.subject_id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {obs.subject?.name}
                    </Link>
                    {obs.subject?.role && (
                      <Badge className={`${roleColors[obs.subject.role]} text-xs`} variant="secondary">
                        {obs.subject.role.replace('_', ' ')}
                      </Badge>
                    )}
                    {obs.observation_type && (
                      <Badge className={`${typeColors[obs.observation_type]} text-xs`} variant="secondary">
                        {obs.observation_type.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                    {format(new Date(obs.observed_at), 'MMM d, h:mm a')}
                  </div>
                </div>
                <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap">{obs.transcript}</p>
                <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t text-xs text-gray-500">
                  {obs.logged_by?.name || obs.logged_by?.email}
                  <span className="hidden sm:inline">
                    {obs.logged_at !== obs.observed_at && (
                      <> &middot; {format(new Date(obs.logged_at), 'MMM d, h:mm a')}</>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
