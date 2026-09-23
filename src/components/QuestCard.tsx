import { useState } from 'react';
import type { Project } from '../types/index';
import PixelPanel from './PixelPanel';
import PixelIcon from './PixelIcon';
import ItemSprite, { itemForProject, type ItemScale } from './ItemSprite';
import { Button } from './ui/Button';
import { Chip, ChipList } from './ui/Chip';
import { cx } from './ui/cx';
import '../sections/Projects.css';

/** A real product screenshot shown in a pixel monitor bezel instead of an item. */
export interface QuestScreenshot {
  src: string;
  srcSet: string;
  sizes: string;
  width: number;
  height: number;
  alt: string;
}

/** Screenshots by project id. Every other project shows its inventory item. */
export const QUEST_SCREENSHOTS: Readonly<Record<string, QuestScreenshot>> = {
  'ai-sidebar': {
    src: '/assets/projects/aside-1280.webp',
    srcSet: '/assets/projects/aside-640.webp 640w, /assets/projects/aside-1280.webp 1280w',
    // lg: 7/12 of the card minus the backdrop margins · md: full card · mobile: full width.
    sizes: '(min-width: 1024px) 540px, (min-width: 768px) 656px, calc(100vw - 80px)',
    width: 1280,
    height: 720,
    alt: 'Aside landing page: "Every AI model. One sidebar." beside a preview of the sidebar open next to a web page.',
  },
};

export type QuestCardLayout = 'feature' | 'standard';

export interface QuestCardProps {
  project: Project;
  /**
   * `feature`: the lead main quest; visual left (7/12) and text right (5/12) from 1024px.
   * `standard` (default): visual on top. Side quests ignore it.
   */
  layout?: QuestCardLayout;
  className?: string;
}

const questTitleId = (project: Project) => `quest-${project.id}-title`;
const questLogId = (project: Project) => `quest-${project.id}-log`;

/** Accessible names for the external links: visible label first, then the project. */
export function liveLabel(title: string): string {
  return `Live demo: ${title} (opens in a new tab)`;
}

export function codeLabel(title: string): string {
  return `Code on GitHub: ${title} (opens in a new tab)`;
}

/**
 * Splits "Aside - AI Sidebar" into a name and a subtitle so a long pixel title never breaks
 * mid-phrase. Titles without " - " have no subtitle.
 */
export function splitTitle(title: string): { name: string; subtitle?: string } {
  const at = title.indexOf(' - ');
  if (at <= 0) return { name: title };
  const subtitle = title.slice(at + 3).trim();
  return subtitle ? { name: title.slice(0, at), subtitle } : { name: title };
}

/** "Website + game engine · 2026", with the last word held to the year so it never wraps alone. */
export function metaLine(project: Pick<Project, 'kind' | 'year'>): string {
  return `${project.kind}\u00a0·\u00a0${project.year}`;
}

type Surface = 'paper' | 'wood';

const SLOT_SIZE: Record<ItemScale, 'sm' | 'md' | 'lg' | 'xl'> = { 1: 'sm', 2: 'md', 4: 'lg', 6: 'xl' };

/** An inventory item in its inset plate (surface-sunken well with a 2px border-subtle line). */
export function ItemSlot({ project, scale, className }: { project: Project; scale: ItemScale; className?: string }) {
  const item = itemForProject(project.id);
  if (!item) return null;
  return (
    <span className={cx('item-slot', `item-slot--${SLOT_SIZE[scale]}`, className)}>
      <ItemSprite name={item} scale={scale} className="item-slot__sprite" />
    </span>
  );
}

function TierTag({ tier, surface }: { tier: 'main' | 'side'; surface: Surface }) {
  return (
    <span className={cx('quest-tag text-label', surface === 'paper' ? 'quest-tag--paper' : 'quest-tag--wood')}>
      <PixelIcon name="star" size={12} />
      <span className="quest-tag__label">{tier === 'main' ? 'Main quest' : 'Side quest'}</span>
    </span>
  );
}

function StatusChip({ surface }: { surface: Surface }) {
  return (
    <Chip tone="accent" surface={surface === 'paper' ? 'paper' : 'dark'} className="gap-2 uppercase">
      <span className="size-2 flex-none bg-accent" aria-hidden="true" />
      In development
    </Chip>
  );
}

