import { motion } from 'framer-motion';
import MiniGame from '../components/MiniGame/MiniGame';
import ArcadeFallback from '../components/ArcadeFallback';
import ZoneLabel from '../components/ZoneLabel';
import { useGameDisplayMode } from '../hooks/useGameDisplayMode';

export default function Arcade() {
  const mode = useGameDisplayMode();

  return (
    <section
      id="arcade"
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
      <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto' }}>

        {/* Header row */}
        <div className="flex flex-wrap items-center gap-6 mb-8">
          <ZoneLabel
            lines={['ARCADE', 'ZONE']}
            icon="/assets/sprites/icon-home.png"
          />
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 'clamp(0.85rem, 2vw, 1.2rem)',
              color: 'var(--color-parchment)',
              textShadow: '2px 2px 0 var(--color-wood-dark)',
            }}
          >
            Roy Runner
          </motion.h2>
        </div>

        {/* Canvas or fallback */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          {mode === 'rotate'
            ? <ArcadeFallback />
            : <MiniGame showTouchControls={mode === 'touch'} />}
        </motion.div>

        {/* Controls hint — adapts to input method */}
        {mode !== 'rotate' && (
          <p style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '0.4rem',
            color: 'var(--color-forest-light)',
            marginTop: '0.85rem',
            textAlign: 'center',
            letterSpacing: '0.08em',
          }}>
            {mode === 'touch' ? 'JUMP / SLIDE BUTTONS · ⛶ FOR FULLSCREEN' : 'SPACE or CLICK TO JUMP'}
          </p>
        )}
      </div>
    </section>
  );
}
