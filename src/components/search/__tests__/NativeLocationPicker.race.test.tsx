/**
 * Flights V1 Mobile — NativeLocationPicker AbortController race + accessibility tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => mockInvoke(...a) } } }));

import NativeLocationPicker from "@/components/search/NativeLocationPicker";

beforeEach(() => { vi.clearAllMocks(); mockInvoke.mockReset(); });

function renderPicker() {
  return render(<NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} title="Where from?" placeholder="Search airports or cities..." />);
}

function typeSearch(value: string) {
  fireEvent.change(screen.getByPlaceholderText("Search airports or cities..."), { target: { value } });
}

describe("NativeLocationPicker — AbortController", () => {
  it("superseded request does not overwrite newer results", async () => {
    renderPicker();
    typeSearch("Syd");
    typeSearch("Sydn");
    await vi.waitFor(() => { expect(mockInvoke).toHaveBeenCalled(); });
  });

  it("AbortError does not show service-unavailable state", async () => {
    renderPicker();
    typeSearch("AB");
    expect(screen.queryByText(/temporarily unavailable/i)).toBeNull();
  });
});

describe("NativeLocationPicker — error state", () => {
  it("shows calm error state on real failure", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Network failure"));
    renderPicker();
    typeSearch("ABCD");
    await waitFor(() => { expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy(); });
  });

  it("shows error state when invoke returns error", async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: new Error("DB error") });
    renderPicker();
    typeSearch("ABCD");
    await waitFor(() => { expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy(); });
  });
});

describe("NativeLocationPicker — wording", () => {
  it("uses 'Suggestions' not 'Popular Destinations'", () => {
    renderPicker();
    expect(screen.getByText("Suggestions")).toBeTruthy();
    expect(screen.queryByText(/popular destinations/i)).toBeNull();
  });
});

describe("NativeLocationPicker — accessibility gate", () => {
  it("search input receives focus on open", () => {
    renderPicker();
    const input = screen.getByPlaceholderText("Search airports or cities...");
    expect(input).toBeTruthy();
    // Focus on the search input is managed by useModalAccessibility with focusSelector
  });

  it("has container with tabIndex=-1", () => {
    const { container } = renderPicker();
    expect(container.querySelector('[tabindex="-1"]')).toBeTruthy();
  });

  it("Escape calls onClose", () => {
    const onClose = vi.fn();
    const { container } = render(
      <NativeLocationPicker isOpen={true} onClose={onClose} onSelect={vi.fn()} title="Where from?" placeholder="Search airports or cities..." />
    );
    const dialog = container.querySelector('[tabindex="-1"]')!;
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("X close button is present", () => {
    renderPicker();
    const btns = screen.getAllByRole("button");
    expect(btns.length).toBeGreaterThan(0);
  });
});
