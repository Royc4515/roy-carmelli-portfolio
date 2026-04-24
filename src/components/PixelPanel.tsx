import type { ReactNode } from 'react';

type Variant = 'parchment' | 'wood' | 'dark';

interface PixelPanelProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const styles: Record<Variant, React.CSSProperties> = {
  parchment: {
    background: 'rgba(232, 216, 168, 0.92)',
    color: 'var(--color-wood-dark)',
    boxShadow: '0 -4px 0 0 var(--color-brass), 0 4px 0 0 var(--color-brass), -4px 0 0 0 var(--color-brass), 4px 0 0 0 var(--color-brass), inset 0 0 0 2px rgba(0,0,0,0.1)',
  },
  wood: {
    background: 'rgba(58, 40, 24, 0.92)',
    color: 'var(--color-parchment)',
    boxShadow: '0 -4px 0 0 var(--color-brass), 0 4px 0 0 var(--color-brass), -4px 0 0 0 var(--color-brass), 4px 0 0 0 var(--color-brass)',
  },
  dark: {
    background: 'rgba(26, 46, 16, 0.92)',
    color: 'var(--color-parchment)',
    boxShadow: '0 -4px 0 0 var(--color-forest-light), 0 4px 0 0 var(--color-forest-light), -4px 0 0 0 var(--color-forest-light), 4px 0 0 0 var(--color-forest-light)',
  },
};

export default function PixelPanel({ variant = 'wood', children, className = '' }: PixelPanelProps) {
  return (
    <div
      className={className}
      style={{
        ...styles[variant],
        padding: '1.5rem',
        borderRadius: 0,
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
}
