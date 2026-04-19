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
    color: '#3a2818',
    boxShadow: '0 -4px 0 0 #c9a24a, 0 4px 0 0 #c9a24a, -4px 0 0 0 #c9a24a, 4px 0 0 0 #c9a24a, inset 0 0 0 2px rgba(0,0,0,0.1)',
  },
  wood: {
    background: 'rgba(58, 40, 24, 0.92)',
    color: '#e8d8a8',
    boxShadow: '0 -4px 0 0 #c9a24a, 0 4px 0 0 #c9a24a, -4px 0 0 0 #c9a24a, 4px 0 0 0 #c9a24a',
  },
  dark: {
    background: 'rgba(26, 46, 16, 0.92)',
    color: '#e8d8a8',
    boxShadow: '0 -4px 0 0 #4a6b2e, 0 4px 0 0 #4a6b2e, -4px 0 0 0 #4a6b2e, 4px 0 0 0 #4a6b2e',
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
