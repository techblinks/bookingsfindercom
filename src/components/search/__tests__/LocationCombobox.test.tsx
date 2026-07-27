import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LocationCombobox from "@/components/search/LocationCombobox";

// ── Mock supabase client ──

const mockInvoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  },
}));

// ── Helpers ──

const BNE_AIRPORT = {
  code: "BNE",
  city: "Brisbane",
  country: "Australia",
  name: "Brisbane Airport",
};

const SYD_AIRPORT = {
  code: "SYD",
  city: "Sydney",
  country: "Australia",
  name: "Sydney Kingsford Smith Airport",
};

function mockInvokeSuccess(data: unknown) {
  mockInvoke.mockResolvedValue({ data, error: null });
}

function mockInvokeError(message: string) {
  mockInvoke.mockResolvedValue({ data: null, error: { message } });
}

function mockInvokeNetworkFailure() {
  mockInvoke.mockRejectedValue(new Error("Network error"));
}

function renderCombobox(onChange = vi.fn()) {
  return render(
    <LocationCombobox value="" onChange={onChange} placeholder="City or airport" />
  );
}

function typeInInput(input: HTMLElement, text: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.input(input, { target: { value: text } });
}

describe("LocationCombobox — Phase 7A supabase.functions.invoke fix", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    sessionStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── 1. Uses supabase.functions.invoke ──

  it("calls supabase.functions.invoke with correct body", async () => {
    mockInvokeSuccess([BNE_AIRPORT]);

    renderCombobox();
    const input = screen.getByPlaceholderText("City or airport");
    typeInInput(input, "bris");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled();
    });

    expect(mockInvoke).toHaveBeenCalledWith("search-airports", {
      body: { q: "bris", limit: 8 },
    });
  });

  // ── 2. Successful "bris" → Brisbane ──

  it('displays Brisbane (BNE) for a successful "bris" search', async () => {
    mockInvokeSuccess([BNE_AIRPORT]);

    renderCombobox();
    const input = screen.getByPlaceholderText("City or airport");
    typeInInput(input, "bris");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByText("Brisbane")).toBeTruthy();
    });
    expect(screen.getByText("BNE")).toBeTruthy();
    expect(screen.getByText(/Brisbane Airport/)).toBeTruthy();
  });

  // ── 3. Successful "syd" → Sydney ──

  it('displays Sydney (SYD) for a successful "syd" search', async () => {
    mockInvokeSuccess([SYD_AIRPORT]);

    renderCombobox();
    const input = screen.getByPlaceholderText("City or airport");
    typeInInput(input, "syd");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByText("Sydney")).toBeTruthy();
    });
    expect(screen.getByText("SYD")).toBeTruthy();
  });

  // ── 4. Service error → "temporarily unavailable" ──

  it('shows "temporarily unavailable" for a Supabase invoke error', async () => {
    mockInvokeError("Unauthorized");

    renderCombobox();
    const input = screen.getByPlaceholderText("City or airport");
    typeInInput(input, "syd");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy();
    });

    // Should NOT show misleading "No airports found"
    expect(screen.queryByText(/No airports found for/i)).toBeFalsy();
  });

  it('shows "temporarily unavailable" for a network failure', async () => {
    mockInvokeNetworkFailure();

    renderCombobox();
    const input = screen.getByPlaceholderText("City or airport");
    typeInInput(input, "syd");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy();
    });

    expect(screen.queryByText(/No airports found for/i)).toBeFalsy();
  });

  // ── 5. Genuine empty 200 → "No airports found" ──

  it('shows "No airports found" for genuine empty results', async () => {
    mockInvokeSuccess([]);

    renderCombobox();
    const input = screen.getByPlaceholderText("City or airport");
    typeInInput(input, "zzz");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByText(/No airports found for/i)).toBeTruthy();
    });
  });

  // ── 6. No key leaked ──

  it("does not log sensitive data to console", async () => {
    const consoleSpy = vi.spyOn(console, "error");
    mockInvokeSuccess([BNE_AIRPORT]);

    renderCombobox();
    const input = screen.getByPlaceholderText("City or airport");
    typeInInput(input, "bris");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByText("Brisbane")).toBeTruthy();
    });

    for (const call of consoleSpy.mock.calls) {
      const callStr = JSON.stringify(call);
      expect(callStr).not.toMatch(/sb_publishable/);
      expect(callStr).not.toMatch(/service_role/);
    }
  });

  // ── 7. Debounce behaviour ──

  it("does not invoke for a single character", async () => {
    mockInvokeSuccess([BNE_AIRPORT]);

    renderCombobox();
    const input = screen.getByPlaceholderText("City or airport");
    typeInInput(input, "b");
    vi.advanceTimersByTime(200);

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("debounces rapid typing to one invoke with the final value", async () => {
    mockInvokeSuccess([BNE_AIRPORT]);

    renderCombobox();
    const input = screen.getByPlaceholderText("City or airport");

    for (const ch of "brisbane") {
      const currentValue = (input as HTMLInputElement).value + ch;
      typeInInput(input, currentValue);
    }

    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled();
    });

    const lastCall = mockInvoke.mock.calls[mockInvoke.mock.calls.length - 1];
    expect(lastCall[1]?.body?.q).toBe("brisbane");
  });

  // ── 8. Selecting an airport calls onChange ──

  it("calls onChange with IATA code when an airport is selected", async () => {
    const onChange = vi.fn();
    mockInvokeSuccess([BNE_AIRPORT]);

    renderCombobox(onChange);
    const input = screen.getByPlaceholderText("City or airport");
    typeInInput(input, "bris");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByText("Brisbane")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Brisbane"));

    expect(onChange).toHaveBeenCalledWith(
      "BNE",
      expect.objectContaining({ code: "BNE", city: "Brisbane" })
    );
  });
});
