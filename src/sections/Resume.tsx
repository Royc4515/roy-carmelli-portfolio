import PixelPanel from '../components/PixelPanel';

export default function Resume() {
  return (
    <section
      id="resume"
      style={{
        background: 'var(--color-forest-dark)',
        padding: '3rem 2rem',
        display: 'flex',
        justifyContent: 'center',
        borderTop: '3px solid var(--color-forest-light)',
      }}
    >
      <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <PixelPanel variant="wood">
          <p style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.5rem', color: 'var(--color-brass)', marginBottom: '0.75rem', letterSpacing: '0.08em' }}>
            📜 RESUME SCROLL
          </p>
          <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.9rem', color: 'var(--color-parchment-dark)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Download my CV to learn more about my experience and skills.
          </p>
          <a
            href="/Roy_Carmelli_CV.pdf"
            download="Roy_Carmelli_CV.pdf"
            style={{
              display: 'inline-block',
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'var(--color-brass)',
              color: 'var(--color-forest-dark)',
              textDecoration: 'none',
              letterSpacing: '0.05em',
              boxShadow: '4px 4px 0 var(--color-wood-dark)',
              transition: 'transform 0.08s, box-shadow 0.08s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translate(2px,2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '2px 2px 0 var(--color-wood-dark)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 var(--color-wood-dark)'; }}
          >
            ⬇ Download Resume
          </a>
        </PixelPanel>
      </div>
    </section>
  );
}
