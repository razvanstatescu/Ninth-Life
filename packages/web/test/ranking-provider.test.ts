// What the website's ranking drawing says is sent (marketing-site MS-7.10) against what the client really sends.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildRequest } from '../lib/decodeClient';
import { RANKING_SENT, rankingSentText } from '../lib/rankingProvider';

const CONTENT = readFileSync(resolve(__dirname, '../../../.kiro/specs/marketing-site/content.md'), 'utf8');

describe('RANKING_SENT', () => {
  it('MS-7.10 RANKING_SENT maps to codes, lattice, beams and context.partner', () => {
    expect(RANKING_SENT).toEqual([
      'Your keys',
      'The dictionary words that match them',
      "Ninth Life's own best guesses",
      "The other person's last line",
    ]);
    const req = buildRequest(['4663'], [['home', 'good']], 'Tea?', 'letter', 5, [['home']]);
    expect(req).not.toBeNull();
    // Item 1 to codes, 2 to lattice, 3 to beams, 4 to context.partner.
    expect(req!.codes).toEqual(['4663']);
    expect(req!.lattice).toEqual([['home', 'good']]);
    expect(req!.beams).toEqual([['home']]);
    expect(req!.context.partner).toBe('Tea?');
    expect(req!.context.recent).toEqual([]);
    // v, lang, mode and k carry no typed data and are not listed.
    expect(Object.keys(req!).sort()).toEqual(['beams', 'codes', 'context', 'k', 'lang', 'lattice', 'mode', 'v']);

    // Round 5 (2026-11-17): content.md §6 lists what ranking sends once, in Privacy's Model ranking row, written by
    // rankingSentText() (the clause in RANKING_SENT order, tested below); the §9 answer that repeated it is gone.
    const row = CONTENT.match(/^ {2}- \*\*Model ranking\*\* \(toggle icon\): .*$/m)?.[0];
    expect(row).toBeDefined();
    expect(row).toContain('sends {rankingSentText()} to {provider.service}');
    expect(CONTENT).not.toMatch(/^- \*\*What does model ranking send, and to whom\?\*\*/m);
  });
});

describe('rankingSentText (one list everywhere, landing review 2026-11-12)', () => {
  it('joins RANKING_SENT into one clause, keeping the name capitalised', () => {
    expect(rankingSentText()).toBe("your keys, the dictionary words that match them, Ninth Life's own best guesses and the other person's last line");
    expect(rankingSentText(['A', 'B'])).toBe('a and b');
    expect(rankingSentText(['Only'])).toBe('only');
  });

  it('/about says what ranking sends with the same clause', () => {
    const about = readFileSync(resolve(__dirname, '../app/about/page.tsx'), 'utf8');
    expect(about).toContain('rankingSentText()');
  });
});
