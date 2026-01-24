import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Newspaper, Plus, Edit2, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface PressFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  source: string;
  is_published: boolean;
}

const defaultFormData: PressFormData = { title: '', slug: '', excerpt: '', content: '', featured_image: '', source: '', is_published: false };

export default function AdminPress() {
  const { user, isLoading: authLoading, isAdmin } = useAdminAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<any | null>(null);
  const [formData, setFormData] = useState<PressFormData>(defaultFormData);
  const queryClient = useQueryClient();

  const { data: releases, isLoading } = useQuery({
    queryKey: ['admin-press-releases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('press_releases').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PressFormData) => {
      const payload = { ...data, published_at: data.is_published ? new Date().toISOString() : null };
      if (editingRelease) {
        const { error } = await supabase.from('press_releases').update(payload).eq('id', editingRelease.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('press_releases').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-press-releases'] });
      toast.success(editingRelease ? 'Release updated!' : 'Release created!');
      setIsDialogOpen(false);
      setEditingRelease(null);
      setFormData(defaultFormData);
    },
    onError: (error) => toast.error('Failed to save: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('press_releases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-press-releases'] });
      toast.success('Release deleted!');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message),
  });

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleEdit = (release: any) => {
    setEditingRelease(release);
    setFormData({ title: release.title, slug: release.slug, excerpt: release.excerpt || '', content: release.content, featured_image: release.featured_image || '', source: release.source || '', is_published: release.is_published });
    setIsDialogOpen(true);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!user) return <AdminLoginForm />;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center"><p>Access denied</p></div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Press Releases | Admin | BookingsFinder</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <Header />
      <main className="flex-1 py-8">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link to="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Newspaper className="h-6 w-6" />Press Releases</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingRelease(null); setFormData(defaultFormData); } }}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Release</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingRelease ? 'Edit' : 'Create'} Press Release</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Title</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: editingRelease ? formData.slug : generateSlug(e.target.value) })} /></div>
                  <div><Label>Slug</Label><Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} /></div>
                  <div><Label>Source</Label><Input value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} placeholder="e.g., Company Announcement" /></div>
                  <div><Label>Featured Image URL</Label><Input value={formData.featured_image} onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })} /></div>
                  <div><Label>Excerpt</Label><Textarea value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} rows={2} /></div>
                  <div><Label>Content (HTML)</Label><Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={10} /></div>
                  <div className="flex items-center gap-2"><Switch checked={formData.is_published} onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })} /><Label>Published</Label></div>
                  <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} className="w-full">{saveMutation.isPending ? 'Saving...' : 'Save Release'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
            <div className="space-y-4">
              {releases?.map((release) => (
                <Card key={release.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{release.title}</h3>
                        <Badge variant={release.is_published ? 'default' : 'secondary'}>{release.is_published ? 'Published' : 'Draft'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{release.source || 'No source'} • {format(new Date(release.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(release)}><Edit2 className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete release?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(release.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!releases || releases.length === 0) && <p className="text-center text-muted-foreground py-12">No press releases yet.</p>}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
