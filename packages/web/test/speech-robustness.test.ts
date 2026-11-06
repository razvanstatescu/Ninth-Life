/**
 * Speech robustness (web-ui Req 18; research in docs/research/web-speech.md).
 * `speechSynthesis` is a hand-written fake: events fire only when a test fires them, so the
 * browser bugs (late voiceschanged, a missing end event, cancel races) can be replayed exactly.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHUNK_MAX,
  CHUNK_MIN,
  VOICES_RETRIES,
  VOICES_RETRY_MS,
  VOICES_TIMEOUT_MS,
  chunkMaxForRate,
  chunkText,
  estimateMs,
  isLowQualityVoice,
  langBase,
  liveUtterances,
  loadVoices,
  pickVoice,
  sortVoices,
  speak,
  stopSpeaking,
  type VoiceLike,
} from '@/lib/speech';
import { useVoices } from '@/lib/useVoices';

// ---- fakes ---------------------------------------------------------------------------------

class FakeUtterance {
  text: string;
  voice: unknown = null;
  lang = '';
  rate = 1;
  pitch = 1;
  onstart: ((e: unknown) => void) | null = null;
  onend: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

class FakeSynth {
  voices: VoiceLike[] = [];
  queue: FakeUtterance[] = [];
  spoken: FakeUtterance[] = [];
  paused = false;
  listeners = new Set<() => void>();
  speak = vi.fn((u: FakeUtterance) => {
    this.queue.push(u);
    this.spoken.push(u);
  });
  cancel = vi.fn(() => {
    this.queue = [];
  });
  resume = vi.fn(() => {
    this.paused = false;
  });
  get speaking() {
    return this.queue.length > 0;
  }
  get pending() {
    return this.queue.length > 1;
  }
  getVoices = () => this.voices;
  addEventListener = (_: string, f: () => void) => this.listeners.add(f);
  removeEventListener = (_: string, f: () => void) => this.listeners.delete(f);
  voicesChanged(v: VoiceLike[]) {
    this.voices = v;
    for (const f of [...this.listeners]) f();
  }
  start(u: FakeUtterance) {
    u.onstart?.({});
  }
  end(u: FakeUtterance) {
    this.queue = this.queue.filter((x) => x !== u);
    u.onend?.({});
  }
  fail(u: FakeUtterance, error: string) {
    this.queue = this.queue.filter((x) => x !== u);
    u.onerror?.({ error });
  }
  last() {
    return this.spoken[this.spoken.length - 1]!;
  }
}

let synth: FakeSynth;

function install() {
  synth = new FakeSynth();
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('speechSynthesis', synth);
}

const v = (name: string, lang: string, localService: boolean, isDefault = false): VoiceLike => ({
  voiceURI: name,
  name,
  lang,
  localService,
  default: isDefault,
});

/** Deterministic pseudo-random text: words of 1-14 letters with sentence and clause marks. */
function randomText(seed: number, words: number): string {
  let x = seed >>> 0 || 1;
  const rnd = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const out: string[] = [];
  for (let i = 0; i < words; i++) {
    const len = 1 + Math.floor(rnd() * 14);
    let w = Array.from({ length: len }, () => String.fromCharCode(97 + Math.floor(rnd() * 26))).join('');
    const r = rnd();
    if (r < 0.08) w += '.';
    else if (r < 0.12) w += '?';
    else if (r < 0.2) w += ',';
    else if (r < 0.22) w += ';';
    out.push(w);
  }
  return out.join(rnd() < 0.5 ? ' ' : '  ');
}

