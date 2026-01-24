import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Copy, 
  ArrowLeft,
  FileWarning,
  Lightbulb
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// Compliance rules: forbidden terms and their compliant alternatives
const COMPLIANCE_RULES = [
  {
    category: "Booking/Purchase Actions",
    severity: "critical",
    terms: [
      { forbidden: "Book Now", replacement: "View Deal", reason: "Implies direct booking capability" },
      { forbidden: "Book This", replacement: "Compare This", reason: "Implies direct booking" },
      { forbidden: "Book Today", replacement: "Compare Prices", reason: "Implies urgency to book with us" },
      { forbidden: "Buy Now", replacement: "View Deal", reason: "Implies direct purchase" },
      { forbidden: "Buy Ticket", replacement: "Compare Tickets", reason: "Implies we sell tickets" },
      { forbidden: "Purchase", replacement: "Compare / View", reason: "Implies transaction capability" },
      { forbidden: "Checkout", replacement: "Continue to Partner", reason: "Implies payment processing" },
      { forbidden: "Add to Cart", replacement: "Save / Compare", reason: "Implies e-commerce functionality" },
      { forbidden: "Complete Booking", replacement: "Continue to Partner", reason: "Implies we complete bookings" },
    ]
  },
  {
    category: "Payment/Transaction Terms",
    severity: "critical",
    terms: [
      { forbidden: "Secure Payment", replacement: "Secure Partner", reason: "Implies we process payments" },
      { forbidden: "Payment Protected", replacement: "Verified Partner", reason: "Implies payment handling" },
      { forbidden: "Your Payment", replacement: "Your Booking", reason: "Implies we handle payments" },
      { forbidden: "Pay Now", replacement: "View Deal", reason: "Implies direct payment" },
      { forbidden: "Credit Card", replacement: "(remove or redirect context)", reason: "Payment info not needed" },
      { forbidden: "Enter Payment", replacement: "(redirect to partner)", reason: "We don't collect payment" },
    ]
  },
  {
    category: "Ownership/Selling Claims",
    severity: "high",
    terms: [
      { forbidden: "We Sell", replacement: "We Compare", reason: "We don't sell products" },
      { forbidden: "Our Tickets", replacement: "Partner Tickets", reason: "We don't own inventory" },
      { forbidden: "Our Flights", replacement: "Available Flights", reason: "We don't operate flights" },
      { forbidden: "Our Hotels", replacement: "Partner Hotels", reason: "We don't own hotels" },
      { forbidden: "Best Price Guaranteed", replacement: "Compare Best Prices", reason: "Can't guarantee partner prices" },
    ]
  },
  {
    category: "Misleading Service Claims",
    severity: "medium",
    terms: [
      { forbidden: "24/7 Support", replacement: "Partner Support Available", reason: "Support is via partners" },
      { forbidden: "Customer Service", replacement: "Help Center / FAQs", reason: "Clarify scope of support" },
      { forbidden: "Refund Policy", replacement: "Partner Refund Policies", reason: "Refunds handled by partners" },
      { forbidden: "Cancellation", replacement: "Partner Cancellation Policies", reason: "Cancellations via partners" },
    ]
  }
];

interface ScanResult {
  term: string;
  replacement: string;
  reason: string;
  severity: string;
  category: string;
  positions: number[];
  context: string[];
}

