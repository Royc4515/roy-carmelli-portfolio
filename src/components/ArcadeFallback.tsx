import PixelPanel from './PixelPanel';
import PixelIcon from './PixelIcon';

export default function ArcadeFallback() {
  return (
    <div className="w-full max-w-md mx-auto">
      <PixelPanel variant="dark">
        <div className="flex flex-col items-center gap-6 py-8 text-center">
          <PixelIcon name="rotate-phone" size={48} />

          <h3 style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: '0.65rem',
            color: 'var(--color-brass)',
            letterSpacing: '0.12em',
          }}>
            ARCADE ZONE
          </h3>

          <p
            data-testid="arcade-fallback-message"
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '0.45rem',
              color: 'var(--color-parchment)',
              lineHeight: 2.2,
              letterSpacing: '0.05em',
            }}
          >
            ROTATE YOUR PHONE<br />
            TO LANDSCAPE<br />
            TO PLAY ROY RUNNER.<br />
            <br />
            (OR OPEN ON DESKTOP.)
          </p>

          <div style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: '0.38rem',
            color: 'var(--color-secondary-text)',
            border: '2px solid var(--color-forest-light)',
            padding: '0.6rem 1rem',
            letterSpacing: '0.08em',
            animation: 'hero-blink 1.5s step-end infinite',
          }}>
            [ TURN DEVICE SIDEWAYS ]
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
