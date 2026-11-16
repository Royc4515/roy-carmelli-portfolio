import type { SkillDetail } from '../lib/skillUsage';
import PixelIcon from './PixelIcon';

/** `card`: stacked, for the inline detail row (mobile). `strip`: one wrapping line (the inspector). */
export type SkillTooltipLayout = 'card' | 'strip';

/**
 * The description itself, shared by the inspector strip and the inline detail row (mobile).
 * Both layouts hold the same text in the same order; only the spacing classes differ.
 */
export function SkillTooltipBody({ detail, layout = 'card' }: { detail: SkillDetail; layout?: SkillTooltipLayout }) {
  const last = detail.usedIn.length - 1;
  const strip = layout === 'strip';
  return (
    <>
      <p className="text-label text-ink">{detail.name}</p>
      <p className={strip ? 'text-hud text-ink-muted' : 'mt-1 text-body-s text-ink-muted'}>{detail.category}</p>
      {detail.usedIn.length > 0 ? (
        <div className={strip ? 'skill-tip__used text-hud' : 'skill-tip__rule mt-3 pt-3 text-hud'}>
          <p className="uppercase text-ink-muted">
            Used in<span className="sr-only">:</span>
          </p>
          <ul role="list" className={strip ? 'skill-tip__list text-ink' : 'mt-1 space-y-1 text-ink'}>
            {detail.usedIn.map((title, i) => (
              <li key={title} className="flex items-center gap-2">
                <PixelIcon name="play" size={12} className="shrink-0 text-ink-muted" />
                <span>
                  {title}
                  {i < last && <span className="sr-only">,</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : detail.note ? (
        <p className={strip ? 'text-hud uppercase text-ink-muted' : 'skill-tip__rule mt-3 pt-3 text-hud uppercase text-ink-muted'}>
          {detail.note}
        </p>
      ) : null}
    </>
  );
}

export interface SkillTooltipProps {
  id: string;
  detail: SkillDetail;
  /** Shown when true; otherwise kept in the DOM, hidden, for `aria-describedby`. */
  open: boolean;
}

/**
 * The item's description, shown in the inspector strip of the equipment panel (Skills.css
 * places it: along the panel's bottom edge, or over the status line on short laptop screens).
 * It used to float under its item, where it covered the next rows of items and stood between
 * the pointer and them. The strip is always in the same place and covers no item.
 * Always rendered so the item's `aria-describedby` resolves; visible only while `open`.
 */
export function SkillTooltip({ id, detail, open }: SkillTooltipProps) {
  return (
    <div id={id} role="tooltip" hidden={!open} className="skill-tip px-frame px-drop-sm bg-paper text-ink">
      <SkillTooltipBody detail={detail} layout="strip" />
    </div>
  );
}

export default SkillTooltip;
