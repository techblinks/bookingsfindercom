import { Link, useNavigate } from 'react-router-dom';
import { Bell, BarChart3, Users, Settings, LogOut, Shield, Loader2, Clock, Megaphone, Database } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { toast } from 'sonner';

const adminFeatures = [
  {
    title: 'Price Alert Scheduler',
    description: 'Manage automatic price monitoring and email alerts',
    icon: Clock,
    href: '/admin/alerts',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Analytics Dashboard',
    description: 'View site traffic, conversions, and revenue metrics',
    icon: BarChart3,
    href: '/admin/analytics',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    comingSoon: true,
  },
  {
    title: 'Ad Management',
    description: 'Manage ad placements and campaigns',
    icon: Megaphone,
    href: '/admin/ads',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    comingSoon: true,
  },
  {
    title: 'User Alerts',
    description: 'View all user price alerts and subscriptions',
    icon: Bell,
    href: '/admin/user-alerts',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    comingSoon: true,
  },
  {
    title: 'Database Management',
    description: 'View and manage database tables',
    icon: Database,
    href: '/admin/database',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    comingSoon: true,
  },
  {
    title: 'Settings',
    description: 'Configure site settings and preferences',
    icon: Settings,
    href: '/admin/settings',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    comingSoon: true,
  },
];

export default function AdminDashboard() {
  const { user, isLoading: authLoading, isAdmin, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Manage your BookingsFinder platform
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Admin bar */}
          <Card className="bg-muted/30">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Signed in as: <span className="font-medium text-foreground">{user.email}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {adminFeatures.map((feature) => (
              <Card 
                key={feature.href}
                className={`relative transition-all hover:shadow-md ${
                  feature.comingSoon ? 'opacity-60' : 'hover:border-primary/50 cursor-pointer'
                }`}
              >
                {feature.comingSoon && (
                  <Badge 
                    variant="secondary" 
                    className="absolute top-3 right-3 text-xs"
                  >
                    Coming Soon
                  </Badge>
                )}
                {feature.comingSoon ? (
                  <div className="p-6">
                    <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ) : (
                  <Link to={feature.href} className="block p-6">
                    <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </Link>
                )}
              </Card>
            ))}
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Overview of your platform metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-primary">—</div>
                  <div className="text-xs text-muted-foreground mt-1">Active Alerts</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-green-600">—</div>
                  <div className="text-xs text-muted-foreground mt-1">Today's Searches</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-blue-600">—</div>
                  <div className="text-xs text-muted-foreground mt-1">Clicks Today</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-purple-600">—</div>
                  <div className="text-xs text-muted-foreground mt-1">Emails Sent</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Stats integration coming soon
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
