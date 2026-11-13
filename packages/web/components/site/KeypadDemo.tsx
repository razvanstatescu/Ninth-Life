'use client';
/**
 * The live keypad demo in the website hero (marketing-site design.md "Round 4: the hero demo", MS-6).
 *
 * Round 4 (2026-11-13, Claude Code): a small app screen with no caption. Top to bottom: the sentence card, which shows
 * the sentence as proof chips, each word over its keys; one reserved status line; the keypad (the app's keys, 64px tall);
 * a row of three icon buttons (.site-icon-btn): Play the example (Stop while it plays), Hear it and Clear, each with its
 * name as a tooltip (.site-tip) on hover and keyboard focus. Escape hides a tooltip (WCAG 1.4.13).
 *
 * Example. It replays a fixed example ("i need water") one key press at a time; every sentence it shows
 * was produced by the offline decoder at build time (site-data.ts). The finished example shows first, in
 * the server HTML, before any press.
 *
 * Motion: the pressed key and the chips change in jumps, never slides. With motion on, the example plays
 * once on its own after it has been 60% in view, with its toolbar (and so its Stop) wholly on screen, for
 * motion-autoplay-delay, and never again during the page view. Stop is there while it plays (WCAG 2.2.2), and
 * the demo also stops, on the finished frame, when it leaves the screen, the page is hidden or reduced motion is
 * turned on; an automatic play also stops when its Stop leaves the screen. Each chip has a fixed slot and every
 * part keeps one size, so nothing in the demo moves while it plays or while the visitor types (MS-6.10).
 *
 * Try it (W4, 2026-11-12, Claude Code; MS-6.11 to MS-6.16). The keys are real buttons: a press (touch,
 * mouse, Enter or Space on a key, or a digit, *, # or Backspace typed while focus is anywhere in the demo) stops the
 * example and its autoplay for good and types the visitor's own keys. After a pointer press in the demo, keys typed while
 * nothing has focus count too (Safari does not focus a clicked button). The first press loads try-engine.ts with a dynamic import,
 * and that loads the app's dictionary from /data, so nothing of either is part of the page's first load. The words
 * shown are the app's own offline decoder's: only words that match the keys. One Tab stop for the keypad (roving
 * tabindex; the arrow keys move between keys). Clear empties the keys; the * key is Back. "Play the example" goes
 * back to the example and plays it.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Icon } from '@/components/Icon';
import { ProofChip } from '@/components/ProofChip';
import { mapKey } from '@/lib/keyboard';
import { KEY_ROWS, type KeyId } from '@/lib/keys';
import { pickVoice, speak, speechSupported } from '@/lib/speech';
import { SiteIcon, replay } from './icons';
import { KEY_DRAWING_SIZE, KeyFace } from './KeypadPicture';
import { MOTION_QUERY, autoplayDecision, readMotionMs } from './motion';
import type { DemoData, DemoStep } from './site-data';
import type { ComposerState, DictState, TryView } from './try-engine';

/** motion-demo-step and motion-autoplay-delay, used when the tokens do not parse. */
export const DEMO_STEP_FALLBACK_MS = 520;
export const AUTOPLAY_DELAY_FALLBACK_MS = 1200;
/** How long a pressed try key shows its ring, so a key typed on the keyboard is seen to land. */
export const TRY_FLASH_MS = 160;
/** The live region waits this long after the last press, so fast typing is read once, not per key. */
export const TRY_ANNOUNCE_MS = 400;
/** Try it shows a chip for the last this-many words only, in one reserved row (R3-P1). */
export const TRY_CHIPS = 3;
/** The share of the toolbar that must be on screen for it to count as wholly in view (MS-6.3, round 4). */
export const TOOLS_IN_VIEW = 0.99;
/** The hero keys are the drawings' 64px tall keys (a real control; their width comes from the keypad row). */
export const HERO_KEY = KEY_DRAWING_SIZE;

/** The Play button's names (MS-6.4; round 4: one name before and after a play). */
export const LABEL_PLAY = 'Play the example';
export const LABEL_STOP = 'Stop';

