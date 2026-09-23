import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { skills } from '../data/bio';
import { projects } from '../data/projects';
import PixelPanel from '../components/PixelPanel';
import PixelIcon from '../components/PixelIcon';
import Character from '../components/Character';
import { SkillTooltip, SkillTooltipBody } from '../components/SkillTooltip';
import { ZoneHeader } from '../components/ui/ZoneHeader';
import { Reveal } from '../components/ui/Reveal';
import { cx } from '../components/ui/cx';
import { useIsMobile } from '../hooks/useIsMobile';
import { equipmentStats, skillDetail, type SkillDetail, type SkillGroup } from '../lib/skillUsage';
import './Skills.css';

/** How the open tooltip was opened: hover closes on leave, the others on blur / outside tap. */
type OpenVia = 'hover' | 'focus' | 'tap';

interface OpenItem {
  key: string;
  via: OpenVia;
}

/** A focus within this long after a pointer press came from that press, not the keyboard. */
const POINTER_FOCUS_MS = 600;

interface PointerMemo {
  type: string | null;
  at: number;
}

interface ItemProps {
  itemKey: string;
  tipId: string;
  detail: SkillDetail;
  open: OpenItem | null;
  setOpen: Dispatch<SetStateAction<OpenItem | null>>;
  /** < 768px: details open in an inline row under the slot, by tap or focus only. */
  inline: boolean;
  pointer: MutableRefObject<PointerMemo>;
}

function SkillItem({ itemKey, tipId, detail, open, setOpen, inline, pointer }: ItemProps) {
  const anchorRef = useRef<HTMLLIElement>(null);
  const isOpen = open?.key === itemKey;

  const closeIf = (test: (current: OpenItem) => boolean) =>
    setOpen(current => (current && current.key === itemKey && test(current) ? null : current));

  return (
    <li
      ref={anchorRef}
      className="relative"
      data-skill-item={itemKey}
      onPointerEnter={e => {
        if (e.pointerType !== 'mouse' || inline) return;
        setOpen(current => (current?.key === itemKey ? current : { key: itemKey, via: 'hover' }));
      }}
      onPointerLeave={e => {
        if (e.pointerType === 'mouse') closeIf(current => current.via === 'hover');
      }}
    >
      <button
        type="button"
        className="skill-item text-hud"
        aria-describedby={tipId}
        data-open={isOpen || undefined}
        onPointerDown={e => {
          pointer.current = { type: e.pointerType, at: Date.now() };
        }}
        onPointerUp={e => {
          pointer.current = { type: e.pointerType, at: Date.now() };
        }}
        onFocus={() => {
          // A press focuses the button too; its click decides instead.
          if (Date.now() - pointer.current.at < POINTER_FOCUS_MS) return;
          setOpen({ key: itemKey, via: 'focus' });
        }}
        onBlur={() => closeIf(current => current.via !== 'hover')}
        onClick={() => {
          const type = Date.now() - pointer.current.at < POINTER_FOCUS_MS ? pointer.current.type : null;
          pointer.current = { type: null, at: 0 };
          if (type === 'mouse' && !inline) {
            // The hover already opened it; a click keeps it open.
            setOpen(current => (current?.key === itemKey ? current : { key: itemKey, via: 'hover' }));
            return;
          }
          // Tap, pen, Enter or Space.
          setOpen(current => (current?.key === itemKey ? null : { key: itemKey, via: 'tap' }));
        }}
        onKeyDown={() => {
          pointer.current = { type: null, at: 0 };
        }}
      >
        {detail.name}
      </button>
      <SkillTooltip id={tipId} detail={detail} open={isOpen && !inline} anchorRef={anchorRef} />
    </li>
  );
}

interface SlotProps {
  group: SkillGroup;
  groupIndex: number;
  baseId: string;
  open: OpenItem | null;
  setOpen: Dispatch<SetStateAction<OpenItem | null>>;
  inline: boolean;
  pointer: MutableRefObject<PointerMemo>;
}

