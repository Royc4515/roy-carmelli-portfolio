type EnvLike = Partial<Record<'VITE_GOOGLE_CLIENT_ID', string | undefined>>;

/**
 * The Google OAuth client ID baked into the build, or `null`. It is public by design (Google
 * shows it in the sign-in popup); the server checks every token was issued to it. Without it
 * the scoreboard is off and the game keeps a best on this device only, so previews and forks
 * need nothing.
 */
export function googleClientId(env: EnvLike = import.meta.env): string | null {
  return env.VITE_GOOGLE_CLIENT_ID?.trim() || null;
}

export function isScoreboardConfigured(): boolean {
  return googleClientId() !== null;
}
