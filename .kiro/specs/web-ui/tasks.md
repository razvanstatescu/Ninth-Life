# Tasks: web-ui

## Foundations
- [x] 1. `scripts/gen-tokens.mjs`: tokens.json → `styles/tokens.css`, both themes + system, aliases and shadows (Req 10.1)
  - [x] 1.1 Test: aliases resolved per theme, committed file matches generator (Req 10.1)
- [x] 2. Port `bundle.css` to `styles/components.css`; self-host Atkinson Hyperlegible Next and Mono (OFL) in `public/fonts` (Req 9.2, 13.3)
- [x] 3. Theme boot script and `data-theme` / `data-keysize` on `<html>` (Req 10.1, 10.4, 7.3)
- [x] 4. `scripts/copy-data.mjs` and `lib/data.ts` with ready / missing / error states (Req 5.3)

## Composition and decoding
- [x] 5. `lib/composer.ts` reducer for 2-9, 0, *, #, 1, select, clear, spoken (Req 1.2-1.6, 1.9, 2.3)
  - [x] 5.1 Tests: codes, back, punctuation cycle, selection becomes pins, sentence stays after Speak
- [x] 6. `lib/sentence.ts`: `decodeWithPins`, `buildSentence`, partial words, readings (Req 1.5, 1.7, 1.8, 2.5, 3.1)
  - [x] 6.1 Tests: every candidate validates; pins honoured; unfinished word blocks Speak (P1)
- [x] 7. Components: Keypad/Key, SpeakBar, CandidateList, ProofChip/ProofPanel (Req 1.1, 1.7, 2.1, 2.4, 3.1-3.3)
  - [x] 7.1 Tests: 12 real buttons and labels; chip icon + state text; SpeakBar empty state

## Speech
- [x] 8. `lib/speech.ts`: voice sort (on-device first), `loadVoices` with `voiceschanged`, chunking, synchronous `speak` (Req 4.1-4.4)
  - [x] 8.1 Tests: sort, pick, chunking
- [x] 9. Show mode when there is no voice or speech fails (Req 4.5)
- [x] 10. Settings: voice picker, speed, pitch, Test voice (Req 4.6)

## Access
- [x] 11. Keyboard map and routing by focus context (Req 6.1-6.5)
  - [x] 11.1 Tests: digits, numpad, Enter/Space by context, Alt+1..5, switch keys
- [x] 12. Touch: accept-delay debounce on repeated taps; L/XL key size (Req 7.1-7.3)
- [x] 13. `lib/useScanner.ts` on `scanReducer`: timer, debounce, pause on overlays (Req 8.3, 8.4, 8.7; access-modes Req 4.1-4.3)
  - [x] 13.1 Tests: auto scan, empty row skipped, pause after loops, step scan never ticks (P4)
- [x] 14. Scan grid rows → keypad, sentences, actions, header; `is-scanning` / `is-lit`; whole-page switch press; ScanBar (Req 8.1, 8.2, 8.5, 8.6)

## Model ranking, offline, storage
- [x] 15. `lib/decodeClient.ts`: request within limits, 1,500 ms timeout, re-validation, LRU (Req 12.2-12.4)
  - [x] 15.1 Tests: timeout and error fallbacks (P2); invalid suggestions rejected
  - [x] 15.2 Screen test: rejected word shown, nothing spoken (P3, Req 3.4, 12.5)
- [x] 16. `app/api/decode/route.ts`: production route over `@ninth/decoder` `createFetchHandler` (`LLM_ENABLED` kill switch, Origin check, 4 KB limit, salted IP hash) (Req 12.6)
- [x] 17. Serwist `app/sw.ts`: precache shell, fonts, icons, `/data/**`; decode network-only (Req 5.1, 5.4)
- [x] 18. Offline indicator pill (Req 5.2)
- [x] 19. Phrases in IndexedDB on Save phrase only; delete with confirm (Req 13.1); "They said" in memory only (Req 13.2)
- [x] 20. Manifest and icons from the logo SVGs, favicon variant below 48px

