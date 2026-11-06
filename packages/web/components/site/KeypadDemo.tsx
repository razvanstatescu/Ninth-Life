'use client';
/**
 * The live keypad demo in the website hero. It replays a fixed example ("i need water") one key
 * press at a time; every sentence it shows was produced by the offline decoder at build time
 * (site-data.ts). The keys are a picture of the keypad (aria-hidden), not controls: the real
 * keypad is one tap away in the app. Motion: the pressed key and the text change in jumps, never
 * slides; nothing starts on its own (WCAG 2.2.2) and Stop is always there while it plays.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { KEY_ROWS } from '@/lib/keys';
import { Icon } from '@/components/Icon';
import { ProofChip } from '@/components/ProofChip';
import type { DemoData } from './site-data';

const STEP_MS = 520;

function sentenceCase(words: (string | null)[]): string {
  const text = words.filter((w): w is string => !!w).join(' ');
  return text.replace(/\bi\b/g, 'I').replace(/^./, (c) => c.toUpperCase());
}

export function KeypadDemo({ data }: { data: DemoData }) {
  const last = data.steps.length - 1;
  // The finished example shows first, so the hero reads well without pressing anything.
  const [step, setStep] = useState(last);
  const [playing, setPlaying] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [canSpeak, setCanSpeak] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window), []);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(() => {
    stop();
    setAnnounce('');
    setStep(0);
    setPlaying(true);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      if (i >= last) {
        setStep(last);
        stop();
        setAnnounce(`Typed ${data.steps[last]!.codes.join(' ')}. Ninth Life shows: ${sentenceCase(data.steps[last]!.words)}.`);
        return;
      }
      setStep(i);
    }, STEP_MS);
  }, [stop, last, data.steps]);

  const s = data.steps[Math.min(step, last)]!;
  const done = step >= last && !playing;
  const sentence = sentenceCase(s.words);
  const hear = () => {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${sentenceCase(data.steps[last]!.words)}.`));
    } catch {
      /* no voice: the sentence is on screen */
    }
  };

  return (
    <div className="site-demo">
      <div className="site-demo__bar">
        <div className="site-demo__said">
          <p className="site-demo__text">
            {sentence || ' '}
          </p>
          <p className="site-demo__keys">
            <span className="nl-sr-only">Keys: </span>
            {s.codes.join(' ')}
          </p>
        </div>
        {canSpeak ? (
          <button type="button" className="nl-btn nl-btn--quiet" onClick={hear} disabled={!done}>
            <Icon name="speaker" />
            Hear it
          </button>
        ) : null}
      </div>

      <div className="nl-keypad site-demo__pad" aria-hidden="true">
        {KEY_ROWS.map((row, r) => (
          <div key={r} className="nl-keypad__row">
            {row.map((def) => (
              <div key={def.id} className={playing && s.key === def.id ? 'nl-key site-demo__key is-pressed' : 'nl-key site-demo__key'}>
                <span className="nl-key__digit">{def.digit}</span>
                {def.letters ? (
                  <span className={def.letters.length > 3 ? 'nl-key__letters nl-key__letters--4' : 'nl-key__letters'}>{def.letters}</span>
                ) : (
                  <span className="nl-key__word">{def.word}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="site-demo__foot">
        <button type="button" className="nl-btn nl-btn--secondary" onClick={playing ? stop : play}>
          {playing ? 'Stop' : done ? 'Play the example again' : 'Play the example'}
        </button>
        <ul className="site-demo__chips" aria-label="Proof check">
          {s.codes.map((code, i) => {
            const word = s.words[i];
            // A word is checked once its code is finished; the last one is finished only at the end.
            const finished = done || i < s.codes.length - 1;
            return (
              <li key={i}>
                <ProofChip state={finished && word ? 'match' : 'typing'} word={word ?? code} code={code} />
              </li>
            );
          })}
        </ul>
      </div>
      <p className="nl-sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
