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
import { BOS, CAPITALS, REPLY_INTENTS, encodeWord, keyFixes, normalize, rankCompletions, type KeyFix, type Candidate, type Lexicon, type ReplyIntent } from '@ninth/core';
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react';
import { EMPTY, LIMIT_MESSAGE, actionForKey, codesOf, composerReducer, limitFor, marksOf, openIndex as openIndexOf, startsOf, type ComposerState } from '@/lib/composer';
import { loadDictionary, type DictState } from '@/lib/data';
import { DecodeCache, buildRequest, decodeRemote, type RejectedSuggestion } from '@/lib/decodeClient';
import { decodeContext, recordMine, replyIntentFor, useConversation, type MeVia, type ThemVia, type Turn } from '@/lib/conversation';
import { focusContext, mapKey } from '@/lib/keyboard';
import {
  isShell,
  isTwoColumn,
  shiftQuery,
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
import { MAX_CANDIDATES, buildSentence, decodeAround, decodeWithPins, mergeCandidates, rankDelayMs, rankingLattice, readings, spellTarget } from '@/lib/sentence';
import { DEFAULT_SETTINGS, applyLook, readStoredLook, sanitizeSettings, stepScanMs, type Settings } from '@/lib/settings';
import { PIN_FULL, PIN_TOO_LONG, acceptReply, fitsQuickReply, quickReplies, replyCells, replyColumns, replyMeasurer, replyRows, sheetReplyRows, suggestionMode } from '@/lib/replies';
import { pickVoice, speak, speechSupported } from '@/lib/speech';
import {
  deleteMyWord,
  deletePhrase,
  importPhrases,
  listMyWords,
  listPhrases,
  loadSettings,
  markPhraseUsed,
  pinnedTexts,
  setPhrasePinned,
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
import { CardsSheet } from './CardsSheet';
import { SpeakBar, SpeakButton, editWords } from './SpeakBar';
import { SpellSheet } from './SpellSheet';
import { DID_YOU_MEAN, FINISH_THE_WORD, WordRow } from './WordRow';
import { PartnerStrip } from './PartnerStrip';
import { BAND_SHIFT, PARTNER_COMPACT_NO_HEADER_QUERY, partnerView } from '@/lib/partner';
import { FixSheet, type FixWord } from './FixSheet';

const CAPITAL_WORDS = Object.entries(CAPITALS).map(([w, display]) => ({ w, display }));
const ACTIONS = ['speak', 'clear', 'save', 'show', 'fix', 'spell'] as const;
/** How long a key shows that a quick repeat press was not counted (web-ui Req 30.4). No motion, one state change. */
export const IGNORED_MARK_MS = 700;
export const IGNORED_MESSAGE = 'Pressed again too quickly, so the second press was not counted. Accept delay in Settings changes this.';
/** Phones and tablets (stack, split): the action bar, left to right (web-ui Req 24). */
const PHONE_ACTIONS = ['menu', 'speak', 'show'] as const;
const KEYPAD_ROWS = KEY_ROWS.length; // 4
/**
 * Scan grid (web-ui Req 8.1, 16.1, 21.2): keypad rows first so any key is at most 4 + 3 = 7 steps
 * away (Keypad README), then Finish the word (web-ui Req 31.6; 0 cells, so skipped, unless words are
 * offered), then sentences, "Add to my words" offers (empty, so skipped, unless a word on
 * show is not in the person's words), the actions under the SpeakBar, and the header (Menu, or
 * Phrases / Voice / Settings on wide screens). Phone layout: the same rows, with the action row being
 * the action bar (Menu, Speak, Show) and the last row the sentence card's Clear (or Undo).
 */
/** Finish the word (web-ui Req 31.6): up to 3 words for the open word, right after the keys. */
export const WORD_ROW = KEYPAD_ROWS; // scan row 4
/** Sentences, or the quick replies while they hold the area (web-ui Req 28.6). */
export const CAND_ROW = KEYPAD_ROWS + 1; // scan row 5
export const OFFER_ROW = KEYPAD_ROWS + 2; // scan row 6
export const ACTION_ROW = KEYPAD_ROWS + 3; // scan row 7
export const MENU_ROW = KEYPAD_ROWS + 4; // scan row 8
/**
 * The conversation (web-ui Req 27.10): after the card's Clear on phones, after the header on laptops.
 * 0 cells under 640px (no header; the row is skipped), 1 for the header's They said button, up to 4 for
 * the strip (2 turns, They said, All), up to 6 for the laptop panel (3 turns, Listen, Type their line, All).
 */
export const THREAD_ROW = KEYPAD_ROWS + 5; // scan row 9
const WIDE_MENU = ['phrases', 'voice', 'settings'] as const;
/** A mark in words, for the polite region (web-ui Req 34.8). */
const MARK_WORDS: Record<string, string> = { '.': 'Full stop', '?': 'Question mark', '!': 'Exclamation mark', ',': 'Comma' };
function markSaid(m: string | undefined, word?: string): string {
  if (!m) return 'No mark.';
  return word ? `${MARK_WORDS[m]} after ${word}.` : `${MARK_WORDS[m]}.`;
}

type SheetName = 'cards' | 'menu' | 'settings' | 'voice' | 'phrases' | 'words' | 'spell' | 'sentences' | 'proof' | 'partner' | 'conversation' | 'fix' | null;
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
  const lastKeyAt = useRef<number | null>(null);
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
  // Capitals (web-ui Req 34.4) first, so the person's own spellings win.
  const display = useMemo(() => buildDisplayMap(CAPITAL_WORDS, myWords, [...spelled].map(([w, d]) => ({ w, display: d }))), [myWords, spelled]);
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
  const pins = useMemo(() => composer.slots.map((s) => s.pin), [composer.slots]);
  const remoteKey = DecodeCache.key(codes, decodeCtx.partner, decodeCtx.recent, decodeCtx.intent, pins);
  const llmActive = settings.llm && online && dict.status === 'ready';
  const remoteNow = llmActive && remote?.key === remoteKey ? remote : null;
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

  const say = useCallback((msg: string) => {
    setAnnounce('');
    // A fresh string each time so the same message is announced twice in a row.
    setTimeout(() => setAnnounce(msg), 30);
  }, []);

  // Finish the word (web-ui Req 31.1, 31.7): words that start with the open word's keys, ranked offline by
  // the word pair before; only words in the word-pair data, My words or the pack. Never sent anywhere.
  const openIndex = openIndexOf(composer);
  const openSlot = openIndex >= 0 ? composer.slots[openIndex] : undefined;
  const finishOn = settings.wordCompletion && settings.mode === 'letter' && dict.status === 'ready' && !!openSlot && !openSlot.pin && !composer.spoken;
  const prevWord = openIndex > 0 && !startsOf(composer).has(openIndex) ? (sentence.words[openIndex - 1]?.word ?? BOS) : BOS;
  const packWords = useMemo(() => new Set((dict.status === 'ready' ? (dict.pack?.words ?? []) : []).map((x) => normalize(x.w))), [dict]);
  const mineWords = useMemo(() => new Set(myWords.map((m) => m.w)), [myWords]);
  const completions = useMemo(() => {
    if (!finishOn || dict.status !== 'ready' || !openSlot) return [];
    const lm = dict.lm;
    const allow = (w: string) => lm.knows?.(w) === true || mineWords.has(w) || packWords.has(w);
    return rankCompletions(openSlot.code, prevWord, dict.lexicon, lm, { allow });
    // lexVersion: the lexicon was changed in place (addWords).
  }, [finishOn, dict, openSlot, prevWord, mineWords, packWords, lexVersion]);
  const finishWord = useCallback((word: string) => dispatch({ type: 'complete', word }), []);
  // Did you mean (web-ui Req 32.4, ADR-009): keys that spell nothing get up to 3 words one key away, in the
  // same places, when there is no word to finish. Never applied without a press.
  const dymIndex =
    completions.length === 0 && dict.status === 'ready' && settings.mode === 'letter' && !composer.spoken && composer.edit === undefined
      ? sentence.words.findIndex((w) => w.state === 'unspelled')
      : -1;
  const dymCode = dymIndex >= 0 ? composer.slots[dymIndex]?.code : undefined;
  const dymPrev = dymIndex > 0 ? (sentence.words[dymIndex - 1]?.word ?? BOS) : BOS;
  const dymNext = dymIndex >= 0 ? (sentence.words[dymIndex + 1]?.word ?? undefined) : undefined;
  const dym = useMemo<KeyFix[]>(
    () => (dymCode && dict.status === 'ready' ? keyFixes(dymCode, dymPrev, dict.lexicon, dict.lm, { next: dymNext }) : []),
    // lexVersion: the lexicon was changed in place (addWords).
    [dymCode, dymPrev, dymNext, dict, lexVersion],
  );
  /** Say a key change and make it (a Did you mean pick, or a word one key away in Fix a word). */
  const takeFix = useCallback(
    (index: number, fix: KeyFix) => {
      const old = composer.slots[index]?.code;
      if (!old) return;
      dispatch({ type: 'recode', index, word: fix.word });
      say(`${showWord(fix.word, display)}. Keys changed from ${old.split('').join(' ')} to ${fix.code.split('').join(' ')}.`);
    },
    [composer.slots, say, display],
  );
  /** The word row's words: words to finish, or Did you mean (web-ui Req 31, 32.4). */
  const rowKind: 'finish' | 'dym' | null = completions.length > 0 ? 'finish' : dym.length > 0 ? 'dym' : null;
  const rowWords = useMemo(() => (rowKind === 'finish' ? completions : rowKind === 'dym' ? dym.map((f) => f.word) : []), [rowKind, completions, dym]);
  const pickRowWord = useCallback(
    (word: string) => {
      if (rowKind === 'finish') return finishWord(word);
      const f = dym.find((x) => x.word === word);
      if (f && dymIndex >= 0) takeFix(dymIndex, f);
    },
    [rowKind, finishWord, dym, dymIndex, takeFix],
  );
  const dymAria = useCallback(
    (w: string) => {
      const f = dym.find((x) => x.word === w);
      return f ? `${showWord(w, display)}, keys ${f.code.split('').join(' ')}, ${editWords(f.edit)}` : showWord(w, display);
    },
    [dym, display],
  );

  // Model ranking (web-ui Req 30.1, 30.2): pinned words go as one-word slots, so ranking goes on after #
  // or a chosen sentence; an open word waits for a longer pause than a closed one.
  const rankLat = useMemo(
    () => (llmActive && dict.status === 'ready' ? rankingLattice(composer, dict.lexicon, settings.mode) : null),
    // lexVersion: the lexicon was changed in place (addWords).
    [llmActive, dict, composer, settings.mode, lexVersion],
  );
  const rankDelay = rankDelayMs(composer);
  useEffect(() => {
    if (!llmActive || dict.status !== 'ready' || !rankLat) return; // no keys, or a word with no reading yet
    const lat = rankLat;
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
    }, rankDelay);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // remoteKey stands for the context (partner, recent lines and reply type).
  }, [llmActive, dict, codes, remoteKey, settings.mode, rankLat, rankDelay, ghost]);

  // ---- actions --------------------------------------------------------------------------------

  const nextReading = useCallback(() => {
    if (!lex || composer.slots.length === 0) return;
    // # cycles the word being retyped (web-ui Req 32.3), else the last word.
    const index = composer.edit ?? composer.slots.length - 1;
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
      if (!a) return;
      // The partner strip turns to "Typing…" on a key (web-ui Req 33.2); only the time is kept, in memory.
      lastKeyAt.current = Date.now();
      // The 17th letter of a word or the 21st word is not added; say why, politely (web-ui Req 30.3).
      const limit = limitFor(composer, a);
      if (limit) return say(LIMIT_MESSAGE[limit]);
      // A retype ended before any key keeps the old word (web-ui Req 32.3).
      if (composer.edit !== undefined && composer.editFresh && (a.type === 'space' || a.type === 'back')) {
        const old = sentence.words[composer.edit];
        if (old) say(`${sentence.tokens[composer.edit]?.replace(/[.?!,]+$/, '') || old.code} kept.`);
      }
      // Key 1 and Back on a mark say it in words (web-ui Req 34.8).
      if (a.type === 'punct' && composer.slots.length > 0) {
        const after = composerReducer(composer, a);
        const at = composer.edit !== undefined && !composer.editFresh ? composer.edit : after.slots.length - 1;
        say(markSaid(after.slots[at]?.punct, sentence.tokens[at]?.replace(/[.?!,]+$/, '')));
      } else if (a.type === 'back' && !composer.open && composer.edit === undefined && composer.slots[composer.slots.length - 1]?.punct) {
        say('Mark removed.');
      }
      dispatch(a);
    },
    [nextReading, composer, say, sentence.words, sentence.tokens],
  );

  /**
   * Pointer and touch presses: a repeat of the same key inside the accept delay is a tremor and is not
   * counted (web-ui Req 7.2). The key shows it was not counted (web-ui Req 30.4); only the first such press
   * of a visit is announced, so a shaky hand does not hear it every time.
   */
  const [ignoredKey, setIgnoredKey] = useState<{ id: string; n: number } | null>(null);
  const ignoredSaid = useRef(false);
  useEffect(() => {
    if (!ignoredKey) return;
    const t = setTimeout(() => setIgnoredKey(null), IGNORED_MARK_MS);
    return () => clearTimeout(t);
  }, [ignoredKey]);
  const pressKeyPointer = useCallback(
    (def: KeyDef) => {
      const now = Date.now();
      const last = lastPointerKey.current;
      if (last && last.id === def.id && now - last.at >= 0 && now - last.at < settings.acceptDelayMs) {
        setIgnoredKey((k) => ({ id: def.id, n: (k?.n ?? 0) + 1 }));
        if (!ignoredSaid.current) {
          ignoredSaid.current = true;
          say(IGNORED_MESSAGE);
        }
        return;
      }
      lastPointerKey.current = { id: def.id, at: now };
      pressKey(def);
    },
    [pressKey, settings.acceptDelayMs, say],
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
  // Fix a word (web-ui Req 32.1): any word of a sentence that is typed and not yet spoken.
  const canFix = dict.status === 'ready' && codes.length > 0 && !composer.spoken;
  const openFix = useCallback(() => {
    if (canFix) setSheet('fix');
  }, [canFix]);
  const fixWords = useMemo<FixWord[]>(
    () => sentence.words.map((w, i) => ({ label: sentence.tokens[i]?.replace(/[.?!,]+$/, '') || w.word || w.partial || w.code, code: w.code, mark: composer.slots[i]?.punct })),
    [sentence.words, sentence.tokens, composer.slots],
  );
  const fixReadings = useCallback(
    (i: number) => {
      const w = sentence.words[i];
      return lex && w ? readings(lex, w.code, settings.mode).filter((r) => r !== w.word) : [];
    },
    [lex, sentence.words, settings.mode],
  );
  const fixFixes = useCallback(
    (i: number) => {
      const w = sentence.words[i];
      if (dict.status !== 'ready' || !w || settings.mode !== 'letter') return [];
      const prev = i > 0 ? (sentence.words[i - 1]?.word ?? BOS) : BOS;
      return keyFixes(w.code, prev, dict.lexicon, dict.lm, { next: sentence.words[i + 1]?.word ?? undefined });
    },
    [dict, sentence.words, settings.mode],
  );
  const openSpell = useCallback((at?: number) => {
    if (!canSpell) return;
    const i = typeof at === 'number' ? at : spellTarget(sentence.words);
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
  // The partner strip (web-ui Req 33.5): full, compact or none by the visible height; with a band the shells
  // follow today's height rules at the height left (shiftQuery, and the .app--partner-* rules in app.css).
  const bandFull = useMediaQuery(layout === 'split' ? '(min-height: 752px)' : '(min-height: 740px)');
  const bandCompact = useMediaQuery(layout === 'split' ? '(min-height: 688px)' : '(min-height: 640px)');
  const band: 'none' | 'compact' | 'full' = settings.partnerStrip === 'off' ? 'none' : !phone ? 'full' : bandFull ? 'full' : bandCompact ? 'compact' : 'none';
  const bandShift = !phone || band === 'none' ? 0 : band === 'compact' ? BAND_SHIFT.compact : layout === 'split' ? BAND_SHIFT.fullSplit : BAND_SHIFT.full;
  const stackRows = stackSuggestionRows({
    r2: useMediaQuery(shiftQuery(STACK_ROWS_QUERIES.r2, bandShift)),
    r3: useMediaQuery(shiftQuery(STACK_ROWS_QUERIES.r3, bandShift)),
    r4: useMediaQuery(shiftQuery(STACK_ROWS_QUERIES.r4, bandShift)),
    short: useMediaQuery(shiftQuery(STACK_SHORT_QUERY, bandShift)),
  });
  // The sentence opens Fix a word only where it is at least 56px tall (accessibility rule 1): not on stack screens
  // whose card has one 48px line (under 680px, moved up by a partner band); Menu > Fix a word is the way there.
  const oneLineCard = useMediaQuery(shiftQuery('(max-height: 679px)', bandShift)) && layout === 'stack';
  const fixOnCard = canFix && !oneLineCard;
  const splitRows = splitSuggestionRows({ r3: useMediaQuery(shiftQuery(SPLIT_ROWS_QUERIES.r3, bandShift)), r4: useMediaQuery(shiftQuery(SPLIT_ROWS_QUERIES.r4, bandShift)) });
  const sugRows = layout === 'split' ? splitRows : stackRows;
  const unspelledWord = sentence.words.find((w) => w.state === 'unspelled');
  // One contextual row, in this order: spell a word the dictionary lacks, or add a word to my words.
  // A short phone has no suggestion row (Req 24.9): Sentences and Spell this word are in Menu.
  const noSugRow = phone && sugRows === 0;
  // Finish the word (web-ui Req 31.5): on the shells it takes the area's last row, by the keys (the only row
  // on a 1-row phone, with Sentences in Menu); on a short phone it is in Menu; laptops get their own row.
  const wordRowShown = rowWords.length > 0 && !noSugRow;
  const wordsInMenu = rowWords.length > 0 && noSugRow;
  const sentRows = phone && wordRowShown ? sugRows - 1 : sugRows;
  // A 1-row phone keeps Spell beside Did you mean: 2 words and "Spell 7532573" (web-ui Req 32.4).
  const rowSpell =
    rowKind === 'dym' && phone && wordRowShown && sentRows === 0 && canSpell && dymIndex >= 0 && dymCode ? { label: `Spell ${dymCode}`, onClick: () => openSpell(dymIndex) } : null;
  const rowShownWords = rowSpell ? rowWords.slice(0, 2) : rowWords;
  const rowCells = wordRowShown ? rowShownWords.length + (rowSpell ? 1 : 0) : 0;
  const spellOffer: { label: string; icon: 'spell' | 'plus'; onClick: () => void } | null = !phone || noSugRow || sentRows === 0
    ? null
    : canSpell && unspelledWord && sentence.candidates.length === 0
      ? { label: `Spell ${unspelledWord.code}`, icon: 'spell', onClick: openSpell }
      : offers[0]
        ? { label: `Add ${offers[0].label} to my words`, icon: 'plus', onClick: () => addOffer(offers[0]!.word) }
        : null;
  const sug: ReturnType<typeof phoneSuggestions> = noSugRow || sentRows === 0
    ? { items: [], more: false }
    : phoneSuggestions(sentence.candidates, sentence.selectedIndex, spellOffer ? sentRows - 1 : sentRows, composer.punct, display, marksOf(composer));
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

  // ---- quick replies (web-ui Req 28, 35.1) -------------------------------------------------------------
  // The person's pinned phrases first (pin order), then the usual replies, 5 in all, in every place they show.
  const pinned = useMemo(() => pinnedTexts(phrases), [phrases]);
  const replyTexts = useMemo(() => quickReplies(pinned), [pinned]);
  const sheetRows = useMemo(() => sheetReplyRows(replyTexts), [replyTexts]);
  const replyCols = phone ? replyColumns(replyTexts) : 3;
  const pinPhrase = useCallback(
    (p: Phrase, on: boolean) => {
      if (on && !fitsQuickReply(p.text, replyMeasurer())) return say(PIN_TOO_LONG);
      if (on && pinned.length >= 5) return say(PIN_FULL);
      void setPhrasePinned(p.id, on)
        .then((ok) => {
          if (!ok) return say(on ? PIN_FULL : 'This phrase could not be changed.');
          say(on ? 'Pinned to quick replies.' : 'Unpinned.');
          return listPhrases().then(setPhrases);
        })
        .catch(() => setPhraseError('This phrase could not be changed.'));
    },
    [pinned.length, say],
  );
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
    () => (phone ? replyRows(sugRows, slotCells, false, replyTexts, replyCols) : layout === 'wide' ? replyRows(1, slotCells, true, replyTexts) : replyRows(3, slotCells, false, replyTexts)),
    [phone, sugRows, slotCells, layout, replyTexts, replyCols],
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
    // Nothing typed: Show opens the cards (web-ui Req 35.2).
    if (codes.length === 0) {
      setSheet('cards');
      return;
    }
    if (!sentence.speakable || !sentence.text) return;
    setShow({ text: sentence.text, reason: null });
    recordMine(sentence.text, 'shown');
  }, [sentence.speakable, sentence.text, codes.length]);
  /** A card or phrase shown big (web-ui Req 35.2): a "you said" turn (shown), never spoken. */
  const showCard = useCallback((text: string) => {
    setSheet(null);
    setShow({ text, reason: null });
    recordMine(text, 'shown');
  }, []);

  // ---- the conversation on the main screen (web-ui Req 27.4-27.6) ------------------------------------
  const threadView = threadRows(layout, { tall: useMediaQuery(shiftQuery(STACK_THREAD_QUERY, bandShift)), noHeader: useMediaQuery(band === 'compact' && layout === 'stack' ? PARTNER_COMPACT_NO_HEADER_QUERY : shiftQuery(STACK_NO_HEADER_QUERY, bandShift)) });
  // What the band shows: never the words before Speak, only "Typing…" (web-ui Req 33.3).
  const strip = partnerView({ typing: composer.slots.length > 0 && !composer.spoken, lastKeyAt: lastKeyAt.current, newest: conv.turns[conv.turns.length - 1] ?? null });
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
  const actionsRef = useRef({ fixOnCard, openFix, rowShownWords, pickRowWord, rowSpell, pressKey, selectCandidate, speakNow, clearAll, saveCurrent, showCurrent, openSheet, sentenceToggle, layout, openSpell, offers, addOffer, phone, sug, spellOffer, openSentences, undo, undoClear, threadView, newestFirst, bubbleTurn, threadShown, openConversation, openPartner, replyList, chooseReplyCell, groupCells, toggleIntent });
  actionsRef.current = { fixOnCard, openFix, rowShownWords, pickRowWord, rowSpell, pressKey, selectCandidate, speakNow, clearAll, saveCurrent, showCurrent, openSheet, sentenceToggle, layout, openSpell, offers, addOffer, phone, sug, spellOffer, openSentences, undo, undoClear, threadView, newestFirst, bubbleTurn, threadShown, openConversation, openPartner, replyList, chooseReplyCell, groupCells, toggleIntent };
  const scanner = useScanner({
    mode: scanMode,
    rows: phone
      ? [...KEY_ROWS.map((r) => r.length), rowCells, showReplies ? replyList.length : phoneCandCells, 0, PHONE_ACTIONS.length, fixOnCard ? 2 : 1, threadCells]
      : [...KEY_ROWS.map((r) => r.length), rowCells, replyList.length + groupCells + candCells, offers.length, ACTIONS.length, menuCells, threadCells],
    loops: settings.scanLoops,
    scanMs: settings.scanMs,
    acceptDelayMs: settings.acceptDelayMs,
    paused: overlayOpen,
    onChoose: (row, cell) => {
      const a = actionsRef.current;
      if (row < KEYPAD_ROWS) {
        const def = KEY_ROWS[row]?.[cell];
        if (def) a.pressKey(def);
      } else if (row === WORD_ROW) {
        const w = a.rowShownWords[cell];
        if (w) a.pickRowWord(w);
        else a.rowSpell?.onClick();
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
        // The card's row: the sentence (Fix a word) while there is one, then Clear or Undo (web-ui Req 32.1).
        if (a.fixOnCard && cell === 0) a.openFix();
        else if (a.undo) a.undoClear();
        else a.clearAll();
      } else if (row === ACTION_ROW) {
        const act = ACTIONS[cell];
        if (act === 'speak') a.speakNow();
        else if (act === 'clear') a.clearAll();
        else if (act === 'save') a.saveCurrent();
        else if (act === 'show') a.showCurrent();
        else if (act === 'fix') a.openFix();
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
  // Alt+Shift+1-3 and numpad + only while the word row is on screen (web-ui Req 31.6).
  const shownWords = wordRowShown ? rowShownWords : [];
  const handlers = useRef({ pressKey, speakNow, moveSelection, selectCandidate, scanner, sheetScanner, overlayScanMode, access: settings.access, overlayOpen, sentencesHidden, shownWords, finishWord: pickRowWord });
  handlers.current = { pressKey, speakNow, moveSelection, selectCandidate, scanner, sheetScanner, overlayScanMode, access: settings.access, overlayOpen, sentencesHidden, shownWords, finishWord: pickRowWord };
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
        case 'complete': {
          const w = h.shownWords[intent.index];
          if (w) h.finishWord(w);
          break;
        }
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
    // With words to finish the open word, they are read after the sentence (web-ui Req 31.6), once typing pauses.
    const words = wordRowShown ? rowShownWords.map((w) => showWord(w, display)) : [];
    const end = /[.?!,]$/.test(sentence.text) ? '' : '.';
    const said = !sentence.text
      ? ''
      : words.length === 0
        ? `Sentence: ${sentence.text}`
        : rowKind === 'dym'
          ? `Sentence: ${sentence.text}${end} No word has these keys. Did you mean: ${words.join(', ')}?`
          : `Sentence: ${sentence.text}${end} Words: ${words.join(', ')}.`;
    const t = setTimeout(() => setSpokenLive(said), 600);
    return () => clearTimeout(t);
  }, [sentence.text, wordRowShown, rowShownWords, rowKind, display]);

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
          : rowKind === 'dym' && dymCode
            ? `No word has these keys: ${dymCode}. Pick a word above, spell it, or press Back.`
            : sentence.words.some((w) => w.state === 'unspelled')
            ? `Not in your words yet: ${sentence.words
                .filter((w) => w.state === 'unspelled')
                .map((w) => w.code)
                .join(', ')}. Spell this word to choose its letters, or press Back.`
            : 'No sentence matches these keys yet. Keep typing, or press Back.';

  const alternatives = (i: number) => [...new Set(sentence.candidates.map((c) => c.words[i]).filter((w): w is string => !!w))];
  const quickPhrases = dict.status === 'ready' ? (dict.pack?.phrases ?? []) : [];
  const actionLit = (i: number) => scanRow === ACTION_ROW && litCell === i;

  const wordRowEl = (
    <WordRow
      words={rowShownWords}
      display={display}
      onPick={pickRowWord}
      scanning={scanRow === WORD_ROW}
      litIndex={scanRow === WORD_ROW ? litCell : -1}
      title={rowKind === 'dym' ? DID_YOU_MEAN : FINISH_THE_WORD}
      ariaFor={rowKind === 'dym' ? dymAria : undefined}
      extra={rowSpell}
    />
  );
  const phoneSugEl = (rows: number) => (
    <PhoneSuggestions
      items={sug.items}
      more={sug.more}
      spell={spellOffer}
      emptyText={dict.status === 'missing' || dict.status === 'error' ? 'Dictionary not loaded. Reload to try again.' : codes.length === 0 ? 'Sentences for your keys appear here.' : null}
      rows={rows}
      scanning={scanRow === CAND_ROW}
      litIndex={scanRow === CAND_ROW ? litCell : -1}
      onSelect={selectCandidate}
      onMore={openSentences}
    />
  );
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
          retype={composer.edit !== undefined}
          onFix={fixOnCard ? openFix : undefined}
          fixLit={fixOnCard && scanRow === MENU_ROW && litCell === 0}
          extra={
            undo ? (
              <Button variant="secondary" onClick={undoClear} lit={scanRow === MENU_ROW && litCell === (fixOnCard ? 1 : 0)} className="phone-card__undo">
                Undo
              </Button>
            ) : (
              <Button
                variant="secondary"
                icon="x"
                onClick={clearAll}
                disabled={codes.length === 0}
                lit={scanRow === MENU_ROW && litCell === (fixOnCard ? 1 : 0)}
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
          retype={composer.edit !== undefined}
          onFix={canFix ? openFix : undefined}
        />
        <div className="speak-actions">
          <Button variant="secondary" icon="x" onClick={clearAll} disabled={codes.length === 0} lit={actionLit(1)}>
            Clear
          </Button>
          <Button variant="quiet" icon="save" onClick={saveCurrent} disabled={!sentence.speakable} lit={actionLit(2)} aria-label="Save phrase">
            Save<span className="save-btn__more"> phrase</span>
          </Button>
          <Button variant="quiet" icon="show" onClick={showCurrent} disabled={codes.length > 0 && !sentence.speakable} lit={actionLit(3)}>
            Show
          </Button>
          <Button variant="secondary" icon="edit" onClick={openFix} disabled={!canFix} lit={actionLit(4)} data-action="fix-word">
            Fix a word
          </Button>
          <Button variant="secondary" icon="spell" onClick={() => openSpell()} disabled={!canSpell} lit={actionLit(5)} aria-label="Spell this word" data-action="spell">
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
            columns={replyCols}
          />
        ) : wordRowShown ? (
          // Finish the word takes the area's last row; the sentence rows keep the rows above (web-ui Req 31.5).
          <div className="sugg-split">
            {sentRows > 0 ? phoneSugEl(sentRows) : null}
            {wordRowEl}
          </div>
        ) : (
          phoneSugEl(sugRows)
        )}
      </div>
    ) : (
      <div key="cands" className="order-cands" data-section="cands">
        {/* Laptops: Finish the word (or Did you mean) under the SpeakBar, above the reply types and the sentences (web-ui Req 31.5). */}
        {wordRowShown ? wordRowEl : null}
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
              marks={marksOf(composer)}
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
              marks={marksOf(composer)}
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
              marks={marksOf(composer)}
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
          ignoredKey={ignoredKey?.id ?? null}
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
        <Button variant="quiet" icon="show" onClick={showCurrent} disabled={codes.length > 0 && !sentence.speakable} lit={actionLit(2)}>
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
          Your keyboard works too: <kbd>0</kbd>–<kbd>9</kbd>, <kbd>*</kbd> and <kbd>#</kbd>. <kbd>Enter</kbd> speaks, <kbd>Backspace</kbd> goes back, arrows and <kbd>Alt</kbd>+<kbd>1</kbd>–<kbd>5</kbd> pick a sentence, <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>1</kbd>–<kbd>3</kbd> finish the word.
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
    <div className={[`app app--${layout}`, phone ? 'app--shell' : '', band !== 'none' ? `app--partner-${band}` : ''].filter(Boolean).join(' ')} onPointerDown={onBackgroundPointer}>
      <a className="nl-skip" href="#keypad">
        Skip to the keypad
      </a>
      <div className="app__inner">
        {band !== 'none' ? <PartnerStrip view={strip} band={band} flipped={settings.partnerStrip === 'facing'} /> : null}
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
                // Short phones, while the replies hold the area after Speak, and while Finish the word holds a
                // 1-row phone's only row (web-ui Req 24.9, 28.5, 31.5).
                onSentences: noSugRow || (showReplies && sentence.candidates.length > 0) || (wordRowShown && sentRows === 0 && sentence.candidates.length > 0) ? openSentences : undefined,
                // Short phones (no suggestion row): Finish the word or Did you mean is a group here (web-ui Req 31.5, 32.4).
                words: wordsInMenu ? (
                  <WordRow
                    variant="menu"
                    words={rowWords}
                    display={display}
                    title={rowKind === 'dym' ? DID_YOU_MEAN : FINISH_THE_WORD}
                    ariaFor={rowKind === 'dym' ? dymAria : undefined}
                    onPick={(w) => {
                      pickRowWord(w);
                      setSheet(null);
                    }}
                  />
                ) : null,
                onFix: canFix ? () => setSheet('fix') : undefined,
                onProof: () => setSheet('proof'),
                onPartner: () => setSheet('partner'),
                onConversation: () => openConversation(null),
              }
            : null
        }
        about={phone ? NOT_A_MEDICAL_DEVICE : null}
        replyRows={sheetRows}
        onCards={() => setSheet('cards')}
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
              marks={marksOf(composer)}
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
        partnerTooShort={phone && band === 'none'}
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
        replyRows={sheetRows}
        onPin={pinPhrase}
        onClose={() => setSheet(null)}
      />
      <CardsSheet open={sheet === 'cards'} scanning={overlayScanMode !== null} phrases={phrases.map((p) => p.text)} onShow={showCard} onClose={() => setSheet(null)} />
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
      <FixSheet
        open={sheet === 'fix'}
        scanning={overlayScanMode !== null}
        words={fixWords}
        readingsFor={fixReadings}
        fixesFor={fixFixes}
        showWord={(w) => showWord(w, display)}
        onReading={(i, w) => {
          const old = fixWords[i]?.label ?? '';
          dispatch({ type: 'pin', index: i, word: w });
          say(`${showWord(w, display)} in place of ${old}.`);
          setSheet(null);
        }}
        onFix={(i, f) => {
          takeFix(i, f);
          setSheet(null);
        }}
        onRetype={(i) => {
          dispatch({ type: 'edit', index: i });
          say(`Retype ${fixWords[i]?.label ?? ''}: type its keys, then press 0.`);
          setSheet(null);
        }}
        onSpell={(i) => openSpell(i)}
        onMark={(i, m) => {
          dispatch({ type: 'mark', index: i, punct: m });
          say(markSaid(m, fixWords[i]?.label));
        }}
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
