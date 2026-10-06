import '@testing-library/jest-dom';

// The api/ tests run in the node environment: there is no window to patch there.
if (typeof window !== 'undefined') {
  // framer-motion uses these browser APIs not present in jsdom
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}
