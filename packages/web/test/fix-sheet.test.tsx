// Fix any word, and Did you mean (web-ui Req 32; spec r6 3-fix-a-word AC 1-7, 12). Goes to
// packages/web/test/fix-word.test.tsx when item 3 is built. Sizes, switch and axe: test/e2e/fix.mjs.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Lexicon, bigramModel, encodeWord, validate, type BigramFile, type LexiconFile } from '@ninth/core';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { EMPTY, codesOf, composerReducer, type ComposerAction, type ComposerState } from '@/lib/composer';
import type { DictState } from '@/lib/data';

// "can you call my daughter" and its slips: calm (2256) is one key from call (2255); please (753273) and the
// extra-5 slip 7532573 that spells nothing.
const LEX: LexiconFile = { v: 1, lang: 'en', source: 'test', license: 'CC0', codes: {} };
LEX.codes = {
  '226': [['can', 70], ['ban', 30]],
  '968': [['you', 72]],
  '2255': [['call', 60], ['ball', 50]],
  '2256': [['calm', 40]],
  '69': [['my', 70]],
  '32844837': [['daughter', 50]],
  '753273': [['please', 62]],
  '4': [['i', 80]],
  '6333': [['need', 55]],
  '92837': [['water', 52], ['waves', 45]],
  '686': [['mum', 40]],
  '323': [['dad', 40]],
};
const BIGRAM: BigramFile = {
  v: 1,
  lang: 'en',
  source: 'test',
  license: 'CC0',
  bos: '<s>',
  logp: { '<s>': { can: -0.5, i: -0.6 }, can: { you: -0.3 }, you: { call: -0.8, calm: -2 }, call: { my: -0.6 }, my: { daughter: -1 }, i: { need: -0.5 } },
  backoff: { '<s>': -0.3, can: -0.4, you: -0.4, call: -0.4, my: -0.4, i: -0.4 },
};
function dict(): Extract<DictState, { status: 'ready' }> {
  const lexicon = Lexicon.fromJSON(LEX);
  return { status: 'ready', lexicon, lm: bigramModel(BIGRAM, lexicon), model: 'bigram', pack: null };
}
const KEY = { 2: '2 ABC, A B C', 3: '3 DEF, D E F', 4: '4 GHI, G H I', 5: '5 JKL, J K L', 6: '6 MNO, M N O', 7: '7 PQRS, P Q R S', 8: '8 TUV, T U V', 9: '9 WXYZ, W X Y Z', 0: '0 Space' } as Record<string, string>;
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const typeDigits = (ds: string) => {
  for (const d of ds) press(KEY[d]!);
};
const typeWords = (s: string) => typeDigits(s.split(' ').map((w) => encodeWord(w)).join('0'));
const utterance = () => (document.getElementById('utterance')?.textContent ?? '').replace(/Keys:.*/, '');
/** The keys on screen: the key line without screen-reader words and without a struck (removed) key. */
const keys = () => {
  const c = document.querySelector('.nl-speakbar__digits-end')?.cloneNode(true) as HTMLElement | undefined;
  c?.querySelectorAll('.nl-sr-only, .nl-keyfix-removed').forEach((n) => n.remove());
  return c?.textContent?.trim() ?? '';
};
const keyLineAll = () => document.querySelector('.nl-speakbar__digits')?.textContent ?? '';
const sheet = () => document.querySelector<HTMLElement>('dialog[open]');
function withVoice() {
  const speak = vi.fn();
  class U {
    text: string;
    constructor(t: string) {
      this.text = t;
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', U);
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [{ voiceURI: 'v', name: 'T', lang: 'en-US', localService: true, default: true }], addEventListener: vi.fn(), removeEventListener: vi.fn(), paused: false });
  return { speak, spoken: () => speak.mock.calls.map((c) => (c[0] as U).text) };
}
/** One press on the sentence in the card opens Fix a word (its name starts with the sentence). */
const openFix = () => fireEvent.click(screen.getByRole('button', { name: /\. Fix a word$/ }));
const pickInSheet = (name: string | RegExp) => fireEvent.click(within(sheet()!).getByRole('button', { name }));

