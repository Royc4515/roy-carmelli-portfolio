# Roy Runner scoreboard - setup

Google sign-in, a saved personal best per player and a public top 10. Everything runs on
Vercel: three Vercel Functions in `api/` and a Neon Postgres store from the Vercel
Marketplace. With no env vars the feature switches itself off and the game keeps a personal
best in `localStorage` only, so previews and forks need nothing.

## How it works

- **Sign-in:** Google's own "Sign in with Google" button (Google Identity Services, loaded
  only when a signed-out player opens the leaderboard) hands the page a Google ID token.
  `POST /api/session` verifies it (Google's signature, issuer, expiry, and that it was issued
  to this site's client ID) and sets our own session cookie: `__Host-` prefixed, HttpOnly,
  Secure, SameSite=Lax, a 30-day HS256 JWT. No Google token is stored anywhere.
- **Runs:** `POST /api/runs {action:"start"}` stamps the run start with the database clock;
  `{action:"submit", score}` closes it and rejects a score higher than the elapsed time allows
  (8 points/s, plus 5% and 3s of slack). One submit per run, so replays fail.
- **Board:** `GET /api/leaderboard` returns the top 10 plus the caller's own row. Names are
  "First L." with invisible and bidi-override characters stripped. No e-mail, avatar or
  Google id is returned, and only the name and best score are stored.
- **Writes** must come from the site's own origin (checked on every POST/DELETE) and be JSON.
- **Schema:** created by the API on its first request (`create table if not exists`), so
  there is no migration to run by hand. See `api/_lib/store.ts`.
- **Limits:** a browser game cannot be made cheat-proof. The time check stops forged scores
  sent straight to the API (a fake 999999 would need ~35 hours), not a patched client that
  plays slowly. To remove a row, in Neon's SQL editor:
  `delete from runner_scores where display_name = '...';`

## One-time setup

1. **Google OAuth client** ([Google Auth Platform](https://console.cloud.google.com/auth/overview)).
   - Branding: app name, support e-mail. Audience: External.
   - Data Access: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` only
     (non-sensitive, so no Google verification needed).
   - Audience: **Publish app**. While it says "Testing", only listed test users can sign in
     and everyone else gets "Access blocked".
   - Clients -> Create client -> Web application. Authorized JavaScript origins (no
     wildcards allowed, so each origin is listed):
     - `https://roy-carmelli-portfolio.vercel.app`
     - the PR's preview origin, to test before merging:
       `https://roy-carmelli-portfolio-git-claude-fun-158abb-royc4515s-projects.vercel.app`
     - `http://localhost` and `http://localhost:3000` for `vercel dev`
   - No redirect URI is needed (the button uses a popup, not a redirect).
   - Only the Client ID is used. The client secret is never needed; don't put it anywhere.
2. **Neon store.** Vercel project -> Storage -> Create Database -> Neon. Region: Frankfurt
   (`aws-eu-central-1`), next to the functions (`vercel.json` pins them to `fra1`). Connect it
   to the project for Production and Preview. This adds `DATABASE_URL`.
3. **Env vars** (Vercel project -> Settings -> Environment Variables, Production + Preview):
   - `VITE_GOOGLE_CLIENT_ID` = the Client ID from step 1
   - `SESSION_SECRET` = 32+ random characters (`openssl rand -base64 32`)
4. **Redeploy** so Vite bakes in `VITE_GOOGLE_CLIENT_ID`.

## Local development

`npm run dev` (Vite) has no `/api`, so the scoreboard calls fail there and the game falls
back to signed-out play. To run the functions locally: `vercel link`, `vercel env pull`,
then `vercel dev` (port 3000).

## Screenshots

Taken against a mocked API with Google's real button (`docs/leaderboard/*.png`): desktop
signed out and signed in, a phone in landscape (trophy in the left rail), a tablet in
portrait (trophy in the top bar), and the game-over screen with "NEW BEST!".
