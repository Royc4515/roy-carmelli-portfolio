# Design critique: Roy Carmelli portfolio

Date: 2026-11-16. Reviewed: production build at http://localhost:4173 (built with `VITE_CHAT_ENABLED=true`, no `/api`). Method: Playwright and Chromium, real scrolling, clicking, hovering, typing, video recording. Opinion is labelled; everything else has a filename or a number.

## 1. Verdict

It is tasteful and not cluttered in the sloppy sense: one palette, one pixel grid, one type system, and it is clearly the best-made site of the pixel-game portfolios I captured. It is not "premium" in the restrained, widely admired sense, because it is loud, long (6,019 px on desktop, 11,765 px on a phone) and dresses everything, including the service record, as game UI. It will make a junior-friendly recruiter curious and will be remembered, but a skeptical engineer skimming for 30 seconds can read it as a costume, so cutting about a third of the decoration would move it from "charming" to "hire this person".

## 2. Brief used, and what was assumed

1. Visitor: recruiters and engineers hiring student/intern full-stack and AI roles in Israel; a 30-second skim, on desktop and (assumed, because links get shared by message) on a phone.
2. One action: download the CV or make contact.
3. Intended aesthetic, from `docs/redesign/SPEC.md`: "the title screen and pause menu of a lovingly made indie RPG: a warm forest-library world where every panel is a precise game menu"; "pixel for flavor, crisp for reading"; "the game is a bonus, never a gate".
4. Impression: someone worth hiring who ships real things.
5. References: the owner named none. I chose them (section 5). Assumed: the owner wants the game concept kept (the SPEC says "an elevation pass, not a rebrand"), so I judge execution and restraint, not whether to have a theme at all.

## 3. First impression (frozen, written before any other capture or source file)

Captures: `scratchpad/critic/fi-desktop.png` (1440x900) and `fi-phone.png` (iPhone 13 emulation).

- What it is and whose: a personal portfolio for Roy Carmelli, styled as a pixel-art RPG title screen.
- What it wants: View Projects, Resume, and "Press start to play".
- Three adjectives for the person: playful, earnest, crafty.
- Eye landed first on: the huge pixel-font "Roy Carmelli" in the brown title card. Second: the large pixel avatar of Roy standing right of it.
- Phone: the first screen is mostly illustration; the name and role are below it, and the floating "Ask me about my work" bubble sits on top of the body copy.
- Busy visitor's sentence: "Cute pixel-game portfolio from a CS student looking for an internship - nice character, but it is a gimmick I have to decode."

## 4. Scorecard

| # | Dimension | Score | One-line reason |
|---|---|---|---|
| 1 | Concept and tone fit | 3 | Suits a junior dev and the game is optional, but the service record sits under an "ACHIEVEMENT" trophy and "LVL 3" / HP bars read as self-rating (Opinion). |
| 2 | Visual hierarchy | 4 | Name card and brass View Projects/Resume are clearly first; main/side/research project tiers work. Beats the genre peers, which hide the name. |
| 3 | Typography | 4 | Three families, seven sizes, pixel face confined to titles and labels, Plex Sans for sentences. Many 12-13px labels. |
| 4 | Colour | 4 | One brass accent over forest green and wood brown; night theme is a designed navy, not an inversion. Text pairs pass (section 6). |
| 5 | Layout, spacing, rhythm | 4 | Same zone header, dashed rule and panel everywhere; 1,060 px content column. Expanded project card breaks it (finding S1). |
| 6 | Restraint and density | 3 | First screen has 12 interactive elements and three Resume entry points; 12 projects plus 39 skill chips make the page very long. |
| 7 | Consistency | 4 | Buttons, chips, panels and zone headers behave alike; the one exception is the skills tooltip (S4). |
| 8 | Imagery and illustration | 4 | The custom avatar, forest and game sprites are cohesive and it is the strongest asset. Crisp modern project screenshots in a pixel frame are the one clash. |
| 9 | Motion and feedback | 4 | Calm: a wave loop, a walking nav marker, press-style buttons; reduced motion leaves 0 running animations. Limited to what the recordings show. |
| 10 | Content design | 4 | Specific, honest ("In development", "Private repo"), clear next step; the 330-users claim has no source on the page and some skills have no backing project. |
| 11 | Interaction and usability | 4 | Details expand in place, chat failure state gives the email, game exits cleanly; the tooltip covers neighbours and the launcher covers a CTA on phones. |
| 12 | Responsive behaviour | 4 | Genuinely reorganises (tablet hero is a stacked title screen, phone gets a Paused menu); 11,765 px long on a phone. |
| 13 | Accessibility | 4 | Contrast passes, no horizontal overflow, 0 text under 12px; chips are 28 px (desktop) and 36 px (phone) tall, above the 24 px AA minimum but under 44. |
| 14 | Craft | 4 | Pixel-exact art and frames; flaws are the empty column in an opened card, the bubble over copy, and a blank screen on slow connections. |
| 15 | Distinctiveness | 4 | Memorable for the right reason (his own character, a real game, content visible with no start gate). The concept itself is common in the genre. |

