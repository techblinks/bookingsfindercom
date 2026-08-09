import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import App from "./App.tsx";
import SplashScreen from "./components/SplashScreen.tsx";
import { BrandingProvider } from "./hooks/useBranding";
import { FaviconUpdater } from "./components/brand/FaviconUpdater";
import "./index.css";

const SPLASH_DURATION = 800; // M1: shortened to 0.8s
const SPLASH_SESSION_KEY = 'bf_splash_shown';

const Root = () => {
  const hasSeenSplash = sessionStorage.getItem(SPLASH_SESSION_KEY) === 'true';

  // M1: App is always rendered immediately. Splash is non-blocking overlay.
  if (hasSeenSplash) {
    return (
      <BrandingProvider>
        <FaviconUpdater />
        <App />
      </BrandingProvider>
    );
  }

  return (
    <>
      <BrandingProvider>
        <FaviconUpdater />
        <App />
      </BrandingProvider>
      <FirstVisitSplash />
    </>
  );
};

/** Non-blocking splash overlay shown only on first session visit */
function FirstVisitSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SPLASH_SESSION_KEY, 'true');
    }, SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  // M1.1: pointer-events: none — splash is purely visual, never blocks interaction
  return (
    <div
      className="fixed inset-0 z-[9999] bg-background transition-opacity duration-300 pointer-events-none"
    >
      <SplashScreen onComplete={() => setVisible(false)} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
