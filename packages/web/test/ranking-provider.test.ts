// What the website's ranking drawing says is sent (marketing-site MS-7.10) against what the client really sends.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildRequest } from '../lib/decodeClient';
import { RANKING_SENT } from '../lib/rankingProvider';

const CONTENT = readFileSync(resolve(__dirname, '../../../.kiro/specs/marketing-site/content.md'), 'utf8');

/** The index of each needle in text, in order, or -1 for one that is missing or out of order. */
function positions(text: string, needles: readonly string[]): number[] {
  let from = 0;
  return needles.map((n) => {
    const i = text.indexOf(n, from);
    if (i >= 0) from = i + n.length;
    return i;
  });
}

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

    // The items appear in this order in the Privacy card (§6) and the §9 answer. The card says "its own best
    // guesses", so the owner of the guesses is not compared there.
    const card = CONTENT.match(/^- `h3` \*\*Model ranking, if you turn it on\*\*.*$/m)?.[0].toLowerCase();
    const answer = CONTENT.match(/^- \*\*What does model ranking send, and to whom\?\*\*.*$/m)?.[0].toLowerCase();
    expect(card).toBeDefined();
    expect(answer).toBeDefined();
    const lower = RANKING_SENT.map((s) => s.toLowerCase());
    for (const p of positions(answer!, lower)) expect(p).toBeGreaterThanOrEqual(0);
    const cardNeedles = lower.map((s) => s.replace("ninth life's ", ''));
    for (const p of positions(card!, cardNeedles)) expect(p).toBeGreaterThanOrEqual(0);
  });
});
