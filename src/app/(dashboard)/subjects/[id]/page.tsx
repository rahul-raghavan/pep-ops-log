'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useCenterContext } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Subject, Observation, ObservationTypeConfig } from '@/types/database';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft, Plus, FileText, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { AISummary } from '@/components/observations/AISummary';
import { DownloadSummaryButton } from '@/components/observations/DownloadSummaryButton';
import { EditObservationDialog } from '@/components/observations/EditObservationDialog';

export default function SubjectDetailPage() {
  const params = useParams();
  const subjectId = params.id as string;
  const { user } = useCenterContext();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [observationTypes, setObservationTypes] = useState<ObservationTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingObservation, setEditingObservation] = useState<Observation | null>(null);
  const [summaryText, setSummaryText] = useState<string | undefined>(undefined);

  const isSuperAdmin = user?.role === 'super_admin';

  async function loadData() {
    try {
      const supabase = createClient();

      // Load subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*, current_center:centers(*)')
        .eq('id', subjectId)
        .single();

      if (subjectError) throw subjectError;

      // Load observations for this subject
      const { data: observationsData, error: obsError } = await supabase
        .from('observations')
        .select(`
          *,
          center:centers(*),
          logged_by:users(id, name, email)
        `)
        .eq('subject_id', subjectId)
        .order('observed_at', { ascending: false });

      if (obsError) throw obsError;

      // Load observation types for edit dialog
      const { data: typesData } = await supabase
        .from('observation_type_config')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      setSubject(subjectData);
      setObservations(observationsData ?? []);
      setObservationTypes(typesData ?? []);
    } catch (error) {
      console.error('Error loading subject data:', error);
      toast.error('Failed to load subject data');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [subjectId]);

  async function handleDeleteObservation(observationId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('observations')
      .delete()
      .eq('id', observationId);

    if (error) {
      toast.error('Failed to delete observation');
      return;
    }

    toast.success('Observation deleted');
    loadData();
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Staff member not found</p>
        <Link href="/subjects">
          <Button variant="outline" className="mt-4">
            Back to Staff
          </Button>
        </Link>
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    nanny: 'bg-purple-100 text-purple-700',
    driver: 'bg-blue-100 text-blue-700',
    manager_as_subject: 'bg-amber-100 text-amber-700',
  };

  const typeColors: Record<string, string> = {
    punctuality: 'bg-green-100 text-green-700',
    safety: 'bg-red-100 text-red-700',
    hygiene: 'bg-teal-100 text-teal-700',
    communication: 'bg-blue-100 text-blue-700',
    procedure: 'bg-purple-100 text-purple-700',
    parent_feedback: 'bg-amber-100 text-amber-700',
    other: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/subjects">
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 sm:hidden">{subject.name}</h1>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xl sm:text-2xl hidden sm:block">{subject.name}</CardTitle>
              <div className="flex items-center gap-1.5 sm:gap-2 sm:mt-2 flex-wrap">
                <Badge className={`${roleColors[subject.role]} text-xs`} variant="secondary">
                  {subject.role.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs">{subject.current_center?.name}</Badge>
                {!subject.is_active && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {observations.length > 0 && (
                <DownloadSummaryButton
                  subject={subject}
                  observations={observations}
                  summaryText={summaryText}
                />
              )}
              <Link href={`/observations/new?subject=${subject.id}`}>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Log Observation</span>
                  <span className="sm:hidden">Log</span>
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      {observations.length > 0 && (
        <AISummary
          subjectId={subject.id}
          subjectName={subject.name}
          firstObservationDate={observations[observations.length - 1]?.observed_at}
          onSummaryLoaded={setSummaryText}
        />
      )}

      <div>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
          History ({observations.length})
        </h2>

        {observations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                No observations logged yet for this subject.
              </p>
              <Link href={`/observations/new?subject=${subject.id}`}>
                <Button className="mt-4">Log First Observation</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {observations.map((obs) => (
              <Card key={obs.id}>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {obs.observation_type && (
                        <Badge
                          className={`${typeColors[obs.observation_type]} text-xs`}
                          variant="secondary"
                        >
                          {obs.observation_type.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm text-gray-500">
                        {format(new Date(obs.observed_at), 'MMM d, yyyy')}
                      </span>
                      {obs.logged_by_user_id === user.id &&
                        new Date(obs.logged_at).getTime() > Date.now() - 24 * 60 * 60 * 1000 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-blue-500"
                          onClick={() => setEditingObservation(obs)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {isSuperAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Observation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this observation? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteObservation(obs.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap">
                    {obs.transcript}
                  </p>
                  <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t text-xs text-gray-500">
                    {obs.logged_by?.name || obs.logged_by?.email}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editingObservation && (
        <EditObservationDialog
          observation={editingObservation}
          observationTypes={observationTypes}
          open={!!editingObservation}
          onOpenChange={(open) => !open && setEditingObservation(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