beforeEach(install);
afterEach(() => {
  stopSpeaking();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---- chunking ------------------------------------------------------------------------------

describe('Req 18.1: chunking at sentence, then clause, then word boundaries', () => {
  it('Req 18.1: splits at sentence ends first', () => {
    const a = 'I would like a glass of water with ice please.';
    const b = 'Then could you open the window a little bit?';
    const c = 'Thank you so much for your help today.';
    expect(chunkText(`${a} ${b} ${c}`, 100)).toEqual([`${a} ${b}`, c]);
  });

  it('Req 18.1: splits a long sentence at commas and semicolons before plain spaces', () => {
    const text = 'When you get home tonight, please call my sister about the weekend; she is waiting for news about the trip';
    // The whole sentence is 106 characters, so it splits at the comma and the semicolon, not mid-clause.
    expect(chunkText(text, 60)).toEqual([
      'When you get home tonight,',
      'please call my sister about the weekend;',
      'she is waiting for news about the trip',
    ]);
  });

  it('Req 18.1: a clause split lands right after the mark', () => {
    expect(chunkText('aaaa bbbb, cccc dddd', 12)).toEqual(['aaaa bbbb,', 'cccc dddd']);
    expect(chunkText('aaaa bbbb; cccc dddd', 12)).toEqual(['aaaa bbbb;', 'cccc dddd']);
  });

  it('Req 18.1: does not split inside a number or abbreviation with no space after the dot', () => {
    const text = `${'word '.repeat(30)}it costs 3.50 today`;
    const chunks = chunkText(text, 40);
    expect(chunks.some((c) => c.includes('3.50'))).toBe(true);
  });

  it('Req 18.1: property over 400 generated texts: no chunk over max unless one word, never mid-word, lossless', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const text = randomText(seed, 5 + (seed % 90));
      const max = 20 + (seed % 7) * 20;
      const chunks = chunkText(text, max);
      const clean = text.replace(/\s+/g, ' ').trim();
      const words = clean.split(' ');
      expect(chunks.join(' '), `seed ${seed}`).toBe(clean);
      for (const c of chunks) {
        expect(c.length <= max || !c.includes(' '), `seed ${seed}: "${c}"`).toBe(true);
        expect(c).toBe(c.trim());
      }
      // Never mid-word: every chunk boundary is a word boundary of the input.
      expect(chunks.flatMap((c) => c.split(' ')), `seed ${seed}`).toEqual(words);
    }
  });
});

describe('Req 18.2: chunk length follows the speech rate', () => {
  it('Req 18.2: 160 at rate 1 or faster, shorter when slower, never below the floor', () => {
    expect(chunkMaxForRate(1)).toBe(CHUNK_MAX);
    expect(chunkMaxForRate(2)).toBe(CHUNK_MAX);
    expect(chunkMaxForRate(0.5)).toBe(80);
    expect(chunkMaxForRate(0.1)).toBe(CHUNK_MIN);
    expect(chunkMaxForRate(Number.NaN)).toBe(CHUNK_MAX);
    // Each chunk then stays under the ~14 s cutoff at its rate (estimate).
    for (const rate of [0.5, 0.75, 1, 1.5, 2]) expect(estimateMs('x'.repeat(chunkMaxForRate(rate)), rate)).toBeLessThan(12_000);
  });

  it('Req 18.2: speak() at rate 0.5 queues chunks of at most 80 characters', () => {
    const text = randomText(7, 60);
    speak(text, { rate: 0.5 });
    const sent: string[] = [];
    for (let i = 0; i < 50 && synth.queue.length; i++) {
      const u = synth.last();
      sent.push(u.text);
      synth.start(u);
      synth.end(u);
    }
    expect(sent.length).toBeGreaterThan(1);
    expect(sent.every((c) => c.length <= 80 || !c.includes(' '))).toBe(true);
    expect(sent.join(' ')).toBe(text.replace(/\s+/g, ' ').trim());
  });
});

// ---- sequential queue ------------------------------------------------------------------------

describe('Req 18.3: one chunk at a time, references kept until settled', () => {
  it('Req 18.3: queues the next chunk only after the previous one ends', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const onProgress = vi.fn();
    const text = `${'One two three four five six seven. '.repeat(6)}`.trim();
    expect(speak(text, { onStart, onEnd, onProgress })).toBe(true);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const total = chunkText(text).length;
    expect(total).toBeGreaterThan(1);
    expect(liveUtterances()).toBe(1);
    for (let i = 0; i < total; i++) {
      const u = synth.last();
      synth.start(u);
      synth.end(u);
      expect(onProgress).toHaveBeenLastCalledWith(i + 1, total);
    }
    expect(synth.speak).toHaveBeenCalledTimes(total);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(liveUtterances()).toBe(0);
  });

  it('Req 18.3: sets voice, lang, rate and pitch on every chunk', () => {
    const voice = v('Local en', 'en-GB', true) as unknown as SpeechSynthesisVoice;
    speak('Hello there.', { voice, rate: 1.2, pitch: 0.8 });
    const u = synth.last();
    expect(u.voice).toBe(voice);
    expect(u.lang).toBe('en-GB');
    expect(u.rate).toBe(1.2);
    expect(u.pitch).toBe(0.8);
    speak('Hello there.', { lang: 'en' });
    expect(synth.last().lang).toBe('en');
  });

  it('Req 18.3: resumes an engine left paused', () => {
    synth.paused = true;
    speak('Hello.');
    expect(synth.resume).toHaveBeenCalled();
  });
});

