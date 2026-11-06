'use client';
import { useEffect, useState } from 'react';
import { loadVoices, sortVoices, speechSupported, VOICES_RETRIES, VOICES_RETRY_MS } from './speech';

export interface VoicesState {
  /** False until the browser has had a chance to list voices. */
  loaded: boolean;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
}

/**
 * The browser's voices, on-device first. Updates when the list changes (voices load late).
 * - An early `voiceschanged` with an empty list does not count as "no voices" (Req 18.6): the app
 *   waits for loadVoices() so it does not open show mode while voices are still loading.
 * - When the wait ends with no voices, the list is checked again a few times, because some engines
 *   fill it without firing `voiceschanged` (Req 18.7).
 */
export function useVoices(lang = 'en'): VoicesState {
  const [state, setState] = useState<VoicesState>({ loaded: false, supported: true, voices: [] });
  useEffect(() => {
    if (!speechSupported()) {
      setState({ loaded: true, supported: false, voices: [] });
      return;
    }
    const synth = window.speechSynthesis;
    let alive = true;
    let settled = false;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const set = (v: SpeechSynthesisVoice[]) => {
      if (alive) setState({ loaded: true, supported: true, voices: sortVoices(v, lang) });
    };
    const poll = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        const v = synth.getVoices();
        if (v.length > 0) set(v);
        else if (++retries < VOICES_RETRIES) poll();
      }, VOICES_RETRY_MS);
    };
    const onChange = () => {
      const v = synth.getVoices();
      if (v.length > 0 || settled) set(v);
    };
    synth.addEventListener?.('voiceschanged', onChange);
    loadVoices().then((v) => {
      if (!alive) return;
      settled = true;
      set(v);
      if (v.length === 0) poll();
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      synth.removeEventListener?.('voiceschanged', onChange);
    };
  }, [lang]);
  return state;
}
