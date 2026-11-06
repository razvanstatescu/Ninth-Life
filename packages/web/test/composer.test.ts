import { describe, expect, it } from 'vitest';
import { EMPTY, actionForKey, codesOf, composerReducer, type ComposerAction, type ComposerState } from '@/lib/composer';

const run = (actions: ComposerAction[], from: ComposerState = EMPTY) => actions.reduce(composerReducer, from);
const keys = (s: string): ComposerAction[] => s.split('').map((k) => actionForKey(k as never)!).filter(Boolean);

describe('composer', () => {
  it('builds codes with 0 committing words', () => {
    const s = run(keys('406333092837'));
    expect(codesOf(s)).toEqual(['4', '6333', '92837']);
    expect(s.open).toBe(true);
  });

  it('* deletes a digit, then the word', () => {
    let s = run(keys('4063'));
    s = composerReducer(s, { type: 'back' });
    expect(codesOf(s)).toEqual(['4', '6']);
    s = composerReducer(s, { type: 'back' });
    expect(codesOf(s)).toEqual(['4']);
    expect(s.open).toBe(false);
    s = composerReducer(s, { type: 'back' });
    expect(codesOf(s)).toEqual([]);
  });

  it('1 cycles punctuation and * removes it first', () => {
    let s = run(keys('4'));
    const seen = [];
    for (let i = 0; i < 5; i++) {
      s = composerReducer(s, { type: 'punct' });
      seen.push(s.punct);
    }
    expect(seen).toEqual(['.', '?', '!', ',', undefined]);
    s = run([{ type: 'space' }, { type: 'punct' }, { type: 'back' }], s);
    expect(s.punct).toBeUndefined();
    expect(codesOf(s)).toEqual(['4']);
  });

  it('a chosen sentence becomes pins when typing goes on', () => {
    let s = run(keys('40633309'));
    s = composerReducer(s, { type: 'select', words: ['i', 'need', 'w'] });
    s = composerReducer(s, { type: 'digit', digit: '2' });
    expect(s.slots.map((x) => x.pin)).toEqual(['i', 'need', undefined]);
    expect(s.selected).toBeNull();
  });

  it('after Speak the sentence stays until the next letter key', () => {
    let s = run(keys('4'));
    s = composerReducer(s, { type: 'spoken' });
    expect(codesOf(s)).toEqual(['4']);
    s = composerReducer(s, { type: 'digit', digit: '6' });
    expect(codesOf(s)).toEqual(['6']);
  });

  it('ignores non letter digits and caps code length', () => {
    let s = composerReducer(EMPTY, { type: 'digit', digit: '1' });
    expect(codesOf(s)).toEqual([]);
    s = run(Array.from({ length: 20 }, () => ({ type: 'digit', digit: '2' }) as const));
    expect(codesOf(s)[0]).toHaveLength(16);
  });

  it('# has no reducer action (the screen resolves readings)', () => {
    expect(actionForKey('#')).toBeNull();
  });
});
