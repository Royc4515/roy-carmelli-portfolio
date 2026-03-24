export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Built by Roy Carmelli · {new Date().getFullYear()}
      </p>
    </footer>
  );
}
