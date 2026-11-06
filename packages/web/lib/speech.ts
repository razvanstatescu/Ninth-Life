/**
 * Web Speech output (source plan §4.6).
 * - Voices load late: wait for `voiceschanged` (with a timeout) before deciding there are none.
 * - Prefer voices with localService === true: they work offline and the text stays on the device.
 * - iOS Safari needs a user gesture: speak() calls speechSynthesis.speak synchronously, so call it
 *   straight from a click or keydown handler, never after an await.
 * - Chromium cuts long utterances off: text is split into chunks at sentence and word boundaries.
 */

export interface VoiceLike {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export const CHUNK_MAX = 160;
export const VOICES_TIMEOUT_MS = 2000;

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

/** On-device voices first, then the page language, then the browser default, then by name. */
export function sortVoices<V extends VoiceLike>(voices: readonly V[], lang = 'en'): V[] {
  const base = lang.toLowerCase().split('-')[0]!;
  const score = (v: V) =>
    (v.localService ? 4 : 0) + (v.lang.toLowerCase().startsWith(base) ? 2 : 0) + (v.default ? 1 : 0);
  return [...voices].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

/** The saved voice if it still exists, else the best on-device voice for the language. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], uri?: string, lang = 'en'): V | undefined {
  if (uri) {
    const v = voices.find((x) => x.voiceURI === uri);
    if (v) return v;
  }
  return sortVoices(voices, lang)[0];
}

/** Split text into chunks of at most `max` characters, at sentence ends, then commas, then spaces. */
export function chunkText(text: string, max = CHUNK_MAX): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const out: string[] = [];
  const sentences = (clean.match(/[^.!?]+[.!?]*/g) ?? [clean]).map((x) => x.trim()).filter(Boolean);
  let buf = '';
  const join = (a: string, b: string) => (a ? `${a} ${b}` : b);
  const flush = () => {
    if (buf) out.push(buf);
    buf = '';
  };
  for (const s of sentences) {
    if (join(buf, s).length <= max) {
      buf = join(buf, s);
      continue;
    }
    flush();
    if (s.length <= max) {
      buf = s;
      continue;
    }
    for (const word of s.split(' ')) {
      if (!word) continue;
      if (join(buf, word).length <= max) {
        buf = join(buf, word);
      } else {
        flush();
        // A single word longer than max is split hard (rare: long codes, URLs).
        let w = word;
        while (w.length > max) {
          out.push(w.slice(0, max));
          w = w.slice(max);
        }
        buf = w;
      }
    }
  }
  flush();
  return out;
}

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
      synth.removeEventListener?.('voiceschanged', onChange);
      resolve(synth.getVoices());
    };
    const onChange = () => {
      if (synth.getVoices().length > 0) finish();
    };
    synth.addEventListener?.('voiceschanged', onChange);
    setTimeout(finish, timeoutMs);
  });
}

export interface SpeakOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

/**
 * Speak now. Synchronous on purpose (iOS user-gesture rule). Returns false when there is no
 * speech engine, so the caller can switch to show mode.
 */
export function speak(text: string, opts: SpeakOptions = {}): boolean {
  if (!speechSupported()) return false;
  const chunks = chunkText(text);
  if (chunks.length === 0) return false;
  const synth = window.speechSynthesis;
  synth.cancel(); // clears a stuck queue (Chromium) and stops anything still speaking
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    if (opts.voice) {
      u.voice = opts.voice;
      u.lang = opts.voice.lang;
    } else if (opts.lang) {
      u.lang = opts.lang;
    }
    u.rate = opts.rate ?? 1;
    u.pitch = opts.pitch ?? 1;
    if (i === 0) u.onstart = () => opts.onStart?.();
    if (i === chunks.length - 1) u.onend = () => opts.onEnd?.();
    u.onerror = (e) => {
      const err = (e as SpeechSynthesisErrorEvent).error;
      if (err !== 'canceled' && err !== 'interrupted') opts.onError?.(err);
    };
    synth.speak(u);
  });
  // Some engines start paused after a previous cancel.
  if (synth.paused) synth.resume();
  return true;
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
