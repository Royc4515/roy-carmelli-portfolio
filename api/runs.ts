import { defaultDeps, type Deps } from './_lib/deps.js';
import { errors, isSameOriginWrite, json, readJsonObject } from './_lib/http.js';
import { maxPlausibleScore, parseScore } from './_lib/scoring.js';
import { readSession } from './_lib/session.js';

/**
 * POST /api/runs
 *   { action: "start" }               opens a run on the server clock
 *   { action: "submit", score: n }    closes it; the score must fit the time that passed
 *
 * A forged score sent straight here needs a run open for as long as that score takes to earn
 * (999999 points is ~35 hours), and each run takes exactly one submit.
 */
export async function handleRuns(request: Request, deps: Deps): Promise<Response> {
  const { config } = deps;
  if (!config) return errors.notConfigured();
  if (!isSameOriginWrite(request)) return errors.forbidden();
  const session = await readSession(request, config.sessionSecret);
  if (!session) return errors.unauthorized();
  const body = await readJsonObject(request);
  if (!body) return errors.badRequest();

  const store = deps.store(config);
  try {
    if (body.action === 'start') {
      await store.startRun(session.playerId);
      return json({ ok: true });
    }
    if (body.action === 'submit') {
      const score = parseScore(body.score);
      if (score === null) return errors.unprocessable('invalid_score');
      const elapsed = await store.closeRun(session.playerId);
      if (elapsed === null) return errors.conflict('no_open_run');
      if (score > maxPlausibleScore(elapsed)) return errors.unprocessable('implausible_score');
      const best = await store.saveScore(session.playerId, session.displayName, score);
      return json({ best });
    }
    return errors.badRequest('unknown_action');
  } catch {
    return errors.serverError();
  }
}

export const POST = (request: Request) => handleRuns(request, defaultDeps());
