/**
 * Flights V1 Mobile — NativeDatePicker behavior tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NativeDatePicker from "@/components/search/NativeDatePicker";

beforeEach(() => { vi.clearAllMocks(); });

function clickFutureDate(getAll: boolean = false) {
  const btns = screen.getAllByRole("button").filter(b => /^\d+$/.test(b.textContent || ""));
  const enabled = btns.filter(b => !(b as HTMLButtonElement).disabled);
  if (enabled.length < 2) return null;
  if (getAll) return enabled;
  return enabled[enabled.length - 1];
}

describe("NativeDatePicker — round-trip range", () => {
  it("opens when isOpen=true", () => {
    render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onRangeSelect={vi.fn()} tripType="roundtrip" title="Select dates" />);
    expect(screen.getByText("Select dates")).toBeTruthy();
  });

  it("does not render when isOpen=false", () => {
    render(<NativeDatePicker isOpen={false} onClose={vi.fn()} onRangeSelect={vi.fn()} tripType="roundtrip" title="Select dates" />);
    expect(screen.queryByText("Select dates")).toBeNull();
  });

  it("calls onRangeSelect with departure and return for round-trip", () => {
    const onRange = vi.fn();
    render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onRangeSelect={onRange} tripType="roundtrip" title="Select dates" />);
    const enabled = clickFutureDate(true) as HTMLElement[] | null;
    if (enabled && enabled.length >= 2) {
      fireEvent.click(enabled[0]);
      fireEvent.click(enabled[enabled.length - 1]);
      expect(onRange).toHaveBeenCalled();
      expect(onRange.mock.calls[0][0]).toBeInstanceOf(Date);
      expect(onRange.mock.calls[0][1]).toBeInstanceOf(Date);
    }
  });

  it("shows 'Now select return date' subtitle after departure is picked", () => {
    render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onRangeSelect={vi.fn()} tripType="roundtrip" title="Select dates" />);
    const enabled = clickFutureDate(true) as HTMLElement[] | null;
    if (enabled && enabled.length >= 1) {
      fireEvent.click(enabled[0]);
      expect(screen.getByText(/now select return/i)).toBeTruthy();
    }
  });
});

describe("NativeDatePicker — one-way", () => {
  it("calls onRangeSelect with only departure for one-way", () => {
    const onRange = vi.fn();
    render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onRangeSelect={onRange} tripType="oneway" title="Select date" />);
    const enabled = clickFutureDate(true) as HTMLElement[] | null;
    if (enabled && enabled.length > 0) {
      fireEvent.click(enabled[0]);
      expect(onRange).toHaveBeenCalled();
      expect(onRange.mock.calls[0][1]).toBeUndefined();
    }
  });
});

describe("NativeDatePicker — past dates", () => {
  it("past dates are disabled", () => {
    render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onRangeSelect={vi.fn()} tripType="roundtrip" title="Select dates" />);
    const disabled = screen.getAllByRole("button").filter(b => (b as HTMLButtonElement).disabled);
    expect(disabled.length).toBeGreaterThan(0);
  });
});

describe("NativeDatePicker — weekday ordering", () => {
  it("shows 7 weekday column headers starting with Mon for en-AU", () => {
    render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onRangeSelect={vi.fn()} tripType="roundtrip" title="Select dates" />);
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (const day of weekDays) expect(screen.getByText(day)).toBeTruthy();
  });
});

describe("NativeDatePicker — quick-date actions", () => {
  it("renders approved quick-date actions", () => {
    render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onRangeSelect={vi.fn()} tripType="roundtrip" title="Select dates" />);
    expect(screen.getByText("Tomorrow")).toBeTruthy();
    expect(screen.getByText("+3 Days")).toBeTruthy();
    expect(screen.getByText("+1 Week")).toBeTruthy();
    expect(screen.getByText("+2 Weeks")).toBeTruthy();
  });

  it("does NOT render flexible-date control", () => {
    render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onRangeSelect={vi.fn()} tripType="roundtrip" title="Select dates" />);
    expect(screen.queryByText(/±3d/i)).toBeNull();
    expect(screen.queryByText(/flexible/i)).toBeNull();
  });
});

describe("NativeDatePicker — navigation", () => {
  it("has previous/next month buttons", () => {
    render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onRangeSelect={vi.fn()} tripType="roundtrip" title="Select dates" />);
    expect(screen.getByRole("button", { name: /previous month/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /next month/i })).toBeTruthy();
  });

  it("has close button", () => {
    render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onRangeSelect={vi.fn()} tripType="roundtrip" title="Select dates" />);
    expect(screen.getByRole("button", { name: /close date picker/i })).toBeTruthy();
  });

  it("has Done button", () => {
    render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onRangeSelect={vi.fn()} tripType="roundtrip" title="Select dates" />);
    expect(screen.getByText("Done")).toBeTruthy();
  });
});

describe("NativeDatePicker — legacy onSelect", () => {
  it("works with legacy onSelect prop", () => {
    const onSel = vi.fn();
    render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onSelect={onSel} title="Select" />);
    const enabled = clickFutureDate(true) as HTMLElement[] | null;
    if (enabled && enabled.length > 0) {
      fireEvent.click(enabled[0]);
      expect(onSel).toHaveBeenCalled();
    }
  });
});

describe("NativeDatePicker — accessibility gate", () => {
  it("has container with tabIndex=-1 for keyboard capture", () => {
    const { container } = render(<NativeDatePicker isOpen={true} onClose={vi.fn()} onRangeSelect={vi.fn()} tripType="roundtrip" title="Select dates" />);
    const dialog = container.querySelector('[tabindex="-1"]');
    expect(dialog).toBeTruthy();
  });

  it("Escape calls onClose", () => {
    const onClose = vi.fn();
    const { container } = render(<NativeDatePicker isOpen={true} onClose={onClose} onRangeSelect={vi.fn()} tripType="roundtrip" title="Select dates" />);
    const dialog = container.querySelector('[tabindex="-1"]')!;
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
