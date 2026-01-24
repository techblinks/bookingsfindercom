import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Loader2, Settings, ToggleLeft, ToggleRight, Save, Plane, Building, Route, HelpCircle, ThumbsUp, Tag, Users } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSiteSettings, HomepageSections, HeroSearchTabs } from '@/hooks/useSiteSettings';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

const sectionConfig = [
  { key: 'popular_routes', label: 'Popular Routes', description: 'Show popular flight routes section', icon: Route },
  { key: 'how_it_works', label: 'How It Works', description: 'Show how it works banner', icon: HelpCircle },
  { key: 'why_book', label: 'Why Book With Us', description: 'Show benefits section', icon: ThumbsUp },
  { key: 'top_deals', label: 'Top Deals', description: 'Show top deals section', icon: Tag },
  { key: 'trust_stats', label: 'Trust Statistics', description: 'Show trust stats (Airlines, Hotels, etc.)', icon: Users },
];

const searchTabConfig = [
  { key: 'flights', label: 'Flights Search', description: 'Enable flights search tab in hero', icon: Plane },
  { key: 'hotels', label: 'Hotels Search', description: 'Enable hotels search tab in hero', icon: Building },
];

export default function AdminSettings() {
  const { user, isLoading: authLoading, isAdmin } = useAdminAuth();
  const { homepageSections, heroSearchTabs, updateSetting, isUpdating, isLoading: settingsLoading } = useSiteSettings();
  const navigate = useNavigate();

  const [localSections, setLocalSections] = useState<HomepageSections | null>(null);
  const [localTabs, setLocalTabs] = useState<HeroSearchTabs | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state when settings load
  const sections = localSections ?? homepageSections;
  const tabs = localTabs ?? heroSearchTabs;

  const handleSectionToggle = (key: keyof HomepageSections) => {
    const newSections = { ...sections, [key]: !sections[key] };
    setLocalSections(newSections);
    setHasChanges(true);
  };

  const handleTabToggle = (key: keyof HeroSearchTabs) => {
    const newTabs = { ...tabs, [key]: !tabs[key] };
    // Ensure at least one tab is always enabled
    if (!newTabs.flights && !newTabs.hotels) {
      toast.error('At least one search tab must be enabled');
      return;
    }
    setLocalTabs(newTabs);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      if (localSections) {
        updateSetting({ key: 'homepage_sections', value: localSections as unknown as Json });
      }
      if (localTabs) {
        updateSetting({ key: 'hero_search_tabs', value: localTabs as unknown as Json });
      }
      setHasChanges(false);
      toast.success('Settings saved! Changes are now live on the website.');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  // Loading state
  if (authLoading || settingsLoading) {
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
      <Helmet>
        <title>Site Settings | Admin | BookingsFinder</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Site Settings
              </h1>
              <p className="text-muted-foreground">Configure homepage sections and features</p>
            </div>
            {hasChanges && (
              <Button onClick={handleSave} disabled={isUpdating} className="gap-2">
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            )}
          </div>

          {/* Hero Search Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Hero Search Tabs
              </CardTitle>
              <CardDescription>
                Control which search options appear in the hero section. At least one must be enabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {searchTabConfig.map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor={`tab-${item.key}`} className="font-medium cursor-pointer">
                        {item.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Switch
                    id={`tab-${item.key}`}
                    checked={tabs[item.key as keyof HeroSearchTabs]}
                    onCheckedChange={() => handleTabToggle(item.key as keyof HeroSearchTabs)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Homepage Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-5 w-5" />
                Homepage Sections
              </CardTitle>
              <CardDescription>
                Toggle visibility of sections on the homepage. Changes apply immediately after saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sectionConfig.map((item, index) => (
                <div key={item.key}>
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label htmlFor={`section-${item.key}`} className="font-medium cursor-pointer">
                          {item.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={`section-${item.key}`}
                      checked={sections[item.key as keyof HomepageSections]}
                      onCheckedChange={() => handleSectionToggle(item.key as keyof HomepageSections)}
                    />
                  </div>
                  {index < sectionConfig.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <ToggleRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">How Feature Toggles Work</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Changes take effect immediately after saving - no redeploy needed. 
                    The homepage reads these settings from the database in real-time. 
                    SEO is preserved as the page structure remains intact.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
