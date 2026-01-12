import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Shield, Lock, CheckCircle, Plane, Building2 } from "lucide-react";
import { motion } from "framer-motion";

// Real partner logos data
const partnerLogos = [
  { id: "aviasales", name: "Aviasales", logo: "✈️" },
  { id: "hotellook", name: "Hotellook", logo: "🏨" },
  { id: "kayak", name: "KAYAK", logo: "🔍" },
  { id: "skyscanner", name: "Skyscanner", logo: "🌍" },
];

const BookingRedirect = () => {
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);
  
  // Get redirect URL from query parameter
  const redirectUrl = searchParams.get("url") || searchParams.get("redirect") || "";
  const partnerName = searchParams.get("partner") || "our partner";
  const type = searchParams.get("type") || "flight";
  const origin = searchParams.get("origin") || "";
  const destination = searchParams.get("destination") || "";
  const price = searchParams.get("price") || "";

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + (100 / 30); // Complete in ~3 seconds
      });
    }, 100);

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

    // Auto redirect after 3 seconds
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
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(countdownInterval);
      clearTimeout(redirectTimer);
    };
  }, [redirectUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 text-2xl font-bold text-primary">
            <Plane className="h-8 w-8" />
            <span>BookingsFinder</span>
          </div>
        </motion.div>

        {/* Animated Loader */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative w-24 h-24 mx-auto">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-secondary" />
            {/* Progress ring */}
            <svg className="absolute inset-0 w-24 h-24 -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="44"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                className="transition-all duration-100"
              />
            </svg>
            {/* Inner icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                {type === "hotel" ? (
                  <Building2 className="h-10 w-10 text-primary" />
                ) : (
                  <Plane className="h-10 w-10 text-primary" />
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Main Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Finding the best deal for you...
          </h1>
          <p className="text-muted-foreground mb-2">
            Connecting you to <span className="font-semibold text-foreground">{partnerName}</span>
          </p>
          
          {/* Route info if available */}
          {origin && destination && (
            <p className="text-sm text-muted-foreground mb-2">
              {origin} → {destination}
              {price && <span className="font-semibold text-foreground ml-2">${price}</span>}
            </p>
          )}
          
          {countdown > 0 && (
            <motion.p
              key={countdown}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-sm text-primary font-medium"
            >
              Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}
            </motion.p>
          )}
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 mb-8"
        >
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.div>

        {/* Safety Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-5 mb-8"
        >
          <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 mb-3">
            <Shield className="h-5 w-5" />
            <span className="font-semibold">Secure Booking Guaranteed</span>
          </div>
          <ul className="space-y-2 text-sm text-emerald-600 dark:text-emerald-500">
            <li className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>256-bit SSL encryption</span>
            </li>
            <li className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 flex-shrink-0" />
              <span>Your payment data is protected</span>
            </li>
            <li className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>Verified partner network</span>
            </li>
          </ul>
        </motion.div>

        {/* Partner Logos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
            Powered by trusted partners
          </p>
          <div className="flex items-center justify-center gap-6">
            {partnerLogos.map((partner, index) => (
              <motion.div
                key={partner.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-xl shadow-sm">
                  {partner.logo}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {partner.name}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Manual Link */}
        {redirectUrl && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-sm text-muted-foreground"
          >
            Not redirecting?{" "}
            <a
              href={redirectUrl}
              className="text-primary hover:underline font-medium"
              rel="noopener noreferrer"
            >
              Click here to continue
            </a>
          </motion.p>
        )}

        {/* No URL provided message */}
        {!redirectUrl && (
          <p className="text-sm text-muted-foreground">
            No redirect URL provided.{" "}
            <a href="/" className="text-primary hover:underline font-medium">
              Return to homepage
            </a>
          </p>
        )}
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-center">
        <p className="text-xs text-muted-foreground max-w-md px-4">
          By continuing, you agree to our partner's terms and conditions. 
          BookingsFinder may earn a commission from bookings made through our links.
        </p>
      </footer>
    </div>
  );
};

export default BookingRedirect;
