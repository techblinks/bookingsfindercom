import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import App from "./App.tsx";
import SplashScreen from "./components/SplashScreen.tsx";
import { BrandingProvider } from "./hooks/useBranding";
import { FaviconUpdater } from "./components/brand/FaviconUpdater";
import "./index.css";

const SPLASH_DURATION = 1500; // 1.5 seconds
const SPLASH_SESSION_KEY = 'bf_splash_shown';

const Root = () => {
  // Only show splash on first visit of the session
  const hasSeenSplash = sessionStorage.getItem(SPLASH_SESSION_KEY) === 'true';
  const [showSplash, setShowSplash] = useState(!hasSeenSplash);
  const [splashExiting, setSplashExiting] = useState(false);

  useEffect(() => {
    if (!showSplash) return;
    
    const timer = setTimeout(() => {
      setSplashExiting(true);
      sessionStorage.setItem(SPLASH_SESSION_KEY, 'true');
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [showSplash]);

  useEffect(() => {
    if (splashExiting) {
      // Small delay for exit animation
      const exitTimer = setTimeout(() => {
        setShowSplash(false);
      }, 400);
      return () => clearTimeout(exitTimer);
    }
  }, [splashExiting]);

  // Skip splash entirely if already seen
  if (!showSplash && hasSeenSplash) {
    return (
      <BrandingProvider>
        <FaviconUpdater />
        <App />
      </BrandingProvider>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && !splashExiting && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>
      
      {/* App fades in as splash exits */}
      <div 
        className={`transition-opacity duration-300 ${showSplash ? 'opacity-0' : 'opacity-100'}`}
      >
        <BrandingProvider>
          <FaviconUpdater />
          <App />
        </BrandingProvider>
      </div>
    </>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
