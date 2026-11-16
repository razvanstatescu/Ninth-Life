'use client';
import type { ReactNode } from 'react';
import { Sheet } from './Sheet';

/** One shortcut: the keys, then what they do. */
const SHORTCUTS: { keys: ReactNode; does: string }[] = [
  { keys: <><kbd>0</kbd>–<kbd>9</kbd>, <kbd>*</kbd>, <kbd>#</kbd></>, does: 'The keys on screen' },
  { keys: <kbd>Space</kbd>, does: 'Next word (the 0 key)' },
  { keys: <kbd>Backspace</kbd>, does: 'Back (the * key)' },
  { keys: <kbd>Enter</kbd>, does: 'Speak' },
  { keys: <><kbd>↑</kbd> <kbd>↓</kbd></>, does: 'Pick a sentence' },
  { keys: <><kbd>Alt</kbd>+<kbd>1</kbd>–<kbd>5</kbd></>, does: 'Pick sentence 1 to 5' },
  { keys: <><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>1</kbd>–<kbd>3</kbd></>, does: 'Finish the word: word 1 to 3' },
  { keys: <kbd>Esc</kbd>, does: 'Close what is open' },
];

/**
 * Keyboard shortcuts (web-ui Req 40.7): what the laptop screen's old hint paragraph said, as a short list behind a
 * button under the keypad (and in More), so the main screen keeps only what is used while typing. A popover next to
 * its button on large screens.
 */
export function ShortcutsSheet({ open, scanning, onClose }: { open: boolean; scanning?: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} name="shortcuts" kind="fit" title="Keyboard shortcuts" onClose={onClose} scanning={scanning}>
      <p className="sheet__lead">Your keyboard works too. Shortcuts wait while you type in a text field.</p>
      <dl className="shortcuts">
        {SHORTCUTS.map((s) => (
          <div className="shortcuts__row" key={s.does}>
            <dt className="shortcuts__keys">{s.keys}</dt>
            <dd className="shortcuts__does">{s.does}</dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}