/** Try-it copy (content.md §1). */
export const TRY_COPY = {
  start: 'Press a key to start.',
  loading: 'Loading the offline dictionary.',
  failed: 'The dictionary did not load, so only the keys show. The app has the whole keypad.',
  none: 'No sentence matches these keys yet. Keep typing, or press Back.',
  // Round 3 (R3-P8): a press that types no letter yet still answers on the line.
  punct: 'Key 1 adds punctuation at the end of the sentence. Now type a word with keys 2 to 9.',
  letters: 'Keys 2 to 9 type the letters. Start with those.',
  // After # (R3-P4): the marker on the sentence on show, when it is not the first match.
  shown: 'shown',
  // Round 4: the status line under the card (one line) and the card's keyboard line.
  invite: 'Press the keys to try it.',
  next: 'Next:',
  failedShort: 'The dictionary did not load.',
  noneShort: 'No sentence matches yet.',
  keyboard: 'Your keyboard works too.',
} as const;

type EngineModule = typeof import('./try-engine');

function sentenceCase(words: (string | null)[]): string {
  const text = words.filter((w): w is string => !!w).join(' ');
  return text.replace(/\bi\b/g, 'I').replace(/^./, (c) => c.toUpperCase());
}

/**
 * The try-it result line: what the decoder matched, in plain words (announced in the live region). Round 3 (R3-P4):
 * every match for the keys is listed, also after #, with the sentence on show marked when it is not the first; the
 * line does not add a full stop after a match that already ends in punctuation ("I." is not followed by another ".").
 * `lastKey` is the visitor's last press, so a 1, 0 or # before any letter still gets an answer (R3-P8).
 */
export function tryLine(v: TryView | null, dict: DictState | null, pending: boolean, lastKey: KeyId | null = null): string {
  if (dict && (dict.status === 'missing' || dict.status === 'error')) return TRY_COPY.failed;
  if (!v || v.codes.length === 0) {
    if (pending) return TRY_COPY.loading;
    return tryHint(lastKey);
  }
  if (!dict || dict.status === 'loading') return TRY_COPY.loading;
  if (v.matches.length === 0) return TRY_COPY.none;
  const marked = v.shownIndex > 0;
  const list = v.matches.map((m, i) => (marked && i === v.shownIndex ? `“${m}” (${TRY_COPY.shown})` : `“${m}”`)).join(', ');
  const end = /[.?!,]”$/.test(list) ? '' : '.';
  return `Keys ${v.codes.join(' ')} match: ${list}${end}`;
}

/** What the card says while no word is typed (round 4: the R3-P8 answers moved from the caption into the card). */
export function tryHint(lastKey: KeyId | null): string {
  if (lastKey === '1') return TRY_COPY.punct;
  if (lastKey === '0' || lastKey === '#') return TRY_COPY.letters;
  return TRY_COPY.start;
}

/**
 * The status line under the card while trying (round 4): the decoder's state in a few words, or the readings # gives
 * next for the last word (an array, shown as "Next: Home, Gone"), or nothing.
 */
export function tryStatus(v: TryView | null, dict: DictState | null, pending: boolean): string | string[] {
  if (dict && (dict.status === 'missing' || dict.status === 'error')) return TRY_COPY.failedShort;
  if (!v || v.codes.length === 0) return pending ? TRY_COPY.loading : '';
  if (!dict || dict.status === 'loading') return TRY_COPY.loading;
  if (v.matches.length === 0) return TRY_COPY.noneShort;
  return v.next;
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
    // The chip writes the word as the sentence does ("I"), as the app's proof panel does (R3-P8).
    // A word is checked once its code is finished; the last one is finished only at the end.
    const done = finished || i < step.codes.length - 1;
    return (
      <li key={i} className="site-sizer site-demo__slot" aria-hidden={code === undefined ? true : undefined}>
        <span className="site-demo__chip-ghost site-sizer__ghost" aria-hidden="true">
          <ProofChip state="match" word={final.labels[i] ?? finalCode} code={finalCode} />
        </span>
        {code !== undefined ? <ProofChip state={done && word ? 'match' : 'typing'} word={step.labels[i] ?? word ?? code} code={code} /> : null}
      </li>
    );
  });
}

