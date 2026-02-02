import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Shield, Clock, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "",
    description: "Perfect for occasional travelers",
    features: [
      "1 trip optimization per month",
      "Basic cost breakdown",
      "Timing advice",
      "Risk alerts",
      "Affiliate partner links",
    ],
    limitations: [
      "Limited to 1 optimization/month",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 15,
    period: "/month",
    description: "For frequent travelers who want the best deals",
    features: [
      "Unlimited trip optimizations",
      "Detailed cost breakdowns",
      "Advanced timing intelligence",
      "Priority risk alerts",
      "Multiple route comparisons",
      "Price tracking insights",
      "Email support",
    ],
    limitations: [],
    cta: "Start Pro",
    popular: true,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectPlan = async (planId: string) => {
    if (planId === "free") {
      navigate("/optimizer");
      return;
    }

    // Pro plan - initiate Stripe checkout
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Sign in required",
          description: "Please sign in to subscribe to Pro",
          variant: "destructive",
        });
        navigate("/optimizer");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          successUrl: `${window.location.origin}/account?success=true`,
          cancelUrl: `${window.location.origin}/pricing`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: "Unable to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Pricing - Trip Optimizer Pro | BookingsFinder</title>
        <meta
          name="description"
          content="Choose your plan for Smart Trip Optimizer. Free tier for occasional travelers, Pro for unlimited optimizations."
        />
        <link rel="canonical" href="https://bookingsfinder.com/pricing" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-16 md:py-24">
            <div className="container">
              <div className="max-w-3xl mx-auto text-center">
                <Badge variant="secondary" className="mb-4">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Simple Pricing
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                  Make Smarter Travel Decisions
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Get personalized trip insights, cost breakdowns, and timing advice.
                  Choose the plan that fits your travel style.
                </p>
              </div>
            </div>
          </section>

          {/* Pricing Cards */}
          <section className="py-12 md:py-16 -mt-12">
            <div className="container">
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col ${
                      plan.popular
                        ? "border-primary shadow-lg ring-2 ring-primary/20"
                        : "border-border"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <div className="text-center mb-6">
                        <span className="text-4xl font-bold text-foreground">
                          ${plan.price}
                        </span>
                        <span className="text-muted-foreground">{plan.period}</span>
                      </div>

                      <ul className="space-y-3">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-foreground">{feature}</span>
                          </li>
                        ))}
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="flex items-start gap-2 text-muted-foreground">
                            <span className="h-5 w-5 shrink-0 flex items-center justify-center text-muted-foreground">
                              •
                            </span>
                            <span className="text-sm">{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter>
                      <Button
                        onClick={() => handleSelectPlan(plan.id)}
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                        size="lg"
                        disabled={isLoading}
                      >
                        {isLoading && plan.id === "pro" ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          plan.cta
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-12 bg-muted/30">
            <div className="container">
              <h2 className="text-2xl font-bold text-center text-foreground mb-8">
                Why Use Trip Optimizer?
              </h2>
              <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                <div className="text-center p-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-3">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Save Money</h3>
                  <p className="text-sm text-muted-foreground">
                    See true total costs including bags and transfers
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 mb-3">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Perfect Timing</h3>
                  <p className="text-sm text-muted-foreground">
                    Know when to buy or wait for better prices
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-3">
                    <Shield className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Avoid Risks</h3>
                  <p className="text-sm text-muted-foreground">
                    Get warned about tight connections and transfers
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 mb-3">
                    <Zap className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Quick Decisions</h3>
                  <p className="text-sm text-muted-foreground">
                    Compare and book with our trusted partners
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-12">
            <div className="container max-w-3xl">
              <h2 className="text-2xl font-bold text-center text-foreground mb-8">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold text-foreground mb-2">
                    What counts as one optimization?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Each time you submit a trip for analysis counts as one optimization.
                    Free users get 1 per month, Pro users get unlimited.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold text-foreground mb-2">
                    Can I cancel my Pro subscription?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Yes, you can cancel anytime from your account page. You'll retain
                    Pro access until the end of your billing period.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold text-foreground mb-2">
                    Do you sell flights directly?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    No. BookingsFinder is a travel intelligence platform. We provide insights
                    and recommendations, then connect you with trusted booking partners.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Pricing;
