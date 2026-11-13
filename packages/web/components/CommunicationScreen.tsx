'use client';
/**
 * The communication screen (design/artboards/In-context-app.dc.html).
 * Wide: They said, SpeakBar, sentences and proof beside the keypad. Compact (tablets in portrait):
 * SpeakBar, keypad, sentences, proof. Phones and tablets (stack, split): sentence card, suggestions,
 * keypad and the action bar [Menu] [Speak] [Show] in one screen with no page scroll; proof, They said
 * and the rest are in sheets (lib/layout.ts, web-ui Req 24 and 25, ADR-003). Phones held sideways
 * get the rotate screen. Ghost mode (offline dictionary)
 * always works; model ranking is optional, off by default, and never speaks on its own.
 * The conversation (what they said, what you said; web-ui Req 27, ADR-007) lives in memory only
 * (lib/conversation.ts): the header's They said button, a strip or a panel show its newest turns, and the
 * Conversation sheet holds all of them. Everything the person chooses to say goes through sayAndRecord.
 * Quick replies (web-ui Req 28) take the suggestion area when there is no sentence to choose.
 * Reply types (web-ui Req 29, ADR-008): Agree, Disagree, Ask for their newest line, only reorder the
 * sentences (and Ask adds a "?"); the area's last row, the laptop list, or the Conversation and Sentences sheets.
 */
import { REPLY_INTENTS, encodeWord, lattice, normalize, type Candidate, type Lexicon, type ReplyIntent } from '@ninth/core';
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react';
import { EMPTY, actionForKey, codesOf, composerReducer, type ComposerState } from '@/lib/composer';
import { loadDictionary, type DictState } from '@/lib/data';
import { DecodeCache, buildRequest, decodeRemote, type RejectedSuggestion } from '@/lib/decodeClient';
import { decodeContext, recordMine, replyIntentFor, useConversation, type MeVia, type ThemVia, type Turn } from '@/lib/conversation';
import { focusContext, mapKey } from '@/lib/keyboard';
import {
  isShell,
  isTwoColumn,
  sectionOrder,
  SPLIT_ROWS_QUERIES,
  splitSuggestionRows,
  STACK_NO_HEADER_QUERY,
  STACK_ROWS_QUERIES,
  STACK_SHORT_QUERY,
  STACK_THREAD_QUERY,
  stackSuggestionRows,
  threadRows,
  useLayout,
  useMediaQuery,
  visibleSentences,
  type Layout,
  type Section,
} from '@/lib/layout';
import { KEY_ROWS, type KeyDef } from '@/lib/keys';
import { applyMyWords, buildDisplayMap, makeMyWord, mergeMyWords, showWord, type MyWord } from '@/lib/myWords';
import { MAX_CANDIDATES, buildSentence, decodeAround, decodeWithPins, mergeCandidates, readings, spellTarget } from '@/lib/sentence';
import { DEFAULT_SETTINGS, applyLook, readStoredLook, sanitizeSettings, stepScanMs, type Settings } from '@/lib/settings';
import { acceptReply, replyCells, replyRows, suggestionMode } from '@/lib/replies';
import { pickVoice, speak, speechSupported } from '@/lib/speech';
import {
  deleteMyWord,
  deletePhrase,
  importPhrases,
  listMyWords,
  listPhrases,
  loadSettings,
  markPhraseUsed,
  putMyWords,
  savePhrase,
  saveSettings,
  storageAvailable,
  type Phrase,
} from '@/lib/storage';
import type { ImportPlan, ParsedPack } from '@/lib/vocabPack';
import { statusLines, statusSummary } from '@/lib/status';
import { useOnline } from '@/lib/useOnline';
import { useOverlayScan } from '@/lib/useOverlayScan';
import { useScanner } from '@/lib/useScanner';
import { useVoices } from '@/lib/useVoices';
import { AppHeader } from './AppHeader';
import { Button } from './Button';
import { CandidateList } from './CandidateList';
import { ConversationSheet } from './ConversationSheet';
import { ThreadPanel, ThreadStrip, useAddCells } from './ConversationStrip';
import { Footer, NOT_A_MEDICAL_DEVICE } from './Footer';
import { Icon } from './Icon';
import { Keypad } from './Keypad';
import { MenuSheet } from './MenuSheet';
import { MyWordsSheet } from './MyWordsSheet';
import { PartnerTurn } from './PartnerTurn';
import { PhoneSuggestions, phoneSuggestions } from './PhoneSuggestions';
import { RotateNotice, usePortraitLock } from './RotateNotice';
import { PhrasesSheet } from './PhrasesSheet';
import { QuickReplies, type ReplySlot } from './QuickReplies';
import { REPLY_TYPE_LABEL, ReplyTypes } from './ReplyTypes';
import { ProofPanel } from './ProofPanel';
import { ScanBar } from './ScanBar';
import { SettingsSheet } from './SettingsSheet';
import { Sheet } from './Sheet';
import { ShowMode } from './ShowMode';
import { SpeakBar, SpeakButton } from './SpeakBar';
import { SpellSheet } from './SpellSheet';

const LLM_DEBOUNCE_MS = 400;
const ACTIONS = ['speak', 'clear', 'save', 'show', 'spell'] as const;
/** Phones and tablets (stack, split): the action bar, left to right (web-ui Req 24). */
const PHONE_ACTIONS = ['menu', 'speak', 'show'] as const;
const KEYPAD_ROWS = KEY_ROWS.length; // 4
/**
 * Scan grid (web-ui Req 8.1, 16.1, 21.2): keypad rows first so any key is at most 4 + 3 = 7 steps
 * away (Keypad README), then sentences, "Add to my words" offers (empty, so skipped, unless a word on
 * show is not in the person's words), the actions under the SpeakBar, and the header (Menu, or
 * Phrases / Voice / Settings on wide screens). Phone layout: the same rows, with the action row being
 * the action bar (Menu, Speak, Show) and the last row the sentence card's Clear (or Undo).
 */
/** Sentences, or the quick replies while they hold the area (web-ui Req 28.6). */
export const CAND_ROW = KEYPAD_ROWS; // scan row 4
export const OFFER_ROW = KEYPAD_ROWS + 1; // scan row 5
export const ACTION_ROW = KEYPAD_ROWS + 2; // scan row 6
export const MENU_ROW = KEYPAD_ROWS + 3; // scan row 7
/**
 * The conversation (web-ui Req 27.10): after the card's Clear on phones, after the header on laptops.
 * 0 cells under 620px (no header; the row is skipped), 1 for the header's They said button, up to 4 for
 * the strip (2 turns, They said, All), up to 6 for the laptop panel (3 turns, Listen, Type their line, All).
 */
export const THREAD_ROW = KEYPAD_ROWS + 4; // scan row 8
const WIDE_MENU = ['phrases', 'voice', 'settings'] as const;

type SheetName = 'menu' | 'settings' | 'voice' | 'phrases' | 'words' | 'spell' | 'sentences' | 'proof' | 'partner' | 'conversation' | null;
/** What the person chose to say: Speak (keys), a phrase, a quick reply, Say again. Each becomes a 'you said' turn. */
export type SayAndRecord = (text: string, via: Exclude<MeVia, 'shown'>) => boolean;
const WORDS_NOT_SAVED = 'My words could not be saved on this device, so they last until you close the app. Storage may be off in this browser window.';

