/** Small Web-standard helpers shared by the /api functions. */

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Answers depend on the session cookie ("is this row me?"): never cache them anywhere.
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

export const errors = {
  notConfigured: () => json({ error: 'not_configured' }, 503),
  unauthorized: () => json({ error: 'unauthorized' }, 401),
  forbidden: () => json({ error: 'forbidden' }, 403),
  badRequest: (error = 'bad_request') => json({ error }, 400),
  conflict: (error: string) => json({ error }, 409),
  unprocessable: (error: string) => json({ error }, 422),
  serverError: () => json({ error: 'server_error' }, 500),
};

/**
 * Writes must come from this site's own pages. Together with the SameSite=Lax session cookie
 * and the JSON content type (which forces a CORS preflight cross-site), this shuts out CSRF.
 */
export function isSameOriginWrite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** Every scoreboard body is tiny; anything bigger is not ours. */
const MAX_BODY_BYTES = 4096;

/**
 * The parsed JSON object body, or `null` when it is not a JSON object within the size limit.
 * The chat passes a larger `maxBytes`: it sends a short conversation history.
 */
export async function readJsonObject(request: Request, maxBytes = MAX_BODY_BYTES): Promise<Record<string, unknown> | null> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return null;
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) return null;
  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (text.length > maxBytes) return null;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** One cookie's value from the Cookie header, or `null`. */
export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim() || null;
  }
  return null;
}
