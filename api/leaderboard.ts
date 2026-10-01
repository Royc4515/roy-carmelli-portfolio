import { defaultDeps, type Deps } from './_lib/deps.js';
import { errors, json } from './_lib/http.js';
import { readSession } from './_lib/session.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/** GET /api/leaderboard?limit=10: the top scores, the caller's own row marked (and added). */
export async function handleLeaderboard(request: Request, deps: Deps): Promise<Response> {
  const { config } = deps;
  if (!config) return errors.notConfigured();
  const raw = Number(new URL(request.url).searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isInteger(raw) ? Math.min(Math.max(raw, 1), MAX_LIMIT) : DEFAULT_LIMIT;
  const session = await readSession(request, config.sessionSecret);
  try {
    const rows = await deps.store(config).leaderboard(limit, session?.playerId ?? null);
    return json({ rows });
  } catch {
    return errors.serverError();
  }
}

export const GET = (request: Request) => handleLeaderboard(request, defaultDeps());
