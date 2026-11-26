import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Vite injects __APP_VERSION__ at build time. Default for every test (the lock screen and
// setup wizard footers show it); files that assert a version stub their own value.
vi.stubGlobal('__APP_VERSION__', '0.0.0-test')

// jsdom has no ResizeObserver; Radix Tooltip (floating-ui) needs one.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
