# Option C "Signal" - critique

Reviewed at http://localhost:4173/?option=c vs the current pixel site at /. Chromium headless (software WebGL); frame rate not testable.

## Verdict
C looks clearly more premium and reads faster to a recruiter than the pixel site, and serves the "hire this person" goal better. The neuron canvas is a genuine, on-brief idea and responds to the pointer. Cost: it is less memorable as personality and sits in a very common dark-mode-developer look.

## Brief
Recruiters/engineers, 30-second skim, desktop and phone; act = CV or email; impression = hire him; aesthetic = one WebGL moment then restrained content. No named references (used captured refs for context only).

## First impression (frozen)
A developer portfolio for Roy Carmelli, wants a resume download. Polished, technical, calm. Eye: the glowing neuron card, then the huge name. "A clean dev site with a brain theme."
Current site: a game title screen; playful, charming, a bit childish; eye on the pixel Roy, then the yellow buttons.

## Scores (C / current), winner
| Criterion | C | Cur | Winner |
|---|---|---|---|
| Concept/tone fit | 4 | 3 | C (degree-tied, recruiter-safe) |
| Hierarchy | 4 | 3 | C (name, role, CTA in order; 3 type levels) |
| Typography | 4 | 3 | C (Bricolage + Inter vs three families with pixel font hurting legibility) |
| Colour | 4 | 3 | C (one teal accent plus one amber pointer glow; both themes designed) |
| Layout/rhythm | 4 | 3 | C |
| Restraint | 4 | 2 | C (10 interactive on first screen vs 13, far fewer boxes) |
| Consistency | 4 | 3 | C |
| Imagery | 4 | 4 | Tie (C shader original; current sprites are cohesive and characterful) |
| Motion | 4 | 3 | C (not frame-rate verified) |
| Distinctiveness | 3 | 4 | Current (nobody forgets the pixel Roy) |

## Measured
- First screen C: 15 font sizes sitewide, 3 families (Inter, Bricolage, mono); current 7 sizes, 3 families.
- Phone 375: no horizontal overflow; zero tap targets under 44px in C. Current: 38 skill chips are 36px tall.
- Page height phone: C 9072, current 12004.
- Tab order is logical (skip link, nav, theme, CTAs, Pause, project buttons); focus ring is a visible 2px teal outline.

## Reproduced
- Pointer over canvas: nearby neurons switch to amber and chain-fire (c-pointer-excited.jpg).
- Pause/Play toggles; paused canvas is byte-identical across 700ms; resumed differs.
- "Read the full story": Enter opens an inline panel, label becomes "Close the story", Space/Enter closes, focus stays on the button (c-story-open.jpg). Escape does nothing.
- Copy address: copies the right string, button reads "Copied".
- Reduced motion: canvas is a still frame (identical before and after pointer move) and the button reads "Play animation".
- Theme toggle: day theme designed, not inverted (c-day-theme.jpg), but the day canvas is washed and softer.

## Defects
1. Resume is not in the nav; only hero and contact. Nav is Work/About/Contact only (`header nav`).
2. Escape does not close an opened story (reproduced). Minor.
3. Phone: canvas sits above the name, pushing name to y~330 and "Selected work" heading peeks at the fold (c-first-phone.jpg). CTA still visible.
4. Day-theme canvas is low-contrast; looks like a faded diagram (c-day-theme.jpg).
5. Hero caption "Simulated neurons. Move the pointer to excite them." wraps to two lines at 1440 and is cramped against the Pause button (c-first-desktop.jpg).
6. Content below the hero fades in on scroll; fullPage screenshots show blank until scrolled. Slow scrollers and print see empty space (Observed, artefact-prone).
7. Skills are plain comma text with no visual weight; the two heaviest proof points (330 users, 1,000 visits/week) are in a bullet, not promoted.

## Cut/keep
Cut the "Options" chip only for production. Keep: framed card idea, Download plus Email pair, the three-project spread with screenshots, one-line Contact card.

## Conservative recruiter
Not put off. Pointer-excitable canvas might feel slightly showy, but it is framed, pausable, and the CV is one click away.

## Not tested
GPU frame rate, real mobile touch interaction on canvas, slow-3G load, screen reader.
