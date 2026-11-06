/**
 * Web Speech output (source plan §4.6, web-ui Req 4 and Req 18; research in docs/research/web-speech.md).
 * - Voices load late: wait for `voiceschanged` (with a timeout) before deciding there are none.
 * - Prefer voices with localService === true: they work offline and the text stays on the device.
 * - iOS Safari needs a user gesture: speak() calls speechSynthesis.speak synchronously, so call it
 *   straight from a click or keydown handler, never after an await.
 * - Chromium's network voices stop after about 14-15 s without an `end` event: text is split into
 *   chunks at sentence, then clause, then word boundaries (never inside a word), shorter at slow rates,
 *   and spoken one after another, each from the previous chunk's `end`.
 * - `end` sometimes never fires (Chromium): utterances are kept referenced until they settle, and a
 *   per-chunk watchdog moves on so the app never stays stuck on "Speaking".
 * - A new speak() supersedes the previous one: its onEnd runs at once and its late events are ignored.
 */

export interface VoiceLike {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

/** Longest chunk at rate 1: about 11 s of speech at ~14 characters a second, under the ~14 s cutoff. */
export const CHUNK_MAX = 160;
/** Never make chunks shorter than this, however slow the rate. */
export const CHUNK_MIN = 40;
export const VOICES_TIMEOUT_MS = 2000;
/** After the wait ends with no voices, look again this often (some engines never fire voiceschanged). */
export const VOICES_RETRY_MS = 1000;
export const VOICES_RETRIES = 5;
/** Rough speaking speed at rate 1, used only for chunk sizes and the watchdog (estimate, not measured). */
export const CHARS_PER_SECOND = 14;
/** The watchdog waits this many times the estimated chunk length, plus WATCHDOG_SLACK_MS. */
export const WATCHDOG_FACTOR = 3;
export const WATCHDOG_SLACK_MS = 2000;

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

// ---- languages -----------------------------------------------------------------------------

/** Three-letter codes some engines report (Firefox on Android: "eng-US-f000"). */
const ISO3: Record<string, string> = { eng: 'en', ron: 'ro', rum: 'ro', spa: 'es', fra: 'fr', fre: 'fr', deu: 'de', ger: 'de', ita: 'it', por: 'pt' };

/** Primary language of a BCP 47-ish tag: "en-US", "en_us" (Android) and "eng-US-f000" all give "en". */
export function langBase(tag: string): string {
  const primary = tag.toLowerCase().replace(/_/g, '-').split('-')[0] ?? '';
  return ISO3[primary] ?? primary;
}

/** Region subtag in upper case ("en_us" gives "US"), or "" when there is none. */
export function langRegion(tag: string): string {
  const region = tag.replace(/_/g, '-').split('-')[1] ?? '';
  return /^[a-z]{2}$/i.test(region) ? region.toUpperCase() : '';
}

// ---- voices --------------------------------------------------------------------------------

/**
 * Novelty and very low quality voices that some systems preload (list from the Readium
 * "web-speech-recommended-voices" filters, BSD-3-Clause, checked 2026-11-06). They stay in the
 * picker, last, but are never chosen by default.
 */
const LOW_QUALITY = [
  'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Good News', 'Jester', 'Organ', 'Superstar',
  'Trinoids', 'Whisper', 'Wobble', 'Zarvox', 'Eddy', 'Flo', 'Grandma', 'Grandpa', 'Jacques', 'Reed', 'Rocko', 'Sandy',
  'Shelley', 'Fred', 'Junior', 'Kathy', 'Ralph',
];

export function isLowQualityVoice(v: Pick<VoiceLike, 'name'>): boolean {
  if (/^espeak\b/i.test(v.name)) return true;
  return LOW_QUALITY.some((n) => v.name === n || v.name.startsWith(`${n} `));
}

/** Safari reports default === true on every voice, so the flag only counts when some voice lacks it. */
function defaultMeaningful(voices: readonly VoiceLike[]): boolean {
  return voices.some((v) => !v.default);
}

function compareVoices<V extends VoiceLike>(lang: string, useDefault: boolean, keys: Array<(v: V) => boolean>) {
  const base = langBase(lang);
  const region = langRegion(lang);
  const all: Array<(v: V) => boolean> = [
    ...keys,
    (v) => langBase(v.lang) === base,
    (v) => region !== '' && langRegion(v.lang) === region,
    (v) => useDefault && v.default,
  ];
  return (a: V, b: V) => {
    for (const k of all) {
      const d = Number(k(b)) - Number(k(a));
      if (d !== 0) return d;
    }
    return a.name.localeCompare(b.name);
  };
}

/**
 * Picker order (Req 4.3): on-device voices first; within each group, ordinary voices before novelty
 * ones, then the page language, the exact region, the browser default, then by name.
 */
export function sortVoices<V extends VoiceLike>(voices: readonly V[], lang = 'en'): V[] {
  const cmp = compareVoices<V>(lang, defaultMeaningful(voices), [(v) => v.localService, (v) => !isLowQualityVoice(v)]);
  return [...voices].sort(cmp);
}

/**
 * The voice to speak with (Req 18.4, 18.5):
 * 1. the remembered voice (by voiceURI) if it still exists and speaks the language;
 * 2. else the best voice in the language: ordinary before novelty, on-device before online;
 * 3. else, when no voice speaks the language, the first voice in picker order.
 * A voice in the right language beats an on-device voice in another language: a wrong-language voice
 * cannot be understood. Online voices are labelled in the picker and the privacy notice.
 */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], uri?: string, lang = 'en'): V | undefined {
  const base = langBase(lang);
  const inLang = voices.filter((v) => langBase(v.lang) === base);
  if (uri) {
    const saved = voices.find((v) => v.voiceURI === uri);
    if (saved && (inLang.length === 0 || langBase(saved.lang) === base)) return saved;
  }
  if (inLang.length === 0) return sortVoices(voices, lang)[0];
  const cmp = compareVoices<V>(lang, defaultMeaningful(voices), [(v) => !isLowQualityVoice(v), (v) => v.localService]);
  return [...inLang].sort(cmp)[0];
}