/** The keys as one grid of positions, for the arrow keys. */
const GRID: readonly (readonly KeyId[])[] = KEY_ROWS.map((row) => row.map((d) => d.id));
function moveFrom(id: KeyId, dr: number, dc: number): KeyId {
  const r = GRID.findIndex((row) => row.includes(id));
  const c = GRID[r]!.indexOf(id);
  const nr = Math.min(GRID.length - 1, Math.max(0, r + dr));
  const nc = Math.min(GRID[nr]!.length - 1, Math.max(0, c + dc));
  return GRID[nr]![nc]!;
}
const ARROWS: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

export function KeypadDemo({ data }: { data: DemoData }) {
  const last = data.steps.length - 1;
  const final = data.steps[last]!;
  const finalSentence = sentenceCase(final.words);
  // The finished example shows first, so the hero reads well without pressing anything (MS-6.2).
  const [step, setStep] = useState(last);
  const [playing, setPlaying] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [canSpeak, setCanSpeak] = useState(false);
  // The invitation line shows only once the keys work (after hydration), so a page without JavaScript promises nothing.
  const [live, setLive] = useState(false);
  const [tipsOff, setTipsOff] = useState(false);
  // Try it (W4).
  const [mode, setMode] = useState<'example' | 'try'>('example');
  const [engine, setEngine] = useState<EngineModule | null>(null);
  const [typed, setTyped] = useState<ComposerState | null>(null);
  const [pendingKeys, setPendingKeys] = useState<KeyId[]>([]);
  const [dict, setDict] = useState<DictState | null>(null);
  const [focusKey, setFocusKey] = useState<KeyId>('1');
  const [flash, setFlash] = useState<KeyId | null>(null);
  const [lastKey, setLastKey] = useState<KeyId | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const keyRefs = useRef(new Map<KeyId, HTMLButtonElement>());
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedBy = useRef<'auto' | 'person' | null>(null);
  const autoplayed = useRef(false);
  const acted = useRef(false);
  const ratio = useRef(0);
  const toolsIn = useRef(false);
  const loading = useRef(false);
  const engineRef = useRef<EngineModule | null>(null);
  const dictRef = useRef<DictState | null>(null);
  const pendingRef = useRef<KeyId[]>([]);
  const alive = useRef(true);
  /** True after a pointer press inside the demo, until a pointer press anywhere else (MS-6.16). */
  const engaged = useRef(false);

  // Read after mount, so the server HTML and hydration agree (MS-6.7).
  useEffect(() => {
    setCanSpeak(speechSupported());
    setLive(true);
  }, []);

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
      if (announceTimer.current) clearTimeout(announceTimer.current);
      startedBy.current = by;
      // Back to the example: the visitor's keys are cleared (W4).
      setMode('example');
      setTyped(null);
      setLastKey(null);
      pendingRef.current = [];
      setPendingKeys([]);
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
    alive.current = true;
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(MOTION_QUERY) : null;
    const reduced = () => !mq || !mq.matches;
    const root = rootRef.current;
    const tools = toolsRef.current;
    const observers: IntersectionObserver[] = [];

    // The autoplay timer runs while the demo is at least 60% in view and its toolbar, with its Stop, is wholly on
    // screen (MS-6.3, round 4); it is cleared as soon as either stops being true.
    const arm = () => {
      if (ratio.current < 0.6 || !toolsIn.current) {
        if (autoTimer.current) clearTimeout(autoTimer.current);
        autoTimer.current = null;
        return;
      }
      if (autoplayed.current || acted.current || autoTimer.current) return;
      autoTimer.current = setTimeout(() => {
        autoTimer.current = null;
        const go =
          toolsIn.current &&
          autoplayDecision({
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
    };

    if (root && tools && typeof IntersectionObserver === 'function') {
      const demo = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            ratio.current = e.intersectionRatio;
            // Out of view: any play stops, on the finished frame (MS-6.4, MS-6.8).
            if (e.intersectionRatio < 0.1) stopRef.current();
          }
          arm();
        },
        { threshold: [0, 0.1, 0.6] },
      );
      const bar = new IntersectionObserver(
        (entries) => {
          for (const e of entries) toolsIn.current = e.intersectionRatio >= TOOLS_IN_VIEW;
          // An automatic play stops, on the finished frame, when its Stop leaves the screen (MS-6.3).
          if (!toolsIn.current && startedBy.current === 'auto') stopRef.current();
          arm();
        },
        { threshold: [0, TOOLS_IN_VIEW] },
      );
      demo.observe(root);
      bar.observe(tools);
      observers.push(demo, bar);
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
      alive.current = false;
      for (const o of observers) o.disconnect();
      if (autoTimer.current) clearTimeout(autoTimer.current);
      autoTimer.current = null;
      if (interval.current) clearInterval(interval.current);
      interval.current = null;
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (announceTimer.current) clearTimeout(announceTimer.current);
      document.removeEventListener('visibilitychange', onVisibility);
      mq?.removeEventListener?.('change', onMotion);
    };
  }, []);

  // ---- try it (W4) ------------------------------------------------------------------------------
  /** Loads the engine (one dynamic import), then the dictionary (the app's own loader). Once only. */
  const loadEngine = useCallback(() => {
    if (loading.current) return;
    loading.current = true;
    import('./try-engine')
      .then((eng) => {
        if (!alive.current) return;
        engineRef.current = eng;
        // Keys pressed before the engine arrived are typed now, in order, before any later press (whose update
        // React queues after this one).
        const queued = pendingRef.current;
        pendingRef.current = [];
        setPendingKeys([]);
        setTyped((cur) => queued.reduce((st, k) => eng.press(st, k, dictRef.current), cur ?? eng.EMPTY));
        setEngine(() => eng);
        eng.loadDictionary().then(
          (d) => {
            dictRef.current = d;
            if (alive.current) setDict(d);
          },
          (e: unknown) => {
            const d: DictState = { status: 'error', message: e instanceof Error ? e.message : String(e) };
            dictRef.current = d;
            if (alive.current) setDict(d);
          },
        );
      })
      .catch((e: unknown) => {
        if (alive.current) setDict({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      });
  }, []);

  /** Leaves the example for good: no autoplay, a running play stops on its finished frame (no announcement). */
  const enterTry = useCallback(() => {
    acted.current = true;
    clearAutoplay();
    if (interval.current) end(false);
    setMode('try');
    loadEngine();
  }, [clearAutoplay, end, loadEngine]);

  const pressKey = useCallback(
    (id: KeyId) => {
      enterTry();
      if (flashTimer.current) clearTimeout(flashTimer.current);
      setFlash(id);
      setLastKey(id);
      flashTimer.current = setTimeout(() => setFlash(null), TRY_FLASH_MS);
      const eng = engineRef.current;
      if (eng) setTyped((cur) => eng.press(cur ?? eng.EMPTY, id, dictRef.current));
      else {
        pendingRef.current = [...pendingRef.current, id];
        setPendingKeys(pendingRef.current);
      }
    },
    [enterTry],
  );

  const view = useMemo<TryView | null>(() => (engine && typed ? engine.view(typed, dict) : null), [engine, typed, dict]);
  const trying = mode === 'try';
  const pending = pendingKeys.length > 0 || (engine === null && trying);
  const line = tryLine(view, dict, pending, lastKey);
  // Clear has nothing to do once the visitor's keys are empty (it is marked unavailable, as in the app).
  const clearOff = trying && !pending && (!view || view.codes.length === 0) && lastKey === null;

  const clearKeys = () => {
    if (clearOff) return;
    enterTry();
    pendingRef.current = [];
    setPendingKeys([]);
    setLastKey(null);
    const eng = engineRef.current;
    setTyped(eng ? eng.clear() : null);
  };

  // Keys typed anywhere in the demo (a key or a toolbar button) press the keypad's keys: digits, * and #, and Backspace
  // as Back. The arrow keys move between keys only inside the keypad; Enter and Space stay the focused control's own
  // (a click). Escape hides a tooltip (MS-6.15, MS-6.16).
  const onDemoKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setTipsOff(true);
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const arrow = ARROWS[e.key];
    if (arrow) {
      if (!(e.target as Element).closest?.('[data-try-key]')) return;
      e.preventDefault();
      const next = moveFrom(focusKey, arrow[0], arrow[1]);
      setFocusKey(next);
      keyRefs.current.get(next)?.focus();
      return;
    }
    const intent = mapKey(e, 'keyboard', 'control');
    if (intent?.type !== 'key') return;
    e.preventDefault();
    if (!e.repeat) pressKey(intent.key);
  };

  // Safari does not focus a button on click, so after a pointer press in the demo nothing may have focus. Keys typed
  // then, while nothing else has focus and the demo is on screen, still press the keys; a pointer press anywhere else
  // ends that. Focus is never moved by script (a mouse click shows no focus ring) and nothing is taken from another
  // control (MS-6.16).
  const pressKeyRef = useRef(pressKey);
  pressKeyRef.current = pressKey;
  useEffect(() => {
    const onDown = (e: globalThis.PointerEvent) => {
      engaged.current = !!rootRef.current?.contains(e.target as Node);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      const a = document.activeElement;
      if (!engaged.current || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (a && a !== document.body && a !== document.documentElement) return;
      const box = rootRef.current?.getBoundingClientRect();
      if (!box || box.bottom < 0 || box.top > window.innerHeight) return;
      const intent = mapKey(e, 'keyboard', 'control');
      if (intent?.type !== 'key') return;
      e.preventDefault();
      if (!e.repeat) pressKeyRef.current(intent.key);
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Try it: a line that runs past its box shows its end with a short fade on the left (R3-P1). After every render;
  // nothing here changes a size.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    for (const el of root.querySelectorAll<HTMLElement>('[data-end]')) el.toggleAttribute('data-clipped', el.scrollWidth > el.clientWidth + 1);
  });

  // The live region reads the result once typing pauses (polite, MS-6.13).
  useEffect(() => {
    if (!trying) return;
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnounce(line), TRY_ANNOUNCE_MS);
  }, [trying, line]);

  // Synchronous in the click handler (the iOS user-gesture rule); no voice name is ever shown.
  // While the demo plays, or the visitor's keys are not a whole sentence yet, the button is aria-disabled and
  // ignores presses, so it stays in the Tab order (MS-6.7).
  const hearOff = playing || (trying && !view?.speakable);
  const hear = () => {
    if (hearOff) return;
    let voices: SpeechSynthesisVoice[] = [];
    try {
      voices = window.speechSynthesis.getVoices();
    } catch {
      /* no voice list: speak with the browser's default */
    }
    const text = trying ? (view?.text ?? '') : `${finalSentence}.`;
    if (text) speak(text, { lang: 'en', voice: pickVoice(voices, undefined, 'en') });
  };

  const press = () => {
    acted.current = true;
    clearAutoplay();
    if (playing) stop();
    else play('person');
  };

  const s = data.steps[Math.min(step, last)]!;
  const finished = step >= last && !playing;
  const label = playing ? LABEL_STOP : LABEL_PLAY;
  const pressed = playing ? s.key : flash;
  // Read digit by digit ("4, 0, 6 3 3 3, 0, 9 2 8 3 7"), not as numbers.
  const spokenPresses = final.codes.map((c) => c.split('').join(' ')).join(', 0, ');
  const words = trying ? (view?.words ?? []) : [];
  // Try it: only the last TRY_CHIPS words get a chip, in one line that shows its end (R3-P1).
  const tryChips = words.map((w, i) => ({ w, i })).slice(-TRY_CHIPS);
  const hint = trying && words.length === 0 && !pending ? tryHint(lastKey) : null;
  const status = trying ? tryStatus(view, dict, pending) : live ? TRY_COPY.invite : '';

  return (
    <div
      ref={rootRef}
      className={`site-demo${playing ? ' is-playing' : ''}${trying ? ' is-trying' : ''}`}
      data-tips-off={tipsOff ? '' : undefined}
      onKeyDown={onDemoKeyDown}
      onFocus={() => {
        if (tipsOff) setTipsOff(false);
      }}
    >
      {/* MS-6.10: the card has one height in every state (two chip lines, or three lines of the card's hints), the
          status line is one line, and the chips row is one line that shows its end, so the keypad never moves. */}
      <div className="site-demo__card">
        <div className="site-demo__said">
          {trying ? (
            hint ? (
              <div className="site-demo__hint">
                <p>{hint}</p>
                {hint === TRY_COPY.start ? <p className="site-demo__kbd">{TRY_COPY.keyboard}</p> : null}
              </div>
            ) : (
              <div className="site-demo__line" data-end="">
                <ul className="site-demo__chips site-demo__end" aria-label="Proof check">
                  {tryChips.map(({ w, i }) => (
                    <li key={i}>
                      <ProofChip state={w.state} word={w.label} code={w.code} />
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : (
            <ul className="site-demo__chips" aria-label="Proof check">
              <Chips step={s} final={final} finished={finished} />
            </ul>
          )}
        </div>
      </div>
      <p className="site-demo__status">
        {Array.isArray(status)
          ? status.length > 0
            ? [
                `${TRY_COPY.next} `,
                ...status.map((w, i) => (
                  <Fragment key={i}>
                    {i > 0 ? ', ' : null}
                    <b>{w}</b>
                  </Fragment>
                )),
              ]
            : null
          : status}
      </p>

      <div
        role="group"
        aria-label="Keypad, try it"
        aria-describedby="site-demo-desc"
        className="nl-keypad site-pad site-demo__keypad"
        style={{ '--nl-key': HERO_KEY } as CSSProperties}
      >
        {KEY_ROWS.map((row, r) => (
          <div key={r} className="nl-keypad__row">
            {row.map((def) => {
              let cls = 'nl-key site-key site-key--try';
              if (pressed === def.id) cls += ' is-pressed';
              // Key 9 keeps its resting ember ring for the life of the component, so the arrival fade never replays.
              if (def.id === '9') cls += ' site-key--ninth';
              return (
                <button
                  key={def.id}
                  ref={(el) => {
                    if (el) keyRefs.current.set(def.id, el);
                    else keyRefs.current.delete(def.id);
                  }}
                  type="button"
                  className={cls}
                  data-try-key={def.id}
                  aria-label={def.ariaLabel}
                  tabIndex={def.id === focusKey ? 0 : -1}
                  onFocus={() => setFocusKey(def.id)}
                  onClick={() => pressKey(def.id)}
                >
                  <KeyFace def={def} />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* The toolbar: one cell per key column. Each button's text is its tooltip, so the name a screen reader or voice
          control uses is the word on screen (WCAG 2.5.3). Hear it appears only where the browser has speech. */}
      <div ref={toolsRef} className="site-demo__tools" onPointerLeave={() => setTipsOff(false)}>
        <button type="button" className="nl-btn site-icon-btn site-demo__play" onClick={press}>
          {playing ? <Icon name="stop" /> : <SiteIcon d={replay} />}
          <span className="site-tip site-tip--start site-demo__label">{label}</span>
        </button>
        {canSpeak ? (
          <button
            type="button"
            className="nl-btn site-icon-btn site-icon-btn--filled site-demo__hear"
            onClick={hear}
            aria-disabled={hearOff || undefined}
          >
            <Icon name="speaker" />
            <span className="site-tip">Hear it</span>
          </button>
        ) : null}
        <button
          type="button"
          className="nl-btn site-icon-btn site-demo__clear"
          onClick={clearKeys}
          aria-disabled={clearOff || undefined}
        >
          <Icon name="x" />
          <span className="site-tip site-tip--end">Clear</span>
        </button>
      </div>

      <p id="site-demo-desc" className="nl-sr-only">
        {`One press per letter: ${spokenPresses} types “${finalSentence}”. 0 is space. Press the keys to try your own words. ${TRY_COPY.keyboard}`}
      </p>
      <p className="nl-sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
