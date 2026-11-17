# Option A (Editorial) critique

Reviewed at http://localhost:4173/?option=a vs the current pixel site at /. Chromium, 1440x900 and 375x812, day and night, reduced motion.

## Verdict
Option A looks more premium and more recruiter-legible than the pixel site: name, role, one-line pitch, Download resume and Email are all on the first screen with one red accent. It trades memorability for credibility. For a 30-second skim by a hiring recruiter it serves Roy better; the pixel site is more distinctive but hides the proof behind a theme.

## First impression (5 s)
Desktop: a serif "Roy Carmelli" at 144px, red italic "Full-Stack & AI Developer", two text links. Calm, adult, confident, a bit generic. Eye lands on the name, then the resume link. The right half of the screen is empty. (a-first-d.jpg, a-first-p.jpg)

## Scores (A / current)
Concept fit 4/3, Hierarchy 4/3, Typography 4/3, Colour 4/3, Layout 4/3, Restraint 5/2, Consistency 4/4, Imagery 3/4, Motion 3/3, Content 4/4, Usability 4/3, Responsive 4/3, Accessibility 4/3, Craft 4/4, Distinctiveness 2/5.

## Measured
- 2 families (Newsreader, Inter), 16 distinct font sizes (13-144px), 4 text colours, 1 accent per theme.
- Phone: no horizontal overflow; page height 7621px (6385px desktop); every link/button >= 44px tall (Resume 248x59, Source 77x44, Live 54x44).
- Focus: 2px solid accent outline on every Tab stop; Skip link first. Tab order is logical.
- Phone body copy 15px.

## Findings
1. Should fix, Observed: case study view (case-d.jpg) drops the Work/About/Contact nav and has no Resume or Email, so the page where a recruiter is most convinced has no call to action. Fix: repeat resume/email in the case header. S.
2. Should fix, Observed: on load the first project at the bottom of the first screen is faded (a-first-d.jpg shows Aside at about 40% opacity at 2.5 s); fine in reduced motion (rm-d.jpg). A half-faded heading reads as unfinished. Fix: no reveal for content in the first viewport. S.
3. Should fix, Observed: phone project links wrap, "Source" orphaned on a second row (p-work2.jpg, 3 stacked rows of CTA beneath each card). Fix: smaller gap or let Live/Source share a row. S.
4. Should fix, Opinion: length. 7621px on a phone; three feature cases with image plus three bullets each, then 9 more projects, before About. A 30-second skim never reaches About/Contact; only the hero CTAs and the nav do. Fix: cap featured projects at 2-3 and collapse bullets on phone. M.
5. Could improve, Opinion: desktop hero right half is empty and nothing shows Roy's face or a work thumbnail above the fold; weaker proof than the pixel site's character. Fix: a small portrait or the Aside thumbnail. S.
6. Could improve, Measured: 16 font sizes is more than a minimal system should have; collapse to about 8. S.

## Pairwise vs current site
Concept fit A (clear for a recruiter), Hierarchy A, Typography A (the pixel font is hard to read at small sizes), Colour A, Layout A, Restraint A, Consistency tie, Imagery current (A is only screenshots), Motion tie (A calm but the reveal fade is unfinished-looking), Distinctiveness current. Sections were compared via screenshots, not video.

## Keep
Hero block (name, one accent, two CTAs with file size and date); About and Skills tables; the contact block with Copy button; night theme (night-d.jpg) which is designed, not inverted; reduced motion shows everything immediately.

## Conservative recruiter
Nothing off-putting; this is the safer choice. Possible small nits: the "Claude 101"-style certifications and a mention of Gaza Division service in About (sec-about.jpg) are factual but could draw a reaction; the pixel site's playfulness is gone.

## Considered and dropped
Case study Back button: works, restores scroll position (1088) and URL. Fullpage screenshot blank sections were a scroll-reveal artefact, not a bug.

## Not tested
Contrast ratios numerically, slow 3G, video recordings, Also built / Coursework sections in detail, screen reader.
