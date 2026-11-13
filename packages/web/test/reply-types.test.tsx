// Reply types: Agree, Disagree, Ask (web-ui Req 29, ADR-008). The re-rank itself is property-tested in
// packages/core/test/intent.test.ts; here: the composer's "?", the pool, the request and cache key, and the
// group on the screen (where it is, toggling, resets, scanning). Fit at every size: test/e2e/responsive.mjs.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Lexicon, encodeWord, unigramModel, validate, type LexiconFile } from '@ninth/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bigramModel, type BigramFile, type LexiconFileV2 } from '@ninth/core';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { ReplyTypes } from '@/components/ReplyTypes';
import { EMPTY, composerReducer, type ComposerAction, type ComposerState } from '@/lib/composer';
import { conversationStore, decodeContext } from '@/lib/conversation';
import { DecodeCache, buildRequest } from '@/lib/decodeClient';
import { STACK_ROWS_QUERIES } from '@/lib/layout';
import { SENT_FOR_RANKING } from '@/lib/rankingProvider';
import { decodeWithPins, MAX_CANDIDATES } from '@/lib/sentence';
import type { DictState } from '@/lib/data';

const run = (...as: ComposerAction[]) => as.reduce<ComposerState>(composerReducer, EMPTY);
const digits = (s: string): ComposerAction[] => [...s].map((d) => (d === ' ' ? { type: 'space' } : { type: 'digit', digit: d }));

describe('composer: the reply type and Ask\'s "?" (Req 29.3, 29.4)', () => {
  it('Ask sets "?" when no punctuation is set; leaving Ask (release or another type) removes it', () => {
    const ask = run(...digits('36 968'), { type: 'intent', intent: 'ask', turn: 1 });
    expect(ask.punct).toBe('?');
    expect(ask.intent).toBe('ask');
    expect(ask.intentFor).toBe(1);
    expect(composerReducer(ask, { type: 'intent', turn: 1 }).punct).toBeUndefined();
    const agree = composerReducer(ask, { type: 'intent', intent: 'agree', turn: 1 });
    expect(agree.punct).toBeUndefined();
    expect(agree.intent).toBe('agree');
  });

  it('Ask never replaces punctuation the person set, and key 1 or Back take the "?" over as usual', () => {
    const dot = run(...digits('36'), { type: 'punct' }, { type: 'intent', intent: 'ask', turn: 1 });
    expect(dot.punct).toBe('.');
    expect(composerReducer(dot, { type: 'intent', turn: 1 }).punct).toBe('.');
    // 1 cycles from "?" to "!" as it would from any "?"; leaving Ask then keeps the person's "!".
    const ask = run(...digits('36 968'), { type: 'intent', intent: 'ask', turn: 1 });
    const bang = composerReducer(ask, { type: 'punct' });
    expect(bang.punct).toBe('!');
    expect(composerReducer(bang, { type: 'intent', turn: 1 }).punct).toBe('!');
    // Key 1 back round to "?": it is the person's now, so leaving Ask keeps it.
    const theirs = run(...digits('36 968'), { type: 'intent', intent: 'ask', turn: 1 }, { type: 'punct' }, { type: 'punct' }, { type: 'punct' }, { type: 'punct' }, { type: 'punct' });
    expect(theirs.punct).toBe('?');
    expect(composerReducer(theirs, { type: 'intent', turn: 1 }).punct).toBe('?');
    // Back removes the "?" first (as any punctuation, once the word is closed), then the words; Ask stays pressed.
    const closed = run(...digits('36 968 '), { type: 'intent', intent: 'ask', turn: 1 });
    const back = composerReducer(closed, { type: 'back' });
    expect(back.punct).toBeUndefined();
    expect(back.slots.length).toBe(2);
    expect(back.intent).toBe('ask');
    expect(composerReducer(back, { type: 'intent', turn: 1 }).punct).toBeUndefined();
  });

  it('the words are never touched: same slots, pins and choice', () => {
    const s = run(...digits('66 69 929'), { type: 'select', words: ['on', 'my', 'way'] });
    for (const intent of ['agree', 'disagree', 'ask'] as const) {
      const t = composerReducer(s, { type: 'intent', intent, turn: 3 });
      expect(t.slots).toEqual(s.slots);
      expect(t.selected).toEqual(s.selected);
      expect(t.open).toBe(s.open);
    }
  });

  it('Speak drops it; Clear drops it and Undo (restore) brings it back', () => {
    const ask = run(...digits('36 968'), { type: 'intent', intent: 'ask', turn: 1 });
    const spoken = composerReducer(ask, { type: 'spoken' });
    expect(spoken.intent).toBeUndefined();
    expect(spoken.punct).toBe('?'); // the spoken sentence stays as it was said
    expect(composerReducer(spoken, { type: 'digit', digit: '4' }).punct).toBeUndefined();
    expect(composerReducer(ask, { type: 'clear' })).toBe(EMPTY);
    expect(composerReducer(EMPTY, { type: 'restore', state: ask })).toBe(ask);
  });

  it('chosen while the spoken sentence is still on show, it carries into the next one on the first key', () => {
    const spoken = run(...digits('4 6333'), { type: 'spoken' });
    const picked = composerReducer(spoken, { type: 'intent', intent: 'ask', turn: 7 });
    expect(picked.punct).toBeUndefined(); // not added to what was already said
    const next = composerReducer(picked, { type: 'digit', digit: '3' });
    expect(next.slots).toEqual([{ code: '3' }]);
    expect(next).toMatchObject({ intent: 'ask', intentFor: 7, punct: '?', autoPunct: true, spoken: false });
    const agree = composerReducer(composerReducer(spoken, { type: 'intent', intent: 'agree', turn: 7 }), { type: 'digit', digit: '3' });
    expect(agree).toMatchObject({ intent: 'agree', punct: undefined });
  });
});

