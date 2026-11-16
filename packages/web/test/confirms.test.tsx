// The one confirm (web-ui Req 39.3) and the backdrop guard (Req 36.4): every question that asks before an action is a
// Confirm, which carries `data-confirm`, so a press on the backdrop never closes a surface while it is asked.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Confirm } from '@/components/Confirm';
import { ConversationSheet } from '@/components/ConversationSheet';
import { MyWordsSheet } from '@/components/MyWordsSheet';
import { PhrasesSheet } from '@/components/PhrasesSheet';
import { recordMine } from '@/lib/conversation';
import { showsConfirm } from '@/lib/surface';
import type { Phrase } from '@/lib/storage';

beforeEach(() => {
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const guarded = (el: Element) => !!el.closest('[data-confirm]') && showsConfirm(el.closest('dialog') ?? document.body);
const PHRASE: Phrase = { id: 'p1', text: 'I need water', lang: 'en', uses: 1, lastUsed: 1, pinned: false };

describe('39.3 the one confirm', () => {
  it('the question in bold, the safe choice first and focused, the action second; red only when irreversible', () => {
    const { rerender } = render(<Confirm name="t" question="Delete it?" action="Delete" onSafe={() => undefined} onAction={() => undefined} scanRow="c" />);
    const box = document.querySelector<HTMLElement>('[data-confirm="t"]')!;
    expect(within(box).getAllByRole('button').map((b) => b.textContent)).toEqual(['Keep', 'Delete']);
    expect(document.activeElement?.textContent).toBe('Keep');
    expect(box.querySelector('.confirm__q')?.textContent).toBe('Delete it?');
    expect(box.classList.contains('confirm--danger')).toBe(false);
    rerender(<Confirm name="t" question="Delete it?" action="Delete" irreversible onSafe={() => undefined} onAction={() => undefined} scanRow="c" />);
    expect(box.classList.contains('confirm--danger')).toBe(true);
  });

  it('while scanning, focus rests on the question, not a button', () => {
    render(<Confirm name="t" question="Q?" action="Go" scanning onSafe={() => undefined} onAction={() => undefined} scanRow="c" />);
    expect(document.activeElement?.getAttribute('data-confirm')).toBe('t');
  });
});

describe('36.4 every confirm carries data-confirm', () => {
  it('Clear conversation', () => {
    act(() => recordMine('Hello.', 'keys'));
    render(<ConversationSheet open dictation={{ allowed: false, onAllow: () => undefined }} onSayAgain={() => undefined} onShow={() => undefined} onAnnounce={() => undefined} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear conversation' }));
    expect(guarded(screen.getByRole('button', { name: 'Keep' }))).toBe(true);
  });

  it('Delete phrase, behind the phrase row\'s More', () => {
    render(<PhrasesSheet open phrases={[PHRASE]} error={null} onSpeak={() => undefined} onSpeakQuick={() => undefined} onDelete={() => undefined} onShow={() => undefined} onPin={() => undefined} onClose={() => undefined} />);
    const more = screen.getByRole('button', { name: 'More for I need water' });
    expect(more.closest('[data-scan-row]')!.querySelectorAll('button')).toHaveLength(2); // the row and its More: one scan row
    fireEvent.click(more);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Delete "I need water"' }));
    expect(guarded(screen.getByRole('button', { name: 'Keep' }))).toBe(true);
    expect(document.activeElement?.textContent).toBe('Keep');
  });

  it('Remove word, and the pack preview', async () => {
    render(
      <MyWordsSheet
        open
        words={[{ w: 'mihai', display: 'Mihai', boost: 1, added: 1, source: 'typed' }]}
        phrases={[]}
        lexicon={null}
        error={null}
        onAdd={() => null}
        onRemove={() => undefined}
        onImport={() => undefined}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove Mihai' }));
    expect(guarded(screen.getByRole('button', { name: 'Keep' }))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    const words = document.querySelector<HTMLTextAreaElement>('textarea')!;
    fireEvent.change(words, { target: { value: 'Ileana' } });
    fireEvent.click(screen.getByRole('button', { name: /check/i }));
    await act(async () => undefined);
    const cancel = screen.getAllByRole('button', { name: 'Cancel' })[0]!;
    expect(guarded(cancel)).toBe(true);
    // Cancel is the first choice of the preview (the safe one first).
    expect(cancel.parentElement!.querySelector('button')).toBe(cancel);
  });

  it('no component draws its own Keep button: questions go through Confirm', () => {
    const dir = resolve(__dirname, '../components');
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith('.tsx') && f !== 'Confirm.tsx')
      .filter((f) => />\s*Keep\s*</.test(readFileSync(resolve(dir, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
