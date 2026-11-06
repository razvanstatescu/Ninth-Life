/**
 * The fixed 12-key layout (contracts.md §5, design/system/components/Keypad).
 * Never reorder keys, never hide the digit, never add a tenth letter key.
 */
import { KEY_LETTERS, type Digit } from '@ninth/core';

export type KeyId = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '*' | '0' | '#';
export type KeyRole = 'punct' | 'letter' | 'back' | 'space' | 'next';

export interface KeyDef {
  id: KeyId;
  /** What sits small in the corner. */
  digit: string;
  role: KeyRole;
  /** Upper-case letters for 2-9, shown large. */
  letters?: string;
  /** A word for function keys: Space, Next, Back, Punctuation. */
  word?: string;
  /**
   * Screen reader label. Starts with the visible text ("4 GHI") so it passes WCAG 2.5.3
   * (label in name) for voice-control users, then spells the letters ("G H I") so screen
   * readers do not pronounce "ghi" as a word.
   */
  ariaLabel: string;
}

function letterKey(d: Digit): KeyDef {
  const letters = KEY_LETTERS[d].toUpperCase();
  return { id: d, digit: d, role: 'letter', letters, ariaLabel: `${d} ${letters.toUpperCase()}, ${letters.toUpperCase().split('').join(' ')}` };
}

export const KEY_ROWS: readonly (readonly KeyDef[])[] = [
  [{ id: '1', digit: '1', role: 'punct', word: '.,?!', ariaLabel: '1 punctuation, .,?!' }, letterKey('2'), letterKey('3')],
  [letterKey('4'), letterKey('5'), letterKey('6')],
  [letterKey('7'), letterKey('8'), letterKey('9')],
  [
    { id: '*', digit: '*', role: 'back', word: 'Back', ariaLabel: 'Back' },
    { id: '0', digit: '0', role: 'space', word: 'Space', ariaLabel: '0 Space' },
    { id: '#', digit: '#', role: 'next', word: 'Next', ariaLabel: 'Next word' },
  ],
];

export const ALL_KEYS: readonly KeyDef[] = KEY_ROWS.flat();

export function isLetterKey(id: KeyId): id is Digit {
  return id >= '2' && id <= '9' && id.length === 1;
}
