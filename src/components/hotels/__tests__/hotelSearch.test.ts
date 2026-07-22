import { describe, it, expect } from "vitest";

/**
 * Extract and test the validation logic from HotelSearchForm.
 * (Pure function tested without React — same rules as the component.)
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getTodayStr(): string {
  return "2026-08-20"; // Fixed reference for stable tests
}

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

function validate(values: HotelSearchFormValues, today: string = getTodayStr()): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!values.destination.trim()) {
    errors.destination = "Enter a destination";
  }
  if (!values.checkIn || !DATE_RE.test(values.checkIn)) {
    errors.checkIn = "Enter a check-in date";
  } else if (values.checkIn < today) {
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

// ── Tests ──

describe("Hotel search form validation", () => {
  const valid: HotelSearchFormValues = {
    destination: "Bali",
    checkIn: "2026-09-01",
    checkOut: "2026-09-07",
    adults: 2,
    rooms: 1,
  };

  it("accepts valid values", () => {
    expect(validate(valid)).toEqual({});
  });

  it("requires destination", () => {
    expect(validate({ ...valid, destination: "" }).destination).toBe("Enter a destination");
    expect(validate({ ...valid, destination: "  " }).destination).toBe("Enter a destination");
  });

  it("requires check-in date", () => {
    expect(validate({ ...valid, checkIn: "" }).checkIn).toBe("Enter a check-in date");
  });

  it("requires check-out date", () => {
    expect(validate({ ...valid, checkOut: "" }).checkOut).toBe("Enter a check-out date");
  });

  it("rejects check-in in the past", () => {
    expect(validate({ ...valid, checkIn: "2026-01-01" }).checkIn).toBe("Check-in cannot be in the past");
  });

  it("accepts check-in today", () => {
    expect(validate({ ...valid, checkIn: "2026-08-20" }).checkIn).toBeUndefined();
  });

  it("rejects check-out before check-in", () => {
    expect(validate({ ...valid, checkIn: "2026-09-07", checkOut: "2026-09-01" }).checkOut).toBe("Check-out must be after check-in");
  });

  it("rejects check-out equal to check-in", () => {
    expect(validate({ ...valid, checkIn: "2026-09-01", checkOut: "2026-09-01" }).checkOut).toBe("Check-out must be after check-in");
  });

  it("rejects zero adults", () => {
    expect(validate({ ...valid, adults: 0 }).adults).toBe("At least 1 adult");
  });

  it("rejects excess adults", () => {
    expect(validate({ ...valid, adults: 11 }).adults).toBe("Maximum 10 adults");
  });

  it("rejects zero rooms", () => {
    expect(validate({ ...valid, rooms: 0 }).rooms).toBe("At least 1 room");
  });

  it("rejects excess rooms", () => {
    expect(validate({ ...valid, rooms: 6 }).rooms).toBe("Maximum 5 rooms");
  });

  it("rejects non-integer adults", () => {
    expect(validate({ ...valid, adults: 1.5 }).adults).toBe("At least 1 adult");
  });

  it("returns multiple errors", () => {
    const errors = validate({ destination: "", checkIn: "", checkOut: "", adults: 0, rooms: 0 });
    expect(Object.keys(errors).length).toBe(5);
  });
});
