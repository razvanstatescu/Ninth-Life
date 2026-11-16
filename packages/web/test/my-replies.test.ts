/** Your quick replies, cards, phone lines and typed setup (web-ui Req 35). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PHONE_CALLS_HELP, PHONE_LINES, SHOW_CARDS } from '@/lib/cards';
import { MAX_PIN_CHARS, QUICK_REPLIES, quickReplies, replyRows, sheetReplyRows } from '@/lib/replies';
import { pinnedTexts, type Phrase } from '@/lib/storage';
import { packFromLines, parseVocabPack } from '@/lib/vocabPack';

const label = (rows: ReturnType<typeof replyRows>) => rows.map((r) => r.map((c) => (c.kind === 'reply' ? c.text : c.kind === 'phrases' ? 'Phrases' : `slot${c.index}`)));
const phrase = (text: string, pinnedAt?: number): Phrase => ({ id: text, text, lang: 'en', uses: 0, lastUsed: 0, pinned: pinnedAt !== undefined, ...(pinnedAt !== undefined ? { pinnedAt } : {}) });

describe('quickReplies (Req 35.1)', () => {
  it('pinned first in pin order, then the usual ones, 5 in all, no repeats', () => {
    expect(quickReplies()).toEqual([...QUICK_REPLIES]);
    expect(quickReplies(['Call my daughter', 'I need help'])).toEqual(['Call my daughter', 'I need help', 'Hold on.', 'Yes.', 'No.']);
    expect(quickReplies(['Yes.', 'Water please'])).toEqual(['Yes.', 'Water please', 'Hold on.', 'No.', 'Pardon?']);
    expect(quickReplies(['a', 'b', 'c', 'd', 'e', 'f'])).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
  it('pinnedTexts orders by pin time and leaves out unpinned phrases', () => {
    expect(pinnedTexts([phrase('second', 20), phrase('free'), phrase('first', 10)])).toEqual(['first', 'second']);
  });
  it('every place gets the same five in the same places', () => {
    const list = quickReplies(['Mine', 'Ours']);
    expect(label(replyRows(2, 0, false, list))).toEqual([['Mine', 'Ours', 'Hold on.'], ['Yes.', 'No.', 'Phrases']]);
    expect(label(replyRows(1, 0, true, list))).toEqual([['Mine', 'Ours', 'Hold on.', 'Yes.', 'No.']]);
    expect(label(replyRows(2, 3, false, list))).toEqual([['Mine', 'Ours', 'Hold on.'], ['slot0', 'slot1', 'slot2']]);
    expect(label(sheetReplyRows(list))).toEqual([['Mine', 'Ours', 'Hold on.'], ['Yes.', 'No.']]);
    // Without a list, exactly as before.
    expect(label(replyRows(2))).toEqual([['Hold on.', 'Yes.', 'No.'], ['Pardon?', 'Thanks.', 'Phrases']]);
    expect(MAX_PIN_CHARS).toBe(20);
  });
});

describe('cards and phone lines (Req 35.2, 35.3)', () => {
  it('the fixed texts, in sentence case, with no exclamation marks', () => {
    expect(SHOW_CARDS).toEqual(['I type to talk. Please wait for me.', 'I can hear you. I answer by typing.', 'Please give me a moment to type.', 'Please ask me, not the person with me.']);
    expect(PHONE_LINES).toHaveLength(4);
    for (const t of [...SHOW_CARDS, ...PHONE_LINES]) {
      expect(t[0]).toBe(t[0]!.toUpperCase());
      expect(t).not.toContain('!');
    }
    expect(PHONE_CALLS_HELP).toContain('cannot speak into a phone call');
  });
});

describe('packFromLines (Req 35.4)', () => {
  it('one per line, trimmed, empty lines dropped; then the usual pack check', () => {
    const p = packFromLines(' Mihai \n\nNew York\nȘtefan\r\n', 'Can you call my daughter?\n  \n');
    expect(p.words.map((w) => w.w)).toEqual(['Mihai', 'New York', 'Ștefan']);
    expect(p.phrases).toEqual(['Can you call my daughter?']);
    const res = parseVocabPack(p);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.pack.words.length).toBe(2);
      expect(res.pack.skipped.length).toBe(1);
      expect(res.pack.phrases).toEqual(['Can you call my daughter?']);
    }
  });
});

describe('core-en.json (Req 35.5)', () => {
  it('189 phrases, version 2, no near duplicates, the contraction kept', () => {
    const pack = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'data', 'packs', 'core-en.json'), 'utf8')) as { version: number; phrases: string[] };
    expect(pack.version).toBe(2);
    expect(pack.phrases).toHaveLength(189);
    for (const gone of ['Thanks.', 'No thanks.', 'I am hungry.', 'I am thirsty.', 'I am cold.', 'I am tired.', 'I am bored.', 'I am sorry.', 'It is hot.']) expect(pack.phrases).not.toContain(gone);
    for (const kept of ['Thank you.', 'No, thank you.', "I'm hungry.", "I'm sorry.", "It's hot."]) expect(pack.phrases).toContain(kept);
  });
});

describe('long replies on phones (Req 35.1)', () => {
  it('2 to a row when a reply is long; the last reply row ends with Phrases', async () => {
    const { replyColumns } = await import('@/lib/replies');
    const list = quickReplies(['Please call my wife.', 'Turn the TV off now.']);
    expect(replyColumns([...QUICK_REPLIES])).toBe(3);
    expect(replyColumns(list)).toBe(2);
    expect(label(replyRows(1, 0, false, list, 2))).toEqual([['Please call my wife.', 'Turn the TV off now.']]);
    expect(label(replyRows(2, 0, false, list, 2))).toEqual([['Please call my wife.', 'Turn the TV off now.'], ['Hold on.', 'Phrases']]);
    expect(label(replyRows(4, 0, false, list, 2))).toEqual([['Please call my wife.', 'Turn the TV off now.'], ['Hold on.', 'Yes.'], ['No.', 'Phrases']]);
    expect(label(replyRows(3, 3, false, list, 2))).toEqual([['Please call my wife.', 'Turn the TV off now.'], ['Hold on.', 'Phrases'], ['slot0', 'slot1', 'slot2']]);
    expect(label(replyRows(2, 3, false, list, 2))).toEqual([['Please call my wife.', 'Turn the TV off now.'], ['slot0', 'slot1', 'slot2']]);
  });
  it('fitsQuickReply: 20 characters at most, and 2 lines of the narrowest cell where text can be measured', async () => {
    const { fitsQuickReply } = await import('@/lib/replies');
    const mono = (s: string) => s.length * 11; // about 11px a character at 20px
    expect(fitsQuickReply('I need the bathroom.', mono)).toBe(true);
    expect(fitsQuickReply('Can you open window?', mono)).toBe(true);
    expect(fitsQuickReply('a bcdefghijklmn opq', mono)).toBe(false); // 3 lines
    expect(fitsQuickReply('Supercalifragilistic', mono)).toBe(false); // one word wider than a line
    expect(fitsQuickReply('This is far too long for it', null)).toBe(false);
    expect(fitsQuickReply('Twenty letters here.', null)).toBe(true);
  });
});
