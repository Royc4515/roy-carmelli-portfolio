import { bio } from '../data/bio';

export default function Contact() {
  return (
    <section id="contact" style={{ padding: '6rem 2rem 10rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: '1rem' }}>04. contact</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Let's Talk</h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '3rem', fontSize: '1rem' }}>
        I'm open to internships, research collaborations, and interesting projects at the intersection of CS and neuroscience.
      </p>
      <a href={`mailto:${bio.email}`} style={{
        display: 'inline-block',
        padding: '0.9rem 2.5rem',
        border: '1px solid var(--accent)',
        color: 'var(--accent)',
        borderRadius: '4px',
        textDecoration: 'none',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.9rem',
        letterSpacing: '0.05em',
        transition: 'all 0.2s',
        marginBottom: '3rem',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-dim)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {bio.email}
      </a>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
        <a href={bio.github} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >GitHub</a>
        <a href={bio.linkedin} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >LinkedIn</a>
      </div>
    </section>
  );
}