/** "no my way" and "on my way" (66 69 929): the keys cannot tell them apart. */
const NO_ON: LexiconFile = {
  v: 1,
  lang: 'en',
  source: 'test',
  license: 'CC0',
  codes: { '66': [['no', 80], ['on', 62], ['mo', 5], ['om', 2]], '69': [['my', 70], ['ny', 3]], '929': [['way', 60], ['wax', 10], ['yay', 8]] },
};
function noOnDict(): Extract<DictState, { status: 'ready' }> {
  const lexicon = Lexicon.fromJSON(NO_ON);
  return { status: 'ready', lexicon, lm: unigramModel(lexicon), model: 'unigram', pack: null };
}
const text = (cs: { words: readonly string[] }[]) => cs.map((c) => c.words.join(' '));

describe('offline: the pool is re-ranked, then cut to the shown count (Req 29.2)', () => {
  const d = noOnDict();
  const state = run(...digits('66 69 929'));
  const codes = ['66', '69', '929'];

  it('66 69 929: "no my way" first with no type; Agree puts "on my way" first, Disagree keeps "no"', () => {
    expect(text(decodeWithPins(state, d.lexicon, d.lm))[0]).toBe('no my way');
    expect(text(decodeWithPins(state, d.lexicon, d.lm, { intent: 'agree' }))[0]).toBe('on my way');
    expect(text(decodeWithPins(state, d.lexicon, d.lm, { intent: 'disagree' }))[0]).toBe('no my way');
  });

  it('at most k, every sentence passes validate(), and all come from the same keys\' pool', () => {
    const pool = new Set(text(decodeWithPins(state, d.lexicon, d.lm, { k: 12 })));
    for (const intent of [undefined, 'agree', 'disagree', 'ask'] as const) {
      for (const k of [1, 3, MAX_CANDIDATES]) {
        const out = decodeWithPins(state, d.lexicon, d.lm, { k, intent });
        expect(out.length).toBeLessThanOrEqual(k);
        for (const c of out) {
          expect(validate(c.words, codes)).toBe(true);
          expect(pool.has(c.words.join(' '))).toBe(true);
        }
      }
    }
  });

  it('pinned words stay pinned under every type', () => {
    const pinned = composerReducer(state, { type: 'pin', index: 0, word: 'no' });
    for (const intent of ['agree', 'disagree', 'ask'] as const) for (const c of decodeWithPins(pinned, d.lexicon, d.lm, { intent })) expect(c.words[0]).toBe('no');
  });

  const DATA = join(__dirname, '..', '..', '..', 'data', 'lexicon');
  const haveData = existsSync(join(DATA, 'en.v2.json')) && existsSync(join(DATA, 'en.bigram.v1.json'));
  it.skipIf(!haveData)('on the real dictionary too: Agree changes the order for "on my way"', () => {
    const lex = Lexicon.fromJSON(JSON.parse(readFileSync(join(DATA, 'en.v2.json'), 'utf8')) as LexiconFileV2);
    const lm = bigramModel(JSON.parse(readFileSync(join(DATA, 'en.bigram.v1.json'), 'utf8')) as BigramFile, lex);
    const s = run(...digits(['on', 'my', 'way'].map((w) => encodeWord(w)).join(' ')));
    const base = text(decodeWithPins(s, lex, lm));
    const agree = text(decodeWithPins(s, lex, lm, { intent: 'agree' }));
    expect(base[0]).toBe('no my way');
    expect(agree[0]).toBe('on my way');
    expect(agree).not.toEqual(base);
  });
});

