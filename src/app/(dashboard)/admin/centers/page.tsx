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
import { Center } from '@/types/database';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';

export default function CentersPage() {
  const { user } = useCenterContext();
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [centerName, setCenterName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not super admin
  if (user.role !== 'super_admin') {
    redirect('/dashboard');
  }

  async function loadCenters() {
    const supabase = createClient();
    const { data } = await supabase.from('centers').select('*').order('name');
    setCenters(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadCenters();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!centerName.trim()) {
      toast.error('Please enter a center name');
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    if (editingCenter) {
      const { error } = await supabase
        .from('centers')
        .update({ name: centerName.trim() })
        .eq('id', editingCenter.id);

      if (error) {
        toast.error('Failed to update center');
        setIsSubmitting(false);
        return;
      }
      toast.success('Center updated successfully');
    } else {
      const { error } = await supabase
        .from('centers')
        .insert({ name: centerName.trim() });

      if (error) {
        if (error.code === '23505') {
          toast.error('A center with this name already exists');
        } else {
          toast.error('Failed to create center');
        }
        setIsSubmitting(false);
        return;
      }
      toast.success('Center created successfully');
    }

    setIsSubmitting(false);
    setIsDialogOpen(false);
    setEditingCenter(null);
    setCenterName('');
    loadCenters();
  }

  function openEditDialog(center: Center) {
    setEditingCenter(center);
    setCenterName(center.name);
    setIsDialogOpen(true);
  }

  function openNewDialog() {
    setEditingCenter(null);
    setCenterName('');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage school centers
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Center
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingCenter ? 'Edit Center' : 'Add New Center'}
                </DialogTitle>
                <DialogDescription>
                  {editingCenter
                    ? 'Update the center name.'
                    : 'Enter a name for the new center.'}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="name">Center Name</Label>
                <Input
                  id="name"
                  value={centerName}
                  onChange={(e) => setCenterName(e.target.value)}
                  placeholder="e.g., HSR Layout"
                  className="mt-2"
                  required
                />
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
                  {isSubmitting ? 'Saving...' : editingCenter ? 'Save Changes' : 'Add Center'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Centers</CardTitle>
          <CardDescription>
            {centers.length} center{centers.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centers.map((center) => (
                <TableRow key={center.id}>
                  <TableCell className="font-medium">{center.name}</TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(center.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(center)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
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
