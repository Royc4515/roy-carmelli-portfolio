/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Google OAuth client ID for the Roy Runner scoreboard. Optional: unset turns the scoreboard
   * off. Public by design; the /api functions read the same var to check tokens' audience.
   */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
