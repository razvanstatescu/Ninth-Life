# Production guide

For the coding agent that builds the film (Claude Code), and for the person who reviews its work.
Written 2026-11-10. Nothing has been built yet.

You are building a 1:54 film in Remotion from the plan in this folder. Read these first, in this order:

1. [README.md](README.md): what is decided and what is still open. **Do not start until D7 is answered.**
2. [02-creative-direction.md](02-creative-direction.md): the rules.
3. [03-script-storyboard.md](03-script-storyboard.md): what happens, frame by frame.
4. [04-asset-plan.md](04-asset-plan.md): what to generate and capture.
5. `.kiro/steering/product.md` and `.kiro/steering/trademarks.md`: what may never be said or shown.

The tool facts in [01-research.md](01-research.md), section 6, were gathered on 2026-11-10 by research agents.
APIs change. **Check each parameter against the live documentation before the first call**, and correct this
folder's documents if something differs.

## 1. Rules that override everything else

1. **Never write the four banned marks** (see `trademarks.md`), in any file, prompt, comment, file name or
   commit message. Run `node scripts/tm-lint.mjs` from the repository root before every commit.
2. **Show the app truthfully.** (Revised 2026-11-10 by the owner: the film is marketing-led.) Hero shots may recreate the app from the design system, simplified or enlarged; never show a feature it does not have. A few shots use real captures in plain device frames. The build rules are in `film/STYLE.md`.
3. **Nothing on screen is typed by hand.** Sentences, guesses, candidate lists and key codes come from the real
   decoder at build time.
4. **No claim the product may not make** (`product.md`, "Banned claims"): no medical words, no condition names,
   no speed or accuracy claims, no numbers that `packages/eval/RESULTS.md` did not measure.
5. **The intended-purpose sentence is verbatim** on the end card, for at least 6 seconds.
6. **The icon is never animated, tilted, recoloured or built up.** Only its ninth key may fade in, on the end card.
7. **Never more than one ember thing on screen.** Ember is a fill, never text.
8. **Viewer safety** (creative direction, section 9) is not a matter of taste. The flash check must pass.
9. **Secrets.** The keys are in `marketing/.env`. Read them from the environment in Node scripts only. Never
   print them, never commit them, never pass them into the Remotion bundle.
10. **Stay in `marketing/`.** Do not change `packages/`, `design/`, `docs/` or `.kiro/`. If the app needs a
    change for a capture, stop and ask.
11. **This film is made with Claude Code, not Kiro.** Do not add it to `docs/KIRO_LOG.md` and never describe
    it as Kiro work.
12. Do not run `next build` in `packages/web` while its dev server is running.

## 2. Before the first line of code

- Reinstall the Remotion skill: the copy on this machine is from February 2026 and predates `@remotion/effects`
  and `<HtmlInCanvas>`. Run `npx remotion skills add` (or install the Claude Code plugin), then read its rules for
  markup, effects, audio, fonts and rendering.
- Confirm the Remotion version and pin `remotion` and every `@remotion/*` package to the same exact version,
  with no `^`.
