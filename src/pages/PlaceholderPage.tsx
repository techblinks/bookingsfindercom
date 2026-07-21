import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Construction } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface PlaceholderPageProps {
  title: string;
  description?: string;
  returnTo?: string;
  returnLabel?: string;
}

function PlaceholderPage({
  title,
  description = "We're building this feature to help you travel ready. It'll be available soon.",
  returnTo = "/",
  returnLabel = "Back to homepage",
}: PlaceholderPageProps) {
  return (
    <>
      <Helmet>
        <title>{title} — BookingsFinder</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main id="main-content" className="flex-1 flex items-center justify-center p-4 py-16">
          <div className="text-center max-w-lg">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-8">
              <Construction className="h-10 w-10 text-accent" aria-hidden="true" />
            </div>

            {/* Coming soon badge */}
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium border bg-muted text-muted-foreground border-border mb-4">
              Coming soon
            </span>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              {title}
            </h1>

            {/* Description */}
            <p className="text-base text-muted-foreground mb-8 leading-relaxed max-w-md mx-auto">
              {description}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to={returnTo}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {returnLabel}
              </Link>
              <Link
                to="/flights"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                <Search className="h-4 w-4" />
                Search flights
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

export default PlaceholderPage;
