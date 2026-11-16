// The public claim after Finish the word and Fix a word (web-ui Req 31.8; improvement plan decision 1,
// D-claim): "Every spoken word matches the keys on screen, and nothing gets there without your press."
// Every place that stated the old claim ("... matches the keys you pressed") says the new one.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const FULL = 'Every spoken word matches the keys on screen, and nothing gets there without your press.';
const SHORT = /every spoken word matches the keys on screen/i;
/** The old claim, in the forms it was written. "matches your keys" for one word (a proof chip) stays true. */
const OLD = [/every spoken word matches (the keys you pressed|your keys)/i, /checked against the keys you pressed/i, /compared with the keys you pressed/i, /matches the keys you pressed/i];

// The files spec 2 §2 lists (the app, the website, the docs that state the claim).
const FILES = [
  'packages/web/components/ProofPanel.tsx',
  'packages/web/components/site/sections/Proof.tsx',
  'packages/web/components/site/sections/Faq.tsx',
  'packages/web/components/site/seo.ts',
  'packages/web/public/manifest.webmanifest',
  'packages/web/app/page.tsx',
  'packages/web/components/site/structured-data.ts',
  'packages/web/components/site/llms.ts',
  'packages/web/app/about/page.tsx',
  '.kiro/steering/product.md',
  'README.md',
  'docs/submission/DEVPOST.md',
  'design/system/README.md',
  '.kiro/specs/marketing-site/content.md',
  'docs/validation/outreach.md',
  'docs/validation/protocol.md',
];

describe('Req 31.8 the public claim (D-claim)', () => {
  it.each(FILES)('%s no longer states the old claim', (f) => {
    expect(existsSync(join(ROOT, f))).toBe(true);
    const text = read(f);
    for (const re of OLD) expect(text, `${f} still says ${re}`).not.toMatch(re);
  });

  it('product.md allows the new claim, word for word', () => {
    expect(read('.kiro/steering/product.md').toLowerCase()).toContain(FULL.toLowerCase().replace(/\.$/, ''));
  });

  it.each(['packages/web/components/site/sections/Proof.tsx', 'packages/web/components/site/structured-data.ts', 'packages/web/components/site/seo.ts', 'packages/web/public/manifest.webmanifest', 'README.md', 'docs/submission/DEVPOST.md'])(
    '%s states the new claim',
    (f) => {
      expect(read(f)).toMatch(SHORT);
    },
  );

  it('the app proof panel leads with "the keys on screen"', () => {
    expect(read('packages/web/components/ProofPanel.tsx')).toContain('Every word that can be spoken matches the keys on screen.');
  });

  it('the About page explains the filled-in keys', () => {
    expect(read('packages/web/app/about/page.tsx')).toContain('A word you finish from the word row brings its own keys; the screen marks the ones you did not press.');
  });
});
