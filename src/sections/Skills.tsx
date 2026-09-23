import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { skills } from '../data/bio';
import { projects } from '../data/projects';
import PixelPanel from '../components/PixelPanel';
import PixelIcon, { type PixelIconName } from '../components/PixelIcon';
import Character from '../components/Character';
import { SkillTooltip, SkillTooltipBody } from '../components/SkillTooltip';
import { ZoneHeader } from '../components/ui/ZoneHeader';
import { Reveal } from '../components/ui/Reveal';
import { cx } from '../components/ui/cx';
import { useIsMobile } from '../hooks/useIsMobile';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { equipmentStats, skillDetail, type SkillDetail, type SkillGroup } from '../lib/skillUsage';
import { moveInGrid, splitColumns, type GridPos } from '../lib/equipmentGrid';
import './Skills.css';

/** Slot heading icons (12px, existing set). Armor is the body slot, hence `person`. */
const SLOT_ICONS: Readonly<Record<string, PixelIconName>> = {
  Weapons: 'sword',
  Armor: 'person',
  Magic: 'star',
  Potions: 'potion',
  Tomes: 'book',
  Trinkets: 'gear',
  Achievements: 'trophy',
};

const ROW_LENGTHS = skills.map(group => group.items.length);
/** First slot of the right-hand column (≥ 1280px). A fixed split, so opening a tooltip can
    never rebalance the columns (CSS columns did, and the page jumped under the pointer). */
const SPLIT = splitColumns(ROW_LENGTHS);
const COLUMNS = [
  { first: 0, groups: skills.slice(0, SPLIT) },
  { first: SPLIT, groups: skills.slice(SPLIT) },
].filter(column => column.groups.length > 0);

const cellKey = ({ row, col }: GridPos) => `${row}-${col}`;

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
  pos: GridPos;
  tipId: string;
  detail: SkillDetail;
  /** The grid's single Tab stop (roving tabindex). */
  active: boolean;
  setActive: (pos: GridPos) => void;
  open: OpenItem | null;
  setOpen: Dispatch<SetStateAction<OpenItem | null>>;
  /** < 768px: details open in an inline row under the slot, by tap or focus only. */
  inline: boolean;
  pointer: MutableRefObject<PointerMemo>;
}

