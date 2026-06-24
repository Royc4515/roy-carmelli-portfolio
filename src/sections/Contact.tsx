import { motion } from 'framer-motion';
import { bio } from '../data/bio';
import PixelPanel from '../components/PixelPanel';
import ZoneLabel from '../components/ZoneLabel';
import Character from '../components/Character';

const socials = [
  { href: bio.github,            label: 'GitHub',   icon: '🐙' },
  { href: bio.linkedin,          label: 'LinkedIn', icon: '💼' },
  { href: `mailto:${bio.email}`, label: 'Email',    icon: '✉️' },
  { href: `tel:${bio.phone}`,    label: 'Phone',    icon: '📞' },
];

export default function Contact() {
  return (
    <section
      id="contact"
      className="dot-grid"
      style={{
        position: 'relative',
        minHeight: '80vh',
        background: 'var(--color-forest)',
        padding: '80px 2rem 4rem',
      }}
    >
      {/* Mobile-first: stack vertically, side-by-side from md */}
      <div className="flex flex-col md:flex-row gap-10 items-start mx-auto" style={{ maxWidth: '900px' }}>

        {/* Zone label + character sidebar — full-width on mobile so items center properly */}
        <div className="flex flex-col items-center gap-6 flex-shrink-0 w-full md:w-28">
          <ZoneLabel lines={['CONTACT', 'ZONE']} icon="/assets/sprites/icon-contact.png" />
          <Character pose="idle" scale={1} ariaLabel="Roy standing" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          className="flex-1 min-w-0 flex flex-col"
          style={{ gap: '1.5rem' }}
        >
          <h2 className="text-center md:text-left" style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 'clamp(0.7rem, 1.8vw, 1.1rem)',
            color: 'var(--color-parchment)',
            textShadow: '2px 2px 0 var(--color-forest-dark)',
          }}>
            Let's Talk 📮
          </h2>

          <PixelPanel variant="wood">
            <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '1rem', color: 'var(--color-parchment-dark)', lineHeight: 1.8, marginBottom: '1.25rem' }}>
              Available for software engineering and AI internships starting summer 2026 - part-time during the semester, full-time during breaks. Also open to research collaborations at the CS × neuroscience intersection.
            </p>
            <div className="flex justify-center md:justify-start">
            <a
              href={`mailto:${bio.email}`}
              style={{
                display: 'inline-block',
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '0.5rem',
                padding: '0.85rem 1.25rem',
                minHeight: '44px',
                background: 'var(--color-brass)',
                color: 'var(--color-forest-dark)',
                textDecoration: 'none',
                letterSpacing: '0.04em',
                boxShadow: '4px 4px 0 var(--color-wood)',
                wordBreak: 'break-all',
                transition: 'transform 0.08s, box-shadow 0.08s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translate(2px,2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '2px 2px 0 var(--color-wood)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 var(--color-wood)';
              }}
            >
              ✉ {bio.email}
            </a>
            </div>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start" style={{ borderTop: '1px solid var(--color-forest-light)', marginTop: '1.25rem', paddingTop: '1.25rem' }}>
              {socials.map(({ href, label, icon }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noreferrer' : undefined}
                  aria-label={label}
                  style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    width: '64px',
                    minHeight: '44px',
                    padding: '8px 4px',
                    background: 'var(--color-forest-dark)',
                    border: '2px solid var(--color-forest-light)',
                    color: 'var(--color-parchment)',
                    textDecoration: 'none',
                    boxShadow: '3px 3px 0 var(--color-shadow-deep)',
                    transition: 'border-color 0.15s, transform 0.08s, box-shadow 0.08s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-brass)';
                    (e.currentTarget as HTMLElement).style.transform = 'translate(1px,1px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '2px 2px 0 var(--color-shadow-deep)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-forest-light)';
                    (e.currentTarget as HTMLElement).style.transform = '';
                    (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 var(--color-shadow-deep)';
                  }}
                >
                  <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{icon}</span>
                  <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.3rem', color: 'var(--color-parchment-dark)', letterSpacing: '0.05em' }}>{label}</span>
                </a>
              ))}
            </div>
          </PixelPanel>
        </motion.div>
      </div>
    </section>
  );
}
