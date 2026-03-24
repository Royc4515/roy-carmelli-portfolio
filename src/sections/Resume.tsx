// src/sections/Resume.tsx
import { Download } from 'lucide-react';

export default function Resume() {
  return (
    <section
      style={{
        padding: '1rem 2rem 4rem',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <a
        href="/Roy_Carmelli_CV.pdf"
        download="Roy_Carmelli_CV.pdf"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.75rem',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          borderRadius: '4px',
          textDecoration: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '0.9rem',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.color = 'var(--accent)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <Download size={14} />
        Download Resume
      </a>
      {/* TODO: place Roy_Carmelli_CV.pdf in /public before deploying */}
    </section>
  );
}
