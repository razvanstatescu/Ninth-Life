// Quick replies: the mode table, the rows each area gets and the repeat guard (web-ui Req 28).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { QUICK_REPLIES, SHEET_REPLY_ROWS, acceptReply, replyCells, replyRows, suggestionMode } from '@/lib/replies';
import { DEFAULT_SETTINGS, sanitizeSettings } from '@/lib/settings';

const label = (rows: ReturnType<typeof replyRows>) => rows.map((r) => r.map((c) => (c.kind === 'reply' ? c.text : c.kind === 'phrases' ? 'Phrases' : `slot${c.index}`)));

describe('suggestionMode (web-ui Req 28.1)', () => {
  it('replies when nothing is typed or the sentence was just spoken; sentences while typing; never with the setting off', () => {
    const table: [boolean, boolean, boolean, string][] = [
      // typed, spoken, enabled -> mode
      [false, false, true, 'replies'],
      [true, true, true, 'replies'],
      [true, false, true, 'sentences'],
      [false, false, false, 'sentences'],
      [true, true, false, 'sentences'],
    ];
    for (const [typed, spoken, enabled, mode] of table) expect(suggestionMode({ typed, spoken, enabled })).toBe(mode);
  });
});

describe('replyRows', () => {
  it('a fixed set in a fixed order, and the visible text is what is spoken', () => {
    expect(QUICK_REPLIES).toEqual(['Hold on.', 'Yes.', 'No.', 'Pardon?', 'Thanks.']);
    expect(label(SHEET_REPLY_ROWS.map((r) => [...r]))).toEqual([['Hold on.', 'Yes.', 'No.'], ['Pardon?', 'Thanks.']]);
  });

  it('by rows: none on a short phone, row 1 on one row, both rows from 2, one line of 5 on laptops', () => {
    expect(replyRows(0)).toEqual([]);
    expect(label(replyRows(1))).toEqual([['Hold on.', 'Yes.', 'No.']]);
    expect(label(replyRows(2))).toEqual([['Hold on.', 'Yes.', 'No.'], ['Pardon?', 'Thanks.', 'Phrases']]);
    expect(label(replyRows(4))).toEqual(label(replyRows(2)));
    expect(label(replyRows(1, 0, true))).toEqual([['Hold on.', 'Yes.', 'No.', 'Pardon?', 'Thanks.']]);
  });

  it('the reply-type slot (web-ui Req 29) is the last row from 2 rows, after the replies that fit', () => {
    expect(label(replyRows(1, 3))).toEqual([['Hold on.', 'Yes.', 'No.']]);
    expect(label(replyRows(2, 3))).toEqual([['Hold on.', 'Yes.', 'No.'], ['slot0', 'slot1', 'slot2']]);
    expect(label(replyRows(3, 3))).toEqual([['Hold on.', 'Yes.', 'No.'], ['Pardon?', 'Thanks.', 'Phrases'], ['slot0', 'slot1', 'slot2']]);
    expect(label(replyRows(4, 3))).toEqual(label(replyRows(3, 3)));
    expect(label(replyRows(1, 3, true))).toEqual([['Hold on.', 'Yes.', 'No.', 'Pardon?', 'Thanks.'], ['slot0', 'slot1', 'slot2']]);
  });

  it('property: never more rows than the area has, rows of at most 3 on the shells, "Yes." always 2nd in the scan row', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), fc.integer({ min: 0, max: 3 }), (rows, slot) => {
        const r = replyRows(rows, slot);
        expect(r.length).toBeLessThanOrEqual(rows);
        for (const row of r) expect(row.length).toBeLessThanOrEqual(3);
        expect(replyCells(r)[1]).toEqual({ kind: 'reply', text: 'Yes.' });
      }),
    );
  });
});

describe('acceptReply (web-ui Req 28.2)', () => {
  it('a second press of the same reply inside the accept delay is ignored; another reply or a later press counts', () => {
    let last: { text: string; at: number } | null = null;
    const press = (text: string, at: number) => {
      const r = acceptReply(last, text, at, 150);
      last = r.last;
      return r.ok;
    };
    expect(press('Yes.', 1000)).toBe(true);
    expect(press('Yes.', 1100)).toBe(false);
    expect(press('Yes.', 1149)).toBe(false);
    expect(press('No.', 1160)).toBe(true);
    expect(press('No.', 1400)).toBe(true);
    expect(acceptReply({ text: 'Yes.', at: 0 }, 'Yes.', 10, 0).ok).toBe(true);
  });
});

describe('the quickReplies setting (contracts.md §4)', () => {
  it('is on by default and only an explicit false turns it off', () => {
    expect(DEFAULT_SETTINGS.quickReplies).toBe(true);
    expect(sanitizeSettings({}).quickReplies).toBe(true);
    expect(sanitizeSettings({ quickReplies: 'no' }).quickReplies).toBe(true);
    expect(sanitizeSettings({ quickReplies: false }).quickReplies).toBe(false);
  });
});
