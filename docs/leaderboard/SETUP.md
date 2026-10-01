# Roy Runner scoreboard - setup

Google sign-in, a saved personal best per player and a public top 10, backed by Supabase
(Auth + Postgres). Without the two env vars below the feature switches itself off and the
game keeps a personal best in `localStorage` only, so previews and forks need nothing.

## How it works

- **Client:** `src/lib/supabase.ts` (lazy client), `src/lib/runnerScores.ts` (`ScoreService`),
  `src/hooks/useRunnerScores.ts`, `src/components/MiniGame/Scoreboard.tsx` (the dialog).
  supabase-js is its own chunk and loads only with the game or on the way back from Google.
- **Server:** `supabase/migrations/20261001000000_runner_scores.sql`. Both tables have RLS
  on and no policies, so the browser cannot read or write them directly. Everything goes
  through four `SECURITY DEFINER` functions:
  - `start_runner_run()` - records when the run started (signed-in only).
  - `submit_runner_score(p_score)` - closes the run, rejects a score higher than the time
    that really passed allows (8 points/s, +5% and 3s slack), keeps the higher best.
  - `runner_leaderboard(p_limit)` - top N plus the caller's own row; no ids or e-mails.
  - `my_runner_best()` - the caller's best.
- **Privacy:** the board shows "First L." derived from the Google profile name. E-mail and
  avatar are never stored in these tables.
- **Limits:** a browser game cannot be made cheat-proof. The time check stops forged scores
  sent straight to the API (a fake 999999 would need ~35 hours of waiting), not a patched
  client that plays slowly. If someone abuses it, delete their row:
  `delete from public.runner_scores where display_name = '...';`

## One-time setup

1. **Supabase project.** Create one (free tier is fine), or reuse an existing one.
2. **Schema.** Run the migration: SQL editor -> paste the file, or `supabase db push`.
3. **Google OAuth client.** Google Cloud Console -> APIs & Services -> Credentials ->
   Create OAuth client ID (Web application).
   - Authorized JavaScript origins: `https://roy-carmelli-portfolio.vercel.app`,
     `http://localhost:5173`
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - OAuth consent screen: app name, support e-mail, scopes `openid`, `email`, `profile`
     only (no verification needed for these).
4. **Supabase Auth.** Authentication -> Sign In / Providers -> Google: enable, paste the
   client ID and secret.
   Authentication -> URL Configuration:
   - Site URL: `https://roy-carmelli-portfolio.vercel.app`
   - Redirect URLs: `https://roy-carmelli-portfolio.vercel.app/**`,
     `http://localhost:5173/**` (add the Vercel preview pattern if you want previews too).
5. **Env vars.** In Vercel (Production, and Preview if wanted) and in a local `.env.local`:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Project Settings -> API: the URL and the
   publishable/anon key, never the service-role key). Redeploy so Vite inlines them.

## Screenshots

Taken against a mocked backend (`docs/leaderboard/*.png`): the desktop dialog, a phone in
landscape (trophy in the left rail), a tablet in portrait (trophy in the top bar), and the
game-over screen with "NEW BEST!".
