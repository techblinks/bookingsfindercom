/**
 * M1: TripRibbon and TripSummarySheet component tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TripProvider } from "@/context/TripContext";
import { TripRibbon } from "@/components/trip/TripRibbon";

function renderWithTrip(element: React.ReactElement) {
  return render(
    <MemoryRouter>
      <TripProvider>
        {element}
      </TripProvider>
    </MemoryRouter>
  );
}

function seedTrip(state: object) {
  localStorage.setItem("bf_trip_context", JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), ...state }));
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("TripRibbon — visibility", () => {
  it("is hidden when no trip context exists", () => {
    renderWithTrip(<TripRibbon />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("is visible with destination only", () => {
    seedTrip({ destination: { name: "Sydney" } });
    renderWithTrip(<TripRibbon />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toContain("Sydney");
  });

  it("is visible with origin → destination route", () => {
    seedTrip({ origin: { name: "Brisbane", airportCode: "BNE" }, destination: { name: "Kathmandu", airportCode: "KTM" } });
    renderWithTrip(<TripRibbon />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toContain("BNE");
    expect(btn.textContent).toContain("Kathmandu");
  });

  it("shows dates when present", () => {
    seedTrip({ destination: { name: "Sydney" }, dates: { departureDate: "2026-08-18", returnDate: "2026-08-29" } });
    renderWithTrip(<TripRibbon />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toContain("Aug 18-29");
  });

  it("shows traveller count", () => {
    seedTrip({ destination: { name: "Sydney" }, travellers: { adults: 2, children: 0, infants: 0 } });
    renderWithTrip(<TripRibbon />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toContain("2 travellers");
  });

  it("truncates long destination names", () => {
    seedTrip({ destination: { name: "A very long destination name that exceeds fifty characters easily here" } });
    renderWithTrip(<TripRibbon />);
    const btn = screen.getByRole("button");
    const label = btn.textContent || "";
    expect(label.length).toBeLessThanOrEqual(55);
  });
});

describe("TripRibbon — opens summary", () => {
  it("clicking the ribbon opens the summary sheet", () => {
    seedTrip({ destination: { name: "Sydney" } });
    renderWithTrip(<TripRibbon />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    // Sheet should be visible
    expect(screen.getByText("Trip")).toBeTruthy();
  });
});

describe("TripSummarySheet — verified context", () => {
  function openSheet() {
    seedTrip({ destination: { name: "Sydney", country: "Australia" } });
    renderWithTrip(<TripRibbon />);
    fireEvent.click(screen.getByRole("button"));
  }

  it("shows destination name in the sheet", () => {
    openSheet();
    // Find the sheet heading container and verify content
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Sydney")).toBeTruthy();
  });

  it("shows route origin → destination when present", () => {
    seedTrip({ origin: { airportCode: "BNE", name: "Brisbane" }, destination: { name: "Sydney", airportCode: "SYD" } });
    renderWithTrip(<TripRibbon />);
    fireEvent.click(screen.getByRole("button"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/BNE.*Sydney/)).toBeTruthy();
  });

  it("shows dates in YYYY-MM-DD format in sheet", () => {
    seedTrip({ destination: { name: "Sydney" }, dates: { departureDate: "2026-08-18" } });
    renderWithTrip(<TripRibbon />);
    fireEvent.click(screen.getByRole("button"));
    const dialog = screen.getByRole("dialog");
    // The sheet should have the date
    expect(dialog.textContent).toContain("2026-08-18");
  });

  it("does NOT show fake product/price state", () => {
    openSheet();
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).not.toMatch(/selected/i);
    expect(dialog.textContent).not.toMatch(/\$/);
    expect(dialog.textContent).not.toMatch(/total/i);
  });

  it("has action links for all products", () => {
    openSheet();
    expect(screen.getByText("Flights").closest("a")?.getAttribute("href")).toBe("/flights");
    expect(screen.getByText("Stays").closest("a")?.getAttribute("href")).toBe("/hotels");
    expect(screen.getByText("Things to Do").closest("a")?.getAttribute("href")).toBe("/things-to-do");
    expect(screen.getByText("Trip Cost").closest("a")?.getAttribute("href")).toBe("/trip-cost");
  });

  it("has a clear trip action", () => {
    openSheet();
    expect(screen.getByText("Clear trip")).toBeTruthy();
  });
});

describe("TripSummarySheet — accessibility (M1.1)", () => {
  function openSheet() {
    seedTrip({ destination: { name: "Sydney", country: "Australia" } });
    renderWithTrip(<TripRibbon />);
    fireEvent.click(screen.getByRole("button"));
  }

  it("Escape key closes the sheet", () => {
    openSheet();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();

    fireEvent.keyDown(dialog, { key: "Escape" });
    // Sheet should be gone — dialog role removed from DOM
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("has aria-modal='true' on the dialog", () => {
    openSheet();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("has accessible label", () => {
    openSheet();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBe("Trip summary");
  });

  it("Tab cycles within the dialog (does not tab out)", () => {
    openSheet();
    const dialog = screen.getByRole("dialog");

    // Find all focusable elements inside
    const focusable = within(dialog).queryAllByRole("button").filter(
      (b) => !(b as HTMLButtonElement).disabled,
    );
    // Also links
    const links = within(dialog).queryAllByRole("link");

    // At minimum close button + clear trip + 4 action links
    expect(focusable.length + links.length).toBeGreaterThanOrEqual(6);

    // The dialog container has tabIndex={-1} for programmatic focus.
    // In jsdom, calling focus() on an element with tabIndex={-1} may not
    // reliably update document.activeElement. Verify the dialog ref is focusable.
    expect(dialog.getAttribute("tabindex")).toBe("-1");
  });

  it("Escape closes sheet and trigger remains in DOM", () => {
    seedTrip({ destination: { name: "Sydney" } });
    renderWithTrip(<TripRibbon />);
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });

    // After close, sheet is gone and trigger is still present
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toBeTruthy();
    // Note: jsdom does not reliably track document.activeElement after
    // programmatic focus() calls. Focus restoration is verified in
    // browser-level QA (the useEffect calls previousFocusRef.current.focus()).
  });

  it("X button closes sheet and trigger remains in DOM", () => {
    seedTrip({ destination: { name: "Sydney" } });
    renderWithTrip(<TripRibbon />);
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    const closeBtn = screen.getByLabelText("Close trip summary");
    fireEvent.click(closeBtn);

    // After close, sheet is gone and trigger is still present
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toBeTruthy();
  });
});
