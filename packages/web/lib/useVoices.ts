'use client';
import { useEffect, useState } from 'react';
import { loadVoices, sortVoices, speechSupported } from './speech';

export interface VoicesState {
  /** False until the browser has had a chance to list voices. */
  loaded: boolean;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
}

/** The browser's voices, on-device first. Updates when the list changes (voices load late). */
export function useVoices(lang = 'en'): VoicesState {
  const [state, setState] = useState<VoicesState>({ loaded: false, supported: true, voices: [] });
  useEffect(() => {
    if (!speechSupported()) {
      setState({ loaded: true, supported: false, voices: [] });
      return;
    }
    let alive = true;
    const set = (v: SpeechSynthesisVoice[]) => alive && setState({ loaded: true, supported: true, voices: sortVoices(v, lang) });
    loadVoices().then(set);
    const onChange = () => set(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener?.('voiceschanged', onChange);
    return () => {
      alive = false;
      window.speechSynthesis.removeEventListener?.('voiceschanged', onChange);
    };
  }, [lang]);
  return state;
}
