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

  it('throws on unknown or circular aliases', () => {
    expect(() => resolveAlias('{nope}', 'night', {})).toThrow(/Unknown/);
    expect(() => resolveAlias('{a}', 'night', { a: '{b}', b: '{a}' })).toThrow(/Circular/);
  });

  it('matches the committed styles/tokens.css', () => {
    const committed = readFileSync(resolve(__dirname, '../styles/tokens.css'), 'utf8');
    expect(committed).toBe(css);
  });
});
