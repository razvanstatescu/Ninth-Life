import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Keypad } from '@/components/Keypad';
import { ProofChip } from '@/components/ProofChip';
import { SpeakBar } from '@/components/SpeakBar';

afterEach(cleanup);

describe('Keypad', () => {
  it('renders 12 real buttons in the fixed layout with spaced labels', () => {
    render(<Keypad onPress={() => undefined} />);
    const pad = screen.getByRole('group', { name: 'Keypad' });
    const keys = within(pad).getAllByRole('button');
    expect(keys.map((k) => k.getAttribute('aria-label'))).toEqual([
      '1, punctuation', '2, A B C', '3, D E F',
      '4, G H I', '5, J K L', '6, M N O',
      '7, P Q R S', '8, T U V', '9, W X Y Z',
      'Back', '0, space', 'Next word',
    ]);
    expect(keys.every((k) => k.tagName === 'BUTTON' && k.getAttribute('type') === 'button')).toBe(true);
  });

  it('calls onPress with the key and marks the scan row and lit key', () => {
    const onPress = vi.fn();
    const { container } = render(<Keypad onPress={onPress} scanRow={2} litKey={[2, 2]} />);
    fireEvent.click(screen.getByRole('button', { name: '4, G H I' }));
    expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ id: '4' }));
    expect(container.querySelectorAll('.is-scanning')).toHaveLength(1);
    const lit = container.querySelectorAll('.is-lit');
    expect(lit).toHaveLength(1);
    expect(lit[0]?.getAttribute('aria-label')).toBe('9, W X Y Z');
  });
});

describe('ProofChip', () => {
  it.each([
    ['match', 'matches your keys'],
    ['new', 'not in your words yet'],
    ['reject', 'will not be spoken'],
  ] as const)('%s has an icon, a word and spoken state text', (state, text) => {
    const { container } = render(<ProofChip state={state} word="water" code="92837" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.textContent).toContain('water');
    expect(container.textContent).toContain(text);
    expect(container.querySelector(`.nl-chip--${state}`)).not.toBeNull();
  });
});

describe('SpeakBar', () => {
  it('empty state: muted prompt and a disabled quiet Speak', () => {
    render(<SpeakBar tokens={[]} words={[]} codes={[]} canSpeak={false} emptyText="Press a key to start" speakVariant="primary" onSpeak={() => undefined} />);
    expect(screen.getByText('Press a key to start').className).toContain('is-empty');
    const speak = screen.getByRole('button', { name: 'Speak' });
    expect((speak as HTMLButtonElement).disabled).toBe(true);
    expect(speak.className).toContain('nl-btn--quiet');
  });

  it('shows the sentence with its digit codes and an ember Speak', () => {
    const words = [
      { word: 'i', code: '4', state: 'match' as const },
      { word: 'need', code: '6333', state: 'match' as const },
    ];
    render(<SpeakBar tokens={['I', 'need']} words={words} codes={['4', '6333']} canSpeak emptyText="" speakVariant="primary" onSpeak={() => undefined} />);
    expect(screen.getByText('4 6333')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Speak' }).className).toContain('nl-btn--primary');
  });
});
