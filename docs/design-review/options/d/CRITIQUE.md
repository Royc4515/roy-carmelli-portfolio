# Option D "Two modes" - critique (vs current pixel site)

Reviewed at http://localhost:4173/?option=d (production build, Chromium, 1440x900, 375x812 touch, 812x375 touch, both themes, reduced motion). Chat API absent, as expected.

## Verdict
D is more premium and a safer skim for a recruiter: one name, one role, one green CTA, a real "Download resume" above the fold, and a white/cream shell that reads as a mature product site. The pixel Roy window is the only costume left and it mostly works as identity. But the hero is under-composed (large dead space), the fixed chat bubble lands on body copy, and the portrait-phone game dialog is a dead end. It beats the current site for the stated audience; it loses on distinctiveness.

## Brief used
Recruiters/engineers, 30-second skim, desktop and phone. Action: download CV / email. Impression: hire this person. Reference: ozgurguler "professional view".

## First impression (frozen, written before deeper review)
Desktop: a calm personal site for Roy Carmelli, junior full-stack/AI dev; wants me to download the resume. Adjectives: tidy, approachable, playful. Eye: the big name, then the pixel forest card. Phone: the pixel card with a speech bubble comes first, name second. "A student developer with a cute pixel mascot and a resume button."

## Scorecard (D vs current; winner)
| Criterion | D | Cur | Winner |
|---|---|---|---|
| Concept/tone fit | 4 | 3 | D (clean shell suits recruiters; game is optional) |
| Hierarchy | 4 | 3 | D (name > role > CTA; current has 6 competing gold buttons and nav) |
| Typography | 4 | 3 | D (Plex Sans display 72px; Press Start only as accent. Current pixel H1 and body on brown) |
| Colour | 4 | 3 | D (day cream + forest green, night navy + amber; both designed) |
| Layout/rhythm | 3 | 3 | tie (D: ~260px empty above hero, phone ~300px empty under CTAs; current is full-bleed but cramped) |
| Restraint | 4 | 2 | D (12 interactive items on first screen vs a dense HUD) |
| Consistency | 3 | 4 | Current (D mixes pixel chat bubble/AI badge with a rounded-corner shell) |
| Imagery | 4 | 4 | tie (same sprite; D frames it better, project screenshots are real) |
| Motion | 3 | 3 | tie (not recorded as video; see Not tested) |
| Distinctiveness | 3 | 5 | Current |

## Measured
- Fonts: IBM Plex Sans, IBM Plex Mono, Press Start 2P (3 families); 13 distinct text sizes on the page.
- Phone: no horizontal overflow, body 16px, no tap target under 44px (excluding review chip).
- Focus ring on every Tab stop: solid 2px. Tab order logical: skip link, brand, nav, theme, CTAs, Play, project Details/Live/Source... Total page 5392px tall at 1440.
- Details expander: aria-expanded flips true; expanded panel is clear and readable (n-details.jpg).
- Game: dialog opens, Space starts, Esc closes, focus returns to "Play Roy Runner". Landscape phone: full controls (SLIDE/JUMP, X, mute) work (n-land-game.jpg).

## Top defects (reproduced)
1. Fixed chat launcher bubble ("ASK ME ABOUT MY WORK") sits on top of body text and tags at 1440x900: it covers "AI c..." in the Nechita card and the Ollama chip (m-work, n-details). Observed. Fix: shrink to a round button with the bubble only on hero, or hide the bubble after first view. S.
2. Hero dead space: content is vertically centred in a tall block, leaving ~260px empty above on desktop and ~300px below the CTAs on phone (first-desk.jpg, first-phone.jpg). Measured visually. Fix: tighten hero min-height. S.
3. Portrait phone "Play Roy Runner" opens a dialog that only says "Turn your phone sideways" (n-phone-game.jpg) in full pixel style, a jarring tonal jump and a dead end for most mobile visitors. Fix: offer a portrait-playable mode, or hide the Play button on portrait phones. M.
4. Phone hero order: the pixel card plus bubble comes before the name, so the first screen opens with a game, not the person (first-phone.jpg). On phone the download CTA is under the fold of the card. Fix: name first, card below. S.
5. Mixed languages of shell: gold pixel "AI" badge and Press Start bubble + mini "PLAY MODE" label vs smooth rounded cards; the pixel Press Start 2P label at 13px "PLAY MODE" is hard to read. Opinion. Fix: set labels in Plex Mono.

## Pixel elements: identity or costume?
Mostly identity: framed forest card, opt-in game. The chat bubble and "AI" tag are the leftover costume; the full-screen game dialog is a full theme switch (dark-green arcade) that is coherent but abrupt.

## Conservative recruiter
Not put off. Possible mild flags: "Play Mode" card takes the right half of the first screen; "Ask me about my work" bubble looks gimmicky. Resume and email are prominent.

## Keep
Name/role/CTA block, the PDF meta line, Details expander, both themes, framed forest window, optional game.

## Not tested
Phone chat open (my tap on the hero did not open it; not reproduced), video recordings and animation smoothness, slow-3G load, copy-address clipboard result, project cards below the fold on phone at reading pace. Note: full-page screenshots show blank sections because reveal animations only fire on scroll (artefact, not a defect).

## Considered and dropped
Large blank sections in the full-page capture (reveal-on-scroll artefact). Chat offline state (expected).
