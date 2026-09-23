import type { CSSProperties } from 'react';
import { bio } from '../data/bio';
import PixelPanel from '../components/PixelPanel';
import PixelIcon from '../components/PixelIcon';
import { ZoneHeader } from '../components/ui/ZoneHeader';
import { Reveal } from '../components/ui/Reveal';
import { pixelSprites } from '../theme/pixelSprites';
import './About.css';

/** The five "at a glance" facts, shown as the character sheet's stat block. */
const AT_A_GLANCE = [
  { label: 'Degree', value: 'B.Sc. Computer Science & Neuroscience (dual major)' },
  { label: 'University', value: 'Bar-Ilan University' },
  { label: 'Year', value: '3rd year · expected graduation 2027' },
  { label: 'GPA', value: '85.09 / 100' },
  { label: 'Open to', value: 'Student & intern roles: full-stack, frontend, AI' },
] as const;

/**
 * Condensed from the service paragraph of `bio.about` (combat medic, led a
 * unit as it grew from 12 to 30+). Two parts so a narrow sheet breaks after
 * the "·", never inside the phrase.
 */
const ACHIEVEMENT = ['Combat medic ·', 'led a unit from 12 to 30+'] as const;

/** The portrait is the native face sprite at ×2 (×1 on short laptop screens, About.css). */
const FACE_SCALE = 2;
const FACE_SCALE_SHORT = 1;
const face = pixelSprites.face;
const faceShortSize = {
  '--face-short-w': `${face.w * FACE_SCALE_SHORT}px`,
  '--face-short-h': `${face.h * FACE_SCALE_SHORT}px`,
} as CSSProperties;

/** The letter's sign-off (decorative: the page already names its author). */
const SIGNATURE = '- Roy';

const paragraphs = bio.about
  .split(/\n\s*\n/)
  .map(p => p.trim())
  .filter(Boolean);

/**
 * Zone 02 · The Adventurer (SPEC §4 About): the bio on a parchment panel next
 * to a wood "character sheet" with the portrait, the at-a-glance stat block
 * and one achievement drawn from the bio. Stacks (story first) below 1024px.
 */
export default function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative bg-bg-alt px-dots py-12 md:py-16 min-[100rem]:py-20 short:py-6 low:py-6">
      <div className="relative mx-auto max-w-[1120px] px-4 md:px-6 lg:px-8">
        <Reveal>
          <ZoneHeader
            zone={2}
            name="The Adventurer"
            title="Who I Am"
            icon={<PixelIcon name="person" size={36} />}
            id="about-title"
          />
        </Reveal>

        {/* Stacked: 48px between the panels clears the story's 12px drop and the
            sheet's 18px tab. Side by side (≥ 1024) both stretch to one height,
            like the two panes of a game menu.
            Short laptop screens: the story keeps 632px (600px of text, 12 lines)
            and the sheet takes the rest, 360-400px (About.css has the sheet). */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 lg:grid-cols-12 short:grid-cols-[minmax(0,1fr)_clamp(22.5rem,100%_-_41rem,25rem)]">
          <Reveal index={1} className="lg:col-span-7 short:col-span-1">
            <PixelPanel variant="paper" elevation={2} padding="lg" className="flex h-full flex-col short:p-4">
              <div className="max-w-[65ch] space-y-4 text-body text-pretty text-ink short:space-y-3">
                {paragraphs.map((text, i) => {
                  const last = i === paragraphs.length - 1;
                  return (
                    <p key={text.slice(0, 32)} className={last ? 'short:flow-root' : undefined}>
                      {text}
                      {/* Short screens: the sign-off floats into the end of the last
                          line (or onto its own line when that one is full). */}
                      {last && (
                        <span
                          className="about-signoff hidden text-display-s text-ink-muted short:block"
                          aria-hidden="true"
                        >
                          {SIGNATURE}
                        </span>
                      )}
                    </p>
                  );
                })}
              </div>
              {/* The bio is a first-person letter: signed at the foot of the page,
                  flush with the right edge of the text column. */}
              <p
                className="mt-auto w-full max-w-[65ch] pt-6 text-right text-display-s text-ink-muted short:hidden"
                aria-hidden="true"
              >
                {SIGNATURE}
              </p>
            </PixelPanel>
          </Reveal>

          <Reveal index={2} className="lg:col-span-5 short:col-span-1">
            <PixelPanel
              variant="wood"
              elevation={2}
              className="about-sheet-panel h-full short:flex short:flex-col short:px-4 short:pb-4 short:pt-6"
              tab={
                <h3 className="inline-flex items-center gap-2 text-label">
                  {/* Same plate as Training logs: icon centred on the caps. */}
                  <PixelIcon name="person" size={12} className="-mt-0.5 block flex-none" />
                  Character sheet
                </h3>
              }
            >
              {/* 768-1023 the full-width sheet splits: portrait + achievement | stats. */}
              <div className="about-sheet">
                <div className="about-sheet__id flex items-center gap-4 short:gap-3">
                  <div className="about-portrait shrink-0" style={faceShortSize}>
                    <img
                      src={face.src}
                      width={face.w * FACE_SCALE}
                      height={face.h * FACE_SCALE}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      className="pixelated block"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-display-s text-fg">{bio.name}</p>
                    <p className="mt-2 text-body font-semibold text-accent-fg short:mt-1">{bio.role}</p>
                  </div>
                </div>

                <dl className="about-sheet__stats about-stats">
                  {AT_A_GLANCE.map(({ label, value }) => (
                    <div key={label} className="about-stats__row">
                      <dt className="text-hud uppercase text-fg-subtle">{label}</dt>
                      <dd className="text-body text-balance text-fg short:text-body-s">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="about-sheet__feat about-achievement">
                  <PixelIcon name="trophy" size={24} className="shrink-0 text-accent-fg" />
                  <p className="min-w-0">
                    <span className="block text-label text-accent-fg">Achievement</span>
                    <span className="mt-1 block text-body font-semibold text-fg short:mt-0 short:text-body-s short:font-semibold">
                      {ACHIEVEMENT[0]} <span className="whitespace-nowrap">{ACHIEVEMENT[1]}</span>
                    </span>
                  </p>
                </div>
              </div>
            </PixelPanel>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
