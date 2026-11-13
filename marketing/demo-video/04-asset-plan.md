# Asset plan

Everything the film needs that is not code: pictures, sound, captures of the app, fonts. Written 2026-11-10.
Tool facts and their sources are in [01-research.md](01-research.md), section 6. Nothing here has been
generated yet.

Rules for every asset:

- **Prompts are files, and files are checked.** `node scripts/tm-lint.mjs` must pass. Never put a
  maker's or product's name in a prompt. Describe the thing.
- **Keep a record.** Each generated file gets a line in `film/assets-manifest.json`: id, tool, model, date,
  the full prompt, the parameters, the chosen take, the file's SHA-256. This is the proof of where every picture
  and sound came from.
- **Rejected takes are not committed.** They go to `film/_takes/`, which is ignored by git.
- **A person approves each asset** against its checklist before it is used. A model cannot hear a ringtone it has
  never heard or see a logo it does not know.

## 1. Pictures to generate

Model: `gpt-image-2.6-flare` for drafts, `gpt-image-2.6-sunburst` at `quality: high` for the chosen takes.
Size 2560 x 1440 (1920 x 1080 is not a valid size). Format PNG. There is no seed, so consistency comes from a
reference picture: approve IMG-00 first, then make every other picture with `/v1/images/edits`, passing IMG-00
as an input picture and repeating the style text.

Only Act 1 uses generated pictures, and only as still plates. The film adds all light changes, legends, pixels
and the television look on top.

### Style text (repeat it in every prompt)

> Photograph, 100 mm lens, shallow depth of field, taken at night in a dark room. Dim cool moonlight from
> the upper left. Deep violet-black shadows. Matte graphite plastic and soft worn rubber, fine dust, light
> scratches. Muted and slightly desaturated, with subtle film grain. No text, no letters, no digits, no symbols,
> no logos, no brand marks, no people, no hands.

### The pictures

| Id | Scene | What it is | Prompt, after the style text |
|---|---|---|---|
| IMG-00 | none | Style reference. Not shown in the film | A still life on a dark table at night: a loose rubber keypad mat with twelve blank rounded keys and a small empty olive-green liquid-crystal display, side by side. |
| IMG-01 | 2b (inset), 4a | Keypad, lights on | Extreme close-up of the keypad of a generic early-2000s mobile phone, seen almost straight from above, filling the frame. Twelve identical rounded soft-rubber keys in a grid of 3 columns and 4 rows, evenly spaced, every key blank. The keys are lit from underneath with a pale green glow, colour #c7f0d8, that leaks around their edges. Dark graphite plastic between the keys. The frame is cropped inside the keypad: no screen, no outline of the device, no other buttons. |
| IMG-02 | 4a | The same keypad, lights off | Made with an edit of IMG-01: "The same picture, unchanged in framing and detail, but the light under the keys is switched off. Only the moonlight remains." |
| IMG-03 | 3b | One worn key | Extreme close-up of a single blank rounded rubber key on the same keypad, worn smooth and shiny in the middle from years of use, its neighbours out of focus. Lit from underneath in pale green. |
| IMG-04 | 2b, 3, 15 | An empty pixel screen | Extreme close-up, straight on, of a small monochrome liquid-crystal display behind a lightly scratched clear plastic window. The display is completely empty: no lit pixels, no icons, no text. Its ground is olive green, colour #c7f0d8, lit unevenly and a little brighter along the bottom edge. A dark graphite plastic bezel on all four sides fills the rest of the frame. The display area is a rectangle 7 wide by 4 high, centred, about 70% of the frame's width. |
| IMG-05 | 1 to 5 | Optional. Dust and fine scratches on glass, to lay over the television picture | Fine dust and a few hair-thin scratches on a sheet of dark glass, lit from the side, on a pure black ground. Transparent background if the model supports it; if not, composite with a screen blend. |
| IMG-06 | 2a | The whole phone, lit | A small early-2000s mobile phone of a plain generic design, lying face up on a dark wooden table, seen from above at a slight angle, filling about half the frame. A simple rounded rectangular body in matte graphite plastic. A small rectangular display in the upper third, lit pale green, colour #c7f0d8, and completely empty. Below it, twelve identical rounded-square keys in a grid of 3 columns and 4 rows, evenly spaced, every key blank, lit from underneath in the same pale green. Nothing else on the front: no navigation key, no call or menu keys, no aerial, no patterned speaker grille, no maker's plate. An invented design that does not resemble any real phone model. |
| IMG-07 | 4b | The same phone, years later | Made with an edit of IMG-06: "The same picture, unchanged in framing and detail, years later. The phone is switched off: its display and keys are dark. A fine, even layer of dust lies over the phone and the table. Only the moonlight remains." |

