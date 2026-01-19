import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Globe, Plane, Hotel, Loader2, ExternalLink, Copy } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface PopularCity {
  name: string;
  code: string;
}

interface PopularRoute {
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface CountryPageFormData {
  slug: string;
  title: string;
  h1_title: string;
  meta_description: string;
  intro_paragraph: string;
  main_content: string;
  country_code: string;
  country_name: string;
  type: 'flights' | 'hotels';
  is_published: boolean;
  popular_cities: PopularCity[];
  popular_routes: PopularRoute[];
  travel_tips: string[];
  faqs: FAQ[];
}

const defaultFormData: CountryPageFormData = {
  slug: '',
  title: '',
  h1_title: '',
  meta_description: '',
  intro_paragraph: '',
  main_content: '',
  country_code: '',
  country_name: '',
  type: 'flights',
  is_published: false,
  popular_cities: [],
  popular_routes: [],
  travel_tips: [],
  faqs: [],
};

export default function AdminCountryPages() {
  const { user, isLoading: authLoading, isAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CountryPageFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('basic');
  
  // New city/route/tip/faq inputs
  const [newCity, setNewCity] = useState({ name: '', code: '' });
  const [newRoute, setNewRoute] = useState({ from: '', to: '', fromCode: '', toCode: '' });
  const [newTip, setNewTip] = useState('');
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });

