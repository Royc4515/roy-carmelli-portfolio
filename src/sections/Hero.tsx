import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bio } from '../data/bio';
import Character from '../components/Character';
import MiniGame from '../components/MiniGame/MiniGame';
import { DOT_GRID, HERO_CHARACTER_OFFSET_X } from '../theme/tokens';

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
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#1a2e10',
        ...DOT_GRID,
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
                    color: '#c9a24a',
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
                  color: '#e8d8a8',
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
                      background: '#c9a24a',
                      color: '#1a2e10',
                      textDecoration: 'none',
                      letterSpacing: '0.05em',
                      boxShadow: '5px 5px 0 #6b4a2e',
                      display: 'inline-block',
                      transition: 'transform 0.08s, box-shadow 0.08s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translate(2px,2px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 #6b4a2e';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = '';
                      (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 #6b4a2e';
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
                      color: '#8aaa6a',
                      textDecoration: 'none',
                      letterSpacing: '0.05em',
                      boxShadow: 'inset 0 0 0 2px #4a6b2e',
                      display: 'inline-block',
                      transition: 'transform 0.08s, color 0.08s, box-shadow 0.08s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = '#c9a24a';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'inset 0 0 0 2px #c9a24a';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = '#8aaa6a';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'inset 0 0 0 2px #4a6b2e';
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
                  background: '#2d4a1e',
                  border: '3px solid #c9a24a',
                  boxShadow: '4px 4px 0 #3a2818',
                  padding: '0.5rem 0.75rem',
                  position: 'relative',
                  zIndex: 10,
                }}>
                  <img
                    src="/assets/sprites/face-large.png"
                    alt="Roy Carmelli pixel avatar"
                    style={{ height: '56px', width: 'auto', imageRendering: 'pixelated', background: '#1a2e10' }}
                  />
                  <div>
                    <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.4rem', color: '#c9a24a', marginBottom: '0.3rem' }}>PLAYER 1</div>
                    <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.35rem', color: '#e8d8a8', lineHeight: 2 }}>
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
                color: '#e8d8a8',
                background: 'transparent',
                border: '2px solid #4a6b2e',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                letterSpacing: '0.1em',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = '#c9a24a';
                (e.currentTarget as HTMLElement).style.borderColor = '#c9a24a';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = '#e8d8a8';
                (e.currentTarget as HTMLElement).style.borderColor = '#4a6b2e';
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
