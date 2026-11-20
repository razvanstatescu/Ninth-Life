# Build guide for the film

Read this before writing a scene. It turns the plan in `../02-creative-direction.md` and
`../03-script-storyboard.md` into code rules. Where this file and the plan differ, this file wins
(it includes the owner's decisions of 2026-11-10).

## Third cut (2026-11-19): ../08-revision-v3.md

The film is 2:18. Two segments are new: s12b, the real-app reel (bars 33-37), and s14, the Kiro chapter (bars 40-46,
narrated). Scenes s13, s15 and s16 keep their 1:58 bar numbers, and `SCENES[id].shift` moves them, so do not
renumber them. The reel shows real captures only, moved as pieces (`components/reel/reel.tsx`). The Kiro chapter
quotes only lines that `verify-kiro.ts` checks. Everything below still applies.

## Second cut: read this first (07-revision-v2.md)

The owner reviewed the first cut. The brief for the second cut is `../07-revision-v2.md`, with the
research in `../research-v2/`. **Where this section and the rest of this file differ, this section
wins.**

**The owner's notes, in short:**
- a real-looking phone and a period phone screen in Act 1;
- a narrator, as one continuous story;
- show the problem, then how we solve it, then the features;
- no tablet;
- a simpler end;
- more wow.

### Owners in the second cut

| Owner | Files |
|---|---|
| Lead | as below, plus `src/audio/Audio.tsx` (playback and ducking), `src/components/brand/Studio.tsx`, `src/StudioLab.tsx`, `scripts/check-narration.ts`, `scripts/make-srt.ts`, the Act 2 values of `NARRATION_AT` |
| Act 1 | as below, plus `public/img/v2/**`, `src/data/plates-v2.json`, and the Act 1 values of `NARRATION_AT` (n01-n06) in `timeline.ts`; ask the lead first |
| Open | `S06.tsx`-`S08.tsx`, `src/components/open/**` |
| Problem | `S09.tsx`, `src/components/problem/**` |
| Mid | `S10.tsx`-`S12.tsx`, `src/components/mid/**`, and `FOLD_LANDING` in `src/components/handoff.ts` |
| Close | `S13.tsx`-`S16.tsx`, `src/components/close/**` |
| Sound | as below, plus `public/audio/narration/**`, `src/data/narration.json`, the numbers in `src/audio/mix.ts` |

### The narrator (section 3 of 07)

- **Placement.** His lines are placed in `timeline.ts` `NARRATION_AT` and played by `<Soundtrack>`.
  Scenes never place voice audio and never duck anything by hand: `Sfx`, `KeyTone` and `Bed` dip
  under him by themselves.
- **Timing helpers** (`components/type/Type.tsx`, all local to your scene):
  - `narrIn(scene, id, word?)`: where a line or one of its words starts;
  - `narrEndIn(scene, id)`: where a line ends;
  - `keyWordFrames(scene, id, first, count)`: word frames for a `<Super>` that shows an exact excerpt
    of his words;
  - `narrWords(id)`: absolute word times.
  Until a line is measured, its words are estimated (0.4 s each); your code must read these
  helpers, never hard-code times, so it snaps to the real lines.
- **Key words.** On-screen text under narration is an exact excerpt of his words (1-5 words), landing
  0-4 frames before the word is spoken. Never a different sentence on screen while he speaks.
- **Silence around him.** He is silent in `QUIET_ZONES`: the app's lines with a beat either side,
  the drop bar, the fold, the proof's impact, the Kiro lift and the closing card.
- **Transitions under his words** are invisible: a match cut, a container transform (one shape
  becoming the next), a push, a cut between phrases. Loud ones (whip, dive, switch-off) go only in
  his pauses. Whooshes only in his pauses; under his words a move gets a quiet tick on landing.
- **The app's voice** (`SpokenLine`) lights its words and breathes a soft ember pool under the word
  being spoken. While it shows, the pool is the one ember thing.

### The look of Act 2: the lit night studio

Reference: the `StudioLab` composition (Tools) and `out/lead/studio-lab.png`.
- **Ground:**
  - `<StudioGround>` behind the `<World>`;
  - inside the `<World>`, `<Floor y={...}>` (the dot floor in perspective) and `<ContactGlow>` under
    what stands on it.
  - The camera must look DOWN to see the floor: `rx` between -6 and -14 (negative). Positive `rx`
    turns the floor edge-on.
- **Objects:**
  - Keys and panels have thickness: `Keypad depth={6..10}`, `state.sink` on a press.
  - A top-left light: `light={1}`.
  - The ember key lights its neighbours: `spillFrom`, `spill` at most 0.15. The spill is the ember
    thing's light, not a second ember thing.
- **Light:** at most one `<LightSweep>` (or `Keypad sweep`) per chapter, intensity at most 0.15 on
  night; 0.22 on the moon panel is the built-in maximum.
- **Scale:**
  - Hero UI fills 50-90% of the frame height. Alternate macro and wide; do not sit at mid size.
  - Supers: hero 128-200 px, normal 88-112 px, small lines 44-56 px.
  - UI text you want read: 36 px or more (Kiro cards included).
  - Check every key frame at 640 px wide: if you cannot read it there, it is too small.
- **Depth:**
  - The camera may travel in depth (`At z`, planes at about -1200, 0 and +300).
  - It may tilt up to 16-20 degrees while it travels, but settles to 6 degrees or less before
    anything is read.
  - Defocus (8-16 px) is allowed on far planes in hero shots; darken first, blur second.
- **Particles:** allowed once, as content: the dictionary's words in ghost mode (s12). Nowhere else.
- **Brand-safe impact:** `impact(frame, at, 3)` from `lib/anim.ts` freezes the subject 2-4 frames.
  Add a 4-6% push over 6-8 frames, a local bloom of at most 240 x 240 px and one sub hit. Never a
  white or inverted frame.
- **The frame rate comes back** (s06 only): `rateRamp(frame, starts, [12, 20, 30, 60])`.
- **No tablet** anywhere. Devices are a phone and a laptop.

### One grammar for transitions (research-v2/12, section 5)

- Content moving left (the camera going right) means the next item.
- Pushing in means a closer look, how it works inside.
- Pulling out means the real thing.
- A hard cut on a downbeat starts a chapter.
- A shape becoming the next shape means "this becomes that". The dive is used twice at most in Act 2.
- Left is the past (then and now).
- **The ember is the baton:** at each chapter change, the last ember thing and the next one sit
  within 8 px of each other, or one visibly becomes the other.

| Boundary | Contract |
|---|---|
| s05 -> s06 (0:28) | Act 1 ends on the ember dot only (`ACT_HANDOFF` in `components/handoff.ts`). s06 reveals the old phone's keypad around it, straight on, the dot being key 9's light ("Same keys") |
| s08 -> s09 (bar 9) | The dive into the icon's plum centre key, the window closing on the key before the moon gaps grow; s09 lands from zoom 1.15 on night |
| s09 -> s10 (bar 18) | The fold: s09 flies its 26 letter cells into `FOLD_LANDING` (owned by the mid builder), landing on bar 18 beat 1; the ember lands in `FOLD_LANDING.emberKey` |
| s10 -> s11 (bar 24) | s11 starts on s10's last frame (the real phone), as in the first cut |
| s11 -> s12 (bar 30) | The water chip becomes the phone's status pill |
| s12 -> s13 (bar 33) | A hard cut on the downbeat; the ember scan ring of s13 starts where s12's last ember thing was, if there is one |
| s15 -> s16 (bar 41) | The icon's ember key fades in where Speak was pressed |

### Data in the second cut

- `decoded.json` has two new parts:
  - `sentences['something-to-say']`: "I have something to say", 4 4283 766384464 86 729;
  - `matches[code]`: the real words for each code, most likely first, with brand names removed.
- Never show the word "neff" (a brand).
- `voice.json` has `something-to-say` (the app's last line). "It is good to be back" is no longer in
  the film.
- `narration.json` holds the narrator's lines (file, duration, word times, internal pauses).
  `npx tsx scripts/check-narration.ts` prints where every line sits.
- "Hell" (the decoder's real step for 4355) stays visible for one eighth, as a quiet Halloween wink.

### Claims, again

- Never "Built with Kiro" (decision D15): say "Made for Kiroween 2026".
- Never "faster", "fewer presses" or any number.
- Never "nothing leaves your device" ("works offline" is fine).
- Never a first-person user testimonial.
- The grey suggestion chip in s09 must look like no real app.
- The intended-purpose sentence is alone on the closing card, verbatim.

### Spatial rules (2026-11-11; research-v2/15-spatial-design.md and 16-spatial-tech.md)

**Keep floors modest (found 2026-11-11).** A `<Studio>` ground that is very large in world px (for example 40000 wide,
26000 far) makes Chromium drop other layers on some frames: text and key faces render blank, differently per frame
(GPU tile memory; the ground pass is drawn twice with `groundDof`). Stay near `width` 16000, `far` 9000, `near` 3000
in screen-px worlds, and scale these down for worlds whose px are larger than screen px (image-px phone worlds).
Motion blur: `World` and `<Studio>` now blur only above 40 px a frame (whips) by default.

The owner called the 3D look of 0:45-1:35 broken. These rules fix it. **For a scene rebuilt on the stage (s09-s13 in
phase B) they replace** the "Ground", "Depth" and "Tilt" lines of "The look of Act 2" above and below; for example,
"the camera must look DOWN, rx -6 to -14" becomes "pitch 0, raise the eye". Scenes not yet rebuilt keep working
unchanged. Reference: Tools → `SpatialLab`, view `proof-css` (s11's proof on this API), plus the `camera` and `sharp`
views.

**The camera (`lib/camera.tsx`).** `zoom` is still the size of the z = 0 plane. `World` now uses a uniform 3D scale, so
depth keeps its proportions as the camera zooms, and the floor no longer swings. New, all optional (old cameras are
unchanged):

| Field | Default | Meaning |
|---|---|---|
| `lens` | 2400 | Focal length in px at zoom 1 (2400 ≈ 45 mm on 1920 px; 5400 ≈ 100 mm) |
| `zoomMode` | `'dolly'` | `'dolly'`: zoom moves the camera, so the perspective grows as it pushes in (today's picture). `'lens'`: zoom changes the focal length (an optical zoom), so the perspective stays put |
| `dolly` | 0 | World px the camera moves towards the subject on top of the zoom (a real dolly) |
| `eye` | 540 | Screen y of the eye level (a lens shift). With no pitch, a level floor vanishes exactly here |

Helpers: `project(p, cam)`, `aim(p, at, cam)`, `horizonY(cam)`, `cocAt(z, cam, { focusZ, aperture })`, `optics(cam)`
and `magnification(cam)`. Use these, not copies of the maths.

**The stage (`lib/stage.tsx`) and the brand parts:**
- `<Studio cam vel ground shadows focusZ aperture groundDof glow>` replaces `StudioGround` + `World` + `Floor`. It draws:
  - the sky, with its haze on `horizonY(cam)`;
  - the ground pass: a level dot floor and the shadows on it, in its own 3D context, so it can never cut or show
    through an object;
  - the object pass: the children;
  - one motion blur for both passes.
- `<Plane x y z>`: a plane parallel to the frame.
- `<Slab w h r depth face side sideLit outline crisp>`: real thickness. Its children are the face's content.
- `<GroundShadow x z w d lift>` and `<CastShadow x z w height lift>`: shadows lying on the floor. Pass them in
  `shadows`.
- `<DepthBlur z box dim>`: defocus and darkening from the lens.
- `<Crisp w h factor>`: sharp text on 3D planes.
- Brand parts:
  - `<Floor level>`: angle 90, dots 3 × longer in depth, children lie on the floor.
  - `<StudioGround cam>`: the haze on the horizon.
  - `<Keypad body="slab">`: real key and panel thickness. Its sides show where a downward camera sees them; there is
    no drop shadow.

**Lens and camera:**
- **Lens for UI close-ups:** 3600-5400. Keep one lens per chapter and never change it inside a shot; 2400 only inside
  a dive or a whip.
- **Pitch 0 (`rx` 0).** Show the floor by raising the eye (`eye` 200-320 for reading shots), not by pitching the
  camera. **Roll 0.**
- **Yaw (`ry`):** at most 4° while text is read, at most 12° per move while travelling. Settle before reading; never
  swing back and forth.

**When to use `'lens'` and when `'dolly'`:**
- `'lens'`: every push or pull on UI that is read, and every UI close-up. The picture magnifies and the shapes stay
  true: keystone stays constant and text planes don't distort.
- `'dolly'`: moves whose change of perspective is the point. That means going inside (a dive), flying through layers
  in depth (the fold, s10's flight), and the default for anything you are not rebuilding.
- Add `dolly` only for a deliberate camera move into depth.
- Interpolation: a key that changes lens or mode is continuous (`cameraAt` interpolates the optics), but keep one lens
  per shot.

**Objects:**
- **Planes:** all parallel, with one shared turn: the camera's. No element turns on its own.
- **Never set** `opacity` < 1, `filter`, `overflow`, `clip-path` or `mask` on a `preserve-3d` element: each one
  flattens the 3D context. `<DepthBlur>` flattens on purpose.
- **Objects are opaque.** They recede by darkening (`dim`, or a colour mix towards night) and by defocus, never by
  transparency. A translucent object shows the dot floor through it.
- **Ground every object.** Either it stands on the floor with a contact `GroundShadow` and a `CastShadow` away from the
  top-left key light, or, if it floats, it has a wide, faint `GroundShadow` with `lift`. No drop shadow on a standing
  card (that is a shadow on an invisible wall).
- **Things that belong together are one silhouette** (`Slab outline`, an SVG path), so nothing is cut by its own body.
- **Thickness shows on the sides the camera sees:** the top when it looks down, the right when `ry` < 0 (`Slab`,
  `Keypad body="slab"`). Never a band drawn under the cap.
- **Nothing reaches behind the camera.** Geometry behind the eye stalls Chromium in sequence renders: s12's opening
  hung this way once its frames rendered as plain DOM. Examples are a floor's near edge, or a plane at a large +z
  during a dive.
  - Keep `ground.near` under 0.6 × `optics(cam).D` at your closest zoom; `<Studio>` clamps it.
  - Fade the floor out before a dive.
  - Until every scene follows this, `World`'s default blur threshold stays at 10 px a frame. With 40, s12's opening
    stalled every full sequence render we tried.

**Text on 3D planes:**
- A face read at zoom up to 1.5 goes through `<Crisp>`; `Slab` does this by default. Below 1.5, Chromium rasterizes it
  at 75-82% sharpness; through `<Crisp>` it reaches 95-99.7%.
- At zoom 1.5-3, pass `crisp={1}`.
- Never ask the viewer to read text at zoom 3.5 on a 3D plane.
- Supers stay in screen space.

**Depth of field and motion:**
- **Darken first, blur second.** At lens 5400, `aperture` 60 gives about 6 px of blur 600 px behind the focus and
  12 px at 1200. Never blur the hero plane or text being read.
- **Motion blur is for whips only:** above 40 px a frame.
  - `<Studio>` does this by default (`blurAbove` 40).
  - A plain `World` keeps 10 unless you pass `blurAbove={WHIP_BLUR_ABOVE}`.
  - Pass `noBlur` while text is read.

**Seams:**
- **The camera must match exactly.** The last frame and the next scene's frame 0 use the same camera object (`lens`,
  `zoomMode`, `eye` included) and the same ground. Check them at scale 1; their difference must be 0.
- **`FOLD_LANDING.cam` is a contract owned by the mid builder.** If s10 adopts a lens or an eye at frame 0, it changes
  `FOLD_LANDING.cam` and recomputes `FOLD_LANDING.x/y` with `project()`, and s09's fold ends on it.

## The owner's direction (2026-11-10)

- **Marketing first.** This is a product launch film for a hackathon, not documentation. Confident,
  premium, crisp, memorable. Every frame should hold up as a still.
- **Recreate the app freely.** The hero shots in Act 2 are rebuilt from our brand components, not
  screenshots. They may differ from the app (bigger, simpler, rearranged) because the app is still
  in development. Never show a feature the app does not have, and keep the app's own words
  (Speak, Show, Menu, Next, Back, Space, "Sentences for your keys", the proof sentence).
- **Real captures** (`public/captures/`, `src/data/captures.json`, arriving from the capture agent)
  are used a few times inside plain device frames, so the film also shows the real app working.
- Generated music, effects and voice (ElevenLabs) are fine. A whole phone may appear in Act 1.
- 16:9, 1920 x 1080, 60 fps, 1:54.

## Who owns which files

Only edit your own files. Shared files belong to the lead. If you need a change in a shared file,
make a local variant in your own folder and say so in your report (a one-line bug fix in a shared
file is acceptable if you report it).

| Owner | Files |
|---|---|
| Lead | `src/timeline.ts`, `tokens.ts`, `fonts.ts`, `lib/**`, `components/brand/**`, `components/type/**`, `audio/**`, `Film.tsx`, `Root.tsx`, `Lab.tsx`, `BeatCheck.tsx`, `scripts/contact.ts`, `scripts/build-data.ts`, this file |
| Act 1 | `src/scenes/S01.tsx`-`S05.tsx`, `src/scenes/Act1Sound.tsx`, `src/components/act1/**`, `scripts/images/**`, `public/img/**`, `src/data/plates.json`, `manifest/images.json`, `_takes/images/**` |
| Act 2, opening | `src/scenes/S06.tsx`-`S09.tsx`, `src/components/open/**` |
| Act 2, middle | `src/scenes/S10.tsx`-`S12.tsx`, `src/components/mid/**` |
| Act 2, close | `src/scenes/S13.tsx`-`S16.tsx`, `src/components/close/**` |
| Sound | `public/audio/**`, `src/data/voice.json`, `src/data/music.json`, `manifest/audio.json`, `scripts/audio/**` |
| Captures | `public/captures/**`, `src/data/captures.json`, `manifest/captures.json`, `scripts/capture/**` |

Write review images to `out/<your-role>/` (for example `out/act1/`). Never delete other people's files.

## Time

- Film.tsx mounts every scene in a `<Sequence>`, so inside a scene `useCurrentFrame()` is LOCAL
  (0 = the scene's first frame). Scene lengths are fixed in `timeline.ts`; do not change them. If a
  scene truly needs a different length, stop and tell the lead.
- `atIn('s07', 3, 2, 1)` = local frame of bar 3, beat 2, second eighth. `tIn('s02', 6.5)` = local
  frame of film time 0:06.5 (Act 1 uses seconds). `sec(0.4)`, `BEAT` (30), `EIGHTH` (15), `BAR`
  (120), `JUMP` (7 frames = the app's 120 ms highlight change).
- Never write a bare frame number in a scene. Write seconds, beats or named constants.
- In Act 2, things land on beats and eighths: key presses on eighths, supers on beats or eighths,
  cuts on bar lines or beat 4 -> bar line.
- Music and the app's voice are global (`audio/Audio.tsx` `Soundtrack`, times in `VOICE_AT`). Scenes
  only place sound effects and key tones. Do not add music in a scene.

## The look of Act 2

- **Ground:** `<NightGround>` behind everything, and `<DotField>` inside the `<World>` so camera
  moves read as moves. Colours only from `tokens.ts`.
- **One ember thing on screen.** Ember things: a lit key, a pressed-key ring, the Speak button, a
  selected candidate's ring, an emphasis block behind a word, the icon's ninth key, a scan ring.
  At any frame there is at most one of them. Ember is a fill, never text, never a hairline.
- **Type:** `<Super>` (screen space, word masks). ExtraBold 800. Sizes: hero line 128-160 px, a
  normal super 88-112 px, a small line 44-56 px. One idea per card, 1-5 words, sentence case, no
  exclamation marks. On screen at least `0.35 s x words + 0.5 s`. Readable at half size.
- **Parts:** `Keypad`/`Key` (sizes 128-200 for hero shots), `SentenceCard`, `Candidate`,
  `ProofChip`, `SpeakButton`, `QuietButton`, `StatusPill`, `DeviceFrame`, `AppIcon`, `Wordmark`,
  `Icon`. All pure: drive every state from the frame. See `src/Lab.tsx` for a working example.
- **Depth:** gentle 3D tilt on UI planes (rx/ry up to 10 degrees through the camera, or per part
  with `transform: rotateX() rotateY()` inside the world), the `lift` shadow, a soft moon glow
  behind hero objects. No lens flares, no particles, no fog, no parallax layers of junk.
- **The app's behaviour is shown truthfully:** highlights jump (`jump()`), nothing bounces or
  overshoots (springs only with `damping: 200`; prefer `ramp()` with `EASE`).

## Motion vocabulary (use these; do not invent a new look per scene)

| Move | How |
|---|---|
| Camera arrival | `useCamera` keys; 8-14 frames; `EASE.camera` (fast start, soft landing) for moves under about 300 px on screen; `EASE.flight` for longer flights. Start the move 8-14 frames early so it LANDS on the beat. Hold at least 30 frames after, unless it is part of a deliberate rapid run |
| Tilt | Perspective 2400 (the World default). A plane enters tilted -6 to -8 degrees and settles at -1 to -2, never exactly 0, so it keeps some depth; up/down tilt 2 degrees or less while text is being read |
| Whip | 10-16 frames; `EASE.whip`; long distance (1200+ world px) or big zoom change. `<World>` adds directional/zoom blur by itself when the picture moves fast. Pair with a `whoosh-*` |
| Zoom-through | Zoom into a part until its fill covers the frame (zoom 20+), then cut to the next shot on that colour; the next shot starts at zoom 1.15 and settles to 1, so speed carries across the cut. Use a PLUM or NIGHT part, never a moon or ember one (a full-frame bright flash) |
| Card stack | Perspective 2400, the stack turned about -6 degrees. Each card enters from z +200 in 10-12 frames and holds 18-20; older cards step back 120 px in depth and darken 12% (no blur) |
| Word reveal | `<Super>`: each word rises out of its mask in 12 frames, 3 frames apart, or on given `wordFrames` |
| Super exit | Cut (default) or `outMode="up"` (8 frames) |
| Key press | `press: jump(frame, f)` on the key for about an eighth note; play `<KeyTone k=... at={f} />` |
| UI arrival | A part rises 24 px and fades in over 6-10 frames (`ramp` with `EASE.camera`), siblings 4 frames apart. Or cuts in on the beat |
| Emphasis | `emphasis={{ word: i }}` on `<Super>`: an ember block wipes in behind the word (8 frames) |

Do not move the camera on every key press: frame the action and let the ember ring jump. Move on
phrase boundaries (for typing: lock the camera for a word, move once on Space). Small "breathing"
drifts (1-3% zoom over a hold) are fine. Per 4-bar phrase: one move or cut in each of bars 1-3, a
fill in bar 4. Big changes on beat 1; events on eighths.

Springs: `spring({ damping: 200, durationInFrames })` (always give a duration; without one it takes
45 frames to settle at 60 fps). Anything with less damping overshoots: not allowed.

Reading speed: at most 20 characters a second of on-screen text that the viewer must read
(supers). UI text inside a recreated screen (for example the proof sentence) is read at a glance
and may be longer, but the point of the shot must also be carried by a short super.

Motion research with numbers and sources: `../06-hypermotion-reference.md` (approved by the lead;
where it and this file differ, this file wins). Remotion trailer source code to learn from:
`/private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-Ninth-Life/4e3e6d09-fc68-47d4-aaca-b1da16a417a8/scratchpad/repos`.

## Transitions between scenes (handoffs)

| Boundary | Out (end of earlier scene) | In (start of later scene) |
|---|---|---|
| S05 -> S06 (0:28) | Last frame: black/night, ONE ember dot, 28 px diameter, at the exact centre (960, 540), soft glow `0 0 24px rgba(255,177,61,0.6)`. Nothing else | First frame: the same dot, same place and size. It grows into the ninth key |
| S06 -> S07 -> S08 -> S09 | One builder: continuous camera, cut to the spoken line, cut to the drop, dive through a plum key into S09 | |
| S09 -> S10 (bar 12) | Whip out over the last 10 frames of S09: content flies LEFT (camera moves to +x), with `whoosh-2` peaking at the cut | Whip in over the first 10 frames of S10: content arrives from the RIGHT moving left and lands (camera arriving from -x side relative to target, i.e. content still flying left) |
| S10 -> S11 -> S12 | One builder | |
| S12 -> S13 (bar 27) | Hard cut on the bar line, S12 ends on a held shot | S13 starts on its first shot, fully formed |
| S13 -> S14 -> S15 -> S16 | One builder | |

## Sound effects in scenes

`<Sfx id="..." at={localFrame} volume={...} />`, `<KeyTone k="4" at={f} set="new" />` (Act 2) or
`set="old"` (Act 1). Ids are in `src/audio/Audio.tsx` (`SFX`): tv-on, tv-off, static-burst(-2),
crackle, rise, ember, sub-hit, riser, reverse-swell, whoosh-1/2/3 (thud near the end: start about
0.45 s before the landing), whip (small moves), tick (something lands), thump, no (a mismatch),
button (the switch), flip, chord-tail. Files are silent placeholders until the sound designer
delivers; place them anyway. Keep it sparse: a sound for every visible event, never more than two
or three per beat. Key tones about 0.7, whooshes 0.5-0.8, ticks 0.4.

## Data you can read

- `src/data/decoded.json`: from the real decoder. `sentences['hello-again'|'i-need-water'|'good-to-be-back'|'hello'|'good']` with `presses`, `steps[i].text` (what the card shows after press i), `steps[i].codes`, `candidates` (top 3), `proof`; `cycle4663`; `proof` (water/waves/wafer, `reject.diffAt`); `keypad.keys`.
- `src/data/voice.json`: word timings of the three spoken lines (placeholder until the sound lands; your code must read it, not hard-code times). `voiceWords(id, at)` in `components/type/Type.tsx`.
- `src/data/captures.json`: real app captures with element boxes (arriving soon; code defensively: if a capture is missing, fall back to a recreated screen in the frame).

## Rules that never bend

- Never write the four banned marks listed in `.kiro/steering/trademarks.md` (a maker of old phones, the two-character name for 9-key predictive text, two keyboard apps), in any file, comment or name. Say "9-key predictive text", "the old phone keypad". `node scripts/tm-lint.mjs` (from the repository root) must pass.
- No claims beyond `.kiro/steering/product.md`: free, works offline, runs in your browser, every spoken word matches the keys you pressed. No medical words, no speed or accuracy numbers, no "AI understands you".
- The intended-purpose sentence (end card) is verbatim from `product.md`.
- No `Math.random()`, no CSS `transition`/`animation`, no timers. `random(seed)` from remotion.
- Viewer safety: never more than 3 flashes a second; a cut between a mostly-night frame and a mostly-moon/ember frame counts. No saturated red. Act 2 has no static, glitch or flicker.
- Performance: `<HtmlInCanvas>` only where needed; do not wrap an `<HtmlInCanvasMotionBlur>` next to another canvas (it fails); use the `<World>` blur or `blur({horizontal})` instead. Large CSS blurs and shadows on full-frame layers are slow: measure.

## How to check your work

1. `npx tsc -p tsconfig.json --noEmit`
2. Contact sheet of your scene: `npx tsx scripts/contact.ts S07 0 359 12 out/open/s07.png --scale 0.3 --cols 6`
   (composition ids are `S01`..`S16`; frames are local to the scene). Then look at the PNG.
3. A full-size still at a key frame: `npx tsx scripts/contact.ts S07 200 200 1 out/open/s07-200.png --scale 1`
4. Check: composition and balance, text never clipped, readable at half size, one ember thing,
   camera holds long enough to read, nothing bounces, the handoff frames match the table above.

Do not open the Studio and do not render the whole Film; the lead does that.
