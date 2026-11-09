'use client';
/**
 * Voice-to-text for "They said" (web-ui Req 26, ADR-004): the browser's own speech recognition
 * (Web Speech API). Where the browser can keep recognition on the device (newer Chrome, with the
 * language downloaded) that is used; otherwise the browser sends the audio to its maker's speech
 * service (Google in Chrome, Apple in Safari). Ninth Life never receives or keeps the audio: the page
 * only gets the text back, and the text is used like a typed line (never stored).
 *
 * One phrase at a time (continuous = false): the browser stops after a pause, which suits one line
 * and avoids the restart bugs Safari has with continuous recognition.
 */
import { useSyncExternalStore } from 'react';

/** The parts of SpeechRecognition used here (not in TypeScript's DOM types). */
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  results: { readonly length: number; [index: number]: RecognitionResult };
}
export interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export interface RecognitionCtor {
  new (): Recognition;
  /** Chrome: on-device language packs ('available' | 'downloadable' | 'downloading' | 'unavailable'). */
  available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string>;
}

type WithRecognition = { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };

export function recognitionCtor(w: unknown = typeof window === 'undefined' ? undefined : window): RecognitionCtor | null {
  if (!w) return null;
  const g = w as WithRecognition;
  return g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null;
}

/**
 * The browser has speech recognition (Firefox does not) and the page may use the microphone: only
 * HTTPS pages and localhost (secure contexts) can, so a plain-HTTP address shows no Listen button.
 */
export function dictationSupported(w: unknown = typeof window === 'undefined' ? undefined : window): boolean {
  if (!w) return false;
  if ((w as { isSecureContext?: boolean }).isSecureContext === false) return false;
  return recognitionCtor(w) !== null;
}

const noSubscribe = () => () => undefined;
/** dictationSupported as React state: false in the server HTML (so hydration matches), then the browser's answer. */
export function useDictationSupported(): boolean {
  return useSyncExternalStore(noSubscribe, () => dictationSupported(), () => false);
}

/** English, in the person's own variety when the browser says it is English. */
export function dictationLang(navLang: string | undefined = typeof navigator === 'undefined' ? undefined : navigator.language): string {
  return navLang && /^en(-|$)/i.test(navLang) ? navLang : 'en-US';
}

export type DictationProblem = 'blocked' | 'no-mic' | 'no-speech' | 'offline' | 'unavailable' | 'failed';

/** The browser's error code as a problem to show; null for a stop the person asked for. */
export function dictationProblem(code: string): DictationProblem | null {
  switch (code) {
    case 'aborted':
      return null;
    case 'not-allowed':
      return 'blocked';
    case 'audio-capture':
      return 'no-mic';
    case 'no-speech':
      return 'no-speech';
    case 'network':
      return 'offline';
    case 'service-not-allowed':
    case 'language-not-supported':
      return 'unavailable';
    default:
      return 'failed';
  }
}

export const DICTATION_MESSAGES: Record<DictationProblem, string> = {
  blocked: 'The microphone is blocked. Allow it for this site in the browser settings, or type instead.',
  'no-mic': 'No microphone was found. Type instead.',
  'no-speech': 'Nothing was heard. Press Listen and ask them to speak again.',
  offline: 'Voice to text needs a connection here. Type instead.',
  unavailable: 'Voice to text is not available in this browser. Try the microphone on your keyboard, or type.',
  failed: 'Voice to text stopped. Press Listen to try again, or type.',
};

/** Join what was there before Listen with what was heard. */
export function joinHeard(before: string, heard: string, max: number): string {
  const b = before.trim();
  const h = heard.replace(/\s+/g, ' ').trim();
  return (b && h ? `${b} ${h}` : b || h).slice(0, max);
}

/** Everything heard so far in this phrase (final and interim parts, in order). */
export function transcriptOf(e: RecognitionEvent): string {
  let t = '';
  for (let i = 0; i < e.results.length; i++) t += e.results[i]?.[0]?.transcript ?? '';
  return t;
}

export interface DictationSession {
  stop(): void;
  abort(): void;
}

/**
 * Start listening for one phrase. onText gets everything heard so far (it grows while they speak);
 * onEnd runs once, with a problem or null.
 */
export function startDictation(opts: {
  lang: string;
  onText: (text: string) => void;
  onEnd: (problem: DictationProblem | null) => void;
  ctor?: RecognitionCtor | null;
}): DictationSession | null {
  const Ctor = opts.ctor === undefined ? recognitionCtor() : opts.ctor;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = opts.lang;
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let problem: DictationProblem | null = null;
  let ended = false;
  let cancelled = false;
  let started = false;
  const finish = (p: DictationProblem | null) => {
    if (ended) return;
    ended = true;
    opts.onEnd(p);
  };
  rec.onresult = (e) => opts.onText(transcriptOf(e));
  rec.onerror = (e) => {
    problem = dictationProblem(e.error);
  };
  rec.onend = () => finish(problem);
  const begin = () => {
    if (cancelled) return;
    try {
      rec.start();
      started = true;
    } catch {
      finish('failed');
    }
  };
  // Keep it on the device when the browser can (Chrome with the language pack already there).
  // Safari has no available(): start at once, inside the tap.
  if (typeof Ctor.available === 'function') {
    Ctor.available({ langs: [opts.lang], processLocally: true })
      .then((a) => {
        if (a === 'available') rec.processLocally = true;
      })
      .catch(() => undefined)
      .finally(begin);
  } else {
    begin();
  }
  return {
    // Stop listening; what was heard so far stays (the browser sends a last result, then ends).
    stop: () => {
      cancelled = true;
      if (!started) return finish(null);
      try {
        rec.stop();
      } catch {
        finish(null);
      }
    },
    // Throw away the rest (Cancel, closing the sheet).
    abort: () => {
      cancelled = true;
      rec.onresult = null;
      if (!started) return finish(null);
      try {
        rec.abort();
      } catch {
        finish(null);
      }
    },
  };
}