function QuestMeta({ project, surface }: { project: Project; surface: Surface }) {
  return (
    <p className={cx('text-hud uppercase', surface === 'paper' ? 'text-ink-muted' : 'text-fg-subtle')}>
      {metaLine(project)}
    </p>
  );
}

/**
 * The pixel title, with anything after " - " as a Plex subtitle line. The accessible name
 * stays the full title (a visually hidden " - " joins the two).
 */
function QuestTitle({
  id,
  title,
  nameClass,
  subtitleClass,
  className,
}: {
  id: string;
  title: string;
  nameClass: string;
  subtitleClass: string;
  className?: string;
}) {
  const { name, subtitle } = splitTitle(title);
  return (
    <h3 id={id} className={cx('[overflow-wrap:break-word]', className)}>
      <span className={cx('block', nameClass)}>{name}</span>
      {subtitle && (
        <>
          {/* The spaces live outside the hidden span so name computation keeps them. */}{' '}
          <span className="sr-only">-</span>{' '}
          <span className={cx('quest-subtitle mt-1 block font-sans font-semibold', subtitleClass)}>
            {subtitle}
          </span>
        </>
      )}
    </h3>
  );
}

/** The screenshot in a monitor: 4px ink screen frame inside a 4px wood casing with a chin. */
function Monitor({ shot }: { shot: QuestScreenshot }) {
  return (
    <div className="quest-monitor">
      <img
        src={shot.src}
        srcSet={shot.srcSet}
        sizes={shot.sizes}
        width={shot.width}
        height={shot.height}
        alt={shot.alt}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  );
}

/** Dotted backdrop holding the screenshot (feature) or the item at x6 (standard). */
function QuestVisual({ project, layout }: { project: Project; layout: QuestCardLayout }) {
  const shot = QUEST_SCREENSHOTS[project.id];
  return (
    <div
      className={cx(
        'quest-visual relative grid place-items-center overflow-hidden bg-bg px-dots',
        shot ? 'quest-visual--screen' : 'quest-visual--item',
        layout === 'feature' && 'quest-visual--feature',
      )}
    >
      {shot ? <Monitor shot={shot} /> : <ItemSlot project={project} scale={6} className="relative" />}
    </div>
  );
}

/**
 * Live · Code · Quest log. Main quests keep them on one row; side quests (too narrow for
 * three arcade buttons) put the links on one row and the quest log on the next, the same in
 * every card so the rows line up (`stacked`). Projects.css also stacks the two side-by-side
 * main quests between 768 and 1023px.
 */
function QuestActions({
  project,
  open,
  onToggle,
  stacked,
}: {
  project: Project;
  open: boolean;
  onToggle: () => void;
  stacked: boolean;
}) {
  const links = (
    <>
      {project.live && (
        <Button
          href={project.live}
          external
          trailingIcon={<PixelIcon name="external" size={12} />}
          aria-label={liveLabel(project.title)}
        >
          Live
        </Button>
      )}
      {project.github && (
        <Button
          href={project.github}
          external
          variant="secondary"
          leadingIcon={<PixelIcon name="code" size={12} />}
          aria-label={codeLabel(project.title)}
        >
          Code
        </Button>
      )}
    </>
  );
  const log = (
    <Button
      variant="ghost"
      aria-expanded={open}
      aria-controls={questLogId(project)}
      aria-label={`Quest log: ${project.title}`}
      onClick={onToggle}
      trailingIcon={<PixelIcon name="chevron" size={12} className="quest-log-chevron" />}
      className="quest-log-toggle"
    >
      Quest log
    </Button>
  );
  // The links wrapper is `display: contents` when everything shares one row.
  return (
    <div className={cx('quest-actions', stacked && 'quest-actions--stacked')}>
      <div className="quest-actions__links">{links}</div>
      {log}
    </div>
  );
}

function QuestLog({ project, open, surface }: { project: Project; open: boolean; surface: Surface }) {
  return (
    <div
      id={questLogId(project)}
      hidden={!open}
      className={cx('quest-log', surface === 'paper' ? 'quest-log--paper' : 'quest-log--wood')}
    >
      <p className="max-w-[68ch] text-body">{project.description}</p>
    </div>
  );
}

/**
 * A project as a quest card (SPEC §4 Projects). Main quests are parchment cards with a
 * visual (screenshot or item showcase), highlights and the full action row; side quests are
 * compact wood cards with the item in a slot. Both end with a "Quest log" disclosure that
 * holds the full description.
 *
 * The card's parts are direct children of the article, so a parent grid can align them
 * across cards with `grid-rows-subgrid` (see Projects.css).
 */
