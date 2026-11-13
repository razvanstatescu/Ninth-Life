import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chunk } from '@/components/PhrasesSheet';
import { chooseLayout, COMPACT_SENTENCES, isShell, isTwoColumn, LANDSCAPE_QUERY, PHONE_QUERY, sectionOrder, SPLIT_QUERY, TOUCH_QUERY, WIDE_QUERY, STACK_SHORT_QUERY, stackSuggestionRows, splitSuggestionRows, visibleSentences } from '@/lib/layout';
import { statusLines, statusSummary } from '@/lib/status';

describe('layout (web-ui Req 15)', () => {
  it('Req 15.1: compact puts the keypad right after the SpeakBar, then sentences, then proof', () => {
    const [col] = sectionOrder('compact').columns;
    expect(sectionOrder('compact').columns).toHaveLength(1);
    expect(col!.indexOf('speak')).toBe(0);
    expect(col!.indexOf('pad')).toBe(1);
    expect(col!.indexOf('cands')).toBeGreaterThan(col!.indexOf('pad'));
    expect(col!.indexOf('proof')).toBeGreaterThan(col!.indexOf('cands'));
    // 27: the conversation panel takes the old They said card's place.
    expect(col).toEqual(['speak', 'pad', 'scan', 'cands', 'proof', 'thread', 'hint']);
  });

  it('Req 15.6: wide keeps the artboard: talk column beside the keypad column', () => {
    expect(sectionOrder('wide').columns).toEqual([
      ['thread', 'speak', 'cands', 'proof'],
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
    // 27.5: the conversation strip sits above the card.
    expect(left).toEqual(['thread', 'speak', 'cands', 'actions']);
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

/**
 * /app first paint (Round 3; verifier 2026-11-13). styles/app.css hides the static wide HTML wherever chooseLayout
 * cannot pick wide. A tiny evaluator for the media features these queries use checks, on a grid of devices, that the
 * rule hides .app--wide exactly when chooseLayout picks something else, on screen, and never in print.
 */
describe('/app first-paint rule matches chooseLayout', () => {
  const appCss = readFileSync(resolve(__dirname, '../styles/app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  type Env = { type: 'screen' | 'print'; coarse: boolean; width: number; height: number };

  /** One media query list ("a, b"), with the features used in lib/layout.ts and app.css. */
  function matches(list: string, env: Env): boolean {
    return list.split(',').some((raw) => {
      let q = raw.trim();
      const negate = /^not\s/.test(q);
      if (negate) q = q.replace(/^not\s+/, '');
      const ok = q.split(/\s+and\s+/).every((part) => {
        if (part === 'all') return true;
        if (part === 'screen' || part === 'print') return env.type === part;
        const f = /^\(\s*([a-z-]+)\s*:\s*([a-z0-9.]+?)(px)?\s*\)$/.exec(part);
        if (!f) throw new Error(`unknown media part: ${part}`);
        const [, name, value] = f;
        const n = Number(value);
        switch (name) {
          case 'pointer': return (env.coarse ? 'coarse' : 'fine') === value;
          case 'min-width': return env.width >= n;
          case 'max-width': return env.width <= n;
          case 'min-height': return env.height >= n;
          case 'max-height': return env.height <= n;
          case 'orientation': return (env.width > env.height ? 'landscape' : 'portrait') === value;
          default: throw new Error(`unknown media feature: ${name}`);
        }
      });
      return negate ? !ok : ok;
    });
  }

  /** The chain of @media preludes around `.app--wide { visibility: hidden; }`, outermost first. */
  function hidingPreludes(): string[] {
    const at = appCss.search(/\.app--wide\s*\{\s*visibility:\s*hidden;?\s*\}/);
    expect(at).toBeGreaterThan(-1);
    const chain: string[] = [];
    const re = /@media([^{]*)\{/g;
    for (let m = re.exec(appCss); m && m.index < at; m = re.exec(appCss)) {
      let depth = 1;
      let i = re.lastIndex;
      for (; i < appCss.length && depth > 0; i += 1) {
        if (appCss[i] === '{') depth += 1;
        else if (appCss[i] === '}') depth -= 1;
      }
      if (i > at) chain.push(m[1]!.trim());
    }
    return chain;
  }

  const hidden = (env: Env) => hidingPreludes().every((p) => matches(p, env));
  const layoutFor = (env: Env, screenShort: number) =>
    chooseLayout({
      touch: matches(TOUCH_QUERY, env),
      landscape: matches(LANDSCAPE_QUERY, env),
      shortSide: screenShort,
      wide: matches(WIDE_QUERY, env),
      split: matches(SPLIT_QUERY, env),
      narrow: matches(PHONE_QUERY, env),
    });

  it('the rule is screen-only and its query is TOUCH_QUERY or not WIDE_QUERY', () => {
    expect(hidingPreludes()).toEqual(['screen', `${TOUCH_QUERY}, not all and ${WIDE_QUERY}`]);
  });

  it('on screen it hides .app--wide exactly when chooseLayout picks another layout', () => {
    const sizes: [number, number][] = [[320, 568], [390, 844], [844, 390], [599, 800], [600, 800], [768, 1024], [1024, 768], [959, 700], [960, 700], [1133, 744], [1280, 800], [1440, 900], [2560, 1440]];
    for (const coarse of [false, true]) {
      for (const [width, height] of sizes) {
        const env: Env = { type: 'screen', coarse, width, height };
        const layout = layoutFor(env, Math.min(width, height));
        expect(hidden(env), `${coarse ? 'coarse' : 'fine'} ${width}x${height} -> ${layout}`).toBe(layout !== 'wide');
      }
    }
  });

  it('a touchscreen laptop at 1440px: fine primary pointer gets wide and sees it; coarse gets a shell and the wide HTML stays hidden', () => {
    const fine: Env = { type: 'screen', coarse: false, width: 1440, height: 900 };
    const coarse: Env = { ...fine, coarse: true };
    expect(layoutFor(fine, 900)).toBe('wide');
    expect(hidden(fine)).toBe(false);
    expect(layoutFor(coarse, 900)).toBe('split');
    expect(hidden(coarse)).toBe(true);
  });

  it('print never hides it (paper is narrower than 960px while the window layout can stay wide)', () => {
    for (const coarse of [false, true]) expect(hidden({ type: 'print', coarse, width: 794, height: 1123 })).toBe(false);
  });
});
