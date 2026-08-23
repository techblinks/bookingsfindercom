/**
 * BF-FLIGHTS-LIVE-2 Round 3 Phase B — the dialog's wording must be the
 * single generic truth that holds whether the requested currency was
 * live-verified NOT applied (INR/JPY/SGD) or simply never tested (AED,
 * THB, anything else) — never claiming a currency is confirmed
 * unsupported when it was only unverified, and never naming a fallback.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UnsupportedCurrencyDialog from "../UnsupportedCurrencyDialog";

function renderDialog(currency: string) {
  return render(
    <UnsupportedCurrencyDialog
      open={true}
      currency={currency}
      onOpenChange={vi.fn()}
      onContinue={vi.fn()}
    />
  );
}

describe("UnsupportedCurrencyDialog — wording", () => {
  it("item 6: says preservation cannot currently be guaranteed, not that the currency is unsupported", () => {
    renderDialog("AED");
    expect(screen.getByText(/cannot currently guarantee/i)).toBeTruthy();
    expect(screen.queryByText(/does not currently support/i)).toBeNull();
    expect(screen.queryByText(/is not supported/i)).toBeNull();
    expect(screen.queryByText(/unsupported/i)).toBeNull();
  });

  it("item 7: does not name a fallback currency (e.g. USD)", () => {
    renderDialog("INR");
    const description = screen.getByText(/cannot currently guarantee/i).textContent || "";
    expect(description).not.toMatch(/\bUSD\b/);
    expect(description).not.toMatch(/\bdefault\b/i);
  });

  it("uses the same wording for a live-verified-not-applied currency (INR) and an unverified one (THB) — one generic message, not two", () => {
    const { unmount } = renderDialog("INR");
    const inrText = screen.getByText(/cannot currently guarantee/i).textContent;
    unmount();

    renderDialog("THB");
    const thbText = screen.getByText(/cannot currently guarantee/i).textContent;

    expect(inrText?.replaceAll("INR", "X")).toBe(thbText?.replaceAll("THB", "X"));
  });

  it("keeps the title and both actions", () => {
    renderDialog("JPY");
    expect(screen.getByText("Live partner currency differs")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue to live flights/i })).toBeTruthy();
  });

  it("does not render when open is false", () => {
    render(
      <UnsupportedCurrencyDialog open={false} currency="INR" onOpenChange={vi.fn()} onContinue={vi.fn()} />
    );
    expect(screen.queryByText("Live partner currency differs")).toBeNull();
  });
});
