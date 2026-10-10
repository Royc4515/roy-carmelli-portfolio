#!/usr/bin/env node
// Build step 3 of 3 (after `vite build` and `vite build --ssr`): writes the rendered page into
// dist/index.html, adds the JSON-LD graph, and generates dist/sitemap.xml and dist/llms.txt.
//
// Why a DOM shim instead of making every component SSR-safe: a few hooks read the window in
// their state initialisers (theme, media queries, the hero's viewport maths). Running the render
// under jsdom keeps those components untouched; the snapshot is replaced by a normal client
// render on load (see src/main.tsx), so the shim's fixed viewport never reaches a visitor.

import { execSync } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = resolve(ROOT, 'dist');
const SSR_DIR = resolve(ROOT, 'dist-ssr');

/** The snapshot's viewport: a common laptop, so the no-JS layout is the desktop title screen. */
const VIEWPORT = { width: 1280, height: 800 };

function installDom() {
  const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', {
    url: 'https://roy-carmelli-portfolio.vercel.app/',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  Object.defineProperty(window, 'innerWidth', { value: VIEWPORT.width });
  Object.defineProperty(window, 'innerHeight', { value: VIEWPORT.height });
  // Reduced motion on: Reveal then renders plain elements instead of opacity-0 ones, so the
  // snapshot is readable without JavaScript. Visitors never see the snapshot's motion state.
  window.matchMedia = query => ({
    matches: /prefers-reduced-motion:\s*reduce/.test(query),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.ResizeObserver = window.IntersectionObserver;

  // Node has its own navigator, performance etc.; only fill what is missing or DOM-specific.
  const keys = ['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'matchMedia',
    'IntersectionObserver', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'HTMLElement', 'Element', 'Node', 'CustomEvent', 'innerWidth', 'innerHeight'];
  for (const key of keys) {
    const value = key === 'window' ? window : window[key];
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
}

/**
 * Date (YYYY-MM-DD) of the last commit touching `paths`, for sitemap lastmod; the newest
 * commit's date when the clone is too shallow to see it, today when there is no git at all.
 */
function commitDate(...paths) {
  for (const args of [['--', ...paths], []]) {
    try {
      const out = execSync(`git log -1 --format=%cs ${args.map(a => JSON.stringify(a)).join(' ')}`, {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
    } catch {
      // No git or no history: try the next fallback.
    }
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * The render runs without hydration on purpose (src/main.tsx), so React's "useLayoutEffect does
 * nothing on the server" warning is expected for every component that measures the DOM. Muted
 * so a real render error is not buried under dozens of them in the build log.
 */
function muteLayoutEffectWarnings() {
  const error = console.error;
  console.error = (first, ...rest) => {
    if (typeof first === 'string' && first.includes('useLayoutEffect does nothing on the server')) return;
    error(first, ...rest);
  };
}

function replaceOnce(html, search, replacement, what) {
  const at = html.indexOf(search);
  if (at === -1 || html.indexOf(search, at + 1) !== -1) {
    throw new Error(`prerender: expected exactly one ${what} in dist/index.html`);
  }
  return html.slice(0, at) + replacement + html.slice(at + search.length);
}

async function main() {
  installDom();
  muteLayoutEffectWarnings();
  const server = await import(pathToFileURL(resolve(SSR_DIR, 'entry-server.js')).href);

  const appHtml = server.render();
  if (!appHtml.includes('<h1')) throw new Error('prerender: the rendered page has no <h1>');

  const pageDate = commitDate('src', 'index.html', 'public');
  const attr = server.PRERENDERED_ATTR;
  const headExtra = [
    // Hidden only while JavaScript is about to replace it (src/main.tsx removes the attribute),
    // so visitors get the exact first paint they had before; without JavaScript it shows.
    `<style>#root[${attr}]{visibility:hidden}</style>`,
    `<noscript><style>#root[${attr}]{visibility:visible}</style></noscript>`,
    server.structuredDataScript(server.structuredData({ dateModified: pageDate })),
  ].join('\n    ');

  const indexPath = resolve(DIST, 'index.html');
  let html = await readFile(indexPath, 'utf8');
  html = replaceOnce(html, '<div id="root"></div>', `<div id="root" ${attr}>${appHtml}</div>`, 'empty #root');
  html = replaceOnce(html, '</head>', `  ${headExtra}\n  </head>`, '</head>');
  await writeFile(indexPath, html);

  const lastmod = Object.fromEntries(
    server.SITEMAP_PATHS.map(path => [path, path === '/' ? pageDate : commitDate(`public${path}`)]),
  );
  await writeFile(resolve(DIST, 'sitemap.xml'), server.sitemapXml(lastmod));
  await writeFile(resolve(DIST, 'llms.txt'), server.llmsTxt());
  await rm(SSR_DIR, { recursive: true, force: true });

  const words = appHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  console.log(`prerender: index.html (${words} words), sitemap.xml (${JSON.stringify(lastmod)}), llms.txt`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
