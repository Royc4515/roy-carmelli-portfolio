import { useEffect, useState } from 'react';
import { SPRITES, FRAME_INTERVALS } from '../theme/tokens';

type Pose = 'walk' | 'wave' | 'sit' | 'idle';

interface CharacterProps {
  pose: Pose;
  scale?: number;
  flip?: boolean;
  className?: string;
  ariaLabel?: string;
}

export default function Character({
  pose,
  scale = 1,
  flip = false,
  className = '',
  ariaLabel = 'Roy pixel character',
}: CharacterProps) {
  const frames = SPRITES[pose];
  const [frameIndex, setFrameIndex] = useState(0);
  const interval = FRAME_INTERVALS[pose];

  useEffect(() => {
    if (frames.length <= 1 || interval === 0) return;
    const id = setInterval(() => {
      setFrameIndex(i => (i + 1) % frames.length);
    }, interval);
    return () => clearInterval(id);
  }, [pose, frames.length, interval]);

  const src = frames[frameIndex % frames.length];

  return (
    <div
      className={className}
      style={{
        transform: `scale(${scale}) scaleX(${flip ? -1 : 1})`,
        transformOrigin: 'bottom center',
        display: 'inline-block',
        filter: 'drop-shadow(4px 6px 0px rgba(0,0,0,0.5))',
      }}
    >
      <img
        src={src}
        alt={ariaLabel}
        style={{
          height: '180px',
          width: 'auto',
          imageRendering: 'pixelated',
          display: 'block',
        }}
        draggable={false}
      />
    </div>
  );
}
