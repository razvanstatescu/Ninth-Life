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
- [x] 14. Scan grid rows → keypad, sentences, actions; `is-scanning` / `is-lit`; whole-page switch press; ScanBar (Req 8.1, 8.2, 8.5, 8.6)

## Model ranking, offline, storage
- [x] 15. `lib/decodeClient.ts`: request within limits, 1,500 ms timeout, re-validation, LRU (Req 12.2-12.4)
  - [x] 15.1 Tests: timeout and error fallbacks (P2); invalid suggestions rejected
  - [x] 15.2 Screen test: rejected word shown, nothing spoken (P3, Req 3.4, 12.5)
- [x] 16. `app/api/decode/route.ts` with `DECODE_ROUTE_ENABLED` guard, 4 KB limit, salted IP hash (Req 12.6)
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
