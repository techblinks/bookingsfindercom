import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LocationCombobox from "@/components/search/LocationCombobox";

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

function renderCombobox(onChange = vi.fn()) {
  return render(<LocationCombobox value="" onChange={onChange} placeholder="City or airport" />);
}
function typeInInput(input: HTMLElement, text: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.input(input, { target: { value: text } });
}

describe("LocationCombobox", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    sessionStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it("calls supabase.functions.invoke with correct body", async () => {
    mockInvokeSuccess([BNE_AIRPORT]);
    renderCombobox();
    const input = screen.getByPlaceholderText("City or airport");
    typeInInput(input, "bris");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(mockInvoke).toHaveBeenCalled(); });
    expect(mockInvoke).toHaveBeenCalledWith("search-airports", { body: { q: "bris", limit: 8 } });
  });

  it('displays Brisbane (BNE) for "bris"', async () => {
    mockInvokeSuccess([BNE_AIRPORT]);
    renderCombobox();
    typeInInput(screen.getByPlaceholderText("City or airport"), "bris");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText("Brisbane")).toBeTruthy(); });
    // BNE is inside "· BNE" span, so use regex
    expect(screen.getByText(/BNE/)).toBeTruthy();
    expect(screen.getByText(/Brisbane Airport/)).toBeTruthy();
  });

  it('displays Sydney (SYD) for "syd"', async () => {
    mockInvokeSuccess([SYD_AIRPORT]);
    renderCombobox();
    typeInInput(screen.getByPlaceholderText("City or airport"), "syd");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText("Sydney")).toBeTruthy(); });
    expect(screen.getByText(/SYD/)).toBeTruthy();
  });

  it('shows "temporarily unavailable" for invoke error', async () => {
    mockInvokeError("Unauthorized");
    renderCombobox();
    typeInInput(screen.getByPlaceholderText("City or airport"), "syd");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy(); });
    expect(screen.queryByText(/No airports found for/i)).toBeFalsy();
  });

  it('shows "temporarily unavailable" for network failure', async () => {
    mockInvokeNetworkFailure();
    renderCombobox();
    typeInInput(screen.getByPlaceholderText("City or airport"), "syd");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy(); });
  });

  it('shows "No airports found" for empty results', async () => {
    mockInvokeSuccess([]);
    renderCombobox();
    typeInInput(screen.getByPlaceholderText("City or airport"), "zzz");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText(/No airports found for/i)).toBeTruthy(); });
  });

  it("does not log sensitive data to console", async () => {
    const consoleSpy = vi.spyOn(console, "error");
    mockInvokeSuccess([BNE_AIRPORT]);
    renderCombobox();
    typeInInput(screen.getByPlaceholderText("City or airport"), "bris");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText("Brisbane")).toBeTruthy(); });
    for (const call of consoleSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toMatch(/sb_publishable/);
    }
  });

  it("does not invoke for single character", async () => {
    mockInvokeSuccess([BNE_AIRPORT]);
    renderCombobox();
    typeInInput(screen.getByPlaceholderText("City or airport"), "b");
    vi.advanceTimersByTime(200);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("debounces rapid typing", async () => {
    mockInvokeSuccess([BNE_AIRPORT]);
    renderCombobox();
    const input = screen.getByPlaceholderText("City or airport");
    for (const ch of "brisbane") { typeInInput(input, (input as HTMLInputElement).value + ch); }
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(mockInvoke).toHaveBeenCalled(); });
    expect(mockInvoke.mock.calls[mockInvoke.mock.calls.length - 1][1]?.body?.q).toBe("brisbane");
  });

  it("calls onChange with IATA code", async () => {
    const onChange = vi.fn();
    mockInvokeSuccess([BNE_AIRPORT]);
    renderCombobox(onChange);
    typeInInput(screen.getByPlaceholderText("City or airport"), "bris");
    vi.advanceTimersByTime(200);
    await waitFor(() => { expect(screen.getByText("Brisbane")).toBeTruthy(); });
    fireEvent.click(screen.getByText("Brisbane"));
    expect(onChange).toHaveBeenCalledWith("BNE", expect.objectContaining({ code: "BNE" }));
  });
});