  // Fetch all country pages
  const { data: pages, isLoading } = useQuery({
    queryKey: ['admin-country-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_landing_pages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CountryPageFormData) => {
      const payload = {
        slug: data.slug,
        title: data.title,
        h1_title: data.h1_title,
        meta_description: data.meta_description,
        intro_paragraph: data.intro_paragraph,
        main_content: data.main_content,
        country_code: data.country_code.toUpperCase(),
        country_name: data.country_name,
        type: data.type,
        is_published: data.is_published,
        popular_cities: data.popular_cities as unknown as Json,
        popular_routes: data.popular_routes as unknown as Json,
        travel_tips: data.travel_tips as unknown as Json,
        faqs: data.faqs as unknown as Json,
      };

      if (editingId) {
        const { error } = await supabase
          .from('country_landing_pages')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('country_landing_pages')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-country-pages'] });
      toast.success(editingId ? 'Page updated successfully' : 'Page created successfully');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('country_landing_pages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-country-pages'] });
      toast.success('Page deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Toggle publish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from('country_landing_pages')
        .update({ is_published })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-country-pages'] });
      toast.success('Publish status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData(defaultFormData);
    setActiveTab('basic');
  };

  const handleEdit = (page: typeof pages extends (infer T)[] ? T : never) => {
    setEditingId(page.id);
    setFormData({
      slug: page.slug,
      title: page.title,
      h1_title: page.h1_title,
      meta_description: page.meta_description,
      intro_paragraph: page.intro_paragraph,
      main_content: page.main_content,
      country_code: page.country_code,
      country_name: page.country_name,
      type: page.type as 'flights' | 'hotels',
      is_published: page.is_published,
      popular_cities: (page.popular_cities as unknown as PopularCity[]) || [],
      popular_routes: (page.popular_routes as unknown as PopularRoute[]) || [],
      travel_tips: (page.travel_tips as unknown as string[]) || [],
      faqs: (page.faqs as unknown as FAQ[]) || [],
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (page: typeof pages extends (infer T)[] ? T : never) => {
    setEditingId(null); // Creating new, not editing
    setFormData({
      slug: `${page.slug}-copy`,
      title: `${page.title} (Copy)`,
      h1_title: page.h1_title,
      meta_description: page.meta_description,
      intro_paragraph: page.intro_paragraph,
      main_content: page.main_content,
      country_code: page.country_code,
      country_name: page.country_name,
      type: page.type as 'flights' | 'hotels',
      is_published: false, // Start as draft
      popular_cities: (page.popular_cities as unknown as PopularCity[]) || [],
      popular_routes: (page.popular_routes as unknown as PopularRoute[]) || [],
      travel_tips: (page.travel_tips as unknown as string[]) || [],
      faqs: (page.faqs as unknown as FAQ[]) || [],
    });
    setIsDialogOpen(true);
    toast.info('Page duplicated - update the slug and title before saving');
  };

  const handleSubmit = () => {
    if (!formData.slug || !formData.title || !formData.country_name) {
      toast.error('Please fill in all required fields');
      return;
    }
    saveMutation.mutate(formData);
  };

  // Helpers for adding items
  const addCity = () => {
    if (newCity.name && newCity.code) {
      setFormData(prev => ({
        ...prev,
        popular_cities: [...prev.popular_cities, { ...newCity }],
      }));
      setNewCity({ name: '', code: '' });
    }
  };

  const removeCity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      popular_cities: prev.popular_cities.filter((_, i) => i !== index),
    }));
  };

  const addRoute = () => {
    if (newRoute.from && newRoute.to && newRoute.fromCode && newRoute.toCode) {
      setFormData(prev => ({
        ...prev,
        popular_routes: [...prev.popular_routes, { ...newRoute }],
      }));
      setNewRoute({ from: '', to: '', fromCode: '', toCode: '' });
    }
  };

  const removeRoute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      popular_routes: prev.popular_routes.filter((_, i) => i !== index),
    }));
  };

  const addTip = () => {
    if (newTip) {
      setFormData(prev => ({
        ...prev,
        travel_tips: [...prev.travel_tips, newTip],
      }));
      setNewTip('');
    }
  };

  const removeTip = (index: number) => {
    setFormData(prev => ({
      ...prev,
      travel_tips: prev.travel_tips.filter((_, i) => i !== index),
    }));
  };

  const addFaq = () => {
    if (newFaq.question && newFaq.answer) {
      setFormData(prev => ({
        ...prev,
        faqs: [...prev.faqs, { ...newFaq }],
      }));
      setNewFaq({ question: '', answer: '' });
    }
  };

  const removeFaq = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  };

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  // Not authenticated
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <AdminLoginForm />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Country Landing Pages</h1>
                <p className="text-muted-foreground">
                  Manage SEO landing pages for flights and hotels
                </p>
              </div>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Page
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{pages?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">Total Pages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {pages?.filter(p => p.is_published).length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Published</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {pages?.filter(p => p.type === 'flights').length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Flight Pages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-purple-600">
                  {pages?.filter(p => p.type === 'hotels').length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Hotel Pages</p>
              </CardContent>
            </Card>
          </div>

          {/* Pages List */}
          <Card>
            <CardHeader>
              <CardTitle>All Pages</CardTitle>
              <CardDescription>Click to edit or manage publish status</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : pages && pages.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pages.map((page) => (
                        <TableRow key={page.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{page.title}</div>
                              <div className="text-sm text-muted-foreground">/{page.slug}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={page.type === 'flights' ? 'default' : 'secondary'} className="gap-1">
                              {page.type === 'flights' ? (
                                <Plane className="h-3 w-3" />
                              ) : (
                                <Hotel className="h-3 w-3" />
                              )}
                              {page.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              {page.country_name} ({page.country_code})
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={page.is_published}
                                onCheckedChange={(checked) => 
                                  togglePublishMutation.mutate({ id: page.id, is_published: checked })
                                }
                              />
                              <span className={page.is_published ? 'text-green-600' : 'text-muted-foreground'}>
                                {page.is_published ? 'Published' : 'Draft'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/${page.slug}`, '_blank')}
                                title="View page"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDuplicate(page)}
                                title="Duplicate page"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(page)}
                                title="Edit page"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Page</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{page.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(page.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No country pages yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first SEO landing page for flights or hotels
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Page
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Country Page' : 'Create Country Page'}</DialogTitle>
            <DialogDescription>
              Fill in the details for your SEO landing page
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="destinations">Destinations</TabsTrigger>
              <TabsTrigger value="faqs">FAQs & Tips</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Page Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'flights' | 'hotels') => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flights">
                        <div className="flex items-center gap-2">
                          <Plane className="h-4 w-4" />
                          Flights
                        </div>
                      </SelectItem>
                      <SelectItem value="hotels">
                        <div className="flex items-center gap-2">
                          <Hotel className="h-4 w-4" />
                          Hotels
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country_code">Country Code *</Label>
                  <Input
                    id="country_code"
                    placeholder="e.g., US, GB, JP"
                    value={formData.country_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, country_code: e.target.value.toUpperCase() }))}
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country_name">Country Name *</Label>
                <Input
                  id="country_name"
                  placeholder="e.g., United States, United Kingdom"
                  value={formData.country_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, country_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  <Input
                    id="slug"
                    placeholder="e.g., cheap-flights-from-usa"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Page Title (SEO) *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Cheap Flights from USA | Best Deals 2025"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">{formData.title.length}/60 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="h1_title">H1 Title *</Label>
                <Input
                  id="h1_title"
                  placeholder="e.g., Cheap Flights from the United States"
                  value={formData.h1_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, h1_title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description *</Label>
                <Textarea
                  id="meta_description"
                  placeholder="Describe this page for search engines..."
                  value={formData.meta_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">{formData.meta_description.length}/160 characters</p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                />
                <Label>Publish immediately</Label>
              </div>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="intro_paragraph">Intro Paragraph *</Label>
                <Textarea
                  id="intro_paragraph"
                  placeholder="Write an engaging introduction..."
                  value={formData.intro_paragraph}
                  onChange={(e) => setFormData(prev => ({ ...prev, intro_paragraph: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="main_content">Main Content *</Label>
                <Textarea
                  id="main_content"
                  placeholder="Write the main body content (supports basic HTML)..."
                  value={formData.main_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, main_content: e.target.value }))}
                  rows={10}
                />
                <p className="text-xs text-muted-foreground">You can use basic HTML tags for formatting</p>
              </div>
            </TabsContent>

            {/* Destinations Tab */}
            <TabsContent value="destinations" className="space-y-6 mt-4">
              {/* Popular Cities */}
              <div className="space-y-4">
                <Label>Popular Cities</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="City name"
                    value={newCity.name}
                    onChange={(e) => setNewCity(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Code (e.g., NYC)"
                    value={newCity.code}
                    onChange={(e) => setNewCity(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-32"
                  />
                  <Button type="button" onClick={addCity} variant="secondary">Add</Button>
                </div>
                {formData.popular_cities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.popular_cities.map((city, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {city.name} ({city.code})
                        <button onClick={() => removeCity(index)} className="ml-1 hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Popular Routes (only for flights) */}
              {formData.type === 'flights' && (
                <div className="space-y-4">
                  <Label>Popular Routes</Label>
                  <div className="grid grid-cols-5 gap-2">
                    <Input
                      placeholder="From city"
                      value={newRoute.from}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, from: e.target.value }))}
                    />
                    <Input
                      placeholder="From code"
                      value={newRoute.fromCode}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, fromCode: e.target.value.toUpperCase() }))}
                    />
                    <Input
                      placeholder="To city"
                      value={newRoute.to}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, to: e.target.value }))}
                    />
                    <Input
                      placeholder="To code"
                      value={newRoute.toCode}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, toCode: e.target.value.toUpperCase() }))}
                    />
                    <Button type="button" onClick={addRoute} variant="secondary">Add</Button>
                  </div>
                  {formData.popular_routes.length > 0 && (
                    <div className="space-y-2">
                      {formData.popular_routes.map((route, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <span>{route.from} ({route.fromCode}) → {route.to} ({route.toCode})</span>
                          <Button variant="ghost" size="sm" onClick={() => removeRoute(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* FAQs & Tips Tab */}
            <TabsContent value="faqs" className="space-y-6 mt-4">
              {/* Travel Tips */}
              <div className="space-y-4">
                <Label>Travel Tips</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a travel tip..."
                    value={newTip}
                    onChange={(e) => setNewTip(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTip())}
                  />
                  <Button type="button" onClick={addTip} variant="secondary">Add</Button>
                </div>
                {formData.travel_tips.length > 0 && (
                  <div className="space-y-2">
                    {formData.travel_tips.map((tip, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm">{tip}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeTip(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FAQs */}
              <div className="space-y-4">
                <Label>FAQs (for JSON-LD Schema)</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Question"
                    value={newFaq.question}
                    onChange={(e) => setNewFaq(prev => ({ ...prev, question: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Answer"
                    value={newFaq.answer}
                    onChange={(e) => setNewFaq(prev => ({ ...prev, answer: e.target.value }))}
                    rows={2}
                  />
                  <Button type="button" onClick={addFaq} variant="secondary" className="w-full">Add FAQ</Button>
                </div>
                {formData.faqs.length > 0 && (
                  <div className="space-y-2">
                    {formData.faqs.map((faq, index) => (
                      <div key={index} className="p-3 bg-muted rounded-md">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{faq.question}</p>
                            <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeFaq(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Update Page' : 'Create Page'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