const AdminCompliance = () => {
  const { user, isLoading: authLoading, isAdmin } = useAdminAuth();
  const [textToScan, setTextToScan] = useState("");
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  // Flatten all rules for scanning
  const allRules = useMemo(() => {
    return COMPLIANCE_RULES.flatMap(category => 
      category.terms.map(term => ({
        ...term,
        category: category.category,
        severity: category.severity
      }))
    );
  }, []);

  const handleScan = () => {
    if (!textToScan.trim()) {
      toast.error("Please enter some text to scan");
      return;
    }

    const results: ScanResult[] = [];
    const textLower = textToScan.toLowerCase();

    allRules.forEach(rule => {
      const forbiddenLower = rule.forbidden.toLowerCase();
      const positions: number[] = [];
      const contexts: string[] = [];
      
      let pos = textLower.indexOf(forbiddenLower);
      while (pos !== -1) {
        positions.push(pos);
        // Extract context (50 chars before and after)
        const start = Math.max(0, pos - 50);
        const end = Math.min(textToScan.length, pos + rule.forbidden.length + 50);
        contexts.push(textToScan.substring(start, end));
        pos = textLower.indexOf(forbiddenLower, pos + 1);
      }

      if (positions.length > 0) {
        results.push({
          term: rule.forbidden,
          replacement: rule.replacement,
          reason: rule.reason,
          severity: rule.severity,
          category: rule.category,
          positions,
          context: contexts
        });
      }
    });

    setScanResults(results);
    setHasScanned(true);

    if (results.length === 0) {
      toast.success("No compliance issues found!");
    } else {
      toast.warning(`Found ${results.length} potential compliance issue(s)`);
    }
  };

  const handleCopyRules = () => {
    const rulesText = COMPLIANCE_RULES.map(cat => 
      `## ${cat.category} (${cat.severity})\n` + 
      cat.terms.map(t => `- "${t.forbidden}" → "${t.replacement}"`).join('\n')
    ).join('\n\n');
    
    navigator.clipboard.writeText(rulesText);
    toast.success("Compliance rules copied to clipboard");
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminLoginForm />;
  }

  return (
    <>
      <Helmet>
        <title>Compliance Scanner | Admin | BookingsFinder</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background py-8">
        <div className="container max-w-6xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link to="/admin" className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Compliance Scanner
              </h1>
              <p className="text-muted-foreground">
                Scan content for non-compliant wording that could violate meta-search guidelines
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Scanner Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Content Scanner
                  </CardTitle>
                  <CardDescription>
                    Paste code, copy, or any text content to scan for non-compliant wording
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Paste your content here to scan for compliance issues...

Example: 'Book Now to secure your flight at the best price! Our secure checkout ensures your payment is protected.'"
                    value={textToScan}
                    onChange={(e) => setTextToScan(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <div className="flex gap-3">
                    <Button onClick={handleScan} className="gap-2">
                      <Search className="h-4 w-4" />
                      Scan for Issues
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setTextToScan("");
                        setScanResults([]);
                        setHasScanned(false);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Scan Results */}
              {hasScanned && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {scanResults.length === 0 ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-success" />
                          No Issues Found
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          {scanResults.length} Issue{scanResults.length > 1 ? 's' : ''} Found
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {scanResults.length === 0 ? (
                      <p className="text-muted-foreground">
                        Great! The scanned content appears to be compliant with meta-search guidelines.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {scanResults.map((result, index) => (
                          <div 
                            key={index}
                            className="border border-border rounded-lg p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <Badge className={getSeverityColor(result.severity)}>
                                  {result.severity}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {result.category}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {result.positions.length} occurrence{result.positions.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-semibold text-destructive line-through">
                                  "{result.term}"
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-semibold text-success">
                                  "{result.replacement}"
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {result.reason}
                              </p>
                            </div>

                            {result.context.length > 0 && (
                              <div className="bg-muted/50 rounded p-2 text-xs font-mono overflow-x-auto">
                                {result.context[0]}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Rules Reference */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileWarning className="h-5 w-5" />
                      Forbidden Terms
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleCopyRules}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Terms that should never appear in user-facing content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {COMPLIANCE_RULES.map((category, catIndex) => (
                    <div key={catIndex}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {category.severity}
                        </Badge>
                        <span className="text-sm font-medium">{category.category}</span>
                      </div>
                      <ul className="space-y-1 text-xs">
                        {category.terms.slice(0, 3).map((term, termIndex) => (
                          <li key={termIndex} className="text-muted-foreground">
                            <span className="text-destructive">{term.forbidden}</span>
                            <span className="mx-1">→</span>
                            <span className="text-success">{term.replacement}</span>
                          </li>
                        ))}
                        {category.terms.length > 3 && (
                          <li className="text-muted-foreground/60">
                            +{category.terms.length - 3} more...
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Best Practices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      Use "View Deal" or "Compare" for CTAs
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      Always mention "partner" when discussing bookings
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      Use "Continue to Partner" for redirects
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      Never imply we handle payments
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      Clarify we're a "meta-search" platform
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default AdminCompliance;
