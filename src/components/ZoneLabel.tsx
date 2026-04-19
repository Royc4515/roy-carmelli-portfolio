interface ZoneLabelProps {
  lines: string[];
  align?: 'left' | 'right';
}

export default function ZoneLabel({ lines, align = 'left' }: ZoneLabelProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        textAlign: align,
      }}
    >
      {lines.map((line, i) => (
        <span
          key={i}
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: i === 0 ? '1.1rem' : '0.7rem',
            color: i === 0 ? '#e8d8a8' : '#c9b87a',
            textShadow: '2px 2px 0 #1a2e10, -1px -1px 0 rgba(0,0,0,0.5)',
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