function SkillItem({ pos, tipId, detail, active, setActive, open, setOpen, inline, pointer }: ItemProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const itemKey = cellKey(pos);
  const isOpen = open?.key === itemKey;

  const closeIf = (test: (current: OpenItem) => boolean) =>
    setOpen(current => (current && current.key === itemKey && test(current) ? null : current));

  return (
    <div
      ref={anchorRef}
      role="gridcell"
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
        tabIndex={active ? 0 : -1}
        aria-describedby={tipId}
        data-open={isOpen || undefined}
        onPointerDown={e => {
          pointer.current = { type: e.pointerType, at: Date.now() };
        }}
        onPointerUp={e => {
          pointer.current = { type: e.pointerType, at: Date.now() };
        }}
        onFocus={() => {
          setActive(pos);
          // A press focuses the button too; its click decides instead.
          if (Date.now() - pointer.current.at < POINTER_FOCUS_MS) return;
          setOpen({ key: itemKey, via: 'focus' });
        }}
        onBlur={() => closeIf(current => current.via !== 'hover')}
        onClick={() => {
          setActive(pos);
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
        <span className="skill-item__label">{detail.name}</span>
      </button>
      <SkillTooltip id={tipId} detail={detail} open={isOpen && !inline} anchorRef={anchorRef} />
    </div>
  );
}

interface SlotProps {
  group: SkillGroup;
  row: number;
  baseId: string;
  active: GridPos;
  setActive: (pos: GridPos) => void;
  open: OpenItem | null;
  setOpen: Dispatch<SetStateAction<OpenItem | null>>;
  inline: boolean;
  pointer: MutableRefObject<PointerMemo>;
}

/** One slot = one grid row: its heading is the row header, its items are the cells. */
function SkillSlot({ group, row, baseId, active, setActive, open, setOpen, inline, pointer }: SlotProps) {
  const details = useMemo(
    () => group.items.map(item => skillDetail(item, group, projects)),
    [group],
  );
  const openIndex = details.findIndex((_, col) => open?.key === cellKey({ row, col }));
  const inlineDetail = inline && openIndex >= 0 ? details[openIndex] : null;
  const icon = SLOT_ICONS[group.slot];

  return (
    <Reveal
      index={row}
      role="row"
      className={cx(
        'relative short:col-span-2 short:grid short:grid-cols-subgrid short:items-start',
        openIndex >= 0 && 'z-10',
      )}
    >
      <div role="rowheader" className="skill-slot__header">
        <h3 className="flex items-center gap-2 text-hud uppercase">
          {icon && <PixelIcon name={icon} size={12} className="skill-slot__icon shrink-0" />}
          <span>
            {/* Reads "Weapons: Languages"; the dot is visual only. */}
            <span className="text-fg-subtle">
              {group.slot}
              <span aria-hidden="true"> ·</span>
              <span className="sr-only">:</span>
            </span>{' '}
            <span className="text-accent-fg">{group.category}</span>
          </span>
        </h3>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 short:mt-0 short:gap-x-(--skill-gap-x) short:gap-y-(--skill-row-gap)">
        {details.map((detail, col) => (
          <SkillItem
            key={detail.name}
            pos={{ row, col }}
            tipId={`${baseId}-tip-${row}-${col}`}
            detail={detail}
            active={active.row === row && active.col === col}
            setActive={setActive}
            open={open}
            setOpen={setOpen}
            inline={inline}
            pointer={pointer}
          />
        ))}
      </div>
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

/** A 20px keycap for the controls hint. */
function Keycap({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <span className={cx('skill-key', wide && 'skill-key--wide')}>{children}</span>;
}

/**
 * Left column (≥ 768px; phones skip it, Roy already stands in Hero, About and Contact):
 * Roy in an inset well, his level, a few stats counted from the data, and the grid's
 * controls, shown while the grid has keyboard focus.
 *
 * Short laptop screens (`short:`): a status line over the slots instead. The well goes (Roy
 * stands in Hero and Contact too); the level sits in the slot-heading column, the stats and
 * the keycap hint in the item column (the frame joins the panel's subgrid, see Skills).
 */
function CharacterFrame() {
  const stats = equipmentStats(skills, projects);
  const wide = useMediaQuery('(min-width: 1024px)');
  return (
    <Reveal className="skill-status hidden items-center gap-6 md:flex lg:sticky lg:top-24 lg:flex-col lg:items-stretch lg:gap-0 lg:self-start short:relative short:top-auto short:col-span-2 short:grid short:grid-cols-subgrid short:items-center short:gap-x-(--skill-col-gap) short:self-auto">
      <PixelPanel
        variant="inset"
        padding="sm"
        className="skill-well flex h-[168px] w-24 shrink-0 items-end justify-center px-0 pt-0 pb-4 lg:h-[248px] lg:w-full short:hidden"
      >
        <Character pose="idle" scale={wide ? 3 : 2} decorative />
      </PixelPanel>
      <div className="min-w-0 flex-1 lg:mt-6 short:contents">
        <p className="text-label text-accent-fg short:col-start-1 short:row-start-1">
          Roy · LVL 3<span className="sr-only">, third-year student</span>
        </p>
        <dl className="mt-3 short:col-start-2 short:row-start-1 short:mt-0 short:flex short:items-center">
          {stats.map(stat => (
            <div
              key={stat.label}
              className="skill-stat flex items-baseline justify-between gap-4 py-2 short:gap-2 short:py-0"
            >
              <dt className="text-hud uppercase text-fg-subtle">{stat.label}</dt>
              <dd className="text-hud text-fg tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
        {/* Visual only: screen readers announce the grid and its keys themselves. */}
        <div
          className="skill-keys mt-4 text-hud uppercase text-fg-subtle short:col-start-2 short:row-start-1 short:-my-0.5 short:justify-self-end"
          aria-hidden="true"
          data-testid="skill-keys"
        >
          <span className="flex items-center gap-1">
            <Keycap>
              <PixelIcon name="arrow-up" size={12} className="-rotate-90" />
            </Keycap>
            <Keycap>
              <PixelIcon name="arrow-up" size={12} className="rotate-90" />
            </Keycap>
            <Keycap>
              <PixelIcon name="arrow-up" size={12} />
            </Keycap>
            <Keycap>
              <PixelIcon name="arrow-down" size={12} />
            </Keycap>
            <span className="ml-1">Move</span>
          </span>
          <span className="flex items-center gap-1">
            <Keycap wide>Esc</Keycap>
            <span className="ml-1">Close</span>
          </span>
        </div>
      </div>
    </Reveal>
  );
}

/**
 * Zone 03 · Equipment (SPEC §4 Skills): the skills as an RPG equipment screen. Roy stands
 * in a frame on the left; each skill category is a slot of items. On short laptop screens
 * (`short:`, CSS only) it becomes a compact inventory that fits one screen: a status line,
 * then one line of items per slot beside its heading. Hovering, focusing or
 * tapping an item opens a tooltip whose "Used in" line is computed from the projects' tech
 * lists (src/lib/skillUsage.ts), never written by hand.
 *
 * Keyboard: the slots form one ARIA layout grid (row = slot, cell = item) with a roving
 * tabindex, so the whole screen is a single Tab stop. Arrows move between items (Left /
 * Right in a slot, Up / Down across slots), Home / End go to the ends of a slot, Ctrl +
 * Home / End to the ends of the grid (src/lib/equipmentGrid.ts). The tooltip follows focus;
 * Esc closes it.
 */
export default function Skills() {
  const baseId = useId();
  const inline = useIsMobile();
  const gridRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<OpenItem | null>(null);
  const [active, setActiveState] = useState<GridPos>({ row: 0, col: 0 });
  const pointer = useRef<PointerMemo>({ type: null, at: 0 });
  /** Sticky column: where the last Up / Down landed and the column it was aiming for. */
  const sticky = useRef<(GridPos & { preferred: number }) | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const setActive = useCallback(
    (pos: GridPos) =>
      setActiveState(current => (current.row === pos.row && current.col === pos.col ? current : pos)),
    [],
  );

  const onGridKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.shiftKey) return;
    // Ctrl/Cmd + arrow belongs to the browser (Cmd+Left/Right is Back/Forward on macOS);
    // only Ctrl+Home/End have a grid meaning.
    if ((e.ctrlKey || e.metaKey) && e.key.startsWith('Arrow')) return;
    const cell = e.target instanceof Element ? e.target.closest('[data-skill-item]') : null;
    if (!cell) return;
    const [row, col] = (cell.getAttribute('data-skill-item') ?? '0-0').split('-').map(Number);
    const vertical = e.key === 'ArrowUp' || e.key === 'ArrowDown';
    const memo = sticky.current;
    const preferredCol = vertical && memo && memo.row === row && memo.col === col ? memo.preferred : col;
    const next = moveInGrid(ROW_LENGTHS, { row, col }, e.key, {
      ctrl: e.ctrlKey || e.metaKey,
      preferredCol,
    });
    if (!next) return;
    e.preventDefault();
    sticky.current = vertical ? { ...next, preferred: preferredCol } : null;
    if (next.row === row && next.col === col) return;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-skill-item="${cellKey(next)}"] button`)
      ?.focus();
  };

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
    <section id="skills" aria-labelledby="skills-title" className="relative z-[1] bg-bg px-dots py-12 md:py-16 min-[100rem]:py-20 short:py-6">
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

        {/* Short laptop screens: a compact inventory, one line per slot. One grid of two
            columns (slot headings, items) shared through subgrids by the status line and every
            slot row; the column wrappers dissolve (`contents`), so the slots stack in data order,
            the order the arrow keys already follow. */}
        <PixelPanel
          variant="wood"
          elevation={2}
          padding="lg"
          className="skill-panel short:px-4 short:pt-(--skill-panel-pt) short:pb-(--skill-panel-pb)"
        >
          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 short:grid-cols-[max-content_minmax(0,1fr)] short:gap-x-(--skill-col-gap) short:gap-y-(--skill-status-gap)">
            <CharacterFrame />
            {/* Two fixed columns at xl; reading, Tab and arrow order stay in data order. */}
            <div
              ref={gridRef}
              role="grid"
              aria-label="Equipment"
              className="skill-grid grid items-start gap-8 xl:grid-cols-2 xl:gap-x-10 short:col-span-2 short:grid-cols-subgrid short:gap-x-(--skill-col-gap) short:gap-y-(--skill-row-gap)"
              onKeyDown={onGridKeyDown}
            >
              {COLUMNS.map(column => (
                <div key={column.first} className="space-y-8 short:contents short:space-y-0">
                  {column.groups.map((group, i) => (
                    <SkillSlot
                      key={group.slot}
                      group={group}
                      row={column.first + i}
                      baseId={baseId}
                      active={active}
                      setActive={setActive}
                      open={open}
                      setOpen={setOpen}
                      inline={inline}
                      pointer={pointer}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </PixelPanel>
      </div>
    </section>
  );
}
