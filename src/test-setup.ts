// Vitest global setup for jsdom environment

import { vi } from "vitest";

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
