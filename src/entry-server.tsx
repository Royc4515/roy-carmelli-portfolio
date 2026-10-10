import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import { AppProviders } from './AppProviders';

/**
 * Build-time entry (scripts/seo/prerender.mjs): renders the page to static HTML so crawlers
 * that never run JavaScript (Bing's first pass, GPTBot, ClaudeBot, PerplexityBot) read the
 * same content visitors do. Same tree as main.tsx, minus the analytics beacon.
 */
export function render(): string {
  return renderToString(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  );
}

export { structuredData, structuredDataScript } from './seo/structuredData';
export { sitemapXml, llmsTxt, SITEMAP_PATHS } from './seo/crawlerFiles';
export { SITE_TITLE, SITE_DESCRIPTION, SITE_URL, OG_IMAGE } from './seo/site';
export { PRERENDERED_ATTR } from './seo/prerenderMarker';
