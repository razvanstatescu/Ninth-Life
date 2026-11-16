import { fireEvent, screen, within } from '@testing-library/react';

/**
 * Check the words (web-ui Req 40.6): on laptops the proof is a popover opened from the sentence's actions, as on
 * phones; the main screen keeps only its notes (Add to my words, a dropped model word). Opens it as a person would
 * (if it is not open yet) and returns it.
 */
export function openProof(): HTMLElement {
  const open = document.querySelector<HTMLElement>('dialog[data-overlay="proof"][open]');
  if (open) return open;
  fireEvent.click(screen.getByRole('button', { name: 'Check the words' }));
  return document.querySelector<HTMLElement>('dialog[data-overlay="proof"][open]')!;
}

/** Close Check the words if it is open (its Close button). */
export function closeProof(): void {
  const open = document.querySelector<HTMLElement>('dialog[data-overlay="proof"][open]');
  if (open) fireEvent.click(within(open).getByRole('button', { name: 'Close' }));
}

/** The state of each chip in Check the words, read and closed again. */
export function proofChips(): (string | null)[] {
  const states = [...openProof().querySelectorAll('.nl-chip')].map((c) => c.getAttribute('data-state'));
  closeProof();
  return states;
}
