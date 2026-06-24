import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bio } from '../data/bio';
import Character from '../components/Character';
import MiniGame from '../components/MiniGame/MiniGame';
import ArcadeFallback from '../components/ArcadeFallback';
import { useIsMobile } from '../hooks/useIsMobile';
import { useGameDisplayMode } from '../hooks/useGameDisplayMode';
import { HERO_CHARACTER_OFFSET_X } from '../theme/tokens';

export default function Hero() {
  const [isPlaying, setIsPlaying] = useState(false);
  const isMobile = useIsMobile();
  const mode = useGameDisplayMode();

  useEffect(() => {
    const handler = () => setIsPlaying(true);
    window.addEventListener('arcade:play', handler);
    return () => window.removeEventListener('arcade:play', handler);
  }, []);

  // Lock body scroll while the play overlay is open so taps don't bleed into page scroll.
  useEffect(() => {
    if (!isPlaying) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isPlaying]);

  function handlePressStart() {
    // Enter "playing" state. The overlay decides what to show based on display mode:
    // desktop/landscape-phone → the game; portrait phone → a "rotate" prompt.
    setIsPlaying(true);
  }

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
      {/* ── Static hero content ─────────────────────────────────────────── */}
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
              padding: '80px 1.5rem 2rem',
            }}
          >
            <div className="w-full md:flex md:flex-row md:items-center md:justify-between md:gap-12" style={{ maxWidth: '1100px' }}>

              {/* Text content */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="w-full md:max-w-[520px]"
              >
                <button
                  onClick={handlePressStart}
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
                  ▶ PLAYER ONE - PRESS START
                </button>

                <h1 style={{
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: 'clamp(1.2rem, 3.5vw, 2.4rem)',
                  color: 'var(--color-parchment)',
                  lineHeight: 1.4,
                  marginBottom: '0.75rem',
                  textShadow: '3px 3px 0 var(--color-forest-dark)',
                }}>
                  {bio.name}
                </h1>

                <h2 style={{
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: 'clamp(0.45rem, 1.2vw, 0.75rem)',
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
                  marginBottom: '1rem',
                  maxWidth: '440px',
                }}>
                  {bio.tagline}
                </p>

                {/* Mobile: buttons on left, character on right — same row */}
                <div className="flex flex-row items-start gap-4 md:hidden">
                  <div className="flex flex-col gap-3 flex-shrink-0 items-start">
                    <a
                      href="#projects"
                      style={{
                        fontFamily: '"Press Start 2P", monospace',
                        fontSize: '0.65rem',
                        padding: '1rem 1.5rem',
                        background: 'var(--color-brass)',
                        color: 'var(--color-forest-dark)',
                        textDecoration: 'none',
                        letterSpacing: '0.05em',
                        boxShadow: '4px 4px 0 var(--color-wood)',
                        display: 'inline-block',
                        minHeight: '44px',
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
                      ▶ View Projects
                    </a>
                    <a
                      href="#contact"
                      style={{
                        fontFamily: '"Press Start 2P", monospace',
                        fontSize: '0.5rem',
                        padding: '0.6rem 0.875rem',
                        background: 'transparent',
                        color: 'var(--color-secondary-text)',
                        textDecoration: 'none',
                        letterSpacing: '0.05em',
                        boxShadow: 'inset 0 0 0 2px var(--color-forest-light)',
                        display: 'inline-block',
                        minHeight: '44px',
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

                  {/* Character beside buttons on mobile */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.25 }}
                    className="flex-1 flex justify-end"
                  >
                    <Character pose="wave" scale={1.1} ariaLabel="Roy waving hello" />
                  </motion.div>
                </div>

                {/* Desktop: buttons only (character rendered separately below) */}
                <div className="hidden md:flex flex-wrap gap-4 items-center">
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
                      minHeight: '44px',
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
                      minHeight: '44px',
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

              {/* Desktop only: character + player card column */}
              {!isMobile && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.25 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}
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
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Game / fallback overlay ──────────────────────────────────────── */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              // Touch play covers the actual viewport (fixed, above the navbar) so the
              // canvas can be centered and fully visible — MiniGame owns its own QUIT +
              // fullscreen controls. Desktop/rotate keep the in-section overlay.
              ...(mode === 'touch'
                ? { position: 'fixed', inset: 0, padding: '0', zIndex: 200, background: 'var(--color-forest-dark)' }
                : { position: 'absolute', inset: 0, padding: '80px 1rem 1rem' }),
            }}
          >
            {mode === 'rotate' ? (
              <ArcadeFallback />
            ) : (
              <MiniGame
                onQuit={() => setIsPlaying(false)}
                showTouchControls={mode === 'touch'}
              />
            )}

            {/* Desktop / rotate keep an explicit QUIT control; touch mode's QUIT lives
                inside MiniGame's on-screen chrome. */}
            {mode !== 'touch' && (
              <button
                onClick={() => setIsPlaying(false)}
                style={{
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: '0.45rem',
                  color: 'var(--color-parchment)',
                  background: 'transparent',
                  border: '2px solid var(--color-forest-light)',
                  padding: '0.5rem 1rem',
                  minWidth: '44px',
                  minHeight: '44px',
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
            )}
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
