import { describe, expect, it } from 'vitest';
import { validate } from '@ninth/core';
import { EMPTY, actionForKey, composerReducer, type ComposerAction } from '@/lib/composer';
import { buildSentence, decodeWithPins, mergeCandidates, partialFor, readings } from '@/lib/sentence';
import { miniDict } from './fixtures';

const d = miniDict();
const type = (s: string) => s.split('').map((k) => actionForKey(k as never)!).reduce<typeof EMPTY>((st, a: ComposerAction) => composerReducer(st, a), EMPTY);

describe('sentence', () => {
  it('decodes ghost candidates that all pass validate', () => {
    const st = type('406333092837');
    const cands = decodeWithPins(st, d.lexicon, d.lm);
    expect(cands[0]?.words).toEqual(['i', 'need', 'water']);
    expect(cands.map((c) => c.words.join(' '))).toContain('i need waves');
    for (const c of cands) expect(validate(c.words, ['4', '6333', '92837'])).toBe(true);
  });

  it('formats the top sentence with proof states', () => {
    const st = type('406333092837');
    const s = buildSentence(st, decodeWithPins(st, d.lexicon, d.lm), d.lexicon);
    expect(s.text).toBe('I need water');
    expect(s.speakable).toBe(true);
    expect(s.words.map((w) => w.state)).toEqual(['match', 'match', 'match']);
    expect(s.selectedIndex).toBe(0);
  });

  it('honours pins from #', () => {
    let st = type('406333092837');
    st = composerReducer(st, { type: 'pin', index: 2, word: 'waves' });
    const s = buildSentence(st, decodeWithPins(st, d.lexicon, d.lm), d.lexicon);
    expect(s.text).toBe('I need waves');
    expect(s.candidates.every((c) => c.words[2] === 'waves')).toBe(true);
  });

  it('marks an unfinished word as typing and not speakable', () => {
    const st = type('4092');
    const s = buildSentence(st, decodeWithPins(st, d.lexicon, d.lm), d.lexicon);
    expect(s.words[1]?.state).toBe('typing');
    expect(s.words[1]?.partial).toBe('wa');
    expect(s.speakable).toBe(false);
    expect(s.tokens).toEqual(['I', 'wa']);
  });

  it('adds sentence punctuation', () => {
    let st = type('4');
    st = composerReducer(st, { type: 'punct' });
    st = composerReducer(st, { type: 'punct' });
    const s = buildSentence(st, decodeWithPins(st, d.lexicon, d.lm), d.lexicon);
    expect(s.text).toBe('I?');
  });

  it('works without a dictionary (digits only, nothing speakable)', () => {
    const s = buildSentence(type('4663'), [], null);
    expect(s.tokens).toEqual(['4663']);
    expect(s.speakable).toBe(false);
  });

  it('readings, partials and merging', () => {
    expect(readings(d.lexicon, '4663')).toEqual(['good', 'home', 'gone']);
    expect(partialFor(d.lexicon, '466')).toBe('goo');
    const a = { words: ['x'], score: 0, source: 'llm' as const };
    const b = { words: ['x'], score: 0, source: 'ghost' as const };
    const c = { words: ['y'], score: 0, source: 'ghost' as const };
    expect(mergeCandidates([a], [b, c])).toEqual([a, c]);
  });
});
