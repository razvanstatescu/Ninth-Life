// The container system (web-ui Req 36, ADR-011): kinds, placement, closing by Back and by the backdrop,
// Back to Menu, focus. Layout per device class in a browser: test/e2e/surfaces.mjs.
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { FixSheet } from '@/components/FixSheet';
import { PartnerTurn } from '@/components/PartnerTurn';
import { Sheet } from '@/components/Sheet';
import { SurfaceContext, backdropCloses, holdsText, panelSide, placePopover, showsConfirm } from '@/lib/surface';
import { useBackCloses } from '@/lib/useBackCloses';
import { collectScanRows } from '@/lib/useOverlayScan';
import { miniDict } from './fixtures';

let now = 0;
beforeEach(() => {
  now = 100_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const VP = { width: 1280, height: 800 };
const box = (left: number, top: number, width = 120, height = 56) => ({ left, top, width, height });

describe('36.1 popover placement (large screens)', () => {
  it('opens below a header button, lined up with its right edge on the right half', () => {
    const at = placePopover(box(1100, 16), { width: 440, height: 300 }, VP);
    expect(at.side).toBe('below');
    expect(at.top).toBe(16 + 56 + 8);
    expect(at.left).toBe(1100 + 120 - 440);
  });
  it('rises above a bottom-bar button, lined up with its left edge on the left half', () => {
    const at = placePopover(box(24, 720), { width: 440, height: 400 }, VP);
    expect(at.side).toBe('above');
    expect(at.top).toBe(720 - 8 - 400);
    expect(at.left).toBe(24);
  });
  it('always stays inside the screen, 16px from every edge', () => {
    const at = placePopover(box(1240, 700, 30, 30), { width: 440, height: 900 }, VP);
    expect(at.left).toBeLessThanOrEqual(VP.width - 16 - 440);
    expect(at.top).toBeGreaterThanOrEqual(16);
    const left = placePopover(box(0, 100, 10, 10), { width: 440, height: 100 }, VP);
    expect(left.left).toBe(16);
  });
  it('fits on neither side: cut to the room on the larger side, never over its button', () => {
    const at = placePopover(box(500, 426), { width: 440, height: 560 }, VP);
    expect(at.side).toBe('above');
    expect(at.maxHeight).toBe(426 - 8 - 16);
    expect(at.top).toBe(16);
    expect(at.top + at.maxHeight!).toBeLessThanOrEqual(426 - 8);
  });
  it('is centred when no button is known (switch scanning, a deep link)', () => {
    const at = placePopover(null, { width: 440, height: 200 }, VP);
    expect(at).toEqual({ top: 300, left: 420, side: 'centre' });
  });
  it('panels open on the side of their button', () => {
    expect(panelSide(box(24, 720), 1180)).toBe('left');
    expect(panelSide(box(1100, 16), 1280)).toBe('right');
    expect(panelSide(null, 1280)).toBe('right');
  });
});

describe('36.4 the backdrop closes, except when it must not', () => {
  it('closes when nothing is at stake', () => {
    expect(backdropCloses({ scanning: false, hasText: false, confirming: false, openedAgoMs: 1000 })).toBe(true);
  });
  it('never while scanning, with typed text, with a question showing, or in the first 300ms', () => {
    expect(backdropCloses({ scanning: true, hasText: false, confirming: false, openedAgoMs: 1000 })).toBe(false);
    expect(backdropCloses({ scanning: false, hasText: true, confirming: false, openedAgoMs: 1000 })).toBe(false);
    expect(backdropCloses({ scanning: false, hasText: false, confirming: true, openedAgoMs: 1000 })).toBe(false);
    expect(backdropCloses({ scanning: false, hasText: false, confirming: false, openedAgoMs: 299 })).toBe(false);
  });
  it('finds typed text and questions', () => {
    const d = document.createElement('div');
    d.innerHTML = '<input type="text" value=""><input type="radio">';
    expect(holdsText(d)).toBe(false);
    d.querySelector('input')!.value = 'hello';
    expect(holdsText(d)).toBe(true);
    expect(showsConfirm(d)).toBe(false);
    d.innerHTML = '<div data-confirm="x"></div>';
    expect(showsConfirm(d)).toBe(true);
  });
});

function TestSheet({ open, onClose, kind, scanning, children }: { open: boolean; onClose: () => void; kind?: 'fit' | 'panel' | 'dialog'; scanning?: boolean; children?: React.ReactNode }) {
  return (
    <Sheet open={open} name="t" title="Test" onClose={onClose} kind={kind} scanning={scanning}>
      {children ?? (
        <div className="scan-cluster" data-scan-row="a">
          <button type="button">A</button>
        </div>
      )}
    </Sheet>
  );
}
const backdropPress = (d: Element) => {
  fireEvent.pointerDown(d);
  fireEvent.click(d);
};

describe('36.1 36.4 the Sheet', () => {
  it('marks its kind; a fit sheet has a decorative grabber, a panel a Done bar that is not a scan row', () => {
    const { rerender } = render(<TestSheet open kind="fit" onClose={() => undefined} />);
    const d = document.querySelector('dialog')!;
    expect(d.getAttribute('data-kind')).toBe('fit');
    expect(d.querySelector('.sheet__grabber')?.getAttribute('aria-hidden')).toBe('true');
    expect(d.querySelector('[data-action="done"]')).toBeNull();
    rerender(<TestSheet open kind="panel" onClose={() => undefined} />);
    const done = screen.getByRole('button', { name: 'Done, close Test' });
    expect(done.closest('[data-scan-row]')).toBeNull();
    expect(collectScanRows(d)[0]!.cells.map((c) => c.textContent)).toEqual(['Close']);
  });

  it('a press on the backdrop closes it after 300ms, never while scanning or with typed text', () => {
    const onClose = vi.fn();
    const { rerender } = render(<TestSheet open kind="fit" onClose={onClose} />);
    const d = document.querySelector('dialog')!;
    backdropPress(d);
    expect(onClose).not.toHaveBeenCalled(); // within 300ms of opening
    now += 400;
    backdropPress(d.querySelector('.sheet__body')!); // inside: not the backdrop
    expect(onClose).not.toHaveBeenCalled();
    backdropPress(d);
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<TestSheet open kind="fit" onClose={onClose} scanning />);
    backdropPress(d);
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <TestSheet open kind="fit" onClose={onClose}>
        <input type="text" defaultValue="Half a line" />
      </TestSheet>,
    );
    backdropPress(d);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('36.6 with Back from the context, Back is the second scan row, after Close', () => {
    const onBack = vi.fn();
    render(
      <SurfaceContext.Provider value={{ anchor: () => null, back: { label: 'Back to Menu', onBack } }}>
        <TestSheet open onClose={() => undefined} />
      </SurfaceContext.Provider>,
    );
    const rows = collectScanRows(document.querySelector('dialog')!);
    expect(rows.map((r) => r.cells.map((c) => c.textContent))).toEqual([['Close'], ['Back to Menu'], ['A']]);
    fireEvent.click(screen.getByRole('button', { name: 'Back to Menu' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('36.3 Back closes the surface on top', () => {
  it('adds one history entry while open; Back closes; closing otherwise takes the entry off', async () => {
    const close = vi.fn();
    const start = window.history.length;
    const { rerender } = renderHook(({ open }) => useBackCloses(open, close), { initialProps: { open: false } });
    expect(window.history.length).toBe(start); // never on first load
    rerender({ open: true });
    expect(window.history.length).toBe(start + 1);
    expect(window.history.state?.nlSurface).toBe(true);
    rerender({ open: true }); // a surface that replaces another keeps the one entry
    expect(window.history.length).toBe(start + 1);
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(close).toHaveBeenCalledTimes(1);
    rerender({ open: false });
    // Opened again and closed with Close: the entry is taken off, and that popstate does not close anything.
    rerender({ open: true });
    rerender({ open: false });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(window.history.state?.nlSurface).not.toBe(true);
  });
});

const KEY = { 4: '4 GHI, G H I' } as Record<string, string>;
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('36.6 a surface the Menu opened has Back to Menu', () => {
  it('Menu > Phrases has Back to Menu, which brings the Menu back; Close goes to the main screen', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    press('Menu');
    const menu = document.querySelector('dialog[data-overlay="menu"]')!;
    fireEvent.click(within(menu as HTMLElement).getByRole('button', { name: 'Phrases' }));
    expect(document.querySelector('dialog[data-overlay="phrases"][open]')).not.toBeNull();
    press('Back to Menu');
    expect(document.querySelector('dialog[data-overlay="menu"][open]')).not.toBeNull();
    expect(document.querySelector('dialog[data-overlay="phrases"][open]')).toBeNull();
    // The Menu itself has no Back.
    expect(screen.queryByRole('button', { name: 'Back to Menu' })).toBeNull();
    fireEvent.click(within(document.querySelector('dialog[data-overlay="menu"]') as HTMLElement).getByRole('button', { name: 'Phrases' }));
    fireEvent.click(within(document.querySelector('dialog[data-overlay="phrases"]') as HTMLElement).getByRole('button', { name: 'Close' }));
    expect(document.querySelector('dialog[open]')).toBeNull();
  });

  it('a surface opened from the main screen has no Back', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    press('Phrases');
    expect(document.querySelector('dialog[data-overlay="phrases"][open]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Back to Menu' })).toBeNull();
  });

  it('kinds: Menu, Fix a word, Check the words and They said fit; Phrases, My words, Spell and Conversation are panels; Settings a dialog', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    const kind = (name: string) => document.querySelector(`dialog[data-overlay="${name}"]`)?.getAttribute('data-kind');
    expect([kind('menu'), kind('fix'), kind('proof'), kind('partner'), kind('cards'), kind('sentences')]).toEqual(['fit', 'fit', 'fit', 'fit', 'fit', 'fit']);
    expect([kind('phrases'), kind('words'), kind('spell'), kind('conversation')]).toEqual(['panel', 'panel', 'panel', 'panel']);
    expect(kind('settings')).toBe('dialog');
  });
});

describe('36.8 36.9 focus and buttons in short surfaces', () => {
  it('Fix a word focuses the first word, then the first choice once a word is picked', () => {
    const words = [
      { label: 'can', code: '226' },
      { label: 'you', code: '968' },
    ];
    render(
      <FixSheet
        open
        words={words}
        readingsFor={(i) => (i === 0 ? ['ban'] : [])}
        fixesFor={() => []}
        showWord={(w) => w}
        onReading={() => undefined}
        onFix={() => undefined}
        onRetype={() => undefined}
        onSpell={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(document.activeElement?.getAttribute('data-fix-index')).toBe('0');
    fireEvent.click(document.activeElement!);
    expect(document.activeElement?.textContent).toBe('ban');
  });

  it('They said in its sheet has Done (and Listen), no Cancel: Close cancels', () => {
    render(<PartnerTurn value="" onChange={() => undefined} cancel={false} />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  });

  it('Menu > They said opens a fit sheet with no Cancel', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    fireEvent.click(screen.getByRole('button', { name: KEY[4] }));
    press('Menu');
    fireEvent.click(within(document.querySelector('dialog[data-overlay="menu"]') as HTMLElement).getByRole('button', { name: 'They said' }));
    const d = document.querySelector<HTMLElement>('dialog[data-overlay="partner"][open]')!;
    expect(within(d).queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(within(d).getByRole('button', { name: 'Back to Menu' })).toBeTruthy();
  });
});
