import { bio } from '../data/bio';

export default function Hero() {
  return (
    <section id="hero" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '0 2rem',
      maxWidth: '900px',
      margin: '0 auto',
    }}>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        color: 'var(--accent)',
        letterSpacing: '0.1em',
        marginBottom: '1.5rem',
        opacity: 0.9,
      }}>
        Hi, I'm
      </p>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(3rem, 8vw, 6.5rem)',
        lineHeight: 1.05,
        color: 'var(--text-primary)',
        marginBottom: '0.5rem',
        letterSpacing: '-0.02em',
      }}>
        {bio.name}
      </h1>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(1.5rem, 4vw, 3rem)',
        lineHeight: 1.2,
        color: 'var(--text-muted)',
        marginBottom: '2rem',
        fontStyle: 'italic',
        letterSpacing: '-0.01em',
      }}>
        {bio.title}
      </h2>
      <p style={{
        fontFamily: 'var(--font-body)',
        fontSize: '1.1rem',
        color: 'var(--text-secondary)',
        maxWidth: '540px',
        lineHeight: 1.7,
        marginBottom: '3rem',
      }}>
        {bio.tagline}
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <a href="#projects" style={{
          padding: '0.75rem 1.75rem',
          background: 'var(--accent)',
          color: 'var(--bg-primary)',
          borderRadius: '4px',
          textDecoration: 'none',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: '0.9rem',
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
        >
          View Projects
        </a>
        <a href="#contact" style={{
          padding: '0.75rem 1.75rem',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          borderRadius: '4px',
          textDecoration: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '0.9rem',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          Get in Touch
        </a>
      </div>
    </section>
  );
}
