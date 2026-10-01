import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import PixelPanel from '../PixelPanel';
import PixelIcon from '../PixelIcon';
import { Button } from '../ui/Button';
import type { RunnerScores } from '../../hooks/useRunnerScores';
import './Scoreboard.css';

export interface ScoreboardProps {
  scores: RunnerScores;
  onClose: () => void;
}

const pad = (n: number) => String(n).padStart(6, '0');

/**
 * The leaderboard and Google sign-in, as a dialog over the game screen. It sits inside the
 * game's wrapper (not a portal) because in native fullscreen only that wrapper is shown.
 *
 * Every key pressed inside it stops here: the game listens on `window`, and Space on a
 * focused button must not also jump, nor Esc quit the whole game instead of this dialog.
 */
export default function Scoreboard({ scores, onClose }: ScoreboardProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const { status, player, best, leaderboard, leaderboardError, saveError, signInError } = scores;
  const { refreshLeaderboard } = scores;

  // Fresh rows on every open; focus moves in so keyboard and screen-reader users land here.
  useEffect(() => {
    refreshLeaderboard();
    panelRef.current?.focus();
  }, [refreshLeaderboard]);

  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    // A click on the dimmed backdrop (not the panel) closes it, like Esc.
    <div className="scoreboard" onKeyDown={onKeyDown} onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="scoreboard__dialog outline-none"
      >
      <PixelPanel variant="wood" elevation={2} padding="sm">
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="flex items-center gap-2 text-label text-accent-fg">
            <PixelIcon name="trophy" size={12} />
            Leaderboard
          </h2>
          <Button variant="icon" aria-label="Close leaderboard" onClick={onClose}>
            <PixelIcon name="close" size={24} />
          </Button>
        </div>

        <div className="mt-3" aria-live="polite">
          {leaderboardError ? (
            <p className="text-body-s text-fg">
              Couldn't load the leaderboard.{' '}
              <button type="button" className="underline" onClick={refreshLeaderboard}>
                Try again
              </button>
            </p>
          ) : leaderboard === null ? (
            <p className="text-body-s text-fg-muted">Loading...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-body-s text-fg">No scores yet. Be the first on the board.</p>
          ) : (
            <ol role="list" className="scoreboard__list" aria-label="Top scores">
              {leaderboard.map((row, i) => (
                <li
                  // Ties share a rank and names repeat ("Roy C."); the order itself is stable.
                  key={i}
                  className="scoreboard__row"
                  data-me={row.isMe || undefined}
                  aria-current={row.isMe || undefined}
                >
                  <span className="scoreboard__rank text-hud">{row.rank}</span>
                  {/* Google names can be Hebrew or Arabic: isolate them so an RTL name never
                      reorders the rank or score around it. */}
                  <span className="scoreboard__name text-body-s">
                    <bdi>{row.name}</bdi>
                    {row.isMe && <span className="text-fg-muted"> (you)</span>}
                  </span>
                  <span className="scoreboard__score text-hud">{pad(row.score)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="px-divider mt-4" />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {status === 'loading' ? (
            <p className="text-body-s text-fg-muted">Checking sign-in...</p>
          ) : player ? (
            <>
              <p className="text-body-s text-fg">
                Signed in as <bdi>{player.firstName}</bdi>. Your best: <span className="text-hud">{pad(best)}</span>
              </p>
              <Button variant="secondary" size="sm" onClick={scores.signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <p className="text-body-s text-fg">
                Sign in to save your best and join the board. Only your first name and last initial are shown.
              </p>
              <Button size="sm" onClick={scores.signIn}>
                Sign in with Google
              </Button>
            </>
          )}
        </div>

        {(saveError || signInError) && (
          <p role="alert" className="mt-3 text-body-s text-hp">
            {signInError ? "Couldn't reach Google sign-in. Try again in a moment." : "Your last run wasn't saved online."}
          </p>
        )}
      </PixelPanel>
      </div>
    </div>
  );
}
