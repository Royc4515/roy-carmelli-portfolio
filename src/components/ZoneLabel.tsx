import PixelIcon, { type PixelIconName } from './PixelIcon';

interface ZoneLabelProps {
  lines: string[];
  align?: 'left' | 'right';
  /** PixelIcon name shown above the label at 48px. */
  icon?: PixelIconName;
}

export default function ZoneLabel({ lines, align = 'left', icon }: ZoneLabelProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        textAlign: align,
        alignItems: align === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      {icon && (
        <PixelIcon name={icon} size={48} className="text-[var(--color-brass)]" />
      )}
      {lines.map((line, i) => (
        <span
          key={i}
          style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: i === 0 ? '1.1rem' : '0.7rem',
            color: i === 0 ? 'var(--color-parchment)' : 'var(--color-parchment-dark)',
            textShadow: '2px 2px 0 var(--color-forest-dark), -1px -1px 0 rgba(0,0,0,0.5)',
            letterSpacing: '0.08em',
            lineHeight: 1.6,
          }}
        >
          {line}
        </span>
      ))}
    </div>
  );
}
