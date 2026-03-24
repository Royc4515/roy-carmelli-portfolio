import { useState, useEffect } from 'react';
import { NavLink } from '../types';

interface NavbarProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

const links: NavLink[] = [
  { label: 'About',    href: '#about'    },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact',  href: '#contact'  },
];

export default function Navbar({ theme, onThemeToggle }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 2rem',
        height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled || menuOpen
          ? 'color-mix(in srgb, var(--bg-primary) 95%, transparent)'
          : 'transparent',
        backdropFilter: scrolled || menuOpen ? 'blur(12px)' : 'none',
        borderBottom: scrolled && !menuOpen ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}>
        {/* Logo */}
        <a href="#hero" style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          color: 'var(--accent)',
          textDecoration: 'none',
          letterSpacing: '0.05em',
          zIndex: 101,
        }}>
          rc<span style={{ color: 'var(--text-muted)' }}>.dev</span>
        </a>

        {/* Desktop links */}
        <ul className="desktop-nav" style={{ display: 'flex', gap: '2rem', listStyle: 'none', alignItems: 'center' }}>
          {links.map(link => (
            <li key={link.href}>
              <a href={link.href} style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'color 0.2s',
                letterSpacing: '0.02em',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <button
              onClick={onThemeToggle}
              aria-label="Toggle theme"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '4px 10px',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                lineHeight: 1,
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </li>
        </ul>

        {/* Hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Toggle menu"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            zIndex: 101,
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          <span style={{
            display: 'block', width: '22px', height: '1.5px',
            background: menuOpen ? 'var(--accent)' : 'var(--text-secondary)',
            borderRadius: '1px',
            transition: 'transform 0.3s, background 0.3s',
            transform: menuOpen ? 'translateY(6.5px) rotate(45deg)' : 'none',
          }} />
          <span style={{
            display: 'block', width: '22px', height: '1.5px',
            background: menuOpen ? 'var(--accent)' : 'var(--text-secondary)',
            borderRadius: '1px',
            transition: 'opacity 0.3s, background 0.3s',
            opacity: menuOpen ? 0 : 1,
          }} />
          <span style={{
            display: 'block', width: '22px', height: '1.5px',
            background: menuOpen ? 'var(--accent)' : 'var(--text-secondary)',
            borderRadius: '1px',
            transition: 'transform 0.3s, background 0.3s',
            transform: menuOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
          }} />
        </button>
      </nav>

      {/* Fullscreen overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99,
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2.5rem',
        opacity: menuOpen ? 1 : 0,
        pointerEvents: menuOpen ? 'all' : 'none',
        transition: 'opacity 0.3s ease',
      }}>
        {links.map((link, i) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 8vw, 3.5rem)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontStyle: 'italic',
              letterSpacing: '-0.02em',
              transition: `color 0.2s, transform 0.3s ${i * 0.05}s, opacity 0.3s ${i * 0.05}s`,
              transform: menuOpen ? 'translateY(0)' : 'translateY(10px)',
              opacity: menuOpen ? 1 : 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          >
            {link.label}
          </a>
        ))}

        <a
          href="mailto:royc4515@gmail.com"
          style={{
            position: 'absolute',
            bottom: '3rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            letterSpacing: '0.05em',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          royc4515@gmail.com
        </a>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
