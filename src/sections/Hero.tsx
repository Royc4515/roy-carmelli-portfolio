import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bio } from '../data/bio';
import Character from '../components/Character';
import MiniGame from '../components/MiniGame/MiniGame';
import { HERO_CHARACTER_OFFSET_X } from '../theme/tokens';

export default function Hero() {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const handler = () => setIsPlaying(true);
    window.addEventListener('arcade:play', handler);
    return () => window.removeEventListener('arcade:play', handler);
  }, []);

  return (
    <section
      id="hero"
      className="dot-grid"
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--color-forest-dark)',
        overflow: 'hidden',
      }}
    >
      {/* ── Static hero content ────────────────────────────────────────── */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            key="static"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              padding: '80px 2rem 2rem',
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
                <button
                  onClick={() => setIsPlaying(true)}
                  style={{
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '0.6rem',
                    color: 'var(--color-brass)',
                    letterSpacing: '0.15em',
                    marginBottom: '1.25rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'block',
                    animation: 'hero-blink 1s step-end infinite',
                  }}
                >
                  ▶ PLAYER ONE — PRESS START
                </button>

                <h1 style={{
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: 'clamp(1.4rem, 3.5vw, 2.4rem)',
                  color: 'var(--color-parchment)',
                  lineHeight: 1.4,
                  marginBottom: '0.75rem',
                  textShadow: '3px 3px 0 var(--color-forest-dark)',
                }}>
                  {bio.name}
                </h1>

                <h2 style={{
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: 'clamp(0.5rem, 1.2vw, 0.75rem)',
                  color: 'var(--color-brass)',
                  lineHeight: 2,
                  marginBottom: '1.75rem',
                }}>
                  {bio.title}
                </h2>

                <p style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '1.05rem',
                  color: 'var(--color-parchment)',
                  lineHeight: 1.75,
                  marginBottom: '2.25rem',
                  maxWidth: '440px',
                }}>
                  {bio.tagline}
                </p>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <a
                    href="#projects"
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize: '0.6rem',
                      padding: '1rem 2rem',
                      background: 'var(--color-brass)',
                      color: 'var(--color-forest-dark)',
                      textDecoration: 'none',
                      letterSpacing: '0.05em',
                      boxShadow: '5px 5px 0 var(--color-wood)',
                      display: 'inline-block',
                      transition: 'transform 0.08s, box-shadow 0.08s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translate(2px,2px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 var(--color-wood)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = '';
                      (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 var(--color-wood)';
                    }}
                  >
                    ▶ View Projects
                  </a>
                  <a
                    href="#contact"
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize: '0.45rem',
                      padding: '0.75rem 1.25rem',
                      background: 'transparent',
                      color: 'var(--color-secondary-text)',
                      textDecoration: 'none',
                      letterSpacing: '0.05em',
                      boxShadow: 'inset 0 0 0 2px var(--color-forest-light)',
                      display: 'inline-block',
                      transition: 'transform 0.08s, color 0.08s, box-shadow 0.08s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--color-brass)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'inset 0 0 0 2px var(--color-brass)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--color-secondary-text)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'inset 0 0 0 2px var(--color-forest-light)';
                    }}
                  >
                    Contact Me
                  </a>
                </div>
              </motion.div>

              {/* Character */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.25 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'var(--color-forest)',
                  border: '3px solid var(--color-brass)',
                  boxShadow: '4px 4px 0 var(--color-wood-dark)',
                  padding: '0.5rem 0.75rem',
                  position: 'relative',
                  zIndex: 10,
                }}>
                  <img
                    src="/assets/sprites/face-large.png"
                    alt="Roy Carmelli pixel avatar"
                    style={{ height: '56px', width: 'auto', imageRendering: 'pixelated', background: 'var(--color-forest-dark)' }}
                  />
                  <div>
                    <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.4rem', color: 'var(--color-brass)', marginBottom: '0.3rem' }}>PLAYER 1</div>
                    <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.35rem', color: 'var(--color-parchment)', lineHeight: 2 }}>
                      <div>HP ████████ MAX</div>
                      <div>XP █████░░░ LVL 3</div>
                    </div>
                  </div>
                </div>

                <div style={{ transform: `translateX(${HERO_CHARACTER_OFFSET_X}px)` }}>
                  <Character pose="wave" scale={1.4} ariaLabel="Roy waving hello" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Game overlay ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: '80px 1rem 1rem',
            }}
          >
            <MiniGame onQuit={() => setIsPlaying(false)} />

            <button
              onClick={() => setIsPlaying(false)}
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '0.45rem',
                color: 'var(--color-parchment)',
                background: 'transparent',
                border: '2px solid var(--color-forest-light)',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                letterSpacing: '0.1em',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--color-brass)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-brass)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--color-parchment)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-forest-light)';
              }}
            >
              [ESC] QUIT
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes hero-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  );
}
