/**
 * Flights V1 Mobile — PassengerPickerSheet tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PassengerPickerSheet, type PassengerCount } from "@/components/search/PassengerPickerSheet";

const DEFAULT: PassengerCount = { adults: 1, children: 0, infants: 0 };

function renderSheet(overrides?: { passengers?: PassengerCount; cabinClass?: "economy" | "business" }) {
  return render(
    <PassengerPickerSheet isOpen={true} onClose={vi.fn()}
      passengers={overrides?.passengers ?? DEFAULT} cabinClass={overrides?.cabinClass ?? "economy"}
      onPassengersChange={vi.fn()} onCabinChange={vi.fn()} />
  );
}

beforeEach(() => { vi.clearAllMocks(); });

describe("PassengerPickerSheet — adults", () => {
  it("renders adult count", () => { renderSheet(); expect(screen.getByText("1")).toBeTruthy(); });
  it("adults cannot go below 1", () => {
    render(<PassengerPickerSheet isOpen={true} onClose={vi.fn()} passengers={{ adults: 1, children: 0, infants: 0 }} cabinClass="economy" onPassengersChange={vi.fn()} onCabinChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /decrease adults/i })).toBeDisabled();
  });
  it("adults increment calls onChange", () => {
    const onChange = vi.fn();
    render(<PassengerPickerSheet isOpen={true} onClose={vi.fn()} passengers={{ adults: 1, children: 0, infants: 0 }} cabinClass="economy" onPassengersChange={onChange} onCabinChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /increase adults/i }));
    expect(onChange).toHaveBeenCalledWith({ adults: 2, children: 0, infants: 0 });
  });
});

describe("PassengerPickerSheet — children", () => {
  it("children increment calls onChange", () => {
    const onChange = vi.fn();
    render(<PassengerPickerSheet isOpen={true} onClose={vi.fn()} passengers={{ adults: 2, children: 0, infants: 0 }} cabinClass="economy" onPassengersChange={onChange} onCabinChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /increase children/i }));
    expect(onChange).toHaveBeenCalledWith({ adults: 2, children: 1, infants: 0 });
  });
});

describe("PassengerPickerSheet — infants", () => {
  it("infants cannot exceed adults", () => {
    render(<PassengerPickerSheet isOpen={true} onClose={vi.fn()} passengers={{ adults: 1, children: 0, infants: 1 }} cabinClass="economy" onPassengersChange={vi.fn()} onCabinChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /increase infants/i })).toBeDisabled();
  });
});

describe("PassengerPickerSheet — total limit", () => {
  it("total passengers capped at 9", () => {
    render(<PassengerPickerSheet isOpen={true} onClose={vi.fn()} passengers={{ adults: 5, children: 4, infants: 0 }} cabinClass="economy" onPassengersChange={vi.fn()} onCabinChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /increase adults/i })).toBeDisabled();
  });
});

describe("PassengerPickerSheet — cabin", () => {
  // BF-0R-7 Round 1.2 item 1/2: Premium Economy and First are not offered —
  // whiteLabelUrl.ts only has a verified handoff for economy/business (see
  // src/lib/cabinClasses.ts), so offering them would let a traveller select
  // a cabin the live-search handoff can't actually carry through.
  it("renders only the two supported cabin options", () => {
    renderSheet();
    expect(screen.getByText("Economy")).toBeTruthy();
    expect(screen.getByText("Business")).toBeTruthy();
    expect(screen.queryByText("Premium Economy")).toBeNull();
    expect(screen.queryByText("First")).toBeNull();
  });

  it("cabin selection calls onCabinChange", () => {
    const onCabin = vi.fn();
    render(<PassengerPickerSheet isOpen={true} onClose={vi.fn()} passengers={DEFAULT} cabinClass="economy" onPassengersChange={vi.fn()} onCabinChange={onCabin} />);
    fireEvent.click(screen.getByText("Business"));
    expect(onCabin).toHaveBeenCalledWith("business");
  });

  it("Done button is present", () => {
    renderSheet();
    expect(screen.getByRole("button", { name: /done/i })).toBeTruthy();
  });

  it("close button is present", () => {
    renderSheet();
    expect(screen.getByRole("button", { name: /close/i })).toBeTruthy();
  });
});

describe("PassengerPickerSheet — accessibility gate", () => {
  it("has aria-modal", () => {
    renderSheet();
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
  });

  it("has tabIndex=-1 for keyboard capture", () => {
    renderSheet();
    expect(screen.getByRole("dialog").getAttribute("tabindex")).toBe("-1");
  });

  it("Escape calls onClose", () => {
    const onClose = vi.fn();
    render(<PassengerPickerSheet isOpen={true} onClose={onClose} passengers={DEFAULT} cabinClass="economy" onPassengersChange={vi.fn()} onCabinChange={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("stepper increase buttons have accessible labels", () => {
    renderSheet();
    expect(screen.getByRole("button", { name: /increase adults/i })).toBeTruthy();
  });

  it("stepper decrease buttons have accessible labels", () => {
    renderSheet();
    expect(screen.getByRole("button", { name: /decrease adults/i })).toBeTruthy();
  });
});

// Constraint sources (from src/lib/flightSearchValidation.ts):
// Adults >= 1: validateFlightSearch line 97
// Total <= 9: validateFlightSearch line 117-119
// Infants <= Adults: validateFlightSearch line 111-113