No 5s: nothing here is among the best of all portfolios. No 1 or 2s.

## 5. Benchmark

Captured at 1440x900 and phone, first screen and one scrolled screen (`scratchpad/critic/ref/`). Arrival video was recorded only for the site under review; for references I used stills and live page loads, so the motion comparison is weak.

| Ref | Why chosen | Result |
|---|---|---|
| brittanychiang.com | Most widely copied developer portfolio; restrained; a template many successful juniors follow. Honest note: she is senior, so this is a taste reference, not a seniority match. | Captured |
| emilkowal.ski | Restrained, widely admired, almost no decoration | Captured |
| rauno.me | Highly admired, experimental but minimal | Captured |
| ozgurguler.netlify.app | Same genre, strongest peer, has a "professional view" toggle | Captured |
| retrojourney.dev | Same genre | Captured |
| brilli.is-a.dev | Same genre | Captured |
| pixel-art-portfolio.vercel.app | Same genre | Captured |
| Dropped | A reference for "similar role and seniority that worked" could not be verified from here, so none was claimed. The sandbox proxy blocked nothing else I tried (one 502 on the `www.` variant of the ozgurguler URL; the bare URL worked). | |

Seven captured, so the benchmark is adequate. Reaching name, role, projects and contact:

| Site | Actions and time to see name, role, projects, CV, contact |
|---|---|
| This site | 0 actions, under 1 s: name, role, availability, Resume and View Projects are all on the first screen; projects, CV and contact are one scroll or nav click. |
| ozgurguler | Name appears in a welcome modal (0 actions); projects need "explore the village" and walking into a building, or one click on "Professional view". |
| retrojourney | A cookie-consent banner covers the bottom third of the first screen; the name is not shown at all before choosing Story Mode or Sandbox. |
| brilli.is-a.dev | Name on a start screen; every other fact is behind "Press start" and a game. |
| pixel-art-portfolio | Name and projects require walking a character around a room; no name on the first screen. |

Pairwise, per dimension (W = this site wins, L = reference wins):

| Dimension | vs Brittany Chiang / Emil Kowalski / Rauno (restrained) | vs genre peers |
|---|---|---|
| Hierarchy | L: Brittany shows one name, one role, one paragraph and three nav items; the site shows 8 type styles and 12 controls on the first screen | W: peers bury or hide the name and CV |
| Typography | L: Brittany and Emil use one family; the site uses three, justified by the theme | W: peers use one pixel face for everything including sentences (retrojourney, brilli) |
| Colour | L on calm; this palette is richer and it is a taste call | W: ozgurguler is comparable and softer; the others are default neon blue or purple |
| Layout and rhythm | L: Emil's single 640 px column has no states to break | W: peers are canvas scenes with no document layout |
| Restraint | L clearly: Emil lists four projects in four lines | W: retrojourney needs a consent wall, a music toggle and a mode picker |
| Consistency | Even | W |
| Imagery | W: Roy's custom avatar and forest beat text-only pages for memorability | W: cohesive pixel art vs the peers' mixed asset packs |
| Motion | Even: references use motion sparingly too (not recorded) | W: no forced intro or auto-playing music |
| Distinctiveness | W | W against most; ozgurguler is the closest match, with a more tailored concept (village) and a "professional view" button this site does not have |

