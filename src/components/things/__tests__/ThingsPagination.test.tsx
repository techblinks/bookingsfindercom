/**
 * Things V2 (T3B) - ThingsPagination component.
 *
 * Locks the rendered contract: nav landmark, aria-current on the active page,
 * Previous disabled on page 1, Next disabled on the last page, non-interactive
 * ellipsis, 44x44px targets, and single-page result sets render nothing.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThingsPagination from "@/components/things/ThingsPagination";

function renderPagination(currentPage: number, totalPages: number) {
  const onPageChange = vi.fn();
  const view = render(
    <ThingsPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />,
  );
  return { onPageChange, view };
}

describe("ThingsPagination - rendering", () => {
  it("renders a labelled navigation landmark", () => {
    renderPagination(1, 3);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeTruthy();
  });

  it("marks the current page with aria-current", () => {
    renderPagination(2, 3);
    const current = screen.getByRole("button", { name: "Page 2" });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Go to page 1" }).getAttribute("aria-current")).toBeNull();
  });

  it("renders numeric buttons for a small total with no ellipsis", () => {
    renderPagination(2, 3);
    expect(screen.getByRole("button", { name: "Go to page 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page 2" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go to page 3" })).toBeTruthy();
    // No ellipsis on a 3-page window.
    expect(screen.queryByText("…")).toBeNull();
  });

  it("renders an ellipsis for a gap on a large total", () => {
    renderPagination(1, 10);
    expect(screen.getByText("…")).toBeTruthy();
  });

  it("keeps the numeric button count bounded on a large total", () => {
    renderPagination(50, 100);
    const numericButtons = screen
      .getAllByRole("button")
      .filter((button) => /^(Go to page|Page )\d+$/.test(button.getAttribute("aria-label") ?? ""));
    expect(numericButtons.length).toBeLessThanOrEqual(7);
  });

  it("uses 44x44px targets on page and arrow buttons", () => {
    renderPagination(2, 3);
    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button.className).toMatch(/h-11 w-11/);
    }
  });

  it("renders nothing for a single-page result set", () => {
    const { view } = renderPagination(1, 1);
    expect(view.container.innerHTML).toBe("");
  });
});

describe("ThingsPagination - boundaries", () => {
  it("disables Previous on page 1", () => {
    renderPagination(1, 5);
    expect(screen.getByRole("button", { name: "Previous page" }).hasAttribute("disabled")).toBe(true);
  });

  it("enables Next before the last page and it navigates", () => {
    const { onPageChange } = renderPagination(1, 5);
    const next = screen.getByRole("button", { name: "Next page" });
    expect(next.hasAttribute("disabled")).toBe(false);
    fireEvent.click(next);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables Next on the last page", () => {
    renderPagination(5, 5);
    expect(screen.getByRole("button", { name: "Next page" }).hasAttribute("disabled")).toBe(true);
  });

  it("enables Previous after page 1 and it navigates", () => {
    const { onPageChange } = renderPagination(3, 5);
    const prev = screen.getByRole("button", { name: "Previous page" });
    expect(prev.hasAttribute("disabled")).toBe(false);
    fireEvent.click(prev);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("does not call onPageChange for a disabled Previous", () => {
    const { onPageChange } = renderPagination(1, 5);
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

describe("ThingsPagination - ellipsis is not interactive", () => {
  it("renders the ellipsis as non-button spans", () => {
    renderPagination(5, 10);
    const ellipses = screen.getAllByText("…");
    expect(ellipses.length).toBeGreaterThan(0);
    for (const ellipsis of ellipses) {
      expect(ellipsis.tagName).toBe("SPAN");
      expect(ellipsis.closest("button")).toBeNull();
      expect(ellipsis.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("page clicks navigate to the requested page", () => {
    const { onPageChange } = renderPagination(5, 10);
    fireEvent.click(screen.getByRole("button", { name: "Go to page 7" }));
    expect(onPageChange).toHaveBeenCalledWith(7);
  });
});
