// The conversation on screen and in its sheet (web-ui Req 27, ADR-007). Rules of the thread itself:
// conversation.test.ts. Fit and key stability per device: test/e2e/responsive.mjs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { conversationStore } from '@/lib/conversation';
import type { DictState } from '@/lib/data';
import { miniDict } from './fixtures';

const KEY = { 3: '3 DEF, D E F', 4: '4 GHI, G H I', 6: '6 MNO, M N O', 9: '9 WXYZ, W X Y Z', 2: '2 ABC, A B C', 8: '8 TUV, T U V', 7: '7 PQRS, P Q R S', 0: '0 Space' } as Record<string, string>;
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const typeDigits = (digits: string) => {
  for (const d of digits) press(KEY[d]!);
};
const turns = () => conversationStore.get().turns.map((t) => [t.who, t.text, t.via]);
const openSheet = (name: string) => document.querySelector<HTMLElement>(`dialog[data-overlay="${name}"][open]`);
const announced = () => document.querySelector('[role="status"][aria-live="polite"].nl-sr-only')?.textContent ?? '';
function sw(key: ' ' | 'Enter') {
  act(() => {
    fireEvent.keyDown(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
    fireEvent.keyUp(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
  });
}

/** A voice, so Speak speaks (jsdom has none: it would show big text instead). */
function withVoice() {
  const speak = vi.fn();
  class Utterance {
    text: string;
    onstart: unknown;
    onend: unknown;
    onerror: unknown;
    constructor(t: string) {
      this.text = t;
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  const voice = { voiceURI: 'v1', name: 'Test', lang: 'en-US', localService: true, default: true };
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [voice], addEventListener: vi.fn(), removeEventListener: vi.fn(), paused: false });
  return { speak, spoken: () => speak.mock.calls.map((c) => (c[0] as Utterance).text) };
}
/** The browser can share and copy (a secure page with both APIs). */
function withShareAndCopy({ share = true, copy = true } = {}) {
  const writeText = vi.fn(async () => undefined);
  const shareFn = vi.fn(async () => undefined);
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  Object.defineProperty(navigator, 'clipboard', { value: copy ? { writeText } : undefined, configurable: true });
  Object.defineProperty(navigator, 'share', { value: share ? shareFn : undefined, configurable: true });
  return { writeText, share: shareFn };
}
function addTheirLine(text: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
  press('Done');
}
const dictWithPack = (): DictState => ({ ...miniDict(), pack: { id: 'core-en', lang: 'en', version: 1, words: [], phrases: ['Thank you.'] } });

beforeEach(() => {
  // Each press is a new key; the accept delay would drop a quick repeat of the same key.
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (navigator as { clipboard?: unknown }).clipboard;
  delete (navigator as { share?: unknown }).share;
});

describe('what becomes a turn (web-ui Req 27.2, 27.3)', () => {
  it('27.2 Speak, a phrase and Show add "you said" turns; Test voice does not', () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={dictWithPack()} layout="wide" />);
    typeDigits('406333092837');
    press('Speak');
    expect(turns()).toEqual([['me', 'I need water', 'keys']]);
    fireEvent.click(screen.getByRole('button', { name: 'Phrases' }));
    press('Speak "Thank you."');
    expect(turns().at(-1)).toEqual(['me', 'Thank you.', 'phrase']);
    press('Close');
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    press('Test voice');
    expect(v.spoken()).toContain('Hello. This is how I sound.');
    expect(turns()).toHaveLength(2);
    press('Close');
    typeDigits('4');
    fireEvent.click(within(document.querySelector<HTMLElement>('.speak-actions')!).getByRole('button', { name: 'Show' }));
    expect(turns().at(-1)).toEqual(['me', 'I', 'shown']);
  });

  it('27.2 Show then Speak of the same sentence is one turn', () => {
    withVoice();
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    typeDigits('406333');
    press('Show');
    press('Done');
    press('Speak');
    expect(turns()).toEqual([['me', 'I need', 'shown']]);
  });

  it('27.3 Done in They said adds a "they said" turn and says so politely; an empty Done adds nothing', async () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    press('They said');
    press('Done');
    expect(turns()).toEqual([]);
    press('They said');
    addTheirLine('  Tea or coffee?  ');
    expect(turns()).toEqual([['them', 'Tea or coffee?', 'typed']]);
    await waitFor(() => expect(announced()).toBe('Added to the conversation.'));
  });
});

