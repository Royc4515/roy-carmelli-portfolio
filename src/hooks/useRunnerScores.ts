import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import {
  ScoreService,
  readLocalBest,
  saveLocalBest,
  type LeaderboardEntry,
  type Player,
} from '../lib/runnerScores';

export type ScoreboardStatus =
  /** No Supabase env vars: local best only, no sign-in, no leaderboard. */
  | 'offline'
  /** Client still loading / restoring the session. */
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
  /** Set when the redirect to Google could not start. */
  signInError: boolean;
  signIn: () => void;
  signOut: () => void;
  refreshLeaderboard: () => void;
  /** Wire to the engine: a run has begun. */
  onRunStart: () => void;
  /** Wire to the engine: a run ended with `score`. */
  onGameOver: (score: number) => void;
}

/**
 * Personal bests and the leaderboard for Roy Runner. Signed out (or with no backend
 * configured) the best lives in localStorage; signed in it lives on the server, and each run
 * is opened (`startRun`) and closed (`submit`) there so the server can sanity-check its score.
 */
export function useRunnerScores(): RunnerScores {
  const [service, setService] = useState<ScoreService | null>(null);
  const [status, setStatus] = useState<ScoreboardStatus>('loading');
  const [player, setPlayer] = useState<Player | null>(null);
  const [localBest, setLocalBest] = useState(readLocalBest);
  const [serverBest, setServerBest] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [signInError, setSignInError] = useState(false);

  // The open run's startRun call: submit waits on it, so a run shorter than the round trip
  // still closes the run it opened. `null` = no run open on the server.
  const runRef = useRef<Promise<boolean> | null>(null);
  const serviceRef = useRef(service);
  serviceRef.current = service;
  const playerRef = useRef(player);
  playerRef.current = player;

  useEffect(() => {
    let alive = true;
    let unsubscribe = () => {};
    getSupabase().then(async client => {
      if (!alive) return;
      if (!client) {
        setStatus('offline');
        return;
      }
      const svc = new ScoreService(client);
      setService(svc);
      unsubscribe = svc.onPlayerChange(p => {
        if (!alive) return;
        setPlayer(p);
        runRef.current = null; // a run opened under another account is not this one's
      });
      try {
        const p = await svc.getPlayer();
        if (alive) setPlayer(p);
      } catch {
        /* treat as signed out */
      }
      if (alive) setStatus('ready');
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const refreshLeaderboard = useCallback(() => {
    const svc = serviceRef.current;
    if (!svc) return;
    svc.leaderboard().then(
      rows => {
        setLeaderboard(rows);
        setLeaderboardError(false);
      },
      () => setLeaderboardError(true),
    );
  }, []);

  // The signed-in player's best, and a leaderboard that marks their row, on every account change.
  useEffect(() => {
    if (!service) return;
    let alive = true;
    setServerBest(0);
    if (player) {
      service.myBest().then(
        b => alive && setServerBest(b),
        () => {},
      );
    }
    refreshLeaderboard();
    return () => {
      alive = false;
    };
  }, [service, player, refreshLeaderboard]);

  const onRunStart = useCallback(() => {
    setSaveError(false);
    const svc = serviceRef.current;
    runRef.current =
      svc && playerRef.current
        ? svc.startRun().then(
            () => true,
            () => false,
          )
        : null;
  }, []);

  const onGameOver = useCallback(
    (score: number) => {
      setLocalBest(saveLocalBest(score));
      const svc = serviceRef.current;
      const run = runRef.current;
      runRef.current = null;
      if (!svc || !run || !playerRef.current) return;

      setServerBest(b => Math.max(b, Math.floor(score)));
      run
        .then(opened => {
          if (!opened) throw new Error('run was never opened');
          return svc.submit(score);
        })
        .then(best => {
          setServerBest(best);
          refreshLeaderboard();
        })
        .catch(() => setSaveError(true));
    },
    [refreshLeaderboard],
  );

  const signIn = useCallback(() => {
    setSignInError(false);
    serviceRef.current?.signInWithGoogle().catch(() => setSignInError(true));
  }, []);

  const signOut = useCallback(() => {
    runRef.current = null;
    serviceRef.current?.signOut().catch(() => {});
  }, []);

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
