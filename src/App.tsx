import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import FlightResults from "./pages/FlightResults";
import HotelResults from "./pages/HotelResults";
import DestinationPage from "./pages/DestinationPage";
import BookingRedirect from "./pages/BookingRedirect";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import AffiliateDisclosure from "./pages/AffiliateDisclosure";
import MyAlerts from "./pages/MyAlerts";
import AdminAlerts from "./pages/AdminAlerts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
          <Route path="/admin/alerts" element={<AdminAlerts />} />
          <Route path="/d/:slug" element={<DestinationPage />} />
          <Route path="/redirect" element={<BookingRedirect />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/affiliate-disclosure" element={<AffiliateDisclosure />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