Seven to eight pictures, about six takes each. IMG-06 will need more: plan for twelve.

IMG-06 is the one picture with a real risk. Image models drift toward the most famous phones of that time, and a
look-alike is a trademark problem even with no logo on it. A person compares each take with well-known handsets
of 1998 to 2005 and rejects any that could be taken for one of them. If no take passes after two rounds, drop
IMG-06 and IMG-07: shot 2a becomes the keypad close-up (IMG-01) and shot 4b the pixel screen fading (IMG-04).

### Getting the keys where the film expects them

The film draws legends and lights on top of IMG-01 and IMG-06, so it must know where each key is (and, on
IMG-06, where the display is).

1. Draw a flat guide in code: twelve rounded rectangles at the planned positions, grey on black, 2560 x 1440.
2. Pass the guide to `/v1/images/edits` together with IMG-00: "Turn this layout into the photograph described.
   Keep every key exactly where the guide has it."
3. The model will not follow the guide exactly. After choosing a take, record the real box of each key by hand in
   `film/src/data/keypad-plate.json` (and `phone-plate.json` for IMG-06) and check it with a Studio still that draws the boxes over the picture.

IMG-02 must line up with IMG-01 pixel for pixel, because scene 4 reveals it row by row. If the edit drifts,
make IMG-02 from IMG-01 in code instead (darken and remove the green) and drop the model edit. IMG-07 need not
line up with IMG-06 to the pixel, because the film cuts to it; it must only be plainly the same phone in the
same place.

### Checklist for every picture

- [ ] No letter, digit, symbol or anything that reads as a logo, anywhere, at full size
- [ ] Close-ups (IMG-01 to IMG-04): no outline or part of a phone body in frame
- [ ] The whole phone (IMG-06, IMG-07): compared by a person with well-known handsets of the time, and not to be
      taken for any of them. Only a display and twelve identical keys on the front
- [ ] No hand, finger or face
- [ ] Twelve keys in 3 columns and 4 rows (IMG-01, IMG-02, IMG-06, IMG-07); the display truly empty (IMG-04, IMG-06)
- [ ] The light and the colour match IMG-00
- [ ] Sharp enough to push in by 10% at 1080p
- [ ] The manifest line is written

## 2. Pictures drawn in code

Not generated, because they must be exact, must move, or must be ours beyond doubt.

| Thing | Scene | How |
|---|---|---|
| Everything on the pixel screen: words, cursor, the small key code | 2, 3, 15 | An 84 x 48 grid of square dots in `#43523d` on the plate's green, scaled by a whole number. Tiny5 for words. All icons are our own simple drawings |
| Key legends on IMG-01 and IMG-06, and the lit screen of IMG-06 | 2a, 2b, 4a | Digits and letters in a plain pixel face over the recorded key boxes; a soft pale-green glow per key that can switch off |
| The television look: static, scanlines, curve, colour fringe, vignette, the set's display (`ch 09`, `no signal`), switch-on and switch-off | 1 to 5, 15 | `@remotion/effects` on `<HtmlInCanvas>`; the collapse is a scale animation. VT323 for the display |
| The brand keypad, sentence card, candidate rows, proof chips, Speak button | 6 to 13, 15 | React with the design system's `bundle.css` and tokens. Never redrawn by hand |
| The icon | 8, 16 | `design/system/assets/Logos/ninth-life-icon.svg`, unchanged. For scene 16 a copy with the ninth key on its own layer, so only that key fades in |
| The 26-letter grid | 9 | Plain cells in brand style. Not the layout of any keyboard: letters A to Z in rows of 7, 7, 6, 6 |
| Device frames | 10, 12, 13 | A plain rounded rectangle in `surface` with a `line-strong` edge and the `lift` shadow. No notch, no camera, no buttons, no home bar |
| The switch | 13 | A large plain circle in `plum` with a `line-strong` ring; pressed state `surface-sunken` |
| Keycaps 0 to 9 | 13 | Rounded squares with a mono digit |
| "No network" icon, check, x, speaker | 11 to 13 | The app's own icons (`packages/web/components/Icon.tsx`), 2.5 px round stroke |
| The YouTube thumbnail | | A Remotion still: the icon, "Ninth Life", "The old keypad, back as your voice." |

