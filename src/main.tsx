import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import App from './App';
import { AppProviders } from './AppProviders';
import { PRERENDERED_ATTR } from './seo/prerenderMarker';

// Dev-only component gallery at /?gallery. `import.meta.env.DEV` is a literal
// `false` in production builds, so the dynamic import (and its chunk) is dropped.
const Gallery = import.meta.env.DEV ? lazy(() => import('./dev/Gallery')) : null;
const showGallery =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('gallery');

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
        {showGallery && Gallery ? (
          <Suspense fallback={null}>
            <Gallery />
          </Suspense>
        ) : (
          <>
            <App />
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
