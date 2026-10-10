# SEO and AI-search report (branch `seo-geo`)

Goal: get roy-carmelli-portfolio.vercel.app found on Google, Bing and AI answer engines for "Roy Carmelli", "רועי כרמלי" and the project names.

## 1. Audit: what crawlers saw before

Stack: Vite 6 + React 18 + TypeScript, a single-page app rendered entirely in the browser (`createRoot` into an empty `<div id="root">`), deployed on Vercel as static files plus `/api` functions.

`curl` of the live site (Googlebot user agent, 10 Oct 2026):

| Item | Before |
|---|---|
| HTML body | `<div id="root"></div>` and nothing else: **0 words** of content |
| `<h1>` / headings | none in the HTML (only after JavaScript runs) |
| `<title>` | `Roy Carmelli - Full-Stack & AI Developer \| CS & Neuroscience` |
| meta description | present ("Third-year CS & Neuroscience student...") |
| canonical | present, `https://roy-carmelli-portfolio.vercel.app/` |
| Open Graph / Twitter | present, `og-image.png` 1200x630, no image size or alt |
| JSON-LD | one hand-written `Person` in `index.html` (sameAs GitHub and LinkedIn) |
| robots.txt | `User-agent: * / Allow: /` |
| sitemap.xml | hand-written, one URL, no lastmod |
| Hebrew name | only in the JSON-LD `alternateName` |
| llms.txt | none |

The main problem: Google renders JavaScript (with a delay), but Bing's first pass, GPTBot, ClaudeBot, PerplexityBot and most AI crawlers do not. To them the site had a title and a description and no content: no projects, no skills, no bio.

## 2. What changed

### Prerendering (the main fix)

**What I chose:** a small build step, no new framework and no new runtime dependency.

1. `vite build` (unchanged client build).
2. `vite build --ssr src/entry-server.tsx` builds a Node version of the same React tree.
3. `scripts/seo/prerender.mjs` renders it with `renderToString` under a jsdom shim and writes the HTML into `dist/index.html`. It also adds the JSON-LD and generates `sitemap.xml` and `llms.txt`.