## Copy and checks
- [x] 21. About page and footer statement; copy reviewed against the Write / Not table (Req 14.1-14.3)
- [x] 22. Playwright pass at 1440x1000 and 390x844, Night and Day: targets, text size, real controls, focus ring, ember count (P5, Req 9.1-9.3, 10.2, 10.3)
- [ ] 23. Add `@axe-core/playwright` to CI once the e2e job exists (accessibility steering)
- [ ] 24. Contrast audit of app-only pieces (pills, range thumb, seg radios) with a tool, both themes (Req 10.1)
- [ ] 25. Screen reader walkthrough (VoiceOver iOS, NVDA) of typing, choosing and speaking (Req 2.4, 3.3)

## M1 review follow-ups (F1, F3, F4, F6)
- [x] 26. `lib/layout.ts`: `sectionOrder`, `visibleSentences`, `useLayout` (960px); compact DOM order and CSS `order`
      fallback for the static HTML; height-aware key size (Req 15.1, 15.4-15.7)
  - [x] 26.1 Tests: compact and wide order, 3 sentences + More, chosen 4th opens the list (`test/layout.test.ts`, `test/m1b.test.tsx`)
- [x] 27. Compact header: one summary pill (`lib/status.ts`) and Menu; `MenuSheet` with Phrases, Voice, Settings and full status (Req 15.2, 15.3)
  - [x] 27.1 Tests: one pill, one Menu, Menu opens the three sheets; summary wording
- [x] 28. Header scan row and Show in the actions row; keypad-first order kept and the access-modes spec updated (Req 8.1, 16.1; F3)
- [x] 29. `lib/useOverlayScan.ts`: `data-scan-row` rows in sheets and show mode on `scanReducer`, Close first, auto start,
      `data-scan-state` highlight, Space/Enter and backdrop as the switch, latched mode, no focus ring (Req 16.2-16.6)
  - [x] 29.1 Settings: slider buttons (Faster/Slower, Lower/Higher, Shorter/Longer, Fewer/More), Previous/Next voice (Req 16.3)
  - [x] 29.2 Tests: header row → Settings → scan speed by switch; scanning off and back on inside the sheet; Touch turns it
        off on close; Menu sheet by switch; one ember thing (`test/m1b.test.tsx`), `autoStart`/`resetKey` (`test/scanner.test.tsx`)
- [x] 30. Quick phrases from the pack in the Phrases sheet: 12 then More, rows of 4 (Req 17.1-17.3)
  - [x] 30.1 Tests: list, More, tap shows/speaks, voice path, switch path through show mode
- [x] 31. Playwright pass at 390x844, 360x740 and 1440x1000, Night and Day, and scanning inside Settings (Req 15.5, 9.1, 9.2)

## Speech robustness (Req 18)
- [x] 32. `lib/speech.ts`: lossless chunker at sentence, clause and word boundaries, never mid-word; rate-aware chunk
      limit; one chunk at a time with references held; per-chunk watchdog; supersede and stop settle once; cancel only
      when busy; error reported once by type (Req 18.1-18.3, 18.8-18.12)
  - [x] 32.1 Voice choice: language first, novelty and very low quality voices last, on-device before online, exact
        region; remembered voice only if it speaks the language; tag normalization; Safari's all-default flag (Req 18.4, 18.5, 18.13)
  - [x] 32.2 `lib/useVoices.ts`: ignore an early empty `voiceschanged`; re-check the list 5 times after an empty wait (Req 18.6, 18.7)
  - [x] 32.3 Tests with a fake `speechSynthesis`: `test/speech-robustness.test.ts` (43 tests, names carry the Req IDs,
        including a 400-text chunking property) and `test/speech.test.ts`
- [ ] 33. Device check by hand of Req 18 on Chrome desktop (a network voice, rate 0.5, a 600-character text), Safari on
      iPhone (first Speak, then Speak again while speaking), Chrome on Android, Edge on Windows; log results in
      `docs/research/web-speech.md` (Req 18.2, 18.3, 18.8, 18.10)
- [ ] 34. Pass `lang` from the active pack to `pickVoice` in the screen and Settings when ro/es packs land (Req 18.4; owner of the components)

## Your words: spell mode, unknown keys, my words, word packs (Req 19-22)
- [x] 35. `lib/spell.ts` (letters per key, start letters, `spelledWord` checked with `encodeWord`) and
      `components/SpellSheet.tsx`: radio rows per key, 1-4 / arrows / Enter, switch rows, capital switch (Req 19.1-19.7)
  - [x] 35.1 Tests: letters per key, 2,000 random codes and choices all encode to their code, start letters
        (`test/words.test.ts`); keyboard, arrows and two-switch spelling on the screen (`test/spell.test.tsx`)
