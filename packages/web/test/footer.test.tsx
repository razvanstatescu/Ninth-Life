import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Footer, NOT_A_MEDICAL_DEVICE } from '@/components/Footer';

afterEach(cleanup);

const footerLinks = () => within(screen.getByRole('navigation', { name: 'Footer' })).getAllByRole('link');

describe('Footer (plan F12)', () => {
  it('MS-1.5 on the keypad links to About and to the website at /, as real links', () => {
    render(<Footer />);
    expect(screen.getByText(NOT_A_MEDICAL_DEVICE)).toBeTruthy();
    expect(footerLinks().map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['About Ninth Life (opens in a new tab)', '/about'],
      ['How Ninth Life works (opens in a new tab)', '/'],
    ]);
  });

  it('36.7 the keypad\'s links to the website open in a new tab, so the sentence is kept', () => {
    render(<Footer />);
    for (const a of footerLinks()) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    }
  });

  it('MS-1.5 on /about links back to the keypad at /app and to the website at /', () => {
    render(<Footer about={false} />);
    expect(footerLinks().map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Back to the keypad', '/app'],
      ['How Ninth Life works', '/'],
    ]);
  });

  it('gives every link a distinct accessible name', () => {
    render(<Footer />);
    const names = footerLinks().map((a) => a.textContent);
    expect(new Set(names).size).toBe(names.length);
    expect(screen.getByRole('link', { name: 'How Ninth Life works (opens in a new tab)' }).tagName).toBe('A');
  });
});