// ---- voices ----------------------------------------------------------------------------------

describe('Req 18.4: choosing a voice', () => {
  it('Req 18.4: an on-device voice in the language comes first', () => {
    const list = [v('Online en', 'en-US', false, true), v('Device en', 'en-US', true), v('Device fr', 'fr-FR', true)];
    expect(pickVoice(list)?.name).toBe('Device en');
  });

  it('Req 18.4: novelty and very low quality voices are never the default choice', () => {
    const list = [v('Albert', 'en-US', true), v('Bad News', 'en-US', true), v('eSpeak English', 'en', true), v('Samantha', 'en-US', true)];
    expect(pickVoice(list)?.name).toBe('Samantha');
    expect(isLowQualityVoice({ name: 'Good News' })).toBe(true);
    expect(isLowQualityVoice({ name: 'Albertine' })).toBe(false);
    // The picker still lists them, last within their group.
    expect(sortVoices(list).map((x) => x.name)).toEqual(['Samantha', 'Albert', 'Bad News', 'eSpeak English']);
  });

  it('Req 18.4: a voice in the language beats an on-device voice in another language', () => {
    const list = [v('Device ro', 'ro-RO', true, true), v('Online en', 'en-US', false)];
    expect(pickVoice(list, undefined, 'en')?.name).toBe('Online en');
    expect(pickVoice(list, undefined, 'ro-RO')?.name).toBe('Device ro');
  });

  it('Req 18.4: with no voice in the language, falls back to the first voice in picker order', () => {
    const list = [v('Online fr', 'fr-FR', false), v('Device de', 'de-DE', true)];
    expect(pickVoice(list, undefined, 'en')?.name).toBe('Device de');
    expect(pickVoice([], undefined, 'en')).toBeUndefined();
  });

  it('Req 18.4: prefers the exact region when the language has one', () => {
    const list = [v('Device es MX', 'es-MX', true), v('Device es ES', 'es-ES', true)];
    expect(pickVoice(list, undefined, 'es-ES')?.name).toBe('Device es ES');
  });
});

describe('Req 18.5: the remembered voice', () => {
  const list = [v('A', 'en-US', true), v('B', 'en-GB', false), v('R', 'ro-RO', true)];

  it('Req 18.5: uses the remembered voice while it exists, even an online one', () => {
    expect(pickVoice(list, 'B', 'en')?.name).toBe('B');
  });

  it('Req 18.5: falls back when the remembered voice is gone', () => {
    expect(pickVoice(list, 'gone', 'en')?.name).toBe('A');
  });

  it('Req 18.5: ignores a remembered voice in another language when one speaks the language', () => {
    expect(pickVoice(list, 'R', 'en')?.name).toBe('A');
    expect(pickVoice([v('R', 'ro-RO', true)], 'R', 'en')?.name).toBe('R');
  });
});

describe('Req 18.13: messy language tags and default flags', () => {
  it('Req 18.13: normalizes underscore and three-letter tags', () => {
    expect(langBase('en_us')).toBe('en');
    expect(langBase('eng-US-f000')).toBe('en');
    expect(langBase('ron-ROU')).toBe('ro');
    expect(langBase('est-EE')).toBe('est');
    const list = [v('Estonian', 'et-EE', true), v('Android es', 'es_ES', true)];
    expect(pickVoice(list, undefined, 'es-ES')?.name).toBe('Android es');
  });

  it('Req 18.13: ignores the default flag when every voice claims it (Safari)', () => {
    const allDefault = [v('Zoe', 'en-US', true, true), v('Alex', 'en-US', true, true)];
    expect(pickVoice(allDefault)?.name).toBe('Alex');
    const oneDefault = [v('Zoe', 'en-US', true, true), v('Alex', 'en-US', true, false)];
    expect(pickVoice(oneDefault)?.name).toBe('Zoe');
  });
});

// ---- voiceschanged ---------------------------------------------------------------------------

