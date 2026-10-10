/** The slice of Google Identity Services (accounts.google.com/gsi/client) the site uses. */
export interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const LOAD_TIMEOUT_MS = 10_000;

let loading: Promise<GoogleAccountsId> | null = null;

/**
 * Loads Google's sign-in script once, on demand (only when the leaderboard opens), and
 * resolves to `google.accounts.id`. Rejects on a network error, a blocker, or a timeout, and
 * forgets the failure so the next open can try again.
 */
export function loadGoogleIdentity(doc: Document = document): Promise<GoogleAccountsId> {
  const ready = doc.defaultView?.google?.accounts?.id;
  if (ready) return Promise.resolve(ready);
  loading ??= new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = doc.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    const timer = setTimeout(() => fail(new Error('Google sign-in timed out')), LOAD_TIMEOUT_MS);
    function fail(err: Error) {
      clearTimeout(timer);
      script.remove();
      loading = null;
      reject(err);
    }
    script.onload = () => {
      clearTimeout(timer);
      const id = doc.defaultView?.google?.accounts?.id;
      if (id) resolve(id);
      else fail(new Error('Google sign-in loaded without its API'));
    };
    script.onerror = () => fail(new Error('Google sign-in failed to load'));
    doc.head.appendChild(script);
  });
  return loading;
}

/** Test hook. */
export function resetGoogleIdentityForTests(): void {
  loading = null;
}
