import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { EMAIL_SHOWN } from './content';

/** True when the visitor asked the OS for less motion. Live: follows a change of the setting. */
export function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq?.addEventListener) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Copy the email address; the caller shows the state in the button and in a live region.
 * `failed` (clipboard blocked, insecure context) lets the UI point at the mailto link instead.
 */
export function useCopyEmail(resetMs = 2200): [CopyState, () => void] {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(() => {
    const done = (next: CopyState) => {
      setState(next);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState('idle'), resetMs);
    };
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) return done('failed');
    clipboard.writeText(EMAIL_SHOWN).then(
      () => done('copied'),
      () => done('failed'),
    );
  }, [resetMs]);

  return [state, copy];
}

/**
 * Drives a native <dialog> as a modal: `showModal()` gives the focus trap, Esc and an inert
 * page for free. Also closes on a click on the backdrop, returns focus to the opener (the
 * browser does this for showModal) and locks page scroll while open.
 */
export function useModalDialog(open: boolean, onClose: () => void): RefObject<HTMLDialogElement> {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // jsdom (tests, the build-time prerender) has no showModal: fall back to the attribute.
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const { style } = document.documentElement;
    const before = style.overflow;
    style.overflow = 'hidden';
    return () => {
      style.overflow = before;
    };
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Esc fires `cancel` then `close`; keep React's state in step with the element.
    const onCloseEvent = () => onClose();
    const onClick = (event: MouseEvent) => {
      // A click on the ::backdrop is a click on the dialog element itself.
      if (event.target === dialog) onClose();
    };
    dialog.addEventListener('close', onCloseEvent);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('close', onCloseEvent);
      dialog.removeEventListener('click', onClick);
    };
  }, [onClose]);

  return ref;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

/**
 * Run a state change inside a same-document View Transition where the browser has them and the
 * visitor has not asked for less motion; otherwise just run it. `flushSync` because the API
 * snapshots the DOM right after the callback returns.
 */
export function withViewTransition(update: () => void): void {
  const doc = document as ViewTransitionDocument;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduced) {
    update();
    return;
  }
  doc.startViewTransition(() => flushSync(update));
}

/** True once the element has entered the viewport (stays true). No observer support: true at once. */
export function useSeen<T extends Element>(rootMargin = '0px 0px -10% 0px'): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, seen]);
  return [ref, seen];
}
