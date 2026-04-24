import { motion } from 'framer-motion';
import { bio } from '../data/bio';
import PixelPanel from '../components/PixelPanel';
import ZoneLabel from '../components/ZoneLabel';
import Character from '../components/Character';

const socials = [
  { href: bio.github,            label: 'GitHub',   icon: '🐙' },
  { href: bio.linkedin,          label: 'LinkedIn', icon: '💼' },
  { href: bio.facebook,          label: 'Facebook', icon: '📘' },
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
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'flex',
          gap: '2.5rem',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', minWidth: '120px' }}>
          <ZoneLabel lines={['CONTACT', 'ZONE']} icon="/assets/sprites/icon-contact.png" />
          <Character pose="idle" scale={1} ariaLabel="Roy standing" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <h2 style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 'clamp(0.7rem, 1.8vw, 1.1rem)',
            color: 'var(--color-parchment)',
            textShadow: '2px 2px 0 var(--color-forest-dark)',
          }}>
            Let's Talk 📮
          </h2>

          <PixelPanel variant="wood">
            <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '1rem', color: 'var(--color-parchment-dark)', lineHeight: 1.8, marginBottom: '1.25rem' }}>
              Actively seeking a student position in software engineering or AI development. Open to research collaborations at the intersection of CS and neuroscience.
            </p>
            <a
              href={`mailto:${bio.email}`}
              style={{
                display: 'inline-block',
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '0.5rem',
                padding: '0.85rem 1.25rem',
                background: 'var(--color-brass)',
                color: 'var(--color-forest-dark)',
                textDecoration: 'none',
                letterSpacing: '0.04em',
                boxShadow: '4px 4px 0 var(--color-wood)',
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

            <div style={{ borderTop: '1px solid var(--color-forest-light)', marginTop: '1.25rem', paddingTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
