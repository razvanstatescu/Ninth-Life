# Act 2: style and wow moments

Research v2, field 11. Written 2026-11-10 for the second cut of "Hello again". It answers the owner's review of
Act 2: flat, small, no clear problem, needs a narrator that carries one story, needs more wow.

Read it with [06-hypermotion-reference.md](../06-hypermotion-reference.md) (camera, whip, zoom and type numbers;
not repeated here), [12-transitions.md](12-transitions.md) (the handover, the fold, the move grammar, the ember baton,
narrator rules for cuts; referenced, not repeated) and [film/STYLE.md](../film/STYLE.md). Units: 60 fps, 120 BPM,
1 beat = 30 frames (f), 1 eighth = 15 f, 1 bar = 120 f = 2 s. Frame numbers marked "absolute" are frames of the
current cut (`film/out/ninth-life-hello-again.mp4`); I extracted them with ffmpeg and looked at them.

I did not watch any video. Claims about other films come from the linked articles, docs, studio pages and stills.
Numbers marked "measured" come from a render benchmark I ran on this machine (section 3.13). "Inferred" marks my own
reasoning. Wording examples for the narrator are placeholders that size the slots; the script is written elsewhere.

## 0. The short version

1. **The owner's read is right, and the cause is mechanical.** Every Act 2 plane sits at depth 0 and the camera
   only scales and tilts by 1 to 3 degrees, so nothing ever separates from anything else (no parallax). The ground
   is the same radial glow and dot field in every shot, nothing has material or a light direction, and most shots
   frame the keypad or a whole phone at 60 to 75% of the frame height with empty night beside it. The problem is
   stated ("Some people type to talk.") but never felt: no other person, no time passing (section 1).
2. **A look, not effects: "lit night studio"** (3.12). A floor plane in perspective made of the existing dot field,
   keys and panel with 6 to 10 px of thickness and a top-left key light, the ember thing lighting its neighbours,
   far planes darkened and softly defocused, and one light sweep per chapter at most (five in the film). Hero UI
   fills 50 to 90% of the frame height; shots alternate macro and wide instead of staying mid-size.
3. **One keypad, many depths** (4.0). Each feature is a place in one world, reached by a move that means something:
   behind the keys is the decoder, under the word is the proof, inside the phone is the dictionary (ghost mode),
   beneath the app are the `.kiro/` files, and from far away the keypad is the icon. This sits inside 12's grammar
   ("in = a closer look, how it works inside").
4. **The treatments with the biggest return** (section 4): the rebirth as a rack focus and a pull-back while the
   frame rate comes back to life; the problem as "the conversation moves on", ending in 12's fold; the mechanic as
   a word lattice in depth, with the decoder's real guesses morphing on each press ("I need wave" becomes "I need
   water" on the last press); the proof as "lock and key" with a brand-safe impact; ghost mode as the dictionary
   floating inside the phone; one switch with the scan step on the kick drum; Kiro as a dive beneath the app through
   four real files; an end card with three elements.
5. **A brand-safe impact frame**: hold the subject for 2 to 4 frames, then a 4 to 6% push over 6 to 8 frames, a
   local bloom no bigger than about 240 x 240 px, and a sub hit on the first held frame. Never a white or inverted
   frame (3.7).
