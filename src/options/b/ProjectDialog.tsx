import { useEffect, type CSSProperties } from 'react';
import { useModalDialog } from '../shared/hooks';
import { projectImage, projectLinks, splitTitle, storyParagraphs, type Project } from '../shared/content';
import { ArrowUpRight, Close } from '../shared/icons';

/** Shared by the tile and the dialog: the browser morphs one into the other (b.css). */
export const CARD_TRANSITION_NAME = 'ob-card';

interface ProjectDialogProps {
  project: Project | null;
  onClose: () => void;
}

/**
 * A project's full story: a centred panel on desktop, a bottom sheet on phones. The element
 * stays mounted (the dialog hook needs the node); its content exists only while it is open.
 */
export function ProjectDialog({ project, onClose }: ProjectDialogProps) {
  const open = project !== null;
  const ref = useModalDialog(open, onClose);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Esc would close the element natively before React knows; route it through onClose so
    // the closing morph back to the tile runs for the keyboard as well.
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [onClose, ref]);

  const title = project ? splitTitle(project.title) : null;
  const story = project ? storyParagraphs(project) : null;
  const image = project ? projectImage(project) : null;
  const links = project ? projectLinks(project) : [];

  return (
    <dialog
      ref={ref}
      className="ob-dialog"
      aria-labelledby="ob-dialog-title"
      style={open ? ({ viewTransitionName: CARD_TRANSITION_NAME } as CSSProperties) : undefined}
    >
      {project && title && story && (
        <>
          <header className="ob-dialog__head">
            <p className="ob-kicker">
              {project.kind} <span aria-hidden="true">/</span> {project.year}
              {project.status === 'in-development' && ' / In development'}
            </p>
            <button type="button" className="ob-icon-btn" onClick={onClose} aria-label="Close project details">
              <Close />
            </button>
          </header>
          <div className="ob-dialog__scroll">
            <h2 id="ob-dialog-title" className="ob-dialog__title">
              {title.name}
              {title.descriptor && <span className="ob-dialog__descriptor"> {title.descriptor}</span>}
            </h2>
            <p className="ob-dialog__lead">{story.lead}</p>
            {image && (
              <div className="ob-frame ob-dialog__media">
                <img src={image.src} srcSet={image.srcSet} sizes="(min-width: 720px) 660px, 92vw" width={image.width} height={image.height} alt={image.alt} loading="lazy" decoding="async" />
              </div>
            )}
            {project.highlights && (
              <ul className="ob-checks ob-dialog__checks">
                {project.highlights.map(h => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
            {story.body.map(paragraph => (
              <p key={paragraph} className="ob-dialog__p">
                {paragraph}
              </p>
            ))}
            <h3 className="ob-kicker ob-dialog__stack-title">Stack</h3>
            <ul className="ob-chips" role="list">
              {project.tech.map(t => (
                <li key={t} className="ob-chip">
                  {t}
                </li>
              ))}
            </ul>
            {links.length > 0 && (
              <p className="ob-dialog__links">
                {links.map(link => (
                  <a key={link.href} className="ob-btn ob-btn--ghost" href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                    <ArrowUpRight />
                    <span className="opt-sr"> (opens in a new tab)</span>
                  </a>
                ))}
              </p>
            )}
          </div>
        </>
      )}
    </dialog>
  );
}