## 3. Captures of the real app

Taken by a script with Playwright from a production build of the app, in the Night theme. Phone captures at 3
device pixels per CSS pixel, tablet and wide at 2. Each capture is a PNG plus a JSON file with the boxes of the
parts the camera will visit (each key, the sentence card, Speak, the status pill, each chip).

The app has almost no motion of its own (a 120 ms colour change), so a row of stills, one per state, shown in
step with the beat, is the same as a recording, and far sharper when the camera zooms.

| Id | Scene | Screen size | State |
|---|---|---|---|
| CAP-01 | 10, bar 17 | Phone, a tall size from `packages/web/test/e2e/responsive.mjs` (about 390 x 700 visible) | "I need water" typed (`4 0 6333 0 92837`), the first sentence selected |
| CAP-02 | 11, bar 22 | Wide, 1440 x 900 | Model ranking on, the proof panel showing "water" as a match and "wafer" dropped, with the app's own sentence |
| CAP-03 | 12, bar 23 | Phone | The network off, the status pill in view, a sentence typed |
| CAP-04 | 12, bar 25 | Tablet landscape, a size from the same list (about 1133 x 658 visible) | "I need water", keypad on the right |
| CAP-05 | 12, bar 26 | Wide, 1440 x 900 | "I need water", sentences and proof in view |
| CAP-06a to 06j | 13, bars 28 to 29 | Phone | Switch scanning on: one still per scan step down the rows, the row chosen, one still per step along its keys, the key chosen, the new letter in the card |
| CAP-07a, 07b | 13, bar 30 | Phone | Settings at the scan speed setting, before and after the change |
| CAP-08a, 08b | 13, bar 31 | Phone | Show mode with "It is good to be back", upright and flipped |
| CAP-09 to 12 | 14 | As found | Kiro evidence from `docs/kiro/evidence/`, cropped to the content |

Capture rules:

- Use a production build, so the framework's development badge (the small round mark in the bottom-left corner of
  the screenshots in `docs/a11y/screens/`) is not in the picture. **Do not run `next build` in `packages/web`
  while a dev server is running there**: it overwrites the dev server's files. Stop the dev server first, or
  build into a different output folder.
- No browser bar, no system bar, no cursor.
- Never capture the voice picker: system voice names are other companies' names.
- For CAP-02, prefer a real model reply that contains a rejected word. If the test model (`DECODE_FAKE_LLM`) is
  used, the film shows "test model" under the frame.
- If the app's look changes before the deadline, run the script again. Nothing else in the film needs to change
  as long as the same parts exist.

## 4. Sound

### 4.1 Key tones (made by us)

A script makes these with FFmpeg. They are the only sounds the brand book asks for by name, and they stay
self-made. Each key has one note of A minor pentatonic:

| Key | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 0 | Back (*) | Next (#) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Note | A3 | C4 | D4 | E4 | G4 | A4 | C5 | D5 | E5 | A2 | G3 | G5 |
| Hz | 220.00 | 261.63 | 293.66 | 329.63 | 392.00 | 440.00 | 523.25 | 587.33 | 659.25 | 110.00 | 196.00 | 783.99 |

Two sets of twelve files:

| Set | Used in | Sound | Starting point |
|---|---|---|---|
| `old` | Act 1, and the inset in scene 15 | A thin square wave through a tiny speaker, 90 ms | `aevalsrc` square wave at the note, `highpass=f=900,lowpass=f=3200`, 5 ms fade in, 30 ms fade out |
| `new` | Act 2 | A soft pluck, 500 ms with a fast decay | `aevalsrc` of `0.5*sin(2*PI*f*t)*exp(-9*t) + 0.15*sin(2*PI*2*f*t)*exp(-14*t)`, 4 ms fade in |

Also by script, in tune with the music: the television's hum (55 Hz and 110 Hz, the note A, with weak
overtones), and the low rising tone at the end of scene 5 (a sine sliding from 55 to 110 Hz over 0.5 s).

