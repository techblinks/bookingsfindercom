import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Megaphone, Plus, Edit2, Trash2, Loader2, LogOut, Shield, 
  ArrowLeft, Eye, EyeOff, ExternalLink, Globe, Smartphone, Monitor, MapPin, X
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tables } from '@/integrations/supabase/types';
import { AdPreview } from '@/components/ads/AdPreview';

type AdPlacement = Tables<'ad_placements'>;

interface AdFormData {
  name: string;
  type: string;
  page: string;
  placement: string;
  device: string;
  is_active: boolean;
  priority: number;
  title: string;
  description: string;
  image_url: string;
  destination_url: string;
  cta_text: string;
  html_content: string;
  advertiser_name: string;
  start_date: string;
  end_date: string;
  geo: string[];
}

const defaultFormData: AdFormData = {
  name: '',
  type: 'sponsored',
  page: 'flights',
  placement: 'after_result_3',
  device: 'all',
  is_active: true,
  priority: 0,
  title: '',
  description: '',
  image_url: '',
  destination_url: '',
  cta_text: 'View Deal',
  html_content: '',
  advertiser_name: '',
  start_date: '',
  end_date: '',
  geo: [],
};

// Common country codes for geo-targeting
const countryOptions = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'UAE' },
  { code: 'JP', name: 'Japan' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'KR', name: 'South Korea' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TH', name: 'Thailand' },
  { code: 'MY', name: 'Malaysia' },
];

const adTypes = [
  { value: 'sponsored', label: 'Sponsored Card' },
  { value: 'embed', label: 'HTML Embed' },
  { value: 'banner', label: 'Banner Ad' },
  { value: 'native', label: 'Native Ad' },
];

const adPages = [
  { value: 'flights', label: 'Flight Results' },
  { value: 'hotels', label: 'Hotel Results' },
  { value: 'both', label: 'Both Pages' },
];

const adPlacements = [
  { value: 'after_result_3', label: 'After Result #3' },
  { value: 'after_result_5', label: 'After Result #5' },
  { value: 'bottom', label: 'Bottom of Page' },
];

const deviceOptions = [
  { value: 'all', label: 'All Devices', icon: Globe },
  { value: 'mobile', label: 'Mobile Only', icon: Smartphone },
  { value: 'desktop', label: 'Desktop Only', icon: Monitor },
];

