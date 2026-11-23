import { bio } from '../data/bio';

/**
 * Production origin, no trailing slash. Every canonical, OG, sitemap and JSON-LD URL is built
 * from it, so preview deployments point search engines at production instead of competing
 * with it. Change it here (and in index.html, robots.txt) if the site moves to its own domain.
 */
export const SITE_URL = 'https://roy-carmelli-portfolio.vercel.app';

/**
 * <title> and og:title. The Hebrew name is here because people search for "רועי כרמלי" and
 * the visible page is English-only; the title is the strongest place a query can match it.
 */
export const SITE_TITLE = `${bio.name} (${bio.nameHe}) - ${bio.role}`;

/**
 * Meta and OG description. The name is left to the title so the degree, the work and the
 * availability fit in the ~160 characters search results show whole.
 */
export const SITE_DESCRIPTION =
  `Third-year Computer Science & Neuroscience student at ${bio.institution}. ` +
  'I build AI agents and full-stack web apps. Open to part-time student positions in Israel.';

/** 1200x630 share card in public/: the live hero, rendered from the page itself. */
export const OG_IMAGE = {
  // A new file name, not a new file under the old one: WhatsApp, LinkedIn and X cache a share
  // image by its URL, so only a new URL makes them show the current design.
  url: `${SITE_URL}/og-card.jpg`,
  width: 1200,
  height: 630,
  alt: `${bio.name}, ${bio.role}: his voxel figure waving on a floating island beside his name`,
} as const;

/** Absolute URL for a site path ("/" or "/Roy_Carmelli_CV.pdf"). */
export function siteUrl(path: string): string {
  return SITE_URL + (path.startsWith('/') ? path : `/${path}`);
}
