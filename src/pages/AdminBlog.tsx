import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Edit2, Trash2, Loader2, LogOut, Shield, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  author_name: string;
  category: string;
  is_published: boolean;
}

const defaultFormData: BlogFormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featured_image: '',
  author_name: 'BookingsFinder Team',
  category: 'Travel Tips',
  is_published: false,
};

export default function AdminBlog() {
  const { user, isLoading: authLoading, isAdmin, signOut } = useAdminAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [formData, setFormData] = useState<BlogFormData>(defaultFormData);
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: BlogFormData) => {
      const payload = { ...data, published_at: data.is_published ? new Date().toISOString() : null };
      if (editingPost) {
        const { error } = await supabase.from('blog_posts').update(payload).eq('id', editingPost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('blog_posts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success(editingPost ? 'Post updated!' : 'Post created!');
      setIsDialogOpen(false);
      setEditingPost(null);
      setFormData(defaultFormData);
    },
    onError: (error) => toast.error('Failed to save: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Post deleted!');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message),
  });

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleEdit = (post: any) => {
    setEditingPost(post);
    setFormData({ title: post.title, slug: post.slug, excerpt: post.excerpt || '', content: post.content, featured_image: post.featured_image || '', author_name: post.author_name, category: post.category || '', is_published: post.is_published });
    setIsDialogOpen(true);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!user) return <AdminLoginForm />;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center"><p>Access denied</p></div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link to="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
              <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" />Blog Management</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingPost(null); setFormData(defaultFormData); } }}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Post</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingPost ? 'Edit' : 'Create'} Blog Post</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Title</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: editingPost ? formData.slug : generateSlug(e.target.value) })} /></div>
                  <div><Label>Slug</Label><Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Author</Label><Input value={formData.author_name} onChange={(e) => setFormData({ ...formData, author_name: e.target.value })} /></div>
                    <div><Label>Category</Label><Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} /></div>
                  </div>
                  <div><Label>Featured Image URL</Label><Input value={formData.featured_image} onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })} /></div>
                  <div><Label>Excerpt</Label><Textarea value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} rows={2} /></div>
                  <div><Label>Content (HTML)</Label><Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={10} /></div>
                  <div className="flex items-center gap-2"><Switch checked={formData.is_published} onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })} /><Label>Published</Label></div>
                  <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} className="w-full">{saveMutation.isPending ? 'Saving...' : 'Save Post'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
            <div className="space-y-4">
              {posts?.map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{post.title}</h3>
                        <Badge variant={post.is_published ? 'default' : 'secondary'}>{post.is_published ? 'Published' : 'Draft'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{post.category} • {format(new Date(post.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(post)}><Edit2 className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete post?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(post.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!posts || posts.length === 0) && <p className="text-center text-muted-foreground py-12">No blog posts yet.</p>}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
