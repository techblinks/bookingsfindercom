import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Hoisted controllable state + spies ──
const H = vi.hoisted(() => ({
  isAdmin: true,
  authLoading: false,
  user: { id: "u1" } as { id: string } | null,
  rows: [
    { id: "1", city: "Kathmandu", country: "Nepal", iata_code: "KTM", slug: "kathmandu", description: "d", alt_text: "a", image_path: null, focal_x: 0.5, focal_y: 0.5, display_order: 1, is_active: false, created_at: "t", updated_at: "t" },
    { id: "2", city: "Dubai", country: "United Arab Emirates", iata_code: "DXB", slug: "dubai", description: "d", alt_text: "a", image_path: null, focal_x: 0.5, focal_y: 0.5, display_order: 2, is_active: true, created_at: "t", updated_at: "t" },
  ],
  imageRejects: false,
  spyInsert: vi.fn(),
  spyUpdate: vi.fn(),
  spyDelete: vi.fn(),
}));

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({ user: H.user, isLoading: H.authLoading, isAdmin: H.isAdmin }),
}));
vi.mock("@/components/auth/AdminLoginForm", () => ({ AdminLoginForm: () => <div data-testid="login-form">login</div> }));
vi.mock("@/components/layout/Header", () => ({ default: () => null }));
vi.mock("@/components/layout/Footer", () => ({ default: () => null }));
vi.mock("react-helmet-async", () => ({ Helmet: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/flightDestinationImage", () => ({
  processMasterImage: () => H.imageRejects
    ? Promise.reject(new Error("This browser cannot encode WebP"))
    : Promise.resolve({ blob: new Blob(), width: 800, height: 600, type: "image/webp" }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: H.rows, error: null }) }),
      insert: (p: unknown) => { H.spyInsert(p); return Promise.resolve({ data: null, error: null }); },
      update: (p: unknown) => { H.spyUpdate(p); return { eq: () => Promise.resolve({ data: null, error: null }) }; },
      delete: () => { H.spyDelete(); return { eq: () => Promise.resolve({ data: null, error: null }) }; },
    }),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: "https://cdn.test/" + path } }),
        upload: () => Promise.resolve({ data: {}, error: null }),
        remove: () => Promise.resolve({ data: {}, error: null }),
      }),
    },
  },
}));

import { toast } from "sonner";
import AdminFlightDestinations from "@/pages/AdminFlightDestinations";

const renderPage = () =>
  render(<MemoryRouter initialEntries={["/admin/flights/destinations"]}><AdminFlightDestinations /></MemoryRouter>);

describe("AdminFlightDestinations", () => {
  beforeEach(() => {
    H.isAdmin = true; H.authLoading = false; H.user = { id: "u1" }; H.imageRejects = false;
    H.spyInsert.mockClear(); H.spyUpdate.mockClear(); H.spyDelete.mockClear();
    (toast.error as ReturnType<typeof vi.fn>).mockClear?.();
  });

  it("shows the login form for non-admins", () => {
    H.isAdmin = false; H.user = null;
    renderPage();
    expect(screen.getByTestId("login-form")).toBeTruthy();
    expect(screen.queryByTestId("destination-list")).toBeNull();
  });

  it("lists destinations for admins with active badges", async () => {
    renderPage();
    expect(await screen.findByText("Kathmandu")).toBeTruthy();
    expect(screen.getByText("Dubai")).toBeTruthy();
    // Dubai is active, Kathmandu inactive
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
  });

  it("opens the add form and blocks an invalid save with an accessible error", async () => {
    renderPage();
    await screen.findByText("Kathmandu");
    fireEvent.click(screen.getByTestId("add-destination"));
    expect(screen.getByTestId("destination-form")).toBeTruthy();
    fireEvent.click(screen.getByTestId("save-destination"));
    await waitFor(() => expect(screen.getByText("City is required")).toBeTruthy());
    expect(screen.getByText("City is required").getAttribute("role")).toBe("alert");
    expect(H.spyInsert).not.toHaveBeenCalled();
  });

  it("has accessible, labelled form controls", async () => {
    renderPage();
    await screen.findByText("Kathmandu");
    fireEvent.click(screen.getByTestId("add-destination"));
    for (const label of ["City", "Country", "IATA code", "Slug", "Display order", "Focal X", "Focal Y"]) {
      expect(screen.getByLabelText(label, { exact: false })).toBeTruthy();
    }
    // list action controls expose accessible names
    expect(screen.getByLabelText("Edit Kathmandu")).toBeTruthy();
    expect(screen.getByLabelText("Delete Kathmandu")).toBeTruthy();
    expect(screen.getByLabelText("Toggle Kathmandu active")).toBeTruthy();
  });

  it("confirms before deleting", async () => {
    renderPage();
    await screen.findByText("Kathmandu");
    fireEvent.click(screen.getByLabelText("Delete Kathmandu"));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Delete Kathmandu\?/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("confirm-delete"));
    await waitFor(() => expect(H.spyDelete).toHaveBeenCalled());
  });

  it("surfaces an upload-failure state without faking success", async () => {
    H.imageRejects = true;
    renderPage();
    await screen.findByText("Kathmandu");
    fireEvent.click(screen.getByLabelText("Edit Kathmandu"));
    const fileInput = screen.getByTestId("image-input") as HTMLInputElement;
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This browser cannot encode WebP"));
  });

  it("uses a responsive grid for the list (1→2 columns)", async () => {
    renderPage();
    await screen.findByText("Kathmandu");
    const list = screen.getByTestId("destination-list");
    expect(list.className).toMatch(/grid-cols-1/);
    expect(list.className).toMatch(/sm:grid-cols-2/);
  });
});
