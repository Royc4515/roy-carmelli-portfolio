import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { duration } from '../../theme/motion';

/** How long a toast stays up before it starts leaving (SPEC §3: 2.4s). */
export const TOAST_DURATION_MS = 2400;
/** Length of the exit animation; the toast unmounts after it. */
export const TOAST_EXIT_MS = duration.fast;

export interface ToastOptions {
  /** Decorative icon left of the message, e.g. `<PixelIcon name="check" size={24} />`. */
  icon?: ReactNode;
}

export interface ToastApi {
  /** Shows `message`, replacing any toast already on screen. Never moves focus. */
  show: (message: string, options?: ToastOptions) => void;
}

interface ToastState {
  id: number;
  message: string;
  icon?: ReactNode;
  leaving: boolean;
}

const ToastContext = createContext<ToastApi | null>(null);

const fallback: ToastApi = {
  show(message) {
    if (import.meta.env.DEV) {
      console.warn(`useToast: no <ToastProvider> above this component; dropped "${message}".`);
    }
  },
};

/**
 * Hosts the single toast live region (SPEC §3): `role="status"`,
 * `aria-live="polite"`, bottom-centre, a paper plate with a brass frame that
 * pops in with `--ease-pop` (no movement under reduced motion) and leaves
 * after 2.4s. Mount it once near the root (see src/main.tsx).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(t => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      clearTimers();
      nextId.current += 1;
      const id = nextId.current;
      setToast({ id, message, icon: options?.icon, leaving: false });
      timers.current.push(
        window.setTimeout(() => {
          setToast(t => (t?.id === id ? { ...t, leaving: true } : t));
        }, TOAST_DURATION_MS),
        window.setTimeout(() => {
          setToast(t => (t?.id === id ? null : t));
        }, TOAST_DURATION_MS + TOAST_EXIT_MS),
      );
    },
    [clearTimers],
  );

  useEffect(() => clearTimers, [clearTimers]);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Always mounted, so screen readers are already watching it when a message lands. */}
      <div className="px-toast-region" role="status" aria-live="polite" aria-atomic="true">
        {toast && (
          <div
            key={toast.id}
            className="px-toast px-frame px-drop-sm"
            data-leaving={toast.leaving ? '' : undefined}
          >
            {toast.icon != null && (
              <span className="px-toast__icon" aria-hidden="true">
                {toast.icon}
              </span>
            )}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Access the toast API. Outside a `ToastProvider` it returns a no-op (with a
 * dev warning when called), so sections render in isolation in tests.
 *
 * @example
 *   const toast = useToast();
 *   toast.show('Email copied · progress saved', { icon: <PixelIcon name="check" size={24} /> });
 */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? fallback;
}
