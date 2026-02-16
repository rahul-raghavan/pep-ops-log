'use client';

import { useEffect, useState } from 'react';
import { useCenterContext } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Subject, SubjectRole, Center } from '@/types/database';
import { Plus, Pencil, UserX, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SubjectsPage() {
  const { selectedCenterId, centers, user } = useCenterContext();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: 'nanny' as SubjectRole,
    current_center_id: '',
  });

  async function loadSubjects() {
    if (!selectedCenterId) return;

    setIsLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('subjects')
      .select('*, current_center:centers(*)')
      .order('name');

    if (selectedCenterId !== 'all') {
      query = query.eq('current_center_id', selectedCenterId);
    }

    if (!showInactive) {
      query = query.eq('is_active', true);
    }

    const { data } = await query;
    setSubjects(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadSubjects();
  }, [selectedCenterId, showInactive]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const supabase = createClient();

    if (editingSubject) {
      const { error } = await supabase
        .from('subjects')
        .update({
          name: formData.name,
          role: formData.role,
          current_center_id: formData.current_center_id,
        })
        .eq('id', editingSubject.id);

      if (error) {
        toast.error('Failed to update staff');
        setIsSubmitting(false);
        return;
      }
      toast.success('Staff updated successfully');
    } else {
      const { error } = await supabase.from('subjects').insert({
        name: formData.name,
        role: formData.role,
        current_center_id: formData.current_center_id,
        is_active: true,
      });

      if (error) {
        toast.error('Failed to create staff');
        setIsSubmitting(false);
        return;
      }
      toast.success('Staff created successfully');
    }

    setIsSubmitting(false);
    setIsDialogOpen(false);
    setEditingSubject(null);
    setFormData({ name: '', role: 'nanny', current_center_id: '' });
    loadSubjects();
  }

  async function toggleSubjectStatus(subject: Subject) {
    const supabase = createClient();
    const { error } = await supabase
      .from('subjects')
      .update({ is_active: !subject.is_active })
      .eq('id', subject.id);

    if (error) {
      toast.error('Failed to update staff status');
      return;
    }

    toast.success(
      subject.is_active
        ? 'Staff deactivated successfully'
        : 'Staff reactivated successfully'
    );
    loadSubjects();
  }

  function openEditDialog(subject: Subject) {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      role: subject.role,
      current_center_id: subject.current_center_id,
    });
    setIsDialogOpen(true);
  }

  function openNewDialog() {
    setEditingSubject(null);
    setFormData({
      name: '',
      role: 'nanny',
      current_center_id: selectedCenterId === 'all' ? centers[0]?.id ?? '' : selectedCenterId ?? '',
    });
    setIsDialogOpen(true);
  }

  const roleColors: Record<SubjectRole, string> = {
    nanny: 'bg-purple-100 text-purple-700',
    driver: 'bg-blue-100 text-blue-700',
    manager_as_subject: 'bg-amber-100 text-amber-700',
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 text-sm mt-1 hidden sm:block">
            Manage nannies, drivers, and other staff
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="hidden sm:inline">Show inactive</span>
            <span className="sm:hidden">Inactive</span>
          </label>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog} size="sm" className="sm:size-default">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Staff</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingSubject ? 'Edit Staff' : 'Add New Staff'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSubject
                      ? 'Update the staff details below.'
                      : 'Fill in the details for the new staff member.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: SubjectRole) =>
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nanny">Nanny</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="manager_as_subject">
                          Manager (as subject)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="center">Center</Label>
                    <Select
                      value={formData.current_center_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, current_center_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select center" />
                      </SelectTrigger>
                      <SelectContent>
                        {centers.map((center) => (
                          <SelectItem key={center.id} value={center.id}>
                            {center.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    {isSubmitting ? 'Saving...' : editingSubject ? 'Save Changes' : 'Add Staff'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              No staff found.{' '}
              <button
                onClick={openNewDialog}
                className="text-blue-600 hover:underline"
              >
                Add your first staff member
              </button>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}`}
              className={`block ${!subject.is_active ? 'opacity-60' : ''}`}
            >
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm sm:text-base truncate">{subject.name}</span>
                        <Badge className={`${roleColors[subject.role]} text-xs`} variant="secondary">
                          {subject.role.replace('_', ' ')}
                        </Badge>
                        {!subject.is_active && (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {subject.current_center?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5" onClick={(e) => e.preventDefault()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.preventDefault(); openEditDialog(subject); }}
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.preventDefault(); toggleSubjectStatus(subject); }}
                        className="h-7 w-7 p-0"
                      >
                        {subject.is_active ? (
                          <UserX className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-green-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
