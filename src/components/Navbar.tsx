import { useState, useEffect } from 'react';

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

export default function Navbar() {
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
          background: '#2d4a1e',
          borderBottom: scrolled ? '3px solid #c9a24a' : '3px solid #4a6b2e',
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
                    color: '#e8d8a8',
                    letterSpacing: '0.05em',
                    transition: 'color 0.15s, background 0.15s',
                    borderRight: '1px solid #4a6b2e',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(201,162,74,0.15)';
                    e.currentTarget.style.color = '#c9a24a';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#e8d8a8';
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
                  borderRight: '1px solid #4a6b2e',
                  cursor: 'pointer',
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: '0.5rem',
                  color: '#e8d8a8',
                  letterSpacing: '0.05em',
                  transition: 'color 0.15s, background 0.15s',
                  height: '60px',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(201,162,74,0.15)';
                  (e.currentTarget as HTMLElement).style.color = '#c9a24a';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#e8d8a8';
                }}
              >
                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🕹️</span>
                Arcade
              </button>
            </li>
          </ul>

          {/* Right side: face avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/assets/sprites/face-small.png"
              alt="Roy Carmelli"
              style={{
                height: '48px',
                width: 'auto',
                imageRendering: 'pixelated',
                borderRadius: 0,
                border: '2px solid #c9a24a',
                background: '#1a2e10',
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
                border: '2px solid #c9a24a',
                cursor: 'pointer',
                padding: '6px 10px',
                color: '#e8d8a8',
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
          background: '#1a2e10',
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
              color: '#e8d8a8',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '1rem 2rem',
              border: '3px solid #4a6b2e',
              width: '200px',
              textAlign: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a24a'; e.currentTarget.style.color = '#c9a24a'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#4a6b2e'; e.currentTarget.style.color = '#e8d8a8'; }}
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
            color: '#e8d8a8',
            background: 'none',
            border: '3px solid #4a6b2e',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '1rem 2rem',
            width: '200px',
            textAlign: 'center',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#c9a24a'; (e.currentTarget as HTMLElement).style.color = '#c9a24a'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#4a6b2e'; (e.currentTarget as HTMLElement).style.color = '#e8d8a8'; }}
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