// ---- chunking ------------------------------------------------------------------------------

/** Chunk length for a speech rate: slower speech gets shorter chunks so each stays under ~11 s. */
export function chunkMaxForRate(rate = 1, max = CHUNK_MAX): number {
  const r = Number.isFinite(rate) && rate > 0 ? Math.min(1, rate) : 1;
  return Math.max(CHUNK_MIN, Math.min(max, Math.round(max * r)));
}

/** Split points, from most to least preferred. Every split is at a space, so no word is ever cut. */
const LEVELS: RegExp[] = [
  /(?<=[.!?…]["'”’)\]]*)\s+/, // sentence ends
  /(?<=[,;:—–])\s+/, // clauses: after , ; : and dashes
  /\s+/, // words
];

/**
 * Split text into chunks of at most `max` characters, at sentence ends, then clause marks, then
 * spaces. A chunk never ends inside a word: a single word longer than `max` (rare: a long code or
 * URL) becomes a chunk of its own. Joining the chunks with single spaces gives the input with its
 * whitespace collapsed.
 */
export function chunkText(text: string, max = CHUNK_MAX): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const out: string[] = [];
  const pack = (part: string, level: number) => {
    const re = LEVELS[level];
    if (!re) {
      out.push(part); // one word longer than max: keep it whole
      return;
    }
    let buf = '';
    for (const piece of part.split(re).filter(Boolean)) {
      const joined = buf ? `${buf} ${piece}` : piece;
      if (joined.length <= max) {
        buf = joined;
        continue;
      }
      if (buf) out.push(buf);
      buf = '';
      if (piece.length <= max) buf = piece;
      else pack(piece, level + 1);
    }
    if (buf) out.push(buf);
  };
  pack(clean, 0);
  return out;
}

/** Estimated speaking time of a chunk in ms (for the watchdog only). */
export function estimateMs(chunk: string, rate = 1): number {
  const r = Number.isFinite(rate) && rate > 0 ? rate : 1;
  return Math.round((chunk.length / (CHARS_PER_SECOND * r)) * 1000);
}

// ---- loading voices ------------------------------------------------------------------------

/** Resolve with the voice list, waiting for `voiceschanged` up to timeoutMs. */
export function loadVoices(timeoutMs = VOICES_TIMEOUT_MS): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      synth.removeEventListener?.('voiceschanged', onChange);
      resolve(synth.getVoices());
    };
    const onChange = () => {
      if (synth.getVoices().length > 0) finish();
    };
    synth.addEventListener?.('voiceschanged', onChange);
    const timer = setTimeout(finish, timeoutMs);
  });
}

