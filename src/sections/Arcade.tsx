import { motion } from 'framer-motion';
import MiniGame from '../components/MiniGame/MiniGame';
import ZoneLabel from '../components/ZoneLabel';
import { DOT_GRID } from '../theme/tokens';

export default function Arcade() {
  return (
    <section
      id="arcade"
      style={{
        minHeight: '100vh',
        background: '#1a2e10',
        ...DOT_GRID,
        display: 'flex',
        alignItems: 'center',
        padding: '80px 2rem 4rem',
      }}
    >
      <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto' }}>

        {/* Header row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}>
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
              color: '#e8d8a8',
              textShadow: '2px 2px 0 #000',
            }}
          >
            Roy Runner
          </motion.h2>
        </div>

        {/* Canvas */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <MiniGame />
        </motion.div>

        {/* Controls hint */}
        <p style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '0.4rem',
          color: '#4a6b2e',
          marginTop: '0.85rem',
          textAlign: 'center',
          letterSpacing: '0.08em',
        }}>
          SPACE or CLICK TO JUMP
        </p>

      </div>
    </section>
  );
}