- Confirm the team is still 3 people or fewer (Remotion's free licence).
- Confirm a paid ElevenLabs plan is active.
- For the Studio preview of canvas effects, use Chrome 149 or later with `chrome://flags/#canvas-draw-element` on.

## 3. Where things go

```
marketing/
  .env                         keys (ignored by git)
  demo-video/
    README.md, 01 to 05        this plan
    film/                      the Remotion project (new)
      package.json             its own package, outside the pnpm workspace
      remotion.config.ts
      assets-manifest.json     one line per generated file
      scripts/
        build-data.ts          decoder output to src/data/decoded.json
        capture-app.ts         Playwright captures to public/captures/
        make-tones.ts          key tones, hum, rising tone (FFmpeg)
        gen-images.ts          OpenAI pictures
        gen-music.ts           ElevenLabs music
        gen-sfx.ts             ElevenLabs effects
        gen-voice.ts           ElevenLabs speech, with timestamps
        check-flashes.ts       the flash check
        check-audio.ts         loudness and peaks
      src/
        index.ts, Root.tsx
        timeline.ts            every time in the film, in one place
        tokens.ts              read from design/system/tokens.json
        data/                  decoded.json, keypad-plate.json
        lib/                   beat, stepped time, camera, easing
        components/            shared parts
        scenes/                S01.tsx to S16.tsx
        audio/                 AudioTrack.tsx: every sound, placed by timeline.ts
      public/
        img/  audio/keys/  audio/music/  audio/sfx/  audio/voice/  captures/  fonts/
      _takes/                  rejected takes (ignored by git)
      out/                     renders (ignored by git)
```

`marketing/` is not in `pnpm-workspace.yaml`, so the film has its own install and lock file and the root CI does
not build it. Install with `pnpm install --ignore-workspace` inside `film/` (check that this is still the right
flag), or use npm there. Add `film/_takes/`, `film/out/` and `film/node_modules/` to a `.gitignore` inside
`film/`.

Commit the chosen assets (they are small) so that anyone can render the film again without the keys.

## 4. Order of work

Each phase ends with something a person can look at. Do not move on until the gate is passed.

| Phase | What | Gate |
|---|---|---|
| 0. Set up | The project, `timeline.ts`, fonts, tokens, an empty 6,840-frame composition at 60 frames a second | The Studio opens; `Film` is exactly 1:54 |
| 1. Animatic | Every scene as grey boxes and its real on-screen text, at the storyboard's times. The key tones (made by script) and a plain click on every beat of Act 2 | **A person watches it** and agrees the timing and the words. This is the cheapest moment to change the film |
| 2. Data and captures | `build-data.ts` and `capture-app.ts` | `decoded.json` passes its checks; every capture in the asset plan exists, sharp, with its boxes |
| 3. Act 2 | Scenes 6 to 16 for real: world, camera, hero parts, captures in frames, type | Scenes 7, 10 and 11 read clearly with the sound off |
| 4. Act 1 | Pictures generated and approved; the television look; the pixel screen; scenes 1 to 5 | **A person approves each picture** against its checklist. The flash check passes on Act 1 alone |
| 5. Sound | Music generated, measured and conformed; effects; the voice; the mix | `BeatCheck` stays in time for 62 s. **A person approves the music and each effect** |
| 6. Finish | Motion blur on the whip pans, the glow, the cut points, the end card, the caption file, the thumbnail | The whole film played three times: with sound, without sound, and sound only |
| 7. Check and render | Section 9, then section 10 | Every box in section 9 is ticked |

Build Act 2 before Act 1: it is three quarters of the film, it carries the proof that the app works, and it
needs no generated pictures.

## 5. Data from the real decoder

`scripts/build-data.ts` imports `packages/core/src/index.ts` by relative path (it is pure TypeScript with no DOM;
run the script with `tsx`) and reads `data/lexicon/en.v1.json` and `en.bigram.v1.json`. It follows the pattern of
`packages/web/components/site/site-data.ts`, which already does this for the website's demo.

It writes `src/data/decoded.json` with, for each typed sentence in the storyboard:

- the key presses in order, with `0` for Space;
- after each press, the decoder's best reading of what has been typed so far (`decodeGhost` with `k: 1`, and
  `lexicon.completions` for a last word that is not yet whole, as `getDemoData` does);
- the top 3 sentences for the whole code;
- each final word with its code (`encodeWord`).

And for the proof scene: the codes of "water", "waves" and "wafer", and the index of the first digit where
"wafer" differs.

**The script fails, and so does the build, when:**

- the first sentence for `43556 24246` is not "hello again";
- the first sentence for `4 6333 92837` is not "i need water";
- the first sentence for `48 47 4663 86 23 2225` is not "it is good to be back";
- the first three words for `4663` are not "good", "home", "gone", in that order;
- "wafer" encodes to the same code as "water".

If the lexicon changes and a check fails, do not edit the JSON by hand. Stop and report: the storyboard needs a
new sentence. Use `formatSentence` from `@ninth/core` for what is shown in Act 2 ("Hello again", "I need water").

