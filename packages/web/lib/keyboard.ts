/**
 * Physical keyboard map (contracts.md §5, source plan §4.6).
 *
 *   Digits (top row or numpad)  keypad keys 0-9
 *   * (Shift+8, numpad *)       Back          # (Shift+3) or numpad /   Next
 *   Backspace                   Back          Enter / numpad Enter      Speak
 *   Space                       0 (Space)     ArrowUp / ArrowDown       move the chosen sentence
 *   Alt+1 ... Alt+5             choose sentence 1-5 (plain digits are keypad input)
 *   Alt+Shift+1 ... 3, numpad + finish the word with word 1-3 (+ is word 1; web-ui Req 31.6)
 *
 * In switch scanning, Space and Enter are the switch: 1 switch -> both select;
 * 2 switches -> Space moves, Enter selects.
 */
import type { KeyId } from './keys';
import type { AccessMode } from './settings';

export type KeyIntent =
  | { type: 'key'; key: KeyId }
  | { type: 'speak' }
  | { type: 'move'; delta: 1 | -1 }
  | { type: 'rank'; rank: number }
  /** Finish the word with the word in place 0, 1 or 2 (web-ui Req 31.6). */
  | { type: 'complete'; index: 0 | 1 | 2 }
  | { type: 'switch'; action: 'select' | 'advance' };

export interface KeyLike {
  key: string;
  code?: string;
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  repeat?: boolean;
}

/** Where focus is, which decides whether Enter and Space belong to the focused control. */
export type FocusContext = 'text' | 'control' | 'pad';

export function mapKey(e: KeyLike, access: AccessMode, focus: FocusContext): KeyIntent | null {
  if (focus === 'text') return null; // typing in "They said" or a settings field
  if (e.ctrlKey || e.metaKey) return null; // leave browser shortcuts alone

  if (access === 'scan1' || access === 'scan2') {
    if (e.repeat) return null;
    if (e.key === ' ' || e.code === 'Space') return { type: 'switch', action: access === 'scan2' ? 'advance' : 'select' };
    if (e.key === 'Enter') return { type: 'switch', action: 'select' };
  }

  // Matched on the physical key, so it works on any layout (Shift+1 types "!" on some, other marks elsewhere).
  if (e.altKey && e.shiftKey) {
    const w = /^(?:Digit|Numpad)([1-3])$/.exec(e.code ?? '');
    return w ? { type: 'complete', index: (Number(w[1]) - 1) as 0 | 1 | 2 } : null;
  }
  if (e.code === 'NumpadAdd' && !e.altKey) return { type: 'complete', index: 0 };

  if (e.altKey) {
    const m = /^(?:Digit|Numpad)([1-5])$/.exec(e.code ?? '');
    const d = m?.[1] ?? (/^[1-5]$/.test(e.key) ? e.key : undefined);
    return d ? { type: 'rank', rank: Number(d) } : null;
  }

  if (/^[0-9]$/.test(e.key)) return { type: 'key', key: e.key as KeyId };
  if (e.key === '*' || e.code === 'NumpadMultiply') return { type: 'key', key: '*' };
  if (e.key === '#' || e.code === 'NumpadDivide') return { type: 'key', key: '#' };
  if (e.key === 'Backspace') return { type: 'key', key: '*' };
  if (e.key === 'ArrowDown') return { type: 'move', delta: 1 };
  if (e.key === 'ArrowUp') return { type: 'move', delta: -1 };

  // Enter and Space belong to a focused button, link or candidate; elsewhere they drive the pad.
  if (focus === 'pad') {
    if (e.key === 'Enter') return { type: 'speak' };
    if (e.key === ' ' || e.code === 'Space') return { type: 'key', key: '0' };
  }
  return null;
}

/** Classify the focused element for mapKey. */
export function focusContext(el: Element | null): FocusContext {
  if (!el || el === document.body || el === document.documentElement) return 'pad';
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable) return 'text';
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return type === 'button' || type === 'submit' || type === 'reset' ? 'control' : 'text';
  }
  if (el.closest('[data-pad-focus]')) return 'pad';
  if (el.closest('button, a[href], summary, [role="button"]')) return 'control';
  return 'pad';
}
