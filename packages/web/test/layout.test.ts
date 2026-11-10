import { describe, expect, it } from 'vitest';
import { chunk } from '@/components/PhrasesSheet';
import { chooseLayout, COMPACT_SENTENCES, isShell, isTwoColumn, sectionOrder, SPLIT_QUERY, STACK_SHORT_QUERY, stackSuggestionRows, splitSuggestionRows, visibleSentences } from '@/lib/layout';
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

  it('split (tablet in landscape, web-ui Req 25): card, suggestions and action bar on the left, the keypad alone on the right', () => {
    const [left, pad] = sectionOrder('split').columns;
    expect(left).toEqual(['speak', 'cands', 'actions']);
    expect(pad).toEqual(['pad']);
    expect(isTwoColumn('split')).toBe(true);
    expect(isTwoColumn('wide')).toBe(true);
    expect(isTwoColumn('compact')).toBe(false);
    expect(isShell('split')).toBe(true);
    expect(isShell('stack')).toBe(true);
    expect(isShell('wide')).toBe(false);
  });

  it('ADR-003: touch phones are portrait only, touch tablets use both orientations, desktops keep their layouts', () => {
    const base = { wide: false, split: false, narrow: false };
    // Phones (shorter screen side < 600px).
    expect(chooseLayout({ ...base, touch: true, landscape: false, shortSide: 393, narrow: true })).toBe('stack');
    expect(chooseLayout({ ...base, touch: true, landscape: true, shortSide: 393, split: true })).toBe('rotate');
    // Tablets, whatever the window width.
    expect(chooseLayout({ ...base, touch: true, landscape: false, shortSide: 820 })).toBe('stack');
    expect(chooseLayout({ ...base, touch: true, landscape: true, shortSide: 820, wide: true })).toBe('split');
    expect(chooseLayout({ ...base, touch: true, landscape: false, shortSide: 1024, wide: true })).toBe('stack');
    // Mouse and keyboard windows.
    expect(chooseLayout({ ...base, touch: false, landscape: true, shortSide: 900, wide: true })).toBe('wide');
    expect(chooseLayout({ ...base, touch: false, landscape: false, shortSide: 900 })).toBe('compact');
    expect(chooseLayout({ ...base, touch: false, landscape: false, shortSide: 900, narrow: true })).toBe('stack');
    expect(chooseLayout({ ...base, touch: false, landscape: true, shortSide: 900, split: true })).toBe('split');
  });

  it('24.9 stackSuggestionRows returns 0 when the screen is short, whatever the taller rungs say', () => {
    expect(stackSuggestionRows({ r2: false, r3: false, r4: false, short: true })).toBe(0);
    expect(stackSuggestionRows({ r2: true, r3: true, r4: true, short: true })).toBe(0);
    expect(stackSuggestionRows({ r2: false, r3: false, r4: false, short: false })).toBe(1);
    // An exception query (max-height), so the server and jsdom keep the suggestion row.
    expect(STACK_SHORT_QUERY).toBe('(max-height: 547px)');
  });

  it('suggestion rows grow with the screen height', () => {
    expect(stackSuggestionRows({ r2: false, r3: false, r4: false })).toBe(1);
    expect(stackSuggestionRows({ r2: true, r3: false, r4: false })).toBe(2);
    expect(stackSuggestionRows({ r2: true, r3: true, r4: true })).toBe(4);
    expect(splitSuggestionRows({ r3: false, r4: false })).toBe(2);
    expect(splitSuggestionRows({ r3: true, r4: true })).toBe(4);
  });

  it('split matches only phones held sideways, and the CSS uses the same query', async () => {
    expect(SPLIT_QUERY).toBe('(max-width: 959px) and (min-width: 560px) and (max-height: 599px) and (orientation: landscape)');
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const css = readFileSync(resolve(__dirname, '../styles/app.css'), 'utf8');
    expect(css).toContain(`@media ${SPLIT_QUERY} {`);
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
