import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OptimizerAuthGateProps {
  /** Called after a successful sign-in/sign-up; the parent re-submits the held request. */
  onCancel: () => void;
}

/**
 * Sign-in requirement shown when a signed-out visitor submits the Optimizer.
 *
 * Reuses the exact same Supabase Auth calls as the existing account sign-in
 * flow (src/pages/Account.tsx) — no new authentication system. On success,
 * TripOptimizer's onAuthStateChange listener picks up the new session and
 * re-submits the traveller's already-entered search automatically.
 */
const OptimizerAuthGate = ({ onCancel }: OptimizerAuthGateProps) => {
  const { toast } = useToast();
  const [authLoading, setAuthLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // No toast/navigation here: the parent's onAuthStateChange listener
      // continues the held Optimizer request as soon as the session updates.
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
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      // Projects with "Confirm email" enabled return a user but NO session
      // until the traveller clicks the confirmation link — signUp must never
      // be assumed to produce an immediate session. In that case, tell them
      // plainly what to do next; the pending Optimizer request stays held
      // and nothing here invokes it. If email confirmation is disabled for
      // this project, signUp DOES return a session immediately, Supabase
      // itself fires the same auth-state event a normal sign-in would, and
      // the parent's onAuthStateChange listener continues the held request —
      // no separate handling is needed here for that case.
      if (!data.session) {
        toast({
          title: "Check your email",
          description:
            "We sent you a confirmation link. Confirm your email, then sign in above to continue your optimization.",
        });
      }
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

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          Sign In to Optimize Your Trip
        </h2>
        <p className="text-muted-foreground text-sm">
          Free accounts get one optimization per month. Your search details are saved —
          sign in or create an account to continue.
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
                  <Label htmlFor="optimizer-signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="optimizer-signin-email"
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
                  <Label htmlFor="optimizer-signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="optimizer-signin-password"
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
                    "Sign In & Continue"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="optimizer-signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="optimizer-signup-email"
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
                  <Label htmlFor="optimizer-signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="optimizer-signup-password"
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
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <Button variant="ghost" onClick={onCancel} className="w-full mt-4 text-muted-foreground hover:text-foreground">
            Back to search
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OptimizerAuthGate;
