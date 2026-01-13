import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import App from "./App.tsx";
import SplashScreen from "./components/SplashScreen.tsx";
import "./index.css";

const SPLASH_DURATION = 1500; // 1.5 seconds

const Root = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashExiting(true);
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (splashExiting) {
      // Small delay for exit animation
      const exitTimer = setTimeout(() => {
        setShowSplash(false);
      }, 400);
      return () => clearTimeout(exitTimer);
    }
  }, [splashExiting]);

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
        <App />
      </div>
    </>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
