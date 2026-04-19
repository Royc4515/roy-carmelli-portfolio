import PixelPanel from '../components/PixelPanel';

export default function Resume() {
  return (
    <section
      id="resume"
      style={{
        background: '#1a2e10',
        padding: '3rem 2rem',
        display: 'flex',
        justifyContent: 'center',
        borderTop: '3px solid #4a6b2e',
      }}
    >
      <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <PixelPanel variant="wood">
          <p style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.5rem', color: '#c9a24a', marginBottom: '0.75rem', letterSpacing: '0.08em' }}>
            📜 RESUME SCROLL
          </p>
          <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.9rem', color: '#c9b87a', marginBottom: '1.25rem', lineHeight: 1.6 }}>
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
              background: '#c9a24a',
              color: '#1a2e10',
              textDecoration: 'none',
              letterSpacing: '0.05em',
              boxShadow: '4px 4px 0 #3a2818',
              transition: 'transform 0.08s, box-shadow 0.08s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translate(2px,2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '2px 2px 0 #3a2818'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 #3a2818'; }}
          >
            ⬇ Download Resume
          </a>
        </PixelPanel>
      </div>
    </section>
  );
}
