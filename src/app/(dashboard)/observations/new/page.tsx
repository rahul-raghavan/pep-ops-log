'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCenterContext } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VoiceRecorder } from '@/components/observations/VoiceRecorder';
import { Subject, ObservationTypeConfig } from '@/types/database';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

function NewObservationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSubjectId = searchParams.get('subject');
  const { selectedCenterId, centers, user } = useCenterContext();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [observationTypes, setObservationTypes] = useState<ObservationTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    subject_id: preselectedSubjectId ?? '',
    transcript: '',
    observation_type: '',
    observed_at: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Load subjects for the selected center
      let subjectsQuery = supabase
        .from('subjects')
        .select('*, current_center:centers(*)')
        .eq('is_active', true)
        .order('name');

      if (selectedCenterId && selectedCenterId !== 'all') {
        subjectsQuery = subjectsQuery.eq('current_center_id', selectedCenterId);
      }

      const { data: subjectsData } = await subjectsQuery;

      // Load observation types
      const { data: typesData } = await supabase
        .from('observation_type_config')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      setSubjects(subjectsData ?? []);
      setObservationTypes(typesData ?? []);
      setIsLoading(false);
    }

    loadData();
  }, [selectedCenterId]);

  useEffect(() => {
    if (preselectedSubjectId) {
      setFormData((prev) => ({ ...prev, subject_id: preselectedSubjectId }));
    }
  }, [preselectedSubjectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.subject_id) {
      toast.error('Please select a staff member');
      return;
    }

    if (!formData.transcript.trim()) {
      toast.error('Please record or enter an observation');
      return;
    }

    // Reject future dates
    const today = format(new Date(), 'yyyy-MM-dd');
    if (formData.observed_at > today) {
      toast.error('Observation date cannot be in the future');
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();

      // Get the staff member's current center for the observation
      const selectedSubject = subjects.find((s) => s.id === formData.subject_id);
      if (!selectedSubject) {
        toast.error('Staff member not found');
        setIsSaving(false);
        return;
      }

      const { error } = await supabase.from('observations').insert({
        subject_id: formData.subject_id,
        center_id: selectedSubject.current_center_id,
        logged_by_user_id: user.id,
        transcript: formData.transcript.trim(),
        observation_type: formData.observation_type || null,
        observed_at: new Date(formData.observed_at).toISOString(),
      });

      if (error) {
        console.error('Error saving observation:', error);
        toast.error('Failed to save observation');
        setIsSaving(false);
        return;
      }

      toast.success('Observation saved successfully');
      router.push(`/subjects/${formData.subject_id}`);
    } catch (error) {
      console.error('Error saving observation:', error);
      toast.error('Failed to save observation');
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Log Observation</h1>
      </div>

      <Card>
        <CardHeader className="hidden sm:block p-4 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Log Observation</CardTitle>
          <CardDescription>
            Record a voice observation or type it manually
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4 sm:pt-0">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm">Staff *</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, subject_id: value })
                }
              >
                <SelectTrigger className="h-11 sm:h-10">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id} className="py-3 sm:py-2">
                      {subject.name} ({subject.role.replace('_', ' ')})
                      {selectedCenterId === 'all' && ` - ${subject.current_center?.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Voice Recording</Label>
              <VoiceRecorder
                onTranscription={(text) =>
                  setFormData((prev) => ({
                    ...prev,
                    transcript: prev.transcript
                      ? `${prev.transcript}\n\n${text}`
                      : text,
                  }))
                }
              />
              <p className="text-xs text-gray-500">
                Tap to record. Audio is not stored - only the transcript is saved.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcript" className="text-sm">Observation *</Label>
              <Textarea
                id="transcript"
                value={formData.transcript}
                onChange={(e) =>
                  setFormData({ ...formData, transcript: e.target.value })
                }
                placeholder="Type or record your observation..."
                rows={5}
                className="resize-none text-base sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm">Type <span className="text-gray-400">(optional)</span></Label>
                <Select
                  value={formData.observation_type || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, observation_type: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger className="h-11 sm:h-10">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="py-3 sm:py-2">None</SelectItem>
                    {observationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.value} className="py-3 sm:py-2">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observed_at" className="text-sm">Date</Label>
                <Input
                  id="observed_at"
                  type="date"
                  value={formData.observed_at}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) =>
                    setFormData({ ...formData, observed_at: e.target.value })
                  }
                  className="h-11 sm:h-10"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-4">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button type="button" variant="outline" className="w-full sm:w-auto h-11 sm:h-10">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm">
                {isSaving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Observation
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewObservationPage() {
  return (
    <Suspense fallback={
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    }>
      <NewObservationContent />
    </Suspense>
  );
}
