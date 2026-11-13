# Hypermotion reference

Written 2026-11-10 for the Act 2 builders. Read with [02-creative-direction.md](02-creative-direction.md),
sections 5 and 9; where they disagree, the direction wins until the creative lead signs off a change.
Units: 60 fps, 120 BPM: 1 beat = 30 frames (f), 1 eighth = 15 f, 1 bar = 120 f. A sixteenth is 7.5 f, so avoid
sixteenth-note hits or alternate 7 and 8 f.

No brand team has published frame-level breakdowns of these films. Numbers come from Remotion's open-source
trailers (code read), practitioner write-ups with measured values (read), curves measured in this project's
Remotion 4.0.542, and inference, marked "inferred".

## 1. References

| Film | Year | What to take | Read |
|---|---|---|---|
| Remotion 4.0 trailer, https://github.com/remotion-dev/4-0-trailer | 2023 | Springs `damping: 200`, 30 f at 30 fps. A card grid rises a full frame height as the old frame leaves upward on the same spring: a push that reads as a camera tilt. Tiles 3 f apart (6 f at 60 fps) | code |
| Remotion transitions video, https://github.com/remotion-dev/transitions-video | 2023 | Shots of 20 to 37 f at 30 fps in its fast run. Transitions `springTiming({config: {damping: 200}, durationInFrames: 10})`, one at 6, slow ones 20. An `addSound()` wrapper ties `whip.mp3` to a transition, so sound and move share one cue (used once there; reusable) | code |
| Remotion Lambda trailer, https://github.com/remotion-dev/trailer-lambda | 2022, kept for code | `remapSpeed()` speed ramps; stepped time `Math.round(frame / 2) * 2`; emphasis by size ("slow" grows 0 to 500 px as the line before shrinks 120 to 50 px) | code |
| Figma Config 2024 opener (Relay), https://www.figma.com/blog/config-2024-branding/ | 2024 | One minute, built from a "motion library of interchangeable parts" and four named moves. Build a kit of five moves, not 45 one-off shots | write-up |
| Figma Config 2026 opener (Relay), https://www.figma.com/blog/the-visual-identity-behind-config-2026 | 2026 | Glyphs "threading, stacking, looping, and breaking out of containers" | write-up |
| Vercel Ship 2025 opener (Basement), https://basement.studio/post/behind-the-ship | 2025 | Characters on twos (12 fps) inside a 24 fps camera: a stepped layer in a smooth world, like our scene 15 inset | write-up |
| Apple keynote films, https://9to5mac.com/2023/06/21/apple-keynote-videos-transitions-and-editing/ | analysis 2023 | The camera passes through a phone's camera module into Apple Park; "hard to see exactly where the cut is made" | article |
| Linear, "Introducing Linear Diffs", https://www.youtube.com/watch?v=7gZBxBTapDQ | listed 2026 | "Tilted, close crops of a dark code-review interface, ending on the logo" | survey |
| Cursor, "Introducing Cursor 2.0", https://www.youtube.com/watch?v=An8IM-kPyms | 2025 | "Restraint makes the one screenshot land" | survey |
| Framer, "Introducing Skills", https://www.youtube.com/watch?v=ibUWeTP2tzc | listed 2026 | Opens and closes on the command name, a typed prompt between | survey |
| Raycast, "New Raycast. Coming 2026", https://www.youtube.com/watch?v=Mi173xGb0ZA | 2025 | Cropped pieces of a dark interface, names ticking past | https://www.moonb.io/blog/product-launch-video |
| Figma, "Introducing Figma Motion", https://www.youtube.com/watch?v=l3HuAYXyOTo | 2026 | Interface parts as the actors | same |

"Survey" is https://asapmotion.co/guides/saas-launch-video-examples/: 24 launch films, median about 50 s, most
with "one line of on-screen text per scene". Videos were not watched. Practitioner sources:
https://github.com/AbubakrChan/product-launch-motion (values measured off a 44 s launch film) and
https://cutscene.studio/en (launch films in code, UI "rebuilt as crisp vectors").

## 2. Camera

