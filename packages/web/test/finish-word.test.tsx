/** Finish the word, the implementer's unit tests (web-ui Req 31.2-31.6). */
import { render } from '@testing-library/react';
import { validate } from '@ninth/core';
import { describe, expect, it } from 'vitest';
import { KeyCode } from '@/components/SpeakBar';
import { ProofChip } from '@/components/ProofChip';
import { WordRow } from '@/components/WordRow';
import { EMPTY, actionForKey, codesOf, composerReducer, type ComposerAction, type ComposerState } from '@/lib/composer';
import { mapKey } from '@/lib/keyboard';
import { buildSentence } from '@/lib/sentence';
import { miniDict } from './fixtures';

const run = (actions: ComposerAction[], from: ComposerState = EMPTY) => actions.reduce(composerReducer, from);
const keys = (s: string): ComposerAction[] => s.split('').map((k) => actionForKey(k as never)!).filter(Boolean);

describe('composer complete (Req 31.2, 31.4)', () => {
  it('finishes the open word, keeps earlier pins, and the codes validate', () => {
    let s = run(keys('40633309'));
    s = composerReducer(s, { type: 'select', words: ['i', 'need', 'w'] });
    s = run(keys('2'), s);
    s = composerReducer(s, { type: 'complete', word: 'water' });
    expect(codesOf(s)).toEqual(['4', '6333', '92837']);
    expect(s.slots.map((x) => x.pin)).toEqual(['i', 'need', 'water']);
    expect(s.slots[2]!.typed).toBe(2);
    expect(s.open).toBe(false);
    expect(validate(s.slots.map((x) => x.pin!), codesOf(s))).toBe(true);
  });

  it('refuses words that do not extend the keys, are not longer, or pass 16 keys', () => {
    const s = run(keys('92'));
    for (const w of ['hello', 'wa', 'w', 'waterproofingsabc']) expect(composerReducer(s, { type: 'complete', word: w })).toBe(s);
    expect(composerReducer({ ...s, spoken: true }, { type: 'complete', word: 'water' }).slots[0]!.code).toBe('92');
  });

  it('# on a finished word keeps its filled-in count; Back reopens at the pressed keys', () => {
    let s = composerReducer(run(keys('92')), { type: 'complete', word: 'water' });
    s = composerReducer(s, { type: 'pin', index: 0, word: 'waves' });
    expect(s.slots[0]).toEqual({ code: '92837', pin: 'waves', typed: 2 });
    s = composerReducer(s, { type: 'back' });
    expect(s.slots[0]).toEqual({ code: '92' });
    expect(s.open).toBe(true);
  });

  it('buildSentence carries the typed count on the finished word only', () => {
    const d = miniDict();
    const s = run(keys('4'), composerReducer(run(keys('406333092')), { type: 'complete', word: 'water' }));
    const out = buildSentence(s, [], d.lexicon);
    expect(out.words.map((w) => w.typed)).toEqual([undefined, undefined, 2, undefined]);
  });
});

describe('keyboard (Req 31.6)', () => {
  it('Alt+Shift+1-3 by physical key, numpad +; Alt+Shift+4 and plain + do nothing new', () => {
    expect(mapKey({ key: '!', code: 'Digit1', altKey: true, shiftKey: true }, 'keyboard', 'pad')).toEqual({ type: 'complete', index: 0 });
    expect(mapKey({ key: '#', code: 'Digit3', altKey: true, shiftKey: true }, 'keyboard', 'pad')).toEqual({ type: 'complete', index: 2 });
    expect(mapKey({ key: '2', code: 'Numpad2', altKey: true, shiftKey: true }, 'keyboard', 'pad')).toEqual({ type: 'complete', index: 1 });
    expect(mapKey({ key: '$', code: 'Digit4', altKey: true, shiftKey: true }, 'keyboard', 'pad')).toBeNull();
    expect(mapKey({ key: '+', code: 'NumpadAdd' }, 'keyboard', 'pad')).toEqual({ type: 'complete', index: 0 });
    expect(mapKey({ key: '+', code: 'Equal' }, 'keyboard', 'pad')).toBeNull();
    expect(mapKey({ key: '1', code: 'Digit1', altKey: true }, 'keyboard', 'pad')).toEqual({ type: 'rank', rank: 1 });
    expect(mapKey({ key: '+', code: 'NumpadAdd' }, 'keyboard', 'text')).toBeNull();
  });
});

describe('filled-in keys and the row (Req 31.3, 31.5)', () => {
  it('KeyCode marks the keys not pressed and says how many', () => {
    const { container } = render(<KeyCode code="92837" typed={2} />);
    expect(container.querySelector('.nl-filled')!.textContent).toBe('837');
    expect(container.textContent).toBe('92837, 3 filled in');
    const plain = render(<KeyCode code="92837" />);
    expect(plain.container.querySelector('.nl-filled')).toBeNull();
  });

  it('ProofChip reads the filled-in count after the keys', () => {
    const { container } = render(<ProofChip state="match" word="water" code="92837" typed={2} />);
    expect(container.querySelector('.nl-chip__code .nl-filled')!.textContent).toBe('837');
    expect(container.querySelector('.nl-sr-only')!.textContent).toContain('Keys 9 2 8 3 7, 3 filled in.');
  });

  it('WordRow keeps three places; empty places have no button', () => {
    const { container } = render(<WordRow words={['water', 'want']} onPick={() => {}} />);
    expect(container.querySelectorAll('.word-row__cells > *')).toHaveLength(3);
    expect(container.querySelectorAll('button')).toHaveLength(2);
    expect(container.querySelector('.word-row__empty')!.getAttribute('aria-hidden')).toBe('true');
  });
});
