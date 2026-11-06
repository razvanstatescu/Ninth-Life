'use client';
/**
 * The communication screen (design/artboards/In-context-app.dc.html).
 * Top to bottom: They said, SpeakBar, sentences, keypad, proof. Ghost mode (offline dictionary)
 * always works; model ranking is optional, off by default, and never speaks on its own.
 */
import { lattice, type Candidate } from '@ninth/core';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { EMPTY, actionForKey, codesOf, composerReducer } from '@/lib/composer';
import { loadDictionary, type DictState } from '@/lib/data';
import { DecodeCache, buildRequest, decodeRemote, type RejectedSuggestion } from '@/lib/decodeClient';
import { focusContext, mapKey } from '@/lib/keyboard';
import { KEY_ROWS, type KeyDef } from '@/lib/keys';
import { MAX_CANDIDATES, buildSentence, decodeWithPins, mergeCandidates, readings } from '@/lib/sentence';
import { DEFAULT_SETTINGS, applyLook, isScan, readStoredLook, sanitizeSettings, stepScanMs, type Settings } from '@/lib/settings';
import { pickVoice, speak, speechSupported } from '@/lib/speech';
import { deletePhrase, listPhrases, loadSettings, markPhraseUsed, savePhrase, saveSettings, storageAvailable, type Phrase } from '@/lib/storage';
import { useOnline } from '@/lib/useOnline';
import { useScanner } from '@/lib/useScanner';
import { useVoices } from '@/lib/useVoices';
import { AppHeader, StatusPill } from './AppHeader';
import { Button } from './Button';
import { CandidateList } from './CandidateList';
import { Footer } from './Footer';
import { Icon } from './Icon';
import { Keypad } from './Keypad';
import { PartnerTurn } from './PartnerTurn';
import { PhrasesSheet } from './PhrasesSheet';
import { ProofPanel } from './ProofPanel';
import { ScanBar } from './ScanBar';
import { SettingsSheet } from './SettingsSheet';
import { ShowMode } from './ShowMode';
import { SpeakBar } from './SpeakBar';

const LLM_DEBOUNCE_MS = 400;
const ACTIONS = ['speak', 'clear', 'save'] as const;
const KEYPAD_ROWS = KEY_ROWS.length; // 4
const CAND_ROW = KEYPAD_ROWS; // scan row 4
const ACTION_ROW = KEYPAD_ROWS + 1; // scan row 5

type SheetName = 'settings' | 'voice' | 'phrases' | null;