- [x] 36. `lib/sentence.ts` `decodeAround` (beam with a placeholder in empty slots), `unspelled` word state and chip,
      `spellTarget`; sentence list and proof copy (Req 20.1-20.4)
  - [x] 36.1 Tests: known words ranked around a hole, not spelled yet blocks Speak, spelled pin gives valid sentences,
        typing more drops the pin
- [x] 37. `lib/myWords.ts` (fold, display map, merge, `applyMyWords`), IndexedDB store `words` (DB v2),
      "Add to my words" offers as scan row 5, `components/MyWordsSheet.tsx` from Phrases and Menu, remove rebuilds the
      dictionary (Req 21.1-21.6)
  - [x] 37.1 Tests: boosted words rank and match, display map only changes text, restore on load, remove with confirm,
        helper-typed word with capitals
- [x] 38. `lib/vocabPack.ts`: schema check, plan, export, link fetch; preview in My words (Req 22.1-22.5);
      format in `docs/architecture/vocab-packs.md`
  - [x] 38.1 Tests: valid pack, every shape error, skipped entries with reasons, plan, export round trip, links, fetch
        options
- [x] 39. e2e `test/e2e/spell.mjs`: "hi" + 64424, spell "Mihai" by keyboard and by one switch, add, reload, ranks
      first; axe on the new states at 390 and 1440, Night and Day (Req 19-21, 9, 10)
- [ ] 40. Screen reader pass of spell mode (VoiceOver iOS, NVDA): radio rows, live preview, offers (Req 19.2, 21.2)

## Loading performance and scan-off confirm (plan F9, F11)
- [x] 41. `components/SettingsSheet.tsx`: "Turn off switch scanning?" in place of the settings, Cancel first, row right
      after Close; asked only when the sheet scans and the choice turns scanning off (Req 16.7)
  - [x] 35.1 Tests: `test/scan-off-confirm.test.tsx` (switch Cancel and Turn off, tap, Close while asking, no question
        between scan modes or when not scanning, focus on the question); `test/m1b.test.tsx` Req 16.4 answers it
- [x] 42. `lib/data.ts`: parallel fetch, `en.v2.json`, `dataUrl()` content-hashed URLs, idle warm-up in steps (Req 23.1-23.3)
  - [x] 36.1 Tests: `test/data.test.ts` (all three requested before any arrives, failures, old export names, warm-up order, `whenIdle`)
- [x] 43. `next.config.mjs`: `NEXT_PUBLIC_DATA_REV`, `/data` precached at `?v=` with `revision: null`, trimmed public
      entries and build chunks (Req 23.2, 23.4)
- [x] 44. `scripts/perf-check.mjs`: v2 timing with a v1 comparison row, real service-worker install bytes and re-fetched
      data files; before/after medians in `docs/testing/performance.md` (Req 23.5)
- [ ] 45. Re-measure on a real low-end Android phone and a school Chromebook before quoting the numbers (Req 23.5)

## Phones and tablets: phone-first screen, one screen, portrait-only phones (Req 4.7, 15.8-15.11, 24, 25; ADR-003)
Built 2026-11-09. Research: `docs/research/mobile-layout.md`,
`mobile-patterns-mobbin.md`, `mobile-aac-evidence.md`, `one-screen-tablets.md`.
- [x] 46. Mobile basics: svh key sizing, safe areas (`viewport-fit=cover`), no pull-to-refresh or double-tap zoom, pinch
      zoom kept, fixed-height sentence box so the keypad never moves (Req 15.8, 15.10, 15.11)
  - [x] 46.1 Tests: `test/mobile.test.tsx` (svh not dvh, safe areas, zoom, touch-action); `test/e2e/responsive.mjs`
- [x] 47. Phone-first screen: `stack` layout, sentence card with Clear then Undo (`composer` `restore`), one-line
      suggestion rows (`components/PhoneSuggestions.tsx`), keypad filling the width, action bar [Menu] [Speak] [Show],
      disabled Speak outlined, scan rows following the screen (Req 24.1-24.8)
  - [x] 47.1 Tests: `test/phone.test.tsx` (24.1-24.8), `test/layout.test.ts` (section order, rows by height),
        `test/e2e/keyboard.mjs` (phone selection)