function SkillSlot({ group, groupIndex, baseId, open, setOpen, inline, pointer }: SlotProps) {
  const details = useMemo(
    () => group.items.map(item => skillDetail(item, group, projects)),
    [group],
  );
  const openIndex = details.findIndex((_, i) => open?.key === `${groupIndex}-${i}`);
  const inlineDetail = inline && openIndex >= 0 ? details[openIndex] : null;

  return (
    <Reveal index={groupIndex} className={cx('relative break-inside-avoid', openIndex >= 0 && 'z-10')}>
      <h3 className="text-hud uppercase">
        {/* Reads "Weapons: Languages"; the dot is visual only. */}
        <span className="text-fg-subtle">
          {group.slot}
          <span aria-hidden="true"> ·</span>
          <span className="sr-only">:</span>
        </span>{' '}
        <span className="text-accent-fg">{group.category}</span>
      </h3>
      <ul role="list" className="mt-3 flex flex-wrap gap-2">
        {details.map((detail, i) => (
          <SkillItem
            key={detail.name}
            itemKey={`${groupIndex}-${i}`}
            tipId={`${baseId}-tip-${groupIndex}-${i}`}
            detail={detail}
            open={open}
            setOpen={setOpen}
            inline={inline}
            pointer={pointer}
          />
        ))}
      </ul>
      {inlineDetail && (
        // Same text as the item's (hidden) tooltip, which is its accessible description.
        <div
          className="skill-detail px-frame px-drop-sm mt-6 bg-paper px-4 py-3 text-ink"
          aria-hidden="true"
          data-testid="skill-detail"
        >
          <SkillTooltipBody detail={inlineDetail} />
        </div>
      )}
    </Reveal>
  );
}

/** Left column: Roy in an inset well, his level and a few stats counted from the data. */
function CharacterFrame() {
  const stats = equipmentStats(skills, projects);
  return (
    <Reveal className="flex items-center gap-6 lg:sticky lg:top-24 lg:flex-col lg:items-stretch lg:gap-0 lg:self-start">
      <PixelPanel
        variant="inset"
        padding="sm"
        className="skill-well flex h-[168px] w-24 shrink-0 items-end justify-center px-0 pt-0 pb-4 lg:h-[248px] lg:w-full"
      >
        {/* Character.css sets display on the sprite itself, so the breakpoint lives on a wrapper. */}
        <div className="lg:hidden">
          <Character pose="idle" scale={2} decorative />
        </div>
        <div className="hidden lg:block">
          <Character pose="idle" scale={3} decorative />
        </div>
      </PixelPanel>
      <div className="min-w-0 flex-1 lg:mt-6">
        <p className="text-label text-accent-fg">
          Roy · LVL 3<span className="sr-only">, third-year student</span>
        </p>
        <dl className="mt-3">
          {stats.map(stat => (
            <div key={stat.label} className="skill-stat flex items-baseline justify-between gap-4 py-2">
              <dt className="text-hud uppercase text-fg-subtle">{stat.label}</dt>
              <dd className="text-hud text-fg tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Reveal>
  );
}

/**
 * Zone 03 · Equipment (SPEC §4 Skills): the skills as an RPG equipment screen. Roy stands
 * in a frame on the left; each skill category is a slot of focusable items. Hovering,
 * focusing or tapping an item opens a tooltip whose "Used in" line is computed from the
 * projects' tech lists (src/lib/skillUsage.ts), never written by hand.
 */
export default function Skills() {
  const baseId = useId();
  const inline = useIsMobile();
  const [open, setOpen] = useState<OpenItem | null>(null);
  const pointer = useRef<PointerMemo>({ type: null, at: 0 });

  const close = useCallback(() => setOpen(null), []);

  // While a tooltip is open: Esc dismisses it wherever focus is (WCAG 1.4.13), and a
  // press outside its item closes it (touch has no hover to leave).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('[data-skill-item]')?.getAttribute('data-skill-item') !== open.key) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, close]);

  // The inline row and the floating tooltip never mix.
  useEffect(() => close(), [inline, close]);

  return (
    <section id="skills" aria-labelledby="skills-title" className="relative z-[1] bg-bg px-dots py-16 md:py-24">
      <div className="relative mx-auto max-w-[1120px] px-4 md:px-6 lg:px-8">
        <Reveal>
          <ZoneHeader
            zone={3}
            name="Equipment"
            title="What I Work With"
            subtitle={
              <>
                <span className="pointer-coarse:hidden">Hover or focus</span>
                <span className="hidden pointer-coarse:inline">Tap</span> an item to see where I used
                it.
              </>
            }
            icon={<PixelIcon name="sword" size={36} />}
            id="skills-title"
          />
        </Reveal>

        <PixelPanel variant="wood" elevation={2} padding="lg">
          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
            <CharacterFrame />
            {/* Two balanced columns at xl (CSS columns, so a tall slot like Magic doesn't
                leave a hole beside it); reading and tab order stay in data order. */}
            <div className="space-y-8 xl:columns-2 xl:gap-x-10">
              {skills.map((group, i) => (
                <SkillSlot
                  key={group.slot}
                  group={group}
                  groupIndex={i}
                  baseId={baseId}
                  open={open}
                  setOpen={setOpen}
                  inline={inline}
                  pointer={pointer}
                />
              ))}
            </div>
          </div>
        </PixelPanel>
      </div>
    </section>
  );
}
