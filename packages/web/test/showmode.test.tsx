// Show mode's Flip (docs/research/mobile-aac-evidence.md: every major text AAC app can turn the big
// text for the person opposite; iOS cannot lock orientation from a web page, so it is a CSS rotation).
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ShowMode } from '@/components/ShowMode';

afterEach(cleanup);

const message = () => document.querySelector('.show__message')!;

describe('ShowMode Flip', () => {
  it('turns the message for the person opposite and says so; the buttons stay upright', () => {
    render(<ShowMode text="I need water" reason={null} onClose={() => undefined} />);
    const flip = screen.getByRole('button', { name: 'Flip' });
    expect(flip.getAttribute('aria-pressed')).toBe('false');
    expect(message().className).not.toContain('is-flipped');
    fireEvent.click(flip);
    expect(flip.getAttribute('aria-pressed')).toBe('true');
    expect(message().className).toContain('is-flipped');
    expect(message().textContent).toContain('I need water');
    // Done and Flip are outside the rotated block.
    expect(message().contains(flip)).toBe(false);
    expect(message().contains(screen.getByRole('button', { name: 'Done' }))).toBe(false);
    expect(screen.getByText('Text flipped for the person across from you.')).toBeTruthy();
    fireEvent.click(flip);
    expect(message().className).not.toContain('is-flipped');
  });

  it('opens unflipped every time', () => {
    const { rerender } = render(<ShowMode text="I need water" reason={null} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Flip' }));
    rerender(<ShowMode text={null} reason={null} onClose={() => undefined} />);
    rerender(<ShowMode text="Thank you" reason={null} onClose={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Flip' }).getAttribute('aria-pressed')).toBe('false');
    expect(message().className).not.toContain('is-flipped');
  });

  it('switch scanning: Done then Flip, in one scan row', () => {
    render(<ShowMode text="I need water" reason={null} scanning onClose={() => undefined} />);
    const row = document.querySelector<HTMLElement>('[data-scan-row="done"]')!;
    expect(within(row).getAllByRole('button').map((b) => b.textContent)).toEqual(['Done', 'Flip']);
  });
});