## 6. Measured facts

Source: `scratchpad/critic/measure.js`, output `measure.out`, rendered DOM at 1440x900 and iPhone 13.

- Fonts: 3 families (Press Start 2P, IBM Plex Mono, IBM Plex Sans). Sizes in use, desktop: 12, 13, 14, 16, 18, 24, 40 px (7). Phone: 12, 13, 14, 16, 17, 32 px. Weights 400, 500, 600. Smallest text 12 px; 0 elements under 12 px. 8 distinct line heights.
- Line length (width divided by half the font size, an estimate): body paragraphs about 72 to 82 characters on desktop, 35 to 45 on phone.
- Colour rendered: 7 distinct text colours, 8 distinct background colours. One accent (brass). All text pairs at or above 4.5:1; the single 1.31:1 pair my script flagged is the ink-on-parchment panel whose colour my parser mis-read (the UX review computed 11.2:1 from tokens), so I dropped it. Text over pixel art (hero "SCROLL", "ASK ME ABOUT MY WORK" bubble) not measured.
- Spacing: 18 distinct values on desktop (2, 4, 5, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 64 plus negative offsets). Mostly a 4-px scale; 5, 6, 28, 36 are off it.
- First screen, desktop: 12 interactive elements, 62 words, 8 distinct type styles. Phone first screen: 13 interactive elements, 51 words, 6 type styles.
- Targets, phone: 39 elements under 44 px, all skill chips at 36 px tall (nav, menu and game controls are 44 px or more). Desktop chips are 28 px tall. Passes WCAG 2.2 AA (24 px), misses the 44 px comfort size.
- Page length: 6,019 px desktop, 11,765 px phone (iPhone 13). Horizontal overflow: none (desktop scrollWidth 1432 vs 1440, phone 390 vs 390).
- Slow 3G (400 ms, 50 KB/s): screenshots at 1 s, 3 s and 6 s are byte-identical solid green (`10-slow3g-at-3s-blank.png`); first contentful paint 6,612 ms. The prerendered page is deliberately hidden until the JavaScript swaps it in.
- Token discipline: 3 raw hex values in non-token CSS (`src/styles/components.css` 2, `src/styles/pixel.css` 1), 0 `rgba()`; hex in TS only in `ItemSprite.tsx` (11) and canvas `hud.ts` (6). Good.
- Console: two 404s on load (the Vercel-only insights script and one other asset; local build artefact for the first, the second not identified).
- Decoration ratio (Opinion, estimated from first screen): of 62 words, about 14 are theme only ("PLAYER 1", "HP", "XP", "LVL 3", "MAX", "PRESS START TO PLAY", "SCROLL"), about 23%.

## 7. Findings

### Must fix

**M1. On phones the chat launcher and its speech bubble sit on top of the first-screen content and the primary buttons.**
- Where: hero at 375 to 390 wide. Evidence (Observed): `screenshots/08-hero-phone-chat-overlap.png`: the "ASK ME ABOUT MY WORK" bubble covers the third line of the bio and the character plus "AI" tab overlap the right end of the View Projects and Resume buttons.
- Why it matters: this is the one screen a phone recruiter sees, and the CTA you want pressed is partly covered by a secondary feature.
- Fix: hide the bubble on phones and keep only a smaller launcher offset from the content, or show it only after the first scroll past the hero. Effort: S.
- Considered defence: floating launchers always overlay. Not accepted, because here it overlays the primary action and copy in the first viewport. Caveat: the bubble rotates, so I caught one state.

### Should fix

