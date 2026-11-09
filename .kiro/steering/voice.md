---
inclusion: auto
name: voice
description: Web Speech API in the browser, both directions. Use when working on speaking sentences (speechSynthesis, SpeechSynthesisUtterance, voices, the voice picker, rate or pitch, voiceschanged, localService, the show-text fallback) or on Listen, the voice to text for They said (SpeechRecognition, webkitSpeechRecognition, dictation, microphone, processLocally), and on iOS or Chrome speech quirks.
---

# Speaking with the Web Speech API

Speech is the product's output, so it must be predictable. Checked 2026-11-06; sources in `docs/research/assumptions-register.md` (W-01 to W-03).

## Rules

1. **Speak only on an explicit Speak action** (button, Enter, or a switch selecting Speak). Never auto-speak, and never speak model output that the person did not select. Only candidates that passed the proof check can be spoken.
2. **First speech inside a user gesture.** iOS Safari ignores `speechSynthesis.speak()` until it has been called from a tap or key handler, and Chrome also blocks speech without user activation. Call `speak()` synchronously in the handler, not after an `await` or a timer. Unlock with the first real Speak press; do not play a silent utterance on page load.
3. **Voices load late.** `speechSynthesis.getVoices()` is often empty at first. Read it once, then again on the `voiceschanged` event; never assume a voice exists. Remember the chosen voice by `voiceURI` and fall back by `lang` when it is gone.
4. **Prefer local voices.** `SpeechSynthesisVoice.localService === true` means the device synthesizes the speech. `false` means a remote service does, so the text leaves the device. Sort local voices first, label network voices "Online voice" in the picker, and say so in the privacy notice.
5. **Short utterances.** Chrome's network voices stop long utterances after about 15 seconds without firing `end` or `error`. Split text at sentence and comma boundaries into chunks of about 200 characters, queue them, and track progress with each chunk's `end` event. Do not rely on the pause/resume keep-alive trick; it breaks on Android Chrome.
6. **One thing at a time.** Call `speechSynthesis.cancel()` before a new sentence so presses never queue up a backlog. Handle `error` events (log the error type only, never the text) and keep the UI usable.
7. **Set `utterance.lang`** from the active pack (`en-US`, `ro-RO`, `es-ES`) so the browser picks a matching voice.
8. **Rate and pitch** come from settings (rate default 1, range 0.5 to 2). Offer "Test voice" with a fixed neutral sentence.
9. **No voice at all?** Switch to show mode: the sentence in huge type for the partner to read. Never fail silently.
10. **Formatting before speech** is deterministic (`formatSentence` in `@ninth/core`): sentence case, "i" to "I", punctuation from the punctuation key. The model never adds words.

## Listening (voice to text for They said, ADR-004, web-ui Req 26)

Code: `packages/web/lib/dictation.ts`, `components/PartnerTurn.tsx`; tests: `test/dictation.test.tsx` (a fake recognizer).

1. **Only where it can work:** `SpeechRecognition` or `webkitSpeechRecognition` exists and `window.isSecureContext` is true (HTTPS or localhost). Read it with `useDictationSupported()` so the server HTML and hydration agree. Firefox has none; iOS reportedly fails in Home Screen web apps, so the error path must point to typing or the keyboard's microphone.
2. **Ask once, in words:** the first Listen shows where the audio goes; nothing starts before "Allow and listen". The choice is the `dictation` setting (Settings: "Listen in They said").
3. **Start inside the tap** (Safari needs a user gesture). Only Chrome's `available()` is awaited first, to set `processLocally` when the English pack is already on the device.
4. **One phrase:** `continuous = false`, `interimResults = true`; words fill the field as heard. Stop keeps them; typing, Cancel, Escape and unmounting abort and drop late results.
5. **Errors in words:** map the browser's error codes with `dictationProblem()`; never show a raw code.

## Testing

Unit-test the chunker and the voice-sorting logic in plain TypeScript (no DOM). In jsdom, mock `speechSynthesis`. Check real devices by hand: Chrome desktop, Safari on iPhone and iPad, Chrome on Android; note voice availability per OS in the README.
