import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTokensCss, resolveAlias } from '../scripts/gen-tokens.mjs';

const tokens = JSON.parse(readFileSync(resolve(__dirname, '../../../design/system/tokens.json'), 'utf8'));
const css: string = buildTokensCss(tokens);

function block(selector: string): string {
  const i = css.indexOf(`${selector} {`);
  expect(i, selector).toBeGreaterThanOrEqual(0);
  return css.slice(i, css.indexOf('}', i));
}

describe('gen-tokens', () => {
  it('emits night, day and system-light blocks', () => {
    expect(css).toContain('[data-theme="night"]');
    expect(css).toContain('[data-theme="day"] {');
    expect(css).toMatch(/@media \(prefers-color-scheme: light\) \{\s+\[data-theme="system"\]/);
  });

  it('resolves {alias} values per theme', () => {
    expect(block('[data-theme="day"]')).toContain('--key: #2a1856;');
    expect(block('[data-theme="day"]')).toContain('--focus: #1a0f3a;'); // {ink} on Day
    expect(css).toContain('--focus: #ffb13d;'); // {ember} on Night
    expect(css).not.toMatch(/\{[a-z-]+\}/);
  });

  it('includes shadows, sizes and type', () => {
    expect(block('[data-theme="day"]')).toContain('--glow-ember: 0 0 0 6px #2a1856;');
    expect(css).toContain('--target-min: 56px;');
    expect(css).toContain('--type-utterance-size: 40px;');
  });

  it('MS-8.2 emits every motion token on :root with its value', () => {
    const motion: { name: string; value: string }[] = tokens.motion.tokens;
    expect(motion.map((t) => t.name)).toEqual([
      'motion-jump',
      'motion-crossfade',
      'motion-fade',
      'motion-fade-slow',
      'motion-delay-arrival',
      'motion-stagger',
      'motion-autoplay-delay',
      'motion-demo-step',
      'motion-reveal-distance',
      'motion-state',
      'motion-nudge',
      'motion-play-lead',
      'motion-frame',
      'motion-frame-quick',
      'motion-sweep',
      'motion-hint',
      'motion-grow',
      'motion-ease-out',
      'motion-ease-linear',
    ]);
    const root = block(':root');
    for (const t of motion) expect(root).toContain(`--${t.name}: ${t.value};`);
    expect(root).toContain('--motion-demo-step: 520ms;');
    expect(root).toContain('--motion-ease-out: cubic-bezier(0.2, 0, 0, 1);');
  });

  it('MS-8.2 the round-2 motion tokens are on :root with their values', () => {
    const root = block(':root');
    expect(root).toContain('--motion-state: 200ms;');
    expect(root).toContain('--motion-nudge: 8px;');
    expect(root).toContain('--motion-play-lead: 300ms;');
    expect(root).toContain('--motion-frame: 600ms;');
    expect(root).toContain('--motion-frame-quick: 400ms;');
    expect(root).toContain('--motion-sweep: 240ms;');
  });

  // Round 4 (2026-11-13, Claude Code): the shared language's tokens (decisions §1.1) and the Results bars' grow (PO-1).
  it('MS-8.2 MS-8.14 the round-4 tokens: motion-hint, motion-grow and the state group on :root', () => {
    const root = block(':root');
    expect(root).toContain('--motion-hint: 4px;');
    expect(root).toContain('--motion-grow: 600ms;');
    const state: { name: string; value: string }[] = tokens.state.tokens;
    expect(state.map((t) => t.name)).toEqual(['state-hover']);
    expect(root).toContain('--state-hover: 0.08;');
  });

  it('throws on unknown or circular aliases', () => {
    expect(() => resolveAlias('{nope}', 'night', {})).toThrow(/Unknown/);
    expect(() => resolveAlias('{a}', 'night', { a: '{b}', b: '{a}' })).toThrow(/Circular/);
  });

  it('matches the committed styles/tokens.css', () => {
    const committed = readFileSync(resolve(__dirname, '../styles/tokens.css'), 'utf8');
    expect(committed).toBe(css);
  });
});