**S1. An opened project card leaves two large empty areas and a wall of text.**
- Where: Projects, "Details" on any card. Evidence (Observed): `screenshots/04-details-open-empty-column.png`: the screenshot stays centred in a card made about 1,000 px tall, leaving empty green above and below it; the Details text is a 14-line monospace paragraph followed by a "BUILT WITH" list that repeats the chips above.
- Why: this is the click a hiring manager makes to judge depth, and it looks unfinished.
- Fix: pin the image to the top (sticky) and set the Details text in the body face at about 16 px with short paragraphs; delete the duplicate stack list. Effort: S.

**S2. Gamified wording sits next to real credentials.**
- Where: hero HUD ("PLAYER 1", HP, XP, "LVL 3"), Skills header "ROY - LVL 3", About trophy "ACHIEVEMENT: Battalion medic - led a unit from 12 to 30+". Evidence: `01-hero-desktop-day.png`, `06-contact-desktop.png`, `scratchpad/critic/cap/sec-about-1440-day.png`. Tag: Opinion.
- Why: a numeric "LVL 3" next to skills reads as a self-rating, and a trophy icon on the battalion medic, operational support role service is a risky tone for some Israeli employers. The paragraph itself is excellent and plain.
- Fix: keep the theme on frames and headings, drop the numeric HUD and relabel "ACHIEVEMENT" as "Service". Effort: S.

**S3. The first screen asks for too many things.**
- Evidence (Measured): 12 interactive elements, 62 words, 8 type styles on the desktop first screen, including three Resume entry points (nav, hero, plus the header icon on phones) and Play twice (nav, "Press start to play"), plus a floating HUD card that carries no information.
- Why: the owner wants one action, CV or contact; right now there are two pairs of competing CTAs.
- Fix: remove the floating HUD card, remove the nav "Play" button (keep the hero link), keep one primary Resume. Effort: S.

**S4. The skills grid is the least credible part of the page.**
- Evidence (Observed): `05-skills-tooltip.png`: hovering "MCP" shows only a category label, so the section's promise ("Hover to see where I used it") is not delivered; the tooltip also covers the next row. 39 chips; four are course certificates in the same style as technologies. Chips are 28 px (desktop) and 36 px (phone) tall (`16-skills-phone.png`). The prior UX review lists the same unbacked chips.
- Why: engineers discount a long chip grid; a visible unbacked chip costs more than a missing one.
- Fix: cut to chips that have a project behind them (about 20), move certificates to one text line, show the tooltip below the grid, raise phone chips to 44 px. Effort: M.

**S5. The page is very long for a 30-second skim.**
- Evidence (Measured): 6,019 px desktop, 11,765 px phone; 8 project cards plus 4 course logs.
- Why: the best project is above the fold, but the rest buries Contact. Opinion on thresholds.
- Fix: show the three main quests, collapse "side quests" and "training logs" behind one "More work" control. Effort: M.

**S6. Blank screen on slow connections.**
- Evidence (Measured): 1 s, 3 s and 6 s captures identical solid green; FCP 6.6 s (`10-slow3g-at-3s-blank.png`). The UX review reached the same number independently.
- Why: slow mobile data is plausible for a phone visit. A 30-second skim loses the first 6.
- Fix: show the prerendered hero at once, or paint a pixel loading card. Effort: M.

### Could improve

- **C1.** Project screenshots are crisp modern UI inside a pixel frame (`03-projects-desktop.png`); it reads fine but is the one place the pixel world breaks. Opinion. Effort: S.
- **C2.** Offline chat answer shows the email as "Roy.y.carmelli@gmail.com" (capital R, from `src/data/bio.ts`) while the contact panel shows it in lower case (`07-chat-offline-state.png`, `06-contact-desktop.png`). Observed. Effort: S.
- **C3.** Most project cards do not state Roy's role (solo or team); only the long Details do. Observed in the Projects capture; also in the UX review. Effort: S.
- **C4.** There is no "professional view" for visitors who dislike the theme; ozgurguler offers one on its first screen. Opinion. Effort: M, and it conflicts with the "game is a bonus" principle only if it hides content.
- **C5.** Theme labels in 12 to 13 px pixel and mono (zone labels, nav) are the smallest text and the lowest priority; fine, but there are many of them. Opinion. Effort: S.
- **C6.** A first frame of about 0.25 s is solid green before the hero appears (`recordings/arrival-d.webm`, 0 to 0.3 s). Observed on the local build; the 3G case is S6.