export function CommunicationScreen({
  initialDict,
  initialSettings,
  layout: forcedLayout,
  initialWords,
  reloadDict,
}: {
  /** Inject a dictionary (tests, embeds); otherwise it loads from /data. */
  initialDict?: DictState;
  /** Starting settings before the stored ones load (tests, embeds). */
  initialSettings?: Partial<Settings>;
  /** Force a layout (tests); otherwise it follows the viewport. */
  layout?: Layout;
  /** My words to start with (tests); otherwise they load from IndexedDB. */
  initialWords?: MyWord[];
  /** A fresh dictionary, used after a word is removed (the lexicon cannot forget a word). */
  reloadDict?: () => Promise<DictState>;
} = {}) {
  const layout = useLayout(forcedLayout);
  const [settings, setSettings] = useState<Settings>(() => sanitizeSettings({ ...DEFAULT_SETTINGS, ...initialSettings }));
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [dict, setDict] = useState<DictState>(initialDict ?? { status: 'loading' });
  const [composer, dispatch] = useReducer(composerReducer, EMPTY);
  // The conversation (web-ui Req 27): memory only, shared with the sheets; They said is its newest 'them' line.
  const conv = useConversation();
  const [focusTurn, setFocusTurn] = useState<number | null>(null);
  const [panelAdding, setPanelAdding] = useState(false);
  // Voice to text for They said (web-ui Req 26): allowed once, from the notice or Settings.
  const dictation = useMemo(() => ({ allowed: settings.dictation, onAllow: () => setSettings((s) => ({ ...s, dictation: true })) }), [settings.dictation]);
  const [remote, setRemote] = useState<{ key: string; candidates: Candidate[]; rejected: RejectedSuggestion[]; rejectedCount: number } | null>(null);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [show, setShow] = useState<{ text: string; reason: string | null } | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [phraseError, setPhraseError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [moreSentences, setMoreSentences] = useState(false);
  // Clear keeps what was cleared until the next key press, so a mistaken Clear can be undone.
  const [undo, setUndo] = useState<ComposerState | null>(null);
  const [announce, setAnnounce] = useState('');
  // My words (web-ui Req 21): stored on this device, boosted in the lexicon, spelled the person's way.
  const [myWords, setMyWords] = useState<MyWord[]>(initialWords ?? []);
  const [wordsLoaded, setWordsLoaded] = useState(initialWords !== undefined);
  const [wordsError, setWordsError] = useState<string | null>(null);
  /** Spellings chosen in spell mode this visit (folded -> "Mihai"), also for words not added. */
  const [spelled, setSpelled] = useState<ReadonlyMap<string, string>>(new Map());
  /** Bumped whenever the lexicon is changed in place (addWords), so decoding runs again. */
  const [lexVersion, setLexVersion] = useState(0);
  const [spell, setSpell] = useState<{ index: number; code: string; word: string | null; capital: boolean } | null>(null);
  const myWordsRef = useRef(myWords);
  myWordsRef.current = myWords;
  const appliedTo = useRef<Lexicon | null>(null);
  const online = useOnline();
  const voices = useVoices(settings.lang);
  const cache = useRef(new DecodeCache());
  const lastPointerKey = useRef<{ id: string; at: number } | null>(null);
  const lastReply = useRef<{ text: string; at: number } | null>(null);

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
    if (initialWords === undefined) {
      if (storageAvailable())
        listMyWords()
          .then((w) => alive && setMyWords((cur) => mergeMyWords(w, cur)))
          .catch(() => alive && setWordsError(WORDS_NOT_SAVED))
          .finally(() => alive && setWordsLoaded(true));
      else setWordsLoaded(true);
    }
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

  // My words are raised in each lexicon once, when it and the stored words are both ready.
  useEffect(() => {
    if (dict.status !== 'ready' || !wordsLoaded || appliedTo.current === dict.lexicon) return;
    appliedTo.current = dict.lexicon;
    applyMyWords(dict.lexicon, myWordsRef.current);
    setLexVersion((v) => v + 1);
  }, [dict, wordsLoaded]);

  // ---- decoding -------------------------------------------------------------------------------
  const lex = dict.status === 'ready' ? dict.lexicon : null;
  const display = useMemo(() => buildDisplayMap(myWords, [...spelled].map(([w, d]) => ({ w, display: d }))), [myWords, spelled]);
  const codes = useMemo(() => codesOf(composer), [composer]);
  // The reply type (web-ui Req 29): only the one pressed for their newest line counts (a new line resets it).
  const intent = replyIntentFor(conv.state, composer.intent, composer.intentFor);
  // Their line changed or went away: drop the stale type, and Ask's automatic "?" with it.
  useLayoutEffect(() => {
    if (composer.intent && !intent) dispatch({ type: 'intent' });
  }, [composer.intent, intent]);
  // A spoken sentence is not re-ranked: a type pressed while it is still on show is for the next one.
  const rankIntent = composer.spoken ? undefined : intent;
  const ghost = useMemo(
    () => (dict.status === 'ready' ? decodeWithPins(composer, dict.lexicon, dict.lm, { k: MAX_CANDIDATES, mode: settings.mode, intent: rankIntent }) : []),
    // lexVersion: the lexicon was changed in place (addWords), so decode again.
    [composer, dict, settings.mode, lexVersion, rankIntent],
  );
  // Ranking context (web-ui Req 27.11): their newest line, and your last 3 lines only with "Include what
  // you said" on. Your lines count from before this sentence started, so speaking or showing it does not
  // re-rank the sentence still on screen.
  const ctxBefore = useRef(conv.state.nextId);
  const wasSpoken = useRef(composer.spoken);
  if (codes.length === 0 || (wasSpoken.current && !composer.spoken)) ctxBefore.current = conv.state.nextId;
  wasSpoken.current = composer.spoken;
  const before = ctxBefore.current;
  const decodeCtx = useMemo(
    () => decodeContext(conv.state, { recent: settings.llmRecent, before, intent: composer.spoken ? undefined : composer.intent, intentFor: composer.intentFor }),
    [conv.state, settings.llmRecent, before, composer.spoken, composer.intent, composer.intentFor],
  );
  const remoteKey = DecodeCache.key(codes, decodeCtx.partner, decodeCtx.recent, decodeCtx.intent);
  const llmActive = settings.llm && online && dict.status === 'ready';
  const remoteNow = llmActive && remote?.key === remoteKey ? remote : null;
  const pinned = composer.slots.some((s) => s.pin);
  // Model sentences must also respect words the person fixed with # or by choosing a sentence.
  const remoteValid = useMemo(
    () => (remoteNow?.candidates ?? []).filter((c) => composer.slots.every((s, i) => !s.pin || s.pin === c.words[i])),
    [remoteNow, composer.slots],
  );
  const candidates = useMemo(() => mergeCandidates(remoteValid, ghost), [remoteValid, ghost]);
  // No full sentence (a word with no dictionary word and not spelled yet): still rank the known words (Req 20.1).
  const fallback = useMemo(
    () => (dict.status === 'ready' && candidates.length === 0 && composer.slots.length > 0 ? decodeAround(composer, dict.lexicon, dict.lm, { mode: settings.mode }) : null),
    // lexVersion: the lexicon was changed in place (addWords), so decode again.
    [dict, candidates.length, composer, settings.mode, lexVersion],
  );
  const sentence = useMemo(
    () => buildSentence(composer, candidates, lex, settings.mode, { fallback, display }),
    // lexVersion: the lexicon was changed in place (addWords), so decode again.
    [composer, candidates, lex, settings.mode, fallback, display, lexVersion],
  );

  useEffect(() => {
    if (!llmActive || dict.status !== 'ready' || codes.length === 0 || pinned) return;
    const lat = lattice(codes, dict.lexicon, 12, settings.mode);
    if (lat.some((slot) => slot.length === 0)) return; // an unfinished word: nothing to rank yet
    const key = remoteKey;
    const hit = cache.current.get(key);
    if (hit) {
      setRemote({ key, candidates: hit.candidates, rejected: hit.rejected, rejectedCount: hit.rejectedCount });
      return;
    }
    // The beams are already in the reply type's order, so the server's fallback follows it (ADR-008).
    const req = buildRequest(codes, lat, decodeCtx.partner, settings.mode, MAX_CANDIDATES, ghost.map((c) => c.words), decodeCtx.recent, decodeCtx.intent);
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
    // remoteKey stands for the context (partner, recent lines and reply type).
  }, [llmActive, dict, codes, remoteKey, settings.mode, pinned, ghost]);

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

  /**
   * Speak something the person chose and add it to the conversation as a 'you said' turn (web-ui Req
   * 27.2). Call it inside the press (iOS gesture). Test voice uses speakText and is not a turn.
   */
  const sayAndRecord: SayAndRecord = useCallback(
    (text, via) => {
      const ok = speakText(text);
      if (ok) recordMine(text, via);
      return ok;
    },
    [speakText],
  );

  const speakNow = useCallback(() => {
    if (!sentence.speakable) {
      if (codes.length > 0) say('Finish the last word before you speak.');
      return;
    }
    if (sayAndRecord(sentence.text, 'keys')) dispatch({ type: 'spoken', words: sentence.words.map((w) => w.word ?? '') });
  }, [sentence.speakable, sentence.text, sentence.words, codes.length, sayAndRecord, say]);

  /**
   * A quick reply (web-ui Req 28.2): speak exactly its text inside the press, leave the sentence alone,
   * and ignore a second press of the same reply within the accept delay (a tremor). It becomes a "you
   * said" turn (28.7).
   */
  const sayReply = useCallback(
    (text: string) => {
      const r = acceptReply(lastReply.current, text, Date.now(), settings.acceptDelayMs);
      lastReply.current = r.last;
      if (r.ok) sayAndRecord(text, 'quick');
    },
    [sayAndRecord, settings.acceptDelayMs],
  );

  /** Say again in the Conversation sheet: the same repeat guard as a quick reply (a tremor's double tap). */
  const lastAgain = useRef<{ text: string; at: number } | null>(null);
  const sayAgain = useCallback(
    (text: string) => {
      const r = acceptReply(lastAgain.current, text, Date.now(), settings.acceptDelayMs);
      lastAgain.current = r.last;
      if (r.ok) sayAndRecord(text, 'again');
    },
    [sayAndRecord, settings.acceptDelayMs],
  );

  const clearAll = useCallback(() => {
    if (composer.slots.length > 0) setUndo(composer);
    dispatch({ type: 'clear' });
    setMoreSentences(false);
    say('Cleared. Undo brings it back.');
  }, [say, composer]);
  const undoClear = useCallback(() => {
    if (!undo) return;
    dispatch({ type: 'restore', state: undo });
    setUndo(null);
    say('Sentence back.');
  }, [undo, say]);
  // The next key press (or the Undo itself) ends the chance to undo.
  useEffect(() => {
    if (composer.slots.length > 0) setUndo(null);
  }, [composer.slots.length]);

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

  // ---- my words and spell mode (web-ui Req 19-22) ---------------------------------------------
  /** Save words on the device and raise them in the lexicon. */
  const addMyWords = useCallback(
    (list: MyWord[]) => {
      if (list.length === 0) return;
      const next = mergeMyWords(myWordsRef.current, list);
      myWordsRef.current = next;
      setMyWords(next);
      if (lex && appliedTo.current === lex) {
        applyMyWords(lex, list);
        setLexVersion((v) => v + 1);
      }
      const changed = next.filter((x) => list.some((l) => l.w === x.w));
      if (!storageAvailable()) setWordsError(WORDS_NOT_SAVED);
      else
        putMyWords(changed)
          .then(() => setWordsError(null))
          .catch(() => setWordsError(WORDS_NOT_SAVED));
    },
    [lex],
  );

  const addWord = useCallback(
    (raw: string, source: MyWord['source']): string | null => {
      const m = makeMyWord(raw, source);
      if ('error' in m) return m.error;
      const had = myWordsRef.current.find((x) => x.w === m.w);
      if (had && had.display === m.display) return `${m.display} is already in my words.`;
      addMyWords([m]);
      say(`${m.display} added to my words.`);
      return null;
    },
    [addMyWords, say],
  );

  const removeWord = useCallback(
    (w: string) => {
      const gone = myWordsRef.current.find((x) => x.w === w);
      const next = myWordsRef.current.filter((x) => x.w !== w);
      myWordsRef.current = next;
      setMyWords(next);
      if (storageAvailable()) void deleteMyWord(w).catch(() => setWordsError('This word could not be removed from this device.'));
      say(`${gone?.display ?? w} removed from my words.`);
      // The lexicon only ever raises words, so build a fresh one and raise the words that are left.
      const current = lex;
      void (reloadDict ?? loadDictionary)()
        .then((fresh) => {
          if (fresh.status === 'ready' && fresh.lexicon !== current) setDict(fresh);
        })
        .catch(() => undefined);
    },
    [lex, reloadDict, say],
  );

  const importPack = useCallback(
    (pack: ParsedPack, plan: ImportPlan) => {
      const now = Date.now();
      const list: MyWord[] = [...plan.add, ...plan.update].map((pw) => ({ w: pw.w, display: pw.display, boost: pw.boost, added: now, source: 'pack' }));
      addMyWords(list);
      if (plan.phrasesNew.length > 0 && storageAvailable())
        void importPhrases(plan.phrasesNew)
          .then(() => listPhrases().then(setPhrases))
          .catch(() => setPhraseError('The phrases from this pack could not be saved.'));
      say(`Added ${list.length} ${list.length === 1 ? 'word' : 'words'} from pack ${pack.id}.`);
    },
    [addMyWords, say],
  );

  const canSpell = dict.status === 'ready' && settings.mode === 'letter' && codes.length > 0;
  const openSpell = useCallback(() => {
    if (!canSpell) return;
    const i = spellTarget(sentence.words);
    const w = sentence.words[i];
    if (!w) return;
    const start = w.word ?? w.partial ?? null;
    // A word the dictionary does not have at all is usually a name, so it starts with a capital.
    const capital = w.word ? /^\p{Lu}/u.test(showWord(w.word, display)) : w.state === 'unspelled';
    setSpell({ index: i, code: w.code, word: start, capital });
    setSheet('spell');
  }, [canSpell, sentence.words, display]);

  const useSpelled = useCallback(
    (shown: string, add: boolean) => {
      const target = spell;
      const w = normalize(shown);
      // Valid by construction (only the key's letters were offered); checked again before use.
      if (!target || encodeWord(w) !== target.code || composer.slots[target.index]?.code !== target.code) {
        setSheet(null);
        return;
      }
      setSpelled((m) => new Map(m).set(w, shown));
      dispatch({ type: 'pin', index: target.index, word: w });
      setSheet(null);
      if (add) addWord(shown, 'spelled');
      else say(lex?.has(w) ? `${shown} is in your sentence.` : `${shown} is in your sentence. Not in your words yet. Add it?`);
    },
    [spell, composer.slots, addWord, lex, say],
  );

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
  const overlay: string | null = show !== null ? 'show' : sheet === 'voice' ? 'settings' : sheet;
  const overlayOpen = overlay !== null;
  // A sheet keeps scanning the way it was opened, so a switch user who picks Keyboard or Two switches
  // in Settings can still change their mind before closing it (web-ui Req 16.4).
  const latched = useRef<{ overlay: boolean; mode: typeof scanMode }>({ overlay: false, mode: null });
  if (overlayOpen && !latched.current.overlay) latched.current = { overlay: true, mode: scanMode };
  if (!overlayOpen && latched.current.overlay) latched.current = { overlay: false, mode: null };
  const overlayScanMode = overlayOpen ? latched.current.mode : null;

  const shownSentences = visibleSentences(sentence.candidates.length, layout, moreSentences, sentence.selectedIndex);
  const sentenceToggle = shownSentences.more
    ? { label: 'More sentences', onClick: () => setMoreSentences(true) }
    : shownSentences.canCollapse
      ? { label: 'Fewer sentences', onClick: () => setMoreSentences(false) }
      : null;
  const candCells = shownSentences.count + (sentenceToggle && shownSentences.count > 0 ? 1 : 0);
  // Words on show that match their keys but are not in the person's words: "Add to my words".
  const offers = useMemo(() => {
    const seen = new Set<string>();
    const out: { word: string; label: string }[] = [];
    for (const w of sentence.words) {
      if (w.state !== 'new' || !w.word || seen.has(w.word)) continue;
      seen.add(w.word);
      out.push({ word: w.word, label: showWord(w.word, display) });
    }
    return out;
  }, [sentence.words, display]);
  const addOffer = useCallback((word: string) => void addWord(showWord(word, display), 'spelled'), [addWord, display]);
  const menuCells = layout === 'wide' ? WIDE_MENU.length : 1;
  // Phones and tablets (web-ui Req 24, 25): one screen, suggestions next to the keypad, the action bar.
  const phone = isShell(layout);
  const stackRows = stackSuggestionRows({
    r2: useMediaQuery(STACK_ROWS_QUERIES.r2),
    r3: useMediaQuery(STACK_ROWS_QUERIES.r3),
    r4: useMediaQuery(STACK_ROWS_QUERIES.r4),
    short: useMediaQuery(STACK_SHORT_QUERY),
  });
  const splitRows = splitSuggestionRows({ r3: useMediaQuery(SPLIT_ROWS_QUERIES.r3), r4: useMediaQuery(SPLIT_ROWS_QUERIES.r4) });
  const sugRows = layout === 'split' ? splitRows : stackRows;
  const unspelledWord = sentence.words.find((w) => w.state === 'unspelled');
  // One contextual row, in this order: spell a word the dictionary lacks, or add a word to my words.
  // A short phone has no suggestion row (Req 24.9): Sentences and Spell this word are in Menu.
  const noSugRow = phone && sugRows === 0;
  const spellOffer: { label: string; icon: 'spell' | 'plus'; onClick: () => void } | null = !phone || noSugRow
    ? null
    : canSpell && unspelledWord && sentence.candidates.length === 0
      ? { label: `Spell ${unspelledWord.code}`, icon: 'spell', onClick: openSpell }
      : offers[0]
        ? { label: `Add ${offers[0].label} to my words`, icon: 'plus', onClick: () => addOffer(offers[0]!.word) }
        : null;
  const sug: ReturnType<typeof phoneSuggestions> = noSugRow
    ? { items: [], more: false }
    : phoneSuggestions(sentence.candidates, sentence.selectedIndex, spellOffer ? sugRows - 1 : sugRows, composer.punct, display);
  const openSentences = useCallback(() => setSheet('sentences'), []);
  // The shells size the keys from the room the keypad area gets (styles/app.css --pad-w / --pad-h).
  // Measured here rather than with container query units, which Chrome resolved to 0 in this layout.
  const padRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = padRef.current;
    if (!el || !phone || typeof ResizeObserver === 'undefined') return;
    const setPad = (width: number, height: number) => {
      el.style.setProperty('--pad-w', `${Math.round(width)}px`);
      el.style.setProperty('--pad-h', `${Math.round(height)}px`);
    };
    // Measure once now, before the first paint: the observer's first callback comes a frame later, and
    // painting the keys at the fallback size first made the keypad jump (Lighthouse CLS, Round 3).
    const cs = getComputedStyle(el);
    const px = (v: string) => parseFloat(v) || 0;
    const w = el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
    const h = el.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
    if (w > 0 && h > 0) setPad(w, h);
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setPad(r.width, r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [phone, layout]);
  const phoneCandCells = sug.items.length + (spellOffer || sug.more ? 1 : 0);

  // ---- reply types (web-ui Req 29) ---------------------------------------------------------------------
  // Offered while the newest turn is theirs. Pressing the pressed one releases it.
  const replyTypesOn = conv.awaitingReply && conv.lastThem !== null;
  const lastThemId = conv.lastThem?.id;
  const setIntent = useCallback((next: ReplyIntent | undefined) => dispatch({ type: 'intent', intent: next, turn: lastThemId }), [lastThemId]);
  const toggleIntent = useCallback((t: ReplyIntent) => setIntent(intent === t ? undefined : t), [intent, setIntent]);

  // ---- quick replies (web-ui Req 28) ------------------------------------------------------------------
  // Nothing typed, or the sentence was just spoken: the area holds the replies instead of the sentences.
  const replyMode = suggestionMode({ typed: codes.length > 0, spoken: composer.spoken, enabled: settings.quickReplies });
  // Reply types go here on the shells while the newest turn is theirs: with 2 or more rows they take the
  // last row, by the keys (on 2 rows the second reply row stays in Menu). Laptops show them under the replies instead
  // (laptopGroup). Null: not shown.
  const replySlot = useMemo<ReplySlot | null>(
    () =>
      replyTypesOn && phone
        ? {
            cells: REPLY_INTENTS.length,
            render: (lit) => <ReplyTypes variant="row" value={intent} onToggle={setIntent} litIndex={lit} />,
            choose: (i) => {
              const t = REPLY_INTENTS[i];
              if (t) toggleIntent(t);
            },
          }
        : null,
    [replyTypesOn, phone, intent, setIntent, toggleIntent],
  );
  const slotCells = replySlot?.cells ?? 0;
  // Shells: the rows that fit (none on a short phone: Menu > Quick replies). Laptops: one row of 5 on wide
  // (the header has Phrases), 2 rows of 3 on compact.
  const replyGrid = useMemo(
    () => (phone ? replyRows(sugRows, slotCells) : layout === 'wide' ? replyRows(1, slotCells, true) : replyRows(3, slotCells)),
    [phone, sugRows, slotCells, layout],
  );
  const showReplies = replyMode === 'replies' && replyGrid.length > 0;
  const replyList = useMemo(() => (showReplies ? replyCells(replyGrid) : []), [showReplies, replyGrid]);
  /** A press or a switch on the area's cell `i`: speak a reply, open Phrases, or the slot's own choice. */
  const chooseReplyCell = useCallback(
    (i: number) => {
      const cell = replyList[i];
      if (!cell) return;
      if (cell.kind === 'reply') sayReply(cell.text);
      else if (cell.kind === 'phrases') setSheet('phrases');
      else replySlot?.choose(cell.index);
    },
    [replyList, sayReply, replySlot],
  );
  // On the shells the sentences are not on screen while the replies are, so Alt+1-5 and the arrows do
  // nothing then (a sentence shortcut never speaks or changes anything unseen).
  const sentencesHidden = phone && showReplies;
  // Laptops: the group sits under the quick replies (or alone while typing) above the Sentences list until
  // Speak; its cells follow the replies' in the sentence scan row (web-ui Req 29.5, 29.7).
  const laptopGroup = !phone && replyTypesOn;
  const groupCells = laptopGroup ? REPLY_INTENTS.length : 0;
  // Shells: the group in the Conversation and Sentences sheets (the only place on 1-row and short phones,
  // and while typing on the others).
  const sheetGroup = phone && replyTypesOn ? <ReplyTypes variant="sheet" value={intent} onToggle={setIntent} /> : null;

  const openSheet = useCallback((name: SheetName) => setSheet(name), []);
  const showCurrent = useCallback(() => {
    if (!sentence.speakable || !sentence.text) return;
    setShow({ text: sentence.text, reason: null });
    recordMine(sentence.text, 'shown');
  }, [sentence.speakable, sentence.text]);

  // ---- the conversation on the main screen (web-ui Req 27.4-27.6) ------------------------------------
  const threadView = threadRows(layout, { tall: useMediaQuery(STACK_THREAD_QUERY), noHeader: useMediaQuery(STACK_NO_HEADER_QUERY) });
  const newestFirst = useMemo(() => [...conv.turns].reverse(), [conv.turns]);
  // The header button (Req 27.4) shows their newest line: what you said is already on the card, and their
  // line is the context worth seeing. Yours only when they have said nothing yet.
  const bubbleTurn = conv.lastThem ?? newestFirst[0] ?? null;
  const addCells = useAddCells(dictation);
  const threadShown = threadView === 3 ? Math.min(3, newestFirst.length) : threadView === 2 ? Math.min(2, newestFirst.length) : 0;
  const threadCells = threadView === 0 ? 0 : threadView === 1 ? 1 : threadView === 2 ? threadShown + 2 : threadShown + (panelAdding ? 0 : addCells + 1);
  /** Open the Conversation sheet, with focus on a turn's first button (or on Close). */
  const openConversation = useCallback((id: number | null) => {
    setFocusTurn(id);
    setSheet('conversation');
  }, []);
  const openPartner = useCallback(() => setSheet('partner'), []);
  const addThem = useCallback(
    (text: string, via: ThemVia) => {
      if (!text.trim()) return;
      conv.addThem(text, via);
      say('Added to the conversation.');
    },
    [conv, say],
  );
  const actionsRef = useRef({ pressKey, selectCandidate, speakNow, clearAll, saveCurrent, showCurrent, openSheet, sentenceToggle, layout, openSpell, offers, addOffer, phone, sug, spellOffer, openSentences, undo, undoClear, threadView, newestFirst, bubbleTurn, threadShown, openConversation, openPartner, replyList, chooseReplyCell, groupCells, toggleIntent });
  actionsRef.current = { pressKey, selectCandidate, speakNow, clearAll, saveCurrent, showCurrent, openSheet, sentenceToggle, layout, openSpell, offers, addOffer, phone, sug, spellOffer, openSentences, undo, undoClear, threadView, newestFirst, bubbleTurn, threadShown, openConversation, openPartner, replyList, chooseReplyCell, groupCells, toggleIntent };
  const scanner = useScanner({
    mode: scanMode,
    rows: phone
      ? [...KEY_ROWS.map((r) => r.length), showReplies ? replyList.length : phoneCandCells, 0, PHONE_ACTIONS.length, 1, threadCells]
      : [...KEY_ROWS.map((r) => r.length), replyList.length + groupCells + candCells, offers.length, ACTIONS.length, menuCells, threadCells],
    loops: settings.scanLoops,
    scanMs: settings.scanMs,
    acceptDelayMs: settings.acceptDelayMs,
    paused: overlayOpen,
    onChoose: (row, cell) => {
      const a = actionsRef.current;
      if (row < KEYPAD_ROWS) {
        const def = KEY_ROWS[row]?.[cell];
        if (def) a.pressKey(def);
      } else if (row === CAND_ROW && cell < a.replyList.length) {
        a.chooseReplyCell(cell);
      } else if (row === CAND_ROW && a.phone) {
        const item = a.sug.items[cell];
        if (item) a.selectCandidate(item.index);
        else if (a.spellOffer) a.spellOffer.onClick();
        else if (a.sug.more) a.openSentences();
      } else if (row === CAND_ROW) {
        // Laptops: the replies (or the reply types) come first in the row, then the sentences.
        const g = cell - a.replyList.length;
        const c = g - a.groupCells;
        if (g < a.groupCells) {
          const t = REPLY_INTENTS[g];
          if (t) a.toggleIntent(t);
        } else if (c < shownSentences.count) a.selectCandidate(c);
        else a.sentenceToggle?.onClick();
      } else if (row === OFFER_ROW) {
        const o = a.offers[cell];
        if (o) a.addOffer(o.word);
      } else if (row === ACTION_ROW && a.phone) {
        const act = PHONE_ACTIONS[cell];
        if (act === 'menu') a.openSheet('menu');
        else if (act === 'speak') a.speakNow();
        else if (act === 'show') a.showCurrent();
      } else if (row === MENU_ROW && a.phone) {
        if (a.undo) a.undoClear();
        else a.clearAll();
      } else if (row === ACTION_ROW) {
        const act = ACTIONS[cell];
        if (act === 'speak') a.speakNow();
        else if (act === 'clear') a.clearAll();
        else if (act === 'save') a.saveCurrent();
        else if (act === 'show') a.showCurrent();
        else if (act === 'spell') a.openSpell();
      } else if (row === MENU_ROW) {
        a.openSheet(a.layout === 'wide' ? (WIDE_MENU[cell] ?? null) : 'menu');
      } else if (row === THREAD_ROW) {
        const turn = cell < a.threadShown ? a.newestFirst[cell] : undefined;
        if (a.threadView === 1) {
          const last = a.bubbleTurn;
          if (last) a.openConversation(last.id);
          else a.openPartner();
        } else if (turn) a.openConversation(turn.id);
        else if (a.threadView === 2) {
          if (cell === a.threadShown) a.openPartner();
          else a.openConversation(null);
        } else if (a.threadView === 3) {
          // The panel's Listen / Type their line / All, exactly as a press (Listen starts inside it).
          document.querySelectorAll<HTMLButtonElement>('[data-thread="panel"] .thread-panel__actions button')[cell - a.threadShown]?.click();
        }
      }
    },
  });
  const scanActive = scanMode !== null && (scanner.state.phase === 'rows' || scanner.state.phase === 'cells');
  const scanRow = scanActive && !overlayOpen ? scanner.state.row : -1;
  const litCell = scanRow >= 0 && scanner.state.phase === 'cells' ? scanner.state.cell : -1;

  const sheetScanner = useOverlayScan({
    mode: overlayScanMode,
    overlay,
    findRoot: () => (overlay ? document.querySelector<HTMLElement>(`[data-overlay="${overlay}"]`) : null),
    loops: settings.scanLoops,
    scanMs: settings.scanMs,
    acceptDelayMs: settings.acceptDelayMs,
  });

  // ---- physical keyboard ----------------------------------------------------------------------
  const handlers = useRef({ pressKey, speakNow, moveSelection, selectCandidate, scanner, sheetScanner, overlayScanMode, access: settings.access, overlayOpen, sentencesHidden });
  handlers.current = { pressKey, speakNow, moveSelection, selectCandidate, scanner, sheetScanner, overlayScanMode, access: settings.access, overlayOpen, sentencesHidden };
  useEffect(() => {
    let swallowKeyUp: string | null = null;
    const onKeyDown = (e: KeyboardEvent) => {
      const h = handlers.current;
      if (e.defaultPrevented) return;
      if (h.overlayOpen) {
        // Inside a sheet, Space and Enter are the switch while scanning; otherwise the sheet's own controls own every key.
        if (!h.overlayScanMode || e.ctrlKey || e.metaKey || e.altKey) return;
        if (focusContext(document.activeElement) === 'text') return;
        const isSpace = e.key === ' ' || e.code === 'Space';
        if (!isSpace && e.key !== 'Enter') return;
        e.preventDefault();
        e.stopPropagation();
        swallowKeyUp = e.key;
        if (e.repeat) return;
        if (isSpace && h.overlayScanMode === 'scan2') h.sheetScanner.advance();
        else h.sheetScanner.select();
        return;
      }
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
          if (!h.sentencesHidden) h.moveSelection(intent.delta);
          break;
        case 'rank':
          if (!h.sentencesHidden) h.selectCandidate(intent.rank - 1);
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
    const t = e.target as Element;
    if (t.closest('button, a, input, select, textarea, label')) return;
    if (overlayOpen) {
      // A press on the sheet (or its backdrop) outside any control is the switch too.
      if (overlayScanMode && t.closest('dialog')) sheetScanner.select();
      return;
    }
    if (!scanMode || t.closest('dialog')) return;
    scanner.select();
  };

  // ---- announcements --------------------------------------------------------------------------
  const [spokenLive, setSpokenLive] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSpokenLive(sentence.text ? `Sentence: ${sentence.text}` : ''), 600);
    return () => clearTimeout(t);
  }, [sentence.text]);

  // ---- view -----------------------------------------------------------------------------------
  // While scanning, the scan highlight is the screen's one ember thing, so Speak turns quiet.
  const emberIsScan = (scanMode !== null && scanActive) || (overlayScanMode !== null && overlayOpen);
  const status = statusLines(dict.status, online, settings.llm);
  const summary = statusSummary(dict.status, online, settings.llm);

  const candEmpty =
    dict.status === 'missing' || dict.status === 'error'
      ? null
      : codes.length === 0
        ? 'Sentences appear here as you press keys.'
        : dict.status === 'loading'
          ? 'Loading your dictionary.'
          : sentence.words.some((w) => w.state === 'unspelled')
            ? `Not in your words yet: ${sentence.words
                .filter((w) => w.state === 'unspelled')
                .map((w) => w.code)
                .join(', ')}. Spell this word to choose its letters, or press Back.`
            : 'No sentence matches these keys yet. Keep typing, or press Back.';

  const alternatives = (i: number) => [...new Set(sentence.candidates.map((c) => c.words[i]).filter((w): w is string => !!w))];
  const quickPhrases = dict.status === 'ready' ? (dict.pack?.phrases ?? []) : [];
  const actionLit = (i: number) => scanRow === ACTION_ROW && litCell === i;

  const sections: Record<Section, ReactElement> = {
    thread:
      threadView === 3 ? (
        <div key="thread" className="order-partner" data-section="thread">
          <ThreadPanel
            turns={newestFirst}
            adding={panelAdding}
            onAdding={setPanelAdding}
            onAdd={addThem}
            onOpenTurn={openConversation}
            onOpen={() => openConversation(null)}
            dictation={dictation}
            switchOn={scanMode !== null}
            scanning={scanRow === THREAD_ROW}
            litIndex={scanRow === THREAD_ROW ? litCell : -1}
          />
        </div>
      ) : threadView === 2 ? (
        <div key="thread" className="order-thread" data-section="thread">
          <ThreadStrip
            turns={newestFirst}
            onOpenTurn={openConversation}
            onOpen={() => openConversation(null)}
            onAdd={openPartner}
            scanning={scanRow === THREAD_ROW}
            litIndex={scanRow === THREAD_ROW ? litCell : -1}
          />
        </div>
      ) : (
        <span key="thread" hidden />
      ),
    speak: phone ? (
      <div key="speak" className={scanRow === MENU_ROW ? 'phone-card nl-scanrow is-scanning order-speak' : 'phone-card nl-scanrow order-speak'} data-section="speak">
        <SpeakBar
          tokens={sentence.tokens}
          words={sentence.words}
          codes={codes}
          canSpeak={sentence.speakable}
          emptyText="Press a key to start"
          speakVariant={emberIsScan ? 'quiet' : 'primary'}
          speaking={speaking}
          onSpeak={speakNow}
          hideSpeak
          digitsApart
          tag={intent ? REPLY_TYPE_LABEL[intent] : undefined}
          extra={
            undo ? (
              <Button variant="secondary" onClick={undoClear} lit={scanRow === MENU_ROW && litCell === 0} className="phone-card__undo">
                Undo
              </Button>
            ) : (
              <Button
                variant="secondary"
                icon="x"
                onClick={clearAll}
                disabled={codes.length === 0}
                lit={scanRow === MENU_ROW && litCell === 0}
                aria-label="Clear"
                className="phone-card__clear"
              >
                {null}
              </Button>
            )
          }
        />
      </div>
    ) : (
      <div key="speak" className={scanRow === ACTION_ROW ? 'speak-group nl-scanrow is-scanning order-speak' : 'speak-group nl-scanrow order-speak'} data-section="speak">
        <SpeakBar
          tokens={sentence.tokens}
          words={sentence.words}
          codes={codes}
          canSpeak={sentence.speakable}
          emptyText="Press a key to start"
          speakVariant={emberIsScan ? 'quiet' : 'primary'}
          speakLit={actionLit(0)}
          speaking={speaking}
          onSpeak={speakNow}
          tag={intent ? REPLY_TYPE_LABEL[intent] : undefined}
        />
        <div className="speak-actions">
          <Button variant="secondary" icon="x" onClick={clearAll} disabled={codes.length === 0} lit={actionLit(1)}>
            Clear
          </Button>
          <Button variant="quiet" icon="save" onClick={saveCurrent} disabled={!sentence.speakable} lit={actionLit(2)} aria-label="Save phrase">
            Save<span className="save-btn__more"> phrase</span>
          </Button>
          <Button variant="quiet" icon="show" onClick={showCurrent} disabled={!sentence.speakable} lit={actionLit(3)}>
            Show
          </Button>
          <Button variant="secondary" icon="spell" onClick={openSpell} disabled={!canSpell} lit={actionLit(4)} aria-label="Spell this word" data-action="spell">
            Spell<span className="spell-btn__more"> this word</span>
          </Button>
        </div>
      </div>
    ),
    cands: phone ? (
      <div key="cands" className="order-cands" data-section="cands">
        {showReplies ? (
          <QuickReplies
            variant="area"
            rows={replyGrid}
            size={sugRows}
            scanning={scanRow === CAND_ROW}
            litIndex={scanRow === CAND_ROW ? litCell : -1}
            onSay={sayReply}
            onPhrases={() => setSheet('phrases')}
            slot={replySlot}
          />
        ) : (
        <PhoneSuggestions
          items={sug.items}
          more={sug.more}
          spell={spellOffer}
          emptyText={dict.status === 'missing' || dict.status === 'error' ? 'Dictionary not loaded. Reload to try again.' : codes.length === 0 ? 'Sentences for your keys appear here.' : null}
          rows={sugRows}
          scanning={scanRow === CAND_ROW}
          litIndex={scanRow === CAND_ROW ? litCell : -1}
          onSelect={selectCandidate}
          onMore={openSentences}
        />
        )}
      </div>
    ) : (
      <div key="cands" className="order-cands" data-section="cands">
        {dict.status === 'missing' || dict.status === 'error' ? (
          <div className="notice notice--warn" role="alert">
            <Icon name="x" />
            <p>
              <strong>Dictionary not loaded.</strong> Your keys still show as digits, but sentences need the dictionary.
              {online ? ' Reload the page to try again.' : ' Connect once and reload to get it; after that it works offline.'}
            </p>
          </div>
        ) : null}
        {showReplies ? (
          // Laptops: the replies, then the sentences (after Speak) or the empty text, one scan row.
          <div className={scanRow === CAND_ROW ? 'cands-area nl-scanrow is-scanning' : 'cands-area nl-scanrow'}>
            <QuickReplies
              variant="line"
              rows={replyGrid}
              litIndex={scanRow === CAND_ROW ? litCell : -1}
              onSay={sayReply}
              onPhrases={() => setSheet('phrases')}
            />
            {laptopGroup ? (
              <ReplyTypes
                variant="line"
                value={intent}
                onToggle={setIntent}
                litIndex={scanRow === CAND_ROW && litCell >= replyList.length ? litCell - replyList.length : -1}
              />
            ) : null}
            <CandidateList
              candidates={sentence.candidates}
              selectedIndex={sentence.selectedIndex}
              punct={composer.punct}
              litIndex={scanRow === CAND_ROW ? litCell - replyList.length - groupCells : -1}
              emptyText={candEmpty}
              onSelect={selectCandidate}
              shown={shownSentences.count}
              toggle={sentenceToggle}
              display={display}
            />
          </div>
        ) : laptopGroup ? (
          // Laptops while typing: the reply types, then the sentences, one scan row.
          <div className={scanRow === CAND_ROW ? 'cands-area nl-scanrow is-scanning' : 'cands-area nl-scanrow'}>
            <ReplyTypes variant="line" value={intent} onToggle={setIntent} litIndex={scanRow === CAND_ROW && litCell < groupCells ? litCell : -1} />
            <CandidateList
              candidates={sentence.candidates}
              selectedIndex={sentence.selectedIndex}
              punct={composer.punct}
              litIndex={scanRow === CAND_ROW ? litCell - groupCells : -1}
              emptyText={candEmpty}
              onSelect={selectCandidate}
              shown={shownSentences.count}
              toggle={sentenceToggle}
              display={display}
            />
          </div>
        ) : (
          <CandidateList
            candidates={sentence.candidates}
            selectedIndex={sentence.selectedIndex}
            punct={composer.punct}
            scanning={scanRow === CAND_ROW}
            litIndex={scanRow === CAND_ROW ? litCell : -1}
            emptyText={candEmpty}
            onSelect={selectCandidate}
            shown={shownSentences.count}
            toggle={sentenceToggle}
            display={display}
          />
        )}
      </div>
    ),
    proof: (
      <div key="proof" className="order-proof" data-section="proof">
        <ProofPanel
          words={sentence.words}
          labels={sentence.tokens}
          rejected={remoteNow?.rejected ?? []}
          rejectedCount={remoteNow?.rejectedCount ?? 0}
          alternatives={alternatives}
          offers={offers}
          onAddWord={addOffer}
          offerScanning={scanRow === OFFER_ROW}
          offerLit={scanRow === OFFER_ROW ? litCell : -1}
        />
      </div>
    ),
    pad: (
      <div key="pad" className="order-pad" id="keypad" tabIndex={-1} data-section="pad" ref={padRef}>
        <Keypad
          onPress={pressKeyPointer}
          scanRow={scanRow < KEYPAD_ROWS ? scanRow : -1}
          litKey={scanRow >= 0 && scanRow < KEYPAD_ROWS && litCell >= 0 ? [scanRow, litCell] : null}
        />
      </div>
    ),
    actions: (
      <div key="actions" className={scanRow === ACTION_ROW ? 'phone-actions nl-scanrow is-scanning' : 'phone-actions nl-scanrow'} data-section="actions">
        <Button variant="quiet" icon="menu" onClick={() => setSheet('menu')} lit={actionLit(0)}>
          Menu
        </Button>
        <SpeakButton canSpeak={sentence.speakable} variant={emberIsScan ? 'quiet' : 'primary'} lit={actionLit(1)} speaking={speaking} onSpeak={speakNow} className="phone-actions__speak" />
        <Button variant="quiet" icon="show" onClick={showCurrent} disabled={!sentence.speakable} lit={actionLit(2)}>
          Show
        </Button>
      </div>
    ),
    scan: (
      <ScanBar
        key="scan"
        access={settings.access}
        scanMs={settings.scanMs}
        phase={scanner.state.phase}
        onSlower={() => setSettings((s) => ({ ...s, scanMs: stepScanMs(s.scanMs, 1) }))}
        onFaster={() => setSettings((s) => ({ ...s, scanMs: stepScanMs(s.scanMs, -1) }))}
        onTurnOn={() => setSettings((s) => ({ ...s, access: 'scan1' }))}
      />
    ),
    hint:
      settings.access === 'keyboard' ? (
        <p key="hint" className="hint order-hint">
          Your keyboard works too: <kbd>0</kbd>–<kbd>9</kbd>, <kbd>*</kbd> and <kbd>#</kbd>. <kbd>Enter</kbd> speaks, <kbd>Backspace</kbd> goes back, arrows and <kbd>Alt</kbd>+<kbd>1</kbd>–<kbd>5</kbd> pick a sentence.
        </p>
      ) : (
        <span key="hint" hidden />
      ),
  };
  const order = sectionOrder(layout).columns;
  usePortraitLock(layout === 'stack' || layout === 'rotate');

  if (layout === 'rotate') return <RotateNotice />;

  // The page's one h1, for screen readers and search (the brand in the header is a link, not a heading).
  // Visually hidden and absolutely positioned, so it takes no room in any layout.
  const pageHeading = <h1 className="nl-sr-only">Ninth Life</h1>;

  return (
    <div className={phone ? `app app--${layout} app--shell` : `app app--${layout}`} onPointerDown={onBackgroundPointer}>
      <a className="nl-skip" href="#keypad">
        Skip to the keypad
      </a>
      <div className="app__inner">
        <AppHeader
          status={status}
          summary={summary}
          scanning={scanRow === MENU_ROW}
          litCell={scanRow === MENU_ROW ? litCell : -1}
          onMenu={() => setSheet('menu')}
          onPhrases={() => setSheet('phrases')}
          onVoice={() => setSheet('voice')}
          onSettings={() => setSheet('settings')}
          actions={!phone}
          thread={
            phone && threadView === 1
              ? { last: bubbleTurn, onOpen: () => openConversation(bubbleTurn?.id ?? null), onAdd: openPartner, lit: scanRow === THREAD_ROW }
              : null
          }
          scanPill={phone && scanMode ? (scanActive ? 'Scanning' : 'Scanning paused') : null}
        />

        {phone ? (
          <main className={`app-main app-main--${layout}`}>
            {pageHeading}
            <div className="shell-screen">{order.flat().filter((k) => !(noSugRow && k === 'cands') && !(k === 'thread' && threadView !== 2)).map((k) => sections[k])}</div>
          </main>
        ) : isTwoColumn(layout) ? (
          <main className="app-main">
            {pageHeading}
            <div className="app-main__talk">{order[0]!.map((k) => sections[k])}</div>
            <div className="app-main__pad">{order[1]!.map((k) => sections[k])}</div>
          </main>
        ) : (
          <main className="app-main app-main--compact">
            {pageHeading}
            {order[0]!.map((k) => sections[k])}
          </main>
        )}

        {phone ? null : <Footer />}
      </div>

      <p className="nl-sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      <p className="nl-sr-only" aria-live="polite">
        {spokenLive}
      </p>

      <MenuSheet
        open={sheet === 'menu'}
        status={status}
        scanning={overlayScanMode !== null}
        onPhrases={() => setSheet('phrases')}
        onMyWords={() => setSheet('words')}
        onVoice={() => setSheet('voice')}
        onSettings={() => setSheet('settings')}
        onClose={() => setSheet(null)}
        sentence={
          phone
            ? {
                canSave: sentence.speakable,
                onSave: () => {
                  saveCurrent();
                  setSheet(null);
                },
                canSpell,
                onSpell: openSpell,
                // Short phones, and while the replies hold the area after Speak (web-ui Req 24.9, 28.5).
                onSentences: noSugRow || (showReplies && sentence.candidates.length > 0) ? openSentences : undefined,
                onProof: () => setSheet('proof'),
                onPartner: () => setSheet('partner'),
                onConversation: () => openConversation(null),
              }
            : null
        }
        about={phone ? NOT_A_MEDICAL_DEVICE : null}
        onReply={(text) => {
          // Speak inside the press, then back to the keys (web-ui Req 28.4: "Hold on" while typing).
          sayReply(text);
          setSheet(null);
        }}
      />
      {phone ? (
        <Sheet open={sheet === 'proof'} name="proof" title="Check the words" onClose={() => setSheet(null)} scanning={overlayScanMode !== null}>
          <ProofPanel
            words={sentence.words}
            labels={sentence.tokens}
            rejected={remoteNow?.rejected ?? []}
            rejectedCount={remoteNow?.rejectedCount ?? 0}
            alternatives={alternatives}
            offers={offers}
            onAddWord={addOffer}
          />
        </Sheet>
      ) : null}
      {phone ? (
        <Sheet open={sheet === 'partner'} name="partner" title="They said" onClose={() => setSheet(null)} scanning={overlayScanMode !== null} initialFocusId="partner-field">
          <p className="sheet__lead">What the other person just said. It goes into the conversation on this screen and is never saved. With model ranking on, it helps rank your sentences.</p>
          {sheet === 'partner' ? (
            <PartnerTurn value="" onChange={addThem} onDone={() => setSheet(null)} dictation={dictation} inputId="partner-field" autoFocus={overlayScanMode === null} />
          ) : null}
        </Sheet>
      ) : null}
      {phone ? (
        <Sheet open={sheet === 'sentences'} name="sentences" title="Sentences for your keys" onClose={() => setSheet(null)} scanning={overlayScanMode !== null}>
          {sheetGroup}
          <div className="scan-cluster" data-scan-row="sentences">
            <CandidateList
              candidates={sentence.candidates}
              selectedIndex={sentence.selectedIndex}
              punct={composer.punct}
              emptyText={null}
              onSelect={(i) => {
                selectCandidate(i);
                setSheet(null);
              }}
              display={display}
            />
          </div>
        </Sheet>
      ) : null}
      <SettingsSheet
        open={sheet === 'settings' || sheet === 'voice'}
        scanning={overlayScanMode !== null}
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
        quickPhrases={quickPhrases}
        scanning={overlayScanMode !== null}
        onSpeakQuick={(text) => sayAndRecord(text, 'phrase')}
        onReply={layout === 'wide' ? sayReply : undefined}
        error={phraseError}
        onSpeak={(p) => {
          sayAndRecord(p.text, 'phrase');
          void markPhraseUsed(p.id).then(() => listPhrases().then(setPhrases)).catch(() => undefined);
        }}
        onDelete={(p) => {
          void deletePhrase(p.id)
            .then(() => listPhrases().then(setPhrases))
            .catch(() => setPhraseError('This phrase could not be deleted.'));
        }}
        onMyWords={() => setSheet('words')}
        onClose={() => setSheet(null)}
      />
      <MyWordsSheet
        open={sheet === 'words'}
        scanning={overlayScanMode !== null}
        words={myWords}
        phrases={phrases.map((p) => p.text)}
        lexicon={lex}
        error={wordsError}
        onAdd={(raw) => addWord(raw, 'typed')}
        onRemove={removeWord}
        onImport={importPack}
        onClose={() => setSheet(null)}
      />
      <SpellSheet
        open={sheet === 'spell' && spell !== null}
        code={spell?.code ?? ''}
        word={spell?.word ?? null}
        capital={spell?.capital ?? false}
        known={(w) => !!lex?.has(w)}
        mine={(w) => myWords.some((x) => x.w === w)}
        scanning={overlayScanMode !== null}
        onUse={useSpelled}
        onClose={() => setSheet(null)}
      />
      <ConversationSheet
        open={sheet === 'conversation'}
        scanning={overlayScanMode !== null}
        focusTurnId={focusTurn}
        dictation={dictation}
        onSayAgain={sayAgain}
        onShow={(t: Turn) => setShow({ text: t.text, reason: t.who === 'me' ? 'You said' : 'They said' })}
        onAdded={() => say('Added to the conversation.')}
        onAnnounce={say}
        onClose={() => setSheet(null)}
        replyTypes={sheetGroup}
      />
      <ShowMode text={show?.text ?? null} reason={show?.reason ?? null} scanning={overlayScanMode !== null} onClose={() => setShow(null)} />
    </div>
  );
}