describe('Req 4.2 / 18.6 / 18.7: voiceschanged late or never', () => {
  beforeEach(() => vi.useFakeTimers());

  it('Req 4.2: loadVoices resolves at once when voices are already there', async () => {
    synth.voices = [v('A', 'en-US', true)];
    await expect(loadVoices()).resolves.toHaveLength(1);
  });

  it('Req 4.2: loadVoices waits for a late voiceschanged', async () => {
    const p = loadVoices();
    await vi.advanceTimersByTimeAsync(800);
    synth.voicesChanged([v('A', 'en-US', true)]);
    await expect(p).resolves.toHaveLength(1);
    expect(synth.listeners.size).toBe(0);
  });

  it('Req 18.6: loadVoices ignores an empty voiceschanged and keeps waiting', async () => {
    const p = loadVoices();
    let resolved = false;
    p.then(() => (resolved = true));
    synth.voicesChanged([]);
    await Promise.resolve();
    expect(resolved).toBe(false);
    synth.voicesChanged([v('A', 'en-US', true)]);
    await expect(p).resolves.toHaveLength(1);
  });

  it('Req 4.2: loadVoices gives up after the timeout when voiceschanged never comes', async () => {
    const p = loadVoices();
    await vi.advanceTimersByTimeAsync(VOICES_TIMEOUT_MS);
    await expect(p).resolves.toEqual([]);
    expect(synth.listeners.size).toBe(0);
  });

  it('Req 18.6: useVoices does not report "no voices" on an early empty voiceschanged', async () => {
    const { result } = renderHook(() => useVoices('en'));
    act(() => synth.voicesChanged([]));
    expect(result.current.loaded).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      synth.voicesChanged([v('Online en', 'en-US', false), v('Device en', 'en-US', true)]);
    });
    expect(result.current.loaded).toBe(true);
    expect(result.current.voices.map((x) => x.name)).toEqual(['Device en', 'Online en']);
  });

  it('Req 18.7: useVoices reports no voices after the wait, then picks them up by a later check', async () => {
    const { result } = renderHook(() => useVoices('en'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VOICES_TIMEOUT_MS);
    });
    expect(result.current).toMatchObject({ loaded: true, supported: true, voices: [] });
    synth.voices = [v('Device en', 'en-US', true)]; // filled without an event
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VOICES_RETRY_MS);
    });
    expect(result.current.voices.map((x) => x.name)).toEqual(['Device en']);
  });

  it('Req 18.7: useVoices stops checking after the retries', async () => {
    const spy = vi.spyOn(synth, 'getVoices');
    renderHook(() => useVoices('en'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VOICES_TIMEOUT_MS + VOICES_RETRY_MS * (VOICES_RETRIES + 3));
    });
    const calls = spy.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VOICES_RETRY_MS * 10);
    });
    expect(spy.mock.calls.length).toBe(calls);
  });

  it('Req 18.7: useVoices still follows voiceschanged after the wait', async () => {
    const { result } = renderHook(() => useVoices('en'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VOICES_TIMEOUT_MS);
    });
    act(() => synth.voicesChanged([v('Device en', 'en-US', true)]));
    expect(result.current.voices).toHaveLength(1);
  });

  it('Req 18.7: useVoices cleans up its listener and timers on unmount', async () => {
    const { unmount } = renderHook(() => useVoices('en'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VOICES_TIMEOUT_MS);
    });
    unmount();
    expect(synth.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

// ---- cancel and supersede ----------------------------------------------------------------------

describe('Req 18.8 / 18.9: cancel before speak', () => {
  it('Req 18.8: cancels what is still speaking before the new sentence', () => {
    speak('First sentence.');
    expect(synth.cancel).not.toHaveBeenCalled(); // nothing was speaking
    speak('Second sentence.');
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.cancel.mock.invocationCallOrder[0]!).toBeLessThan(synth.speak.mock.invocationCallOrder[1]!);
    expect(synth.last().text).toBe('Second sentence.');
  });

  it('Req 18.8: does not call cancel when the engine is idle', () => {
    const u = (speak('One.'), synth.last());
    synth.start(u);
    synth.end(u);
    speak('Two.');
    expect(synth.cancel).not.toHaveBeenCalled();
  });

  it('Req 18.9: the replaced sentence ends once, and its late events are ignored', () => {
    const first = { onStart: vi.fn(), onEnd: vi.fn(), onError: vi.fn() };
    const second = { onStart: vi.fn(), onEnd: vi.fn(), onError: vi.fn() };
    speak('First sentence.', first);
    const old = synth.last();
    synth.start(old);
    speak('Second sentence.', second);
    expect(first.onEnd).toHaveBeenCalledTimes(1);
    const now = synth.last();
    synth.start(now);
    // The browser delivers the cancelled utterance's events late, after the new one started.
    old.onerror?.({ error: 'interrupted' });
    old.onend?.({});
    expect(first.onEnd).toHaveBeenCalledTimes(1);
    expect(first.onError).not.toHaveBeenCalled();
    expect(second.onEnd).not.toHaveBeenCalled();
    synth.end(now);
    expect(second.onEnd).toHaveBeenCalledTimes(1);
    expect(second.onStart).toHaveBeenCalledTimes(1);
  });

  it('Req 18.9: stopSpeaking ends the sentence once and cancels the engine', () => {
    const onEnd = vi.fn();
    speak('Hello.', { onEnd });
    stopSpeaking();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(synth.cancel).toHaveBeenCalled();
    stopSpeaking();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});

// ---- watchdog and errors -----------------------------------------------------------------------

describe('Req 18.10 / 18.11: stalls and errors', () => {
  it('Req 18.10: a chunk whose end never comes is cancelled and the next one plays', () => {
    vi.useFakeTimers();
    const onEnd = vi.fn();
    const text = 'One two three four five six seven eight. '.repeat(6).trim();
    const total = chunkText(text).length;
    speak(text, { onEnd });
    const stuck = synth.last();
    synth.start(stuck);
    vi.advanceTimersByTime(estimateMs(stuck.text) * 3 + 2000 + 1);
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect(synth.last()).not.toBe(stuck);
    stuck.onerror?.({ error: 'interrupted' }); // late event from the watchdog's cancel
    expect(onEnd).not.toHaveBeenCalled();
    for (let i = 1; i < total; i++) {
      const u = synth.last();
      synth.start(u);
      synth.end(u);
    }
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('Req 18.10: a stalled last chunk still ends the sentence, so "Speaking" never sticks', () => {
    vi.useFakeTimers();
    const onEnd = vi.fn();
    speak('Short.', { onEnd });
    synth.start(synth.last());
    vi.advanceTimersByTime(estimateMs('Short.') * 3 + 2001);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(liveUtterances()).toBe(0);
  });

  it('Req 18.10: no watchdog fires for a chunk that ends normally', () => {
    vi.useFakeTimers();
    speak('Short.');
    const u = synth.last();
    synth.start(u);
    synth.end(u);
    vi.advanceTimersByTime(60_000);
    expect(synth.cancel).not.toHaveBeenCalled();
  });

  it('Req 18.11: a real error is reported once with its type and drops the rest', () => {
    const onError = vi.fn();
    const onEnd = vi.fn();
    const text = 'One two three four five six seven eight. '.repeat(6).trim();
    speak(text, { onError, onEnd });
    const u = synth.last();
    synth.queue.push(new FakeUtterance('extra')); // something else is still queued
    synth.fail(u, 'synthesis-failed');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('synthesis-failed');
    expect(onEnd).not.toHaveBeenCalled();
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(1); // the next chunk is never queued
  });

  it('Req 18.11: "not-allowed" (no user gesture) is an error the caller can show', () => {
    const onError = vi.fn();
    speak('Hello.', { onError });
    synth.fail(synth.last(), 'not-allowed');
    expect(onError).toHaveBeenCalledWith('not-allowed');
  });

  it('Req 18.11: an interruption from outside counts as the end, not an error', () => {
    const onError = vi.fn();
    const onEnd = vi.fn();
    speak('Hello.', { onError, onEnd });
    synth.fail(synth.last(), 'interrupted');
    expect(onError).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});

// ---- no voice ----------------------------------------------------------------------------------

describe('Req 18.12 / 4.5: no engine or nothing to say means show mode', () => {
  it('Req 18.12: speak returns false with no speech engine', async () => {
    vi.unstubAllGlobals();
    expect('speechSynthesis' in window).toBe(false);
    expect(speak('Hello.')).toBe(false);
    await expect(loadVoices()).resolves.toEqual([]);
  });

  it('Req 18.12: speak returns false for empty text and queues nothing', () => {
    expect(speak('   ')).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('Req 18.12: speak returns false when the engine throws', () => {
    synth.speak.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(speak('Hello.')).toBe(false);
    expect(liveUtterances()).toBe(0);
  });

  it('Req 4.5: useVoices marks speech unsupported without an engine', async () => {
    vi.unstubAllGlobals();
    const { result } = renderHook(() => useVoices('en'));
    expect(result.current).toEqual({ loaded: true, supported: false, voices: [] });
  });
});
