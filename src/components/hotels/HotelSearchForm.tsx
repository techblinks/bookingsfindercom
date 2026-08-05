import { useState } from "react";
import { Search, Users, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AFFILIATE_DISCLOSURE } from "@/lib/travelConfig";
import HotelDestinationCombobox from "@/components/hotels/HotelDestinationCombobox";

interface HotelSearchFormValues {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
}

interface ValidationErrors {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  rooms?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function validate(values: HotelSearchFormValues): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!values.destination.trim()) {
    errors.destination = "Enter a destination";
  }
  if (!values.checkIn || !DATE_RE.test(values.checkIn)) {
    errors.checkIn = "Enter a check-in date";
  } else if (values.checkIn < getTodayStr()) {
    errors.checkIn = "Check-in cannot be in the past";
  }
  if (!values.checkOut || !DATE_RE.test(values.checkOut)) {
    errors.checkOut = "Enter a check-out date";
  } else if (values.checkIn && DATE_RE.test(values.checkIn) && values.checkOut <= values.checkIn) {
    errors.checkOut = "Check-out must be after check-in";
  }
  if (!Number.isInteger(values.adults) || values.adults < 1) {
    errors.adults = "At least 1 adult";
  } else if (values.adults > 10) {
    errors.adults = "Maximum 10 adults";
  }
  if (!Number.isInteger(values.rooms) || values.rooms < 1) {
    errors.rooms = "At least 1 room";
  } else if (values.rooms > 5) {
    errors.rooms = "Maximum 5 rooms";
  }
  return errors;
}

interface HotelSearchFormProps {
  onSubmit: (values: HotelSearchFormValues) => void;
  defaultDestination?: string;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultAdults?: number;
  defaultRooms?: number;
}

export function HotelSearchForm({
  onSubmit,
  defaultDestination = "",
  defaultCheckIn = "",
  defaultCheckOut = "",
  defaultAdults = 2,
  defaultRooms = 1,
}: HotelSearchFormProps) {
  const [values, setValues] = useState<HotelSearchFormValues>({
    destination: defaultDestination,
    checkIn: defaultCheckIn,
    checkOut: defaultCheckOut,
    adults: defaultAdults,
    rooms: defaultRooms,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const handleChange = (field: keyof HotelSearchFormValues, value: string | number) => {
    setValues(prev => {
      const next = { ...prev, [field]: value };
      if (touched.size > 0) {
        const nextErrors = validate(next);
        const filtered: ValidationErrors = {};
        for (const key of touched) {
          if (nextErrors[key as keyof ValidationErrors]) {
            filtered[key as keyof ValidationErrors] = nextErrors[key as keyof ValidationErrors];
          }
        }
        setErrors(filtered);
      }
      return next;
    });
  };

  const handleDestinationChange = (value: string) => {
    handleChange("destination", value);
  };

  const handleBlur = (field: keyof HotelSearchFormValues) => {
    setTouched(prev => new Set([...prev, field]));
    const currentErrors = validate(values);
    setErrors(prev => ({ ...prev, [field]: currentErrors[field] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allFields: (keyof HotelSearchFormValues)[] = ["destination", "checkIn", "checkOut", "adults", "rooms"];
    setTouched(new Set(allFields));
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      onSubmit(values);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Destination */}
      <div>
        <Label htmlFor="hotelDest">Destination</Label>
        <HotelDestinationCombobox
          id="hotelDest"
          value={values.destination}
          onChange={handleDestinationChange}
          placeholder="City or region"
        />
        {errors.destination && <p id="err-dest" className="text-xs text-destructive mt-1">{errors.destination}</p>}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hotelCheckIn">Check-in</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="hotelCheckIn"
              type="date"
              value={values.checkIn}
              onChange={e => handleChange("checkIn", e.target.value)}
              onBlur={() => handleBlur("checkIn")}
              min={getTodayStr()}
              aria-invalid={!!errors.checkIn}
              aria-describedby={errors.checkIn ? "err-checkIn" : undefined}
              className="h-12 rounded-xl pl-10"
            />
          </div>
          {errors.checkIn && <p id="err-checkIn" className="text-xs text-destructive mt-1">{errors.checkIn}</p>}
        </div>
        <div>
          <Label htmlFor="hotelCheckOut">Check-out</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="hotelCheckOut"
              type="date"
              value={values.checkOut}
              onChange={e => handleChange("checkOut", e.target.value)}
              onBlur={() => handleBlur("checkOut")}
              min={values.checkIn || getTodayStr()}
              aria-invalid={!!errors.checkOut}
              aria-describedby={errors.checkOut ? "err-checkOut" : undefined}
              className="h-12 rounded-xl pl-10"
            />
          </div>
          {errors.checkOut && <p id="err-checkOut" className="text-xs text-destructive mt-1">{errors.checkOut}</p>}
        </div>
      </div>

      {/* Guests + Rooms */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hotelAdults">Adults</Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="hotelAdults"
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              step={1}
              value={values.adults}
              onChange={e => handleChange("adults", parseInt(e.target.value) || 1)}
              onBlur={() => handleBlur("adults")}
              aria-invalid={!!errors.adults}
              aria-describedby={errors.adults ? "err-adults" : undefined}
              className="h-12 rounded-xl pl-10"
            />
          </div>
          {errors.adults && <p id="err-adults" className="text-xs text-destructive mt-1">{errors.adults}</p>}
        </div>
        <div>
          <Label htmlFor="hotelRooms">Rooms</Label>
          <Input
            id="hotelRooms"
            type="number"
            inputMode="numeric"
            min={1}
            max={5}
            step={1}
            value={values.rooms}
            onChange={e => handleChange("rooms", parseInt(e.target.value) || 1)}
            onBlur={() => handleBlur("rooms")}
            aria-invalid={!!errors.rooms}
            aria-describedby={errors.rooms ? "err-rooms" : undefined}
            className="h-12 rounded-xl"
          />
          {errors.rooms && <p id="err-rooms" className="text-xs text-destructive mt-1">{errors.rooms}</p>}
        </div>
      </div>

      {/* Submit */}
      <Button variant="conversion" type="submit" size="lg" className="w-full h-12 text-base font-semibold rounded-xl gap-2">
        <Search className="h-4 w-4" />
        Search hotels
      </Button>

      {/* Trust disclosure */}
      <p className="text-xs text-muted-foreground leading-relaxed text-center">
        Prices and availability are confirmed by the booking provider. BookingsFinder may earn a commission when you use a partner link, at no extra cost to you.
      </p>
    </form>
  );
}
