// Quick replies on the screen, in Menu and in Phrases (web-ui Req 28). The rules: replies.test.ts.
// Fit, the keypad not moving and no page scroll at every size: test/e2e/responsive.mjs.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { QuickReplies } from '@/components/QuickReplies';
import { conversationStore } from '@/lib/conversation';
import { STACK_ROWS_QUERIES, STACK_SHORT_QUERY } from '@/lib/layout';
import { replyRows } from '@/lib/replies';
import { miniDict } from './fixtures';
import { openSection } from './settings-section';

const KEY = { 3: '3 DEF, D E F', 4: '4 GHI, G H I', 6: '6 MNO, M N O', 9: '9 WXYZ, W X Y Z', 2: '2 ABC, A B C', 8: '8 TUV, T U V', 7: '7 PQRS, P Q R S', 0: '0 Space' } as Record<string, string>;
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const typeDigits = (digits: string) => {
  for (const d of digits) press(KEY[d]!);
};
const utterance = () => document.getElementById('utterance')!.textContent ?? '';
const area = () => document.querySelector<HTMLElement>('[data-section="cands"]')!;
const replies = () => [...document.querySelectorAll<HTMLElement>('[data-section="cands"] .quick-reply')].map((b) => b.textContent);
const turns = () => conversationStore.get().turns.map((t) => [t.who, t.text, t.via]);
const openSheet = (name: string) => document.querySelector<HTMLElement>(`dialog[data-overlay="${name}"][open]`);
function sw(key: ' ' | 'Enter') {
  act(() => {
    fireEvent.keyDown(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
    fireEvent.keyUp(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
  });
}
/** A voice, so a reply speaks (jsdom has none: it would show big text instead). */
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
/** Screen-height queries: only those listed match (jsdom has no matchMedia). */
function stubHeights(...matching: string[]) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matching.includes(query),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  // Each call is a second later, so key presses are never taken for a tremor.
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('quick replies on phones and tablets (web-ui Req 28)', () => {
  it('28.1 show in the suggestion area when nothing is typed, hide on the first key, and come back after Speak', () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    expect(replies()).toEqual(['Hold on.', 'Yes.', 'No.']);
    expect(within(area()).getByRole('region', { name: 'Quick replies' })).toBeTruthy();
    typeDigits('4');
    expect(replies()).toEqual([]);
    expect(area().querySelector('.phone-sugg__item, .phone-sugg__empty')).toBeTruthy();
    typeDigits('06333092837');
    press('Speak');
    expect(v.spoken()).toEqual(['I need water']);
    expect(replies()).toEqual(['Hold on.', 'Yes.', 'No.']);
    // 28.5: the sentences are one tap away in Menu while the replies hold the area.
    press('Menu');
    expect(within(openSheet('menu')!.querySelector<HTMLElement>('[data-scan-row^="sentence"]')!).getAllByRole('button')[0]!.textContent).toBe('Sentences');
  });

  it('28.1 two rows where 2 fit: Pardon?, Thanks. and Phrases (which opens Phrases and says nothing)', () => {
    const v = withVoice();
    stubHeights(STACK_ROWS_QUERIES.r2);
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    expect(replies()).toEqual(['Hold on.', 'Yes.', 'No.', 'Pardon?', 'Thanks.', 'Phrases']);
    fireEvent.click(within(area()).getByRole('button', { name: 'Phrases' }));
    expect(openSheet('phrases')).toBeTruthy();
    expect(v.speak).not.toHaveBeenCalled();
  });

  it('28.2 28.7 a press speaks exactly its text, leaves the sentence alone and becomes a "you said" turn', () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    press('Yes.');
    expect(v.spoken()).toEqual(['Yes.']);
    expect(utterance()).toBe('Press a key to start');
    expect(turns()).toEqual([['me', 'Yes.', 'quick']]);
  });

  it('28.2 a second press of the same reply inside the accept delay is ignored', () => {
    vi.spyOn(Date, 'now').mockReturnValue(5000);
    const v = withVoice();
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    press('Yes.');
    press('Yes.');
    expect(v.spoken()).toEqual(['Yes.']);
    press('No.');
    expect(v.spoken()).toEqual(['Yes.', 'No.']);
  });

  it('28.3 nothing is spoken without a press, and with the setting off the area keeps its empty text', () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" initialSettings={{ quickReplies: false }} />);
    expect(replies()).toEqual([]);
    expect(area().textContent).toContain('Sentences for your keys appear here.');
    expect(v.speak).not.toHaveBeenCalled();
  });

  it('28.6 the swap is not announced: no live region in the area, and a reply adds no announcement', () => {
    withVoice();
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    expect(area().querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
    const live = () => [...document.querySelectorAll('[aria-live]')].map((e) => e.textContent).join('|');
    const before = live();
    press('Hold on.');
    expect(live()).toBe(before);
  });

  it('28.6 the replies are scan row 4: Yes. by two switches, after the keypad rows', () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    for (let i = 0; i < 5; i++) sw(' '); // start, then rows 1-3 of the keypad, then the replies
    expect(area().querySelector('.quick-replies')!.className).toContain('is-scanning');
    sw('Enter');
    sw(' ');
    expect(within(area()).getByRole('button', { name: 'Yes.' }).className).toContain('is-lit');
    sw('Enter');
    expect(v.spoken()).toEqual(['Yes.']);
    expect(turns()).toEqual([['me', 'Yes.', 'quick']]);
  });

  it('Alt+1-5 and the arrows do nothing while the replies hold the area, so no shortcut acts unseen', () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    typeDigits('406333092837');
    press('Speak');
    const said = utterance();
    fireEvent.keyDown(window, { key: '2', code: 'Digit2', altKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown' });
    expect(utterance()).toBe(said);
    expect(v.spoken()).toEqual(['I need water']);
  });
});

