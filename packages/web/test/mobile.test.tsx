// Phone and tablet layout details that can be checked without a real layout engine
// (docs/research/mobile-layout.md). Sizes, fit and key stability per device are checked in a
// browser by test/e2e/responsive.mjs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { miniDict } from './fixtures';

afterEach(cleanup);

const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');
const css = (f: string) => read(`styles/${f}`);

describe('phones and tablets', () => {
  it.each(['compact', 'wide'] as const)('%s: short action labels keep their full accessible names', (layout) => {
    render(<CommunicationScreen initialDict={miniDict()} layout={layout} />);
    // The sentence's actions show while there is a sentence (web-ui Req 40.4).
    expect(screen.queryByRole('button', { name: 'Save phrase' })).toBeNull();
    fireEvent.keyDown(window, { key: '4', code: 'Digit4' });
    expect(screen.getByRole('button', { name: 'Save phrase' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Spell this word' })).toBeTruthy();
  });

  it('split (tablet landscape) renders the one-screen shell: card, suggestions, action bar, then the keypad', () => {
    const { container } = render(<CommunicationScreen initialDict={miniDict()} layout="split" />);
    const main = container.querySelector('main.app-main--split')!;
    expect(main).toBeTruthy();
    // 27.5: the conversation strip first, above the card.
    expect([...main.querySelectorAll('.shell-screen > [data-section]')].map((c) => c.getAttribute('data-section'))).toEqual(['thread', 'speak', 'cands', 'actions', 'pad']);
    expect(container.querySelector('.app-footer')).toBeNull();
  });

  it('25.3 27.4 They said is a speech-bubble button in the header; with a turn it shows the newest one, named by its words', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    const empty = screen.getByRole('button', { name: 'They said' });
    expect(empty.className).toContain('header-partner--empty');
    expect(empty.querySelector('.nl-icon')).toBeTruthy();
    // No turns yet: one tap opens the They said field.
    fireEvent.click(empty);
    fireEvent.change(screen.getByPlaceholderText('Type what the other person said'), { target: { value: 'Tea or coffee?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    const full = screen.getByRole('button', { name: 'They: Tea or coffee?' });
    expect(full.className).not.toContain('header-partner--empty');
    expect(full.querySelector('.thread-tag')!.textContent).toBe('They');
    expect(full.querySelector('.header-partner__text')!.textContent).toBe('Tea or coffee?');
    // With turns it opens the Conversation sheet.
    fireEvent.click(full);
    expect(document.querySelector('dialog[data-overlay="conversation"]')?.hasAttribute('open')).toBe(true);
  });

  it('rotate (a phone held sideways) shows only the turn-upright screen', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="rotate" />);
    expect(screen.getByRole('alert').textContent).toContain('Turn your phone upright');
    expect(document.querySelector('button[data-key]')).toBeNull();
  });

  it('keys are sized from the small viewport (svh), never dvh, so they do not resize with the toolbar', () => {
    const app = css('app.css');
    expect(app).not.toMatch(/--nl-key:[^;]*dvh/);
    expect(app).toMatch(/--nl-key:[^;]*100svh/);
  });

  it('25.1 the stack shell keeps its fit rules: its height comes from svh (never dvh) and the safe areas', () => {
    const rule = /\.app--stack \.shell-screen \{([^}]*)\}/.exec(css('app.css'))?.[1] ?? '';
    expect(rule).toContain('min-height: calc(100svh - max(var(--space-2), env(safe-area-inset-top)) - var(--shell-head));');
    expect(rule).toContain('env(safe-area-inset-bottom)');
    expect(rule).not.toContain('dvh');
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
