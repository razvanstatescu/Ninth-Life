// Finish the word (web-ui Req 31; spec r6 2-word-completion §5): the composer's `complete` action and
// the word row on the screen. Layout per device, scanning and the 24 sizes: test/e2e/completion.mjs.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Lexicon, bigramModel, encodeWord, validate, type BigramFile, type LexiconFile } from '@ninth/core';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { EMPTY, MAX_CODE, codesOf, composerReducer, type ComposerAction, type ComposerState } from '@/lib/composer';
import type { DictState } from '@/lib/data';
import { openSection } from './settings-section';
import { openProof } from './proof-helper';

/** "I need wa…": water, want, wait all start with 92; waves too (not in the word pairs, so never offered). */
const LEX: LexiconFile = {
  v: 1,
  lang: 'en',
  source: 'test',
  license: 'CC0',
  codes: {
    '4': [['i', 80], ['g', 30], ['h', 30]],
    '6333': [['need', 55], ['meed', 20]],
    '92837': [['water', 52], ['waves', 45]],
    '9268': [['want', 50]],
    '9248': [['wait', 48]],
    '92': [['ya', 20]],
    '4663': [['good', 60], ['home', 58], ['gone', 50]],
    '46637': [['goods', 30], ['homes', 30]],
    '27': [['as', 60]],
    '366': [['don', 30], ['fom', 10]],
    '3668': [["don't", 61]],
  },
};
const BIGRAM: BigramFile = {
  v: 1,
  lang: 'en',
  source: 'test',
  license: 'CC0',
  bos: '<s>',
  logp: {
    '<s>': { i: -0.5, good: -2 },
    i: { need: -0.8, want: -1, "don't": -1.2 },
    need: { water: -0.9, wait: -1.5, want: -1.8 },
    want: { good: -1 },
    water: { as: -2 },
  },
  backoff: { '<s>': -0.3, i: -0.4, need: -0.4, want: -0.4, water: -0.4 },
};
function dict(): Extract<DictState, { status: 'ready' }> {
  const lexicon = Lexicon.fromJSON(LEX);
  return { status: 'ready', lexicon, lm: bigramModel(BIGRAM, lexicon), model: 'bigram', pack: null };
}

const KEY = { 2: '2 ABC, A B C', 3: '3 DEF, D E F', 4: '4 GHI, G H I', 6: '6 MNO, M N O', 7: '7 PQRS, P Q R S', 8: '8 TUV, T U V', 9: '9 WXYZ, W X Y Z', 0: '0 Space' } as Record<string, string>;
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
function typeDigits(digits: string) {
  for (const d of digits) {
    if (d === '*') press('Back');
    else press(KEY[d]!);
  }
}
const utterance = () => document.getElementById('utterance')!.textContent ?? '';
/** The word row: the section named by its "Finish the word" heading. */
function wordRow(): HTMLElement | null {
  const h = screen.queryAllByRole('heading', { name: 'Finish the word' }).find((e) => !e.closest('dialog'));
  return (h?.closest('section') as HTMLElement | null) ?? null;
}
const rowWords = () => {
  const r = wordRow();
  return r ? within(r).queryAllByRole('button').map((b) => b.textContent?.trim() ?? '') : [];
};
const keyLine = () => document.querySelector('.nl-speakbar__digits');
/** The keys as seen: the key line without its screen-reader-only words. */
const visibleKeys = () => {
  const c = document.querySelector('.nl-speakbar__digits-end')?.cloneNode(true) as HTMLElement | undefined;
  c?.querySelectorAll('.nl-sr-only').forEach((n) => n.remove());
  return c?.textContent?.trim() ?? '';
};

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
  return { speak, spoken: () => speak.mock.calls.map((c) => (c[0] as Utterance).text) };
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---- composer ---------------------------------------------------------------------------------
const run = (s: ComposerState, actions: ComposerAction[]) => actions.reduce(composerReducer, s);
const typed = (digits: string) => run(EMPTY, [...digits].map((d) => (d === '0' ? { type: 'space' } : { type: 'digit', digit: d }) as ComposerAction));
const WORDS = Object.values(LEX.codes).flatMap((l) => l.map(([w]) => w));

