import { useState } from 'react';
import { Bell, Mail, Search, ArrowRight, Loader2, Plane } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { SavedSearchesPanel } from '@/components/flights/SavedSearchesPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePriceAlerts, SavedSearch } from '@/hooks/usePriceAlerts';

export default function MyAlerts() {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSearching(true);
    // Small delay for UX
    setTimeout(() => {
      setSubmittedEmail(email.trim().toLowerCase());
      setIsSearching(false);
    }, 500);
  };

  const handleSearchClick = (search: SavedSearch) => {
    const params = new URLSearchParams({
      origin: search.origin,
      destination: search.destination,
      departureDate: search.departure_date,
      passengers: search.passengers.toString(),
      cabinClass: search.cabin_class,
    });
    if (search.return_date) {
      params.set('returnDate', search.return_date);
    }
    window.location.href = `/flights?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Bell className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">My Price Alerts</h1>
            <p className="text-muted-foreground">
              Enter your email to view and manage your saved flight price alerts
            </p>
          </div>

          {/* Email Input */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Find Your Alerts</CardTitle>
              <CardDescription>
                Enter the email address you used when creating your price alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <Button type="submit" disabled={isSearching} className="gap-2">
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Find Alerts
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          {submittedEmail && (
            <div className="space-y-6">
              <SavedSearchesPanel 
                email={submittedEmail} 
                onSearchClick={handleSearchClick}
              />

              {/* Create New Alert CTA */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Plane className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Create a New Alert</h3>
                        <p className="text-sm text-muted-foreground">
                          Search for flights and set up a price alert
                        </p>
                      </div>
                    </div>
                    <Link to="/">
                      <Button variant="outline" className="gap-2">
                        Search Flights
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* How it Works */}
          {!submittedEmail && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How Price Alerts Work</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="text-center p-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold text-primary">1</span>
                    </div>
                    <h4 className="font-medium mb-1">Set Your Alert</h4>
                    <p className="text-sm text-muted-foreground">
                      Search for flights and click "Set Price Alert"
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold text-primary">2</span>
                    </div>
                    <h4 className="font-medium mb-1">We Monitor Prices</h4>
                    <p className="text-sm text-muted-foreground">
                      We check prices regularly and track changes
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold text-primary">3</span>
                    </div>
                    <h4 className="font-medium mb-1">Get Notified</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive an email when prices drop
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
