import { motion } from 'framer-motion';
import { Mail, Github, Linkedin, Facebook, Phone } from 'lucide-react';
import { bio } from '../data/bio';

export default function Contact() {
  return (
    <motion.section
      id="contact"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ padding: '6rem 2rem 10rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}
    >
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: '1rem' }}>03. contact</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Let's Talk</h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '3rem', fontSize: '1rem' }}>
        I'm open to internships, research collaborations, and interesting projects at the intersection of CS and neuroscience.
      </p>
      <a href={`mailto:${bio.email}`} style={{
        display: 'inline-block',
        padding: '0.9rem 2.5rem',
        border: '1px solid var(--accent)',
        color: 'var(--accent)',
        borderRadius: '4px',
        textDecoration: 'none',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.9rem',
        letterSpacing: '0.05em',
        transition: 'all 0.2s',
        marginBottom: '3rem',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-dim)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {bio.email}
      </a>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        {[
          { href: bio.github, icon: <Github width={18} height={18} />, label: 'GitHub' },
          { href: bio.linkedin, icon: <Linkedin width={18} height={18} />, label: 'LinkedIn' },
          { href: bio.facebook, icon: <Facebook width={18} height={18} />, label: 'Facebook' },
          { href: `mailto:${bio.email}`, icon: <Mail width={18} height={18} />, label: 'Email' },
          { href: `tel:${bio.phone}`, icon: <Phone width={18} height={18} />, label: 'Phone' },
        ].map(({ href, icon, label }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noreferrer' : undefined}
            aria-label={label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {icon}
          </a>
        ))}
      </div>
    </motion.section>
  );
}
