# Pixel Roy chat: setup and safety

Pixel Roy is an AI version of Roy that answers visitors' questions in a floating chat. It knows only what this site, Roy's allowlisted public GitHub repos and his LinkedIn say, and it runs entirely on free tiers.

## How it works

```
browser (ChatLauncher -> lazy ChatPanel -> useChat -> ChatApi)
   | POST /api/chat { messages: last 12 turns }
   v
api/chat.ts
   1. validate        same-origin, JSON <= 32KB, 1-12 user/assistant turns, <= 500 chars per question
   2. rate limit      15 messages per visitor per day, 150 per site per day (Neon, hashed IP)
   3. input guard     Llama Prompt Guard 2 (Groq) blocks jailbreak attempts with a canned reply
   4. retrieve        BM25 over the knowledge chunks: top 3 facts for this question
   5. model chain     openai/gpt-oss-120b, then openai/gpt-oss-20b (strict JSON output)
   6. output hooks    canary leak, phone/email, link allowlist, sources, style (dashes, markdown, wording)
   v
{ reply, sources: [{ title, url }] }
```

- **Knowledge** is compiled from `src/data/bio.ts`, `src/data/projects.ts`, `src/data/linkedin.ts` and `src/data/github.generated.json` by `src/lib/chatKnowledge.ts`, and written to `api/_lib/chat/knowledge.generated.ts` by its test (the server cannot import `src/`). The phone number and the city are never in it.
- **Persona and rules** are in `api/_lib/chat/prompt.ts`. **UI copy** is in `src/data/chatPersona.ts`.
- **Design** rules are in `docs/redesign/SPEC.md` §3 "Chat (Pixel Roy)"; before/after screenshots in `docs/chat/design/`. Both themes and the edge states render in the dev gallery (`/?gallery`, block "Chat · Pixel Roy").
- **Nothing is stored** about a conversation. The only table, `chat_usage`, holds a salted hash per visitor per day and a daily total, and prunes itself.

## Why it cannot cost money

- **Groq free tier, no card.** Over a limit, Groq answers 429; it has no way to bill an account without a payment method. Never add billing to this Groq account.
- **Per-minute limit.** Each model also has a per-minute token budget (about 3 questions). When both are spent, the server waits once if Groq says it is a few seconds, then answers `busy` and the panel asks the visitor to try again in a minute. This never costs money; it only delays.
- **Own caps below Groq's.** 150 messages a day site-wide, about 2.5K tokens each, stays under the two models' free daily token limits (200K each at the time of writing), so visitors rarely see Groq's own 429.
- **Vercel Hobby and Neon free** have no overage billing.

## Setup (once)

1. **A dedicated Google account** for the AI service, holding nothing personal.
2. Sign in to [console.groq.com](https://console.groq.com) with it. **Do not add a payment method.**
3. In Groq: Settings -> Data Controls -> turn on **Zero Data Retention**.
4. Groq -> API Keys -> create a key named `portfolio-chat`.
5. In Vercel (project settings -> Environment Variables), for **Production** (and Preview if you want to test there):
   - `GROQ_API_KEY` = the key. Server-only: **never** with a `VITE_` prefix.
   - `VITE_CHAT_ENABLED` = `true` (shows the launcher).
   - `DATABASE_URL` and `SESSION_SECRET` are already there from the leaderboard (docs/leaderboard/SETUP.md); the chat reuses them. Without them the chat stays off.
6. Redeploy. Open the site, press the Pixel Roy button, ask something.
7. Run the eval (below) against the deployment.

Optional: `CHAT_MODELS` (comma-separated Groq model IDs, tried in order) and `CHAT_GUARD=off`.

## Turning it off

- **Instant:** revoke the key in the Groq console. The chat then answers "offline" with Roy's email.
- **Clean:** remove `VITE_CHAT_ENABLED` (the launcher disappears) or set `CHAT_ENABLED=false` (the API answers 503), then redeploy.

## Keeping the knowledge current

- **Site content** (`bio.ts`, `projects.ts`) or `linkedin.ts` changed: run `npx vitest run src/lib/chatKnowledge.test.ts -u`, review the diff of `api/_lib/chat/knowledge.generated.ts`, commit both. Until then `npm test` fails, on purpose.
- **GitHub:** edit `scripts/chat/github-allowlist.json` (a repo not listed is invisible to the chat), then `node scripts/chat/snapshot-github.mjs`, review `src/data/github.generated.json`, and refresh the knowledge as above. A repo behind a site project card is folded into that card; its README is not used.
- **LinkedIn:** export the profile again (Profile -> More -> Save to PDF) and update `src/data/linkedin.ts` by hand. Where LinkedIn and the site disagree, the site wins.

## Eval

`node scripts/chat/eval.mjs <url>` asks 14 normal and adversarial questions (phone number, prompt extraction, a made-up project, salary, Hebrew, "combat medic" bait...) and checks every answer against the rules, pausing 9s between them to stay inside Groq's per-minute token budget (about two minutes in all). It uses 14 of your 15 daily messages. Function logs show `{"chat":"ok","model":...,"prompt":...,"cached":...}` per answer: if `cached` is usually high, the daily caps in `api/_lib/chat/limiter.ts` can go up.

## Local development

Plain `npm run dev` has no `/api`: with `VITE_CHAT_ENABLED=true` the panel opens and shows the "offline" state. For real answers use `vercel dev` with the env vars pulled (`vercel env pull`).
