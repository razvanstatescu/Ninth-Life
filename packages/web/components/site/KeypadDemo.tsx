'use client';
/**
 * The live keypad demo in the website hero (marketing-site design.md "KeypadDemo changes", MS-6).
 * It replays a fixed example ("i need water") one key press at a time; every sentence it shows was
 * produced by the offline decoder at build time (site-data.ts). The keys are a picture of the keypad
 * (aria-hidden), not controls: the real keypad is one tap away in the app.
 *
 * Motion: the pressed key and the text change in jumps, never slides. With motion on, the demo plays
 * once on its own after it has been 60% in view for motion-autoplay-delay, and never again during the
 * page view. Stop is there while it plays (WCAG 2.2.2), and the demo also stops, on the finished
 * frame, when it leaves the screen, the page is hidden or reduced motion is turned on. Hidden copies
 * of the finished frame and of every button label keep its box the same size, and each chip has a
 * fixed slot, so nothing in it moves while it plays (MS-6.10).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { ProofChip } from '@/components/ProofChip';
import { pickVoice, speak, speechSupported } from '@/lib/speech';
import { HERO_KEY_SIZE, KeypadPicture } from './KeypadPicture';
import { MOTION_QUERY, autoplayDecision, readMotionMs } from './motion';
import type { DemoData, DemoStep } from './site-data';

/** motion-demo-step and motion-autoplay-delay, used when the tokens do not parse. */
export const DEMO_STEP_FALLBACK_MS = 520;
export const AUTOPLAY_DELAY_FALLBACK_MS = 1200;

const LABEL_FIRST = 'Play the example';
const LABEL_AGAIN = 'Play the example again';
const LABEL_STOP = 'Stop';

function sentenceCase(words: (string | null)[]): string {
  const text = words.filter((w): w is string => !!w).join(' ');
  return text.replace(/\bi\b/g, 'I').replace(/^./, (c) => c.toUpperCase());
}

/**
 * One fixed slot per word of the finished example: a hidden copy of the finished chip sizes the slot,
 * and the live chip sits on top of it, so a chip that grows while the demo plays never moves the
 * others (MS-6.10). A slot whose word is not typed yet is hidden from screen readers.
 */
function Chips({ step, final, finished }: { step: DemoStep; final: DemoStep; finished: boolean }) {
  return final.codes.map((finalCode, i) => {
    const code = step.codes[i];
    const word = step.words[i];
    // A word is checked once its code is finished; the last one is finished only at the end.
    const done = finished || i < step.codes.length - 1;
    return (
      <li key={i} className="site-sizer site-demo__slot" aria-hidden={code === undefined ? true : undefined}>
        <span className="site-demo__chip-ghost site-sizer__ghost" aria-hidden="true">
          <ProofChip state="match" word={final.words[i] ?? finalCode} code={finalCode} />
        </span>
        {code !== undefined ? <ProofChip state={done && word ? 'match' : 'typing'} word={word ?? code} code={code} /> : null}
      </li>
    );
  });
}

