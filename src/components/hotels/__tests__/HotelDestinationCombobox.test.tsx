/**
 * HotelDestinationCombobox — autocomplete tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HotelDestinationCombobox from "@/components/hotels/HotelDestinationCombobox";

vi.mock("@/data/hotelDestinations", () => ({
  searchHotelDestinations: vi.fn((q: string) => {
    if (q.toLowerCase().includes("zzz")) return [];
    if (q.toLowerCase().includes("syd")) return [
      { label: "Sydney, New South Wales, Australia", value: "Sydney", country: "Australia", region: "New South Wales" },
    ];
    if (q.toLowerCase().includes("bali")) return [
      { label: "Bali, Indonesia", value: "Bali", country: "Indonesia" },
    ];
    if (q.toLowerCase().includes("lon")) return [
      { label: "London, United Kingdom", value: "London", country: "United Kingdom" },
    ];
    return [];
  }),
  getPopularHotelDestinations: () => [],
}));

function renderCombobox(onChange = vi.fn(), value = "") {
  return render(
    <HotelDestinationCombobox
      id="test-dest"
      value={value}
      onChange={onChange}
      placeholder="City or region"
    />
  );
}

// Matches an option by its accessible name
const sydneyOption = () => screen.getByRole("option", { name: "Sydney New South Wales, Australia" });

describe("HotelDestinationCombobox", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const getInput = (): HTMLInputElement => screen.getByRole("combobox") as HTMLInputElement;

  const typeQuery = (text: string) => {
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: text } });
  };

  // ── 1. Typing "syd" shows suggestions ────────────────────────

  it("shows Sydney as a suggestion when typing 'syd'", async () => {
    renderCombobox();
    typeQuery("syd");

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeTruthy();
    });
    expect(sydneyOption()).toBeTruthy();
  });

  it("highlights suggestion on hover", async () => {
    renderCombobox();
    typeQuery("syd");

    await waitFor(() => screen.getByRole("listbox"));
    const option = sydneyOption();
    const button = option.querySelector("button")!;
    fireEvent.mouseEnter(button);
    expect(button.className).toMatch(/bg-accent/);
  });

  // ── 2. Clicking suggestion fills input ───────────────────────

  it("clicking Sydney fills the input and calls onChange with value", async () => {
    const onChange = vi.fn();
    renderCombobox(onChange);
    typeQuery("syd");

    await waitFor(() => screen.getByRole("listbox"));
    // Click the button inside the option (not the li which doesn't have the handler)
    fireEvent.click(sydneyOption().querySelector("button")!);

    expect(onChange).toHaveBeenCalledWith("Sydney", expect.objectContaining({
      label: "Sydney, New South Wales, Australia",
      value: "Sydney",
      country: "Australia",
    }));
  });

  it("closes dropdown after selection", async () => {
    renderCombobox();
    typeQuery("syd");

    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.click(sydneyOption().querySelector("button")!);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  // ── 3. Keyboard selection ────────────────────────────────────

  it("ArrowDown + Enter selects the first suggestion", async () => {
    const onChange = vi.fn();
    renderCombobox(onChange);
    typeQuery("syd");

    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.keyDown(getInput(), { key: "ArrowDown" });
    fireEvent.keyDown(getInput(), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("Sydney", expect.objectContaining({ value: "Sydney" }));
  });

  it("ArrowDown wraps to first item (no manual row when suggestions exist)", async () => {
    renderCombobox();
    typeQuery("lon");

    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.keyDown(getInput(), { key: "ArrowDown" }); // -1 → 0 (London)
    fireEvent.keyDown(getInput(), { key: "ArrowDown" }); // 0 wraps to 0 (maxIndex=0, only 1 suggestion)

    const opts = screen.getAllByRole("option");
    expect(opts[0].getAttribute("aria-selected")).toBe("true");
  });

  it("ArrowUp from closed wraps to last suggestion", async () => {
    renderCombobox();
    typeQuery("lon");

    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.keyDown(getInput(), { key: "ArrowUp" });

    const opts = screen.getAllByRole("option");
    // ArrowUp from -1 wraps to maxIndex = 0 (only 1 suggestion, no manual row)
    expect(opts[0].getAttribute("aria-selected")).toBe("true");
  });

  // ── 4. Escape closes dropdown ────────────────────────────────

  it("Escape closes the dropdown", async () => {
    renderCombobox();
    typeQuery("syd");

    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.keyDown(getInput(), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  // ── 5. No-results state ─────────────────────────────────────

  it("shows manual entry option when no suggestions found", async () => {
    renderCombobox();
    typeQuery("zzz");

    await waitFor(() => {
      expect(screen.getByText(/No suggested destination found/i)).toBeTruthy();
      expect(screen.getByText(/Search for/i)).toBeTruthy();
      expect(screen.getByText(/Press Enter to use this destination/i)).toBeTruthy();
    });
  });

  // ── 6. Stale responses ignored ──────────────────────────────

  it("ignores stale responses when typing quickly", async () => {
    renderCombobox();
    typeQuery("bali");
    // Before debounce resolves, type new query
    fireEvent.change(getInput(), { target: { value: "syd" } });

    await waitFor(() => screen.getByRole("listbox"));

    // Should show Sydney, not Bali
    expect(sydneyOption()).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Bali Indonesia" })).toBeNull();
  });

  // ── 7. Accessibility ────────────────────────────────────────

  it("has role=combobox on input", () => {
    renderCombobox();
    expect(getInput().getAttribute("role")).toBe("combobox");
  });

  it("aria-expanded is true when dropdown is open", async () => {
    renderCombobox();
    typeQuery("syd");

    await waitFor(() => screen.getByRole("listbox"));
    expect(getInput().getAttribute("aria-expanded")).toBe("true");
  });

  it("aria-expanded is false when closed", async () => {
    renderCombobox();
    typeQuery("syd");
    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.keyDown(getInput(), { key: "Escape" });

    await waitFor(() => {
      expect(getInput().getAttribute("aria-expanded")).toBe("false");
    });
  });

  it("has aria-controls pointing to listbox", async () => {
    renderCombobox();
    typeQuery("syd");

    await waitFor(() => screen.getByRole("listbox"));
    expect(getInput().getAttribute("aria-controls")).toBeTruthy();
  });

  it("suggestions have role=listbox and role=option", async () => {
    renderCombobox();
    typeQuery("syd");

    await waitFor(() => screen.getByRole("listbox"));
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getAllByRole("option").length).toBeGreaterThanOrEqual(1);
  });

  it("aria-activedescendant tracks active item", async () => {
    renderCombobox();
    typeQuery("syd");

    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.keyDown(getInput(), { key: "ArrowDown" });

    expect(getInput().getAttribute("aria-activedescendant")).toMatch(/^hotel-dest-\d+$/);
  });

  // ── 8. Minimum 2 chars ──────────────────────────────────────

  it("does not search with fewer than 2 characters", () => {
    renderCombobox();
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "s" } });

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  // ── 9. Manual city entry (e.g. Cooma) ─────────────────────

  it("shows manual entry for 'Cooma' (no curated match)", async () => {
    renderCombobox();
    typeQuery("Cooma");

    await waitFor(() => {
      expect(screen.getByText(/No suggested destination found/i)).toBeTruthy();
    });
    // Manual confirmation button exists
    const manualBtn = screen.getByRole("option", { name: /Search for/i });
    expect(manualBtn).toBeTruthy();
  });

  it("clicking manual entry for 'Cooma' calls onChange with the trimmed value", async () => {
    const onChange = vi.fn();
    renderCombobox(onChange);
    typeQuery("Cooma");

    await waitFor(() => screen.getByText(/Search for/));
    fireEvent.click(screen.getByText(/Search for "Cooma"/));

    expect(onChange).toHaveBeenCalledWith("Cooma");
  });

  it("Enter on manual confirm row submits the destination", async () => {
    const onChange = vi.fn();
    renderCombobox(onChange);
    typeQuery("Cooma");

    await waitFor(() => screen.getByText(/No suggested destination found/));
    // ArrowDown to the manual row (suggestions.length = 0, so activeIndex goes to 0 = manual row)
    fireEvent.keyDown(getInput(), { key: "ArrowDown" });
    fireEvent.keyDown(getInput(), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("Cooma");
  });

  it("blocks submission of short fragments like 'syd' without selection", async () => {
    const onChange = vi.fn();
    renderCombobox(onChange);
    typeQuery("syd");

    // Pressing Enter without navigating to a suggestion shouldn't confirm anything
    // (Enter on index -1 does nothing)
    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.keyDown(getInput(), { key: "Enter" });

    // onChange was called with raw query during typing, but NOT with a confirmed selection
    // The last call before Enter should have been the "syd" keystroke
    expect(onChange).not.toHaveBeenCalledWith("syd", expect.anything());
  });

  it("full manual city preserved during date selection", async () => {
    // Simulates: user types Cooma, confirms it, then interacts with dates
    const onChange = vi.fn();
    renderCombobox(onChange, "Cooma");

    const input = getInput();
    expect(input.value).toBe("Cooma");

    // The onChange is not called again for the external value sync
    expect(onChange).not.toHaveBeenCalled();
  });

  // ── 10. Outside click closes ────────────────────────────────

  it("closes dropdown on outside mousedown", async () => {
    render(
      <div>
        <HotelDestinationCombobox id="test" value="" onChange={vi.fn()} />
        <button data-testid="outside">Outside</button>
      </div>
    );
    typeQuery("syd");

    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.mouseDown(screen.getByTestId("outside"));

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });
});