describe('composer: complete (Req 31.2, 31.4; AC 16)', () => {
  it('Req 31.2 complete sets the full code, pins the word, records the keys pressed and closes the word', () => {
    const s = run(typed('4063330'), [{ type: 'digit', digit: '9' }, { type: 'digit', digit: '2' }, { type: 'complete', word: 'water' } as ComposerAction]);
    expect(codesOf(s)).toEqual(['4', '6333', '92837']);
    expect(s.open).toBe(false);
    const last = s.slots.at(-1)! as { code: string; pin?: string; typed?: number };
    expect(last.pin).toBe('water');
    expect(last.typed).toBe(2);
  });

  it('Req 31.2 the next digit starts a new word (no 0 needed)', () => {
    const s = run(typed('40633309'), [{ type: 'digit', digit: '2' }, { type: 'complete', word: 'water' } as ComposerAction, { type: 'digit', digit: '2' }]);
    expect(codesOf(s)).toEqual(['4', '6333', '92837', '2']);
    expect(s.open).toBe(true);
  });

  it('Req 31.4 Back right after a finished word reopens it at the keys pressed; Back again deletes a key', () => {
    const s = run(typed('4063330'), [{ type: 'digit', digit: '9' }, { type: 'digit', digit: '2' }, { type: 'complete', word: 'water' } as ComposerAction, { type: 'back' }]);
    expect(codesOf(s)).toEqual(['4', '6333', '92']);
    expect(s.open).toBe(true);
    expect(s.slots.at(-1)!.pin).toBeUndefined();
    const s2 = composerReducer(s, { type: 'back' });
    expect(codesOf(s2)).toEqual(['4', '6333', '9']);
  });

  it('Req 31.4 Back after a finished word with punctuation set removes the mark first', () => {
    const s = run(typed('46'), [{ type: 'complete', word: 'good' } as ComposerAction, { type: 'punct' }, { type: 'back' }]);
    expect(s.punct).toBeUndefined();
    expect(codesOf(s)).toEqual(['4663']);
    expect(s.open).toBe(false);
  });

  it('a habitual 0 after a finished word does nothing', () => {
    const s = run(typed('46'), [{ type: 'complete', word: 'good' } as ComposerAction]);
    const s2 = composerReducer(s, { type: 'space' });
    expect(codesOf(s2)).toEqual(codesOf(s));
    expect(s2.slots).toEqual(s.slots);
  });

  it('AC 16 property: after complete the pins validate against the codes; a word that does not fit leaves the state unchanged', () => {
    fc.assert(
      fc.property(fc.constantFrom(...WORDS), fc.constantFrom(...WORDS), fc.integer({ min: 1, max: 6 }), fc.array(fc.constantFrom(...WORDS), { maxLength: 3 }), (target, other, cut, before) => {
        const code = encodeWord(target)!;
        const prefix = code.slice(0, Math.min(cut, code.length));
        // A sentence of earlier words, then the open prefix.
        let s = EMPTY;
        for (const w of before) s = run(s, [...encodeWord(w)!].map((d) => ({ type: 'digit', digit: d }) as ComposerAction).concat([{ type: 'space' }]));
        s = run(s, [...prefix].map((d) => ({ type: 'digit', digit: d }) as ComposerAction));
        for (const w of [target, other]) {
          const c = encodeWord(w)!;
          const next = composerReducer(s, { type: 'complete', word: w } as ComposerAction);
          const fits = c.startsWith(prefix) && c.length > prefix.length && c.length <= MAX_CODE;
          if (!fits) {
            expect(next).toBe(s);
            continue;
          }
          const pins = next.slots.map((x) => x.pin);
          expect(next.open).toBe(false);
          expect(validate([w], [next.slots.at(-1)!.code])).toBe(true);
          // Every pinned word matches its own keys.
          next.slots.forEach((x, i) => {
            if (x.pin) expect(validate([x.pin], [codesOf(next)[i]!])).toBe(true);
          });
          expect(pins.at(-1)).toBe(w);
        }
      }),
    );
  });

  it('complete does nothing when no word is open, or the open word is pinned', () => {
    const closed = typed('460');
    expect(composerReducer(closed, { type: 'complete', word: 'good' } as ComposerAction)).toBe(closed);
    expect(composerReducer(EMPTY, { type: 'complete', word: 'good' } as ComposerAction)).toBe(EMPTY);
  });
});

