# Demo video script

Target length **2:50** (hard limit for us 2:55; judges need not watch past 3:00, rules R-05). 16:9, 1920x1080.
From the storyboard in plan §8 and the video surface in `design/system/README.md`. Last updated 2026-11-06.

## Rules for the shoot and the cut

- **No third-party trademarks, logos, music or UI.** No browser toolbar (use full screen or kiosk mode), no OS
  dock or taskbar, no laptop or phone maker logo (tape or crop), no app-store badges, no GitHub, YouTube or other
  logos in screen captures (crop CI comments to the comment text). Kiro and its UI are fine (sponsor).
- **No recognizable phone.** Film the phone screen-side only, close crop, in a plain case, no camera bump or logo in
  shot; or use a clean screen recording of the phone browser placed in our own plain rounded frame. Never draw a
  phone model; the keypad drawing is our own brand icon.
- **No system voice names on screen.** Crop or blur the voice picker; the voice heard is a device voice.
- **Audio:** voice-over by a team member, the app's speech, and self-made keypad tones only. No music, or only
  original or CC0 music with a source note in the description.
- **The app shown must be the real app**, recorded live. If the fake model (`DECODE_FAKE_LLM`) is used for the
  rejected-word shot, the screen says "test model" in the lower third. Prefer a real model response.
- **Words:** say "9-key predictive text", "the old phone keypad". Never a brand name for it. No medical claims, no
  condition names, no speed claims. Run `node scripts/tm-lint.mjs` on this file and on the caption file.
- Captions burned in: Atkinson Hyperlegible Next 40px semibold, moon on a night box at 80% opacity. Title cards on
  `night` with moon text and one ember key. Lower thirds: moon on a plum bar, 64px safe margins.
- Upload as **public** on YouTube; put the URL in Devpost. Check it plays signed out.

## Devices

- **Laptop:** wide layout (1440x900 or larger), Night theme, browser in full screen.
- **Phone browser:** compact layout (about 390x844), shown as above.
- **Switch:** a plain large button (unbranded) or the laptop's Space bar, filmed hands only.

## Shot list and voice-over

Voice-over is about 230 words: about 1:40 at a calm 140 words a minute, leaving room for typing, the app speaking and pauses. Time each shot on the first rough cut.

| # | Time | Shot | Voice-over | On-screen text |
|---|---|---|---|---|
| 1 | 0:00-0:12 | Title card: our keypad drawing (the brand icon, 3x3 keys, the ember ninth key) on night; slow fade | "Nine keys. One press per letter. The old phone keypad could write a whole sentence." | **Ninth Life** / The old keypad, back as your voice |
| 2 | 0:12-0:30 | Card: a plain row of letters with a highlight stepping slowly across, drawn by us | "Typing to talk takes time. With a single switch, every letter means waiting for a highlight to come round. Ninth Life keeps it to the old phone keypad: a few keys, one press per letter." | Typing to talk takes time |
| 3 | 0:30-1:00 | **Laptop.** Wi-fi turned off on screen (crop to our app's pill only: "Offline. Using your dictionary."). Type 4, 0, 6333, 0, 92837. Sentences appear; the SpeakBar shows "I need water". Press Speak; the app speaks | "This is ghost mode. It runs in the browser, offline. I press 4, then 6 3 3 3, then 9 2 8 3 7: one press per letter. The dictionary finds the sentence, and Speak says it." (app speaks: "I need water.") | Offline. One press per letter. / Keys: 4 6333 92837 |
| 4 | 1:00-1:35 | **Laptop.** Settings: model ranking on (show the line that says what is sent). "They said" line typed by a partner. Type an ambiguous sentence; ranked sentences update; proof chips green; one rejected suggestion struck through with the app's sentence `The model suggested "…". Your keys spell …` | "Model ranking is opt-in. A language model can reorder sentences, using what the other person just said. But it can only choose words that match my keys. Every word is checked. When the model suggests a word my keys do not spell, it is struck through and it will never be spoken." | Every spoken word matches the keys you pressed / (if used) test model |
| 5 | 1:35-2:00 | **Phone browser**, compact layout. One-switch scanning: the highlight steps through keypad rows; hands press one plain button; scan speed made slower with the switch; Phrases opened by switch; a quick phrase spoken | "On a phone, or with one switch. The highlight steps through the keypad, one row at a time. The speed is mine to set, and every setting can be changed with the switch." (app speaks a quick phrase) | One switch. Your speed. |
| 6 | 2:00-2:35 | **Kiro** (real captures only; see TODOs): a spec's EARS requirements; a property test's shrunk counterexample; the secrets hook blocking a `.env` write; a review comment from the headless CLI in CI (cropped, no logos); the Crew app, if it exists | "We built it with Kiro. Specs with numbered requirements. Property tests that found a real normalization bug: an accent typed as an apostrophe broke a word's code. A hook that blocks secrets. A review agent in CI." | Built with Kiro: specs, property tests, hooks, agents |
| 7 | 2:35-2:52 | Closing card on night: icon, URL | "Ninth Life is free, works offline, and runs in your browser." | Free. Works offline. Runs in your browser. / [APP_URL] / Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment. |

Hold the closing card at least 6 s so the statement can be read. It is the full sentence, verbatim (`product.md`).

## Optional line with a number (shot 3)

Only if it fits and the number is still current in `packages/eval/RESULTS.md` on the day of the cut:

- On-screen: "In our simulated typing test, ghost mode ranked the intended sentence first for 85.6% of 866 test
  sentences. Method: packages/eval/RESULTS.md". Voice-over says nothing about it. Never round it up, never call it
  accuracy for people.

## TODO before recording

- [ ] Shot 1 history: the plan's opening line ("In 1998 this keypad was built so people who could not speak could type")
      has **no source in the repo**. Do not use it unless someone adds a citable source to `docs/research/`. The line
      above makes no historical claim.
- [ ] Shot 4: a real model response that contains a rejected word, or the "test model" label.
- [ ] Shot 6: each Kiro capture must exist in `docs/kiro/evidence/` with a KIRO_LOG row. The normalization bug was found
      by the fast-check suite (`docs/architecture/core.md`, Finding 1); if it was not found inside Kiro, the voice-over
      must not say Kiro found it (it does not now: "Property tests that found..."). Drop any capture we do not have.
- [ ] Keypad tones: record our own; note in the description "all audio original".
- [ ] Captions file checked with tm-lint; final cut watched once with sound off (captions carry everything) and once
      by a second teammate for logos.
- [ ] Final length under 2:55.