describe('model ranking: the request and the cache key (Req 29.8)', () => {
  it('decodeContext adds the type only for their newest line, and leaves the key out otherwise', () => {
    conversationStore.dispatch({ type: 'add', who: 'them', text: 'Coming?', via: 'typed', at: 1 });
    const s = conversationStore.get();
    const id = s.turns[0]!.id;
    expect(decodeContext(s, { recent: false, intent: 'agree', intentFor: id })).toEqual({ partner: 'Coming?', recent: [], intent: 'agree' });
    expect('intent' in decodeContext(s, { recent: false })).toBe(false);
    expect('intent' in decodeContext(s, { recent: false, intent: 'agree', intentFor: id + 1 })).toBe(false);
    conversationStore.dispatch({ type: 'add', who: 'them', text: 'Now?', via: 'typed', at: 2 });
    expect('intent' in decodeContext(conversationStore.get(), { recent: false, intent: 'agree', intentFor: id })).toBe(false);
  });

  it('buildRequest sends context.intent only when a type is pressed (never null or empty)', () => {
    const lat = [['no', 'on'], ['my'], ['way']];
    const none = buildRequest(['66', '69', '929'], lat, 'Coming?', 'letter', 5, [], [])!;
    expect('intent' in none.context).toBe(false);
    expect(JSON.stringify(none)).not.toContain('intent');
    const agree = buildRequest(['66', '69', '929'], lat, 'Coming?', 'letter', 5, [['on', 'my', 'way']], [], 'agree')!;
    expect(agree.context).toEqual({ partner: 'Coming?', recent: [], intent: 'agree' });
    // Anything that is not one of the three words is left out.
    const bad = buildRequest(['66'], [['no']], undefined, 'letter', 5, [], [], 'maybe' as never)!;
    expect('intent' in bad.context).toBe(false);
  });

  it('the cache key includes the type; none keeps the old key', () => {
    const codes = ['66', '69', '929'];
    expect(DecodeCache.key(codes, 'Coming?')).toBe('66 69 929|Coming?');
    expect(DecodeCache.key(codes, 'Coming?', [], undefined)).toBe('66 69 929|Coming?');
    const keys = new Set([undefined, 'agree', 'disagree', 'ask'].map((i) => DecodeCache.key(codes, 'Coming?', ['Hi.'], i as never)));
    expect(keys.size).toBe(4);
  });

  it('the screen sends the type and the beams in its order; none pressed sends no intent key', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ v: 1, candidates: [], rejected: 0 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const bodies = () => fetchMock.mock.calls.map((c) => JSON.parse((c as unknown as [string, RequestInit])[1].body as string));
    render(<CommunicationScreen initialDict={noOnDict()} layout="wide" initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    act(() => conversationStore.dispatch({ type: 'add', who: 'them', text: 'Are you coming?', via: 'typed', at: 1 }));
    for (const d of '660690929') fireEvent.click(screen.getByRole('button', { name: KEY_NAME[d]! }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 2000 });
    const first = bodies().at(-1);
    expect('intent' in first.context).toBe(false);
    expect(first.beams[0]).toEqual(['no', 'my', 'way']);
    fireEvent.click(screen.getByRole('button', { name: 'Agree' }));
    await waitFor(() => expect(bodies().at(-1).context.intent).toBe('agree'), { timeout: 2000 });
    expect(bodies().at(-1).beams[0]).toEqual(['on', 'my', 'way']);
  });
});