## 8. Cut list (in order, fastest gain first)

1. Floating HUD card in the hero (PLAYER 1, HP, XP, LVL 3).
2. "LVL 3 / PROJECTS 12 / LANGUAGES 6" strip in Skills.
3. Duplicate "BUILT WITH" list inside project Details.
4. Nav "Play" button (the hero offers it; keep the in-game controls).
5. The chat bubble on phones (keep the launcher).
6. Skill chips with no project behind them, and certificates as chips.
7. Side-quest and training-log cards, collapsed behind one control.
8. Trophy icon on the service line.

## 9. What to keep, and why

- The hero concept and Roy's own avatar: it is the one thing a visitor will remember, and no reference has it.
- Content visible with no start gate, with the game opt-in and Esc to leave. Every genre peer fails this test.
- The Resume entry in the nav and on phones the persistent header download icon.
- The main/side/research project tiers and the opening one-line "what, for whom, on what" sentence per project.
- The service paragraph in About, in its plain wording.
- Honest labels ("In development", "Private repo") and the offline chat message that gives the email.
- The two designed themes, the token discipline, and reduced-motion support.
- The phone "Paused" menu.

## 10. Considered and dropped

- "Contrast failure of ink text on parchment": my script's colour parser misread the panel colour (1.31:1); the token pair is 11.2:1. Dropped as a measurement artefact.
- "Reduced motion does not stop the hero wave": contact sheets looked identical, so I tested it. Under `reducedMotion: reduce` six hero crops were identical and 0 animations ran. Dropped.
- "Game over screen has no way back": already in the UX review as low and Quit/Esc work; not a design issue. Dropped.
- "Skill chips fail target size": they pass the 24 px AA minimum. Kept only as a comfort note in S4.
- "Too many fonts": three, but each has a clear job and the sentence font is a clean sans. Defended and dropped.
- "Hero art too large on phone": it is tall, but the name and role are within the first screen at 812 px; the overlap is the real problem (M1).
- "Details panel jump": the screenshot in `04` was taken after 2 s and the layout was stable, so it is a layout flaw (S1), not a transition glitch.

## 11. Not tested

- Pixel Roy answering (no `/api`); only the launcher, panel, suggestion buttons and the offline error were exercised.
- Scoreboard and leaderboard sign-in.
- Real audio quality; real iOS Safari, Firefox, Safari; real devices.
- The 12 GitHub links (github.com is blocked here) and whether project claims match the repos, including the "330 users and 1,000 visits a week" figure.
- Contrast of text drawn over the pixel art.
- Frame-level jank: recordings are headless and drop frames; I did not find a second-recording confirmation of any jank, so none is reported.
- Reference arrival videos (I took stills only).
- Touch-driven game play and fullscreen on a phone, and landscape layouts.
- Hebrew footer rendering beyond a glance.
- The recordings `tour-m`, `interact-m`, `reduced-*` exist in the scratchpad but only contact sheets of desktop arrival, reduced arrival, interaction, tour and play were reviewed closely.

## 12. Limits

This is one model's judgment on an emulated browser and a local build; "premium" is a taste call anchored on seven references, not a measurement. Recordings to watch, in `docs/design-review/recordings/`: `arrival-d.webm` (0 to 0.3 s blank, then settled hero), `tour-d.webm` (scroll at reading pace, then the four nav jumps from 14 s), `interact-d.webm` (button hovers, night toggle around 7 to 10 s, Details open and close at the end), `play-d.webm` (start at 2 s, crash and restart near 16 s).

Five people to show it to: (1) an Israeli tech recruiter who screens student CVs; (2) a hiring manager at a product company who reads portfolios in 30 seconds; (3) a Bar-Ilan CS lecturer who writes recommendation letters; (4) a designer who reviews student portfolios; (5) a student who did not get an internship offer last year. Question after ten seconds, page then closed: "What does this person do, and would you open the Resume or leave?"
