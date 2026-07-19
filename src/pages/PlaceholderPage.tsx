import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";

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
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
            <Construction className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{title}</h1>
          <p className="text-muted-foreground mb-8">{description}</p>
          <Link
            to={returnTo}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {returnLabel}
          </Link>
        </div>
      </div>
    </>
  );
}

export default PlaceholderPage;
