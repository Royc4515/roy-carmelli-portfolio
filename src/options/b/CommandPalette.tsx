import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useModalDialog } from '../shared/hooks';
import { Search } from '../shared/icons';

export interface Command {
  id: string;
  group: string;
  label: string;
  /** Extra words the filter matches, never shown. */
  keywords?: string;
  icon?: ReactNode;
  /** A short note at the end of the row, e.g. the address a command copies. */
  hint?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

/** Every word of the query must appear somewhere in the label, group or keywords. */
export function filterCommands(commands: Command[], query: string): Command[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return commands;
  return commands.filter(command => {
    const haystack = `${command.label} ${command.group} ${command.keywords ?? ''}`.toLowerCase();
    return words.every(word => haystack.includes(word));
  });
}

/**
 * Hand-built command palette (no dependency): a modal <dialog> holding a combobox input that
 * owns a grouped listbox. Focus never leaves the input; `aria-activedescendant` moves instead,
 * which is the WAI-ARIA pattern screen readers expect here.
 */
export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const ref = useModalDialog(open, onClose);
  return (
    <dialog ref={ref} className="ob-palette" aria-label="Command palette">
      {/* Mounted per opening, so the query and highlight always start clean. Resetting them in
          an effect instead lost a race with a fast typist's first keystrokes. */}
      {open && <PaletteBody onClose={onClose} commands={commands} />}
    </dialog>
  );
}

function PaletteBody({ onClose, commands }: Omit<CommandPaletteProps, 'open'>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);
  const groups = useMemo(() => {
    const byGroup = new Map<string, Command[]>();
    for (const command of results) {
      byGroup.set(command.group, [...(byGroup.get(command.group) ?? []), command]);
    }
    return [...byGroup.entries()];
  }, [results]);

  // The list can shrink under the highlighted row while typing.
  const activeIndex = Math.min(active, Math.max(0, results.length - 1));
  const optionId = (index: number) => `${uid}-opt-${index}`;

  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    // Optional call: jsdom has no scrollIntoView.
    row?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, results]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    // Close for real first (flushSync runs the dialog hook's effect now): closing a modal
    // restores focus to the opener, which would undo a command that moves focus or opens
    // another dialog if it ran before that.
    flushSync(onClose);
    window.setTimeout(command.run, 0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = results.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive(activeIndex >= last ? 0 : activeIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive(activeIndex <= 0 ? last : activeIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        event.preventDefault();
        setActive(last);
        break;
      case 'Enter':
        event.preventDefault();
        run(results[activeIndex]);
        break;
      default:
    }
  };

  let index = -1;
  return (
    <>
          <div className="ob-palette__field">
            <Search className="ob-palette__icon" />
            <input
              ref={inputRef}
              className="ob-palette__input"
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={`${uid}-list`}
              aria-activedescendant={results.length ? optionId(activeIndex) : undefined}
              aria-autocomplete="list"
              aria-label="Search commands"
              placeholder="Type a command or search"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
            />
            <button type="button" className="ob-palette__esc" onClick={onClose} aria-label="Close command palette">
              <kbd>Esc</kbd>
            </button>
          </div>
          <div ref={listRef} id={`${uid}-list`} className="ob-palette__list" role="listbox" aria-label="Commands">
            {groups.map(([group, items]) => (
              <div key={group} role="group" aria-labelledby={`${uid}-g-${group}`} className="ob-palette__group">
                <p id={`${uid}-g-${group}`} className="ob-kicker ob-palette__group-title">
                  {group}
                </p>
                {items.map(command => {
                  index += 1;
                  const at = index;
                  return (
                    <div
                      key={command.id}
                      id={optionId(at)}
                      role="option"
                      aria-selected={at === activeIndex}
                      className="ob-palette__option"
                      // Move, not enter: scrolling the list with the keyboard slides rows under
                      // a resting pointer, and `mouseenter` would steal the highlight.
                      onPointerMove={() => at !== activeIndex && setActive(at)}
                      onClick={() => run(command)}
                    >
                      <span className="ob-palette__option-icon" aria-hidden="true">
                        {command.icon}
                      </span>
                      <span className="ob-palette__option-label">{command.label}</span>
                      {command.hint && <span className="ob-palette__option-hint">{command.hint}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
            {results.length === 0 && (
              <p className="ob-palette__empty" role="status">
                No commands match "{query.trim()}".
              </p>
            )}
          </div>
          <p className="ob-palette__foot" aria-hidden="true">
            <span>
              <kbd>&uarr;</kbd>
              <kbd>&darr;</kbd> navigate
            </span>
            <span>
              <kbd>Enter</kbd> select
            </span>
            <span>
              <kbd>Esc</kbd> close
            </span>
          </p>
    </>
  );
}
