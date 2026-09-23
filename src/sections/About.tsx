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
  { label: 'Year', value: '3rd Year · Expected graduation 2027' },
  { label: 'GPA', value: '85.09 / 100' },
  { label: 'Open to', value: 'Internships · Student roles · R&D' },
] as const;

/**
 * Condensed from the reserve-service paragraph of `bio.about` (combat medic,
 * unit of 12 → 30+). Two parts so a narrow sheet breaks after the "·", never
 * inside the phrase.
 */
const ACHIEVEMENT = ['Field medic ·', 'scaled a unit from 12 to 30+'] as const;

/** The portrait is the native face sprite at ×2. */
const FACE_SCALE = 2;
const face = pixelSprites.face;

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
    <section id="about" aria-labelledby="about-title" className="relative bg-bg-alt px-dots py-12 md:py-16 min-[100rem]:py-20">
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
            like the two panes of a game menu. */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 lg:grid-cols-12">
          <Reveal index={1} className="lg:col-span-7">
            <PixelPanel variant="paper" elevation={2} padding="lg" className="flex h-full flex-col">
              <div className="max-w-[65ch] space-y-4 text-body text-pretty text-ink">
                {paragraphs.map(text => (
                  <p key={text.slice(0, 32)}>{text}</p>
                ))}
              </div>
              {/* The bio is a first-person letter: signed at the foot of the page,
                  flush with the right edge of the text column. */}
              <p
                className="mt-auto w-full max-w-[65ch] pt-6 text-right text-display-s text-ink-muted"
                aria-hidden="true"
              >
                - Roy
              </p>
            </PixelPanel>
          </Reveal>

          <Reveal index={2} className="lg:col-span-5">
            <PixelPanel
              variant="wood"
              elevation={2}
              className="h-full"
              tab={<h3 className="text-label">Character sheet</h3>}
            >
              {/* 768-1023 the full-width sheet splits: portrait + achievement | stats. */}
              <div className="about-sheet">
                <div className="about-sheet__id flex items-center gap-4">
                  <div className="about-portrait shrink-0">
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
                    <p className="mt-2 text-body font-semibold text-accent-fg">{bio.role}</p>
                  </div>
                </div>

                <dl className="about-sheet__stats about-stats">
                  {AT_A_GLANCE.map(({ label, value }) => (
                    <div key={label} className="about-stats__row">
                      <dt className="text-hud uppercase text-fg-subtle">{label}</dt>
                      <dd className="text-body text-balance text-fg">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="about-sheet__feat about-achievement">
                  <PixelIcon name="trophy" size={24} className="shrink-0 text-accent-fg" />
                  <p className="min-w-0">
                    <span className="block text-label text-accent-fg">Achievement</span>
                    <span className="mt-1 block text-body font-semibold text-fg">
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
