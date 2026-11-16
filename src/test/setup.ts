import '@testing-library/jest-dom';

// The api/ tests run in the node environment: there is no window to patch there.
if (typeof window !== 'undefined') {
  // framer-motion uses these browser APIs not present in jsdom
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

  // jsdom has no matchMedia. Default: a desktop window where no query matches; tests that care
  // about a breakpoint replace it. (The chat launcher asks for the phone breakpoint on every page.)
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}
