// Captures and measures the design options (and the current site) for docs/portfolio-options.
//
//   npm run build && npx vite preview &            # serves dist/ on :4173
//   node scripts/options/capture.mjs --only a,b,current --shots --video --metrics
//
// Flags: --base <url> (default http://localhost:4173), --out <dir> (default
// docs/portfolio-options), --only <comma list of a,b,c,d,current>, and any of --shots,
// --video, --metrics (all three when none is given). Chromium comes with the environment;
// never run `playwright install`.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = value('base', 'http://localhost:4173');
const OUT = value('out', 'docs/portfolio-options');
const ONLY = value('only', 'a,b,c,d,current').split(',').map(s => s.trim()).filter(Boolean);
const all = !flag('shots') && !flag('video') && !flag('metrics');
const DO = { shots: all || flag('shots'), video: all || flag('video'), metrics: all || flag('metrics') };

const THEME_KEY = 'roy-portfolio-theme'; // same key as index.html and src/hooks/useTheme.ts
const urlFor = target => (target === 'current' ? `${BASE}/` : `${BASE}/?option=${target}`);

const VIEWPORTS = {
  phone: { width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tablet: { width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 2 },
};

async function newContext(browser, viewportName, theme, extra = {}) {
  const { width, height, ...rest } = VIEWPORTS[viewportName];
  const context = await browser.newContext({
    viewport: { width, height },
    ...rest,
    colorScheme: theme === 'night' ? 'dark' : 'light',
    ...extra,
  });
  await context.addInitScript(
    ([key, t]) => {
      try {
        localStorage.setItem(key, t);
      } catch {
        /* storage blocked: the colour scheme above still picks the theme */
      }
    },
    [THEME_KEY, theme],
  );
  return context;
}

/** The page is "ready" when the app (or an option) has rendered and fonts are in. */
async function settle(page) {
  await page.waitForFunction(
    () => document.querySelector('.opt main, #root main') && !document.getElementById('boot'),
    null,
    { timeout: 60_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
}

/** Lazy images load only near the viewport: walk the page once so a full-page still has them all. */
async function loadAllImages(page) {
  await page.evaluate(async () => {
    const root = document.scrollingElement;
    document.documentElement.style.scrollBehavior = 'auto';
    for (let y = 0; y < root.scrollHeight; y += innerHeight) {
      root.scrollTop = y;
      await new Promise(r => setTimeout(r, 120));
    }
    // Bounded: decode() never settles for a lazy image that stays hidden (display: none).
    await Promise.race([
      Promise.all([...document.images].map(img => (img.complete ? null : img.decode().catch(() => null)))),
      new Promise(r => setTimeout(r, 4000)),
    ]);
    root.scrollTop = 0;
  });
  await page.waitForTimeout(500);
}

async function shots(browser, target) {
  const dir = path.join(OUT, 'screenshots');
  fs.mkdirSync(dir, { recursive: true });
  for (const viewportName of Object.keys(VIEWPORTS)) {
    for (const theme of ['day', 'night']) {
      const context = await newContext(browser, viewportName, theme);
      const page = await context.newPage();
      await page.goto(urlFor(target), { waitUntil: 'load' });
      await settle(page);
      const label = theme === 'day' ? 'light' : 'dark';
      await page.screenshot({
        path: path.join(dir, `${target}-${viewportName}-${label}.jpg`),
        type: 'jpeg',
        quality: 84,
      });
      await context.close();
    }
  }
  // Whole page, light theme, at 1x (a tall 2x image is too heavy for the repo).
  for (const viewportName of ['phone', 'desktop']) {
    const context = await newContext(browser, viewportName, 'day', {
      deviceScaleFactor: 1,
      reducedMotion: 'reduce', // scroll-triggered reveals must not hide content in a still
    });
    const page = await context.newPage();
    await page.goto(urlFor(target), { waitUntil: 'load' });
    await settle(page);
    await loadAllImages(page);
    await page.screenshot({
      path: path.join(dir, `${target}-${viewportName}-full.jpg`),
      type: 'jpeg',
      quality: 72,
      fullPage: true,
    });
    await context.close();
  }
}

/** A 15 to 20 second top-to-bottom tour: 2s on the first screen, an eased scroll, 1.5s at the end. */
async function video(browser, target) {
  const dir = path.join(OUT, 'recordings');
  fs.mkdirSync(dir, { recursive: true });
  for (const viewportName of ['desktop', 'phone']) {
    const { width, height } = VIEWPORTS[viewportName];
    const tmp = fs.mkdtempSync(path.join(dir, '.tmp-'));
    const context = await newContext(browser, viewportName, 'day', {
      deviceScaleFactor: 1,
      recordVideo: { dir: tmp, size: { width, height } },
    });
    const page = await context.newPage();
    await page.goto(urlFor(target), { waitUntil: 'load' });
    await settle(page);
    await page.waitForTimeout(1200);
    await page.evaluate(
      ms =>
        new Promise(resolve => {
          const root = document.scrollingElement;
          const end = root.scrollHeight - innerHeight;
          const t0 = performance.now();
          // Instant steps driven by rAF: `scroll-behavior: smooth` would fight the tween.
          document.documentElement.style.scrollBehavior = 'auto';
          const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
          const step = now => {
            const t = Math.min(1, (now - t0) / ms);
            root.scrollTop = end * ease(t);
            if (t < 1) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        }),
      13_500,
    );
    await page.waitForTimeout(1500);
    const recorded = await page.video().path();
    await context.close();
    const final = path.join(dir, `${target}-tour-${viewportName}.webm`);
    // Re-encode: Playwright's VP8 is several MB; VP9 at this quality is a few hundred KB.
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-i', recorded,
      '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-row-mt', '1', '-an', final,
    ]);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** Counted in the page, for whatever is inside the first viewport. Review chrome is left out. */
function firstScreenCounts() {
  const vw = innerWidth;
  const vh = innerHeight;
  const inView = el => {
    if (el.closest('[data-review-chrome]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return false;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    }
    return true;
  };
  const styles = new Set();
  let words = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent.trim();
    const el = node.parentElement;
    if (!text || !el || el.closest('script,style,noscript') || !inView(el)) continue;
    // Count only the words of this node that are really on screen: use a range rect.
    const range = document.createRange();
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    if (r.top >= vh || r.bottom <= 0 || r.width <= 1) continue;
    words += text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
    const cs = getComputedStyle(el);
    styles.add(`${cs.fontFamily.split(',')[0].replace(/["']/g, '').trim()} ${cs.fontSize} ${cs.fontWeight}`);
  }
  const interactive = [...document.querySelectorAll(
    'a[href], button, input, select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])',
  )].filter(el => !el.disabled && inView(el));
  return { words, typeStyles: styles.size, typeStyleList: [...styles].sort(), interactive: interactive.length };
}

async function counts(browser, target, viewportName) {
  const context = await newContext(browser, viewportName, 'day', { deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(urlFor(target), { waitUntil: 'load' });
  await settle(page);
  const first = await page.evaluate(firstScreenCounts);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await context.close();
  return { ...first, pageHeight: height, overflowX };
}

/** DevTools "Slow 3G": 400 kbit/s both ways, 2 s round trip. */
const SLOW_3G = { offline: false, downloadThroughput: (500 * 1024 * 0.8) / 8, uploadThroughput: (500 * 1024 * 0.8) / 8, latency: 2000 };

async function slow3g(browser, target) {
  const context = await newContext(browser, 'phone', 'day', { deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    window.__lcp = 0;
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) window.__lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', SLOW_3G);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const scripts = new Set();
  const stylesheets = new Set();
  page.on('response', res => {
    const u = new URL(res.url());
    if (u.origin !== new URL(BASE).origin) return;
    if (u.pathname.endsWith('.js')) scripts.add(u.pathname);
    if (u.pathname.endsWith('.css')) stylesheets.add(u.pathname);
  });
  await page.goto(urlFor(target), { waitUntil: 'load', timeout: 180_000 });
  await page.waitForFunction(
    () => document.querySelector('.opt main, #root main') && !document.getElementById('boot'),
    null,
    { timeout: 180_000 },
  );
  await page.waitForTimeout(6000); // late fonts and lazy chunks still count towards CLS
  const timing = await page.evaluate(() => ({
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
    lcp: window.__lcp,
    cls: window.__cls,
    ready: performance.getEntriesByName('option-ready')[0]?.startTime ?? null,
  }));
  await context.close();
  return { ...timing, scripts: [...scripts], stylesheets: [...stylesheets] };
}

/** Gzipped size of a served file, read from dist/ (vite preview does not compress). */
function gz(pathname) {
  const file = path.join('dist', pathname);
  return fs.existsSync(file) ? gzipSync(fs.readFileSync(file), { level: 9 }).length : 0;
}

/**
 * The repo's Playwright can be a different version from the Chromium that is installed
 * (CLAUDE.md): try it first, then the global install, which matches the preinstalled browser.
 */
async function launchChromium() {
  const require = createRequire(import.meta.url);
  const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  let lastError;
  for (const id of ['playwright', path.join(globalRoot, 'playwright')]) {
    try {
      return await require(id).chromium.launch();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const browser = await launchChromium();
const report = fs.existsSync(path.join(OUT, 'metrics.json'))
  ? JSON.parse(fs.readFileSync(path.join(OUT, 'metrics.json'), 'utf8'))
  : {};

for (const target of ONLY) {
  console.log(`== ${target}`);
  if (DO.shots) await shots(browser, target);
  if (DO.video) await video(browser, target);
  if (DO.metrics) {
    const net = await slow3g(browser, target);
    report[target] = {
      slow3g: {
        fcpMs: net.fcp && Math.round(net.fcp),
        lcpMs: net.lcp && Math.round(net.lcp),
        readyMs: net.ready && Math.round(net.ready),
        cls: Number(net.cls.toFixed(4)),
      },
      jsGzip: net.scripts.reduce((sum, p) => sum + gz(p), 0),
      cssGzip: net.stylesheets.reduce((sum, p) => sum + gz(p), 0),
      scripts: net.scripts,
      desktop: await counts(browser, target, 'desktop'),
      tablet: await counts(browser, target, 'tablet'),
      phone: await counts(browser, target, 'phone'),
    };
    console.log(JSON.stringify(report[target], null, 1));
  }
}
await browser.close();

if (DO.metrics) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'metrics.json'), `${JSON.stringify(report, null, 2)}\n`);
}
