'use client';

import { useEffect, useState } from 'react';
import { useCenterContext } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ObservationTypeConfig } from '@/types/database';
import { Plus, Pencil, Eye, EyeOff, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';

export default function SettingsPage() {
  const { user } = useCenterContext();
  const [observationTypes, setObservationTypes] = useState<ObservationTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ObservationTypeConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    value: '',
    label: '',
  });

  // Redirect if not super admin
  if (user.role !== 'super_admin') {
    redirect('/dashboard');
  }

  async function loadObservationTypes() {
    const supabase = createClient();
    const { data } = await supabase
      .from('observation_type_config')
      .select('*')
      .order('sort_order');
    setObservationTypes(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadObservationTypes();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.value.trim() || !formData.label.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    if (editingType) {
      const { error } = await supabase
        .from('observation_type_config')
        .update({
          value: formData.value.toLowerCase().replace(/\s+/g, '_').trim(),
          label: formData.label.trim(),
        })
        .eq('id', editingType.id);

      if (error) {
        toast.error('Failed to update observation type');
        setIsSubmitting(false);
        return;
      }
      toast.success('Observation type updated successfully');
    } else {
      const maxOrder = Math.max(...observationTypes.map((t) => t.sort_order), 0);
      const { error } = await supabase.from('observation_type_config').insert({
        value: formData.value.toLowerCase().replace(/\s+/g, '_').trim(),
        label: formData.label.trim(),
        is_active: true,
        sort_order: maxOrder + 1,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('An observation type with this value already exists');
        } else {
          toast.error('Failed to create observation type');
        }
        setIsSubmitting(false);
        return;
      }
      toast.success('Observation type created successfully');
    }

    setIsSubmitting(false);
    setIsDialogOpen(false);
    setEditingType(null);
    setFormData({ value: '', label: '' });
    loadObservationTypes();
  }

  async function toggleTypeStatus(type: ObservationTypeConfig) {
    const supabase = createClient();
    const { error } = await supabase
      .from('observation_type_config')
      .update({ is_active: !type.is_active })
      .eq('id', type.id);

    if (error) {
      toast.error('Failed to update observation type');
      return;
    }

    toast.success(
      type.is_active
        ? 'Observation type hidden'
        : 'Observation type visible'
    );
    loadObservationTypes();
  }

  function openEditDialog(type: ObservationTypeConfig) {
    setEditingType(type);
    setFormData({
      value: type.value,
      label: type.label,
    });
    setIsDialogOpen(true);
  }

  function openNewDialog() {
    setEditingType(null);
    setFormData({ value: '', label: '' });
    setIsDialogOpen(true);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure system settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Observation Types</CardTitle>
              <CardDescription>
                Manage the categories available for tagging observations
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingType ? 'Edit Observation Type' : 'Add Observation Type'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingType
                        ? 'Update the observation type details.'
                        : 'Create a new observation type category.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="label">Display Label</Label>
                      <Input
                        id="label"
                        value={formData.label}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            label: e.target.value,
                            value: editingType
                              ? formData.value
                              : e.target.value.toLowerCase().replace(/\s+/g, '_'),
                          });
                        }}
                        placeholder="e.g., Parent Feedback"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="value">System Value</Label>
                      <Input
                        id="value"
                        value={formData.value}
                        onChange={(e) =>
                          setFormData({ ...formData, value: e.target.value })
                        }
                        placeholder="e.g., parent_feedback"
                        required
                      />
                      <p className="text-xs text-gray-500">
                        This value is stored in the database. Use lowercase with underscores.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editingType ? 'Save Changes' : 'Add Type'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {observationTypes.map((type) => (
                <TableRow key={type.id} className={!type.is_active ? 'opacity-50' : ''}>
                  <TableCell>
                    <GripVertical className="w-4 h-4 text-gray-400" />
                  </TableCell>
                  <TableCell className="font-medium">{type.label}</TableCell>
                  <TableCell className="text-gray-500 font-mono text-sm">
                    {type.value}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        type.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {type.is_active ? 'Visible' : 'Hidden'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(type)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTypeStatus(type)}
                      >
                        {type.is_active ? (
                          <EyeOff className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Eye className="w-4 h-4 text-green-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