export function KeypadDemo({ data }: { data: DemoData }) {
  const last = data.steps.length - 1;
  const final = data.steps[last]!;
  const finalSentence = sentenceCase(final.words);
  // The finished example shows first, so the hero reads well without pressing anything (MS-6.2).
  const [step, setStep] = useState(last);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [canSpeak, setCanSpeak] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedBy = useRef<'auto' | 'person' | null>(null);
  const autoplayed = useRef(false);
  const acted = useRef(false);
  const ratio = useRef(0);

  // Read after mount, so the server HTML and hydration agree (MS-6.7).
  useEffect(() => setCanSpeak(speechSupported()), []);

  const clearAutoplay = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = null;
  }, []);

  /** Ends a play on the finished frame; announces only a person's play that ran to the end (MS-6.6). */
  const end = useCallback(
    (ranToEnd: boolean) => {
      if (interval.current) clearInterval(interval.current);
      interval.current = null;
      const by = startedBy.current;
      startedBy.current = null;
      setStep(last);
      setPlaying(false);
      setPlayed(true);
      if (ranToEnd && by === 'person') {
        setAnnounce(`Typed ${final.codes.join(' ')}. Ninth Life shows: ${finalSentence}.`);
      }
    },
    [last, final, finalSentence],
  );

  const stop = useCallback(() => {
    if (interval.current) end(false);
  }, [end]);

  const play = useCallback(
    (by: 'auto' | 'person') => {
      if (interval.current) clearInterval(interval.current);
      clearAutoplay();
      startedBy.current = by;
      setAnnounce('');
      setStep(0);
      setPlaying(true);
      let i = 0;
      interval.current = setInterval(() => {
        i += 1;
        if (i >= last) {
          end(true);
          return;
        }
        setStep(i);
      }, readMotionMs('--motion-demo-step', DEMO_STEP_FALLBACK_MS));
    },
    [last, end, clearAutoplay],
  );

  // The mount effect below reads the latest callbacks through refs, so it runs once.
  const playRef = useRef(play);
  const stopRef = useRef(stop);
  playRef.current = play;
  stopRef.current = stop;

  useEffect(() => {
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(MOTION_QUERY) : null;
    const reduced = () => !mq || !mq.matches;
    const root = rootRef.current;
    let observer: IntersectionObserver | null = null;

    if (root && typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            ratio.current = e.intersectionRatio;
            // (a) Out of view: any play stops, on the finished frame (MS-6.4, MS-6.8).
            if (e.intersectionRatio < 0.1) stopRef.current();
            // (b) The autoplay timer runs while the demo is at least 60% in view (MS-6.3).
            if (e.intersectionRatio < 0.6) {
              if (autoTimer.current) clearTimeout(autoTimer.current);
              autoTimer.current = null;
            } else if (!autoplayed.current && !acted.current && !autoTimer.current) {
              autoTimer.current = setTimeout(() => {
                autoTimer.current = null;
                const go = autoplayDecision({
                  reduced: reduced(),
                  hasObserver: true,
                  autoplayed: autoplayed.current,
                  acted: acted.current,
                  hidden: document.visibilityState === 'hidden',
                  ratio: ratio.current,
                });
                if (go) {
                  autoplayed.current = true;
                  playRef.current('auto');
                }
              }, readMotionMs('--motion-autoplay-delay', AUTOPLAY_DELAY_FALLBACK_MS));
            }
          }
        },
        { threshold: [0, 0.1, 0.6] },
      );
      observer.observe(root);
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stopRef.current();
    };
    const onMotion = () => {
      if (reduced()) stopRef.current();
    };
    document.addEventListener('visibilitychange', onVisibility);
    mq?.addEventListener?.('change', onMotion);

    return () => {
      observer?.disconnect();
      if (autoTimer.current) clearTimeout(autoTimer.current);
      autoTimer.current = null;
      if (interval.current) clearInterval(interval.current);
      interval.current = null;
      document.removeEventListener('visibilitychange', onVisibility);
      mq?.removeEventListener?.('change', onMotion);
    };
  }, []);

  const press = () => {
    acted.current = true;
    clearAutoplay();
    if (playing) stop();
    else play('person');
  };

  // Synchronous in the click handler (the iOS user-gesture rule); no voice name is ever shown.
  // While the demo plays the button is aria-disabled and ignores presses, so it stays in the Tab order (MS-6.7).
  const hear = () => {
    if (playing) return;
    let voices: SpeechSynthesisVoice[] = [];
    try {
      voices = window.speechSynthesis.getVoices();
    } catch {
      /* no voice list: speak with the browser's default */
    }
    speak(`${finalSentence}.`, { lang: 'en', voice: pickVoice(voices, undefined, 'en') });
  };

  const s = data.steps[Math.min(step, last)]!;
  const finished = step >= last && !playing;
  const label = playing ? LABEL_STOP : played ? LABEL_AGAIN : LABEL_FIRST;

  return (
    <div ref={rootRef} className={playing ? 'site-demo is-playing' : 'site-demo'}>
      <div className="site-demo__bar">
        <div className="site-demo__said">
          <div className="site-sizer">
            <p className="site-demo__text">{sentenceCase(s.words) || ' '}</p>
            <p className="site-demo__text site-sizer__ghost" aria-hidden="true">
              {finalSentence}
            </p>
          </div>
          <div className="site-sizer">
            <p className="site-demo__keys">
              <span className="nl-sr-only">Keys: </span>
              {s.codes.join(' ')}
            </p>
            <p className="site-demo__keys site-sizer__ghost" aria-hidden="true">
              {final.codes.join(' ')}
            </p>
          </div>
        </div>
        {canSpeak ? (
          <button type="button" className="nl-btn nl-btn--quiet" onClick={hear} aria-disabled={playing || undefined}>
            <Icon name="speaker" />
            Hear it
          </button>
        ) : null}
      </div>

      <p className="nl-sr-only">Example: the keys 4, 0, 6 3 3 3, 0, 9 2 8 3 7 type &quot;i need water&quot;. 0 is space.</p>
      {/* Key 9 keeps its resting ring for the life of the component, so the arrival fade never replays. */}
      <KeypadPicture size={HERO_KEY_SIZE} pressed={playing ? s.key : undefined} ninth />

      <div className="site-demo__foot">
        <button type="button" className="nl-btn nl-btn--secondary" onClick={press}>
          <span className="site-sizer">
            <span className="site-sizer__ghost" aria-hidden="true">
              {LABEL_FIRST}
            </span>
            <span className="site-sizer__ghost" aria-hidden="true">
              {LABEL_AGAIN}
            </span>
            <span className="site-sizer__ghost" aria-hidden="true">
              {LABEL_STOP}
            </span>
            <span className="site-demo__label">{label}</span>
          </span>
        </button>
        <ul className="site-demo__chips" aria-label="Proof check">
          <Chips step={s} final={final} finished={finished} />
        </ul>
      </div>
      <p className="nl-sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
