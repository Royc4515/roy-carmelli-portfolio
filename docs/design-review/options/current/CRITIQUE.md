# Current site vs options A-D (re-critique)

Reviewed: production build at localhost:4173, day theme, Chromium 1440x900 and 375x812 (touch, 2x). Screenshots: `current-desktop.jpg`, `current-phone.jpg`, `current-projects.jpg`, `current-skills.jpg`, `a-desktop.jpg`, `b-desktop.jpg`, `c-desktop.jpg`, `d-desktop.jpg`.

## Verdict
The current site is the most memorable of the five and the best-made pixel portfolio I have seen, and the trim worked: the first screen now carries one title card, two buttons and a status chip. It still loses on the brief's real test, a 30-second skim that ends in "hire this person". Name, role and Resume are readable in 2 seconds, but the work sits 900 px down, the page is 6,019 px (desktop) and 12,004 px (phone), and a costume (zones, quests, trophies) sits between the recruiter and the evidence. Option D is the same content in a clean shell and is the better recruiter page; the current site is the better personality.

## First screen (measured, first screen, desktop / phone)
- Interactive elements: 12 / 14. Distinct font sizes on page: 7 / 6, three families. Min text 12px, none below.
- Hero image takes about 60% of the desktop first screen and all of the phone's first 740 px; name and CTAs on phone are still above the fold (CTA at about y 700).
- Chat launcher is a fixed bubble, so on desktop it overlaps project bullet text while scrolling (`current-projects.jpg`, "Serverless Funct" is cut by the bubble). Observed.
- Resume has 4 links on desktop, 5 on phone (nav, hero, resume zone, contact). Over-offered, but the one action is never hard to find.

## Scores (1-5)
First impression 4 (charming, instantly distinctive; slightly "game, not engineer"). Hierarchy 4 (name card, then brass View Projects). Restraint 3 (was 3; first screen cleaner, but 12 projects, 6 zones, 1,194 words). Premium feel 3 (high craft, not restrained; pixel face on labels and a stats strip "PROJECTS 12 / LANGUAGES 6" is theme, not information). Memorability 5. Fit for brief 3.

## Changes vs the earlier critique (re-measured)
- Desktop height 6,019 px: unchanged. Phone 12,004 px vs 11,765: slightly longer (different emulation, so treat as no gain).
- Distinct font sizes 7 desktop, same as before; 0 text under 12px, same.
- First-screen interactive count 12: unchanged; the nameplate is gone, so the card is visibly calmer, but the count did not drop.
- Skills is now a short panel (486 px desktop vs a long chip wall) with an inspector strip; the content is readable at a glance (`current-skills.jpg`).
- Military service now plainly labelled "Battalion medic · led a unit from 12 to 30+": the earlier concern about game-ifying the service record is resolved.
- Chat on phones is a bubble beside Roy in the hero (`current-phone.jpg`); it no longer covers the CTAs. Its typing state shows a half-transparent bubble over the art, which reads slightly murky.
- Unchanged: the desktop launcher still overlaps content on scroll.

## Pairwise: current vs option (W = current wins, L = option wins)
| Axis | A Editorial | B Console | C Signal | D Two modes |
|---|---|---|---|---|
| First impression | L: name is one huge serif line, CV and email visible in 2 s | L: Download and email buttons plus search read as "engineer" | L: name plus neuron art, calm, CTA clear | W: current is more striking; D's card shows Roy but shell is plain |
| Hierarchy | L: one idea per screen, CTA under tagline | L: dark primary button clear, but projects start immediately | L: two buttons, one image | L: same content, one primary green button, work 1 screen down |
| Restraint | L: 16 font sizes but 7 interactive items, 994 words | L: 4,419 px vs 6,019 | L: 6,001 px, 9 interactive | L: 5,392 px, 11 interactive, game optional |
| Premium feel | L: looks like an editorial studio site, most "admired" | L: Linear-like, polished | L: premium but shader is generic AI-tool look | L: restrained shell, pixel confined to one card |
| Memorability | W: pixel Roy is unique | W: Console is a familiar pattern | W: neuron art is common | W: D keeps only one pixel card, loses the world |
| Fit for brief | L: fastest to Download and Email, serif reads senior (risk: little proof above fold) | L: best for engineers, evidence-dense, copy-email button; phone 7,474 px | L: clear CTA, but shader costs load and adds nothing to a hire decision | L: same hero as current plus CV in 2 s, keeps game as a bonus, closest to the owner's direction |

## Ranking for this brief
1. D (Two modes): keeps the pixel direction as an optional card and gives recruiters a clean, short page; shortest path to CV and projects.
2. B (Console): best for an engineering skim, shortest desktop page (4,419 px).
3. A (Editorial): strongest typography and first impression, thinner on evidence at first glance.
4. Current: wins only memorability; loses restraint and speed.
5. C (Signal): neuron art is decorative, adds a heavy WebGL cost, and says nothing specific about Roy.

Honest answer: yes, an option beats the current site for a recruiter skim (D, then B). The current site beats all of them for memorability, and if the owner insists on keeping pixel, D delivers it with the least cost.

## Remaining fixes on the current site if kept
1. Put one project line or proof on the first screen (S).
2. Cut Resume entry points from 4 to 2 and drop the "ROY 3RD YEAR / PROJECTS 12" strip (S).
3. Stop the desktop chat bubble from overlapping card text: hide the speech bubble after first view (S).
4. Collapse side quests behind a "more" row to shorten the 3,255 px Projects zone (M).

## Not tested
Night theme in depth, motion and video, the game, tablet widths, load speed, the options' interactive features (palette, shader performance). Judgments on A-D are from first screens and one scroll step only; other reviewers cover them in depth.