describe('Menu and Phrases (web-ui Req 28.4)', () => {
  it('a short phone has no area; Menu > Quick replies speaks and closes the Menu, also while typing', () => {
    const v = withVoice();
    stubHeights(STACK_SHORT_QUERY);
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    expect(document.querySelector('.quick-replies--area')).toBeNull();
    typeDigits('4');
    press('Menu');
    const group = openSheet('menu')!.querySelector<HTMLElement>('[data-scan-row="quick-replies"]')!;
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Hold on.', 'Yes.', 'No.', 'Pardon?', 'Thanks.']);
    fireEvent.click(within(group).getByRole('button', { name: 'Hold on.' }));
    expect(v.spoken()).toEqual(['Hold on.']);
    expect(openSheet('menu')).toBeNull();
    expect(utterance()).not.toBe('Press a key to start'); // the sentence being typed is kept
  });

  it('the Menu group is the first scan row after Close', () => {
    stubHeights(STACK_SHORT_QUERY);
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    press('Menu');
    const rows = [...openSheet('menu')!.querySelectorAll('[data-scan-row]')].map((e) => e.getAttribute('data-scan-row'));
    expect(rows.slice(0, 2)).toEqual(['close', 'quick-replies']);
  });

  it('laptops: one row of 5 above the sentences, with the sentences still there after Speak; Phrases starts with the group', () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    expect(replies()).toEqual(['Hold on.', 'Yes.', 'No.', 'Pardon?', 'Thanks.']);
    expect(within(area()).getByRole('heading', { name: 'Quick replies' })).toBeTruthy();
    typeDigits('406333092837');
    expect(replies()).toEqual([]);
    press('Speak');
    expect(replies()).toHaveLength(5);
    expect(area().querySelectorAll('.nl-candidate').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Phrases' })[0]!);
    const sheet = openSheet('phrases')!;
    expect(sheet.querySelector('.group__title')?.textContent).toBe('Quick replies');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Thanks.' }));
    expect(v.spoken().at(-1)).toBe('Thanks.');
    expect(turns().at(-1)).toEqual(['me', 'Thanks.', 'quick']);
  });

  it('Settings has the switch, on by default, and turning it off removes the replies from the screen', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    openSection('Quick replies');
    const sw = screen.getByRole('switch', { name: 'Quick replies' }) as HTMLInputElement;
    expect(sw.checked).toBe(true);
    fireEvent.click(sw);
    expect(replies()).toEqual([]);
  });
});

describe('the reply-type slot (for web-ui Req 29)', () => {
  it('renders the owner group as the last row with its own lit cell, after both reply rows', () => {
    const render3 = vi.fn((lit: number) => (
      <>
        {['Agree', 'Disagree', 'Ask'].map((t, i) => (
          <button key={t} type="button" className={i === lit ? 'is-lit' : undefined}>
            {t}
          </button>
        ))}
      </>
    ));
    const { container } = render(
      <QuickReplies variant="area" rows={replyRows(3, 3)} size={3} litIndex={7} onSay={() => undefined} slot={{ cells: 3, render: render3, choose: () => undefined }} />,
    );
    const rows = [...container.querySelectorAll('.quick-replies__row')].map((r) => [...r.querySelectorAll('button')].map((b) => b.textContent));
    expect(rows).toEqual([['Hold on.', 'Yes.', 'No.'], ['Pardon?', 'Thanks.', 'Phrases'], ['Agree', 'Disagree', 'Ask']]);
    expect(render3).toHaveBeenLastCalledWith(1); // scan cell 7 is the group's 2nd cell
    expect(screen.getByRole('button', { name: 'Disagree' }).className).toBe('is-lit');
  });
});