## 6. How the film is built

### One file holds every time

`src/timeline.ts` is the only place where a frame number or a duration is written. Scenes import from it.

```ts
export const FPS = 60;
export const BPM = 120;
export const BEAT = (60 / BPM) * FPS;      // 30 frames
export const BAR = 4 * BEAT;               // 120 frames
export const ACT2_START = 28 * FPS;        // frame 1680
export const TOTAL = 114 * FPS;            // frame 6840

/** Frame of a position in Act 2. Bars and beats count from 1; `eighth` is 0 or 1. */
export const at = (bar: number, beat = 1, eighth = 0) =>
  ACT2_START + (bar - 1) * BAR + (beat - 1) * BEAT + eighth * (BEAT / 2);

export const SCENES = {
  s01: { from: 0,        to: 4 * FPS },
  s02: { from: 4 * FPS,  to: 11 * FPS },
  s03: { from: 11 * FPS, to: 17 * FPS },
  s04: { from: 17 * FPS, to: 22 * FPS },
  s05: { from: 22 * FPS, to: 28 * FPS },
  s06: { from: at(1),  to: at(3) },
  s07: { from: at(3),  to: at(6) },
  s08: { from: at(6),  to: at(9) },
  s09: { from: at(9),  to: at(12) },
  s10: { from: at(12), to: at(18) },
  s11: { from: at(18), to: at(23) },
  s12: { from: at(23), to: at(27) },
  s13: { from: at(27), to: at(32) },
  s14: { from: at(32), to: at(35) },
  s15: { from: at(35), to: at(39) },
  s16: { from: at(39), to: at(44) },
} as const;
```

If the film must drop to 30 frames a second because rendering is too slow, only `FPS` changes. For that reason
never write a bare frame count in a scene: write seconds, beats, or a named constant such as `JUMP = 0.12 * FPS`.

### Compositions

| Id | What for |
|---|---|
| `Film` | The whole film, 1920 x 1080, 60 frames a second, 6,840 frames |
| `S01` to `S16` | Each scene alone, for quick work |
| `BeatCheck` | The music with a tick and a small marker on every beat and bar number on screen. For conforming the music |
| `Plates` | Each generated picture with the recorded key or display boxes drawn over it |
| `Thumbnail` | A still for YouTube, 1280 x 720 |

### Shared parts

| Part | What it does |
|---|---|
| `useSteppedFrame(hz)` | Returns the frame, held between steps: `Math.floor(frame / (FPS / hz)) * (FPS / hz)`. Act 1 contents use 12 Hz |
| `<TubePicture>` | Wraps Act 1 in `<HtmlInCanvas>` with the effect stack below, and plays the switch-on and switch-off |
| `<PixelScreen>` | An 84 x 48 grid over IMG-04's display box; draws text and our icons as dots |
| `<KeypadPlate>` | IMG-01 and IMG-02 with legends and a light per key, from `keypad-plate.json` |
| `<World>` and `useCamera()` | Act 2's large canvas and its camera. The camera is a list of keyframes `{ frame, x, y, zoom, tiltX, tiltY }`; between them it eases with `Easing.bezier(0.16, 1, 0.3, 1)` |
| `<BrandKeypad>`, `<SentenceCard>`, `<CandidateList>`, `<ProofChip>`, `<SpeakButton>` | Hero parts. Markup and classes from `design/system/components/` and `bundle.css`; colours and sizes only from tokens |
| `<Frame>` | The plain device frame around a capture |
| `<Super>` | A line of on-screen text in screen space, above the world: brand type, word-by-word timing, the ember block for emphasis |
| `<SpokenLine>` | The full-screen sentence of scenes 7 and 15; lights each word from a list of word times |
| `<AudioTrack>` | Every sound in the film, each placed with a frame from `timeline.ts` |

On-screen text lives in screen space, not in the world, so camera moves never blur or tilt the words the viewer
is reading.

### Techniques