- [x] 48. Show mode Flip: toggle with `aria-pressed` after Done in the same scan row, CSS rotation, opens unflipped (Req 4.7)
  - [x] 48.1 Tests: `test/showmode.test.tsx`
- [x] 49. One screen on touch devices: `chooseLayout` by `pointer: coarse`, orientation and the screen's shorter side;
      `split` for tablets in landscape, `rotate` for phones held sideways (`components/RotateNotice.tsx`,
      `usePortraitLock`); keys sized from the measured keypad box (ResizeObserver `--pad-w`/`--pad-h`); proof,
      They said and sentences in sheets; Menu "This sentence" and About groups; Scanning pill (Req 25.1-25.7)
  - [x] 49.1 Tests: `test/layout.test.ts` (chooseLayout, split order, row counts), `test/mobile.test.tsx` (split shell,
        rotate), `test/phone.test.tsx` (Menu groups), `test/footer.test.tsx`
  - [x] 49.2 `test/e2e/responsive.mjs`: 24 measured phone and tablet sizes, both orientations; no page scroll, every
        control on screen, 72px keys, 56px targets, 16px text, keypad does not move; Chromium and WebKit
- [x] 50. Header They said as a speech-bubble button, the same square as Clear; with a line it widens to show it; status
      pill keeps one line; header never wraps (Req 25.3)
  - [x] 50.1 Tests: `test/mobile.test.tsx` (25.3)
- [x] 51. Bugfix: iPhone SE in Safari with the bottom tab bar (495px visible) needs a short scroll (Req 25.1) — a good
      first Kiro Bugfix spec (current, expected and unchanged behaviour)
- [ ] 52. Before release: state the WCAG 1.3.4 exception (portrait-only phones) in the accessibility statement on
      `/about` (ADR-003; plan F19)
- [ ] 53. Try the shell on real phones and tablets (iPhone in Safari and as a Home Screen app, an Android phone in Chrome,
      an iPad in both orientations); log results in `docs/research/one-screen-tablets.md` (Req 24, 25)

## Voice to text for They said (Req 26; ADR-004)
- [x] 54. `lib/dictation.ts` (recognizer wrapper, `processLocally` when available, error mapping, `joinHeard`,
      secure-context check, `useDictationSupported`), Listen / Stop in `components/PartnerTurn.tsx`, one-time notice,
      `dictation` setting and the Settings switch "Listen in They said", About privacy line (Req 26.1-26.6)
  - [x] 54.1 Tests: `test/dictation.test.tsx` (fake recognizer: notice, allow, interim text, stop, abort on Cancel and
        unmount, typing wins, errors in words, on-device choice, plain-HTTP page)
- [ ] 55. Try Listen on real devices over HTTPS: Chrome on Android (online and on-device), Safari on iPhone and iPad, a
      Home Screen web app on iOS (expected to fail with a clear message); log in `docs/research/web-speech.md` (Req 26)

## Route move (ADR-006)
- [x] 56. App moved to `/app` (marketing-site tasks 3-9; Req 5.1, 14.3, 23.4)

## Conversation thread (Req 27; ADR-007)
- [x] 57. `lib/conversation.ts`: `Turn`, pure `conversationReducer` (50 turns, 280/500 characters, the same "you said"
      line within 60 s is one turn, Change only on the newest "they said"), selectors (`lastTurn`, `lastThem`,
      `awaitingReply`, `recentMine`, `threadText`, `decodeContext`), a memory-only store and `useConversation()`;
      They said derived from it; `sayAndRecord(text, via)` in `CommunicationScreen` for Speak, phrases and Say again,
      Show records `shown`, Test voice does not (Req 27.1-27.3, 13.2)
  - [x] 57.1 Tests: `test/conversation.test.ts` (fast-check: limits, order, the 60 s rule, recent lines), `test/dictation.test.tsx` (heard / typed)
- [x] 58. The thread on the main screen: `threadRows`, `STACK_THREAD_QUERY`, `STACK_NO_HEADER_QUERY`; `ThreadBubble` in the
      header (stack 620-1149px), `ThreadStrip` (split, stack 1150px and taller, fixed height), `ThreadPanel` on laptops,
      Menu > This sentence > Conversation; `THREAD_ROW` in the scan grid (Req 27.4-27.6, 27.10, 25.3)
  - [x] 58.1 Tests: `test/conversation-ui.test.tsx`, `test/mobile.test.tsx` (25.3, 27.4), `test/phone.test.tsx` (Menu),
        `test/layout.test.ts`; `test/e2e/responsive.mjs` (2 turns and a long They said at 24 sizes: no scroll, keys
        unchanged, bubble or strip where expected), `test/e2e/switch.mjs` (thread row, Say again), `test/e2e/keyboard.mjs`
