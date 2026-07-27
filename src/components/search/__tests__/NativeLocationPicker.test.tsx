import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NativeLocationPicker from "@/components/search/NativeLocationPicker";

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

function typeInInput(input: HTMLElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.input(input, { target: { value: text } });
}

describe("NativeLocationPicker — Phase 7A supabase.functions.invoke fix", () => {
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

    render(
      <NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("Search airports or cities...");
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

    render(
      <NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("Search airports or cities...");
    typeInInput(input, "bris");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByText("Brisbane")).toBeTruthy();
    });
    expect(screen.getByText("BNE")).toBeTruthy();
  });

  // ── 3. Successful "syd" → Sydney ──

  it('displays Sydney (SYD) for a successful "syd" search', async () => {
    mockInvokeSuccess([SYD_AIRPORT]);

    render(
      <NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("Search airports or cities...");
    typeInInput(input, "syd");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByText("Sydney")).toBeTruthy();
    });
    expect(screen.getByText("SYD")).toBeTruthy();
  });

  // ── 4. Service error → "temporarily unavailable" ──

  it('shows "temporarily unavailable" for invoke error', async () => {
    mockInvokeError("Unauthorized");

    render(
      <NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("Search airports or cities...");
    typeInInput(input, "syd");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy();
    });

    expect(screen.queryByText(/No airports found for/i)).toBeFalsy();
  });

  it('shows "temporarily unavailable" for network failure', async () => {
    mockInvokeNetworkFailure();

    render(
      <NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("Search airports or cities...");
    typeInInput(input, "syd");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy();
    });
  });

  // ── 5. Genuine empty → "No airports found" ──

  it('shows "No airports found" for genuine empty results', async () => {
    mockInvokeSuccess([]);

    render(
      <NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("Search airports or cities...");
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

    render(
      <NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("Search airports or cities...");
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

  // ── 7. Debounce ──

  it("debounces rapid typing", async () => {
    mockInvokeSuccess([BNE_AIRPORT]);

    render(
      <NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("Search airports or cities...");
    typeInInput(input, "b");
    typeInInput(input, "br");
    typeInInput(input, "bri");
    typeInInput(input, "bris");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled();
    });

    const lastCall = mockInvoke.mock.calls[mockInvoke.mock.calls.length - 1];
    expect(lastCall[1]?.body?.q).toBe("bris");
  });
});
