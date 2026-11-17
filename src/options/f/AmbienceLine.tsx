import { useEffect, useId, useState, type SVGProps } from 'react';
import type { AmbienceInfo, Condition, SkyMode } from './ambience';

/** Small line icons for the sky's state, drawn for this card (decorative: the text says it). */
function SkyIcon({ condition, dark, ...props }: { condition: Condition; dark: boolean } & SVGProps<SVGSVGElement>) {
  const body = {
    clear: dark ? (
      <path d="M19.5 14.2A7.6 7.6 0 0 1 9.8 4.5a7.6 7.6 0 1 0 9.7 9.7Z" />
    ) : (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
      </>
    ),
    partly: (
      <>
        {dark ? <path d="M17.5 8.5a4 4 0 0 1-5-4.6 4.2 4.2 0 1 0 5 4.6Z" /> : <><circle cx="8.5" cy="8" r="3" /><path d="M8.5 2.5v1.2M3 8h1.2M4.6 4.1l.9.9M12.4 4.1l-.9.9" /></>}
        <path d="M9 19h8a3 3 0 0 0 .4-5.97A4.3 4.3 0 0 0 9.3 12 3.6 3.6 0 0 0 9 19Z" />
      </>
    ),
    cloudy: <path d="M7 18h9.5a3.5 3.5 0 0 0 .6-6.95A5 5 0 0 0 7.6 9.6 4.2 4.2 0 0 0 7 18Z" />,
    fog: <path d="M4 9h13M7 13h13M4 17h11" />,
    rain: (
      <>
        <path d="M7 15h9.5a3.5 3.5 0 0 0 .6-6.95A5 5 0 0 0 7.6 6.6 4.2 4.2 0 0 0 7 15Z" />
        <path d="M9 18.5 8 21M13 18.5 12 21M17 18.5 16 21" />
      </>
    ),
    snow: (
      <>
        <path d="M7 14h9.5a3.5 3.5 0 0 0 .6-6.95A5 5 0 0 0 7.6 5.6 4.2 4.2 0 0 0 7 14Z" />
        <path d="M8.5 18h.01M12 20h.01M15.5 18h.01M12 17h.01" strokeWidth="2.4" />
      </>
    ),
    storm: (
      <>
        <path d="M7 14h9.5a3.5 3.5 0 0 0 .6-6.95A5 5 0 0 0 7.6 5.6 4.2 4.2 0 0 0 7 14Z" />
        <path d="m12.5 15.5-2 3.2h3l-2 3.3" />
      </>
    ),
  }[condition];
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {body}
    </svg>
  );
}

const Glyph = ({ d, ...props }: { d: string } & SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
    <path d={d} />
  </svg>
);
const PIN = 'M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z';
const SUNRISE = 'M4 18h16M7 14a5 5 0 0 1 10 0M12 4v5M9.5 6.5 12 4l2.5 2.5';
const SUNSET = 'M4 18h16M7 14a5 5 0 0 1 10 0M12 9V4M9.5 6.5 12 9l2.5-2.5';
const WIND = 'M3 9h10a2.5 2.5 0 1 0-2.5-2.5M3 13h14a2.5 2.5 0 1 1-2.5 2.5M3 17h6';
const CHEVRON = 'm6 9 6 6 6-6';

const MODES: readonly SkyMode[] = ['live', 'day', 'night'];
const MODE_LABEL: Record<SkyMode, string> = { live: 'Live', day: 'Day', night: 'Night' };

/**
 * The ambience card: what the sky is showing, in words. The visitor's local time and date
 * (Gregorian and Hebrew), their city, the part of the day, the weather with sunrise and
 * sunset, and a switch between the live sky and a fixed day or night. It is one slim bar
 * (time, date, place, temperature) that opens into the full card on request, so it never
 * covers the scene unasked.
 */
export function AmbienceLine({ info, mode, onMode }: { info: AmbienceInfo; mode: SkyMode; onMode: (mode: SkyMode) => void }) {
  const { weather } = info;
  const id = useId();
  // Closed until asked: the bar already says the essentials, and the scene stays in view.
  const [open, setOpen] = useState(false);
  // Esc closes it, like any popover.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <aside className="of-ambience" data-solid="" data-open={open ? '' : undefined} aria-label="Sky, time and weather">
      <button
        type="button"
        className="of-ambience__bar"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
      >
        <SkyIcon className="of-ambience__icon" condition={weather?.condition ?? 'clear'} dark={info.dark} />
        <span className="of-ambience__time">{info.time}</span>
        <span className="of-ambience__more">{info.dateShort}</span>
        {info.city && <span className="of-ambience__more">{info.city.split(',')[0]}</span>}
        {weather && <span className="of-ambience__temp">{weather.tempC}&deg;</span>}
        <span className="of-ambience__live" data-mode={mode}>
          <span className="of-ambience__dot" aria-hidden="true" />
          <span className="of-ambience__mode">{MODE_LABEL[mode]}</span>
        </span>
        <Glyph className="of-ambience__chevron" d={CHEVRON} />
        <span className="opt-sr">Sky details</span>
      </button>

      <div className="of-ambience__panel" id={id} hidden={!open}>
        <p className="of-ambience__date">
          {info.date}
          {info.hebrewDate && <span>{info.hebrewDate}</span>}
        </p>
        {info.festive && <p className="of-ambience__festive">{info.festive.label}</p>}
        <dl className="of-ambience__facts">
          <div>
            <dt><Glyph d={PIN} /><span className="opt-sr">Place</span></dt>
            <dd>{info.city ?? 'Your local time'}</dd>
          </div>
          <div>
            <dt><SkyIcon condition={weather?.condition ?? 'clear'} dark={info.dark} /><span className="opt-sr">Sky</span></dt>
            <dd>
              {info.phase}
              {weather?.label ? `, ${weather.label.toLowerCase()}` : ''}
            </dd>
          </div>
          {weather && (
            <div>
              <dt><Glyph d={WIND} /><span className="opt-sr">Wind</span></dt>
              <dd>{weather.windKmh} km/h</dd>
            </div>
          )}
          {info.sunrise && info.sunset && (
            <div className="of-ambience__sun">
              <dt><Glyph d={SUNRISE} /><span className="opt-sr">Sunrise</span></dt>
              <dd>{info.sunrise}</dd>
              <dt><Glyph d={SUNSET} /><span className="opt-sr">Sunset</span></dt>
              <dd>{info.sunset}</dd>
            </div>
          )}
        </dl>
        <div className="of-ambience__modes" role="group" aria-label="Sky">
          {MODES.map(option => (
            <button key={option} type="button" aria-pressed={mode === option} onClick={() => onMode(option)}>
              {MODE_LABEL[option]}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
