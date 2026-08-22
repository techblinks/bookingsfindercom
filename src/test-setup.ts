// Vitest global setup for jsdom environment

import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver (used by Radix UI slider and other components).
// Multiple UI test suites render components that transitively depend on
// Radix primitives (Slider, Select, etc.) which use ResizeObserver internally.
// jsdom does not provide ResizeObserver, so this empty stub prevents
// "ResizeObserver is not defined" errors across all test files.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill IntersectionObserver (used by SponsoredCard/AdEmbed impression
// tracking and other components). jsdom does not provide it, so this empty
// stub prevents "IntersectionObserver is not defined" errors — impression
// tracking itself is not exercised by these tests, only that the
// component renders without throwing.
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = "";
  thresholds = [];
} as unknown as typeof IntersectionObserver;

// Polyfill window.matchMedia for components that depend on use-mobile or
// HeroMediaCollage. jsdom does not implement matchMedia.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
