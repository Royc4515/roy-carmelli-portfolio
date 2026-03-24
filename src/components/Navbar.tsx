import { useState, useEffect } from 'react';
import { NavLink } from '../types';

const links: NavLink[] = [
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 2rem',
      height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: scrolled ? 'rgba(9,9,15,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      transition: 'all 0.3s ease',
    }}>
      <a href="#hero" style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        color: 'var(--accent)',
        textDecoration: 'none',
        letterSpacing: '0.05em',
      }}>
        rc<span style={{ color: 'var(--text-muted)' }}>.dev</span>
      </a>
      <ul style={{ display: 'flex', gap: '2rem', listStyle: 'none' }}>
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
      </ul>
    </nav>
  );
}