**Rig.** One `<World>` holds every part at fixed coordinates. The outer wrapper translates and scales; the inner
one holds perspective and tilt, so each has its own `transform-origin` (the practitioner's two-node rig; its
judder warning is about competing GSAP tweens, which Remotion's one-transform-per-frame avoids). Zoom in log space
("zooming linearly in z feels wrong"): `Math.exp(interpolate(f, [a, b], [Math.log(s0), Math.log(s1)], {easing}))`.

| Value | Use |
|---|---|
| `perspective` | 2400 px (practitioner range 2200 to 2800; lower bends the far edge) |
| Tilt | `rotateY` enters at -6 to -8 deg (practitioner says -6 to -10; our cap is 8), settles at -1 to -2, never 0. `rotateX` at most 2: "vertical tilt reads as a mistake much faster" |
| Push-in | `transform-origin` at the target's centre, so it stays put while the world grows |
| Near plane | 12 to 22 px `translateZ` on what the story touches (pressed key, card) |
| Hold | At least 30 f still after a move; settle a push before a press |
| Frequency | About one move or cut per bar (45 shots in 43 bars) |

**Easing, measured.** The direction's `cubic-bezier(0.16, 1, 0.3, 1)` covers 43% of the distance on frame 1 of
a 12 f move (49% at 10 f, 58% at 8 f), then 69, 83, 90, 95%. With no acceleration it reads as a cut plus a
settle: right for steps and short pushes, but a 1920 px pan jumps 827 px on frame 1. Proposal (inferred, needs
sign-off): keep it under about 300 px of travel; use `cubic-bezier(0.7, 0, 0.2, 1)` for whips (peak speed at
frame 5 or 6) and `cubic-bezier(0.45, 0, 0.15, 1)` for long flights.

**Springs, measured.** `spring({config: {damping: 200}})` takes 45 f to settle, so always pass
`durationInFrames` (at 12 f: 0, 0.13, 0.36, 0.56, 0.71, 0.82, 0.89, on to 1, never above). With mass 1 a spring
overshoots when `damping < 2 * Math.sqrt(stiffness)`; `{damping: 20, stiffness: 200}` overshot 4.3%.

| Move (sizes inferred) | Frames | Ease | Size | Blur |
|---|---|---|---|---|
| Step to a key or chip | 8 | out-expo | up to one key width | none |
| Push-in on "water" (bar 18) | 12 | out-expo, log | x1.5 to x3 | none |
| Pull back to the device (bar 17) | 14 | (0.45, 0, 0.15, 1), log | /2 to /3 | none |
| Whip (bars 4, 11) | 10 to 12 | (0.7, 0, 0.2, 1) | 1 to 1.5 screens | motion blur, fast frames only |
| Zoom through a plum key | 14 to 16 | (0.45, 0, 0.15, 1), log | x20 to x40 | optional `zoomBlur` 20 to 40 |

**Scene 7** (inferred): an 8 f step per eighth leaves 7 still frames. Lock the camera for each five-press run
and move once, on Space; the ring's jump carries the rhythm.

## 3. Transitions

- **Whip.** The usual After Effects whip is 10 f, blur keyed 0, peak at the cut, 0
  (https://photofocus.com/software/tutorials-software/easy-whip-swish-pan-in-after-effects/), with directional
  blur 100 (https://www.flexclip.com/learn/whip-pan-transition.html) to 250 at 1080p
  (https://tutvid.com/premiere-pro/whip-pan-blurring-transition-effect-premiere-pro/).
  Cut on the fastest frame; land on the beat. Blur length is about step per frame x shutter / 360 (half the
  step at 180 deg); cap near 160 px (inferred).
- **Zoom through.** Dive at the key's centre; once its plum fill covers the frame, swap to the next scene, which
  starts at scale 1.15 and settles to 1. Speed carries over the seam, so the cut vanishes (inferred from the
  Apple example). **Flag:** the bar 8 dive through the icon's ember key fills the frame with ember (relative
  luminance about 0.53 against night's 0.006), then night: bright and back within 20 f, against section 9. Cut
  before ember covers a quarter of the frame, or dive through a plum key.
- **Match cut.** Read the ember element's screen box on the last outgoing frame; place the incoming ember within
  8 px of it (inferred); cut on the beat.
- **Shape mask.** Panel from the ninth key: interpolate `clip-path: inset(t r b l round R)` from the key's box to
  the panel's, radius included, over 14 f.
- **Push.** Old content leaves upward by a full height as new content rises on the same spring (4.0 trailer).

| Reads as premium | Reads as a template |
|---|---|
| Cut hidden in a move, speed continuous across it | Cube, flip, page turn, spin |
| Two or three transitions, repeated as a motif | A new transition every cut |
| Blur matched to speed, on fast frames only | Blur or light leak on every cut |
| Hard cut on the downbeat | Cross-dissolve, flash frame, glitch |

The installed `pushCut` presentation has `flashColor`, `flashOpacity` and `flashFrames`: set `flashOpacity: 0`.

## 4. Kinetic typography

- **Entrance.** The direction's 24 px rise over 6 f is a beat-locked pop: with out-expo, over half lands on frame
  1. The practitioner range for a visible move is 0.24 to 0.38 s (14 to 23 f). Use 6 f for words on beats, 12 f
  for lines off the beat.
- **Mask reveal**, title only: wrapper `overflow: hidden` at 1.15 x line height (keeps descenders); inner span
  `translateY(100%)` to 0 over 8 to 10 f, out-expo.
- **Stagger** (practitioner, in frames): parts of one object 1; cells in a row 2; list rows 3 to 4 (our candidate
  rows: 4); items to count 6 to 9, at most four. On the grid the music staggers: 15 f per word in bar 7.
- **Sizes at 1080p** (inferred): title 140 to 160 px, one-idea card 96 to 120, support line 44 to 56, small print
  at least 30. In a 640 px wide player 96 px shows as 32 px.
- **Reading time**: at most 20 characters a second (research, section 3). Storyboard lines that break it:

| Bar | Line | Characters | Time | Needs |
|---|---|---|---|---|
| 9 | Two lines | 56 | 2 s | 2.8 s |
| 11 | "With one switch, every letter is a wait." | 40 | 1 s | 2 s |
| 21 | The app's "wafer" sentence | 100 | 2 s | 5 s |
| 23 | "Works offline." and the small line | 60 | 2 s | 3 s |

  Fix: hold these across two bars; the "wafer" sentence can stay through bar 22.
- **Type with UI**: one line per scene, in its own zone (left third, or under the UI), never over moving UI,
  inside the 64 px margins. When a new line arrives, dim the old one to 30% and lift it 10 px (practitioner).
- **Emphasis without coloured text** (inferred): the ember block draws in behind the word over 8 f (scaleX 0 to 1
  from the left, out-expo); the word turns `on-ember` in one frame as the block passes its centre, like the app's
  highlight jump. Also: size, isolation, landing on beat 1.

## 5. UI for film

- **Rebuild hero shots in code**, no chrome: keypad, card, list, chips, Speak.
- **Scale up** (inferred): key legends at least 56 px, card text at least 72 px. Capture at device pixel ratio 3;
  never enlarge a capture past 1:1.
- **Typing**: no cursor, no typewriter. A press is the app's ring jumping, the card redrawing with the decoder's
  guess, and a key tone. Scene 13's fingertip ring: 64 to 72 px; a 32 px pointer "read as a smudge"
  (practitioner).
- **Card stack**, scene 14 (inferred): stage `perspective: 2400px`, `rotateY(-6deg)`. Each card enters from
  `translateZ(200px)` in 10 to 12 f and holds 18 to 20 f; older cards step back 120 px in z, up 24 px, and
  darken 12% under a night overlay, not blur. The 4.0 trailer fans cards over one radian: far too steep.
- **Depth**: moon glow behind the hero; 12 to 22 px z offsets; no shadows on night (invisible). Push regions
  back by darkening, not blur.

## 6. Rhythm and sound

- **Grid.** Scene changes, title and Speak on beat 1; presses, words, rows on eighths. Start moves 8 to 14 f
  early so they land on the beat (the practitioner issues targets "~0.3 s early"; a Premiere guide keys a punch
  2 f before the marker, https://store.hollyland.com/blogs/creator-hub/beat-edit-in-premiere-pro).
- **Per 4-bar phrase** (inferred from the transitions video's bursts): bars 1 to 3, one move or cut each; bar 4,
  a fill (whip on beat 4, or 2 to 4 cuts) into the downbeat. Rests: the two voice stops plus one held bar per
  scene (bars 22 and 34 already are).

| Event | Sound | Timing |
|---|---|---|
| Camera move | Whoosh | Peak on the fastest frame, soft hit on landing |
| Something lands | Tick | Only when it visibly stops |
| Key press | Key tone | Press frame |
| Title, end card | Quiet sub hit, 1.7 to 1.8 s | "If everything gets a sub, nothing lands" |
| Before a drop | Riser that stops dead, about 0.3 s of near silence | Practitioner |

Rotate three or four whoosh variants: a cue fired more than twice becomes a tic (key tones are exempt). Align
each file by its peak and trim silent heads, or cues land late.

## 7. Remotion notes

- `interpolate` with `Easing.bezier` for everything on the grid; `spring` only with `durationInFrames`.
- One `camera.ts` exports keyframes `{frame, x, y, logScale, rotY, rotX, ease}` and `cameraAt(frame)`.
- `TransitionSeries` overlaps scenes, so each transition shortens the film and drifts it off the bar grid. Use
  one world plus hard cuts in `<Sequence>` on beat frames; where a presentation is needed, add its length back.
- Motion blur: `<CameraMotionBlur shutterAngle={180} samples={5..10}>` renders that many frames per frame; the
  docs call it "destructive to colors" (https://www.remotion.dev/docs/motion-blur/camera-motion-blur).
  `HtmlInCanvasMotionBlur` (in PipelineTest) has a `disabled` prop: enable it on fast frames only. Directional:
  `blur({radius, horizontal: true, vertical: false})`; zoom: `zoomBlur({amount, center, samples})`; ready whip:
  `blurSlide({direction, blur})`.
- GPU: shadows, gradients, `filter: blur()` and drop-shadow are GPU work, off in headless renders unless `--gl`
  is set (https://www.remotion.dev/docs/gpu); `remotion.config.ts` sets `angle`. Pre-render the moon glow, never
  animate `filter: blur()` on large layers, unmount parts outside the view (inferred).
- Act 1 inset stepping: `Math.floor(frame / 5) * 5`.

## 8. Do and do not

**Do:** one transition grammar, repeated; cuts hidden in moves; 30 f holds; UI sized for a 640 px player; real
decoder output ("a real input is more convincing than any claim", survey); a sound for every visible event.

**Do not:** drift or scale-creep under text; bounce, `back.out`, elastic or squash; cube, flip or spin
transitions; glitch, light leaks, flash frames; blur on every cut; typewriter on brand type; text over moving
UI; tilt past 8 deg or `rotateX` past 2; perspective under 1000 px; a different ease per element; one whoosh
twenty times.
