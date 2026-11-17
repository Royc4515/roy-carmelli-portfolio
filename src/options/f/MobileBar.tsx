import { useCallback, useState, type MouseEvent } from 'react';
import { bio, MAILTO } from '../shared/content';
import { useModalDialog } from '../shared/hooks';
import { ArrowRight, Close, Download, Mail, Play } from '../shared/icons';
import { chatPersona } from '../../data/chatPersona';
import { Portrait } from './AskRoy';
import { frameSection } from './frame';

export interface MobileSection {
  id: string;
  label: string;
}

interface MobileBarProps {
  sections: MobileSection[];
  /** Opens the chat; without it (chat off) the middle button writes an email instead. */
  onAsk?: () => void;
  onPlay: () => void;
  /** Only when the scene runs and motion is allowed. */
  pause?: { paused: boolean; toggle: () => void };
  reducedMotion: boolean;
}

/** Three short lines: the universal "menu" mark, drawn like the option's other icons. */
function MenuGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

/**
 * Phones only (CSS): a bar fixed to the bottom with what a recruiter reaches for on a phone,
 * the resume, a question to Pixel Roy and the way around the page. The desktop dock (pause,
 * jump, play) covered the panels' last lines and put the game first; on a phone those move
 * into the menu sheet, and tapping Roy in the scene still makes him jump.
 */
export function MobileBar({ sections, onAsk, onPlay, pause, reducedMotion }: MobileBarProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useModalDialog(open, close);

  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    // don't touch / keeps the page's own hash handler (OptionF) from framing while the sheet
    // still locks the page; the jump runs once the sheet has closed.
    e.stopPropagation();
    setOpen(false);
    requestAnimationFrame(() =>
      setTimeout(() => {
        if (frameSection(id, !reducedMotion)) history.replaceState(null, '', `#${id}`);
      }, 0),
    );
  };

  return (
    <>
      <nav className="of-mbar" data-solid="" aria-label="Quick actions">
        <a className="of-mbar__btn of-mbar__btn--primary" href={bio.resume.href} download={bio.resume.fileName}>
          <Download />
          <span>Resume</span>
        </a>
        {onAsk ? (
          <button type="button" className="of-mbar__btn" onClick={onAsk}>
            <Portrait size="sm" />
            <span>Ask Roy</span>
            <span className="opt-sr">: chat with {chatPersona.name}, an AI version of Roy</span>
          </button>
        ) : (
          <a className="of-mbar__btn" href={MAILTO}>
            <Mail />
            <span>Email</span>
          </a>
        )}
        <button type="button" className="of-mbar__btn" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
          <MenuGlyph />
          <span>Menu</span>
        </button>
      </nav>

      <dialog ref={ref} className="of-sheet" aria-labelledby="of-sheet-title">
        <div className="of-sheet__head">
          <h2 className="of-sheet__title" id="of-sheet-title">{bio.name}</h2>
          <button type="button" className="of-icon-btn" onClick={close} aria-label="Close menu">
            <Close />
          </button>
        </div>
        <ul className="of-sheet__links">
          {sections.map(s => (
            <li key={s.id}>
              <a href={`#${s.id}`} onClick={e => go(e, s.id)}>
                {s.label}
                <ArrowRight aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <div className="of-sheet__extra">
          <button type="button" className="of-btn" onClick={() => { setOpen(false); onPlay(); }}>
            <Play />
            Play Roy Runner
          </button>
          {pause && (
            <button type="button" className="of-btn" onClick={pause.toggle} aria-pressed={pause.paused}>
              {pause.paused ? <Play /> : <span className="of-pause" aria-hidden="true" />}
              {pause.paused ? 'Resume scene' : 'Pause scene'}
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
