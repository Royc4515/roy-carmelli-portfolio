import PixelPanel from './PixelPanel';

export default function ArcadeFallback() {
  return (
    <div className="w-full max-w-md mx-auto">
      <PixelPanel variant="dark">
        <div className="flex flex-col items-center gap-6 py-8 text-center">
          <span style={{ fontSize: '3rem', lineHeight: 1, imageRendering: 'pixelated' }}>
            🖥️
          </span>

          <h3 style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '0.65rem',
            color: 'var(--color-brass)',
            letterSpacing: '0.12em',
          }}>
            ARCADE ZONE
          </h3>

          <p
            data-testid="arcade-fallback-message"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '0.45rem',
              color: 'var(--color-parchment)',
              lineHeight: 2.2,
              letterSpacing: '0.05em',
            }}
          >
            ROY RUNNER REQUIRES<br />
            A LARGER SCREEN<br />
            TO PLAY.<br />
            <br />
            OPEN ON DESKTOP OR<br />
            ROTATE TO LANDSCAPE.
          </p>

          <div style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '0.38rem',
            color: 'var(--color-secondary-text)',
            border: '2px solid var(--color-forest-light)',
            padding: '0.6rem 1rem',
            letterSpacing: '0.08em',
            animation: 'hero-blink 1.5s step-end infinite',
          }}>
            [ INSERT COIN ON DESKTOP ]
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
