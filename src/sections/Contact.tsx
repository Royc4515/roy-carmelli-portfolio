import { motion } from 'framer-motion';
import { bio } from '../data/bio';
import PixelPanel from '../components/PixelPanel';
import ZoneLabel from '../components/ZoneLabel';
import Character from '../components/Character';

const DOT_GRID = {
  backgroundImage: 'radial-gradient(circle, #4a6b2e 1px, transparent 1px)',
  backgroundSize: '32px 32px',
} as const;

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
      style={{
        minHeight: '80vh',
        background: '#2d4a1e',
        ...DOT_GRID,
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
            color: '#e8d8a8',
            textShadow: '2px 2px 0 #1a2e10',
          }}>
            Let's Talk 📮
          </h2>

          <PixelPanel variant="wood">
            <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '1rem', color: '#c9b87a', lineHeight: 1.8, marginBottom: '1.25rem' }}>
              Open to internships, research collaborations, and interesting projects at the intersection of CS and neuroscience.
            </p>
            <a
              href={`mailto:${bio.email}`}
              style={{
                display: 'inline-block',
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '0.5rem',
                padding: '0.85rem 1.25rem',
                background: '#c9a24a',
                color: '#1a2e10',
                textDecoration: 'none',
                letterSpacing: '0.04em',
                boxShadow: '4px 4px 0 #6b4a2e',
                transition: 'transform 0.08s, box-shadow 0.08s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translate(2px,2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '2px 2px 0 #6b4a2e';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 #6b4a2e';
              }}
            >
              ✉ {bio.email}
            </a>

            <div style={{ borderTop: '1px solid #4a6b2e', marginTop: '1.25rem', paddingTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                    background: '#1a2e10',
                    border: '2px solid #4a6b2e',
                    color: '#e8d8a8',
                    textDecoration: 'none',
                    boxShadow: '3px 3px 0 #0f1c09',
                    transition: 'border-color 0.15s, transform 0.08s, box-shadow 0.08s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#c9a24a';
                    (e.currentTarget as HTMLElement).style.transform = 'translate(1px,1px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '2px 2px 0 #0f1c09';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#4a6b2e';
                    (e.currentTarget as HTMLElement).style.transform = '';
                    (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 #0f1c09';
                  }}
                >
                  <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{icon}</span>
                  <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.3rem', color: '#c9b87a', letterSpacing: '0.05em' }}>{label}</span>
                </a>
              ))}
            </div>
          </PixelPanel>
        </motion.div>
      </div>
    </section>
  );
}
