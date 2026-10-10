import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { ToastProvider } from './components/ui/Toast';

/**
 * The providers every render of the app needs. Shared by the browser entry (main.tsx) and the
 * build-time prerender (entry-server.tsx), so the snapshot crawlers read is built from the
 * same tree visitors get.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    // `m.*` components get their animation features here, once. `strict` throws if a
    // full-size `motion.*` component comes back and silently re-inflates the bundle.
    <LazyMotion features={domAnimation} strict>
      {/* Honour the OS "reduce motion" setting in every Framer Motion animation. */}
      <MotionConfig reducedMotion="user">
        <ToastProvider>{children}</ToastProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
