import { useState } from "react";
import { format, addDays } from "date-fns";
import { Calendar as CalendarIcon, Briefcase, Zap, DollarSign, Shield, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import LocationCombobox from "@/components/search/LocationCombobox";
import { OptimizerRequest } from "@/hooks/useOptimizer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface OptimizerFormProps {
  onSubmit: (data: OptimizerRequest) => void;
  error?: string | null;
}

const OptimizerForm = ({ onSubmit, error }: OptimizerFormProps) => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState<Date | undefined>(addDays(new Date(), 14));
  const [returnDate, setReturnDate] = useState<Date | undefined>(addDays(new Date(), 21));
  const [hasBags, setHasBags] = useState(false);
  const [priority, setPriority] = useState<"cheapest" | "fastest" | "low_risk">("cheapest");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!origin || !destination || !travelDate) {
      return;
    }

    onSubmit({
      origin,
      destination,
      travelWindowStart: format(travelDate, "yyyy-MM-dd"),
      travelWindowEnd: returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
      hasBags,
      priority,
    });
  };

  const isValid = origin && destination && travelDate;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground mb-6">Plan Your Trip</h2>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Origin & Destination */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="origin" className="text-sm font-medium">From</Label>
            <div className="border border-input rounded-lg px-3 py-2 bg-background focus-within:ring-2 focus-within:ring-ring">
              <LocationCombobox
                id="origin"
                value={origin}
                onChange={(val) => setOrigin(val)}
                placeholder="City or airport"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="destination" className="text-sm font-medium">To</Label>
            <div className="border border-input rounded-lg px-3 py-2 bg-background focus-within:ring-2 focus-within:ring-ring">
              <LocationCombobox
                id="destination"
                value={destination}
                onChange={(val) => setDestination(val)}
                placeholder="City or airport"
              />
            </div>
          </div>
        </div>

        {/* Travel Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Departure Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !travelDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {travelDate ? format(travelDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={travelDate}
                  onSelect={setTravelDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Return Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !returnDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {returnDate ? format(returnDate, "PPP") : "One-way trip"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={returnDate}
                  onSelect={setReturnDate}
                  disabled={(date) => date < (travelDate || new Date())}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Baggage Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 mb-6">
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground text-sm">Checked Baggage</p>
              <p className="text-xs text-muted-foreground">
                Baggage preference only — fees aren't included or estimated
              </p>
            </div>
          </div>
          <Switch
            checked={hasBags}
            onCheckedChange={setHasBags}
            aria-label="Include checked baggage"
          />
        </div>

        {/* Priority Selection */}
        <div className="space-y-3 mb-6">
          <Label className="text-sm font-medium">What's your priority?</Label>
          <RadioGroup
            value={priority}
            onValueChange={(val) => setPriority(val as typeof priority)}
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            <Label
              htmlFor="cheapest"
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                priority === "cheapest"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="cheapest" id="cheapest" />
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">Cheapest</span>
            </Label>
            <Label
              htmlFor="fastest"
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                priority === "fastest"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="fastest" id="fastest" />
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Fastest</span>
            </Label>
            <Label
              htmlFor="low_risk"
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                priority === "low_risk"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="low_risk" id="low_risk" />
              <Shield className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Low Risk</span>
            </Label>
          </RadioGroup>
        </div>

        <Button
          variant="conversion"
          type="submit"
          size="lg"
          className="w-full"
          disabled={!isValid}
        >
          Optimize My Trip
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Free users get 1 optimization per month. <a href="#" className="text-primary underline">Upgrade to Pro</a> for unlimited access.
      </p>
    </form>
  );
};

export default OptimizerForm;
