import { motion } from 'framer-motion';
import { bio } from '../data/bio';

export default function About() {
  return (
    <motion.section
      id="about"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: '6rem 2rem',
        maxWidth: '900px',
        margin: '0 auto',
      }}
    >
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: '1rem' }}>01. about</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '3rem', letterSpacing: '-0.02em' }}>Who I Am</h2>
      <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>
        <div>
          {bio.about.split('\n\n').map((para, i) => (
            <p key={i} style={{
              color: 'var(--text-secondary)',
              lineHeight: 1.8,
              marginBottom: '1.25rem',
              fontSize: '1rem',
            }}>{para}</p>
          ))}
        </div>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '2rem',
        }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--accent)',
            letterSpacing: '0.1em',
            marginBottom: '1.25rem',
            textTransform: 'uppercase',
          }}>
            At a glance
          </p>
          {[
            { label: 'Degree',     value: 'B.Sc. CS & Brain Sciences' },
            { label: 'University', value: 'Bar-Ilan University' },
            { label: 'Currently',  value: '2nd year, 2024–present' },
            { label: 'Open to',    value: 'Internships · Research · Collaborations' },
          ].map(({ label, value }, i, arr) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: '1rem',
                padding: '0.75rem 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                textAlign: 'right',
              }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .about-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
        }
      `}</style>
    </motion.section>
  );
}
