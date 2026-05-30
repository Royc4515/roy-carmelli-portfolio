import { motion } from 'framer-motion';
import { projects } from '../data/projects';
import PixelPanel from '../components/PixelPanel';
import ZoneLabel from '../components/ZoneLabel';
import Character from '../components/Character';

export default function Projects() {
  const featured = projects.filter(p => p.featured);
  const rest = projects.filter(p => !p.featured);

  return (
    <section
      id="projects"
      className="dot-grid"
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--color-forest)',
        padding: '80px 2rem 4rem',
      }}
    >
      {/* Mobile-first: stack vertically, side-by-side from md */}
      <div className="flex flex-col md:flex-row gap-10 mx-auto" style={{ maxWidth: '1100px' }}>

        {/* Zone label + character sidebar */}
        <div className="flex flex-col items-center gap-6 pt-2 flex-shrink-0 md:w-36">
          <ZoneLabel lines={['LIBRARY', 'READING', 'NOOK']} icon="/assets/sprites/icon-library.png" />
          <Character pose="sit" scale={0.95} ariaLabel="Roy reading in the library" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.7 }}
          className="flex-1 min-w-0"
        >
          <h2 style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 'clamp(0.7rem, 1.8vw, 1.1rem)',
            color: 'var(--color-parchment)',
            textShadow: '2px 2px 0 var(--color-forest-dark)',
            marginBottom: '1.75rem',
          }}>
            Things I've Built
          </h2>

          {/* Featured grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {featured.map(project => (
              <motion.div key={project.id} whileHover={{ y: -4 }} transition={{ duration: 0.15 }}>
                <PixelPanel variant="parchment">
                  <p style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.45rem', color: '#7a5610', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>
                    ★ FEATURED
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem', gap: '0.5rem' }}>
                    <h3 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.6rem', color: 'var(--color-wood-dark)', lineHeight: 1.6, flex: 1 }}>
                      {project.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      {project.github && (
                        <a href={project.github} target="_blank" rel="noreferrer"
                          style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.4rem', color: 'var(--color-wood)', background: 'var(--color-brass)', padding: '3px 6px', textDecoration: 'none' }}>
                          GH→
                        </a>
                      )}
                      {project.live && (
                        <a href={project.live} target="_blank" rel="noreferrer"
                          style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.4rem', color: 'var(--color-parchment)', background: 'var(--color-forest-light)', padding: '3px 6px', textDecoration: 'none' }}>
                          ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.85rem', color: '#5a3a20', lineHeight: 1.65, marginBottom: '0.85rem' }}>
                    {project.description}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {project.tech.map(t => (
                      <span key={t} style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.35rem', color: 'var(--color-wood-dark)', background: 'var(--color-parchment-dark)', padding: '3px 7px' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </PixelPanel>
              </motion.div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '2px solid var(--color-forest-light)', marginBottom: '1.5rem' }} />

          {/* Regular projects */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rest.map(project => (
              <motion.div key={project.id} whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
                <PixelPanel variant="wood">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.55rem', color: 'var(--color-parchment)', marginBottom: '0.45rem', lineHeight: 1.6 }}>
                        {project.title}
                      </h3>
                      <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.85rem', color: 'var(--color-parchment)', lineHeight: 1.65, marginBottom: '0.6rem' }}>
                        {project.description}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {project.tech.map(t => (
                          <span key={t} style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.35rem', color: 'var(--color-parchment)', background: 'var(--color-forest)', padding: '3px 7px', border: '1px solid var(--color-forest-light)' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {project.github && (
                        <a href={project.github} target="_blank" rel="noreferrer"
                          style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.4rem', color: 'var(--color-parchment)', background: 'var(--color-forest-light)', padding: '5px 8px', textDecoration: 'none', boxShadow: '2px 2px 0 var(--color-forest-dark)' }}>
                          GH→
                        </a>
                      )}
                      {project.live && (
                        <a href={project.live} target="_blank" rel="noreferrer"
                          style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.4rem', color: 'var(--color-forest-dark)', background: 'var(--color-brass)', padding: '5px 8px', textDecoration: 'none', boxShadow: '2px 2px 0 var(--color-wood)' }}>
                          ↗
                        </a>
                      )}
                    </div>
                  </div>
                </PixelPanel>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
