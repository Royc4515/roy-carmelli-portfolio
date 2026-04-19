export default function Footer() {
  return (
    <footer
      style={{
        background: '#1a2e10',
        borderTop: '3px solid #c9a24a',
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
          color: '#c9b87a',
          letterSpacing: '0.08em',
        }}
      >
        Roy Carmelli © {new Date().getFullYear()}
      </p>
      <p
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '0.4rem',
          color: '#4a6b2e',
          letterSpacing: '0.05em',
        }}
      >
        React · TypeScript · Vite · Pixel Art
      </p>
    </footer>
  );
}