- [x] 59. `components/ConversationSheet.tsx`: every turn newest first, Say again, Show (labelled You said / They said),
      Copy, Change and Remove on the newest "they said", Listen and Type their line, Share or Copy all only where the
      browser can, Clear conversation with a confirm; polite announcements (Req 27.7-27.9)
  - [x] 59.1 Tests: `test/conversation-ui.test.tsx`, `test/e2e/axe.mjs` (screen and sheet), `test/e2e/conversation.mjs`
        (nothing in storage, a reload clears it)
- [x] 60. "Include what you said" (`llmRecent`, off by default, shown only with model ranking on): `context.recent`
      from `decodeContext`, lines from before the current sentence, cache key with recent, 4 KB guard; copy in Settings,
      About and Welcome from `lib/rankingProvider.ts` (Req 27.11, 12.1, 12.2)
  - [x] 60.1 Tests: `test/conversation.test.ts` (request size, cache key, setting), `test/conversation-ui.test.tsx` (request body, Settings)
- [ ] 61. Product owner: confirm memory only with no timed clear, and the opt-in for sending recent lines (ADR-007)

## Quick replies (Req 28)
- [x] 62. `lib/replies.ts` (`QUICK_REPLIES`, `suggestionMode`, `replyRows` with the reply-type slot, `acceptReply`),
      `components/QuickReplies.tsx` (area, line, menu), the suggestion area's modes in `CommunicationScreen` (`sayReply`
      with the repeat guard through `sayAndRecord(text, 'quick')`, `CAND_ROW` cells, Alt+1-5 and arrows off while the
      replies hold the shells' area, Sentences in Menu after Speak), Menu > Quick replies on every layout with a Menu and
      at the top of Phrases on wide, the `quickReplies` setting (on by default) in Settings, styles in `styles/app.css`
      (Req 28.1-28.8)
  - [x] 62.1 Tests: `test/replies.test.ts` (mode table, rows, slot, repeat guard, setting), `test/quick-replies.test.tsx`
        (show and hide, speak once, double press, setting off, no live region, scan row 4, Alt+1, Menu on a short phone,
        laptops, Phrases, the slot), `test/m1b.test.tsx` (Menu and scan counts); `test/e2e/responsive.mjs` (24 sizes:
        equal cells >= 56px, none cut, no scroll, the keypad still), `test/e2e/switch.mjs` (Yes. with 1 and 2 switches,
        the short phone's Menu), `test/e2e/keyboard.mjs`, `test/e2e/axe.mjs` (Menu and Phrases), `test/e2e/conversation.mjs`
- [ ] 63. Try quick replies with AAC users and partners: is "Hold on." enough while typing, and are the 5 the right ones (Req 28)

## Reply types (Req 29)
- [x] 64. Composer `intent` / `intentFor` / `autoPunct` and the `intent` action (Ask's "?", carried over after Speak,
      cleared by Speak and Clear); `replyIntentFor` and `decodeContext({intent, intentFor})` in `lib/conversation.ts`;
      `decodeWithPins(..., {intent})` over `INTENT_POOL`; `buildRequest(..., intent)` and the cache key in
      `lib/decodeClient.ts` (Req 29.2-29.4, 29.8, 12.2)
  - [x] 64.1 Tests: `test/reply-types.test.tsx` (composer, pool and validate, 66 69 929 Agree on the mini and the real
        dictionary, request omits `intent` when none, cache key, request body from the screen)
- [x] 65. `components/ReplyTypes.tsx` (row, line, sheet) in the area's slot (2+ rows), on laptops under the quick
      replies and above the Sentences list while typing, at the top of the Conversation and Sentences sheets on the
      shells; `SpeakBar` `tag` on the key line; styles in `styles/app.css`; `SENT_FOR_RANKING` and `REPLY_TYPES_HELP`
      in Settings, About and Welcome (Req 29.1, 29.5-29.7, 29.9, 12.1)
  - [x] 65.1 Tests: `test/reply-types.test.tsx` (group and `aria-pressed`, where it shows, resets, key line, two-switch
        scan), `test/conversation-ui.test.tsx` (sheet scan rows); `test/e2e/responsive.mjs` (24 sizes: keypad box
        identical with and without the group, cells >= 56px, no scroll, ring not ember, key line, "?"),
        `test/e2e/switch.mjs` (Ask by two switches within 12 presses), `test/e2e/keyboard.mjs` (Tab to Ask, Enter
        presses and releases), `test/e2e/axe.mjs` (screen and Conversation sheet)
- [x] 65a. Polish after review: the group is a labelled segmented control on a sunken track in the area's last row (by
      the keys), pressed with a check mark in both themes; the header bubble shows their newest line; the strip's
      1-turn and empty states; the sheet's even action rows; Speak keeps the sentence said on show and a spoken
      sentence is not re-ranked; any "you said" turn ends the type; Say again's repeat guard; the full "what is sent"
      sentence (Req 27.4, 27.8, 28.8, 29.4, 29.5, 12.1)
  - [x] 65a.1 Tests: `test/replies.test.ts`, `test/quick-replies.test.tsx` (slot last), `test/reply-types.test.tsx`
        (Speak twice says the same, a "you said" turn ends the type, copy), `test/conversation-ui.test.tsx` (bubble,
        Say again guard), `test/e2e/responsive.mjs` (bubble shows their line, the group in the last row)
