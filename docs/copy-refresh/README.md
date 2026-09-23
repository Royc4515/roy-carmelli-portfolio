# Copy refresh: before / after

Screenshots of every section whose copy changed, at 1280px and 390px, night theme, reduced motion.
`before/` is `main` at `b174d4d`; `after/` is this branch. `*-landing` is the first screen a visitor
sees (navbar included); the section shots hide the fixed navbar so it doesn't cover the content.
`after/*-projects-logs-open` has every quest log expanded, to check the full descriptions.

Checked with Playwright (preinstalled Chromium): the page is exactly the viewport wide at 320, 360,
375, 390 and 1280px (no horizontal scroll).

| Section | 1280 | 390 |
|---|---|---|
| Landing (Hero) | [before](before/1280-landing.webp) · [after](after/1280-landing.webp) | [before](before/390-landing.webp) · [after](after/390-landing.webp) |
| Projects | [before](before/1280-projects.webp) · [after](after/1280-projects.webp) | [before](before/390-projects.webp) · [after](after/390-projects.webp) |
| Projects, quest logs open | [after](after/1280-projects-logs-open.webp) | [after](after/390-projects-logs-open.webp) |
| About | [before](before/1280-about.webp) · [after](after/1280-about.webp) | [before](before/390-about.webp) · [after](after/390-about.webp) |
| Skills | [before](before/1280-skills.webp) · [after](after/1280-skills.webp) | [before](before/390-skills.webp) · [after](after/390-skills.webp) |
| Resume | [before](before/1280-resume.webp) · [after](after/1280-resume.webp) | [before](before/390-resume.webp) · [after](after/390-resume.webp) |
| Contact | [before](before/1280-contact.webp) · [after](after/1280-contact.webp) | [before](before/390-contact.webp) · [after](after/390-contact.webp) |