export default function AdminAds() {
  const { user, isLoading: authLoading, isAdmin, signOut } = useAdminAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdPlacement | null>(null);
  const [formData, setFormData] = useState<AdFormData>(defaultFormData);
  const queryClient = useQueryClient();

  // Fetch ads
  const { data: ads, isLoading: adsLoading } = useQuery({
    queryKey: ['admin-ads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_placements')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AdPlacement[];
    },
    enabled: isAdmin,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AdFormData) => {
      const payload = {
        ...data,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        geo: data.geo.length > 0 ? data.geo : [],
      };

      if (editingAd) {
        const { error } = await supabase
          .from('ad_placements')
          .update(payload)
          .eq('id', editingAd.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ad_placements')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success(editingAd ? 'Ad updated successfully' : 'Ad created successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Error saving ad:', error);
      toast.error('Failed to save ad');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_placements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success('Ad deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting ad:', error);
      toast.error('Failed to delete ad');
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ad_placements')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success('Ad status updated');
    },
    onError: (error) => {
      console.error('Error toggling ad:', error);
      toast.error('Failed to update ad status');
    },
  });

  const handleOpenCreate = () => {
    setEditingAd(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (ad: AdPlacement) => {
    setEditingAd(ad);
    setFormData({
      name: ad.name,
      type: ad.type,
      page: ad.page,
      placement: ad.placement,
      device: ad.device,
      is_active: ad.is_active,
      priority: ad.priority,
      title: ad.title || '',
      description: ad.description || '',
      image_url: ad.image_url || '',
      destination_url: ad.destination_url || '',
      cta_text: ad.cta_text || 'View Deal',
      html_content: ad.html_content || '',
      advertiser_name: ad.advertiser_name || '',
      start_date: ad.start_date ? ad.start_date.split('T')[0] : '',
      end_date: ad.end_date ? ad.end_date.split('T')[0] : '',
      geo: ad.geo || [],
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAd(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  // Loading state
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

  // Not authenticated - show login
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {user && !isAdmin ? (
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-destructive" />
                  </div>
                  <CardTitle>Access Denied</CardTitle>
                  <CardDescription>
                    You don't have admin privileges. Please sign in with an admin account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleSignOut} variant="outline" className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <AdminLoginForm />
            )}
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
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Back button & Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Ad Management</h1>
              <p className="text-muted-foreground text-sm">
                Create and manage ad placements across your site
              </p>
            </div>
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Ad
            </Button>
          </div>

          {/* Admin bar */}
          <Card className="bg-muted/30">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{ads?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Total Ads</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {ads?.filter(a => a.is_active).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {ads?.reduce((sum, a) => sum + a.impressions, 0).toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Total Impressions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-purple-600">
                  {ads?.reduce((sum, a) => sum + a.clicks, 0).toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Total Clicks</p>
              </CardContent>
            </Card>
          </div>

          {/* Ads List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Ad Placements
              </CardTitle>
              <CardDescription>
                Manage your advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {adsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : ads && ads.length > 0 ? (
                <div className="space-y-3">
                  {ads.map((ad) => (
                    <div
                      key={ad.id}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      {/* Status indicator */}
                      <div className={`w-2 h-2 rounded-full ${ad.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      
                      {/* Ad info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{ad.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {adTypes.find(t => t.value === ad.type)?.label || ad.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {adPages.find(p => p.value === ad.page)?.label || ad.page}
                          </Badge>
                          {ad.geo && ad.geo.length > 0 && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <MapPin className="h-3 w-3" />
                              {ad.geo.length} {ad.geo.length === 1 ? 'country' : 'countries'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{ad.impressions.toLocaleString()} impressions</span>
                          <span>{ad.clicks.toLocaleString()} clicks</span>
                          {ad.impressions > 0 && (
                            <span>{((ad.clicks / ad.impressions) * 100).toFixed(2)}% CTR</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={ad.is_active}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: ad.id, is_active: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(ad)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Ad</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{ad.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(ad.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No ads yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first ad placement to get started
                  </p>
                  <Button onClick={handleOpenCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Ad
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create/Edit Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAd ? 'Edit Ad' : 'Create Ad'}</DialogTitle>
                <DialogDescription>
                  {editingAd ? 'Update the ad placement settings' : 'Configure a new ad placement'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ad Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Summer Sale Banner"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advertiser">Advertiser</Label>
                    <Input
                      id="advertiser"
                      value={formData.advertiser_name}
                      onChange={(e) => setFormData({ ...formData, advertiser_name: e.target.value })}
                      placeholder="Acme Travel Co."
                    />
                  </div>
                </div>

                {/* Type & Placement */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Ad Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {adTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Page *</Label>
                    <Select
                      value={formData.page}
                      onValueChange={(value) => setFormData({ ...formData, page: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {adPages.map((page) => (
                          <SelectItem key={page.value} value={page.value}>
                            {page.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Placement *</Label>
                    <Select
                      value={formData.placement}
                      onValueChange={(value) => setFormData({ ...formData, placement: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {adPlacements.map((placement) => (
                          <SelectItem key={placement.value} value={placement.value}>
                            {placement.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Device & Priority */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Device Target</Label>
                    <Select
                      value={formData.device}
                      onValueChange={(value) => setFormData({ ...formData, device: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {deviceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <option.icon className="h-4 w-4" />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority (higher = shown first)</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <h4 className="font-medium">Ad Content</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Get 20% Off Flights!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cta">CTA Button Text</Label>
                      <Input
                        id="cta"
                        value={formData.cta_text}
                        onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                        placeholder="View Deal"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Limited time offer on all international flights..."
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="image_url">Image URL</Label>
                      <Input
                        id="image_url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destination_url">Destination URL</Label>
                      <Input
                        id="destination_url"
                        value={formData.destination_url}
                        onChange={(e) => setFormData({ ...formData, destination_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  {formData.type === 'embed' && (
                    <div className="space-y-2">
                      <Label htmlFor="html_content">HTML Content</Label>
                      <Textarea
                        id="html_content"
                        value={formData.html_content}
                        onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                        placeholder="<script>...</script>"
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Geo-Targeting */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Geo-Targeting (optional)</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Leave empty to show to all countries, or select specific countries to target.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.geo.map((code) => {
                      const country = countryOptions.find(c => c.code === code);
                      return (
                        <Badge key={code} variant="secondary" className="gap-1 pr-1">
                          {country?.name || code}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => setFormData({
                              ...formData,
                              geo: formData.geo.filter(g => g !== code)
                            })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                  </div>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !formData.geo.includes(value)) {
                        setFormData({ ...formData, geo: [...formData.geo, value] });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue placeholder="Add country..." />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions
                        .filter(c => !formData.geo.includes(c.code))
                        .map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name} ({country.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Schedule */}
                <div className="space-y-4">
                  <h4 className="font-medium">Schedule (optional)</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <Collapsible>
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Preview Ad
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="mt-4">
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-3">This is how your ad will appear on the site:</p>
                      <AdPreview ad={formData} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingAd ? 'Update Ad' : 'Create Ad'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </main>

      <Footer />
    </div>
  );
}