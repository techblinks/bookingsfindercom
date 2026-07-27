import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NativeLocationPicker from "@/components/search/NativeLocationPicker";

const mockInvoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
  },
}));

const BNE_AIRPORT = { code: "BNE", city: "Brisbane", country: "Australia", name: "Brisbane Airport" };
const SYD_AIRPORT = { code: "SYD", city: "Sydney", country: "Australia", name: "Sydney Kingsford Smith Airport" };

function mockInvokeSuccess(data: unknown) { mockInvoke.mockResolvedValue({ data, error: null }); }
function mockInvokeError(message: string) { mockInvoke.mockResolvedValue({ data: null, error: { message } }); }
function mockInvokeNetworkFailure() { mockInvoke.mockRejectedValue(new Error("Network error")); }
function typeInInput(input: HTMLElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.input(input, { target: { value: text } });
}

describe("NativeLocationPicker", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    sessionStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it("calls supabase.functions.invoke with correct body", async () => {
    mockInvokeSuccess([BNE_AIRPORT]);
    render(<NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText("Search airports or cities...");
    typeInInput(input, "bris");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(mockInvoke).toHaveBeenCalled(); });
    expect(mockInvoke).toHaveBeenCalledWith("search-airports", { body: { q: "bris", limit: 8 } });
  });

  it('displays Brisbane (BNE) for "bris"', async () => {
    mockInvokeSuccess([BNE_AIRPORT]);
    render(<NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />);
    typeInInput(screen.getByPlaceholderText("Search airports or cities..."), "bris");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText("Brisbane")).toBeTruthy(); });
    expect(screen.getByText(/BNE/)).toBeTruthy();
  });

  it('displays Sydney (SYD) for "syd"', async () => {
    mockInvokeSuccess([SYD_AIRPORT]);
    render(<NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />);
    typeInInput(screen.getByPlaceholderText("Search airports or cities..."), "syd");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText("Sydney")).toBeTruthy(); });
    expect(screen.getByText(/SYD/)).toBeTruthy();
  });

  it('shows "temporarily unavailable" for invoke error', async () => {
    mockInvokeError("Unauthorized");
    render(<NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />);
    typeInInput(screen.getByPlaceholderText("Search airports or cities..."), "syd");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy(); });
  });

  it('shows "temporarily unavailable" for network failure', async () => {
    mockInvokeNetworkFailure();
    render(<NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />);
    typeInInput(screen.getByPlaceholderText("Search airports or cities..."), "syd");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy(); });
  });

  it('shows "No airports found" for empty results', async () => {
    mockInvokeSuccess([]);
    render(<NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />);
    typeInInput(screen.getByPlaceholderText("Search airports or cities..."), "zzz");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText(/No airports found for/i)).toBeTruthy(); });
  });

  it("does not log sensitive data to console", async () => {
    const consoleSpy = vi.spyOn(console, "error");
    mockInvokeSuccess([BNE_AIRPORT]);
    render(<NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />);
    typeInInput(screen.getByPlaceholderText("Search airports or cities..."), "bris");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText("Brisbane")).toBeTruthy(); });
    for (const call of consoleSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toMatch(/sb_publishable/);
    }
  });

  it("debounces rapid typing", async () => {
    mockInvokeSuccess([BNE_AIRPORT]);
    render(<NativeLocationPicker isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText("Search airports or cities...");
    typeInInput(input, "b"); typeInInput(input, "br"); typeInInput(input, "bri"); typeInInput(input, "bris");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(mockInvoke).toHaveBeenCalled(); });
    expect(mockInvoke.mock.calls[mockInvoke.mock.calls.length - 1][1]?.body?.q).toBe("bris");
  });
});
