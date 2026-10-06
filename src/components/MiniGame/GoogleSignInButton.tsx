import { useEffect, useRef, useState } from 'react';
import { googleClientId } from '../../lib/scoreboardConfig';
import { loadGoogleIdentity } from '../../lib/googleIdentity';

export interface GoogleSignInButtonProps {
  /** Receives the Google ID token; the server turns it into a session. */
  onCredential: (credential: string) => void;
}

/**
 * Google's own "Sign in with Google" button (their script draws it, per their branding rules).
 * The script loads only when this mounts, i.e. when a signed-out player opens the leaderboard.
 */
export default function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    const clientId = googleClientId();
    if (!clientId) {
      setState('failed');
      return;
    }
    let alive = true;
    loadGoogleIdentity().then(
      gis => {
        const slot = slotRef.current;
        if (!alive || !slot) return;
        gis.initialize({
          client_id: clientId,
          callback: ({ credential }) => credential && onCredentialRef.current(credential),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        gis.renderButton(slot, { type: 'standard', theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'rectangular' });
        setState('ready');
      },
      () => alive && setState('failed'),
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      {/* Google renders into this slot; it must exist (but stay empty) while the script loads. */}
      <div ref={slotRef} data-testid="google-button-slot" />
      {state === 'loading' && <p className="text-body-s text-fg-muted">Loading Google sign-in...</p>}
      {state === 'failed' && (
        <p className="text-body-s text-fg-muted">Google sign-in didn't load. Check your connection or blocker.</p>
      )}
    </div>
  );
}
