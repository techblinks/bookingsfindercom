import { useEffect, useCallback, useRef, useState } from "react";
import { Building2, AlertTriangle } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { HotelSearchForm } from "@/components/hotels/HotelSearchForm";
import { buildHotelSearchUrl, validateHotelParams } from "@/lib/travelConfig";

const HotelResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handoffAttempted = useRef(false);
  const [handoffState, setHandoffState] = useState<"idle" | "unavailable">("idle");
  const [handoffReason, setHandoffReason] = useState<string | null>(null);

  const destination = searchParams.get("destination") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = searchParams.get("guests") || "2";
  const rooms = searchParams.get("rooms") || "1";
  const hasSearchParams = !!(destination && checkIn && checkOut);

  const guestsNum = isNaN(parseInt(guests)) ? 2 : parseInt(guests);
  const roomsNum = isNaN(parseInt(rooms)) ? 1 : parseInt(rooms);

  const handleFormSubmit = useCallback((values: { destination: string; checkIn: string; checkOut: string; adults: number; rooms: number }) => {
    const qs = new URLSearchParams();
    qs.set("destination", values.destination.trim());
    qs.set("checkIn", values.checkIn);
    qs.set("checkOut", values.checkOut);
    qs.set("guests", String(values.adults));
    qs.set("rooms", String(values.rooms));
    navigate(`/hotels?${qs.toString()}`);
  }, [navigate]);

  // ── Provider availability check ──
  useEffect(() => {
    if (!hasSearchParams || handoffAttempted.current) return;
    handoffAttempted.current = true;

    const params = {
      destination,
      checkIn,
      checkOut,
      adults: guestsNum,
      rooms: roomsNum,
    };

    // Validate
    const validation = validateHotelParams(params);
    if (!validation.valid) {
      setHandoffState("unavailable");
      setHandoffReason("Validation failed: " + validation.errors.map(e => e.message).join(", "));
      return;
    }

    // Check if provider is active
    const urlResult = buildHotelSearchUrl(params);
    if (!urlResult.success) {
      setHandoffState("unavailable");
      setHandoffReason(urlResult.reason || "Hotel partner configuration is being updated.");
      return;
    }

    // If we reach here, an active provider exists — but none is configured.
    // This is intentionally unreachable until a new active provider is added.
    setHandoffState("unavailable");
    setHandoffReason("Hotel partner configuration is being updated.");
  }, [hasSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pre-search state (no params) ──
  if (!hasSearchParams) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container max-w-2xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Search accommodation with our travel partner.
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              Current prices and availability are shown by the provider.
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6">
            <HotelSearchForm onSubmit={handleFormSubmit} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Provider unavailable ──
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container max-w-2xl mx-auto px-4 py-16">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
            <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Hotel partner configuration is being updated.
          </h1>
          <p className="text-muted-foreground mb-2 max-w-md mx-auto">
            BookingsFinder is updating its accommodation provider integration.
          </p>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            Your search for{" "}
            <span className="font-medium text-foreground">{destination}</span>
            {" "}has been preserved. Please check back soon or modify your search.
          </p>

          {/* Preserved search details */}
          <div className="bg-card rounded-xl border border-border p-4 mb-6 max-w-sm mx-auto text-left">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destination</span>
                <span className="font-medium">{destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-medium">{checkIn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-out</span>
                <span className="font-medium">{checkOut}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guests</span>
                <span className="font-medium">{guests} {guestsNum === 1 ? "guest" : "guests"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rooms</span>
                <span className="font-medium">{rooms} {roomsNum === 1 ? "room" : "rooms"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/hotels">
              <Button variant="outline">Modify Search</Button>
            </Link>
          </div>

          {/* DEV: diagnostic info */}
          {import.meta.env.DEV && (
            <div className="mt-8 text-xs text-muted-foreground max-w-md mx-auto text-left space-y-1">
              <p className="font-semibold">Provider status:</p>
              <p>• Hotellook: discontinued (20 Oct 2025)</p>
              <p>• No active hotel provider configured</p>
              <p>• Handoff reason: {handoffReason || "N/A"}</p>
              <p>• No affiliate click was recorded</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HotelResults;