export function CommunicationScreen({
  initialDict,
  initialSettings,
}: {
  /** Inject a dictionary (tests, embeds); otherwise it loads from /data. */
  initialDict?: DictState;
  /** Starting settings before the stored ones load (tests, embeds). */
  initialSettings?: Partial<Settings>;
} = {}) {
  const [settings, setSettings] = useState<Settings>(() => sanitizeSettings({ ...DEFAULT_SETTINGS, ...initialSettings }));
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [dict, setDict] = useState<DictState>(initialDict ?? { status: 'loading' });
  const [composer, dispatch] = useReducer(composerReducer, EMPTY);
  const [partner, setPartner] = useState('');
  const [remote, setRemote] = useState<{ key: string; candidates: Candidate[]; rejected: RejectedSuggestion[]; rejectedCount: number } | null>(null);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [show, setShow] = useState<{ text: string; reason: string | null } | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [phraseError, setPhraseError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [announce, setAnnounce] = useState('');
  const online = useOnline();
  const voices = useVoices(settings.lang);
  const cache = useRef(new DecodeCache());
  const lastPointerKey = useRef<{ id: string; at: number } | null>(null);

  // ---- load settings, dictionary, phrases ---------------------------------------------------
  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => {
      if (!alive) return;
      // Stored settings win; otherwise keep the look the head script already applied.
      setSettings((cur) => s ?? sanitizeSettings({ ...cur, ...readStoredLook(), ...initialSettings }));
      setSettingsLoaded(true);
    });
    if (!initialDict) loadDictionary().then((d) => alive && setDict(d));
    if (storageAvailable())
      listPhrases()
        .then((p) => alive && setPhrases(p))
        .catch(() => alive && setPhraseError('Saved phrases are not available in this browser window.'));
    return () => {
      alive = false;
    };
  }, [initialDict]);

  useEffect(() => {
    if (!settingsLoaded) return; // do not repaint over the head script's theme with defaults
    applyLook(settings);
    void saveSettings(settings);
  }, [settings, settingsLoaded]);

  // ---- decoding -------------------------------------------------------------------------------
  const lex = dict.status === 'ready' ? dict.lexicon : null;
  const codes = useMemo(() => codesOf(composer), [composer]);
  const ghost = useMemo(
    () => (dict.status === 'ready' ? decodeWithPins(composer, dict.lexicon, dict.lm, { k: MAX_CANDIDATES, mode: settings.mode }) : []),
    [composer, dict, settings.mode],
  );
  const remoteKey = DecodeCache.key(codes, partner);
  const llmActive = settings.llm && online && dict.status === 'ready';
  const remoteNow = llmActive && remote?.key === remoteKey ? remote : null;
  const pinned = composer.slots.some((s) => s.pin);
  // Model sentences must also respect words the person fixed with # or by choosing a sentence.
  const remoteValid = useMemo(
    () => (remoteNow?.candidates ?? []).filter((c) => composer.slots.every((s, i) => !s.pin || s.pin === c.words[i])),
    [remoteNow, composer.slots],
  );
  const candidates = useMemo(() => mergeCandidates(remoteValid, ghost), [remoteValid, ghost]);
  const sentence = useMemo(() => buildSentence(composer, candidates, lex, settings.mode), [composer, candidates, lex, settings.mode]);

  useEffect(() => {
    if (!llmActive || dict.status !== 'ready' || codes.length === 0 || pinned) return;
    const lat = lattice(codes, dict.lexicon, 12, settings.mode);
    if (lat.some((slot) => slot.length === 0)) return; // an unfinished word: nothing to rank yet
    const key = DecodeCache.key(codes, partner);
    const hit = cache.current.get(key);
    if (hit) {
      setRemote({ key, candidates: hit.candidates, rejected: hit.rejected, rejectedCount: hit.rejectedCount });
      return;
    }
    const req = buildRequest(codes, lat, partner, settings.mode, MAX_CANDIDATES, ghost.map((c) => c.words));
    if (!req) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      decodeRemote(req, dict.lexicon, { signal: ctrl.signal }).then((res) => {
        if (!res || ctrl.signal.aborted) return; // stay in ghost mode
        cache.current.set(key, res);
        setRemote({ key, candidates: res.candidates, rejected: res.rejected, rejectedCount: res.rejectedCount });
      });
    }, LLM_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [llmActive, dict, codes, partner, settings.mode, pinned, ghost]);

  // ---- actions --------------------------------------------------------------------------------
  const say = useCallback((msg: string) => {
    setAnnounce('');
    // A fresh string each time so the same message is announced twice in a row.
    setTimeout(() => setAnnounce(msg), 30);
  }, []);

  const nextReading = useCallback(() => {
    if (!lex || composer.slots.length === 0) return;
    const index = composer.slots.length - 1;
    const rs = readings(lex, composer.slots[index]!.code, settings.mode);
    const cur = sentence.words[index]?.word ?? null;
    if (rs.length === 0 || (rs.length === 1 && rs[0] === cur)) {
      say('No other words for these keys.');
      return;
    }
    const next = rs[(Math.max(-1, rs.indexOf(cur ?? '')) + 1) % rs.length]!;
    dispatch({ type: 'pin', index, word: next });
  }, [lex, composer.slots, settings.mode, sentence.words, say]);

  const pressKey = useCallback(
    (def: KeyDef) => {
      if (def.id === '#') return nextReading();
      const a = actionForKey(def.id);
      if (a) dispatch(a);
    },
    [nextReading],
  );

  /** Pointer and touch presses: a repeat of the same key inside the accept delay is a tremor. */
  const pressKeyPointer = useCallback(
    (def: KeyDef) => {
      const now = Date.now();
      const last = lastPointerKey.current;
      if (last && last.id === def.id && now - last.at < settings.acceptDelayMs) return;
      lastPointerKey.current = { id: def.id, at: now };
      pressKey(def);
    },
    [pressKey, settings.acceptDelayMs],
  );

  const selectCandidate = useCallback(
    (i: number) => {
      const c = sentence.candidates[i];
      if (c) dispatch({ type: 'select', words: c.words });
    },
    [sentence.candidates],
  );

  const noVoice = !speechSupported() || (voices.loaded && voices.voices.length === 0);

  /** Speak right inside the click or key handler: iOS needs the user gesture. */
  const speakText = useCallback(
    (text: string): boolean => {
      if (!text) return false;
      if (noVoice) {
        setShow({ text, reason: 'No voice is available on this device, so here is your sentence in big text.' });
        return true;
      }
      const ok = speak(text, {
        voice: pickVoice(voices.voices, settings.voiceURI),
        rate: settings.rate,
        pitch: settings.pitch,
        lang: 'en',
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
        onError: () => {
          setSpeaking(false);
          setShow({ text, reason: 'The voice could not speak, so here is your sentence in big text.' });
        },
      });
      if (!ok) setShow({ text, reason: 'No voice is available on this device, so here is your sentence in big text.' });
      return true;
    },
    [noVoice, voices.voices, settings.voiceURI, settings.rate, settings.pitch],
  );

  const speakNow = useCallback(() => {
    if (!sentence.speakable) {
      if (codes.length > 0) say('Finish the last word before you speak.');
      return;
    }
    if (speakText(sentence.text)) dispatch({ type: 'spoken' });
  }, [sentence.speakable, sentence.text, codes.length, speakText, say]);

  const clearAll = useCallback(() => {
    dispatch({ type: 'clear' });
    say('Cleared.');
  }, [say]);

  const saveCurrent = useCallback(() => {
    if (!sentence.speakable) return;
    savePhrase(sentence.text)
      .then(() => listPhrases())
      .then((p) => {
        setPhrases(p);
        setPhraseError(null);
        say('Phrase saved on this device.');
      })
      .catch(() => {
        setPhraseError('This phrase could not be saved. Storage may be off in this browser window.');
        say('This phrase could not be saved.');
      });
  }, [sentence.speakable, sentence.text, say]);

  const moveSelection = useCallback(
    (delta: 1 | -1) => {
      const n = sentence.candidates.length;
      if (n === 0) return;
      const cur = sentence.selectedIndex < 0 ? (delta > 0 ? -1 : 0) : sentence.selectedIndex;
      selectCandidate((cur + delta + n) % n);
    },
    [sentence.candidates.length, sentence.selectedIndex, selectCandidate],
  );

  // ---- switch scanning ------------------------------------------------------------------------
  const scanMode = settings.access === 'scan1' ? 'scan1' : settings.access === 'scan2' ? 'scan2' : null;
  const overlayOpen = sheet !== null || show !== null;
  const actionsRef = useRef({ pressKey, selectCandidate, speakNow, clearAll, saveCurrent });
  actionsRef.current = { pressKey, selectCandidate, speakNow, clearAll, saveCurrent };
  const scanner = useScanner({
    mode: scanMode,
    rows: [...KEY_ROWS.map((r) => r.length), sentence.candidates.length, ACTIONS.length],
    loops: settings.scanLoops,
    scanMs: settings.scanMs,
    acceptDelayMs: settings.acceptDelayMs,
    paused: overlayOpen,
    onChoose: (row, cell) => {
      const a = actionsRef.current;
      if (row < KEYPAD_ROWS) {
        const def = KEY_ROWS[row]?.[cell];
        if (def) a.pressKey(def);
      } else if (row === CAND_ROW) a.selectCandidate(cell);
      else if (row === ACTION_ROW) {
        const act = ACTIONS[cell];
        if (act === 'speak') a.speakNow();
        else if (act === 'clear') a.clearAll();
        else if (act === 'save') a.saveCurrent();
      }
    },
  });
  const scanActive = scanMode !== null && (scanner.state.phase === 'rows' || scanner.state.phase === 'cells');
  const scanRow = scanActive ? scanner.state.row : -1;
  const litCell = scanActive && scanner.state.phase === 'cells' ? scanner.state.cell : -1;

  // ---- physical keyboard ----------------------------------------------------------------------
  const handlers = useRef({ pressKey, speakNow, moveSelection, selectCandidate, scanner, access: settings.access, overlayOpen });
  handlers.current = { pressKey, speakNow, moveSelection, selectCandidate, scanner, access: settings.access, overlayOpen };
  useEffect(() => {
    let swallowKeyUp: string | null = null;
    const onKeyDown = (e: KeyboardEvent) => {
      const h = handlers.current;
      if (h.overlayOpen || e.defaultPrevented) return;
      const intent = mapKey(e, h.access, focusContext(document.activeElement));
      if (!intent) return;
      if (e.repeat && intent.type !== 'move') {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (e.key === ' ' || e.key === 'Enter') swallowKeyUp = e.key;
      switch (intent.type) {
        case 'switch':
          if (intent.action === 'advance') h.scanner.advance();
          else h.scanner.select();
          break;
        case 'key': {
          const def = KEY_ROWS.flat().find((k) => k.id === intent.key);
          if (def) h.pressKey(def);
          break;
        }
        case 'speak':
          h.speakNow();
          break;
        case 'move':
          h.moveSelection(intent.delta);
          break;
        case 'rank':
          h.selectCandidate(intent.rank - 1);
          break;
      }
    };
    // A focused button activates on Space keyup; the keydown already did the work.
    const onKeyUp = (e: KeyboardEvent) => {
      if (swallowKeyUp && e.key === swallowKeyUp) {
        e.preventDefault();
        swallowKeyUp = null;
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, []);

  /** In switch modes a press anywhere outside a control is the switch (switch interfaces often click). */
  const onBackgroundPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!scanMode || overlayOpen) return;
    const t = e.target as Element;
    if (t.closest('button, a, input, select, textarea, label, dialog')) return;
    scanner.select();
  };

  // ---- announcements --------------------------------------------------------------------------
  const [spokenLive, setSpokenLive] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSpokenLive(sentence.text ? `Sentence: ${sentence.text}` : ''), 600);
    return () => clearTimeout(t);
  }, [sentence.text]);

  // ---- view -----------------------------------------------------------------------------------
  const scanning = isScan(settings.access);
  const emberIsScan = scanning && scanActive;
  const dictPill =
    dict.status === 'ready' ? (
      <StatusPill icon="check" tone="ok">
        Offline dictionary ready
      </StatusPill>
    ) : dict.status === 'loading' ? (
      <StatusPill>Loading your dictionary</StatusPill>
    ) : (
      <StatusPill icon="x" tone="warn">
        Dictionary not loaded
      </StatusPill>
    );
  const pills = (
    <>
      {dictPill}
      {!online ? (
        <StatusPill icon="offline" tone="info">
          {dict.status === 'ready' ? 'Offline. Using your dictionary.' : 'Offline'}
        </StatusPill>
      ) : null}
      <StatusPill>{settings.llm ? (online ? 'Model ranking on' : 'Model ranking paused offline') : 'Model ranking off'}</StatusPill>
    </>
  );

  const candEmpty =
    dict.status === 'missing' || dict.status === 'error'
      ? null
      : codes.length === 0
        ? 'Sentences appear here as you press keys.'
        : dict.status === 'loading'
          ? 'Loading your dictionary.'
          : 'No sentence matches these keys yet. Keep typing, or press Back.';

  const alternatives = (i: number) => [...new Set(sentence.candidates.map((c) => c.words[i]).filter((w): w is string => !!w))];

  return (
    <div className="app" onPointerDown={onBackgroundPointer}>
      <a className="nl-skip" href="#keypad">
        Skip to the keypad
      </a>
      <div className="app__inner">
        <AppHeader pills={pills} onPhrases={() => setSheet('phrases')} onVoice={() => setSheet('voice')} onSettings={() => setSheet('settings')} />

        <main className="app-main">
          <div className="app-main__talk">
            <PartnerTurn value={partner} onChange={setPartner} />

            <div className={scanRow === ACTION_ROW ? 'speak-group nl-scanrow is-scanning order-speak' : 'speak-group nl-scanrow order-speak'}>
              <SpeakBar
                tokens={sentence.tokens}
                words={sentence.words}
                codes={codes}
                canSpeak={sentence.speakable}
                emptyText="Press a key to start"
                speakVariant={emberIsScan ? 'quiet' : 'primary'}
                speakLit={scanRow === ACTION_ROW && litCell === 0}
                speaking={speaking}
                onSpeak={speakNow}
              />
              <div className="speak-actions">
                <Button variant="secondary" icon="x" onClick={clearAll} disabled={codes.length === 0} lit={scanRow === ACTION_ROW && litCell === 1}>
                  Clear
                </Button>
                <Button variant="quiet" icon="save" onClick={saveCurrent} disabled={!sentence.speakable} lit={scanRow === ACTION_ROW && litCell === 2}>
                  Save phrase
                </Button>
                <Button variant="quiet" icon="show" onClick={() => sentence.text && setShow({ text: sentence.text, reason: null })} disabled={!sentence.speakable}>
                  Show
                </Button>
              </div>
            </div>

            <div className="order-cands">
              {dict.status === 'missing' || dict.status === 'error' ? (
                <div className="notice notice--warn" role="alert">
                  <Icon name="x" />
                  <p>
                    <strong>Dictionary not loaded.</strong> Your keys still show as digits, but sentences need the dictionary.
                    {online ? ' Reload the page to try again.' : ' Connect once and reload to get it; after that it works offline.'}
                  </p>
                </div>
              ) : null}
              <CandidateList
                candidates={sentence.candidates}
                selectedIndex={sentence.selectedIndex}
                punct={composer.punct}
                scanning={scanRow === CAND_ROW}
                litIndex={scanRow === CAND_ROW ? litCell : -1}
                emptyText={candEmpty}
                onSelect={selectCandidate}
              />
            </div>

            <div className="order-proof">
              <ProofPanel words={sentence.words} labels={sentence.tokens} rejected={remoteNow?.rejected ?? []} rejectedCount={remoteNow?.rejectedCount ?? 0} alternatives={alternatives} />
            </div>
          </div>

          <div className="app-main__pad">
            <div className="order-pad" id="keypad" tabIndex={-1}>
              <Keypad
                onPress={pressKeyPointer}
                scanRow={scanRow < KEYPAD_ROWS ? scanRow : -1}
                litKey={scanRow >= 0 && scanRow < KEYPAD_ROWS && litCell >= 0 ? [scanRow, litCell] : null}
              />
            </div>
            <ScanBar
              access={settings.access}
              scanMs={settings.scanMs}
              phase={scanner.state.phase}
              onSlower={() => setSettings((s) => ({ ...s, scanMs: stepScanMs(s.scanMs, 1) }))}
              onFaster={() => setSettings((s) => ({ ...s, scanMs: stepScanMs(s.scanMs, -1) }))}
              onTurnOn={() => setSettings((s) => ({ ...s, access: 'scan1' }))}
            />
            {settings.access === 'keyboard' ? (
              <p className="hint order-hint">
                Your keyboard works too: <kbd>0</kbd>–<kbd>9</kbd>, <kbd>*</kbd> and <kbd>#</kbd>. <kbd>Enter</kbd> speaks, <kbd>Backspace</kbd> goes back, arrows and <kbd>Alt</kbd>+<kbd>1</kbd>–<kbd>5</kbd> pick a sentence.
              </p>
            ) : null}
          </div>
        </main>

        <Footer />
      </div>

      <p className="nl-sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      <p className="nl-sr-only" aria-live="polite">
        {spokenLive}
      </p>

      <SettingsSheet
        open={sheet === 'settings' || sheet === 'voice'}
        focusVoice={sheet === 'voice'}
        settings={settings}
        voices={voices}
        onChange={setSettings}
        onTestVoice={() => speakText('Hello. This is how I sound.')}
        onClose={() => setSheet(null)}
      />
      <PhrasesSheet
        open={sheet === 'phrases'}
        phrases={phrases}
        error={phraseError}
        onSpeak={(p) => {
          speakText(p.text);
          void markPhraseUsed(p.id).then(() => listPhrases().then(setPhrases)).catch(() => undefined);
        }}
        onDelete={(p) => {
          void deletePhrase(p.id)
            .then(() => listPhrases().then(setPhrases))
            .catch(() => setPhraseError('This phrase could not be deleted.'));
        }}
        onClose={() => setSheet(null)}
      />
      <ShowMode text={show?.text ?? null} reason={show?.reason ?? null} onClose={() => setShow(null)} />
    </div>
  );
}
