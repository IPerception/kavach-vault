import '@testing-library/jest-dom/vitest'

// jsdom has no ResizeObserver; Radix Tooltip (floating-ui) needs one.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
