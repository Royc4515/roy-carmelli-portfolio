import PixelPanel from './PixelPanel';
import PixelIcon from './PixelIcon';
import { Button } from './ui/Button';

export interface GameLoadFailedProps {
  /** Leaves the game exactly like its own Quit. */
  onQuit?: () => void;
  /** Loads the page again (default: `location.reload()`). */
  onReload?: () => void;
}

function reloadPage() {
  window.location.reload();
}

/**
 * Shown in place of Roy Runner when its lazily loaded code cannot be fetched (offline, a flaky
 * network, or a tab left open across a redeploy that removed the old chunk), so the page never
 * goes blank. Its retry reloads the page: browsers remember a failed module fetch for the page's
 * lifetime (a second `import()` fails without a request) and a redeploy needs the new page
 * anyway. It carries its own Quit because touch play has no other; Hero hides its desktop
 * controls row while this is on screen.
 */
export default function GameLoadFailed({ onQuit, onReload = reloadPage }: GameLoadFailedProps) {
  return (
    <PixelPanel
      variant="wood"
      elevation={2}
      padding="md"
      className="w-full max-w-[400px]"
      data-game-load-failed=""
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-label text-accent-fg">Arcade offline</p>
        <p role="alert" className="max-w-[32ch] text-body text-fg">
          {"Couldn't load the game. Check your connection and try again."}
        </p>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-6">
          <Button onClick={onReload} leadingIcon={<PixelIcon name="play" size={12} />}>
            Reload
          </Button>
          {onQuit && (
            <Button variant="secondary" onClick={onQuit} leadingIcon={<PixelIcon name="close" size={12} />}>
              Quit
            </Button>
          )}
        </div>
      </div>
    </PixelPanel>
  );
}
