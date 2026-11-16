// Your quick replies, cards and setup (web-ui Req 35; spec r6 6-quick-replies-cards-setup AC 1, 3, 8, 10, 11).
// Goes to packages/web/test/c3.test.ts when item 6 is built.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PHONE_LINES, SHOW_CARDS } from '@/lib/cards';
import { MAX_PIN_CHARS, MAX_PINNED, QUICK_REPLIES, quickReplies } from '@/lib/replies';
import { packFromLines, parseVocabPack } from '@/lib/vocabPack';

const ROOT = join(__dirname, '..', '..', '..');
const DEFAULTS = ['Hold on.', 'Yes.', 'No.', 'Pardon?', 'Thanks.'];

describe('quickReplies (Req 35.1, AC 1, 10)', () => {
  it('the defaults are unchanged', () => {
    expect([...QUICK_REPLIES].map((r) => (typeof r === 'string' ? r : (r as { text: string }).text))).toEqual(DEFAULTS);
    expect(MAX_PINNED).toBe(5);
    expect(MAX_PIN_CHARS).toBe(20);
  });
  it('no pins: the five defaults', () => {
    expect(quickReplies([])).toEqual(DEFAULTS);
  });
  it('AC 1 two pins: pinned 1, pinned 2, Hold on., Yes., No.', () => {
    expect(quickReplies(['Call my daughter.', 'Water please.'])).toEqual(['Call my daughter.', 'Water please.', 'Hold on.', 'Yes.', 'No.']);
  });
  it('a pin equal to a default is not shown twice', () => {
    expect(quickReplies(['Yes.', 'Tea please.'])).toEqual(['Yes.', 'Tea please.', 'Hold on.', 'No.', 'Pardon?']);
  });
  it('property: always 5, no repeats, pins first in order, at most 5 pins', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.stringMatching(/^[A-Z][a-z]{1,10}( [a-z]{1,6})?\.$/), { maxLength: 8 }), (pins) => {
        const out = quickReplies(pins);
        expect(out).toHaveLength(5);
        expect(new Set(out).size).toBe(5);
        const kept = pins.slice(0, 5);
        expect(out.slice(0, kept.length)).toEqual(kept);
        for (const r of out.slice(kept.length)) expect(DEFAULTS).toContain(r);
      }),
    );
  });
});

describe('packFromLines (Req 35.4, AC 7, 10)', () => {
  it('AC 7 names and phrases, one per line, through the pack parser', () => {
    const raw = packFromLines('Mihai\nNew York\n  Ștefan  \n\n', 'Can you call my daughter?\n\n');
    const p = parseVocabPack(raw) as unknown as { ok?: boolean; pack?: { words: { w: string }[]; phrases: string[] } } & Record<string, unknown>;
    const pack = (p.pack ?? p) as { words: { w: string }[]; phrases: string[] };
    expect(pack.phrases).toEqual(['Can you call my daughter?']);
    // Words are folded for the keys and keep their spelling for display (Req 22.4); "New York" is left out.
    const ws = (pack.words as { w: string; display?: string }[]).map((x) => x.display || x.w);
    expect(ws).toContain('Mihai');
    expect(ws).toContain('Ștefan');
    expect(ws.join(' ')).not.toMatch(/york/i);
  });
  it('trims and drops empty lines', () => {
    const raw = packFromLines('  a \n\n b', '\n x \n') as { words: { w: string }[]; phrases: string[] };
    expect(raw.words.map((x) => x.w)).toEqual(['a', 'b']);
    expect(raw.phrases).toEqual(['x']);
  });
});

describe('cards and phone lines (Req 35.2, 35.3, AC 11)', () => {
  it('the 4 cards in order', () => {
    expect([...SHOW_CARDS]).toEqual(['I type to talk. Please wait for me.', 'I can hear you. I answer by typing.', 'Please give me a moment to type.', 'Please ask me, not the person with me.']);
  });
  it('the 4 phone lines in order', () => {
    expect([...PHONE_LINES]).toEqual(['Hello. I type and my device speaks for me. Please wait while I type.', 'Please stay on the line. I am typing.', 'Please speak slowly. I answer by typing.', 'Can you hear me?']);
  });
  it('voice: sentence case, no exclamation marks, no promise about calls', () => {
    for (const t of [...SHOW_CARDS, ...PHONE_LINES]) {
      expect(t[0]).toBe(t[0]!.toUpperCase());
      expect(t).not.toContain('!');
      expect(t.toLowerCase()).not.toMatch(/works on (phone )?calls|speaks into (the|a) call/);
    }
  });
});

describe('core-en pack (Req 35.5, AC 8)', () => {
  const pack = JSON.parse(readFileSync(join(ROOT, 'data', 'packs', 'core-en.json'), 'utf8')) as { version: number; phrases: string[] };
  it('189 phrases, version 2', () => {
    expect(pack.phrases).toHaveLength(189);
    expect(pack.version).toBe(2);
  });
  it('the 9 near-duplicates are gone and the kept forms stay', () => {
    for (const gone of ['Thanks.', 'No thanks.', 'I am hungry.', 'I am thirsty.', 'I am cold.', 'I am tired.', 'I am bored.', 'I am sorry.', 'It is hot.']) expect(pack.phrases, gone).not.toContain(gone);
    for (const kept of ['Thank you.', 'No, thank you.', "I'm hungry.", "I'm thirsty.", "I'm cold.", "I'm tired.", "I'm bored.", "I'm sorry.", "It's hot."]) expect(pack.phrases, kept).toContain(kept);
  });
  it('no two phrases differ only by a contraction or thanks/thank you', () => {
    const fold = (s: string) =>
      s
        .toLowerCase()
        .replace(/[.,?!]/g, '')
        .replace(/\bi am\b/g, "i'm")
        .replace(/\bit is\b/g, "it's")
        .replace(/\bdo not\b/g, "don't")
        .replace(/\bcan not\b|\bcannot\b/g, "can't")
        .replace(/\bthanks\b/g, 'thank you')
        .trim();
    const seen = new Map<string, string>();
    for (const p of pack.phrases) {
      const k = fold(p);
      expect(seen.get(k), `${p} duplicates ${seen.get(k)}`).toBeUndefined();
      seen.set(k, p);
    }
  });
});
