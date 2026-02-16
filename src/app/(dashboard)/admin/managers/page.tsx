'use client';

import { useEffect, useState } from 'react';
import { useCenterContext } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { User, Center, Subject, UserRole } from '@/types/database';
import { Plus, Pencil, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';

interface ManagerWithCenters extends User {
  assigned_centers: Center[];
}

export default function ManagersPage() {
  const { user, centers } = useCenterContext();
  const [managers, setManagers] = useState<ManagerWithCenters[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<ManagerWithCenters | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'manager' as UserRole,
    center_ids: [] as string[],
    linked_subject_id: '',
  });

  // Redirect if not super admin
  if (user.role !== 'super_admin') {
    redirect('/dashboard');
  }

  async function loadData() {
    try {
      const supabase = createClient();

      // Load all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (usersError) throw usersError;

      // Load user_centers for all users
      const { data: userCentersData, error: centersError } = await supabase
        .from('user_centers')
        .select('user_id, center:centers(*)');

      if (centersError) throw centersError;

      // Load subjects for linking
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectsError) throw subjectsError;

      // Combine users with their centers
      const managersWithCenters = (usersData ?? []).map((u) => ({
        ...u,
        assigned_centers: (userCentersData ?? [])
          .filter((uc) => uc.user_id === u.id)
          .map((uc) => uc.center as unknown as Center)
          .filter(Boolean),
      }));

      setManagers(managersWithCenters);
      setSubjects(subjectsData ?? []);
    } catch (error) {
      console.error('Error loading managers:', error);
      toast.error('Failed to load managers data');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.email.trim()) {
      toast.error('Please enter an email');
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    if (editingManager) {
      // Update user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: formData.name.trim() || null,
          role: formData.role,
          linked_subject_id: formData.linked_subject_id || null,
        })
        .eq('id', editingManager.id);

      if (updateError) {
        toast.error('Failed to update manager');
        setIsSubmitting(false);
        return;
      }

      // Update center assignments
      // First, remove all existing assignments
      const { error: deleteError } = await supabase
        .from('user_centers')
        .delete()
        .eq('user_id', editingManager.id);

      if (deleteError) {
        toast.error('Failed to update center assignments');
        setIsSubmitting(false);
        loadData();
        return;
      }

      // Then, add new assignments
      if (formData.center_ids.length > 0 && formData.role === 'manager') {
        const assignments = formData.center_ids.map((centerId) => ({
          user_id: editingManager.id,
          center_id: centerId,
        }));
        const { error: insertError } = await supabase.from('user_centers').insert(assignments);
        if (insertError) {
          toast.error('Failed to assign centers. Please try again.');
          setIsSubmitting(false);
          loadData();
          return;
        }
      }

      toast.success('Manager updated successfully');
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: formData.email.toLowerCase().trim(),
          name: formData.name.trim() || null,
          role: formData.role,
          is_active: true,
          linked_subject_id: formData.linked_subject_id || null,
        })
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') {
          toast.error('A user with this email already exists');
        } else {
          toast.error('Failed to create manager');
        }
        setIsSubmitting(false);
        return;
      }

      // Add center assignments
      if (formData.center_ids.length > 0 && formData.role === 'manager' && newUser) {
        const assignments = formData.center_ids.map((centerId) => ({
          user_id: newUser.id,
          center_id: centerId,
        }));
        await supabase.from('user_centers').insert(assignments);
      }

      toast.success('Manager created successfully');
    }

    setIsSubmitting(false);
    setIsDialogOpen(false);
    setEditingManager(null);
    setFormData({
      email: '',
      name: '',
      role: 'manager',
      center_ids: [],
      linked_subject_id: '',
    });
    loadData();
  }

  async function toggleUserStatus(manager: ManagerWithCenters) {
    const supabase = createClient();
    const { error } = await supabase
      .from('users')
      .update({ is_active: !manager.is_active })
      .eq('id', manager.id);

    if (error) {
      toast.error('Failed to update user status');
      return;
    }

    toast.success(
      manager.is_active
        ? 'User deactivated successfully'
        : 'User reactivated successfully'
    );
    loadData();
  }

  function openEditDialog(manager: ManagerWithCenters) {
    setEditingManager(manager);
    setFormData({
      email: manager.email,
      name: manager.name ?? '',
      role: manager.role,
      center_ids: manager.assigned_centers.map((c) => c.id),
      linked_subject_id: manager.linked_subject_id ?? '',
    });
    setIsDialogOpen(true);
  }

  function openNewDialog() {
    setEditingManager(null);
    setFormData({
      email: '',
      name: '',
      role: 'manager',
      center_ids: [],
      linked_subject_id: '',
    });
    setIsDialogOpen(true);
  }

  function toggleCenter(centerId: string) {
    setFormData((prev) => ({
      ...prev,
      center_ids: prev.center_ids.includes(centerId)
        ? prev.center_ids.filter((id) => id !== centerId)
        : [...prev.center_ids, centerId],
    }));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Managers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage user accounts and center assignments
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingManager ? 'Edit User' : 'Add New User'}
                </DialogTitle>
                <DialogDescription>
                  {editingManager
                    ? 'Update user details and permissions.'
                    : 'Create a new manager or admin account.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="user@pepschoolv2.com"
                    disabled={!!editingManager}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: UserRole) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.role === 'manager' && (
                  <div className="space-y-2">
                    <Label>Assigned Centers</Label>
                    <div className="flex flex-wrap gap-2">
                      {centers.map((center) => (
                        <button
                          key={center.id}
                          type="button"
                          onClick={() => toggleCenter(center.id)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            formData.center_ids.includes(center.id)
                              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                              : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                          }`}
                        >
                          {center.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="linked_subject">
                    Link to Staff (for self-visibility restriction)
                  </Label>
                  <Select
                    value={formData.linked_subject_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, linked_subject_id: value === 'none' ? '' : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.role.replace('_', ' ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    If this user is also a staff member, link them here
                    to prevent them from viewing observations about themselves.
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
                  {isSubmitting ? 'Saving...' : editingManager ? 'Save Changes' : 'Add User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {managers.length} user{managers.length !== 1 ? 's' : ''} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Centers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers.map((manager) => (
                <TableRow key={manager.id} className={!manager.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">
                    {manager.name || '-'}
                    {manager.linked_subject_id && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Linked
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{manager.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        manager.role === 'super_admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }
                    >
                      {manager.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {manager.role === 'super_admin' ? (
                      <span className="text-gray-500 text-sm">All centers</span>
                    ) : manager.assigned_centers.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {manager.assigned_centers.map((center) => (
                          <Badge key={center.id} variant="outline" className="text-xs">
                            {center.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        manager.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }
                    >
                      {manager.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(manager)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {manager.id !== user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleUserStatus(manager)}
                        >
                          {manager.is_active ? (
                            <UserX className="w-4 h-4 text-red-500" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                      )}
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
