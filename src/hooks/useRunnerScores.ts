import { useCallback, useEffect, useRef, useState } from 'react';
import { isScoreboardConfigured } from '../lib/scoreboardConfig';
import {
  ScoreApi,
  readLocalBest,
  saveLocalBest,
  type LeaderboardEntry,
  type Player,
  type SessionState,
} from '../lib/runnerScores';

export type ScoreboardStatus =
  /** No Google client ID in the build: local best only, no sign-in, no leaderboard. */
  | 'offline'
  /** Asking the server who is signed in. */
  | 'loading'
  | 'ready';

export interface RunnerScores {
  status: ScoreboardStatus;
  player: Player | null;
  /** Signed in: the server's best (raised at once on a better run). Signed out: this device's. */
  best: number;
  leaderboard: LeaderboardEntry[] | null;
  leaderboardError: boolean;
  /** Set when the last finished run could not be saved online. */
  saveError: boolean;
  /** Set when Google's token was refused or the session could not be created. */
  signInError: boolean;
  /** Hand it the credential from the Sign in with Google button. */
  signIn: (credential: string) => void;
  signOut: () => void;
  refreshLeaderboard: () => void;
  /** Wire to the engine: a run has begun. */
  onRunStart: () => void;
  /** Wire to the engine: a run ended with `score`. */
  onGameOver: (score: number) => void;
}

/**
 * Personal bests and the leaderboard for Roy Runner. Signed out (or with no scoreboard in this
 * build) the best lives in localStorage; signed in it lives on the server, and each run is
 * opened (`startRun`) and closed (`submit`) there so the server can sanity-check its score.
 */
export function useRunnerScores(api: ScoreApi = defaultApi): RunnerScores {
  const enabled = isScoreboardConfigured();
  const [status, setStatus] = useState<ScoreboardStatus>(enabled ? 'loading' : 'offline');
  const [player, setPlayer] = useState<Player | null>(null);
  const [localBest, setLocalBest] = useState(readLocalBest);
  const [serverBest, setServerBest] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [signInError, setSignInError] = useState(false);

  // The open run's start request: submit waits on it, so a run shorter than the round trip
  // still closes the run it opened. `null` = no run open on the server.
  const runRef = useRef<Promise<boolean> | null>(null);
  const playerRef = useRef(player);
  playerRef.current = player;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refreshLeaderboard = useCallback(() => {
    if (!enabled) return;
    api.leaderboard().then(
      rows => {
        if (!alive.current) return;
        setLeaderboard(rows);
        setLeaderboardError(false);
      },
      () => alive.current && setLeaderboardError(true),
    );
  }, [api, enabled]);

  const applySession = useCallback(
    (s: SessionState) => {
      if (!alive.current) return;
      runRef.current = null; // a run opened under another account is not this one's
      setPlayer(s.player);
      setServerBest(s.best);
      refreshLeaderboard(); // re-marks "(you)"
    },
    [refreshLeaderboard],
  );

  useEffect(() => {
    if (!enabled) return;
    api
      .session()
      .then(applySession, () => {
        /* server unreachable: play on signed out */
      })
      .finally(() => alive.current && setStatus('ready'));
  }, [api, enabled, applySession]);

  const onRunStart = useCallback(() => {
    setSaveError(false);
    runRef.current = playerRef.current
      ? api.startRun().then(
          () => true,
          () => false,
        )
      : null;
  }, [api]);

  const onGameOver = useCallback(
    (score: number) => {
      setLocalBest(saveLocalBest(score));
      const run = runRef.current;
      runRef.current = null;
      if (!run || !playerRef.current) return;

      setServerBest(b => Math.max(b, Math.floor(score)));
      run
        .then(opened => {
          if (!opened) throw new Error('run was never opened');
          return api.submit(score);
        })
        .then(best => {
          if (!alive.current) return;
          setServerBest(best);
          refreshLeaderboard();
        })
        .catch(() => alive.current && setSaveError(true));
    },
    [api, refreshLeaderboard],
  );

  const signIn = useCallback(
    (credential: string) => {
      setSignInError(false);
      api.signIn(credential).then(applySession, () => alive.current && setSignInError(true));
    },
    [api, applySession],
  );

  const signOut = useCallback(() => {
    runRef.current = null;
    // Stop Google from silently picking this account again on the next visit.
    window.google?.accounts?.id?.disableAutoSelect();
    api.signOut().then(
      () => applySession({ player: null, best: 0 }),
      () => {},
    );
  }, [api, applySession]);

  return {
    status,
    player,
    best: player ? serverBest : localBest,
    leaderboard,
    leaderboardError,
    saveError,
    signInError,
    signIn,
    signOut,
    refreshLeaderboard,
    onRunStart,
    onGameOver,
  };
}

const defaultApi = new ScoreApi();
