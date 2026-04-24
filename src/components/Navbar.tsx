import { useState, useEffect } from 'react';
import type { Theme } from '../hooks/useTheme';

const links = [
  { label: 'Home',     href: '#hero',     icon: '🍄' },
  { label: 'Library',  href: '#projects', icon: '📖' },
  { label: 'About',    href: '#about',    icon: '👤' },
  { label: 'Contact',  href: '#contact',  icon: '📮' },
];

function triggerArcade() {
  document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => window.dispatchEvent(new CustomEvent('arcade:play')), 400);
}

interface NavbarProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export default function Navbar({ theme, onToggleTheme }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--color-forest)',
          borderBottom: scrolled ? '3px solid var(--color-brass)' : '3px solid var(--color-forest-light)',
          transition: 'border-color 0.3s',
        }}
      >
        {/* Main nav bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            height: '60px',
          }}
        >
          {/* Nav links */}
          <ul
            className="rpg-nav-links"
            style={{ display: 'flex', gap: '0', listStyle: 'none', alignItems: 'center' }}
          >
            {links.map(link => (
              <li key={link.href}>
                <a
                  href={link.href}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 20px',
                    textDecoration: 'none',
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '0.5rem',
                    color: 'var(--color-parchment)',
                    letterSpacing: '0.05em',
                    transition: 'color 0.15s, background 0.15s',
                    borderRight: '1px solid var(--color-forest-light)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(201,162,74,0.15)';
                    e.currentTarget.style.color = 'var(--color-brass)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-parchment)';
                  }}
                >
                  <span style={{ fontSize: '1.4rem', lineHeight: 1, imageRendering: 'pixelated' }}>
                    {link.icon}
                  </span>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <button
                onClick={triggerArcade}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 20px',
                  background: 'none',
                  border: 'none',
                  borderRight: '1px solid var(--color-forest-light)',
                  cursor: 'pointer',
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: '0.5rem',
                  color: 'var(--color-parchment)',
                  letterSpacing: '0.05em',
                  transition: 'color 0.15s, background 0.15s',
                  height: '60px',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(201,162,74,0.15)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-brass)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-parchment)';
                }}
              >
                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🕹️</span>
                Arcade
              </button>
            </li>
          </ul>

          {/* Right side: theme toggle + face avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={onToggleTheme}
              aria-label={theme === 'night' ? 'Switch to day mode' : 'Switch to night mode'}
              title={theme === 'night' ? 'Switch to day' : 'Switch to night'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                background: 'var(--color-forest-dark)',
                border: '2px solid var(--color-brass)',
                color: 'var(--color-brass)',
                cursor: 'pointer',
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '1rem',
                lineHeight: 1,
                padding: 0,
                transition: 'transform 0.12s, color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
            >
              {theme === 'night' ? '☀' : '☾'}
            </button>

            <img
              src="/assets/sprites/face-small.png"
              alt="Roy Carmelli"
              style={{
                height: '48px',
                width: 'auto',
                imageRendering: 'pixelated',
                borderRadius: 0,
                border: '2px solid var(--color-brass)',
                background: 'var(--color-forest-dark)',
              }}
            />

            {/* Mobile hamburger */}
            <button
              className="rpg-hamburger"
              onClick={() => setMenuOpen(p => !p)}
              aria-label="Toggle menu"
              style={{
                display: 'none',
                background: 'none',
                border: '2px solid var(--color-brass)',
                cursor: 'pointer',
                padding: '6px 10px',
                color: 'var(--color-parchment)',
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '0.6rem',
              }}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99,
          background: 'var(--color-forest-dark)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2rem',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'all' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      >
        {links.map(link => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '1rem',
              color: 'var(--color-parchment)',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '1rem 2rem',
              border: '3px solid var(--color-forest-light)',
              width: '200px',
              textAlign: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brass)'; e.currentTarget.style.color = 'var(--color-brass)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-forest-light)'; e.currentTarget.style.color = 'var(--color-parchment)'; }}
          >
            <span style={{ fontSize: '2rem' }}>{link.icon}</span>
            {link.label}
          </a>
        ))}
        <button
          onClick={() => { setMenuOpen(false); triggerArcade(); }}
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '1rem',
            color: 'var(--color-parchment)',
            background: 'none',
            border: '3px solid var(--color-forest-light)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '1rem 2rem',
            width: '200px',
            textAlign: 'center',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-brass)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-brass)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-forest-light)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-parchment)'; }}
        >
          <span style={{ fontSize: '2rem' }}>🕹️</span>
          Arcade
        </button>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .rpg-nav-links { display: none !important; }
          .rpg-hamburger { display: block !important; }
        }
      `}</style>
    </>
  );
}