describe('the Conversation sheet (web-ui Req 27.7-27.10)', () => {
  function setup(layout: 'stack' | 'wide' = 'stack') {
    const v = withVoice();
    render(<CommunicationScreen initialDict={miniDict()} layout={layout} />);
    act(() => {
      conversationStore.dispatch({ type: 'add', who: 'them', text: 'Tea or coffee?', via: 'typed', at: 1 });
      conversationStore.dispatch({ type: 'add', who: 'me', text: 'Tea please.', via: 'keys', at: 2 });
      conversationStore.dispatch({ type: 'add', who: 'them', text: 'Milk?', via: 'heard', at: 3 });
    });
    return v;
  }
  const items = () => [...openSheet('conversation')!.querySelectorAll<HTMLElement>('.thread-item')];
  const buttonsOf = (li: HTMLElement) => within(li).getAllByRole('button').map((b) => b.textContent);

  it('27.4 the header button shows the newest turn and opens the sheet on it, newest first, with each turn its own scan row', () => {
    setup();
    const bubble = screen.getByRole('button', { name: 'They: Milk?' });
    fireEvent.click(bubble);
    const sheet = openSheet('conversation')!;
    expect(sheet.textContent).toContain('never saved');
    expect(within(sheet).getByRole('list', { name: 'Conversation, newest first' })).toBeTruthy();
    expect(items().map((li) => li.querySelector('.thread-item__text')!.textContent)).toEqual(['Milk?', 'Tea please.', 'Tea or coffee?']);
    expect(items().map((li) => li.getAttribute('data-scan-row'))).toEqual(['turn-3', 'turn-2', 'turn-1']);
    expect([...sheet.querySelectorAll('[data-scan-row]')].map((r) => r.getAttribute('data-scan-row'))).toEqual(['close', 'reply-types', 'add', 'turn-3', 'turn-2', 'turn-1', 'all']);
  });

  it('27.4 the header button keeps their newest line after you answer (your line is on the card), and shows yours only before they say anything', () => {
    setup();
    press('They: Milk?');
    fireEvent.click(within(items()[1]!).getByRole('button', { name: 'Say again' }));
    press('Close');
    expect(turns().at(-1)).toEqual(['me', 'Tea please.', 'again']);
    expect(screen.getByRole('button', { name: 'They: Milk?' }).querySelector('.thread-tag')!.textContent).toBe('They');
    cleanup();
    act(() => conversationStore.reset());
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    act(() => conversationStore.dispatch({ type: 'add', who: 'me', text: 'Hello.', via: 'keys', at: 1 }));
    expect(screen.getByRole('button', { name: 'You: Hello.' })).toBeTruthy();
  });

  it('27.8 a second Say again of the same line inside the accept delay is a tremor, not a repeat', () => {
    const v = setup();
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    press('They: Milk?');
    const again = within(items()[1]!).getByRole('button', { name: 'Say again' });
    fireEvent.click(again);
    fireEvent.click(again);
    expect(v.spoken()).toEqual(['Tea please.']);
    now.mockReturnValue(20_000);
    fireEvent.click(within(items()[0]!).getByRole('button', { name: 'Say again' })); // the line said again is the newest now
    expect(v.spoken()).toEqual(['Tea please.', 'Tea please.']);
    now.mockRestore();
  });

  it('27.7 yours: Say again, Show; theirs: Show, and Change and Remove on the newest only; no Copy or Share without the APIs', () => {
    setup();
    press('They: Milk?');
    const [newest, mine, older] = items();
    expect(buttonsOf(newest!)).toEqual(['Show', 'Change', 'Remove']);
    expect(buttonsOf(mine!)).toEqual(['Say again', 'Show']);
    expect(buttonsOf(older!)).toEqual(['Show']);
    const all = openSheet('conversation')!.querySelector<HTMLElement>('[data-scan-row="all"]')!;
    expect(buttonsOf(all)).toEqual(['Clear conversation']);
  });

  it('27.7 with the APIs: Copy on every turn, Share for the whole thread (or Copy all without share)', async () => {
    const api = withShareAndCopy();
    setup();
    press('They: Milk?');
    expect(buttonsOf(items()[1]!)).toEqual(['Say again', 'Show', 'Copy']);
    fireEvent.click(within(items()[1]!).getByRole('button', { name: 'Copy' }));
    expect(api.writeText).toHaveBeenCalledWith('Tea please.');
    await waitFor(() => expect(announced()).toBe('Copied.'));
    press('Share');
    expect(api.share).toHaveBeenCalledWith({ title: 'Conversation', text: 'They said: Tea or coffee?\nYou said: Tea please.\nThey said: Milk?' });
    cleanup();
    act(() => conversationStore.reset());
    withShareAndCopy({ share: false });
    setup();
    press('They: Milk?');
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy all' })).toBeTruthy();
  });

  it('27.8 Say again speaks that text inside the press, and nothing else; it is a "you said" turn', () => {
    const v = setup();
    press('They: Milk?');
    fireEvent.click(within(items()[1]!).getByRole('button', { name: 'Say again' }));
    // Synchronously, in the click (the iOS gesture rule): no await before this check.
    expect(v.spoken()).toEqual(['Tea please.']);
    expect(turns().at(-1)).toEqual(['me', 'Tea please.', 'again']);
  });

  it('Show on a turn opens big text labelled "They said" or "You said", and adds no turn', () => {
    setup();
    press('They: Milk?');
    fireEvent.click(within(items()[0]!).getByRole('button', { name: 'Show' }));
    const show = document.querySelector('dialog.show')!;
    expect(show.textContent).toContain('They said');
    expect(show.textContent).toContain('Milk?');
    expect(turns()).toHaveLength(3);
  });

  it('27.3 Change edits the newest "they said" in place; saving it empty removes it; Remove removes it', () => {
    setup();
    press('They: Milk?');
    fireEvent.click(within(items()[0]!).getByRole('button', { name: 'Change' }));
    const field = screen.getByRole('textbox', { name: 'Change what they said' }) as HTMLInputElement;
    expect(field.value).toBe('Milk?');
    fireEvent.change(field, { target: { value: 'Milk or sugar?' } });
    press('Done');
    expect(turns().at(-1)).toEqual(['them', 'Milk or sugar?', 'heard']);
    fireEvent.click(within(items()[0]!).getByRole('button', { name: 'Change' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Change what they said' }), { target: { value: '' } });
    press('Done');
    expect(turns().map((t) => t[1])).toEqual(['Tea or coffee?', 'Tea please.']);
    // Now the first line is the newest of theirs: Remove is on it.
    fireEvent.click(within(items()[1]!).getByRole('button', { name: 'Remove' }));
    expect(turns().map((t) => t[1])).toEqual(['Tea please.']);
  });

  it('27.9 Clear conversation asks first; Keep keeps everything; confirming clears it and says so', async () => {
    setup();
    press('They: Milk?');
    press('Clear conversation');
    expect(openSheet('conversation')!.textContent).toContain('Clear the whole conversation?');
    press('Keep');
    expect(turns()).toHaveLength(3);
    press('Clear conversation');
    const confirm = openSheet('conversation')!.querySelector<HTMLElement>('[data-scan-row="confirm-clear"]')!;
    expect(buttonsOf(confirm)).toEqual(['Keep', 'Clear conversation']);
    fireEvent.click(within(confirm).getByRole('button', { name: 'Clear conversation' }));
    expect(turns()).toEqual([]);
    await waitFor(() => expect(announced()).toBe('Conversation cleared.'));
    // With no turns, the header button is the plain They said square again.
    expect(screen.getByRole('button', { name: 'They said' }).className).toContain('header-partner--empty');
  });

  it('27.1 nothing about the conversation is written to storage', () => {
    const local = vi.spyOn(Storage.prototype, 'setItem');
    setup();
    press('They: Milk?');
    fireEvent.click(within(items()[1]!).getByRole('button', { name: 'Say again' }));
    press('Close');
    press('They: Milk?');
    const written = local.mock.calls.map((c) => String(c[1]));
    for (const w of written) expect(w).not.toMatch(/Milk|Tea/);
    expect(sessionStorage.length).toBe(0);
    // The thread's only home is module memory: lib/conversation.ts reaches no storage at all.
    const src = readFileSync(resolve(__dirname, '../lib/conversation.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB|from 'idb'|@\/lib\/storage|document\.cookie/);
  });
});

describe('the thread on the main screen (web-ui Req 27.4-27.6)', () => {
  it('27.5 split: a strip with the newest 2 turns, They said and All; empty, it says so', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="split" />);
    const strip = document.querySelector<HTMLElement>('[data-section="thread"] .thread-strip')!;
    expect(strip.textContent).toContain('Nothing said yet.');
    expect(screen.queryByRole('button', { name: 'They said' })?.closest('header')).toBeFalsy(); // not in the header
    act(() => {
      conversationStore.dispatch({ type: 'add', who: 'them', text: 'One', via: 'typed', at: 1 });
      conversationStore.dispatch({ type: 'add', who: 'me', text: 'Two', via: 'keys', at: 2 });
      conversationStore.dispatch({ type: 'add', who: 'them', text: 'Three', via: 'typed', at: 3 });
    });
    expect(within(strip).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([
      'They: Three',
      'You: Two',
      'They said',
      'All of the conversation',
    ]);
    // The strip is not a live region (it would chatter).
    expect(strip.closest('[aria-live]')).toBeNull();
    fireEvent.click(within(strip).getByRole('button', { name: 'You: Two' }));
    expect(openSheet('conversation')).toBeTruthy();
  });

  it('27.5 laptops: a panel with the newest 3 turns, and Type their line adds one in place', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    const panel = document.querySelector<HTMLElement>('[data-thread="panel"]')!;
    expect(panel.textContent).toContain('Nothing said yet.');
    fireEvent.click(within(panel).getByRole('button', { name: 'Type their line' }));
    addTheirLine('Tea or coffee?');
    expect(within(panel).getByRole('button', { name: 'They: Tea or coffee?' })).toBeTruthy();
    expect(turns()).toEqual([['them', 'Tea or coffee?', 'typed']]);
  });

  it('27.6 Menu > This sentence > Conversation opens the sheet (the way in on short phones)', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    press('Menu');
    press('Conversation');
    expect(openSheet('conversation')).toBeTruthy();
  });

  it('27.10 phones: switch scanning reaches the thread row after the card\'s Clear, and choosing it opens the sheet', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    act(() => conversationStore.dispatch({ type: 'add', who: 'them', text: 'Tea?', via: 'typed', at: 1 }));
    const bubble = screen.getByRole('button', { name: 'They: Tea?' });
    // Keypad rows 0-3, suggestions, (no offers), action bar, Clear, then the thread.
    for (let i = 0; i < 8 && !bubble.className.includes('is-lit'); i++) sw(' ');
    expect(bubble.className).toContain('is-lit');
    expect(document.querySelector('[data-section="speak"]')!.className).not.toContain('is-scanning');
    sw('Enter');
    sw('Enter');
    expect(openSheet('conversation')).toBeTruthy();
  });
});

describe('model ranking with what you said (web-ui Req 27.11)', () => {
  function mockDecode() {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ v: 1, candidates: [{ words: ['i', 'need', 'water'] }], rejected: 0 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(Date.now).mockRestore();
    return { fetchMock, bodies: () => fetchMock.mock.calls.map((c) => JSON.parse((c as unknown as [string, RequestInit])[1].body as string)) };
  }
  const seed = () =>
    act(() => {
      conversationStore.dispatch({ type: 'add', who: 'me', text: 'Hello.', via: 'keys', at: 1 });
      conversationStore.dispatch({ type: 'add', who: 'them', text: 'How are you?', via: 'typed', at: 2 });
    });

  it('off by default: the partner line goes, your lines do not', async () => {
    const d = mockDecode();
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    seed();
    typeDigits('406333092837');
    await waitFor(() => expect(d.fetchMock).toHaveBeenCalled(), { timeout: 2000 });
    expect(d.bodies().at(-1).context).toEqual({ partner: 'How are you?', recent: [] });
  });

  it('with "Include what you said" on: your last lines go too, from before this sentence', async () => {
    const d = mockDecode();
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ llm: true, llmRecent: true, acceptDelayMs: 0 }} />);
    seed();
    typeDigits('406333092837');
    await waitFor(() => expect(d.fetchMock).toHaveBeenCalled(), { timeout: 2000 });
    expect(d.bodies().at(-1).context).toEqual({ partner: 'How are you?', recent: ['Hello.'] });
  });

  it('Settings shows "Include what you said" only while model ranking is on', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.queryByRole('switch', { name: 'Include what you said' })).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Model ranking' }));
    const sub = screen.getByRole('switch', { name: 'Include what you said' }) as HTMLInputElement;
    expect(sub.checked).toBe(false);
    expect(document.getElementById(sub.getAttribute('aria-describedby')!)!.textContent).toContain('the last 3 things you said in this conversation');
  });
});