The motif: 4, 3, 5, 5, 6 = E4, D4, G4, G4, A4. It must not sound like any phone maker's ringtone or start-up
sound. A person on the team listens for that.

### 4.2 Music (ElevenLabs, `music_v2_5`)

Instrumental only (`force_instrumental: true`). Every prompt states "120 BPM" and "A minor". No artist, band,
song or brand names in any prompt.

| Id | Film time | Length | Text of the section |
|---|---|---|---|
| MUS-1 | Bars 1 to 4 (0:28 to 0:36) | 8 s | Build. 120 BPM, A minor. Starts almost empty: a soft kick on every beat and a warm analog sub bass. A filtered synth rises through the whole section. Tension without noise. Ends with a hard stop on the last beat, no tail. |
| MUS-2 | Bars 6 to 36 (0:38 to 1:40) | 62 s | One composition plan with eight sections, below. |
| MUS-3 | Bars 39 to 43 (1:44 to 1:54) | 10 s | One warm, wide chord of A minor with an added ninth, soft synth pad and a low sub note, held and slowly fading to nothing. No rhythm. |

Sections of MUS-2 (their lengths are kept exactly by the model):

| Bars | Length | Text |
|---|---|---|
| 6 to 8 | 6 s | The drop. Full and confident from the first beat: tight punchy electronic drums, warm analog bass line, a short plucked synth figure. Modern, clean, hopeful, a little mysterious. |
| 9 to 11 | 6 s | The drums fall back to a light pattern of hi-hats and rim clicks. Bass holds long notes. Space for thought. Full drums return in the last second. |
| 12 to 17 | 12 s | Main groove. Steady, driving, bright. Leave the middle and high register open; no lead melody. |
| 18 to 22 | 10 s | The same groove with a new bass pattern. The drums drop out for one second near the end, then return. |
| 23 to 26 | 8 s | The groove at its fullest. Strong accents on every beat of the second bar. |
| 27 to 31 | 10 s | The groove continues. Near the end, two seconds at half time, then back to full time. |
| 32 to 34 | 6 s | A lift: the chords open up, brighter and wider, like a sunrise. |
| 35 to 36 | 4 s | Everything strips back to a soft pad and a single bass note. Ends with a hard stop, no tail. |

For all sections: positive styles "electronic, minimal, cinematic, clean mix, warm analog synths"; negative
styles "vocals, guitar, orchestra, horror stings, distortion, lo-fi".

After choosing a take:

1. **Measure the tempo.** The model follows the tempo well but not to the frame. Measure the real tempo and the
   time of the first beat. If the tempo is off by more than 0.1%, stretch the file to exactly 120.00 with
   FFmpeg's `atempo` (or `rubberband` for better quality). Trim so the first beat is at 0.
2. **Check it by ear** with the `BeatCheck` composition (production guide, section 6): a tick on every beat
   over the music. They must stay together for all 62 s.
3. Optional: separate the stems, so the drums can be lowered under the voice in scene 10 while the pad stays.

The two silences (bar 5 and bars 37 to 38) are simply places with no music file. Do not ask the model for them.

### 4.3 Sound effects (ElevenLabs, `eleven_text_to_sound_v3`)

`prompt_influence` 0.5 as a start. WAV at 48 kHz. Three takes each. Level each one by hand in the mix.

