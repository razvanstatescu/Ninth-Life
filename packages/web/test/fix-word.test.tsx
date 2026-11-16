/** Fix a word and Did you mean, the implementer's unit tests (web-ui Req 32; ADR-009). */
import { render } from '@testing-library/react';
import { validate } from '@ninth/core';
import { describe, expect, it } from 'vitest';
import { EditedCode, editWords } from '@/components/SpeakBar';
import { EMPTY, actionForKey, codesOf, composerReducer, limitFor, openIndex, type ComposerAction, type ComposerState } from '@/lib/composer';

const run = (actions: ComposerAction[], from: ComposerState = EMPTY) => actions.reduce(composerReducer, from);
const keys = (s: string): ComposerAction[] => s.split('').map((k) => actionForKey(k as never)!).filter(Boolean);

describe('composer recode (Req 32.4-32.6)', () => {
  it('takes a word one key away, keeps the old keys, closes an open word; Back restores and reopens', () => {
    let s = run(keys('7532573')); // "please" with an extra 5, still open
    s = composerReducer(s, { type: 'recode', index: 0, word: 'please' });
    expect(s.slots[0]).toEqual({ code: '753273', pin: 'please', was: '7532573', wasOpen: true });
    expect(s.open).toBe(false);
    expect(validate(['please'], codesOf(s))).toBe(true);
    s = composerReducer(s, { type: 'back' });
    expect(s.slots[0]).toEqual({ code: '7532573' });
    expect(s.open).toBe(true);
  });

  it('refuses a word that is not one key away, and after Speak', () => {
    const s = run(keys('2256'));
    expect(composerReducer(s, { type: 'recode', index: 0, word: 'hello' })).toBe(s);
    expect(composerReducer({ ...s, spoken: true }, { type: 'recode', index: 0, word: 'call' })).toEqual({ ...s, spoken: true });
  });

  it('an earlier word: only that slot changes; the open last word stays open', () => {
    let s = run(keys('22560696'));
    s = composerReducer(s, { type: 'recode', index: 0, word: 'call' });
    expect(codesOf(s)).toEqual(['2255', '696']);
    expect(s.open).toBe(true);
    expect(s.slots[1]).toEqual({ code: '696' });
  });

  it('recoding back to the old keys drops the mark', () => {
    let s = composerReducer(run(keys('22560')), { type: 'recode', index: 0, word: 'call' });
    s = composerReducer(s, { type: 'recode', index: 0, word: 'calm' });
    expect(s.slots[0]).toEqual({ code: '2256', pin: 'calm' });
  });
});

describe('composer retype (Req 32.3)', () => {
  const base = () => run(keys('2256096906930')); // four words, closed
  it('the next keys replace the word, 0 ends it, the other words stay', () => {
    let s = composerReducer(base(), { type: 'edit', index: 0 });
    expect(openIndex(s)).toBe(-1);
    s = run(keys('2255'), s);
    expect(openIndex(s)).toBe(0);
    expect(codesOf(s)).toEqual(['2255', '969', '693']);
    s = run(keys('0'), s);
    expect(s.edit).toBeUndefined();
    expect(codesOf(s)).toEqual(['2255', '969', '693']);
  });
  it('Back or 0 with no key keeps the old word; Back deleting the last key keeps it too', () => {
    const b = base();
    for (const end of ['*', '0']) {
      const s = run(keys(end), composerReducer(b, { type: 'edit', index: 1 }));
      expect(s.edit).toBeUndefined();
      expect(s.slots).toEqual(b.slots);
    }
    const s = run(keys('7*'), composerReducer(b, { type: 'edit', index: 1 }));
    expect(s.slots).toEqual(b.slots);
    expect(s.edit).toBeUndefined();
  });
  it('the 16-key cap applies to the word being retyped', () => {
    const s = run(keys('2'.repeat(16)), composerReducer(base(), { type: 'edit', index: 0 }));
    expect(limitFor(s, { type: 'digit', digit: '2' })).toBe('word');
    expect(composerReducer(s, { type: 'digit', digit: '2' }).slots[0]!.code).toHaveLength(16);
  });
  it('Finish the word works on the word being retyped and ends the retype', () => {
    let s = run(keys('92'), composerReducer(base(), { type: 'edit', index: 0 }));
    s = composerReducer(s, { type: 'complete', word: 'water' });
    expect(s.slots[0]).toEqual({ code: '92837', pin: 'water', typed: 2 });
    expect(s.edit).toBeUndefined();
  });
});

describe('the changed key on the key line (Req 32.5)', () => {
  it('a changed key is boxed, an added one boxed, a removed one struck and hidden from screen readers', () => {
    const c = render(<EditedCode was="2256" code="2255" />).container;
    expect(c.querySelector('.nl-keyfix')!.textContent).toBe('5');
    expect(c.textContent).toBe('2255, key 4 changed from 6 to 5');
    const r = render(<EditedCode was="7532573" code="753273" />).container;
    expect(r.querySelector('.nl-keyfix-removed')!.getAttribute('aria-hidden')).toBe('true');
    expect(r.textContent).toBe('7532573, extra 5 removed');
    const a = render(<EditedCode was="75327" code="753273" />).container;
    expect(a.querySelector('.nl-keyfix')!.textContent).toBe('3');
    expect(a.textContent).toContain(', key 3 added');
  });
  it('editWords', () => {
    expect(editWords({ kind: 'change', at: 3, from: '6', to: '5' })).toBe('key 4 changed from 6 to 5');
    expect(editWords({ kind: 'add', at: 1, to: '3' })).toBe('key 3 added');
    expect(editWords({ kind: 'remove', at: 1, from: '5' })).toBe('extra 5 removed');
  });
});
