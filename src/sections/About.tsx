import { motion } from 'framer-motion';
import { bio } from '../data/bio';
import PixelPanel from '../components/PixelPanel';
import ZoneLabel from '../components/ZoneLabel';
import { DOT_GRID } from '../theme/tokens';

export default function About() {
  return (
    <section
      id="about"
      style={{
        minHeight: '100vh',
        background: '#1a2e10',
        ...DOT_GRID,
        display: 'flex',
        alignItems: 'center',
        padding: '80px 2rem 4rem',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          gap: '2.5rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        {/* Zone label */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', minWidth: '140px' }}>
          <ZoneLabel lines={['ABOUT', 'THE', 'ADVENTURER']} icon="/assets/sprites/icon-about.png" />
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <h2 style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 'clamp(0.85rem, 2vw, 1.2rem)',
            color: '#e8d8a8',
            textShadow: '2px 2px 0 #000',
          }}>
            Who I Am
          </h2>

          <PixelPanel variant="parchment">
            {bio.about.split('\n\n').map((para, i) => (
              <p key={i} style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.95rem',
                color: '#3a2818',
                lineHeight: 1.8,
                marginBottom: i < bio.about.split('\n\n').length - 1 ? '0.85rem' : 0,
              }}>
                {para}
              </p>
            ))}
          </PixelPanel>

          <PixelPanel variant="wood">
            <p style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '0.5rem',
              color: '#c9a24a',
              letterSpacing: '0.1em',
              marginBottom: '1rem',
            }}>
              ── AT A GLANCE ──
            </p>
            {[
              { label: 'Degree',     value: 'B.Sc. CS & Brain Sciences' },
              { label: 'University', value: 'Bar-Ilan University' },
              { label: 'Year',       value: '2nd year, 2024–present' },
              { label: 'Open to',    value: 'Internships · Research · Collabs' },
            ].map(({ label, value }, i, arr) => (
              <div key={label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: '1rem',
                padding: '0.65rem 0',
                borderBottom: i < arr.length - 1 ? '1px solid #4a6b2e' : 'none',
              }}>
                <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.45rem', color: '#c9b87a', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
                <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.85rem', color: '#e8d8a8', textAlign: 'right' }}>
                  {value}
                </span>
              </div>
            ))}
          </PixelPanel>
        </motion.div>
      </div>
    </section>
  );
}