- [ ] 66. Measure before any claim: `pnpm -F @ninth/eval llm --intent oracle` and a v6-vs-v8 regression need a key
      (decoder-service task 16.7); try reply types with AAC users (ADR-008)

## Plan Part 1 and 2 (docs/plan/02-improvement-plan.md, 2026-11-16)
- [x] 67. Ranking and input fixes: `rankingLattice`, `rankDelayMs`, `RANK_DEBOUNCE_MS` / `RANK_PAUSE_OPEN_MS` in
      `lib/sentence.ts`; pins in `DecodeCache.key`; `limitFor` and `LIMIT_MESSAGE` in `lib/composer.ts`; the ignored
      press mark (`ignoredKey`, `Key` `ignored`, `.nl-key.is-ignored`) and its one-time announcement in
      `CommunicationScreen` (Req 30.1-30.4)
  - [x] 67.1 Tests: `test/ranking-fixes.test.tsx` (lattice with pins, request, delays, caps, the mark and the single
        announcement), `test/plan-bugs.test.tsx`, `test/e2e/plan-bugs.mjs`; `test/e2e/responsive.mjs` (24 sizes)
- [x] 68. Finish the word: core `rankCompletions` + `LanguageModel.successors` / `knows` (`bigramModel`); composer
      `complete`, `typed`, Back reopens; `WordRow` on the shells' last row, laptops and the short phones' Menu; scan
      row 4; Alt+Shift+1-3 and numpad +; the live region's "Words:"; `KeyCode` and `ProofChip` filled-in keys; the
      `wordCompletion` setting (Settings > Typing > Finish words); the new claim everywhere (Req 31.1-31.8)
  - [x] 68.1 Tests: `core/test/complete.test.ts` (properties), `test/completion.test.tsx`, `test/finish-word.test.tsx`,
        `test/claim.test.ts`, `eval/test/completion-safety.test.ts`; `test/e2e/responsive.mjs` (24 sizes)
  - [x] 68.2 Eval: `B1c` in `packages/eval/src/completion.ts`, app-grid scan steps, RESULTS.md regenerated
  - [ ] 68.3 Try the word row with AAC users: are three words read or ignored, and does it save time, not only presses
- [x] 69. Fix any word and Did you mean: core `codeEdit`, `neighbourCodes`, `keyFixes`; composer `recode`, `edit`,
      `openIndex`, Back restores `was`; `FixSheet`, the sentence as a button, Fix a word in Menu and the laptop action
      row; Did you mean in the word row and the short phones' Menu; `KeyCode` / `EditedCode` marks; About copy;
      ADR-009 (Req 32.1-32.7)
  - [x] 69.1 Tests: `core/test/fix.test.ts` (properties), `test/fix-word.test.tsx`; `test/phone.test.tsx` (Menu list);
        `test/e2e/responsive.mjs` (24 sizes)
  - [ ] 69.2 Try Fix a word with AAC users: is the sentence-as-a-button found without a visible label