export default function QuestCard({ project, layout = 'standard', className }: QuestCardProps) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(o => !o);
  const titleId = questTitleId(project);

  if (project.tier === 'main') {
    const body = (
      <>
        <div className="quest-row quest-row--meta">
          <TierTag tier="main" surface="paper" />
          <QuestMeta project={project} surface="paper" />
          {project.status === 'in-development' && <StatusChip surface="paper" />}
        </div>
        <QuestTitle
          id={titleId}
          title={project.title}
          className="quest-title text-ink"
          nameClass={layout === 'feature' ? 'text-display-m' : 'text-display-s lg:text-display-m'}
          // Never larger than the pixel name above it: 16 while the name is 16, 20 once it is 24.
          subtitleClass={cx(
            'text-body text-ink-muted',
            layout === 'feature' ? 'md:text-[1.25rem] md:leading-7' : 'lg:text-[1.25rem] lg:leading-7',
          )}
        />
        <p className="quest-tagline text-body text-ink">{project.tagline}</p>
        <ul role="list" className="quest-highlights">
          {(project.highlights ?? []).map(h => (
            <li key={h} className="flex gap-3 text-body text-ink">
              {/* One body line tall, so the bullet centres on the first line. */}
              <span className="flex h-[1.625rem] flex-none items-center text-ink-muted" aria-hidden="true">
                <PixelIcon name="play" size={12} />
              </span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
        <ChipList
          items={project.tech}
          accentCount={3}
          max={5}
          surface="paper"
          aria-label="Built with"
          className="quest-chips"
        />
        <QuestActions project={project} open={open} onToggle={toggle} stacked={false} />
        <QuestLog project={project} open={open} surface="paper" />
      </>
    );

    return (
      <PixelPanel
        as="article"
        variant="paper"
        elevation={2}
        aria-labelledby={titleId}
        className={cx('quest-card quest-card--main', `quest-card--${layout}`, className)}
      >
        <QuestVisual project={project} layout={layout} />
        {layout === 'feature' ? <div className="quest-body">{body}</div> : body}
      </PixelPanel>
    );
  }

  return (
    <PixelPanel
      as="article"
      variant="wood"
      elevation={1}
      aria-labelledby={titleId}
      className={cx('quest-card quest-card--side', className)}
    >
      <div className="quest-row quest-row--head">
        <ItemSlot project={project} scale={2} />
        {/* No min-w-0: the tag never shrinks, so on a narrow card this block wraps under the slot. */}
        <div className="flex flex-1 flex-col items-start gap-2">
          <TierTag tier="side" surface="wood" />
          <QuestMeta project={project} surface="wood" />
        </div>
      </div>
      <QuestTitle
        id={titleId}
        title={project.title}
        className="quest-title text-fg"
        nameClass="text-display-s"
        subtitleClass="text-body text-accent-fg"
      />
      <div className="quest-tagline flex flex-col items-start gap-3">
        {project.status === 'in-development' && <StatusChip surface="wood" />}
        <p className="text-body text-fg">{project.tagline}</p>
      </div>
      <ChipList items={project.tech} accentCount={3} max={5} aria-label="Built with" className="quest-chips" />
      <QuestActions project={project} open={open} onToggle={toggle} stacked />
      <QuestLog project={project} open={open} surface="wood" />
    </PixelPanel>
  );
}

/**
 * One research log: a compact list row with the item at x1, kind · year, the title, tagline
 * and a Code link. Render inside a `<ul>`.
 */
export function ResearchLogItem({ project }: { project: Project }) {
  return (
    <li className="research-log">
      <ItemSlot project={project} scale={1} />
      <div className="min-w-0">
        <p className="text-hud uppercase text-fg-subtle">{metaLine(project)}</p>
        <QuestTitle
          id={questTitleId(project)}
          title={project.title}
          className="mt-2 text-fg"
          nameClass="text-display-s"
          subtitleClass="text-body text-accent-fg"
        />
        <p className="mt-2 max-w-[68ch] text-body text-fg-muted">{project.tagline}</p>
      </div>
      {project.github && (
        <Button
          href={project.github}
          external
          variant="secondary"
          leadingIcon={<PixelIcon name="code" size={12} />}
          aria-label={codeLabel(project.title)}
          className="research-log__action"
        >
          Code
        </Button>
      )}
    </li>
  );
}
