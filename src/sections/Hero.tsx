import { motion } from 'framer-motion';
import { bio } from '../data/bio';
import Character from '../components/Character';

const DOT_GRID = {
  backgroundImage: 'radial-gradient(circle, #4a6b2e 1px, transparent 1px)',
  backgroundSize: '32px 32px',
} as const;

export default function Hero() {
  return (
    <section
      id="hero"
      style={{
        minHeight: '100vh',
        background: '#1a2e10',
        ...DOT_GRID,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 2rem 2rem',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '3rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Text content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ maxWidth: '520px', flex: 1, minWidth: '280px' }}
        >
          <p style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '0.6rem',
            color: '#c9a24a',
            letterSpacing: '0.15em',
            marginBottom: '1.25rem',
          }}>
            ▶ PLAYER ONE — PRESS START
          </p>

          <h1 style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 'clamp(1.4rem, 3.5vw, 2.4rem)',
            color: '#e8d8a8',
            lineHeight: 1.4,
            marginBottom: '0.75rem',
            textShadow: '3px 3px 0 #1a2e10',
          }}>
            {bio.name}
          </h1>

          <h2 style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 'clamp(0.5rem, 1.2vw, 0.75rem)',
            color: '#c9a24a',
            lineHeight: 2,
            marginBottom: '1.75rem',
          }}>
            {bio.title}
          </h2>

          <p style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '1.05rem',
            color: '#c9b87a',
            lineHeight: 1.75,
            marginBottom: '2.25rem',
            maxWidth: '440px',
          }}>
            {bio.tagline}
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              href="#projects"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '0.55rem',
                padding: '0.85rem 1.75rem',
                background: '#c9a24a',
                color: '#1a2e10',
                textDecoration: 'none',
                letterSpacing: '0.05em',
                boxShadow: '4px 4px 0 #6b4a2e',
                display: 'inline-block',
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
              ▶ View Projects
            </a>
            <a
              href="#contact"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '0.55rem',
                padding: '0.85rem 1.75rem',
                background: 'transparent',
                color: '#e8d8a8',
                textDecoration: 'none',
                letterSpacing: '0.05em',
                boxShadow: '4px 4px 0 #2d4a1e, inset 0 0 0 2px #c9a24a',
                display: 'inline-block',
                transition: 'transform 0.08s, box-shadow 0.08s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translate(2px,2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '2px 2px 0 #2d4a1e, inset 0 0 0 2px #c9a24a';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 #2d4a1e, inset 0 0 0 2px #c9a24a';
              }}
            >
              Contact Me
            </a>
          </div>
        </motion.div>

        {/* Character — the hero visual */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
        >
          {/* Face avatar */}
          <img
            src="/assets/sprites/face-large.png"
            alt="Roy Carmelli pixel avatar"
            style={{
              height: '120px',
              width: 'auto',
              imageRendering: 'pixelated',
              border: '3px solid #c9a24a',
              boxShadow: '4px 4px 0 #3a2818',
              background: '#1a2e10',
            }}
          />
          {/* Animated character */}
          <Character pose="wave" scale={1.4} ariaLabel="Roy waving hello" />

          {/* HP/Status bar decoration */}
          <div style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '0.4rem',
            color: '#4a6b2e',
            letterSpacing: '0.08em',
            textAlign: 'center',
            lineHeight: 2,
          }}>
            <div>HP ████████████ MAX</div>
            <div>XP ██████░░░░░░ LVL 3</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
