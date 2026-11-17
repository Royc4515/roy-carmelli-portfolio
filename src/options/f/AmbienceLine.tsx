import type { SVGProps } from 'react';
import type { AmbienceInfo, Condition, SkyMode } from './ambience';

/** Small line icons for the sky's state, drawn for this line (decorative: the text says it). */
function SkyIcon({ condition, dark, ...props }: { condition: Condition; dark: boolean } & SVGProps<SVGSVGElement>) {
  const cloud = <path d="M7 18h9.5a3.5 3.5 0 0 0 .6-6.95A5 5 0 0 0 7.6 9.6 4.2 4.2 0 0 0 7 18Z" />;
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
    cloudy: cloud,
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
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {body}
    </svg>
  );
}

const NEXT: Record<SkyMode, SkyMode> = { live: 'day', day: 'night', night: 'live' };
const MODE_LABEL: Record<SkyMode, string> = { live: 'Live', day: 'Day', night: 'Night' };

/**
 * The line that says what the sky is showing: the visitor's city, their local time, the part
 * of the day and the weather, with a button that switches between the live sky and a fixed
 * day or night. It is plain text, so it also tells a visitor who cannot see the scene.
 */
export function AmbienceLine({ info, mode, onMode }: { info: AmbienceInfo; mode: SkyMode; onMode: (mode: SkyMode) => void }) {
  const { weather } = info;
  return (
    <div className="of-ambience" data-solid="">
      <p className="of-ambience__line">
        <SkyIcon className="of-ambience__icon" condition={weather?.condition ?? 'clear'} dark={info.dark} />
        <span className="of-ambience__place of-ambience__wide">{info.city ?? 'Your local time'}</span>
        <span className="of-ambience__time">{info.time}</span>
        <span className="of-ambience__wide">{info.phase}</span>
        {weather?.label && <span className="of-ambience__wide">{weather.label}</span>}
        {weather && <span>{weather.tempC}&deg;C</span>}
        {info.festive && <span className="of-ambience__festive">{info.festive.label}</span>}
      </p>
      <button
        type="button"
        className="of-ambience__mode"
        data-mode={mode}
        onClick={() => onMode(NEXT[mode])}
        aria-label={`Sky: ${MODE_LABEL[mode]}. Switch to ${MODE_LABEL[NEXT[mode]]}`}
      >
        <span className="of-ambience__dot" aria-hidden="true" />
        {MODE_LABEL[mode]}
      </button>
    </div>
  );
}