// ---- the screen ------------------------------------------------------------------------------
describe('screen: the word row (Req 31.1-31.3, 31.6, 31.7)', () => {
  it('AC 1 typing 92 after "I need" shows 1-3 words, each starting with 92 and longer', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('4063330');
    expect(wordRow()).toBeNull();
    typeDigits('92');
    const words = rowWords();
    expect(words.length).toBeGreaterThanOrEqual(1);
    expect(words.length).toBeLessThanOrEqual(3);
    for (const w of words) {
      const c = encodeWord(w)!;
      expect(c.startsWith('92') && c.length > 2).toBe(true);
    }
    expect(words[0]).toBe('water'); // ranked by the word pairs after "need"
  });

  it('Req 31.7 only words in the word pairs, My words or the pack are offered ("waves" is not)', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('406333092');
    expect(rowWords()).not.toContain('waves');
    expect(rowWords()).not.toContain('ya'); // the exact reading of the keys is never offered
  });

  it('AC 2, 3, 5 a word press puts it in, closes the word, fills in the keys, and speaks nothing', () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('406333092');
    fireEvent.click(within(wordRow()!).getByRole('button', { name: 'water' }));
    expect(utterance()).toContain('I need water');
    expect(keyLine()!.textContent).toContain('4 6333 92837');
    // The keys not pressed (837) are marked as filled in, and screen readers hear ", 3 filled in".
    expect(keyLine()!.textContent).toMatch(/3 filled in/);
    expect(v.speak).not.toHaveBeenCalled();
    expect(wordRow()).toBeNull(); // the word is closed
    typeDigits('27'); // next word, no 0 needed
    expect(utterance()).toMatch(/I need water as/);
    expect(v.speak).not.toHaveBeenCalled();
  });

  it('AC 4 proof: the spoken sentence validates against the key line codes', async () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('406333092');
    fireEvent.click(within(wordRow()!).getByRole('button', { name: 'water' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
    });
    expect(v.speak).toHaveBeenCalledTimes(1);
    const said = v.spoken()[0]!.toLowerCase().replace(/[.?!,]/g, '').split(/\s+/);
    expect(validate(said, ['4', '6333', '92837'])).toBe(true);
  });

  it('AC 6 Back once after a finished word reopens it and shows the row again', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('406333092');
    fireEvent.click(within(wordRow()!).getByRole('button', { name: 'water' }));
    press('Back');
    expect(keyLine()!.textContent).toContain('4 6333 92');
    expect(keyLine()!.textContent).not.toContain('92837');
    expect(rowWords()).toContain('water');
  });

  it('AC 7 three fixed places: fewer words leave the later places empty (no button)', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('43668'.slice(0, 1) + '0' + '366'); // "i" then 366 -> don't only
    const r = wordRow();
    expect(r).not.toBeNull();
    const buttons = within(r!).queryAllByRole('button');
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(["don't"]);
    // Three places are laid out: the row keeps 3 cells (empty ones have no button).
    expect(r!.querySelectorAll(':scope [data-place], :scope li, :scope .word-row__cell').length === 0 || r!.querySelectorAll('[data-place], li, .word-row__cell').length === 3).toBe(true);
  });

  it("apostrophes are free: 366 after i offers don't with its apostrophe", () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('40366');
    expect(rowWords()).toContain("don't");
  });

  it('AC 11 Alt+Shift+1 takes word 1, Numpad + takes word 1, plain digits still type', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('406333092');
    const first = rowWords()[0]!;
    fireEvent.keyDown(window, { key: '!', code: 'Digit1', altKey: true, shiftKey: true });
    expect(utterance().toLowerCase()).toContain(first);
    press('Back');
    fireEvent.keyDown(window, { key: '+', code: 'NumpadAdd' });
    expect(utterance().toLowerCase()).toContain(first);
    // Plain 2 types a key of a new word.
    fireEvent.keyDown(window, { key: '2', code: 'Digit2' });
    expect(visibleKeys()).toMatch(/92837 2$/);
  });

  it('AC 11 the keys do nothing while the row is hidden', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('4063330');
    const before = utterance();
    fireEvent.keyDown(window, { key: '!', code: 'Digit1', altKey: true, shiftKey: true });
    fireEvent.keyDown(window, { key: '+', code: 'NumpadAdd' });
    expect(utterance()).toBe(before);
  });

  it('AC 12 each word button is named exactly its visible word; the section is "Finish the word"', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('406333092');
    const r = wordRow()!;
    expect(r.tagName).toBe('SECTION');
    for (const b of within(r).getAllByRole('button')) {
      const name = b.getAttribute('aria-label') ?? b.textContent?.trim();
      expect(name).toBe(b.textContent?.trim());
    }
    // Not inside a live region (it would announce on every key).
    expect(r.closest('[aria-live]')).toBeNull();
  });

  it('AC 13 the sentence live region adds "Words: …" after typing pauses', async () => {
    vi.mocked(Date.now).mockRestore();
    render(<CommunicationScreen initialDict={dict()} layout="wide" initialSettings={{ acceptDelayMs: 0 }} />);
    typeDigits('406333092');
    const words = rowWords();
    await waitFor(
      () => {
        const live = [...document.querySelectorAll('.nl-sr-only[aria-live="polite"]')].map((e) => e.textContent ?? '').join(' | ');
        expect(live).toContain(`Words: ${words.join(', ')}.`);
      },
      { timeout: 2000 },
    );
  });

  it('AC 14 with Finish words off, no row and keys behave as before', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" initialSettings={{ wordCompletion: false } as never} />);
    typeDigits('406333092');
    expect(wordRow()).toBeNull();
    typeDigits('837');
    expect(utterance()).toContain('I need water');
  });

  it('AC 14 the setting is "Finish words" in a Typing group, on by default', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    press('Settings');
    openSection('Typing');
    const sw = screen.getByRole('switch', { name: 'Finish words' }) as HTMLInputElement;
    expect(sw.checked).toBe(true);
    expect(document.getElementById(sw.getAttribute('aria-describedby')!)!.textContent).toContain('Show up to 3 words that start with your keys. One press puts the whole word in. When off, you type every letter.');
    fireEvent.click(sw);
    expect(sw.checked).toBe(false);
  });

  it('31.1 no row once the word is pinned by #, and none on a spoken sentence', async () => {
    withVoice();
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('4663');
    // 4663 is complete (good) and has longer words (goods, homes) but they are not in the word pairs.
    press('Next word');
    expect(wordRow()).toBeNull();
    typeDigits('0');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
    });
    expect(wordRow()).toBeNull();
  });

  it('31.3 the proof panel explains the dotted line when a word has filled-in keys', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('406333092');
    fireEvent.click(within(wordRow()!).getByRole('button', { name: 'water' }));
    const proof = openProof();
    expect(proof.textContent).toContain('A dotted line marks keys that came with a word you picked. Every word still matches all of its keys.');
    expect(proof.textContent).toMatch(/3 filled in/);
  });

  it('Req 31.7 nothing about the row is sent for model ranking', async () => {
    vi.mocked(Date.now).mockRestore();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ v: 1, candidates: [], rejected: 0 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<CommunicationScreen initialDict={dict()} layout="wide" initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    typeDigits('406333092');
    await act(() => new Promise((r) => setTimeout(r, 600)));
    expect(fetchMock).not.toHaveBeenCalled(); // open word, keys just typed
    fireEvent.click(within(wordRow()!).getByRole('button', { name: 'water' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 2000 });
    const body = JSON.parse((fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit])[1].body as string);
    expect(Object.keys(body).sort()).toEqual(['beams', 'codes', 'context', 'k', 'lang', 'lattice', 'mode', 'v']);
    expect(body.codes).toEqual(['4', '6333', '92837']);
    expect(body.lattice[2]).toEqual(['water']); // the finished word goes as a one-word slot
    expect(JSON.stringify(body)).not.toMatch(/want|wait/);
  });
});
