import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { HelmetProvider } from "react-helmet-async";
import CookieConsent from "@/components/CookieConsent";
import BottomNav from "@/components/layout/BottomNav";
import Index from "./pages/Index";
import FlightResults from "./pages/FlightResults";
import HotelResults from "./pages/HotelResults";
import DestinationPage from "./pages/DestinationPage";
import CountryLandingPage from "./pages/CountryLandingPage";
import BookingRedirect from "./pages/BookingRedirect";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import AffiliateDisclosure from "./pages/AffiliateDisclosure";
import MyAlerts from "./pages/MyAlerts";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAlerts from "./pages/AdminAlerts";
import AdminAds from "./pages/AdminAds";
import AdminBlog from "./pages/AdminBlog";
import AdminPress from "./pages/AdminPress";
import AdminCountryPages from "./pages/AdminCountryPages";
import AdminSubscribers from "./pages/AdminSubscribers";
import AdminSettings from "./pages/AdminSettings";
import AdminCompliance from "./pages/AdminCompliance";
import AdminContentGenerator from "./pages/AdminContentGenerator";
import AboutUs from "./pages/AboutUs";
import Careers from "./pages/Careers";
import HelpCenter from "./pages/HelpCenter";
import Contact from "./pages/Contact";
import FAQs from "./pages/FAQs";
import CookiePolicy from "./pages/CookiePolicy";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Press from "./pages/Press";
import PressRelease from "./pages/PressRelease";
import HowItWorks from "./pages/HowItWorks";
import WhyWeDontSellTickets from "./pages/WhyWeDontSellTickets";
import TopFlightDestinations from "./pages/TopFlightDestinations";
import TopHotelDestinations from "./pages/TopHotelDestinations";
import FlightDealsGuide from "./pages/FlightDealsGuide";
import HotelBookingGuide from "./pages/HotelBookingGuide";
import TripOptimizer from "./pages/TripOptimizer";
import Pricing from "./pages/Pricing";
import Account from "./pages/Account";
import RoutePage from "./pages/RoutePage";
import ExitIntentPopup from "./components/ExitIntentPopup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ type: "tween" as const, ease: "easeInOut" as const, duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/optimizer" element={<TripOptimizer />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/account" element={<Account />} />
          <Route path="/flights" element={<FlightResults />} />
          <Route path="/hotels" element={<HotelResults />} />
          <Route path="/my-alerts" element={<MyAlerts />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/alerts" element={<AdminAlerts />} />
          <Route path="/admin/ads" element={<AdminAds />} />
          <Route path="/admin/blog" element={<AdminBlog />} />
          <Route path="/admin/press" element={<AdminPress />} />
          <Route path="/admin/country-pages" element={<AdminCountryPages />} />
          <Route path="/admin/subscribers" element={<AdminSubscribers />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/compliance" element={<AdminCompliance />} />
          <Route path="/admin/content-generator" element={<AdminContentGenerator />} />
          <Route path="/d/:slug" element={<DestinationPage />} />
          <Route path="/:slug" element={<CountryLandingPage />} />
          <Route path="/redirect" element={<BookingRedirect />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/press" element={<Press />} />
          <Route path="/press/:slug" element={<PressRelease />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="/affiliate-disclosure" element={<AffiliateDisclosure />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/why-we-dont-sell-tickets" element={<WhyWeDontSellTickets />} />
          <Route path="/top-flight-destinations" element={<TopFlightDestinations />} />
          <Route path="/top-hotel-destinations" element={<TopHotelDestinations />} />
          <Route path="/flight-deals-guide" element={<FlightDealsGuide />} />
          <Route path="/hotel-booking-guide" element={<HotelBookingGuide />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
          <CookieConsent />
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
