/**
 * Invisible and direction-changing characters (controls, zero-width, bidi overrides and
 * isolates). Stripped from names so nobody can render their row backwards or blank, or push
 * text over a neighbour's score.
 */
export const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u115f\u1160\u200b-\u200f\u2028-\u202e\u2060-\u206f\u3164\ufeff\uffa0]/g;

function clean(part: unknown): string {
  return typeof part === 'string' ? part.replace(UNSAFE, '').replace(/\s+/g, ' ').trim() : '';
}

/** Cuts by code point, so a Hebrew letter or an emoji is never split in half. */
function take(text: string, n: number): string {
  return Array.from(text).slice(0, n).join('');
}

export interface PublicNames {
  /** "Roy C." on the leaderboard: first name and last initial, never the full name. */
  display: string;
  /** "Roy", for the player's own "Signed in as" line. */
  first: string;
}

/** Names from Google ID-token claims (`given_name`, `family_name`, `name`). */
export function publicNames(claims: { given_name?: unknown; family_name?: unknown; name?: unknown }): PublicNames {
  const fullParts = clean(claims.name).split(' ').filter(Boolean);
  const first = take(clean(claims.given_name).split(' ')[0] || fullParts[0] || 'Player', 24);
  const family = clean(claims.family_name) || (fullParts.length > 1 ? fullParts[fullParts.length - 1] : '');
  const initial = take(family, 1);
  return { display: initial ? `${first} ${initial}.` : first, first };
}