**The television picture (Act 1).** Starting values; set the final ones by eye and by the flash check.

| Layer | Start with |
|---|---|
| Static | `whiteNoise`, seed from `useSteppedFrame(12)`; amount 1.0 when there is no signal, 0.12 over a locked picture |
| Scanlines | `scanlines`, spacing 4 px, darkening 0.2. Never animated |
| Curve | `barrelDistortion`, small (0.05 to 0.08) |
| Colour fringe | `chromaticAberration`, 1 to 2 px |
| Edges | `vignette`; a slight blur of the whole picture (about 0.6 px) |
| Tracking line | A custom effect: one soft horizontal band that moves down slowly, refreshed 12 times a second. Optional |
| Switch on / off | Scale the picture's height from a thin line with a slowing ease; the line is thicker in the middle. Brightness ramps over 20 frames |

Static cells must stay fine (2 px or less). Do not scale a small noise texture up: big blocky noise loses the
fine-pattern exception and may count as flashing.

**Rules of the tool** (from Remotion's own documentation):

- Animate only from `useCurrentFrame()` with `interpolate()` (always clamp) and `spring({ damping: 200 })`. No
  CSS transitions or animations, no timers, no `Math.random()`; use `random(seed)`.
- **`bundle.css` and the app's CSS contain transitions and animations. Remove or override them in the film**; a
  CSS transition does not render correctly. Drive pressed and highlighted states from props.
- Use `<Img>`, `<Audio>` and `<Video>` from Remotion and `@remotion/media`, with `staticFile()`. Avoid
  `background-image` and `mask-image`.
- Load every font before it is measured or drawn. Serve all pictures from `public/` (pictures from other origins
  are dropped inside the canvas).
- Large blurs, shadows and gradients are slow. Measure before adding them to long scenes.

**Captures in the film.** Show the still for a state, cut to the next still on the beat, and add the 120 ms
colour change only where the app has one. The camera may zoom and move over a capture; it may not change what is
in it. The boxes saved with each capture give the camera its targets.

**Motion blur on whip pans.** First try a directional blur effect only during the 8 to 14 frames of the move.
Use sample-based blur (`<HtmlInCanvasMotionBlur>`) only if that looks wrong, and only around those frames: it
multiplies render time.

**Eye matching.** For each cut in Act 2, note where the ember thing is in the last frame before the cut and place
the ember thing of the next shot within 80 px of it. Keep a small table of these in `timeline.ts`.

## 7. Sound in the film

- `<AudioTrack>` places each file with `<Sequence from={...}>` and `<Audio>`. Volume is a number from
  `interpolate()`; there is no fade prop, so write fades as volume ramps.
- "The music stops dead" means: volume to 0 within 1 frame at the cut, and nothing else playing. Add no reverb
  tail unless a person asks for one after listening.
- Each key press in `decoded.json` triggers the tone of its key: set `old` in Act 1 and the scene 15 inset, set
  `new` in Act 2.
- The word times for `<SpokenLine>` come from the timestamps returned with each chosen voice file (asset plan,
  section 4.4), stored next to the file and read through `timeline.ts`.
- After the mix, `check-audio.ts` measures the render with FFmpeg's `ebur128`: about -14 LUFS integrated, true
  peak under -1 dBTP.

## 8. Generation scripts

Each script reads its prompts from a data file next to it (so the trademark check sees them), writes takes to
`_takes/<id>/`, and never overwrites an approved file in `public/`. A person picks the take; a small command
(`pnpm choose IMG-01 3`) copies it into `public/` and writes the manifest line.

A refused prompt (`moderation_blocked`, `bad_prompt`) is a reason to stop and report, not to reword until it
passes.

## 9. Checks before rendering the final file

By script:

- [ ] `node scripts/tm-lint.mjs` passes (run from the repository root)
- [ ] TypeScript passes; `build-data.ts` passes its checks
- [ ] The file is 1:54, 1920 x 1080, 60 frames a second, H.264, with sound
- [ ] **Flash check.** `check-flashes.ts` reads the render with FFmpeg, splits each frame into a 4 x 4 grid, turns
      each cell's mean brightness into relative luminance, and fails if, in any one-second window, cells covering
      a quarter of the picture or more show more than three pairs of opposite changes of 0.10 or more (with the
      darker state under 0.80). It also fails on any frame whose mean colour is a saturated red. This is a
      screening tool, not a certified broadcast test; say so in the hand-over
- [ ] Loudness and peaks are in range
- [ ] Every file in `public/` has a line in `assets-manifest.json`

By a person, on the rendered file:

- [ ] **Sound off:** the story, the product and every point are still clear
- [ ] **Sound only:** the three spoken lines are clear and sit in true silence or under ducked music
- [ ] At half size (960 x 540), every line of text can be read in the time it is on screen
- [ ] The end card's sentence is word for word the one in `product.md`, and stays 6 s or more
- [ ] No maker's name, logo or recognisable product anywhere, including inside captures; no voice names; no
      browser or system bars; no development badge
- [ ] No letters or logo-like shapes hidden in the generated pictures
- [ ] The phone in shots 2a and 4b cannot be taken for any real model (compared with well-known handsets by a
      person who knows them)
- [ ] Never two ember things at once (step through Act 2 at the cut points)
- [ ] The app's behaviour is shown as it is: highlights jump, nothing bounces
- [ ] Scene 14 shows only work that has a row in `docs/KIRO_LOG.md`
- [ ] A second person watches once only for trademarks and claims
- [ ] Someone who has never seen the product watches once and then says what it does and who it is for

## 10. Render and hand over

Start from this and check the flags against the current documentation:

```bash
npx remotion render src/index.ts Film out/ninth-life-hello-again.mp4 \
  --codec h264 --crf 16 --pixel-format yuv420p --color-space bt709 \
  --image-format png --gl=angle
```

- Run `npx remotion benchmark` once to choose `--concurrency`.
- The `angle` renderer can run out of memory on a long render. If it does, render Act 1 and Act 2 as two frame
  ranges without sound, render the sound once, and join them with FFmpeg.
- If a full render takes more than about 40 minutes, say so before optimising; the first candidates are the blur
  and the canvas effects in Act 1.

Hand over:

| File | Note |
|---|---|
| `out/ninth-life-hello-again.mp4` | The film |
| `out/ninth-life-hello-again.srt` | Captions, from the table at the end of the storyboard, with final times |
| `out/thumbnail.png` | 1280 x 720 |
| `out/contact-sheet.png` | One frame from the middle of every scene |
| `assets-manifest.json` | Where every picture and sound came from |
| A short report | What differs from the storyboard and why; what was not verified; the flash check's result and its limits |

Text for the YouTube description, to be completed by the team (decision D8 covers the tool names):

```
Ninth Life: the old keypad, back as your voice.
Type on 9 keys, hear your sentence. Free, in your browser: [APP_URL]
Code (MIT): [REPO_URL]
Made for Kiroween 2026, Resurrection category. Built with Kiro.

Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not
intended to diagnose, treat or replace a clinical AAC assessment.

About this film: all app footage is the real app. The music and sound effects were generated for this film; the
key tones were made by the team. The still pictures in the first 28 seconds were generated. The app's voice in
this film was generated; in the app, the voice comes from your device. No third-party music, footage or
trademarks.
Fonts: Atkinson Hyperlegible Next and Mono (Braille Institute), Tiny5, VT323, SIL Open Font License.
```

The upload is **public** on YouTube. Check that it plays in a private window, signed out.

## 11. When to stop and ask

- A check in `build-data.ts` fails.
- A capture needs a state the app cannot reach, or the app must be changed.
- A prompt is refused, or a generated picture keeps showing letters, logos or a recognisable product.
- The music cannot be brought to a steady 120 beats a minute.
- The flash check fails and the only fix would change the look of Act 1.
- Scene 14 has fewer than three pieces of evidence (use the short version and say so).
- Anything would need one of the rules in section 1 to bend.
