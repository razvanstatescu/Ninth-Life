import { describe, expect, it } from 'vitest';
import { chunk } from '@/components/PhrasesSheet';
import { COMPACT_SENTENCES, sectionOrder, visibleSentences } from '@/lib/layout';
import { statusLines, statusSummary } from '@/lib/status';

describe('layout (web-ui Req 15)', () => {
  it('Req 15.1: compact puts the keypad right after the SpeakBar, then sentences, then proof', () => {
    const [col] = sectionOrder('compact').columns;
    expect(sectionOrder('compact').columns).toHaveLength(1);
    expect(col!.indexOf('speak')).toBe(0);
    expect(col!.indexOf('pad')).toBe(1);
    expect(col!.indexOf('cands')).toBeGreaterThan(col!.indexOf('pad'));
    expect(col!.indexOf('proof')).toBeGreaterThan(col!.indexOf('cands'));
    expect(col).toEqual(['speak', 'pad', 'scan', 'cands', 'proof', 'partner', 'hint']);
  });

  it('Req 15.6: wide keeps the artboard: talk column beside the keypad column', () => {
    expect(sectionOrder('wide').columns).toEqual([
      ['partner', 'speak', 'cands', 'proof'],
      ['pad', 'scan', 'hint'],
    ]);
  });

  it('Req 15.4: compact shows at most 3 sentences and a More control', () => {
    expect(COMPACT_SENTENCES).toBe(3);
    expect(visibleSentences(5, 'compact', false)).toEqual({ count: 3, more: true, canCollapse: false });
    expect(visibleSentences(5, 'compact', true)).toEqual({ count: 5, more: false, canCollapse: true });
    expect(visibleSentences(3, 'compact', false)).toEqual({ count: 3, more: false, canCollapse: false });
    expect(visibleSentences(0, 'compact', false)).toEqual({ count: 0, more: false, canCollapse: false });
    expect(visibleSentences(5, 'wide', false)).toEqual({ count: 5, more: false, canCollapse: false });
  });

  it('Req 15.4: a sentence chosen past the third opens the full list and keeps it open', () => {
    expect(visibleSentences(5, 'compact', false, 3)).toEqual({ count: 5, more: false, canCollapse: false });
    expect(visibleSentences(5, 'compact', false, 2)).toMatchObject({ count: 3, more: true });
  });
});

describe('status pill (web-ui Req 15.2)', () => {
  it('Req 15.2: one short summary, the most important state first, with the full text for screen readers', () => {
    expect(statusSummary('ready', true, false)).toMatchObject({ text: 'On device', full: 'Offline dictionary ready. Model ranking off.' });
    expect(statusSummary('ready', true, true).text).toBe('Model on');
    expect(statusSummary('ready', false, true)).toMatchObject({
      text: 'Offline',
      full: 'Offline dictionary ready. Offline. Using your dictionary. Model ranking paused offline.',
    });
    expect(statusSummary('loading', true, false).text).toBe('Loading');
    expect(statusSummary('missing', false, false)).toMatchObject({ text: 'No dictionary', tone: 'warn' });
  });

  it('Req 15.3: the wide header and the Menu sheet list every state', () => {
    expect(statusLines('ready', false, false).map((l) => l.text)).toEqual(['Offline dictionary ready', 'Offline. Using your dictionary.', 'Model ranking off']);
  });
});

describe('quick phrase rows (web-ui Req 17.3)', () => {
  it('Req 17.3: phrases are grouped 4 to a scan row', () => {
    expect(chunk(['a', 'b', 'c', 'd', 'e', 'f'], 4)).toEqual([
      ['a', 'b', 'c', 'd'],
      ['e', 'f'],
    ]);
  });
});
