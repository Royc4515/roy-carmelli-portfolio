// src/components/Footer.tsx
export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '2rem',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
    }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Designed and built by Roy Carmelli · {new Date().getFullYear()}
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.6 }}>
        React · TypeScript · Framer Motion
      </p>
    </footer>
  );
}
