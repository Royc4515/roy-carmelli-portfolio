# UX review: Roy Carmelli portfolio

Date: 2026-11-16

## Method and limits

- Reviewed the production build served locally (`vite preview`, http://localhost:4173) with Playwright and Chromium: real scrolling, clicking, tabbing, typing and screenshots, with the source read only to confirm a cause.
- Six personas were walked through in turn: 30-second desktop recruiter (1440x900), phone recruiter (iPhone 13 emulation, portrait and landscape), engineering hiring manager (1280x800), keyboard and screen-reader user, casual player (desktop and phone), and a small-laptop / slow-connection visitor (1280x550 and 1024x600, day and night theme, slow 3G for one load, JavaScript off).
- Every finding below was observed in the page by the reviewer. Findings marked "verified: yes" were measured or reproduced directly; "no" means it rests on inference or could not be checked.
- Limits of the local setup:
  - No `/api`, so the chat cannot answer and the leaderboard is offline.
  - The chat launcher did not render at all in this build (`VITE_CHAT_ENABLED` is not `true` here, see `src/components/Chat/ChatLauncher.tsx:16`), so no chat UI was exercised.
  - The sandbox blocks github.com (HTTP 403 from the proxy), so the 12 GitHub repo links could not be checked. Live demo links were checked with HTTP requests.
  - Emulated devices are not real devices: no real iOS Safari, no real touch latency, no real audio output.
  - Local runs show a 404 for `/_vercel/insights/script.js`. That is a Vercel-only script and is expected off Vercel; it is not counted as an issue.

## Executive summary

- No Critical or High problems found. A recruiter can tell who Roy is, what role he wants, download the CV and find contact details within seconds on desktop, and the game never blocks that.
- The biggest real risk is first load on a slow connection: the page is blank green for about 6.6 s on slow 3G, because the prerendered HTML is deliberately hidden until the JavaScript has loaded. With JavaScript off, the page is fully readable.
- The Skills section claims more than the projects back up. Five chips (C, x86 Assembly, Git, MCP, Claude Code) have no "Used in" evidence, and four course certificates sit beside real technologies with the same visual weight.
- Project cards are strong on what and stack, but uneven on Roy's role (only Wolt Clone states it on the card) and the one hard metric ("330 users and 1,000 visits a week") has no source on the page. A hiring manager cannot check any of the 12 GitHub links from this review.
- Accessibility basics are good: skip link, landmarks, a single H1, visible focus rings, named buttons, no keyboard trap in the game (Esc returns focus to the start button), reduced motion stops all animation, and all main text pairs pass WCAG AA in both themes.
- On phones the layout is sound (no horizontal scroll, 44px+ nav targets, landscape game with large JUMP and SLIDE buttons). The weak spots are small: skill chips are 36px tall and the page is about 8,400 px long on a phone.
- The chat could not be reviewed in this build. That is the largest untested area.

## Prioritized issues

| ID | Severity | Issue | Personas | Where | Suggested fix | Verified |
|----|----------|-------|----------|-------|---------------|----------|
| UX-01 | Medium | Blank green screen until JS arrives: on slow 3G, first paint at 2.6 s is an empty background and first contentful paint is 6.6 s. The prerendered content is hidden by a head style until `main.tsx` swaps it in. No layout shift (CLS 0). | 6 (also 2) | `index.html` head style `#root[data-prerendered]`, `src/main.tsx`; screenshots `scratchpad/ux/p6/3g-3000.png`, `3g-6000.png` | Show the prerendered hero (name, role, CV link) immediately and let the live app replace it, or show a small pixel loading state in the hidden period. Check that the swap does not flash. | yes |
| UX-02 | Medium | Skills overstate evidence. C, x86 Assembly, Git, MCP and Claude Code have no "Used in" projects; Data Structures and Systems Programming say "Studied in coursework"; four course certificates (Claude 101, Claude Code 101, Claude Code in Action, AI Fluency) are shown as equal chips. A skim reads the grid as proficiency. | 3 (also 1) | `src/data/bio.ts` skills; Skills section tooltips | Drop or visually separate chips with no project behind them, and move certificates out of the "equipment" grid into a short line. Tie each remaining chip to a project. | yes |
| UX-03 | Medium | Project cards do not state Roy's role consistently. Only Wolt Clone says "I owned the React web client"; solo versus team shows on a few cards and only in the long Details text on others. The "330 users and 1,000 visits a week" claim has no source or date on the page. The 12 repo links could not be opened from this review. | 3 | `src/data/projects.ts`; Projects section | Add one short role line to every card (solo / team of N, what he built). Add "as of <month>" and a source for the traffic number. Re-check each repo link and README matches the card. | partly (card text observed; repo links not verified) |
| UX-04 | Low | Skill chips are 36 px tall on phones (39 chips), below the 44 px used elsewhere in the nav and game controls. They pass the 24 px WCAG 2.2 minimum but are tight to hit one by one. Tapping a chip also shows its "where I used it" panel off-screen on a 664 px-tall viewport (the chip scrolled into view but the panel was not in the frame). | 2 | `src/sections/Skills.css` `.skill-item` | Raise chip height to 44 px on coarse pointers; make sure the detail panel is scrolled into view on tap. | yes (size); panel position partly |
| UX-05 | Low | On a phone, the page is about 8,400 px tall and the first screen (664 px viewport) cuts "VIEW PROJECTS" at the bottom edge; Resume is only reachable above the fold through the small header icon. The header download icon and menu are 44x44 and work well, so this is polish. | 2 | Hero on 390x664 | Tighten hero art height on short phones so both CTAs show on first screen. | yes |
| UX-06 | Low | The game has no text alternative: the canvas has no label and the live region is empty during play, so a screen-reader user hears nothing about state or score. The game is optional and Quit/Esc work, so this is not blocking. | 4 | `MiniGame.tsx` (container is labelled "Roy Runner mini-game", canvas is not) | Announce start, game over and score in the existing polite live region; add a short "optional mini-game" note. | yes |
| UX-07 | Low | Skill tooltips on desktop open over neighbouring chips and rows, covering the next row while you hover. | 3 | Skills hover panel, `scratchpad/ux/p3/skills-hover.png` | Open the panel beside the grid or below the whole panel. | yes |
| UX-08 | Low | Skills category headings read oddly to a screen reader: heading text is "WEAPONS · : LANGUAGES" (stray colon and dot). | 4 | Skills section H3 text | Mark the separators `aria-hidden` or use a plain "Languages" heading with the slot name as decoration. | yes |
| UX-09 | Low | Only one skip link ("Skip to projects"). No skip to Contact or Resume, and the hero has 5 tab stops before the first project. Fine in practice, but a keyboard user wanting the CV must pass the whole project list (about 28 stops) or use the header link. | 4 | `Hero.tsx` / nav | The header Resume link is first in the tab order after nav, so this is acceptable; consider a second skip link to Contact. | yes |
| UX-10 | Low | After game over, the only ways back to the content are Quit or Esc; there is no "Back to portfolio" or "See projects" prompt on the game-over screen. A casual player may not notice the Quit button above the stage. Desktop has no fullscreen button (touch only). | 5 | Game over overlay, `scratchpad/ux/p5/g4-crash.png` | Add a "Press Esc to leave" hint to the game over text or a View projects button. | yes |
| UX-11 | Low | Hero decoration (PLAYER 1, HP, XP, LVL 3 card; "Roy - LVL 3 - PROJECTS 12" in Skills) is playful but is not information, and an HR skim could read "LVL 3" as a claimed skill level. Opinion, not a defect. | 1, 3 | Hero HUD, Skills header | Keep, but make sure no number on a card looks like a self-rating. | no (opinion) |

Counts: Critical 0, High 0, Medium 3, Low 8.

## Persona 1: tech recruiter, 30-second skim, desktop 1440x900

**First impression.** "Name, 'Full-Stack & AI Developer', 'Third-year CS & Neuroscience student at Bar-Ilan', a green 'Student & intern roles - Israel' tag. I know what he wants in three seconds. The Resume button is big and there are two of them. It looks like a game, but the game is a small link, not in my way."

**Tasks.**
- Who is this and what role: completed (hero card, first screen).
- Find and download the CV: completed. Header Resume, hero Resume and Resume section all point to `/Roy_Carmelli_CV.pdf`; the file returns 200, is a 1-page PDF (45 KB). The Resume section also offers a View in new tab link.
- Find contact details: completed with one scroll. Contact is in the nav; the section shows Email (with a Copy button), GitHub, LinkedIn and phone. Email is not on the first screen.
- Does the game get in the way: no. It is opt-in ("Press start to play", header Play). Nothing auto-plays.

**Findings.** UX-11 (hero HUD wording, opinion), UX-01 (first load). No other issues observed.

**Worked well.** Clear one-line pitch, availability tag, repeated CV entry points, copy-email button, no popups.

## Persona 2: recruiter on a phone (iPhone 13 emulation)

**First impression.** "The hero art takes the top half but the name, role and student tag are all on the first screen. The menu is a full-screen 'Paused' list, which is cute and easy to use. Buttons are big. The page is very long."

**Tasks.**
- Same as persona 1: completed. CV download icon is in the header at all times (44x44); contact is one menu tap away.
- Menu and navigation: completed. Menu opens (aria-expanded true), items are 48 px tall, tapping Skills scrolls there and closes the menu.
- Tap targets: mostly good (nav 44-50 px, game controls 44-88 px). Skill chips are 36 px (UX-04).
- Horizontal scroll: none, in portrait or landscape (scrollWidth equals viewport; the only element past the edge is a decorative absolutely-positioned hero image).
- Game on touch: portrait shows "Turn your phone sideways to play" with a Quit button; landscape shows the stage with Quit, Fullscreen, Mute, large SLIDE and JUMP buttons, and a tap on the stage started a run.
- Chat launcher on touch: not tested (launcher did not render in this build).

**Findings.** UX-04, UX-05, UX-01.

**Worked well.** Pause-menu navigation, persistent download icon, "Tap an item" wording on touch versus "Hover or focus" on desktop, clear portrait fallback for the game.

## Persona 3: engineering hiring manager, 1280x800, 5 minutes

**First impression.** "Eight cards with stack tags, quotable one-liners and three bullets each. Three 'main quests' get depth. It reads as someone who ships. But what exactly did he do in the team projects, and where are the numbers from?"

**Tasks.**
- Evaluate cards for depth and credibility: struggled in part. What, for whom and stack are strong (every card opens with a "<Name> is a ..." sentence in Details; tech lists are explicit). Role is stated for Wolt Clone only on the card. Groupie shows "Private repo - code on request", which is honest. Metrics: "330 users and 1,000 visits a week" has no source (UX-03).
- Check outbound links: live demos all returned HTTP 200 (Aside on GitHub Pages, Nechita Raka, Groupie, the portfolio itself, CareerPredict AI on Render, White Matter Tracts Game). All outbound links use `target=_blank rel=noreferrer` and the Live/Code buttons carry "opens in a new tab" in their accessible names. GitHub repo and profile links could not be opened from the sandbox (403 from the proxy), so they are not verified.
- Skills and About for signal versus fluff: About is concrete (voltage-imaging data, 56-child OpenNeuro study, shipped products). Skills has the hover "Used in" evidence, which is good, but unbacked chips and certificates dilute it (UX-02). The Gaza Division paragraph is specific and sits in About; the achievement card says "Battalion medic - led a unit from 12 to 30+".

**Findings.** UX-02, UX-03, UX-07, UX-11.

**Worked well.** Opening quotable sentence on each project; honest status badges ("In development", private repo); screenshots with real alt text; "Used in" evidence on chips; Details expand in place without leaving the page.

## Persona 4: keyboard-only and screen-reader user

**First impression.** "First Tab lands on a visible Skip to Projects link, then the brand and nav. Focus rings are clear. One H1, and headings follow H2 then H3 in order."

**Tasks.**
- Tab through the page: completed. Order follows the visual order (skip, brand, nav, Resume, Play, theme, hero CTAs, projects in card order Live then Code then Details, skills, resume, contact, back to top). Skill chips are a single tab stop with roving tabindex and `aria-describedby` tooltips.
- Focus visibility: good. Buttons use a custom notched ring drawn on `::after` (3 px, `--color-focus` #fff1b8, which is 12 to 17:1 on the surfaces); links use a 3 px outline. The transparent CSS outline on buttons is only for forced-colors mode (documented in `src/styles/components.css`).
- Landmarks: header, nav "Main", main, sections, footer. Skip link works.
- Accessible names: good. Buttons and links carry descriptive names ("Details: Aside - AI Sidebar", "Code on GitHub: ... (opens in a new tab)", "Copy email"). The theme button reads "Switch to night mode" (state is in the label, no aria-pressed).
- Game keyboard trap: none. Enter on Press Start moves focus into the game container; Esc quits and focus returns to the Press Start button. Space jumps without scrolling the page.
- Chat panel focus management: not tested (no launcher in this build).
- Reduced motion: with `prefers-reduced-motion: reduce` there were 0 running animations (1 without it); the game still starts.
- Contrast (computed from tokens in `src/index.css`):
  - Day: text on background 11.1:1, muted 7.4:1, subtle 6.8:1, ink on paper 11.2:1, muted ink on paper 6.6:1, gold on dark 7.3 to 7.6:1, button text on gold 6.1:1.
  - Night: text 14.5:1, muted 9.7:1, subtle 8.7:1, ink on paper 9.6:1, muted ink on paper 5.6:1, gold 11.8:1, button text on gold 11.8:1.
  - Non-text border-subtle on background: 3.9:1 (day) and 4.2:1 (night), above the 3:1 minimum. Text drawn directly over the pixel art (for example "Scroll") was not measured.

**Findings.** UX-06, UX-08, UX-09.

**Worked well.** Skip link, ring design, no trap, Esc returns focus, tooltips tied by `aria-describedby`, descriptive link names, alt text on screenshots, `lang="en"` with the Hebrew name marked `lang="he" dir="rtl"`.

## Persona 5: casual visitor who came to play

**First impression.** "'Press start to play' is right there. The stage opens in place with the controls under it: Space or click to jump, Down to slide, Esc to quit, M to mute. I did not need help."

**Tasks.**
- Start: completed (button, header Play, or Enter). Stage opens below the nav, page does not scroll.
- Understand controls: completed. Title screen says "Space, click or tap"; a hint row shows Space, Down, Esc, M.
- Play and crash: completed. A run started on Space, score counted, a bird obstacle ended it, "GAME OVER, SCORE 000036, NEW BEST!, Press to restart".
- Restart: completed (Space).
- Mute and unmute: completed. M toggles and stores `roy-runner-sound` as `off`; the Mute button is there. No audio output was audible in this environment, so sound quality is not tested.
- Fullscreen: not offered on desktop; on phone landscape the button is present (48x48). Not exercised.
- Scoreboard: not tested (offline without an API; no leaderboard button shown, which is the designed offline state).
- Getting back to content: completed through Quit or Esc, with focus returning to the start button. See UX-10 for discoverability.

**Findings.** UX-10.

**Worked well.** Clear title screen, instant restart, best-score feedback, large touch controls in landscape, page stays put while playing.

## Persona 6: small laptop and slow connection

**First impression.** "At 1280x550 and 1024x600 the hero card fits with the name, both CTAs and Press Start visible above the fold, in both themes. On slow 3G I stared at an empty green page for a while."

**Tasks.**
- First paint and layout shift: slow 3G (400 ms latency, 50 KB/s): first paint 2.6 s (empty background), first contentful paint and largest contentful paint 6.6 s, load 14.4 s, 334 KB transferred, CLS 0 (UX-01).
- Clipping and overlap at 1280x550 and 1024x600: none seen in nav, hero or the HUD card; no horizontal scroll. The chat launcher and panel could not be checked (not rendered in this build).
- Theme toggle: works; day and night both render correctly at both sizes, and the stored theme was applied before first paint (`data-theme` set).
- Anchor and hash navigation: `/#projects`, `#about`, `#skills`, `#resume`, `#contact` each land with the section heading below the 64 px nav (section top at 72 px).
- JavaScript disabled: the full page is readable (7,200 characters, all six headings, all sections, links work); the game and theme toggle are inert, as expected. A `<noscript>` rule reveals the prerendered content.

**Findings.** UX-01.

**Worked well.** No layout shift, correct hash offsets, graceful no-JS page, both themes fit short windows.

## What works well

- Fast answer to "who, what role, where": the hero states name, role, degree, school and availability in one card.
- The CV is reachable from the nav, hero, resume section and (on phones) a persistent header icon, and the PDF is one page.
- The game is optional and polite: opt-in, no auto-start, no scroll hijack, Esc and Quit exit, focus returns correctly.
- Accessibility craft: skip link, landmarks, focus rings, descriptive link names, reduced-motion support, passing contrast in both themes.
- Mobile: full-screen menu, 44 px+ nav targets, no horizontal scroll, landscape game with large controls, clear portrait fallback.
- Honest content signals: "In development" and "Private repo" labels, "Used in" evidence on skills, screenshots with real alt text.
- Works without JavaScript and without layout shift.

## Not tested

- The Pixel Roy chat: launcher, panel, focus management, typing effect, busy and error states, phone sheet. The launcher did not render in this local build, so nothing about it was observed.
- Scoreboard and leaderboard (Google sign-in, submitting a score, the dialog), which need the API.
- Real audio output, and music and effects quality.
- Real devices and browsers: iOS Safari behaviour (fullscreen fallback overlay, safe areas, touch latency), Firefox, Safari.
- All 12 GitHub repo and profile targets (github.com is blocked from this sandbox) and whether each repo matches its card. Project numbers (traffic, user counts, test counts) were not checked against source repos.
- Contrast of text drawn directly over the pixel-art backgrounds, and a full screen-reader run with a real reader (only DOM names, roles and focus order were inspected).
- Hebrew footer rendering beyond confirming `lang="he" dir="rtl"` is present.
- Long-session game behaviour (very high scores, speed ramp) and the fullscreen button.
