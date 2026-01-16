import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
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
import AdminSubscribers from "./pages/AdminSubscribers";
import AdminSettings from "./pages/AdminSettings";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/flights" element={<FlightResults />} />
            <Route path="/hotels" element={<HotelResults />} />
            <Route path="/my-alerts" element={<MyAlerts />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/alerts" element={<AdminAlerts />} />
            <Route path="/admin/ads" element={<AdminAds />} />
            <Route path="/admin/blog" element={<AdminBlog />} />
            <Route path="/admin/press" element={<AdminPress />} />
            <Route path="/admin/subscribers" element={<AdminSubscribers />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/d/:slug" element={<DestinationPage />} />
            {/* Country Landing Pages */}
            <Route path="/:slug" element={<CountryLandingPage />} />
            <Route path="/redirect" element={<BookingRedirect />} />
            {/* Company */}
            <Route path="/about" element={<AboutUs />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/press" element={<Press />} />
            <Route path="/press/:slug" element={<PressRelease />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            {/* Support */}
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faqs" element={<FAQs />} />
            {/* Legal */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/affiliate-disclosure" element={<AffiliateDisclosure />} />
            {/* Info */}
            <Route path="/how-it-works" element={<HowItWorks />} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