- [x] 70. Partner strip: `partnerStrip` setting (Settings > Partner strip), `lib/partner.ts`, `PartnerStrip.tsx`,
      `shiftQuery` and the `.app--partner-*` CSS, About copy, ADR-010 (Req 33.1-33.6)
  - [x] 70.1 Tests: `test/partner-view.test.ts`, `test/partner-strip.test.tsx`; band sizes checked at 15 sizes by script
- [x] 71. Punctuation where typed and capitals: core `formatSentence` marks, `SENTENCE_END`, `CAPITALS`, `beam` /
      `decodeGhost` `starts`; composer `Slot.punct`, `punct` / `back` / `mark`, `marksOf`, `startsOf`; every format
      call site; the display map; announcements; Fix a word "Mark after it"; About copy (Req 34.1-34.8)
  - [x] 71.1 Tests: `core/test/marks.test.ts` (properties), `test/marks.test.tsx`
- [x] 72. Your quick replies, cards and setup: pinned phrases as quick replies (`quickReplies`, `setPhrasePinned`, the
      Phrases toggle), Show a card (`CardsSheet`, Show with nothing typed, Menu), Phone calls in Phrases, Add names and
      phrases in My words (`packFromLines`), `core-en.json` v2 without near-duplicates (Req 35.1-35.5)
  - [x] 72.1 Tests: `test/my-replies.test.ts`; `test/phone.test.tsx` and the quick-reply tests unchanged

## UX pass: menus, sheets and popups (2026-11-16, ADR-011)

- [x] 73. Containers and closing: `lib/surface.ts`, `lib/useBackCloses.ts`, `Sheet` kinds (fit, panel, dialog) with the
      phone bottom sheet, large-screen popover and side panel, the centred Settings dialog, the Done bar; Back closes;
      the backdrop rule; Back to Menu; focus return across replaced surfaces; website links in a new tab; Fix a word
      focus; no Cancel in the They said sheet (Req 36.1-36.9)
  - [x] 73.1 Tests: `test/surfaces.test.tsx`; `test/e2e/surfaces.mjs` (phone, short phone, tablet, laptop); updated
        `test/footer.test.tsx`, `test/routes.test.ts`, `test/phone.test.tsx` for the new-tab link names
- [x] 74. Menu, Voice, More and Status: the Menu's tiles, This sentence pairs, rows and Status / About; `VoiceSheet`
      with `VoiceControls`; `MoreSheet`; `StatusSheet`; the header status button and More; links as scan cells;
      About and the intended-purpose sentence in Settings (Req 37.1-37.6)
  - [x] 74.1 Tests: `test/hubs.test.tsx`; `test/e2e/surfaces.mjs`; updated `test/m1b.test.tsx`, `test/phone.test.tsx`,
        `test/quick-replies.test.tsx`, `test/routes.test.ts` for the new Menu and header
- [x] 75. Settings in groups: `SettingsLayout` (phone list and drill-in with All settings; two panes on larger screens,
      last group used), `sectionValue`, `Sheet` `back`, the scan-off question alone after Close (Req 38.1-38.5)
  - [x] 75.1 Tests: `test/settings-groups.test.tsx`; the e2e scripts pick the group with `settingsGroup`; updated
        `test/m1b.test.tsx`, `test/scan-off-confirm.test.tsx`, `test/quick-replies.test.tsx`,
        `test/conversation-ui.test.tsx`, `test/completion.test.tsx` to open the group first
- [x] 76. They said over the keyboard, Phrases rows, one confirm, feedback in place, names: `PartnerTurn` `sheet`, the
      `visualViewport` placement, `.phrase-row` with More, `Confirm` everywhere (`data-confirm`), Save phrase answered
      in the Menu (Saved to Phrases + Undo) and on the laptop button (Undo save), `inSheet` headings, "Check the words"
      as the laptop panel's heading, Whole conversation (Req 39.1-39.5)
  - [x] 76.1 Tests: `test/confirms.test.tsx`, `test/feedback.test.tsx`; updated `test/spell.test.tsx` (More > My
        words) and `test/e2e/my-replies.mjs` (pins behind More), `test/e2e/axe.mjs` (Whole conversation)
  - [ ] 76.2 Check They said with the keyboard up on a real iPhone and Android phone
