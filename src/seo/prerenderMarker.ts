/**
 * Attribute the prerender puts on `#root` while it holds the build-time snapshot. A style rule
 * keyed on it keeps the snapshot invisible to visitors with JavaScript (they get the live app,
 * exactly as before), while crawlers that never run JavaScript still read every word of it.
 */
export const PRERENDERED_ATTR = 'data-prerendered';
