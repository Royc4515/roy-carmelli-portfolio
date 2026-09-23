import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
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
    {/* Honour the OS "reduce motion" setting in every Framer Motion animation. */}
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        {showGallery && Gallery ? (
          <Suspense fallback={null}>
            <Gallery />
          </Suspense>
        ) : (
          <App />
        )}
      </ToastProvider>
    </MotionConfig>
  </StrictMode>
);
