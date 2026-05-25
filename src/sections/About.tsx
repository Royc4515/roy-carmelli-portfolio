import { motion } from 'framer-motion';
import { bio } from '../data/bio';
import PixelPanel from '../components/PixelPanel';
import ZoneLabel from '../components/ZoneLabel';

export default function About() {
  return (
    <section
      id="about"
      className="dot-grid"
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--color-forest-dark)',
        display: 'flex',
        alignItems: 'center',
        padding: '80px 2rem 4rem',
      }}
    >
      {/* Mobile-first: stack vertically, side-by-side from md */}
      <div className="flex flex-col md:flex-row gap-10 items-start mx-auto w-full" style={{ maxWidth: '1100px' }}>

        {/* Zone label sidebar */}
        <div className="flex flex-col items-center gap-6 flex-shrink-0 md:w-36">
          <ZoneLabel lines={['ABOUT', 'THE', 'ADVENTURER']} icon="/assets/sprites/icon-about.png" />
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          className="flex-1 min-w-0 flex flex-col"
          style={{ gap: '1.5rem' }}
        >
          <h2 style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 'clamp(0.85rem, 2vw, 1.2rem)',
            color: 'var(--color-parchment)',
            textShadow: '2px 2px 0 var(--color-wood-dark)',
          }}>
            Who I Am
          </h2>

          <PixelPanel variant="parchment">
            {bio.about.split('\n\n').map((para, i) => (
              <p key={i} style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.95rem',
                color: 'var(--color-wood-dark)',
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
              color: 'var(--color-brass)',
              letterSpacing: '0.1em',
              marginBottom: '1rem',
            }}>
              ── AT A GLANCE ──
            </p>
            {[
              { label: 'Degree',     value: 'B.Sc. Computer Science & Neuroscience' },
              { label: 'University', value: 'Bar-Ilan University' },
              { label: 'Year',       value: '2nd Year, Semester B' },
              { label: 'GPA',        value: '86.16 / 100' },
              { label: 'Open to',    value: 'Internships · Student roles · R&D' },
            ].map(({ label, value }, i, arr) => (
              <div key={label} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 sm:gap-4" style={{
                padding: '0.65rem 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--color-forest-light)' : 'none',
              }}>
                <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.45rem', color: 'var(--color-parchment-dark)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
                <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.85rem', color: 'var(--color-parchment)' }}>
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