| Id | Scene | Length | Text |
|---|---|---|---|
| SFX-01 | 1 | 2.0 s | An old tube television switching on: a soft relay thunk, then a rising electrical whine that settles. Close and dry. |
| SFX-02 | 1 to 4 | 10 s, loop | Soft analog television static hiss, steady, even, muffled as if from a small speaker. No pops. |
| SFX-03 | 2, 3 | 0.5 s | A very short, soft burst of television static, as when changing channel. Gentle start. |
| SFX-04 | 1 to 5 | 10 s, loop | A quiet empty room at night. Very faint air. Nothing else. |
| SFX-05 | 1 to 5 | 30 s, loop | A dark, low, sustained drone on the note A. No rhythm, no melody. Slow movement inside the sound. |
| SFX-06 | 4, 15 | 1.5 s | An old tube television switching off: a falling electrical whine, a soft click, then nothing. |
| SFX-07 | 5 | 0.5 s | One small static crackle from old electronics. Very quiet. |
| SFX-08 | 6 | 1.5 s | A deep, soft sub-bass hit with a short clean tail. No distortion. |
| SFX-09 | 6, 7 | 2.0 s | A smooth rising synth sweep, two seconds, ending abruptly. |
| SFX-10 | 7 | 0.5 s | A short reverse cymbal swell. |
| SFX-11 | Act 2 | 0.6 s | A short airy whoosh passing quickly, ending in a soft dull thud. (Make three variants.) |
| SFX-12 | Act 2 | 0.5 s | A tiny soft tick, like a wooden bead. Dry. |
| SFX-13 | 10, 11 | 0.5 s | A soft low thump, felt on wood. Dry. |
| SFX-14 | 11 | 0.5 s | A gentle low double tap that feels like "no". Soft, muted. Not a buzzer, not an alarm. |
| SFX-15 | 13 | 0.5 s | A large plastic push button pressed once: a soft thud and a click. |

Fifteen prompts, about 45 generations.

Checklist for every sound:

- [ ] Nothing in it resembles a known ringtone, start-up sound or film sound
- [ ] No sudden loud peak; no scream, sting or alarm
- [ ] Clean start and end (no click), right length
- [ ] The manifest line is written

### 4.4 The app's voice (ElevenLabs speech)

Three sentences: "Hello again.", "I need water.", "It is good to be back."

The owner decided on 2026-11-10 that the voice is generated.

- Model `eleven_v4` (check that it is still the best one; `eleven_multilingual_v2` is the steady fallback).
- **One voice for all three lines**: adult, calm, warm, unhurried, neutral accent. No acting, no whisper, no
  "robot". It should sound like a good device voice, not like an advertisement, because in the app the voice
  comes from the person's device.
- Choose a voice that is cleared for commercial use on the plan in use. The default voices expire on
  31 December 2026; that does not affect files already made, but pick another voice if a retake after that date
  is likely.
- Three takes a line. Ask for timestamps (`/v1/text-to-speech/{voice_id}/with-timestamps`; it returns times per
  character, so group them into words). The words on screen light in step with those times.
- Trim each file to start within 20 ms of the first sound.
- **Say that it is generated.** The app speaks with the device's voices, and `product.md` lists "voices depend
  on the device" among the limits to keep visible. So the video description says: "The app's voice in this film
  was generated. In the app, the voice comes from your device." The same words may go on the end card as a small
  credit line; that is recommended, and the owner may drop it from the card.

### 4.5 Mix

| Layer | Level, as a start |
|---|---|
| App voice | The loudest thing in the film. Peaks near -3 dBFS |
| Music | The main bed. Lowered by 12 dB under the voice in scene 10; absent under the voice in scenes 7 and 15 |
| Key tones | Clearly heard over the music, never sharp |
| Effects | Under the music, except the television in Act 1 |
| Whole film | About -14 LUFS integrated, true peak under -1 dBTP, as YouTube expects |

## 5. Fonts

| Font | Use | Source and licence |
|---|---|---|
| Atkinson Hyperlegible Next (400 to 800) | All Act 2 words | The app's own files in `packages/web/public/fonts/` with their OFL text, so the film matches the app. Or `@remotion/google-fonts/AtkinsonHyperlegibleNext` |
| Atkinson Hyperlegible Mono | Key codes | Same |
| Tiny5 | The pixel screen | `@remotion/google-fonts` or Fontsource. SIL OFL 1.1 |
| VT323 | The television's display, Act 1's lines | Same |

## 6. What it costs

| Item | Estimate |
|---|---|
| ElevenLabs | 15,000 to 20,000 credits. The $22 plan is comfortable; the $6 plan (30,000 credits) is tight. A paid plan is needed in any case, for the licence and for the API |
| OpenAI pictures | About 55 pictures at 2560 x 1440. A few dollars; no per-picture price is published for these models |
| Remotion | Free for a team of up to 3 |
| Fonts | Free |
