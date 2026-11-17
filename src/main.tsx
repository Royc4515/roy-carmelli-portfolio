import { StrictMode, Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import { AppProviders } from './AppProviders';
import { PRERENDERED_ATTR } from './seo/prerenderMarker';
import { isClassicRoute, readOptionRoute } from './options/route';
import LiveSite from './options/f/LiveSite';

// Dev-only component gallery at /?gallery. `import.meta.env.DEV` is a literal
// `false` in production builds, so the dynamic import (and its chunk) is dropped.
const Gallery = import.meta.env.DEV ? lazy(() => import('./dev/Gallery')) : null;
const showGallery =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('gallery');

// Design options for review at /?options and /?option=a..d (docs/portfolio-options/OPTIONS.md).
// Lazy, so a normal visit downloads none of it; unlike the gallery it also ships in production
// builds, because the options are reviewed on a preview deployment.
const OptionsRoot = lazy(() => import('./options/OptionsRoot'));
const optionRoute = readOptionRoute(window.location.search);

// The pixel-RPG site that was live before option F, at /?classic. Lazy: "/" never downloads it.
const ClassicApp = lazy(() => import('./App'));
const classic = isClassicRoute(window.location.search);
const live = !optionRoute && !classic && !showGallery;

/** Rendered beside the lazy classic site, inside its Suspense: mounts once that has rendered. */
function BootDone() {
  useEffect(() => document.getElementById('boot')?.remove(), []);
  return null;
}

// don't touch / set before the first render: F's styles are scoped under html[data-option], and
// index.html's inline night background would show for a frame without it. The prerendered
// dist/index.html carries the same attribute, so it is removed for every other page.
if (live) document.documentElement.dataset.option = 'f';
else delete document.documentElement.dataset.option;

const container = document.getElementById('root')!;

// don't touch / createRoot, not hydrateRoot: the build-time snapshot in #root is rendered at
// one fixed desktop viewport, while the hero geometry and several layouts are computed from the
// real window on the first client render. Hydrating would keep the snapshot's mismatched
// attributes in production; createRoot replaces the snapshot with a fresh render instead.
const root = createRoot(container);

// Synchronous, so the snapshot (kept invisible by the prerender's style rule) is swapped for the
// live app in one commit and the first frame visitors see is the same as before prerendering.
flushSync(() =>
  root.render(
    <StrictMode>
      <AppProviders>
        {optionRoute ? (
          <Suspense fallback={null}>
            <OptionsRoot route={optionRoute} />
          </Suspense>
        ) : showGallery && Gallery ? (
          <Suspense fallback={null}>
            <Gallery />
          </Suspense>
        ) : (
          <>
            {classic ? (
              <Suspense fallback={null}>
                <ClassicApp />
                <BootDone />
              </Suspense>
            ) : (
              <LiveSite />
            )}
            {/* Vercel Web Analytics: cookieless page views, so no consent banner is needed.
                It only reports on the deployed site; in dev it logs to the console. */}
            <Analytics />
          </>
        )}
      </AppProviders>
    </StrictMode>,
  ),
);
container.removeAttribute(PRERENDERED_ATTR);
// The boot card (index.html) covered the wait for this script; the app is on screen now.
// An option, or the lazy classic site, is still downloading its chunk at this point: it removes
// the card itself once it has rendered, so the wait is never a blank page.
if (!optionRoute && !classic) document.getElementById('boot')?.remove();
