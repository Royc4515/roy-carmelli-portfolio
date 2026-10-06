/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Google OAuth client ID for the Roy Runner scoreboard. Optional: unset turns the scoreboard
   * off. Public by design; the /api functions read the same var to check tokens' audience.
   */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** "true" shows the Pixel Roy chat launcher (the API also needs GROQ_API_KEY, see docs/chat/SETUP.md). */
  readonly VITE_CHAT_ENABLED?: string;
}
