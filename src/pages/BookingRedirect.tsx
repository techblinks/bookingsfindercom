import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Shield, Lock, CheckCircle } from "lucide-react";

// Partner logos placeholder data - ready for real logos
const partnerLogos = [
  { id: "partner-1", name: "Partner 1" },
  { id: "partner-2", name: "Partner 2" },
  { id: "partner-3", name: "Partner 3" },
  { id: "partner-4", name: "Partner 4" },
];

const BookingRedirect = () => {
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(2);
  
  // Get redirect URL from query parameter
  const redirectUrl = searchParams.get("url") || searchParams.get("redirect") || "";
  const partnerName = searchParams.get("partner") || "our partner";

  useEffect(() => {
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto redirect after 2 seconds
    const redirectTimer = setTimeout(() => {
      if (redirectUrl) {
        // Validate URL before redirecting
        try {
          const url = new URL(redirectUrl);
          window.location.href = url.toString();
        } catch {
          console.error("Invalid redirect URL");
        }
      }
    }, 2000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(redirectTimer);
    };
  }, [redirectUrl]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Loading Spinner */}
        <div className="mb-8">
          <div className="relative w-20 h-20 mx-auto">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-secondary"></div>
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
            {/* Inner icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Main Text */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Finding the best deal for you...
        </h1>
        <p className="text-muted-foreground mb-8">
          Connecting you to {partnerName}
          {countdown > 0 && (
            <span className="block text-sm mt-1">
              Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}
            </span>
          )}
        </p>

        {/* Safety Message */}
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400 mb-2">
            <Lock className="h-4 w-4" />
            <span className="font-semibold text-sm">Secure Booking</span>
          </div>
          <ul className="space-y-2 text-sm text-green-600 dark:text-green-500">
            <li className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>256-bit SSL encryption</span>
            </li>
            <li className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>Your data is protected</span>
            </li>
            <li className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>Verified partner network</span>
            </li>
          </ul>
        </div>

        {/* Partner Logos */}
        <div className="mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
            Trusted Partners
          </p>
          <div className="flex items-center justify-center gap-4">
            {partnerLogos.map((partner) => (
              <div
                key={partner.id}
                className="w-16 h-10 rounded-lg bg-secondary flex items-center justify-center"
                title={partner.name}
              >
                <span className="text-xs text-muted-foreground font-medium">
                  Logo
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Link */}
        {redirectUrl && (
          <p className="text-sm text-muted-foreground">
            Not redirecting?{" "}
            <a
              href={redirectUrl}
              className="text-primary hover:underline font-medium"
              rel="noopener noreferrer"
            >
              Click here
            </a>
          </p>
        )}

        {/* No URL provided message */}
        {!redirectUrl && (
          <p className="text-sm text-muted-foreground">
            No redirect URL provided.{" "}
            <a href="/" className="text-primary hover:underline font-medium">
              Return home
            </a>
          </p>
        )}
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-center">
        <p className="text-xs text-muted-foreground">
          By continuing, you agree to our partner's terms and conditions
        </p>
      </footer>
    </div>
  );
};

export default BookingRedirect;
