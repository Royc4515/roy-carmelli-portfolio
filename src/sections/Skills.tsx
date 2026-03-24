import { motion } from 'framer-motion';
import { skills } from '../data/bio';

export default function Skills() {
  return (
    <motion.section
      id="skills"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ padding: '6rem 2rem', maxWidth: '900px', margin: '0 auto' }}
    >
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: '1rem' }}>02. skills</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '3rem', letterSpacing: '-0.02em' }}>What I Work With</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {skills.map(group => (
          <div key={group.category} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.5rem',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--accent)',
              letterSpacing: '0.08em',
              marginBottom: '1rem',
              textTransform: 'uppercase',
            }}>{group.category}</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {group.items.map(item => (
                <li key={item} style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-secondary)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                }}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
