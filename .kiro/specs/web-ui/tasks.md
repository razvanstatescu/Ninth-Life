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
Built 2026-11-09 outside Kiro (Claude Code); see `docs/KIRO_LOG.md`. Research: `docs/research/mobile-layout.md`,
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
