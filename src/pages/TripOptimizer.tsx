import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import OptimizerForm from "@/components/optimizer/OptimizerForm";
import OptimizerResults from "@/components/optimizer/OptimizerResults";
import OptimizerNoData from "@/components/optimizer/OptimizerNoData";
import {
  useOptimizer,
  OptimizerRequest,
  OptimizerResult,
  isOptimizerSuccess,
} from "@/hooks/useOptimizer";
import { Loader2, Sparkles, Shield, DollarSign, Clock, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TripOptimizer = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [request, setRequest] = useState<OptimizerRequest | null>(null);
  const { runOptimizer, isLoading, error, paywallError, clearPaywallError } = useOptimizer();

  const handleSubmit = async (data: OptimizerRequest) => {
    setRequest(data);
    const optimizerResult = await runOptimizer(data);
    if (optimizerResult) {
      setResult(optimizerResult);
    }
  };

  const handleReset = () => {
    setResult(null);
    setRequest(null);
    clearPaywallError();
  };

  const handleUpgrade = () => {
    navigate("/pricing");
  };

  return (
    <>
      <Helmet>
        <title>Smart Trip Optimizer | BookingsFinder</title>
        <meta
          name="description"
          content="Compare live flight options returned by our data provider, with the quoted fare and how it sits against the other options returned for your search."
        />
        <meta name="keywords" content="trip optimizer, travel planner, flight comparison, live flight prices, cheap flights" />
        <link rel="canonical" href="https://bookingsfinder.com/optimizer" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12 md:py-16">
            <div className="container">
              <div className="max-w-3xl mx-auto text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <Sparkles className="h-4 w-4" />
                  Travel Intelligence Tool
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                  Smart Trip Optimizer
                </h1>
                <p className="text-lg text-muted-foreground">
                  See the live options our flight data provider returns for your search, the
                  quoted fare, and how it compares with the rest of those options.
                </p>
              </div>

              {/* Features Grid */}
              {!result && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
                    <div className="p-2 rounded-full bg-emerald-500/10">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Provider-quoted fare</p>
                      <p className="text-xs text-muted-foreground">No invented estimates</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
                    <div className="p-2 rounded-full bg-blue-500/10">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Fare comparison</p>
                      <p className="text-xs text-muted-foreground">Against options returned</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
                    <div className="p-2 rounded-full bg-amber-500/10">
                      <Shield className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Itinerary notes</p>
                      <p className="text-xs text-muted-foreground">Stops and duration</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Main Content */}
          <section className="py-8 md:py-12">
            <div className="container">
              {isLoading ? (
                <div className="max-w-2xl mx-auto">
                  <div className="bg-card border border-border rounded-xl p-8 md:p-12 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Optimizing Your Trip
                    </h2>
                    <p className="text-muted-foreground">
                      Retrieving live flight options from our data provider...
                    </p>
                  </div>
                </div>
              ) : paywallError ? (
                <div className="max-w-lg mx-auto">
                  <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                    <CardContent className="p-8 relative">
                      {/* Header */}
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4 ring-4 ring-primary/10">
                          <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                          You've Used Your Free Optimization
                        </h2>
                        <p className="text-muted-foreground">
                          {paywallError.message}
                        </p>
                      </div>

                      {/* Pro Benefits */}
                      <div className="bg-card border border-border rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-foreground">Unlock Pro Benefits</span>
                        </div>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span><strong className="text-foreground">Unlimited</strong> trip optimizations</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Provider-quoted fares on every search</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Fare comparison against all returned options</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Itinerary notes on stops and duration</span>
                          </li>
                        </ul>
                      </div>

                      {/* CTA Buttons */}
                      <div className="space-y-3">
                        <Button onClick={handleUpgrade} size="lg" className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                          <Zap className="h-4 w-4 mr-2" />
                          Upgrade to Pro — $9.99/month
                        </Button>
                        <Button variant="ghost" onClick={handleReset} className="w-full text-muted-foreground hover:text-foreground">
                          Maybe Later
                        </Button>
                      </div>

                      {/* Footer note */}
                      <p className="text-xs text-muted-foreground text-center mt-4">
                        Cancel anytime. Your free optimization resets in 30 days.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : result && request ? (
                isOptimizerSuccess(result) ? (
                  <OptimizerResults
                    result={result}
                    request={request}
                    onReset={handleReset}
                  />
                ) : (
                  <OptimizerNoData
                    result={result}
                    request={request}
                    onReset={handleReset}
                  />
                )
              ) : (
                <div className="max-w-2xl mx-auto">
                  <OptimizerForm onSubmit={handleSubmit} error={error} />
                </div>
              )}
            </div>
          </section>

          {/* FAQ Section for SEO */}
          <section className="py-12 bg-muted/30">
            <div className="container max-w-3xl">
              <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold text-foreground mb-2">
                    What is the Smart Trip Optimizer?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    The Smart Trip Optimizer queries our flight data provider for your route and
                    dates, then shows the option matching your priority, the fare quoted for it, and
                    how that fare compares with the other options returned for the same search.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold text-foreground mb-2">
                    What does the fare include?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    We show the fare quoted by our flight data provider at the time of your search.
                    It does not include baggage, transfers or other fees, and we do not estimate
                    them — inventing those figures would not give you a reliable number. The final
                    price is confirmed on the booking partner's site.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold text-foreground mb-2">
                    Do you sell tickets directly?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    No, BookingsFinder is a travel intelligence platform. We provide insights and
                    recommendations, then connect you with trusted booking partners where you complete
                    your purchase.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <div className="py-6 bg-muted/50">
            <div className="container">
              <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto">
                BookingsFinder shows flight data returned by our provider at the time of your search.
                All bookings are completed on partner websites, where the final price is confirmed.
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TripOptimizer;
