import type { MouseEvent } from 'react';
import PixelIcon from './PixelIcon';
import { Button } from './ui/Button';
import { useRunnerMuted } from '../hooks/useRunnerMuted';
import { toggleRunnerMuted } from '../lib/runnerSound';

interface SoundToggleProps {
  /** The square icon button of the touch controls, instead of the labelled desktop one. */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Roy Runner's mute switch. The icon shows the current state (speaker with waves, or crossed
 * out) and the label names the action, like a media player's volume button.
 */
export default function SoundToggle({ iconOnly = false, className }: SoundToggleProps) {
  const muted = useRunnerMuted();
  const icon = muted ? 'sound-off' : 'sound';
  // A mouse click drops focus again: left on the button, the next Space (the jump key) would
  // press it and unmute mid-run instead of jumping. Keyboard users (detail 0) keep focus.
  const toggle = (e: MouseEvent<HTMLElement>) => {
    toggleRunnerMuted();
    if (e.detail > 0) e.currentTarget.blur();
  };

  if (iconOnly) {
    return (
      <Button
        variant="icon"
        aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        className={className}
        onClick={toggle}
      >
        <PixelIcon name={icon} size={24} />
      </Button>
    );
  }
  return (
    <Button
      variant="secondary"
      className={className}
      onClick={toggle}
      leadingIcon={<PixelIcon name={icon} size={12} />}
    >
      {muted ? 'Unmute' : 'Mute'}
    </Button>
  );
}
