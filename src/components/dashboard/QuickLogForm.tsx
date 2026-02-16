'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Subject, ObservationTypeConfig } from '@/types/database';
import { VoiceRecorder } from '@/components/observations/VoiceRecorder';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';

interface QuickLogFormProps {
  selectedCenterId: string | null;
  userId: string;
  onLogged: () => void;
}

export function QuickLogForm({ selectedCenterId, userId, onLogged }: QuickLogFormProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [observationTypes, setObservationTypes] = useState<ObservationTypeConfig[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject_id: '',
    transcript: '',
    observation_type: '',
  });

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      let subjectsQuery = supabase
        .from('subjects')
        .select('*, current_center:centers(*)')
        .eq('is_active', true)
        .order('name');

      if (selectedCenterId && selectedCenterId !== 'all') {
        subjectsQuery = subjectsQuery.eq('current_center_id', selectedCenterId);
      }

      const { data: subjectsData } = await subjectsQuery;
      const { data: typesData } = await supabase
        .from('observation_type_config')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      setSubjects(subjectsData ?? []);
      setObservationTypes(typesData ?? []);
    }

    loadData();
  }, [selectedCenterId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.subject_id) {
      toast.error('Please select a staff member');
      return;
    }
    if (!formData.transcript.trim()) {
      toast.error('Please enter an observation');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const selectedSubject = subjects.find((s) => s.id === formData.subject_id);

      if (!selectedSubject) {
        toast.error('Staff member not found');
        return;
      }

      const { error } = await supabase.from('observations').insert({
        subject_id: formData.subject_id,
        center_id: selectedSubject.current_center_id,
        logged_by_user_id: userId,
        transcript: formData.transcript.trim(),
        observation_type: formData.observation_type || null,
        observed_at: new Date().toISOString(),
      });

      if (error) {
        toast.error('Failed to save observation');
        return;
      }

      toast.success('Observation logged');
      setFormData({ subject_id: '', transcript: '', observation_type: '' });
      onLogged();
    } catch (error) {
      console.error('Error saving observation:', error);
      toast.error('Failed to save observation');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Quick Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              value={formData.subject_id}
              onValueChange={(value) =>
                setFormData({ ...formData, subject_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name} ({subject.role.replace('_', ' ')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={formData.observation_type || 'none'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  observation_type: value === 'none' ? '' : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No type</SelectItem>
                {observationTypes.map((type) => (
                  <SelectItem key={type.id} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <Textarea
            value={formData.transcript}
            onChange={(e) =>
              setFormData({ ...formData, transcript: e.target.value })
            }
            placeholder="Type or record your observation..."
            rows={2}
            className="resize-none"
          />

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Log'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
