import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import App from './App';
import { ToastProvider } from './components/ui/Toast';

// Dev-only component gallery at /?gallery. `import.meta.env.DEV` is a literal
// `false` in production builds, so the dynamic import (and its chunk) is dropped.
const Gallery = import.meta.env.DEV ? lazy(() => import('./dev/Gallery')) : null;
const showGallery =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('gallery');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* `m.*` components get their animation features here, once. `strict` throws if a
        full-size `motion.*` component comes back and silently re-inflates the bundle. */}
    <LazyMotion features={domAnimation} strict>
      {/* Honour the OS "reduce motion" setting in every Framer Motion animation. */}
      <MotionConfig reducedMotion="user">
        <ToastProvider>
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
        </ToastProvider>
      </MotionConfig>
    </LazyMotion>
  </StrictMode>
);
