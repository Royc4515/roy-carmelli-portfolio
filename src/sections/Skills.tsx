import { motion } from 'framer-motion';
import { skills } from '../data/bio';
import PixelPanel from '../components/PixelPanel';
import ZoneLabel from '../components/ZoneLabel';

export default function Skills() {
  return (
    <section
      id="skills"
      className="dot-grid"
      style={{
        position: 'relative',
        minHeight: '80vh',
        background: 'var(--color-forest-dark)',
        padding: '80px 2rem 4rem',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          gap: '2.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ paddingTop: '0.5rem', minWidth: '120px' }}>
          <ZoneLabel lines={['SKILL', 'TREE', '── LVL UP ──']} icon="/assets/sprites/icon-skills.jpg" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          style={{ flex: 1, minWidth: '280px' }}
        >
          <h2 style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 'clamp(0.7rem, 1.8vw, 1.1rem)',
            color: 'var(--color-parchment)',
            textShadow: '2px 2px 0 var(--color-wood-dark)',
            marginBottom: '1.75rem',
          }}>
            What I Work With
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.25rem' }}>
            {skills.map((group, gi) => (
              <motion.div
                key={group.category}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: gi * 0.07 }}
                style={{ flex: '0 1 280px', minWidth: '220px' }}
              >
                <PixelPanel variant="wood">
                  <h3 style={{
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '0.45rem',
                    color: 'var(--color-brass)',
                    letterSpacing: '0.08em',
                    marginBottom: '0.85rem',
                    textTransform: 'uppercase',
                  }}>
                    {group.category}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {group.items.map(item => (
                      <span key={item} style={{
                        fontFamily: '"Inter", sans-serif',
                        fontSize: '0.78rem',
                        color: 'var(--color-parchment)',
                        background: 'var(--color-forest)',
                        padding: '6px 12px',
                        border: '1px solid var(--color-forest-light)',
                      }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </PixelPanel>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
