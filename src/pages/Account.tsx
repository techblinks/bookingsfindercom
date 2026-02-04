import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  CreditCard, 
  Zap, 
  Crown, 
  LogOut, 
  Calendar,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionStatus {
  plan: string;
  isProActive: boolean;
  canOptimize: boolean;
  monthlyUses: number;
  remainingOptimizations: number;
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

const Account = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Auth form state
  const [authLoading, setAuthLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const success = searchParams.get("success");

  useEffect(() => {
    if (success === "true") {
      toast({
        title: "Welcome to Pro!",
        description: "Your subscription is now active. Enjoy unlimited optimizations!",
      });
    }
  }, [success, toast]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
        setIsAuthenticated(true);
        await fetchSubscriptionStatus();
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        setIsAuthenticated(true);
        await fetchSubscriptionStatus();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setStatus(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Welcome back!", description: "You are now signed in." });
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast({ 
        title: "Check your email", 
        description: "We sent you a confirmation link to complete signup." 
      });
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-subscription-status");
      
      if (error) throw error;
      setStatus(data);
    } catch (error) {
      console.error("Error fetching status:", error);
      toast({
        title: "Error",
        description: "Failed to load account status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setIsCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          successUrl: `${window.location.origin}/account?success=true`,
          cancelUrl: `${window.location.origin}/account`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: "Unable to start checkout",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const FREE_LIMIT = 1;
  const usagePercent = status 
    ? Math.min((status.monthlyUses / FREE_LIMIT) * 100, 100) 
    : 0;

  return (
    <>
      <Helmet>
        <title>My Account | BookingsFinder</title>
        <meta name="description" content="Manage your BookingsFinder account and subscription" />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-8 md:py-12">
          <div className="container max-w-4xl">
            {!isAuthenticated ? (
              /* Auth Form */
              <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    Sign in to Your Account
                  </h1>
                  <p className="text-muted-foreground">
                    Access your dashboard, track usage, and manage your subscription
                  </p>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <Tabs defaultValue="signin" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Create Account</TabsTrigger>
                      </TabsList>

                      <TabsContent value="signin">
                        <form onSubmit={handleSignIn} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="signin-email">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="signin-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signin-password">Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="signin-password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10"
                                required
                                minLength={6}
                              />
                            </div>
                          </div>
                          <Button type="submit" className="w-full" disabled={authLoading}>
                            {authLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Signing in...
                              </>
                            ) : (
                              "Sign In"
                            )}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="signup">
                        <form onSubmit={handleSignUp} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="signup-email">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="signup-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signup-password">Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="signup-password"
                                type="password"
                                placeholder="At least 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10"
                                required
                                minLength={6}
                              />
                            </div>
                          </div>
                          <Button type="submit" className="w-full" disabled={authLoading}>
                            {authLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating account...
                              </>
                            ) : (
                              "Create Account"
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground text-center">
                            By creating an account, you agree to our Terms of Service
                          </p>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <p className="text-sm text-muted-foreground text-center mt-6">
                  Free users get 1 optimization per month.{" "}
                  <a href="/pricing" className="text-primary hover:underline">
                    View Pro benefits
                  </a>
                </p>
              </div>
            ) : (
              /* Authenticated Dashboard */
              <>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Account</h1>
                    <p className="text-muted-foreground">
                      Manage your subscription and view usage
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>

            <div className="grid gap-6">
              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-6 w-48" />
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user?.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Member since {user?.created_at ? formatDate(user.created_at) : "..."}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subscription Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Subscription
                  </CardTitle>
                  <CardDescription>Your current plan and billing</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        {status?.isProActive ? (
                          <>
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                              <Crown className="h-3 w-3 mr-1" />
                              Pro
                            </Badge>
                            <span className="text-foreground font-medium">$15/month</span>
                          </>
                        ) : (
                          <>
                            <Badge variant="secondary">Free</Badge>
                            <span className="text-muted-foreground text-sm">
                              Limited features
                            </span>
                          </>
                        )}
                      </div>

                      {status?.subscription && status.isProActive && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {status.subscription.cancelAtPeriodEnd
                                ? `Cancels on ${formatDate(status.subscription.currentPeriodEnd)}`
                                : `Renews on ${formatDate(status.subscription.currentPeriodEnd)}`}
                            </span>
                          </div>
                          {status.subscription.cancelAtPeriodEnd && (
                            <p className="text-amber-600 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              Your subscription will not renew
                            </p>
                          )}
                        </div>
                      )}

                      {!status?.isProActive && (
                        <Button onClick={handleUpgrade} disabled={isCheckingOut}>
                          {isCheckingOut ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Upgrade to Pro
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Usage Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Usage This Month
                  </CardTitle>
                  <CardDescription>Your trip optimization usage</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ) : status?.isProActive ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">Unlimited Optimizations</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        You've used {status.monthlyUses} optimization{status.monthlyUses !== 1 ? 's' : ''} this month
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">
                            {status?.monthlyUses || 0} of {FREE_LIMIT} used
                          </span>
                          <span className="text-muted-foreground">
                            {status?.remainingOptimizations || 0} remaining
                          </span>
                        </div>
                        <Progress value={usagePercent} className="h-2" />
                      </div>
                      
                      {status?.canOptimize ? (
                        <p className="text-sm text-muted-foreground">
                          You have {status.remainingOptimizations} free optimization{status.remainingOptimizations !== 1 ? 's' : ''} left this month
                        </p>
                      ) : (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                          <p className="text-sm text-amber-700 dark:text-amber-400">
                            You've used your free optimization this month.
                            Upgrade to Pro for unlimited optimizations.
                          </p>
                          <Button 
                            onClick={handleUpgrade} 
                            size="sm" 
                            className="mt-3"
                            disabled={isCheckingOut}
                          >
                            <Zap className="h-4 w-4 mr-1" />
                            Upgrade to Pro
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => navigate("/optimizer")}>
                      <Zap className="h-4 w-4 mr-2" />
                      New Optimization
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/my-alerts")}>
                      Price Alerts
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/help")}>
                      Help Center
                    </Button>
                  </div>
                </CardContent>
            </Card>
            </div>
              </>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Account;
