import { projects } from '../data/projects';

export default function Projects() {
  const featured = projects.filter(p => p.featured);
  const rest = projects.filter(p => !p.featured);

  return (
    <section id="projects" style={{ padding: '6rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: '1rem' }}>03. projects</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '3rem', letterSpacing: '-0.02em' }}>Things I've Built</h2>

      {/* Featured grid */}
      <div className="featured-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {featured.map(project => (
          <div key={project.id} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '2.5rem',
            transition: 'border-color 0.2s, background 0.2s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'var(--accent-dim)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-card)';
            }}
          >
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--accent)',
              letterSpacing: '0.12em',
              marginBottom: '0.5rem',
            }}>★ featured</p>
            <div className="project-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: '-0.01em' }}>{project.title}</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {project.github && <a href={project.github} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>GitHub →</a>}
                {project.live && <a href={project.live} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>Live →</a>}
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem', fontSize: '0.95rem' }}>{project.description}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {project.tech.map(t => (
                <span key={t} style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--accent)',
                  background: 'var(--accent-dim)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                }}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Separator */}
      <div style={{ margin: '2.5rem 0 2rem', borderTop: '1px solid var(--border)' }} />

      {/* Regular cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {rest.map(project => (
          <div key={project.id} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '2rem',
            transition: 'border-color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div className="project-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '-0.01em' }}>{project.title}</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {project.github && <a href={project.github} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>GitHub →</a>}
                {project.live && <a href={project.live} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>Live →</a>}
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem', fontSize: '0.95rem' }}>{project.description}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {project.tech.map(t => (
                <span key={t} style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--accent)',
                  background: 'var(--accent-dim)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                }}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .featured-grid { grid-template-columns: 1fr !important; }
          .project-header { flex-direction: column !important; gap: 0.5rem !important; }
        }
      `}</style>
    </section>
  );
}
