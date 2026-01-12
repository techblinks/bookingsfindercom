import { useState } from 'react';
import { Clock, Play, CheckCircle, AlertCircle, ExternalLink, Copy, Loader2, LogOut, Shield } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';

interface CheckResult {
  message: string;
  checked: number;
  priceDrops: number;
  targetReached: number;
  alertsTriggered: number;
  emailsSent: number;
}

export default function AdminAlerts() {
  const { user, isLoading: authLoading, isAdmin, signOut } = useAdminAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<CheckResult | null>(null);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-price-alerts`;

  const handleManualRun = async () => {
    setIsRunning(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-price-alerts', {
        method: 'POST',
      });

      if (error) throw error;

      setLastResult(data);
      setLastRunTime(new Date().toLocaleString());
      
      toast.success('Price check completed', {
        description: `Checked ${data.checked} alerts, ${data.emailsSent || 0} emails sent`,
      });
    } catch (err) {
      console.error('Error running price check:', err);
      toast.error('Failed to run price check', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
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
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header with user info */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Price Alert Scheduler</h1>
              <p className="text-muted-foreground">
                Set up automatic price monitoring for flight alerts
              </p>
            </div>
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

          {/* Manual Run */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Manual Price Check
              </CardTitle>
              <CardDescription>
                Run the price check manually to test the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleManualRun} 
                disabled={isRunning}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Price Check Now
                  </>
                )}
              </Button>

              {lastResult && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Last run: {lastRunTime}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <div className="text-center p-2 rounded bg-background">
                      <div className="text-2xl font-bold">{lastResult.checked}</div>
                      <div className="text-xs text-muted-foreground">Checked</div>
                    </div>
                    <div className="text-center p-2 rounded bg-background">
                      <div className="text-2xl font-bold text-green-600">{lastResult.priceDrops}</div>
                      <div className="text-xs text-muted-foreground">Price Drops</div>
                    </div>
                    <div className="text-center p-2 rounded bg-background">
                      <div className="text-2xl font-bold text-blue-600">{lastResult.targetReached}</div>
                      <div className="text-xs text-muted-foreground">Targets Hit</div>
                    </div>
                    <div className="text-center p-2 rounded bg-background">
                      <div className="text-2xl font-bold text-purple-600">{lastResult.emailsSent || 0}</div>
                      <div className="text-xs text-muted-foreground">Emails Sent</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Endpoint URL */}
          <Card>
            <CardHeader>
              <CardTitle>Function Endpoint</CardTitle>
              <CardDescription>
                Use this URL to trigger the price check from external schedulers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input 
                  value={functionUrl} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(functionUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upstash Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <img 
                  src="https://upstash.com/icons/favicon-32x32.png" 
                  alt="Upstash" 
                  className="h-5 w-5"
                />
                Setup with Upstash QStash
              </CardTitle>
              <CardDescription>
                Recommended: Reliable serverless scheduler with generous free tier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 text-sm">
                <li>
                  Go to <a href="https://console.upstash.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    Upstash Console <ExternalLink className="h-3 w-3" />
                  </a> and create an account
                </li>
                <li>Navigate to <strong>QStash</strong> in the sidebar</li>
                <li>Click <strong>"Create Schedule"</strong></li>
                <li>
                  Configure the schedule:
                  <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                    <li>Destination: Paste the endpoint URL above</li>
                    <li>Method: POST</li>
                    <li>Schedule: <code className="bg-muted px-1.5 py-0.5 rounded">0 */6 * * *</code> (every 6 hours)</li>
                  </ul>
                </li>
                <li>Click <strong>"Create"</strong> to activate</li>
              </ol>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong className="text-amber-600">Note:</strong> You may need to add the Supabase anon key as a header:
                  <code className="block mt-1 bg-muted px-2 py-1 rounded text-xs">
                    Authorization: Bearer {import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.slice(0, 20)}...
                  </code>
                </div>
              </div>

              <Button variant="outline" asChild className="gap-2">
                <a href="https://console.upstash.com/qstash" target="_blank" rel="noopener noreferrer">
                  Open Upstash QStash
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* EasyCron Alternative */}
          <Card>
            <CardHeader>
              <CardTitle>Alternative: EasyCron</CardTitle>
              <CardDescription>
                Simple web-based cron job scheduler
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Go to <a href="https://www.easycron.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    EasyCron.com <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Create a new cron job with the endpoint URL</li>
                <li>Set schedule to <code className="bg-muted px-1.5 py-0.5 rounded">0 */6 * * *</code></li>
                <li>Set method to POST</li>
              </ol>

              <Button variant="outline" asChild className="gap-2">
                <a href="https://www.easycron.com" target="_blank" rel="noopener noreferrer">
                  Open EasyCron
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Schedule Options */}
          <Card>
            <CardHeader>
              <CardTitle>Common Schedules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: 'Every 6 hours', cron: '0 */6 * * *' },
                  { label: 'Every 4 hours', cron: '0 */4 * * *' },
                  { label: 'Every 12 hours', cron: '0 */12 * * *' },
                  { label: 'Daily at midnight', cron: '0 0 * * *' },
                  { label: 'Daily at 9 AM', cron: '0 9 * * *' },
                  { label: 'Twice daily (9AM & 9PM)', cron: '0 9,21 * * *' },
                ].map((schedule) => (
                  <div 
                    key={schedule.cron}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => copyToClipboard(schedule.cron)}
                  >
                    <span className="text-sm">{schedule.label}</span>
                    <Badge variant="secondary" className="font-mono">
                      {schedule.cron}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Click any schedule to copy the cron expression
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
