// Phone and tablet layout details that can be checked without a real layout engine
// (docs/research/mobile-layout.md). Sizes, fit and key stability per device are checked in a
// browser by test/e2e/responsive.mjs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { miniDict } from './fixtures';

afterEach(cleanup);

const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');
const css = (f: string) => read(`styles/${f}`);

describe('phones and tablets', () => {
  it.each(['compact', 'split', 'wide'] as const)('%s: short action labels keep their full accessible names', (layout) => {
    render(<CommunicationScreen initialDict={miniDict()} layout={layout} />);
    expect(screen.getByRole('button', { name: 'Save phrase' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Spell this word' })).toBeTruthy();
  });

  it('split renders two columns with only the keypad in the right one', () => {
    const { container } = render(<CommunicationScreen initialDict={miniDict()} layout="split" />);
    const main = container.querySelector('main.app-main--split')!;
    expect(main).toBeTruthy();
    const pad = main.querySelector('.app-main__pad')!;
    expect([...pad.children].map((c) => c.getAttribute('data-section'))).toEqual(['pad']);
  });

  it('keys are sized from the small viewport (svh), never dvh, so they do not resize with the toolbar', () => {
    const app = css('app.css');
    expect(app).not.toMatch(/--nl-key:[^;]*dvh/);
    expect(app).toMatch(/--nl-key:[^;]*100svh/);
  });

  it('the page opts into safe areas and keeps zoom on', () => {
    const layout = read('app/layout.tsx');
    expect(layout).toContain("viewportFit: 'cover'");
    expect(layout).not.toMatch(/(maximumScale|userScalable)\s*:/);
    expect(css('app.css')).toContain('env(safe-area-inset-bottom)');
  });

  it('no pull-to-refresh and no double-tap zoom, but pinch zoom stays (manipulation, not none)', () => {
    const g = css('globals.css');
    expect(g).toContain('overscroll-behavior: none');
    expect(g).toContain('touch-action: manipulation');
    expect(g).not.toContain('touch-action: none');
  });
});
