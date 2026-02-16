'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Observation, ObservationTypeConfig } from '@/types/database';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EditObservationDialogProps {
  observation: Observation;
  observationTypes: ObservationTypeConfig[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditObservationDialog({
  observation,
  observationTypes,
  open,
  onOpenChange,
  onSaved,
}: EditObservationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    transcript: observation.transcript,
    observation_type: observation.observation_type ?? '',
    observed_at: format(new Date(observation.observed_at), 'yyyy-MM-dd'),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.transcript.trim()) {
      toast.error('Observation text cannot be empty');
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    if (formData.observed_at > today) {
      toast.error('Date cannot be in the future');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('observations')
        .update({
          transcript: formData.transcript.trim(),
          observation_type: formData.observation_type || null,
          observed_at: new Date(formData.observed_at).toISOString(),
        })
        .eq('id', observation.id);

      if (error) {
        if (error.message?.includes('24 hours')) {
          toast.error('Observations can only be edited within 24 hours of logging');
        } else {
          toast.error('Failed to update observation');
        }
        return;
      }

      toast.success('Observation updated');
      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error('Error updating observation:', error);
      toast.error('Failed to update observation');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Observation</DialogTitle>
            <DialogDescription>
              You can edit observations within 24 hours of logging them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-transcript">Observation</Label>
              <Textarea
                id="edit-transcript"
                value={formData.transcript}
                onChange={(e) =>
                  setFormData({ ...formData, transcript: e.target.value })
                }
                rows={5}
                className="resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type</Label>
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
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {observationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.observed_at}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) =>
                    setFormData({ ...formData, observed_at: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
