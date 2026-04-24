export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--color-forest-dark)',
        borderTop: '3px solid var(--color-brass)',
        padding: '1.5rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <p
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '0.5rem',
          color: 'var(--color-parchment-dark)',
          letterSpacing: '0.08em',
        }}
      >
        Roy Carmelli © {new Date().getFullYear()}
      </p>
      <p
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '0.4rem',
          color: 'var(--color-forest-light)',
          letterSpacing: '0.05em',
        }}
      >
        React · TypeScript · Vite · Pixel Art
      </p>
    </footer>
  );
}
