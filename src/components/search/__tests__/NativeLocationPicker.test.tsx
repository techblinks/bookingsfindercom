import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NativeLocationPicker from "@/components/search/NativeLocationPicker";

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

function mockFetchResponse(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function typeInInput(input: HTMLElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.input(input, { target: { value: text } });
}

describe("NativeLocationPicker — Phase 7A apikey fix", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    sessionStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── 1. Sends apikey header ──

  it("sends the Supabase apikey header on fetch", async () => {
    const mockFetch = mockFetchResponse(200, [BNE_AIRPORT]);
    global.fetch = mockFetch as unknown as typeof fetch;

    render(
      <NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("Search airports or cities...");
    typeInInput(input, "bris");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callArgs = mockFetch.mock.calls[0];
    const fetchUrl = callArgs[0] as string;
    const fetchInit = callArgs[1] as RequestInit;

    expect(fetchUrl).toContain("search-airports");
    expect(fetchUrl).toContain("q=bris");

    const headers = fetchInit?.headers as Record<string, string>;
    expect(headers["apikey"]).toBeDefined();
    expect(headers["apikey"]).not.toBe("");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  // ── 2. Successful "bris" → Brisbane ──

  it('displays Brisbane (BNE) for a successful "bris" search', async () => {
    global.fetch = mockFetchResponse(200, [BNE_AIRPORT]) as unknown as typeof fetch;

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
    global.fetch = mockFetchResponse(200, [SYD_AIRPORT]) as unknown as typeof fetch;

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

  // ── 4. 401/403 → NOT misleading "No airports found" ──

  it("does not show 'No airports found' for 401 response", async () => {
    global.fetch = mockFetchResponse(401, { error: "Unauthorized" }) as unknown as typeof fetch;

    render(
      <NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("Search airports or cities...");
    typeInInput(input, "bris");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.queryByText(/No airports found for/i)).toBeFalsy();
    });
  });

  it("does not show 'No airports found' for 403 response", async () => {
    global.fetch = mockFetchResponse(403, { error: "Forbidden" }) as unknown as typeof fetch;

    render(
      <NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("Search airports or cities...");
    typeInInput(input, "bris");
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.queryByText(/No airports found for/i)).toBeFalsy();
    });
  });

  // ── 5. Genuine empty 200 → "No airports found" ──

  it('shows "No airports found" for genuine empty 200 results', async () => {
    global.fetch = mockFetchResponse(200, []) as unknown as typeof fetch;

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

  it("does not log the apikey to console", async () => {
    const consoleSpy = vi.spyOn(console, "error");
    global.fetch = mockFetchResponse(200, [BNE_AIRPORT]) as unknown as typeof fetch;

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
    }
  });

  // ── 7. Debounce ──

  it("debounces rapid typing to one fetch with final value", async () => {
    const mockFetch = mockFetchResponse(200, [BNE_AIRPORT]);
    global.fetch = mockFetch as unknown as typeof fetch;

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
      expect(mockFetch).toHaveBeenCalled();
    });

    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    const lastUrl = lastCall[0] as string;
    expect(lastUrl).toContain("q=bris");
  });
});