// ---- speaking ------------------------------------------------------------------------------

export interface SpeakOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  lang?: string;
  onStart?: () => void;
  /** Called once when the text has been spoken, stopped, or replaced by a newer speak(). */
  onEnd?: () => void;
  /** Called once, instead of onEnd, when the engine reports a real error (not a cancel). */
  onError?: (error: string) => void;
  /** Called after each chunk with the number of chunks done and the total. */
  onProgress?: (done: number, total: number) => void;
}

interface Session {
  opts: SpeakOptions;
  settled: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  /** The chunk in flight (one at a time). */
  utterance: SpeechSynthesisUtterance | undefined;
}

let current: Session | null = null;
/** Utterances still in flight. Holding them stops Chromium from dropping their `end` event. */
const live = new Set<SpeechSynthesisUtterance>();

/** Number of utterances still referenced (for tests and diagnostics). */
export function liveUtterances(): number {
  return live.size;
}

function settle(s: Session, error?: string): void {
  if (s.settled) return;
  s.settled = true;
  clearTimeout(s.timer);
  if (s.utterance) live.delete(s.utterance); // its late events are ignored, so let it go
  if (current === s) current = null;
  if (error === undefined) s.opts.onEnd?.();
  else s.opts.onError?.(error);
}

function speakChunk(synth: SpeechSynthesis, s: Session, chunks: string[], i: number): void {
  const { opts } = s;
  const u = new SpeechSynthesisUtterance(chunks[i]!);
  if (opts.voice) {
    u.voice = opts.voice;
    u.lang = opts.voice.lang;
  } else if (opts.lang) {
    u.lang = opts.lang;
  }
  u.rate = opts.rate ?? 1;
  u.pitch = opts.pitch ?? 1;
  let done = false;
  const next = () => {
    clearTimeout(s.timer);
    opts.onProgress?.(i + 1, chunks.length);
    if (i + 1 < chunks.length) speakChunk(synth, s, chunks, i + 1);
    else settle(s);
  };
  u.onstart = () => {
    if (s.settled || done) return;
    if (i === 0) opts.onStart?.();
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      // `end` never came (Chromium can stall silently while reporting speaking): stop it and move on.
      if (s.settled || done) return;
      done = true;
      live.delete(u);
      synth.cancel();
      next();
    }, estimateMs(chunks[i]!, opts.rate) * WATCHDOG_FACTOR + WATCHDOG_SLACK_MS);
  };
  u.onend = () => {
    live.delete(u);
    if (s.settled || done) return;
    done = true;
    next();
  };
  u.onerror = (e) => {
    live.delete(u);
    if (s.settled || done) return;
    done = true;
    const err = (e as SpeechSynthesisErrorEvent).error ?? 'unknown';
    if (err === 'canceled' || err === 'interrupted') {
      settle(s); // stopped from outside this app's speak(): treat as the end
      return;
    }
    settle(s, err);
    if (synth.speaking || synth.pending) synth.cancel(); // drop the rest of a failed sentence
  };
  s.utterance = u;
  live.add(u);
  synth.speak(u);
}

/**
 * Speak now. Synchronous on purpose (iOS user-gesture rule). Returns false when there is no
 * speech engine or nothing to say, so the caller can switch to show mode.
 */
export function speak(text: string, opts: SpeakOptions = {}): boolean {
  if (!speechSupported()) return false;
  const chunks = chunkText(text, chunkMaxForRate(opts.rate ?? 1));
  if (chunks.length === 0) return false;
  const synth = window.speechSynthesis;
  if (current) settle(current); // the previous sentence ends now; its late events are ignored
  // Cancel only when something is queued: cancel() right before speak() can drop the new utterance
  // in some engines, and it also clears a stuck Chromium queue that still reports speaking.
  if (synth.speaking || synth.pending) synth.cancel();
  const s: Session = { opts, settled: false, timer: undefined, utterance: undefined };
  current = s;
  try {
    speakChunk(synth, s, chunks, 0);
  } catch {
    s.settled = true;
    if (s.utterance) live.delete(s.utterance);
    if (current === s) current = null;
    return false;
  }
  // Some engines start paused after a previous cancel.
  if (synth.paused) synth.resume();
  return true;
}

export function stopSpeaking(): void {
  if (current) settle(current);
  if (speechSupported()) window.speechSynthesis.cancel();
}