const KEY_NAME: Record<string, string> = { 2: '2 ABC, A B C', 3: '3 DEF, D E F', 4: '4 GHI, G H I', 6: '6 MNO, M N O', 8: '8 TUV, T U V', 9: '9 WXYZ, W X Y Z', 0: '0 Space' };
const typeKeys = (s: string) => {
  for (const d of s) fireEvent.click(screen.getByRole('button', { name: KEY_NAME[d]! }));
};
const utterance = () => document.getElementById('utterance')!.textContent ?? '';
const area = () => document.querySelector<HTMLElement>('[data-section="cands"]')!;
const openSheet = (name: string) => document.querySelector<HTMLElement>(`dialog[data-overlay="${name}"][open]`);
const pressed = (root: ParentNode = document) => [...root.querySelectorAll('[data-intent][aria-pressed="true"]')].map((b) => b.textContent);
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
function withVoice() {
  const speak = vi.fn();
  class Utterance {
    text: string;
    constructor(t: string) {
      this.text = t;
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  const voice = { voiceURI: 'v1', name: 'Test', lang: 'en-US', localService: true, default: true };
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [voice], addEventListener: vi.fn(), removeEventListener: vi.fn(), paused: false });
  return { spoken: () => speak.mock.calls.map((c) => (c[0] as Utterance).text) };
}
const them = (text: string) => act(() => conversationStore.dispatch({ type: 'add', who: 'them', text, via: 'typed', at: Date.now() }));
function sw(key: ' ' | 'Enter') {
  act(() => {
    fireEvent.keyDown(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
    fireEvent.keyUp(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
  });
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the group (Req 29.1, 29.5)', () => {
  it('a role="group" named "Reply type" of 3 toggles, at most one pressed; pressing the pressed one releases it', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<ReplyTypes variant="row" value={undefined} onToggle={onToggle} />);
    const group = screen.getByRole('group', { name: 'Reply type' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([
      ['Agree', 'false'],
      ['Disagree', 'false'],
      ['Ask', 'false'],
    ]);
    fireEvent.click(buttons[2]!);
    expect(onToggle).toHaveBeenLastCalledWith('ask');
    rerender(<ReplyTypes variant="row" value="ask" onToggle={onToggle} />);
    expect(pressed()).toEqual(['Ask']);
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(onToggle).toHaveBeenLastCalledWith(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Agree' }));
    expect(onToggle).toHaveBeenLastCalledWith('agree');
  });

  it('the sheet variant says what they do, with no claim about effect', () => {
    render(<ReplyTypes variant="sheet" value={undefined} onToggle={() => undefined} />);
    const group = screen.getByRole('group', { name: 'Reply type' });
    expect(group.getAttribute('data-scan-row')).toBe('reply-types');
    expect(document.getElementById(group.getAttribute('aria-describedby')!)!.textContent).toBe(
      'Agree, Disagree and Ask change the order of the sentences for your keys. They never change the words. Ask also adds a question mark.',
    );
  });

  it('2-row phones: the last row of the area while their line is the newest, under the replies; gone without one', () => {
    stubHeights(STACK_ROWS_QUERIES.r2);
    render(<CommunicationScreen initialDict={noOnDict()} layout="stack" />);
    expect(within(area()).queryByRole('group', { name: 'Reply type' })).toBeNull();
    them('Are you coming?');
    const rows = [...area().querySelectorAll('.quick-replies__row')].map((r) => [...r.querySelectorAll('button')].map((b) => b.textContent));
    expect(rows).toEqual([
      ['Hold on.', 'Yes.', 'No.'],
      ['Agree', 'Disagree', 'Ask'],
    ]);
    act(() => conversationStore.dispatch({ type: 'add', who: 'me', text: 'Yes.', via: 'quick', at: Date.now() }));
    expect(within(area()).queryByRole('group', { name: 'Reply type' })).toBeNull();
  });

  it('1-row phones: not in the row, but at the top of the Conversation sheet and in the Sentences sheet', () => {
    render(<CommunicationScreen initialDict={noOnDict()} layout="stack" />);
    them('Are you coming?');
    expect(within(area()).queryByRole('group', { name: 'Reply type' })).toBeNull();
    act(() => fireEvent.click(screen.getByRole('button', { name: /^They: Are you coming\?/ })));
    const sheet = openSheet('conversation')!;
    const rows = [...sheet.querySelectorAll('[data-scan-row]')].map((r) => r.getAttribute('data-scan-row'));
    expect(rows.slice(0, 3)).toEqual(['close', 'reply-types', 'add']);
    fireEvent.click(within(sheet).getByRole('button', { name: 'Ask' }));
    expect(pressed(sheet)).toEqual(['Ask']);
  });

  it('laptops: under the quick replies, and still above the Sentences list while typing, until Speak', () => {
    withVoice();
    render(<CommunicationScreen initialDict={noOnDict()} layout="wide" />);
    them('Are you coming?');
    expect(screen.getByRole('group', { name: 'Reply type' })).toBeTruthy();
    typeKeys('660690929');
    fireEvent.click(screen.getByRole('button', { name: 'Agree' }));
    expect(pressed()).toEqual(['Agree']);
    fireEvent.click(screen.getByRole('button', { name: /^Speak/ }));
    expect(screen.queryByRole('group', { name: 'Reply type' })).toBeNull();
  });
});

describe('on the screen: order, "?", key line and resets (Req 29.2-29.6)', () => {
  it('66 69 929: Agree puts "on my way" first; the words of every sentence stay the keys\' words', () => {
    render(<CommunicationScreen initialDict={noOnDict()} layout="wide" />);
    them('Are you coming?');
    typeKeys('660690929');
    expect(utterance()).toMatch(/^No my way/);
    fireEvent.click(screen.getByRole('button', { name: 'Agree' }));
    expect(utterance()).toMatch(/^On my way/);
    const list = [...document.querySelectorAll('.nl-candidate .nl-candidate__text')].map((e) => e.textContent!.toLowerCase().replace(/^sentence \d+: /, ''));
    expect(list.length).toBeGreaterThan(1);
    for (const t of list) expect(validate(t.replace(/[.?!,]$/, '').split(' '), ['66', '69', '929']), t).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Agree' }));
    expect(utterance()).toMatch(/^No my way/);
  });

  it('Ask adds "?" and shows "Ask ·" at the start of the key line; key 1 changes it as usual', () => {
    render(<CommunicationScreen initialDict={noOnDict()} layout="split" />);
    them('Are you coming?');
    fireEvent.click(within(area()).getByRole('button', { name: 'Ask' }));
    typeKeys('660690929');
    expect(utterance()).toContain('No my way?');
    const tag = document.querySelector('.nl-speakbar__tag')!;
    expect(tag.textContent).toBe('Reply type: Ask·. ');
    expect(document.querySelector('.nl-speakbar__digits')!.textContent).toBe('Reply type: Ask·. Keys: 66 69 929');
    fireEvent.click(screen.getByRole('button', { name: /^1 / }));
    expect(utterance()).toContain('No my way!');
  });

  it('reset on Speak, on Clear (Undo brings it back) and on a new line of theirs', () => {
    withVoice();
    render(<CommunicationScreen initialDict={noOnDict()} layout="split" />);
    const tag = () => document.querySelector('.nl-speakbar__tag')?.textContent ?? null;
    them('Are you coming?');
    fireEvent.click(within(area()).getByRole('button', { name: 'Ask' }));
    typeKeys('660690929');
    expect(tag()).toContain('Ask');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(tag()).toBeNull();
    expect(pressed()).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(tag()).toContain('Ask');
    expect(utterance()).toContain('?');
    them('Tonight?');
    expect(tag()).toBeNull();
    expect(utterance()).not.toContain('?'); // the automatic "?" went with it
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    fireEvent.click(within(area()).getByRole('button', { name: 'Disagree' }));
    typeKeys('660690929');
    expect(tag()).toContain('Disagree');
    fireEvent.click(screen.getByRole('button', { name: /^Speak/ }));
    expect(tag()).toBeNull();
    them('Really?');
    expect(pressed()).toEqual([]);
  });

  it('Speak keeps the sentence it said on show: dropping the type does not swap in another reading, and Speak again says the same', () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={noOnDict()} layout="wide" />);
    them('Are you coming?');
    typeKeys('660690929');
    fireEvent.click(screen.getByRole('button', { name: 'Agree' }));
    expect(utterance()).toMatch(/^On my way/);
    fireEvent.click(screen.getByRole('button', { name: /^Speak/ }));
    expect(utterance()).toMatch(/^On my way/);
    fireEvent.click(screen.getByRole('button', { name: /^Speak/ }));
    expect(v.spoken()).toHaveLength(2);
    expect(v.spoken()[1]).toBe(v.spoken()[0]);
    // A new line of theirs, and a type pressed while the spoken sentence is still on show: not re-ranked.
    them('Now?');
    fireEvent.click(screen.getByRole('button', { name: 'Disagree' }));
    expect(utterance()).toMatch(/^On my way/);
  });

  it('any "you said" turn ends the type (Req 29.4): Show while typing drops it, the tag and the steering', () => {
    withVoice();
    render(<CommunicationScreen initialDict={noOnDict()} layout="wide" />);
    them('Are you coming?');
    typeKeys('660690929');
    fireEvent.click(screen.getByRole('button', { name: 'Agree' }));
    expect(document.querySelector('.nl-speakbar__tag')?.textContent ?? '').toContain('Agree');
    act(() => conversationStore.dispatch({ type: 'add', who: 'me', text: 'Yes.', via: 'quick', at: Date.now() }));
    expect(document.querySelector('.nl-speakbar__tag')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Reply type' })).toBeNull();
    expect(utterance()).toMatch(/^No my way/);
    expect(decodeContext(conversationStore.get(), { recent: false, intent: 'agree', intentFor: 1 }).intent).toBeUndefined();
  });

  it('two switches: the group is in the suggestion scan row, after the quick replies (Req 29.7)', () => {
    stubHeights(STACK_ROWS_QUERIES.r2);
    render(<CommunicationScreen initialDict={noOnDict()} layout="stack" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    them('Are you coming?');
    for (let i = 0; i < 5; i++) sw(' '); // start, keypad rows 1-3, then the area
    expect(area().querySelector('.quick-replies')!.className).toContain('is-scanning');
    sw('Enter');
    for (let i = 0; i < 5; i++) sw(' '); // Hold on, Yes, No, Agree, Disagree, Ask
    expect(within(area()).getByRole('button', { name: 'Ask' }).className).toContain('is-lit');
    sw('Enter');
    expect(pressed()).toEqual(['Ask']);
  });
});

describe('privacy copy (Req 29.9)', () => {
  it('the shared "what is sent" sentence names the reply type', () => {
    expect(SENT_FOR_RANKING).toContain('the reply type you picked (Agree, Disagree or Ask)');
    expect(SENT_FOR_RANKING).toContain("the app's own best-guess sentences");
  });
});
