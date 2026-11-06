import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { encodeSentence, encodeWord, formatSentence, normalize, tokenize, validate } from '../src/index';
import { anyString, apostropheWord, decoratedWord, plainWord, runs } from './arbitraries';

const punct = fc.option(fc.constantFrom<'.' | '?' | '!' | ','>('.', '?', '!', ','), { nil: undefined });

describe('core-encoder: formatting', () => {
  it('Req 6.1 + 6.2 "i" -> "I" and sentence case (examples)', () => {
    expect(formatSentence(['i'])).toBe('I');
    expect(formatSentence(['i', 'need', 'water'], '.')).toBe('I need water.');
    expect(formatSentence(['can', 'i', 'go'], '?')).toBe('Can I go?');
    expect(formatSentence(["i'm", 'fine', 'and', "i'll", 'go'], '!')).toBe("I'm fine and I'll go!");
    expect(formatSentence(['i’ve'])).toBe('I’ve');
    expect(formatSentence(['hi', 'ian'])).toBe('Hi ian'); // only the word "i" itself, not words starting with i
    expect(formatSentence(["'tis", 'fine'])).toBe("'Tis fine");
  });

  it('Req 6.3 punctuation is appended without a space; empty input gives ""', () => {
    expect(formatSentence(['yes'], ',')).toBe('Yes,');
    expect(formatSentence([], '.')).toBe('');
    expect(formatSentence(['', ' '], '?')).toBe('');
  });

  it('Req 6.4 formatting never changes, adds or drops a word: the formatted text still validates (property)', () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(plainWord(1, 10), apostropheWord, fc.constantFrom('i', "i'm", "i'll")), { minLength: 1, maxLength: 12 }), punct, (ws, p) => {
        const text = formatSentence(ws, p);
        expect(tokenize(text)).toEqual(ws);
        expect(validate(tokenize(text), ws.map((w) => encodeWord(w)!))).toBe(true);
        expect(text.charAt(0)).toBe(text.charAt(0).toUpperCase());
        if (p) expect(text.endsWith(p)).toBe(true);
      }),
      { numRuns: runs(500) },
    );
  });

  it('Req 6.4 formatting decorated input (capitals, diacritics, curly apostrophes) changes no word after normalization (property)', () => {
    const w = fc.oneof(decoratedWord.map((d) => d.decorated), anyString).filter((x) => {
      const t = tokenize(x);
      return t.length === 1 && encodeWord(x) !== null && t[0] === normalize(x);
    });
    fc.assert(
      fc.property(fc.array(w, { minLength: 1, maxLength: 8 }), punct, (ws, p) => {
        const text = formatSentence(ws, p);
        expect(tokenize(text)).toEqual(ws.map(normalize));
        expect(encodeSentence(text)).toEqual(ws.map((x) => encodeWord(x)));
      }),
      { numRuns: runs(500) },
    );
  });
});