6. **Narration.** About 110 to 130 words for Act 2. No narrator over the rebirth and "Hello again" (bars 1 to 5:
   the narrator hands over to the app's own voice), the title drop, each of the app's three lines, the proof's
   impact and the end card. On-screen text becomes exact excerpts of the narration, at most 4 words, appearing 0 to
   4 frames before the spoken word. Only the app's voice lights words (section 5).
7. **Cost is not the limit.** The whole 6,840-frame film rendered in about 70 s at concurrency 8 (file times of the
   last render). Measured on a test scene: canvas effects add 40 to 50% per frame, `lensBlur` 3x at 256 samples and
   9x at 1024. The limits are the Chromium flag `<HtmlInCanvas>` depends on, the two known canvas failures, and
   taste (3.13).
8. **Fix in the current cut**: drop the tablet; end card down to three elements; Kiro text at 36 px or more and at
   least 1.5 s per card; bar 24 shows one empty night frame at each word change (absolute 4440, 4470, 4500, 4530,
   measured frame by frame; 12 reports the first) and holds each word 29 f, under STYLE.md's own 72 f minimum for two
   words; decide on the decoder's real "Hell" step inside "hello" (4.1).
9. **A correction to the brief**: "water" is 92837 (928 is only "wat", the decoder's guess after three presses).
   Checked in `src/data/decoded.json`.
10. **STYLE.md would need six changes** (section 6), each the lead's call.

## 1. What is weak now, checked against the frames

| Weakness | Evidence (absolute frames) | Cause | Fix |
|---|---|---|---|
| Flat | All hero shots, 1830 to 6460 | Planes tilt -1 to -3 degrees; every part sits at z 0 (STYLE's 12 to 22 px "near plane" is invisible at perspective 2400); `World` zooms by `scale`, which moves all planes together | 3.1, 3.12 |
| One ground for everything | 1890, 2790, 3390, 4350, 5070, 5790 | `NightGround` plus `DotField` with the same centred glow; no light direction, floor or horizon | 3.12 |
| No material | Keys, panel and cards everywhere | Flat fills; the only light in Act 2 is the ember glow | 3.5, 3.12 |
| Mid-scale sameness | Keypad or phone at 60 to 75% height with empty night beside it: 1890, 2910, 3030, 4590, 4950 | Whole-device framings; inside the phone captures, card text is about 30 px and key legends about 24 px at 1080p, so about 10 and 8 px in a 640 px player (4600, 4960 to 5200). Only two UI close-ups: Speak (2130) and the water chip (3760) | 3.3, section 4 |
| One template, repeated | Type on one side, UI on the other: 2790 to 3450, 4350, 4590 to 4770, 4950 to 5250, 5550 to 5730 | The same composition for six chapters | Section 4 |
| The problem is stated, not felt | 2670 to 2910: "Some people type to talk." then an alphabet grid with a highlight | No other person, no time passing, no cost | 4.2 |
| Few memorable moments | What works: the two silences (2190 to 2250, 6030 to 6150) and the proof strike (4230 to 4290). The rebirth (1700 to 1830) is flat squares appearing | No scale, light or time event | 4.1 |
| Kiro cards cannot be read | 5550 to 5730: mono text with a cap height of about 16 px, 6 to 10 lines, one beat per card | Too much real text at once | 4.7 |
| Tablet layout | 4650 to 4710 | The owner rejects it | Drop |
| Busy end card | 6280 to 6840: six text elements under the lockup | Every requirement put on one card | 4.8 |
| Bar 24 blinks | One empty night frame at each word change (4440, 4470, 4500, 4530); each word on for 29 f | Word swaps leave a gap frame | Swap on the same frame; let the narrator carry the list |
| Cut rate | About 45 shots in 86 s (02), so about 31 a minute; a 2026 study of 100 UI films found a typical 8.4 scene changes a minute ([Advids](https://advids.co/blog/ui-animation-motion-design-trends)) | Built for music only | 5.1 |

## 2. References

Most launch films have no published breakdown. These twelve (2023 to 2026) were chosen because something written by
the maker, the studio or a named analyst says what makes them work. None repeats 06's list.

1. **Figma, "Shared context with Figma Specs"** (41 s; year not stated by the survey).
   [Video](https://www.youtube.com/watch?v=WEJ2cZBT3PA).
   - *Why it works*: "Blowing up the single control you want people to find is a cheap, effective trick"
     ([ASAP Motion survey](https://asapmotion.co/guides/saas-launch-video-examples/)).
   - *Borrow*: one blown-up control per chapter, at least half the frame height: the ninth key, Speak, the water
     chip, the switch.
2. **Linear, "Introducing Linear Releases"** (30 s). [Video](https://www.youtube.com/watch?v=6dIwFoQ0eVg).
   - *Why it works*: "The metaphor works because the shape is the feature" (same survey).
   - *Borrow*: our shape is the 3 x 3 grid with one ember key. Let it carry the ideas: rows lighting = scanning,
     depth behind keys = the decoder, the far view = the icon.
3. **The Browser Company, "Dia. Now with a sidebar."** (40 s). [Video](https://www.youtube.com/watch?v=5vexXIjRbyQ).
   - *Why it works*: "Starting from the user's request makes the launch feel like an answer, not an announcement"
     (same survey).
   - *Borrow*: open the problem with a real exchange (the other person's question, the reply being typed), so the
     keypad arrives as an answer.
4. **Figma, "All our announcements from Config India"** (50 s). [Video](https://www.youtube.com/watch?v=Sdh_I7PSuew).
   - *Why it works*: features shown as "each a quick UI moment, linked by the same canvas and cursors" (same survey).
   - *Borrow*: link the features with one persistent thing: the ember (12's baton) and one world (4.0).
5. **Framer AI promo** (2023, 1:26). [Analysis](https://www.tella.com/best-product-videos/framer-ai).
   - *Why it works*: "Big text", "fast music", "beat-matched visuals", "close-ups of UI"; the reviewer credits Framer
     with popularising the style.
   - *Borrow*: for the music-led stretches only (rebirth, title, chapter punctuation). Where the narrator explains,
     the voice leads and the picture slows down.
6. **Superhuman AI launch** (2023). [Maker's account](https://blog.superhuman.com/how-we-built-superhuman-ai/).
   - *Why it works*: the film "is not a recording of the product in action" but "showcases real results", built
     "in Figma, animated with After Effects", so it could be made before the feature froze. An agency write-up
     credits its calm founder narration over a tight UI capture
     ([Vidpros](https://vidpros.com/product-launch-video/)); I could not confirm the narration.
   - *Borrow*: our method already (recreated UI, real decoder output). Add the contrast: a calm voice over a fast
     picture.
7. **ElevenLabs sound-effects model launch** (May 2026, motion by Soul Luciani).
   [Case study](https://contra.com/p/3WlLPv2L-eleven-labs-sfx-model-motion-video-and-social-campaign).
   - *Why it works*: "UI-Centric Storytelling", "tight, surgical crops", "rapid typographic transitions", and UI
     motion synced to the generated audio's energy ("Rhythmic Functionalism").
   - *Borrow*: drive the light of the three app-voice moments from the voice's own waveform (4.3, "the voice made
     visible"), and the key light from the key tones.
8. **An unofficial launch spot for Claude Opus 5** (2026, 55 s at 30 fps, built in Remotion with the remocn
   components). [Write-up](https://dev.to/remocn/making-a-launch-video-for-claude-opus-5-2jlo).
   - *Why it works*: a vignette and one small spark "hold above everything" for most of the film, "so the cuts read
     as camera moves inside one film"; "A slow camera scale runs under every scene, split across three depths";
     transitions are chosen by tone; each scene's clock is pre-rolled "by 12–20 frames so it never arrives as a blank
     card"; staggers follow `pow(i, 0.8) × base` "with a deterministic one-to-two-frame jitter"; "Opacity rides a
     short quad ramp; transform rides a long exponential or a damped spring roughly three times its length."
   - *Borrow*: same toolchain, so the numbers port directly (double the frames for 60 fps). Our ember is the spark.
9. **Shopify Editions brand film** (Imaginary Forces; year not stated).
   [Studio page](https://imaginaryforces.com/project/shopify-editions).
   - *Why it works*: it "took business owners on a journey of the 100+ updates", built by a team with eight 3D
     animators.
   - *Borrow*: the ride, not the 3D: one world the camera travels through, each feature a stop (4.0).
10. **Wix Studio launch film** (2023, Wix Motion Studio with Yambo).
    [Stash](https://www.stashmedia.tv/yambo-studio-launches-wix-studio-with-style-and-substance).
    - *Why it works*: it aims to "elevate the explainer genre by organically embedding technical details in a dynamic
      film"; CG interiors open and close it, 2D animation carries the middle.
    - *Borrow*: put the technical detail (codes, digits, the mismatch) into the motion itself, not into supers.
11. **Wix Harmony product film** (2026, Wix Motion Studio).
    [Stash](https://www.stashmedia.tv/new-wix-harmony-product-film-prompts-character-vibes/).
    - *Why it works*: "one continuous flow between the story, the brand, and the platform"; the prompts are treated
      "as part of Angelica's voice".
    - *Borrow*: the typed sentence is a person's voice in a conversation, not a feature on a list (4.2).
12. **GitHub Universe '24 identity and intro film** (BUCK, 2024).
    [Studio page](https://www.buck.co/work/github-universe-2024) and
    [GitHub's motion principles](https://brand.github.com/motion/principles).
    - *Why it works*: BUCK turned a 2D shape library into "Monuments of Progress" and extended them into an intro
      film; the stills on the page show the 2D shapes as softly lit, glossy objects (my reading of the stills).
      GitHub's principles ask for motion that is "precise yet expressive... mechanical yet organic", a container
      transform where an element "expands, contracts, or reshapes into its destination", mono type "animated with
      more of a mechanical rhythm", and "Be quick, but legible".
    - *Borrow*: our keys as lit objects in hero shots; container transforms for dot to key to panel; key codes in
      mono with a mechanical rhythm; and the same pairing of stepped and smooth motion that Act 1 and Act 2 already
      make.

One classic is used below for its numbers, not as a reference: Charles and Ray Eames's *Powers of Ten* (1977),
whose camera keeps "increasing the speed of our movement tenfold every 10 seconds"
([Mental Floss](https://www.mentalfloss.com/science/math/watch-powers-ten)).

## 3. A vocabulary of wow techniques, with numbers

Each entry: when it helps, when it becomes noise, timings at 60 fps, how to build it in Remotion 4.0.542, and cost.
Costs are from the benchmark in 3.13.

### 3.1 Camera flight through UI (a dolly in depth)

- **Helps** when the move means something: from the keys to what is behind them, from the app's surface to what is
  beneath it. It is also the only move that produces parallax, the strongest depth cue we lack.
- **Noise** when the destination has no meaning, when text must be read during the move, or more than one flight
  per 4 bars.
- **Timing**: 30 to 45 f per flight of a screen or more; `EASE.flight` or a speed ramp (3.6); hold at least 30 f
  after landing; directional blur only on frames faster than the `World`'s 10 px a frame threshold.
- **Parallax, worked out**: with CSS perspective P, a plane at depth z appears scaled by P / (P - z). At P = 2400, a
  far plane at z = -1200 shows at 0.67, the hero plane at 1, a near plane at +300 at 1.14. Dolly the camera 600 px
  forward and they show at 0.8, 1.33 and 1.6: the near plane grows 40%, the far one 20%. That difference is the
  depth the current cut lacks.
- **Build**: one `preserve-3d` world (`lib/camera.tsx` already sets it); add a `z` to `Cam` and translate the world
  in z instead of scaling it for these moves; put planes at three depths (far -1200, hero 0, near +300).
  Unmount anything that comes within about 200 px of the eye (P - z < 200), or it fills the frame and flips. Cost:
  none measurable (plain DOM).

### 3.2 3D device turn

- **Helps** once or twice: "this is the real app, on a phone" (the pull-back of bar 17), with the glass catching
  light as it turns. It reads as premium without a modelling team.
- **Noise** when repeated, when it spins (STYLE.md bans spins), on a device that could pass for a real model, or on
  a tablet (the owner's call).
- **Timing**: `rotateY` from -28 to -6 degrees over 45 to 60 f, `EASE.inOut`; a sheen across the glass over 36 to
  48 f at low intensity (3.5); 10 to 14 px of visible thickness for a phone about 900 px tall.
- **Build, level 1 (recommended)**: a CSS slab: the capture as an `<Img>` on the front face, two side faces as
  divs rotated 90 degrees with a plum-to-night gradient, `backface-visibility: hidden`. The sheen: `shine()` applied
  straight to the `<Img>` (effects work on `<Img>`, `<Video>`, `<Solid>` and `<HtmlInCanvas>`,
  [Remotion effects](https://www.remotion.dev/docs/effects)), or a moving gradient overlay (cheapest).
- **Build, level 3 (optional)**: `@remotion/three`, a rounded box with the screen recording as a texture via
  `useOffthreadVideoTexture()`, which gives the exact video frame during rendering; it needs
  `npm i three @react-three/fiber @remotion/three @types/three` and the `angle` GL renderer
  ([Remotion three](https://www.remotion.dev/docs/three)). New dependencies for the film; render cost not measured.

### 3.3 Scale jumps, macro to wide

- **Helps** to show part and whole: dot to key to keypad to app; word to its digits; key to icon. Two or three in
  Act 2 at most, each ending on a hold.
- **Noise** when the macro element is soft (an enlarged bitmap), when jumps follow each other, or when nothing at
  the far end is worth landing on.
- **Timing**: zoom in log space (06). For this film, x10 in 30 to 45 f, which is 5 to 8% a frame. *Powers of Ten*
  moved x10 every 10 s (0.4% a frame): the contemplative end of the same move. Combine with a rack focus (3.4) for
  the first 18 to 24 f.
- **Build**: the existing log zoom in `cameraAt()`. Keep zoomed layers vector (DOM text, SVG), never a PNG past 1:1.
  Do not set `will-change: transform` on a layer that zooms: Chromium re-rasters content on a scale change only when
  that property is absent ([Chromium developer blog](https://developer.chrome.com/blog/re-rastering-composite)).
  Check one full-size still at the deepest zoom frame. Cost: none.

### 3.4 Depth of field and rack focus

- **Helps** in deep layouts (the lattice, the switch next to the keypad, the proof compare) and to move attention
  from one plane to another: from the keys to the spoken sentence.
- **Noise** on text the viewer must read, on a flat layout (blur without depth reads as an error), and as a constant
  style.
- **Timing**: a rack focus over 18 to 30 f; far planes at 8 to 16 px of blur, near planes at 24 to 48 px; never blur
  the plane that carries a super.
- **Build**: per-plane CSS `filter: blur()` on still layers (measured +18% a frame for a full-frame 16 px layer);
  `lensBlur()` for real bokeh on `<HtmlInCanvas>`, `<Video>` or `<CanvasImage>`; its `samples` run from 16 to 2048,
  and "higher values ... take longer to render" ([lens blur](https://www.remotion.dev/docs/effects/lens-blur));
  measured 3x a frame at 256 samples and 9x at 1024. `linearProgressiveBlur()` gives a tilt-shift on a tilted keypad
  (+47%). 06's rule "darken, not blur" stays the default; blur only in the hero shots of section 4.

### 3.5 Light: sweeps, glows, spill

- **Helps** at "it is alive" moments (the ninth key, the voice, the proof passing, the end card's key) and to give
  flat UI a material.
- **Noise** more than once per chapter, over text being read, or at full strength. At the defaults
  (`coreIntensity` 0.4, `haloIntensity` 0.3) a sweep on night reads as a white bar (seen in my benchmark frames).
- **Timing**: a sweep crosses the object in 30 to 45 f at 20 to 35 degrees; `coreIntensity` 0.12 to 0.2,
  `haloIntensity` 0.08 to 0.15, `coreSigma` 40 to 65 px, `haloSigma` 120 to 200 px (inferred values, to tune on a
  still). Glow: `radius` 16 to 40, `threshold` 0.6 or more so only ember and moon contribute. Spill: the ember thing
  tints its neighbours' near edges at 15% opacity or less, within one key width.
- **Flash safety**: a sweep is one flash if it changes luminance by 10% or more over more than a quarter of a 10
  degree field; WCAG estimates that field as 341 x 256 px at 1024 x 768
  ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)), about 640 x 360 px at
  1080p, so a quarter is about 240 x 240 px (approximate scaling). One sweep per chapter is far under 3 a second.
  Run `scripts/check-flashes.py` anyway.
- **Build**: `shine()` "adds a glossy light sweep" with `progress`, `angle`, `haloSigma`, `coreSigma`,
  `haloIntensity`, `coreIntensity` ([shine](https://www.remotion.dev/docs/effects/shine)); `glow()` "adds a soft halo
  around bright parts" with `radius`, `intensity`, `threshold`, `color` ([glow](https://www.remotion.dev/docs/effects/glow));
  both from 4.0.468, WebGL2 or WebGPU. Measured +49% a frame when the whole frame goes through `<HtmlInCanvas>`,
  of which +44% is the canvas itself; apply them to an `<Img>` of the object, or wrap only the object, to pay less.

### 3.6 Speed ramps and frame-rate modulation

- **Helps** at a moment of truth (the switch press, the proof mismatch, Speak), on a move that must land, and at
  the rebirth, where the picture can come back to life by going from stepped to fluid.
- **Noise** on every move, and never on the app's own behaviour: its highlight change stays a 120 ms linear jump.
- **Timing**: a three-part ramp: 1x, then 0.25x for 12 to 20 f around the event, then 1.5 to 2x until the remapped
  time catches up, so the bar grid holds. Frame-rate unlock: hold each drawing 5 f (12 a second, Act 1's rate), then
  3 f, then 2 f, then 1 f, one eighth (15 f) each.
- **Why it works**: animators vary how long a drawing is held; holding it longer makes an action "register", and
  modulation was used to "heighten the impact of action"
  ([Wave Motion Cannon](https://wavemotioncannon.com/2016/12/31/an-introduction-to-framerate-modulation/),
  [Animation Obsessive](https://animationobsessive.substack.com/p/a-subtle-art-with-visceral-power)).
- **Build**: scenes that take a clock (`OpenHero` takes `t`) get `t = R(frame)`. Remotion "will evaluate each frame
  independently", so precompute the cumulative time table once with `useMemo` rather than summing from 0 on every
  frame ([speed over time](https://www.remotion.dev/docs/miscellaneous/snippets/accelerated-video)). For captured
  video, that snippet's `trimBefore` plus `playbackRate` on `<OffthreadVideo>` (it does not yet work with `<Video>`
  from `@remotion/media`). Stepping: `stepped()` in `lib/anim.ts`. Cost: none.

### 3.7 Impact frames, brand-safe

- **Helps** two or three times in Act 2: the proof mismatch, the Speak press before a voice line, perhaps the title
  drop.
- **Noise** as a habit. The anime impact frame is a high-contrast flash or inversion of 1 to 3 frames (a
  [secondary source](https://www.arhfoundation.org/impact-frames-meaning) I could not confirm with an animator); a
  full-frame inversion is a flash and the brand forbids flash frames, so do not copy it.
- **Timing**: hold the subject 2 to 4 f on the contact frame; then a 4 to 6% push over 6 to 8 f with `EASE.camera`
  (no overshoot); a local bloom no bigger than about 240 x 240 px (3.5); the sound on the first held frame. Sound may
  trail the picture by a few frames but should not lead it by more than 2 f: ITU-R BT.1359's detection thresholds
  are about 45 ms of audio early and 125 ms of audio late, 2.7 f and 7.5 f at 60 fps
  ([summary](https://en.wikipedia.org/wiki/Audio-to-video_synchronization); check the sign convention in the
  original).
- **Build**: freeze the subject's own clock (`tSubject = hit` for 2 to 4 f), not the whole frame, so the music and
  camera keep going. `<Sequence freeze>` or `<Freeze>` hold children at a fixed frame
  ([Freeze](https://www.remotion.dev/docs/freeze)); whether `frame` may change from render to render is not
  documented, so prefer a plain clamp. Cost: none.

### 3.8 Particles, only when they are content

- **Helps** when each particle is data: the dictionary's words drifting inside the phone (ghost mode, 4.5), the
  letters of a key.
- **Noise** as dust, sparks, bokeh discs or confetti. STYLE.md bans decorative particles; this is a request to allow
  one meaningful use (section 6).
- **Timing**: drift 0.2 to 0.6 px a frame; three depth layers; 300 to 800 words visible at most; a matching word
  brightens within 7 f (the app's 120 ms jump).
- **Build**: positions from `random(seed)`; drift from `noise3D(seed, x, y, frame * k)` in `@remotion/noise`
  (installed, 4.0.542); a few hundred DOM spans are fine, beyond that draw on one 2D canvas each frame. Cost: not
  measured.

### 3.9 Kinetic type that reacts to the UI and the voice

- **Helps** when the type is the UI's output. The decoder's real guesses change with each press (from
  `decoded.json`): "I > He > Gel > Hell > Hello"; "I need w > I need ya > I need wat > I need wave > I need water";
  "It is good to be abc > It is good to be back". Codes in mono build with a mechanical rhythm (reference 12).
- **Noise** when type flies around the UI with no tie to it, a typewriter on brand type, or karaoke on the narrator's
  words (it would blur the line between the narrator and the app's voice, 5.4).
- **Timing**: the guess redraws on the press frame, a cut, no tween (true to the app). A narrator key word appears
  0 to 4 f before its spoken word and never more than 2 f after it (BT.1359, above). The app's voice lights words
  over 7 f, as now.
- **Build**: `decoded.json` steps (already used); `voiceWords()` for the app's voice; the same for the narrator from
  the narration files' word timings. Audio-reactive light from `visualizeAudio()`; for long files
  `useWindowedAudioData()`, which loads only the audio around the current frame and works with WAV files only
  ([audio visualisation](https://www.remotion.dev/docs/audio/visualization)). Cost: small.

### 3.10 Rhythmic cutting on the beat

- **Helps** in the music-led stretches: rebirth, title, chapter changes, the scan steps (one per kick).
- **Noise** while the narrator explains: cutting on every beat under a sentence makes the viewer choose between
  picture and words. Under narration, cut on phrase ends that fall near a beat.
- **Timing**: cut 0 to 2 f before the beat (06); in narrated stretches one cut per phrase (2 to 4 s); aim for about
  15 to 20 visible cuts a minute in Act 2 instead of about 31, and keep the energy inside the shots.
- **Build**: `atIn()` as now; narration phrases placed to start on beats (5.1).

### 3.11 One-take continuity

- **Helps** the narrator's one story. 12 recommends one world per chapter with a fixed grammar between chapters and
  the ember as a baton; I agree and do not repeat it (12, sections 5.1 to 5.4).
- **Hidden cuts that add to 06 and 12**: a foreground wipe, a near-plane key passing the lens and covering 80% or
  more of the frame for 4 to 8 f, blurred 30 to 60 px; cut behind it. The persistent overlay trick from reference 8
  (a vignette and the spark stay put while scenes change under them) is the same idea as the baton.
- **Build**: the near key as a plain plum DOM plane in the incoming chapter's world, unmounted after it passes.
  Plum on night is a small luminance change, so it is not a flash. Cost: none.

### 3.12 Making flat UI read as objects: the lit night studio

This is the look change behind every treatment in section 4.

- **Floor**: the existing `DotField` laid on a plane at `rotateX(74 to 80deg)` below the hero, fading to night at 60%
  of its depth. It gives a horizon and makes camera moves read in depth (inferred).
- **Light**: one key light from the top left. Keys get a top-edge highlight (moon at 10 to 15% opacity, 2 to 3 px);
  the moon panel gets a soft sheen gradient; a contact glow under the keypad (moon at 6 to 10%) seats it on the floor
  (shadows are invisible on night, 06).
- **Thickness**: 6 to 10 px for 150 px keys, 10 to 14 px for a phone, visible only because the camera tilts more
  during moves (section 6).
- **Spill**: the ember thing lights its neighbours (3.5). It stays one ember thing: the spill is its light, not a
  second object (the lead's call).
- **Scale**: hero UI fills 50 to 90% of the frame height; alternate macro and wide.
- **Build**: all DOM and CSS gradients; gradients and blur are GPU work, so render with `--gl=angle` as now
  ([Remotion GPU](https://www.remotion.dev/docs/gpu)). Pre-render glows as images where the same one repeats; the
  performance guide suggests "replacing those effects with a precomputed image"
  ([performance](https://www.remotion.dev/docs/performance)).

### 3.13 What it costs: measured

Method: a scratch Remotion 4.0.542 project using the film's installed packages (nothing in the film was changed); a
1080p test scene close to Act 2 (12 rounded keys, a card, a 120 px headline, a radial ground, `rotateY(-6deg)`),
480 frames, concurrency 8 (the film's setting), JPEG, `--gl=angle`, on this laptop (15 CPU cores) with other
agents' work running. Per frame = (wall time minus 0.8 s start-up, measured as a one-frame render) / 480.

| Variant | Wall time | About ms per frame | vs plain DOM |
|---|---|---|---|
| Plain DOM | 3.74 s | 6.1 | 1.0x |
| plus one full-frame CSS `blur(16px)` layer | 4.25 s | 7.2 | 1.2x |
| `<CameraMotionBlur samples={8}>`, fast pan | 4.64 s | 8.0 | 1.3x |
| `<CameraMotionBlur samples={16}>` | 5.48 s | 9.8 | 1.6x |
| `<HtmlInCanvas>` around the frame, no effect | 5.01 s | 8.8 | 1.4x |
| plus `shine()` and `glow()` | 5.19 s | 9.1 | 1.5x |
| plus `linearProgressiveBlur()` | 5.14 s | 9.0 | 1.5x |
| plus `zoomBlur()`, 24 samples | 5.02 s | 8.8 | 1.4x |
| plus `lensBlur()`, radius 20, 256 samples | 9.48 s | 18.1 | 3.0x |
| plus `lensBlur()`, radius 20, 1024 samples | 28.17 s | 57.0 | 9.4x |

- The whole film rendered in about 70 s at concurrency 8 (`decoded.json` written 20:13:41, `film-raw.mp4` 20:14:49,
  from file times). Even if every Act 2 frame went through a canvas with a sweep and a glow, it would add about
  15 s. **Render time is not the constraint.**
- What is: `<HtmlInCanvas>` needs Chromium 149+ with the `canvas-draw-element` flag, the API "is unstable", nested
  canvases need Chromium 157 or newer ([HtmlInCanvas](https://www.remotion.dev/docs/html-in-canvas)), effects need
  the ANGLE renderer, and `HtmlInCanvasMotionBlur` fails next to another canvas (known in this project). So: one
  canvas at a time, never around a `World` that is already blurring, and prefer effects on an `<Img>` of the object.
- `<CameraMotionBlur>` was cheap here but left visible rings in the radial ground of my test frame, matching the
  docs' "destructive to colors" (06). Keep the `World`'s directional blur for whips.
- Levels: **1** DOM and CSS 3D (default); **2** effects on an `<Img>` or one `<HtmlInCanvas>` (sweeps, glows, rack
  focus); **3** `@remotion/three` (only if a level 1 still of the hero key fails the "premium" test; not measured).

## 4. Treatments for the key moments of the new Act 2

### 4.0 One keypad, many depths, and where everything goes

The world: the app's surface (keypad, card, Speak) at depth 0. **Behind the keys**, the decoder's lattice. **Under
the word**, the proof. **Inside the phone**, the dictionary. **Beneath the app**, the `.kiro/` files. **From far
away**, the keypad is the icon. Each chapter is a place; moves in and out of depth carry the narrator's "how" and
"why". It uses 12's grammar (in = a closer look inside, out = the real thing) with depth as the extra axis.

A bar map that keeps the current grid where it can (scene 11 at bars 18 to 22, scenes 15 and 16 unchanged). Word
slots assume about 2.4 spoken words a second, a little under the 2.5 a second that voice actors average
([Bread n Beyond](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/)), minus breaths.

| Bars | Film time | Chapter | Narrator, at most | Music and voice |
|---|---|---|---|---|
| 1 to 2 | 0:28 to 0:32 | Rebirth (4.1) | none | Sub hit, key tones, riser |
| 3 to 5 | 0:32 to 0:38 | Hello again (types, speaks) | none | Stops dead for the app's voice at bar 5 |
| 6 to 7 | 0:38 to 0:42 | Title | 9 words, from bar 6 beat 3 | The drop on bar 6 beat 1 |
| 8 to 10 | 0:42 to 0:48 | The problem (4.2) | 13 | Thinned groove |
| 11 to 17 | 0:48 to 1:02 | The core mechanic (4.3) | 21, over bars 11 to 15 | Ducked under the app's "I need water" (bar 16); bar 17 a breath |
| 18 to 22 | 1:02 to 1:12 | The proof (4.4) | 24 | 2 beats out at the impact |
| 23 to 25 | 1:12 to 1:18 | Works offline, ghost mode (4.5) | 11 | Thins when the signal goes |
| 26 to 29 | 1:18 to 1:26 | One switch (4.6) | 15, bar 29 a breath | The kick is the scan clock |
| 30 to 32 | 1:26 to 1:32 | Built with Kiro (4.7) | 11 | The lift |
| 33 to 34 | 1:32 to 1:36 | Free, any browser (phone and laptop, no tablet) | 8 | |
| 35 to 38 | 1:36 to 1:44 | Then and now, "It is good to be back" | 6, bars 35 to 36 | Stops dead at bar 37 |
| 39 to 43 | 1:44 to 1:54 | End card (4.8) | none, or 2 | Chord, then silence |

That is about 120 words. Placeholder lines, only to size the slots: title "Ninth Life: 9-key predictive text, back as
a voice." Problem "If you type to talk, every sentence is work. And conversations don't wait." Mechanic "Nine big
keys. One press per letter. It works out the words, finds the sentence you meant, and says it out loud." Proof "A
language model can help sort sentences, if you turn it on. But every word must match your keys. So it can't put
words in your mouth." Offline "No signal? It keeps working. The dictionary lives on your device." Switch "With one
switch, the highlight steps through the keys. You press when it reaches yours." Kiro "Built in Kiro: specs,
steering, and hooks that check every save." Free "Free. No account. It runs in your browser." Then and now "Same
nine keys. A new life." Each keeps to product.md: no speed claim, the person decides, the model only ranks.

### 4.1 The rebirth: the old phone's last dot becomes the ninth key (bars 1 to 2, 240 f)

**A. "Rack focus to life"** (recommended; it plays inside 12's "Switched back on" opening, or instead of it)

- *Picture*: the handoff frame is the ember dot, 28 px, at the centre. It is the ninth key seen from very close and
  out of focus. As focus arrives the soft orb resolves into the key's crisp rounded corner, and the camera pulls
  back: the key, then the eight keys powering on around it, then the moon panel, then the whole app standing on the
  night floor.
- *Beats*: f0 sub hit, focus `lensBlur` radius 32 to 0 over f0 to 24 while the circle becomes the rounded square
  (border radius 50% to 16%, a container transform); f0 to 90 log pull-back from x12 to x1.6 (`EASE.flight`),
  `rotateY` from -16 to -6 degrees; f15 to 120 the eight keys power on outward from key 9 by distance (8 and 6, then
  5, then 7 and 3, then 4 and 2, then 1), one per eighth with the rising key tones of now; each rises from z -80 to 0
  in 10 f while an ember-tinted rim light crosses its top edge and fades (the light travels from the ninth key);
  f120 to 134 the panel grows from the ninth key (as now); f150 to 186 one low sweep crosses the panel; f186 to 240
  the pull-back to the whole app, floor visible, then a 30 f hold before bar 3.
- *Explains*: the light that survived becomes the key of the new keypad; nine keys; the icon's ember key.
- *Truth*: a picture of the brand, no feature claimed.
- *Build*: `OpenHero`'s `t` clock; one `<HtmlInCanvas>` around the hero only for f0 to 24 (lens blur) and f150 to
  186 (sweep), with `World` set to `noBlur` on those frames so no canvas nests; about 60 f of effects in all.

**B. "The frame rate comes back"** (combine with A or with 12's B; costs nothing)

- *Picture and beats*: through bar 1 beat 1 the dot and the first key still move on Act 1's steps, holding each
  drawing 5 f (12 a second); over the next three eighths the holds drop to 3, 2, then 1 f. By beat 2 the picture is
  fluid at 60 fps. Most viewers will feel it without naming it; the old world's motion turns into the new one's.
- *Build*: drive `stepped(frame, hz)` with hz 12, 20, 30, 60 over f0 to 45.

**Then "Hello again" (bars 3 to 5)**: keep the scene, with two changes. The decoder's guess word sits large above
the keys (160 to 200 px) and redraws on each press: "He", "Gel", "Hell", "Hello". "Hell" is a real decoder step
(4355) on screen for one eighth: keep it as a quiet Halloween wink, or frame it out; decide on purpose. And the
voice moment gets "the voice made visible" (4.3).

### 4.2 The problem: typing to talk is slow and tiring, and conversations move on (bars 8 to 10, 360 f)

**A. "The conversation moves on"** (recommended)

- *Picture*: night. Top two thirds: the other person's lines in moon type (80 px, left-aligned) drift upward at a
  steady 1.5 px a frame, a new line every 2 beats: "What do you think?", "Shall we order?", "Okay, I'll choose."
  Bottom third: the person's reply being typed on a plain 26-letter grid of our own (not anyone's keyboard), one
  letter a beat, the ember highlight stepping, a tick per letter. The reply was for "What do you think?"; by the
  time three letters are in, that line has drifted out of the top of the frame.
- *Beats*: lines on beats 1 and 3, drift linear (time passes evenly); letters on the beat; on bar 10 beat 3, as the
  question leaves the frame, an impact hold (3.7, 3 f) and the music drops a beat; then 12's fold: the 26 cells fly
  into the 9 keys, the highlighted cell carrying the ember (12, section 0, point 5).
- *Narrator*: over bars 8 to 9, about 13 words; silent from 1 beat before the fold to its landing (12).
- *Explains*: the cost of typing to talk, without naming who: effort, time, a conversation that does not wait. The
  last line ("Okay, I'll choose.") says it without a word of narration.
- *Truth*: the drifting lines are a picture of a conversation, not a feature. No comparison is claimed: the keypad
  needs one press per letter too (KSR near 0 in `packages/eval/RESULTS.md`), so the film must not say or imply
  "faster" or "fewer presses".

**B. "Small keys, many letters"** (alternative)

- *Picture*: macro on one small cell of a large letter grid; the camera pulls back x8 to reveal a wall of small
  keys, the 64 to 72 px fingertip ring hunting across it; the reply builds slowly; the wall folds into nine big keys.
- *Risk*: it reads as a comparison with a full keyboard; keep the narrator to "big keys" and "one press per letter".

### 4.3 The core mechanic: nine keys, one press per letter, the sentence, the voice (bars 11 to 17, 840 f)

The keys are 4, Space, 6333, Space, 92837 (from `decoded.json`). The brief's "928" is "wat"; "water" is 92837.

**A. "The lattice behind the keys"** (recommended)

- *Picture*: the keypad large (keys 180 to 200 px, 85% of the frame height), tilted `rotateY(-10deg)`,
  `rotateX(4deg)` while it holds. Each press: the ember ring jumps, the key sinks 6 px, the code builds in mono, and
  the open word redraws with the decoder's guess ("I m", "I of", "I off", "I need"). On each Space the finished word
  locks into a slot and the other words with the same keys peel back behind it in depth (z -90 and -180, at 35% and
  20%). After 92837 the slot holds "water" with "waves" and "yates" behind it (the decoder's three sentences end in
  water, waves, yates). The camera flies along the three slots, the chosen path lights (I, need, water), the others
  dim, the lattice collapses into the sentence card, the two top sentences rise under it with the ember selection
  ring. Speak, large, is pressed; the app says "I need water".
- *Beats*: bars 11 to 12, presses on eighths, camera locked (STYLE); bar 13, Space then 9 2 8 3 7, the guess morphs
  "w, ya, wat, wave, water", and on the last press "wave" turns into "water" with a 2 f hold (a small impact); bar 14,
  a 45 f flight (`EASE.flight`) along the slots, then the collapse in 14 f; bar 15, the sentences rise and the
  narrator's "and says it out loud" ends on beat 4; bar 16, Speak on beat 1 (3 f hold), the app's voice, music
  ducked, the narrator silent; bar 17, the pull-back to the real phone with the 3D turn (3.2), a breath.
- *Key words*: "Nine keys." "One press per letter." "Out loud." Each appears on the spoken word, next to the keypad.
- *Explains*: each press adds one letter to a word; each word's keys fit several words; the decoder picks the
  sentence; then it speaks.
- *Truth*: words, not letter paths: the decoder looks up the words whose keys match each code and ranks whole
  sentences, which is what the slots show. Only "water, waves, yates" are verified here; the alternatives for 4 and
  6333 must come from the decoder at build time, like every other word on screen (03).

**B. "One press, close up"** (simpler)

- *Picture*: macro on key 9's face (the legend "WXYZ" about 600 px tall); the press; the four letters lift off as
  planes; pull back x6 in 30 f to the keypad with the guess morphing above it at 180 px.
- *Use*: if A's flight cannot be read on a 640 px player in a test still.

**The voice made visible** (for all three app lines)

- *Picture*: the sentence in big moon type; the spoken word at full moon, the rest at 35%; under the spoken word a
  soft ember pool (a blurred fill, never a line) whose size breathes 10% with the voice's loudness. Speak is out of
  frame, so the pool is the one ember thing.
- *Build*: `visualizeAudio()` or `useWindowedAudioData()` (WAV) on the voice file; the word timings in `voice.json`.
- *Why*: the ElevenLabs piece (reference 7) syncs UI motion to audio energy; here the energy is the app's own voice,
  the film's emotional centre.

### 4.4 The proof check: "wafer" is dropped (bars 18 to 22, 600 f)

**A. "Lock and key"** (recommended)

- *Picture*: the water chip, macro (as now). The "Model ranking (opt-in)" card slides in with "wafer". Then the
  keys pressed for "water" become the lock: five keycaps, 9 2 8 3 7, along the top. Wafer's code, 9 2 3 3 7, is cut
  into the bottom edge of its card like the teeth of a key. The card rises into the lock.
- *Beats*: bar 18, zoom into "water", chip forms; bar 19, the opt-in card arrives (12 f); bar 20, columns meet one
  per eighth: 9 fits (tick), 2 fits (tick), 3 against 8 does not: impact (3 f hold, the column's outline in the
  reject pink with an x icon and a dashed border, a low soft "no", not a buzzer), then the card is pushed back (z 0
  to -200 in 12 f, 40% darker); beat 4, the strike draws in 7 f; bar 21, the app's own sentence, small, as UI text;
  the water chip's check gets one low sweep (the proof passed); bar 22, held, the groove out for 2 beats.
- *Narrator*: up to "every word must match your keys" before the impact; silent for the impact and the next beat;
  "So it can't put words in your mouth." after it. Key word super: "Can't put words in your mouth." on the spoken
  words.
- *Explains*: exactly what the proof does: compare the code of each suggested word with the keys pressed; drop it
  if any digit differs.
- *Truth*: the app's own reject style (icon, strike, border, not colour alone) and its sentence: "The model
  suggested "wafer". Your keys spell "water", so "wafer" was dropped and will not be spoken."

**B. "Two layers that do not line up"**

- *Picture*: the two codes as translucent layers in depth, the camera orbiting 20 degrees until the misaligned third
  digit separates, a rack focus to it. More cinematic, less literal; use only if A tests as too toy-like.

### 4.5 Works offline, ghost mode (bars 23 to 25, 360 f)

**A. "The signal goes, the words stay"** (recommended; 12 covers the way in, from the chip to the status pill)

- *Picture*: the real phone. Above it our own signal icon (the Act 1 callback 12 recommends) loses its bars one per
  beat; the app's pill reads "Offline. Using your dictionary." (its real copy, `lib/status.ts`). Then a zoom-through
  the phone's night glass into the phone: a dark space where the dictionary lives as thousands of faint words in
  three depths, drifting. Keys pressed in a translucent keypad plane in front: each word committed brightens its
  matches in the cloud (need; water, waves, yates), which fly forward into the sentence.
- *Beats*: bar 23, bars fall on beats 1 to 4, ticks, the music thins; bar 24, the dive (14 to 16 f, plum or night
  fill only, STYLE), the cloud, presses on eighths, matches brighten within 7 f; bar 25, the tag "Ghost mode" (the
  app's own name for it) on the spoken words, whip out.
- *Explains*: offline decoding is possible because the dictionary is on the device.
- *Truth*: ghost mode is the offline dictionary decoding; it "never depends on the network" (privacy.md). Do not
  say "nothing leaves your device": model ranking, when on, sends digits and candidate words to the provider.
- *Note*: needs STYLE.md to allow content particles (3.8).

**B. "Quiet when the signal drops"** (sound-led, combine with A)

- When the last bar falls, the music drops to a low pad and only the key tones remain; it returns when the
  sentence forms. The silence tells the viewer the network is gone; the key tones say the app is not.

### 4.6 One switch: scanning (bars 26 to 29, 480 f)

**A. "The beat is the scan clock"** (recommended)

- *Picture*: left, a plain round switch of our own (a plum dome about 560 px wide, lit from the top left, a moon rim
  light, on the night floor); right, the keypad, large, with the ember scan ring. The ring steps one row per beat,
  each step on the kick drum; the switch is pressed (it travels 12 px, a contact glow under it, a soft thud); the
  row locks; the ring steps along that row's keys; the next press picks the key, and the letter lands in the card.
- *Beats*: bar 26 beat 4, first press (starts the scan); bar 27, rows 1, 2, 3 on beats 1 to 3, press on beat 4;
  bar 28, keys 7, 8, 9 on beats, press on 9, "w" lands; bar 29, the ring keeps stepping with ticks only, a breath
  before Kiro.
- *Explains*: rows, then keys; the highlight steps, you press.
- *Truth*: the app scans rows, then cells (`packages/core/src/scan.ts`), and its scan also visits the sentence row
  and the action bar (six rows in all, `packages/eval/RESULTS.md`): show them, or start the shot as the ring reaches
  the keypad. A step of 0.5 s is within the app's 0.4 to 5 s range (the default is 1.2 s, `lib/settings.ts`); say
  nothing about speed.

**B. "The press, slowed"**

- *Picture*: an extreme macro of the switch press, ramped to 0.25x around contact (3.6), a sub hit, then a whip to
  the keypad where the ring locks. Tactile; use once if A feels flat.

### 4.7 Built with Kiro (bars 30 to 32, 360 f)

**A. "Beneath the app"** (recommended)

- *Picture*: from the keypad the camera tilts down 12 degrees and dives through a plum key into the layer beneath:
  four glass cards in a corridor, one real file excerpt each, mono at 36 px or more, one key line per card under the
  ember emphasis block. Spec: line 29 of `.kiro/specs/web-ui/requirements.md`, "1.2 WHEN a key 2-9 is pressed, THE
  app SHALL append its digit to the current word's code." Steering: from `.kiro/steering/product.md`, "A proof check
  makes sure every spoken word matches the keys pressed". Hook: the trademark guard's trigger and command. Workflow:
  ship-feature's step ids (plan, build-loop, implement, verify, reviews, aggregate, fix) lighting one per eighth.
- *Beats*: one card per beat in a 30 f flight with a 15 f hold, four cards in two bars; bar 32 rises back to the
  surface.
- *Explains*: specs, steering, hooks and workflows, shown, not listed.
- *Truth*: the lines are real and verified (`components/close/verify-kiro.ts`). The narration says how the work is
  done now; it must not say Kiro wrote the files made before 2026-11-10 (product.md, "How we work";
  `docs/KIRO_LOG.md`, rows of 2026-11-06 and 2026-11-09).

**B. "The spec runs"**

- *Picture*: the EARS line beside the keypad; as "WHEN a key 2-9 is pressed" lights, key 4 is pressed; as "SHALL
  append its digit" lights, 4 appears in the code. One requirement, executed in front of the viewer. Clearer than A,
  less spectacle; good if the Kiro chapter shrinks to one bar.

### 4.8 A simple end card (bars 39 to 43, 600 f)

**A. "Three things, then stillness"** (recommended)

- *Picture*: the icon and wordmark; the address on one line; the intended-purpose sentence, verbatim, 30 px or more,
  on two lines. Nothing else: "Free. Works offline. Runs in your browser." is said by the narrator in bars 33 to 34;
  "Built with Kiro for Kiroween 2026" moves to the Kiro chapter; the generated-voice note goes to the video
  description and the caption file (README D2 already plans the description); "Link in the description" becomes the
  address itself (D9).
- *Beats*: the lockup fades in over 36 f; the address and sentence together over 24 f (two steps, as 12 says); the
  ninth key's ember fades in over 54 f; then nothing moves for at least 7 s, the sentence readable for at least 6 s.
- *Explains*: what it is, where to find it, what it is not.

**B. "Pull back from the ninth key"** (needs the owner's ruling)

- *Picture*: the film's last move is a macro of a key pulling back x20 to reveal it is the ninth key of the icon: a
  bookend to 4.1. 02 says the icon "cuts or fades in whole" and is never animated; a camera move on the icon may count
  as animating it.

## 5. How narration changes the edit

### 5.1 Two clocks

Act 2 now runs on the music; the narrator adds a second clock. Rules:

- Each narration phrase is its own file and starts on a beat or an eighth (the sound agent places them; the film
  already reads word timings for the app's voice, `voice.json`).
- In narrated stretches the phrase decides the cut: cut where a phrase ends, on the nearest beat. In music-led
  stretches the bar decides (3.10). 12 gives the split-edit rule: the narrator one eighth early when the words
  motivate the cut (J-cut), a closing line one beat into the next picture (L-cut)
  ([J cut](https://en.wikipedia.org/wiki/J_cut)).
- Temporal contiguity: "people learn better when corresponding words and pictures are presented simultaneously";
  spatial contiguity: words "near rather than far" from the picture
  ([Mayer 2020, summary](https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf)).
  So the press happens as the narrator says "press", the sentence appears as it says "sentence".
- Fewer hard cuts, more motion inside shots: about 15 to 20 cuts a minute (3.10). The narrator is the continuity.
- The same summary's "immersion principle" (people do not necessarily learn better in immersive 3D than in a 2D
  desktop view) is about virtual reality, not film, so take it only as a hint: use depth for travel and wow, and turn
  the plane to face the viewer (6 degrees or less) whenever something must be understood.

### 5.2 Word budget

- About 150 words a minute is the industry convention (2.5 a second, "it takes time to hear and process data",
  [Bread n Beyond](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/)); it is a
  convention, not research.
- Act 2 is 86 s. Take out about 30 s without narration (bars 1 to 5, the title drop, bars 16 and 17, the proof
  impact, bar 29, bars 37 to 38, the end card; 5.5): about 56 s of speech room, so about 135 words at most at 2.4 a
  second. Plan 110 to 130 so phrases can breathe (4.0 comes to about 120).
- For scale: a 2026 study of 100 UI films found typical films of 1:14 to 1:18 with 65 to 101 spoken words
  ([Advids](https://advids.co/blog/ui-animation-motion-design-trends)). Ours would sit at the high end; do not add
  more.

### 5.3 On-screen text shrinks to key words

- Mayer: people "learn better from graphics and narration than from graphics, narration and printed text, when the
  lesson is fast paced" (summary above); see also Clark and Mayer's chapter
  ["Do not add on-screen text to narrated graphics"](https://www.oreilly.com/library/view/e-learning-and-the/9780787986834/9780787986834_do_not_add_on-screen_text_to_narrated_gr.html).
- A narrated-explainer design system draws the line in practice: "Parroting the script onscreen can make for a dry
  experience", "displaying only the most essential excerpts onscreen can help direct the viewer's focus", "Match VO
  and text as closely as possible", and "all text should be crystal clear without sound"
  ([Jellyvision, onscreen text](https://design.jellyvision.com/foundations/onscreen-text/)).
- So: supers are exact excerpts of the narration, 4 words at most, placed next to the UI they name, appearing 0 to 4
  f before the spoken word (3.9; Jellyvision's "Show text as the host says the words",
  [timing](https://design.jellyvision.com/foundations/timing/)). Drop every super that restates a whole narrated
  sentence. The app's own UI words stay (they are the picture). Sound-off viewers get the full narration in the
  caption file (the film already builds one with `make-srt.ts`); the brand's old "makes sense with the sound off"
  rule now holds with captions on.

### 5.4 The app's voice and the narrator must never be confused

- Sound: a different voice (the owner's request), the app's voice always in silence or under ducked music, never
  overlapping the narrator; at least 0.5 s between them.
- Picture: only the app's voice lights words, in the big sentence (4.3, "the voice made visible"). The narrator never
  gets karaoke, only key words.
- Structure: the narrator falls silent at the end of Act 1 and returns at the title (bar 6). Bars 1 to 5 belong to
  the keypad and its first words, "Hello again".

### 5.5 Breaths for music hits

| Where | Length | What fills it |
|---|---|---|
| Bars 1 to 5 | 10 s | The rebirth's key tones, the build, then silence and "Hello again" |
| Bar 6, beats 1 to 2 | 1 s | The drop |
| Before 12's fold (bar 10) | 1 beat | Reverse swell to the landing |
| Bar 16 | 2 s | "I need water" over ducked music |
| Bar 17 | 2 s | The pull-back to the real phone; the groove at full |
| The proof impact (bar 20) | 1 to 2 beats | The low "no", the groove out for 2 beats |
| Bar 29 | 2 s | The scan steps and ticks alone |
| Bars 37 to 38 | 4 s | "It is good to be back", silence, the motif |
| Bars 39 to 43 | 10 s | Chord, then silence |

Jellyvision's numbers for an explained idea that ends: 1.5 s of silence after the last beat, clearing the screen 1
s into it; for one that continues, 1 s of silence ([timing](https://design.jellyvision.com/foundations/timing/)).
Use them as the minimum gap between chapters. Its music guidance, loops "mixed low" at a walking 115 to 130 BPM
([sound](https://design.jellyvision.com/foundations/sound-effects-and-music/)), fits our 120.

## 6. What this asks of STYLE.md (the lead decides)

1. Allow a depth axis for the camera: dolly in z with planes at -1200, 0 and +300 (3.1).
2. Allow tilts up to 16 to 20 degrees while the camera travels, settling to 6 degrees or less before anything is
   read (now capped at 8, "never 0").
3. Allow defocus in hero shots (rack focus, far planes 8 to 16 px), keeping "darken, not blur" as the default (3.4).
4. Allow light: one sweep per chapter at low intensity (five in the film), glows on the ember thing, ember spill on
   neighbours at 15% or less (3.5).
5. Allow one content particle system: the dictionary's words in ghost mode (3.8).
6. Set minimum scale for hero UI (50% of the frame height) and type (96 px), and drop the tablet and the busy end
   card (4.8).

## 7. What I could not verify

- I watched none of the reference films. Techniques come from the linked texts; the survey gives no years for its
  entries; I could not confirm the Superhuman film's narration, or the Shopify Editions film's year and length.
- The 1 to 3 frame figure for anime impact frames comes from a weak source.
- `@remotion/three` was not installed or measured; the benchmark is one synthetic scene on one machine with other
  work running, and real scenes are heavier.
- Whether `<Freeze>`'s `frame` may change from render to render is not documented.
- The 240 x 240 px flash area is a scaled estimate; only `check-flashes.py` on the final file decides.
- 150 words a minute is a convention; the voice's real rate must be measured from its files.
- Chromium's re-raster rule was not tested inside Remotion's 3D world; check a full-size still at each deep zoom.
- Words other than water, waves and yates in the lattice must come from the decoder at build time; I did not list
  them.
- Durations and intensities marked inferred need a test still or a test render before they are locked.

## Sources

Remotion: [effects](https://www.remotion.dev/docs/effects), [shine](https://www.remotion.dev/docs/effects/shine),
[glow](https://www.remotion.dev/docs/effects/glow), [lens blur](https://www.remotion.dev/docs/effects/lens-blur),
[HtmlInCanvas](https://www.remotion.dev/docs/html-in-canvas), [three](https://www.remotion.dev/docs/three),
[GPU](https://www.remotion.dev/docs/gpu), [performance](https://www.remotion.dev/docs/performance),
[Freeze](https://www.remotion.dev/docs/freeze),
[speed over time](https://www.remotion.dev/docs/miscellaneous/snippets/accelerated-video),
[audio visualisation](https://www.remotion.dev/docs/audio/visualization),
[Trail](https://www.remotion.dev/docs/motion-blur/trail).

Films and studios: [ASAP Motion survey](https://asapmotion.co/guides/saas-launch-video-examples/),
[Figma Specs](https://www.youtube.com/watch?v=WEJ2cZBT3PA), [Linear Releases](https://www.youtube.com/watch?v=6dIwFoQ0eVg),
[Dia sidebar](https://www.youtube.com/watch?v=5vexXIjRbyQ), [Figma Config India](https://www.youtube.com/watch?v=Sdh_I7PSuew),
[Tella on Framer AI](https://www.tella.com/best-product-videos/framer-ai),
[Superhuman](https://blog.superhuman.com/how-we-built-superhuman-ai/), [Vidpros](https://vidpros.com/product-launch-video/),
[ElevenLabs SFX case study](https://contra.com/p/3WlLPv2L-eleven-labs-sfx-model-motion-video-and-social-campaign),
[Opus 5 spot write-up](https://dev.to/remocn/making-a-launch-video-for-claude-opus-5-2jlo),
[Imaginary Forces](https://imaginaryforces.com/project/shopify-editions),
[Stash, Wix Studio](https://www.stashmedia.tv/yambo-studio-launches-wix-studio-with-style-and-substance),
[Stash, Wix Harmony](https://www.stashmedia.tv/new-wix-harmony-product-film-prompts-character-vibes/),
[BUCK](https://www.buck.co/work/github-universe-2024), [GitHub motion](https://brand.github.com/motion/principles),
[Mental Floss on Powers of Ten](https://www.mentalfloss.com/science/math/watch-powers-ten).

Craft and research: [Advids study](https://advids.co/blog/ui-animation-motion-design-trends),
[Wave Motion Cannon](https://wavemotioncannon.com/2016/12/31/an-introduction-to-framerate-modulation/),
[Animation Obsessive](https://animationobsessive.substack.com/p/a-subtle-art-with-visceral-power),
[impact frames](https://www.arhfoundation.org/impact-frames-meaning),
[WCAG 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html),
[audio-video sync](https://en.wikipedia.org/wiki/Audio-to-video_synchronization),
[Chromium re-raster](https://developer.chrome.com/blog/re-rastering-composite),
[Mayer 2020 summary](https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf),
[Clark and Mayer](https://www.oreilly.com/library/view/e-learning-and-the/9780787986834/9780787986834_do_not_add_on-screen_text_to_narrated_gr.html),
[Jellyvision onscreen text](https://design.jellyvision.com/foundations/onscreen-text/),
[Jellyvision timing](https://design.jellyvision.com/foundations/timing/),
[Jellyvision sound](https://design.jellyvision.com/foundations/sound-effects-and-music/),
[Bread n Beyond](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/),
[J cut](https://en.wikipedia.org/wiki/J_cut).

Repository: `film/src/data/decoded.json`, `film/src/lib/camera.tsx`, `film/src/lib/anim.ts`, `film/STYLE.md`,
`packages/core/src/scan.ts`, `packages/web/lib/settings.ts`, `packages/web/lib/status.ts`,
`packages/web/components/ProofPanel.tsx`, `packages/eval/RESULTS.md`, `docs/KIRO_LOG.md`, `.kiro/steering/*.md`.
