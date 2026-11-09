import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Footer, NOT_A_MEDICAL_DEVICE } from '@/components/Footer';

afterEach(cleanup);

const footerLinks = () => within(screen.getByRole('navigation', { name: 'Footer' })).getAllByRole('link');

describe('Footer (plan F12)', () => {
  it('on the keypad links to About and to the /welcome page, as real links', () => {
    render(<Footer />);
    expect(screen.getByText(NOT_A_MEDICAL_DEVICE)).toBeTruthy();
    expect(footerLinks().map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['About Ninth Life', '/about'],
      ['How Ninth Life works', '/welcome'],
    ]);
  });

  it('on /about links back to the keypad and to /welcome', () => {
    render(<Footer about={false} />);
    expect(footerLinks().map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Back to the keypad', '/'],
      ['How Ninth Life works', '/welcome'],
    ]);
  });

  it('gives every link a distinct accessible name', () => {
    render(<Footer />);
    const names = footerLinks().map((a) => a.textContent);
    expect(new Set(names).size).toBe(names.length);
    expect(screen.getByRole('link', { name: 'How Ninth Life works' }).tagName).toBe('A');
  });
});