beforeEach(() => {
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---- composer --------------------------------------------------------------------------------
const run = (s: ComposerState, as: ComposerAction[]) => as.reduce(composerReducer, s);
const typed = (words: string[]) => run(EMPTY, words.flatMap((w, i) => [...(i ? [{ type: 'space' }] : []), ...[...encodeWord(w)!].map((d) => ({ type: 'digit', digit: d }))] as ComposerAction[]));

describe('composer: recode and edit (Req 32.2-32.6, AC 12)', () => {
  it('recode sets the word, its keys and the old keys; validate holds', () => {
    const s = run(typed(['can', 'you', 'calm', 'my']), [{ type: 'space' }, { type: 'recode', index: 2, word: 'call' } as ComposerAction]);
    expect(codesOf(s)).toEqual(['226', '968', '2255', '69']);
    expect(s.slots[2]!.pin).toBe('call');
    expect((s.slots[2] as { was?: string }).was).toBe('2256');
  });
  it('recode refuses a word more than one key away', () => {
    const s = typed(['can', 'you', 'calm']);
    expect(composerReducer(s, { type: 'recode', index: 0, word: 'daughter' } as ComposerAction)).toBe(s);
  });
  it('AC 12 property: edit, digits, space leave the other slots identical; recode keeps every pin valid', () => {
    const words = ['can', 'you', 'call', 'my', 'daughter', 'i', 'need', 'water'];
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...words), { minLength: 2, maxLength: 6 }), fc.nat(), fc.constantFrom(...words), (ws, iRaw, retype) => {
        const s0 = run(typed(ws), [{ type: 'space' }]);
        const i = iRaw % ws.length;
        const s1 = run(s0, [{ type: 'edit', index: i } as ComposerAction, ...[...encodeWord(retype)!].map((d) => ({ type: 'digit', digit: d }) as ComposerAction), { type: 'space' }]);
        expect(codesOf(s1)[i]).toBe(encodeWord(retype));
        codesOf(s1).forEach((c, j) => {
          if (j !== i) expect(c).toBe(codesOf(s0)[j]);
        });
        s1.slots.forEach((x, j) => {
          if (x.pin) expect(validate([x.pin], [codesOf(s1)[j]!])).toBe(true);
        });
      }),
    );
  });
  it('Back with no key typed ends the retype and keeps the old word (AC 3)', () => {
    const s0 = run(typed(['can', 'you', 'call']), [{ type: 'space' }]);
    const s1 = run(s0, [{ type: 'edit', index: 0 } as ComposerAction, { type: 'back' }]);
    expect(codesOf(s1)).toEqual(codesOf(s0));
  });
  it('Back right after a key fix on the last word restores the old keys (AC 6)', () => {
    const s0 = run(typed(['can', 'you', 'calm']), [{ type: 'space' }, { type: 'recode', index: 2, word: 'call' } as ComposerAction, { type: 'back' }]);
    expect(codesOf(s0)).toEqual(['226', '968', '2256']);
  });
});

// ---- screen ----------------------------------------------------------------------------------
describe('screen: Fix a word (Req 32.1-32.3, 32.5)', () => {
  it('AC 1 "Can you calm my daughter": Fix a word > calm > call; keys 2255 with the change boxed and said', () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeWords('can you calm my daughter');
    openFix();
    expect(within(sheet()!).getByRole('heading', { name: 'Fix a word' })).toBeTruthy();
    pickInSheet(/^calm, keys 2 2 5 6/);
    expect(within(sheet()!).getByRole('heading', { name: /Fix .calm./ })).toBeTruthy();
    pickInSheet(/^call, keys 2 2 5 5, key 4 changed from 6 to 5/);
    expect(sheet()).toBeNull();
    expect(utterance()).toContain('Can you call my daughter');
    expect(keys()).toBe('226 968 2255 69 32844837');
    expect(keyLineAll()).toContain(', key 4 changed from 6 to 5');
    expect(v.speak).not.toHaveBeenCalled();
  });

  it('AC 2 another reading changes only that word, keys unchanged, nothing spoken', () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeWords('can you call my daughter');
    const before = keys();
    openFix();
    pickInSheet(/^call, keys/i);
    pickInSheet(/^ball$/);
    expect(utterance()).toContain('Can you ball my daughter');
    expect(keys()).toBe(before);
    expect(v.speak).not.toHaveBeenCalled();
  });

  it('AC 3 Retype word 1 of 4: keys go to word 1, 0 ends it, the rest unchanged', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeWords('mum need water please');
    openFix();
    pickInSheet(/^mum, keys/i);
    pickInSheet('Retype this word');
    expect(keyLineAll()).toMatch(/Retype/);
    typeDigits('323');
    typeDigits('0');
    expect(keys()).toBe('323 6333 92837 753273');
    expect(utterance()).toMatch(/^Dad need water please/);
  });

  it('AC 4 Did you mean: 7532573 offers please; picking it strikes the extra 5', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('7532573');
    const h = screen.getByRole('heading', { name: 'Did you mean' });
    const row = h.closest('section')!;
    fireEvent.click(within(row).getByRole('button', { name: /^please/ }));
    expect(keys()).toBe('753273');
    expect(keyLineAll()).toContain(', extra 5 removed');
    expect(document.querySelector('.nl-speakbar__digits .nl-keyfix-removed')).not.toBeNull();
  });

  it('AC 5 Did you mean changes nothing without a press; Spell stays', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('7532573');
    expect(keys()).toBe('7532573');
    expect(screen.getAllByRole('button', { name: /Spell this word/ }).length).toBeGreaterThan(0);
  });

  it('AC 6 Back right after a Did you mean pick restores the old keys', () => {
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeDigits('7532573');
    fireEvent.click(within(screen.getByRole('heading', { name: 'Did you mean' }).closest('section')!).getByRole('button', { name: /^please/ }));
    press('Back');
    expect(keys()).toBe('7532573');
  });

  it('AC 7 proof: after a fix the spoken words validate against the key line', async () => {
    const v = withVoice();
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    typeWords('can you calm my daughter');
    openFix();
    pickInSheet(/^calm, keys/);
    pickInSheet(/^call, keys 2 2 5 5/);
    await act(async () => {
      press('Speak');
    });
    const said = v.spoken()[0]!.toLowerCase().replace(/[.?!,]/g, '').split(/\s+/);
    expect(validate(said, keys().split(' '))).toBe(true);
  });

  it('the card button is off with nothing typed and on a spoken sentence', async () => {
    withVoice();
    render(<CommunicationScreen initialDict={dict()} layout="wide" />);
    expect(screen.queryByRole('button', { name: /\. Fix a word$/ })).toBeNull();
    typeWords('i need water');
    await act(async () => {
      press('Speak');
    });
    expect(screen.queryByRole('button', { name: /\. Fix a word$/ })).toBeNull();
  });
});