**Why not `vite-react-ssg` or a framework:** they expect a router and SSR-safe components. Several hooks here (theme, media queries, the hero's viewport maths) read `window` during render. Making them SSR-safe would mean edits across Hero, Navbar and the hooks, and each edit risks the design. With the jsdom shim, no component changed.

**Why `createRoot` and not hydration:** the hero layout is computed from the real window size. Hydrating a snapshot taken at one fixed size would keep mismatched attributes in production, which is a visual bug. So the snapshot is for crawlers and no-JS readers. A style rule keeps it invisible until `main.tsx` swaps in the live app in one synchronous commit. Visitors with JavaScript get exactly the first paint they had before, and a `<noscript>` rule shows the snapshot to anyone without JavaScript.

### Separate URL per project: considered, not done

I decided against it. The design is one page with expandable cards. A `/projects/<id>` page would either:

- repeat the whole home page with a different title, which Google treats as duplicates and folds back into `/`, or
- need a new page layout, which the brief rules out.

Instead, each project gets:

- a stable in-page anchor (`/#quest-<id>-title`, already handled by the hash scroll),
- its own JSON-LD node with that URL and its GitHub repo,
- a line in `llms.txt`.

Searches for a project name will mostly land on its GitHub repo or live demo anyway. The portfolio now links to both, in both HTML and JSON-LD.

### Structured data (`src/seo/structuredData.ts`)

One generated `@graph`, built from `src/data`, so it cannot drift from the page:

- `WebSite` (alternate names include רועי כרמלי)
- `ProfilePage` (`mainEntity` = the Person, `dateModified` = the build's commit date)
- `Person`: name, Hebrew `alternateName`, job title, "Computer Science & Neuroscience" description, Bar-Ilan affiliation, `sameAs` linkedin.com/in/roy-carmelli and github.com/Royc4515, the CV as `subjectOf`
- one node per project: `SoftwareSourceCode` with `codeRepository` and `programmingLanguage` when the repo is public, `CreativeWork` for the private Wolt Clone. Roy is `creator` on solo projects and `contributor` on the two team projects (new `teamSize` field, tested against the "team of N" wording).

The hand-written JSON-LD was removed from `index.html`.

### Head tags (`index.html`, checked against `src/seo/site.ts` by a test)

- Title: `Roy Carmelli (רועי כרמלי) - Full-Stack & AI Developer` (52 characters). The Hebrew name is here because the page is English-only and the title is the strongest match for a Hebrew query.
- Description (168 characters): "Third-year Computer Science & Neuroscience student at Bar-Ilan University. I build web apps, Chrome extensions and AI tools. Open to student and intern roles in Israel."
- OG: `og:type profile`, `og:site_name`, `og:locale`, image width/height/type/alt. Twitter: `summary_large_image` with image alt. `<link rel="me">` to GitHub and LinkedIn. Robots meta allows large image previews and full snippets.
- Unchanged: canonical, `lang="en"`, the Search Console verification tag.

### robots.txt, sitemap.xml, llms.txt

- `robots.txt` allows everyone, and names each of these bots explicitly with `Allow: /`: Googlebot, Google-Extended, Bingbot, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Applebot and Applebot-Extended. `/api/` is disallowed (it only holds endpoints).
- `sitemap.xml` is now generated on every build: the home page plus the CV PDF. Each `lastmod` is the date of the last commit that touched it, not the build time, because Google ignores lastmod values that change on every build.
- `llms.txt` (new) is a Markdown summary of the bio, links and every project, for AI assistants.

### Semantic HTML

Checked in the prerendered output: one `<h1>` (Roy Carmelli), five `<h2>` zones, `<h3>` per tier or skill group, and `<h4>` per project. Nothing needed changing.

### Project copy: one quotable opening sentence each

Each `description` in `src/data/projects.ts` now opens with "<Name> is a ...": what it is, who it's for, and the stack. I only rearranged facts that were already in that project's copy; nothing is new. Examples:

- "Aside is a Chrome extension (Manifest V3, plain JavaScript, no build step) that opens an AI assistant from six providers in a sidebar next to any web page you're reading."
- "Wolt Clone is a Wolt-style food-delivery platform, built in a team of 2 for the Advanced Systems Programming course, with a React web client, a React Native app, an Express and MongoDB API, and a C++ recommendation service."

These sentences are the JSON-LD and `llms.txt` descriptions. The visible card taglines did not change; the full descriptions sit in each card's "Quest log". The chat knowledge was regenerated (`-u`).

## 3. Verification

| Check | Before (`origin/main`) | After (`seo-geo`) |
|---|---|---|
| `curl /`: words of body text | **0** | **2,435** |
| `<h1>` in raw HTML | 0 | 1 (h2: 5, project h4: 10) |
| All 10 projects, Bar-Ilan, CV link in raw HTML | no | yes |
| JSON-LD | 1 node (Person) | 13 nodes; validator.schema.org: **0 errors, 0 warnings** |
| sitemap.xml | static, 1 URL | generated, 2 URLs with lastmod |
| llms.txt | 404 | 200 |
| Page with JavaScript off | blank | full designed page |
| Screenshots with JS on, 1440x900 and 390x844, full page | - | **pixel-identical** to `origin/main` |

Lighthouse 12, local `vite preview` of both builds, one run each, so expect a few points of noise:

| | Perf | A11y | Best practices | SEO | FCP | LCP | CLS |
|---|---|---|---|---|---|---|---|
| Live site (before), mobile | 87 | 100 | 100 | 100 | | | |
| `origin/main`, mobile | 93 | 100 | 96 | 100 | 2.0 s | 2.7 s | 0 |
| `seo-geo`, mobile | 94 | 100 | 96 | 100 | 1.9 s | 2.9 s | 0 |
| `origin/main`, desktop | 100 | 100 | 96 | 100 | 0.4 s | 0.6 s | 0 |
| `seo-geo`, desktop | 100 | 100 | 96 | 100 | 0.5 s | 0.7 s | 0 |

Honest reading: Lighthouse SEO was already 100 and stays 100, because Lighthouse runs JavaScript. It cannot see the problem this branch fixes; the `curl` rows above can. There's no performance regression. The local Best Practices 96 is a 404 for Vercel Analytics' script, which only exists on Vercel; it's the same on both builds.

`npm test`: 60 files, 760 tests pass (17 new in `src/seo/seo.test.ts`). `npm run build` passes.

## 4. Manual steps only you can do

1. **Google Search Console.** The property is already verified (meta tag and `googlecd23d28f0f769144.html`).
   - After merging, submit `https://roy-carmelli-portfolio.vercel.app/sitemap.xml` under Sitemaps.
   - Use URL Inspection on `/`, then "Request indexing".
   - Check the "Rendered HTML" and "Enhancements → Profile page" reports a few days later.
2. **Rich Results Test.** Run https://search.google.com/test/rich-results on the live URL after deploy and confirm the ProfilePage is detected.
3. **Bing Webmaster Tools.** Bing is also the index behind ChatGPT search and Copilot.
   - Sign in at https://www.bing.com/webmasters and choose "Import from Google Search Console" (fastest), or verify with their meta tag. Send me the tag and I'll add it.
   - Submit the sitemap.
   - Turn on IndexNow if offered.
4. **Custom domain (recommended).** For example `roycarmelli.com` or `roycarmelli.dev`, about $10-15 a year.
   - A `*.vercel.app` subdomain works, but a name-match domain is a stronger signal for "Roy Carmelli" and survives a host change.
   - If you buy one: add it in Vercel and make it primary, so the vercel.app URL 301-redirects to it.
   - Tell me, and I'll update `SITE_URL` in `src/seo/site.ts`, the head tags in `index.html` and `robots.txt` (the tests catch any drift).
   - Then add the new domain as a Search Console property, and as a Google OAuth "Authorized JavaScript origin" for the scoreboard sign-in.
5. **Links from places that already rank for your name.** This matters more than anything on the page:
   - LinkedIn: the Website field in Contact info, plus the Featured section.
   - GitHub: the profile "Website" field, and a profile README (`Royc4515/Royc4515`) with the link and your Hebrew name. Also set the `homepage` of the portfolio repo and the main project repos (Aside, sommelier bot) to the portfolio URL.
   - Your CV PDF: make sure the portfolio URL is in it and clickable.
   - Bar-Ilan pages if any allow it (department student projects, lab pages), and the StandWithUs alumni profile if there is one.
   - A short post on LinkedIn (and dev.to or Medium, optional) about Aside or Roy Runner, linking back. AI answer engines often cite these.
6. **Optional, if you want stronger Hebrew results:** add your Hebrew name visibly somewhere (for example the footer: "Roy Carmelli · רועי כרמלי"). I didn't add it, because the brief said not to change the design. The title, JSON-LD and llms.txt carry it for now.

## 5. Something I noticed but did not change

The About section says "3rd year · expected graduation 2027". The CV commit (#39) and the LinkedIn data say February 2028. One of them is out of date; please check which.
