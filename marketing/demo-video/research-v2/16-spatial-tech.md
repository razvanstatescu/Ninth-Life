# 16. The spatial look of 0:45-1:35: what breaks it, and how to fix it

Written 2026-11-11 by the technical prototyper, in answer to the owner's note of the same day ("work a bit more on the
spatial effects / look from 00:45 to 1:35 ... the part I've attached ... simply looks broken"). A design researcher is
writing the look itself (lens, planes, shadows, depth of field) in parallel. This file covers the engineering:

- what causes the broken look, with frames and code;
- three prototypes: a lens-correct camera, a disciplined CSS 2.5D rebuild of the proof shot, and the same shot in three.js;
- measured costs;
- a recommendation, an API for the builders, and the changes the lead must make.

**Where the code is.** All lab code is in `film/src/lab3d/`, shown as the `SpatialLab` composition in the Tools folder.
The only change to the film's own code is one line in `src/Root.tsx`. No scene, `components/**` or `lib/**` file was
touched.

**What the owner's screenshot shows.** It is s11 at local frame 180 (1:17.0): the "water 92837" chip, the lock keys
9 2 8 3 7, the teeth 9 2 3 3 7 cut by the "Model ranking (opt-in)" card, and "wafer 92337".

## 0. In one screen

| | |
|---|---|
| **Verdict** | The broken look has engineering causes, and each can be measured. **(1)** The card cuts its own teeth (paint order). **(2)** Translucent card and keys over the dot floor, so the dots print through them. **(3)** The struck card sinks into the floor, up to 226 px. **(4)** Three horizons that never agree: the eye level, where the 78° floor vanishes, and the screen-space haze, 388-1065 px apart. **(5)** The camera's `scale(zoom)` is 2D, so the floor swings 4-7° whenever the camera pushes in, and depth layers and thickness distort. **(6)** The key thickness is drawn on the side a downward-looking camera cannot see. **(7)** Nothing casts a shadow. **(8)** Text on 3D planes is rasterized at a snapped scale: 75-82% sharp at zoom 1.08-1.42, which is exactly s11's compare. Keystone is a minor factor in s11 (2-7%); it is large only in s10's flight and phone match (27-28%) |
| **Recommendation** | **Fix it in CSS**, with disciplined 2.5D: one shared plane, a physical camera, a level floor in its own pass, real thickness, shadows on the floor, depth blur, and `<Crisp>` text. **Do not move s09-s13 to three.js.** It renders fine headless, but it breaks the pixel-matched DOM seams, gives softer text with the brand's variable fonts, and costs days. Keep three.js as an option for one isolated hero shot between hard cuts |
| **First change (seam-safe)** | In `lib/camera.tsx`, replace `scale(zoom)` with `scale3d(zoom, zoom, zoom)`, and add `* cam.zoom` to z in `geo.ts` `project()`. Every pixel at z = 0 stays identical (max 4.6e-13 px over all 18 cameras checked). The floor, depth layers and thickness become correct |
| **Render time** (240 frames, concurrency 4, 1080p, `--gl=angle`, encode included, this machine) | Today's s11: **17-19.5 ms/frame**. CSS rebuild: **17.4 ms**, or 15.3 ms without the depth blur, so the blur costs about 2 ms. three.js: **14.2 ms** (MSAA 4x, soft shadows) |
| **three.js headless** | Yes with `--gl=angle`: ANGLE's Metal renderer, WebGL2, `antialias` true, SAMPLES 4, max anisotropy 16; a 240-frame video render came out correct. It adds +49 MB `node_modules` (22 packages) and about 1-2 MB of JS in every bundle |
| **Stills** | `film/out/spatial-lab/side-by-side.png` (today / CSS / three.js × lock and key / reject / back to "water"); the full-size files `1-rest-*`, `2-reject-*`, `3-end-*`; `camera-compare.png`; `sharpness-zoom1.25.png`; diagnosis stills in `diag/` |

## 1. Diagnosis

### 1.1 The proof (s11, 1:14-1:26)

Frames are s11-local (60 fps; frame 0 = 1:14.0).

1. **The card cuts its own teeth** (from frame 70, 1:15.2, when the card slides in; the owner's screenshot is frame
   180). `Proof2.tsx` draws the five teeth
   (l.135-175), then the card body on top of them (l.176-215).
   - Each tooth hangs `TOOTH.overlap` = 26 px under the body's top edge.
   - Each tooth has only top, left and right borders (l.154-156).

   So the body's edge slices across every tooth. When a tooth docks (frames 414-450, rising 36 px), its open bottom
   shows: a box with a side missing (`diag/s11-420.png`).
2. **Translucent objects over a dot floor** (frames 453-719, 1:21.6-1:26). Both fade with `opacity` instead of
   darkening, so the floor behind shows through. The dots print across "wafer" and across the key caps
   (`diag/s11-480.png`, `diag/s11-540.png`).
   - The struck card fades with S11.tsx l.108: ×0.55 after the push-back, ×0.19 at the end.
   - The lock keys fade with `LockKey`'s opacity (Proof2.tsx l.22, `dim={0.5 * away}` from S11.tsx l.80), down to 0.725.
3. **The card sinks into the floor** (from about frame 500).
   - The card recedes (`translateZ(-260 back - 520 away)`, S11.tsx l.109) and drops (`top + 50 back + 160 away`, l.107).
   - Meanwhile the 78° floor rises behind its line.
   - The card's bottom ends 91 px under the floor surface at away 0.5, and 226 px under at away 1
     (`diagnose.ts`, last table).

   The floor and the card share one 3D context, so the floor is drawn over the card's lower part.
4. **Three horizons.**

   | Horizon | Where (s11) | Why |
   |---|---|---|
   | Eye level, set by the objects | y 330-414 | The camera's pitch |
   | Where the floor vanishes | y -32 to -296, above the frame | The 78° floor |
   | The haze band | y 713 | Screen-space `<StudioGround horizon={66}>` |

   The floor is not the ground the UI stands on. It is a ramp tilted 12° toward the camera: `Floor` angle 78
   (Studio.tsx l.61, 73) and `MidFloor` angle 78 (Parts2.tsx l.48).
5. **The floor swings when the camera pushes.** In `worldTransform` (camera.tsx l.84-85), `scale(zoom)` scales x and y
   but not z, so it changes the floor's depth-to-height ratio.
   - s11's push and impact (frames 380-460, 1:20.3-1:21.7): the seen floor angle goes from 75.6° (zoom 0.86) to 70.8°
     (zoom 1.28).
   - The same happens at s09's push to the macro and at s12's dive (table 1.2).
6. **Thickness on the wrong side.** The keys draw their side as a box-shadow under the cap (Proof2.tsx l.29;
   Keypad.tsx l.88). That is the bottom face. A camera looking down (rx -3 to -8, which STYLE requires so the floor
   shows) cannot see the bottom face; it would see the top face, and the right face when ry < 0. The cue says "seen
   from below" while the floor says "seen from above".
7. **Nothing grounds anything.**
   - `ContactGlow` is a moon-coloured light at 10% (Studio.tsx l.98), not a shadow.
   - The card's drop shadow (Proof2.tsx l.188) lies in the card's own plane, so it reads as a wall 16 px behind the
     card.
   - Nothing casts a shadow onto the floor.
8. **Soft text in the compare** (frames 425-476). Text on 3D planes is 79% as sharp as screen text at zoom 1.18-1.28
   (section 1.4).

**Not the cause in s11.**
- Per-element rotations: everything shares one plane and the camera's turn.
- Keystone: 2.4-6.7% across the lock.

### 1.2 The camera: `scale(zoom)` is a dolly for flat things and wrong for everything with depth

**What the transform does.** `perspective 2400` on the frame, then
`translate(centre) rotateX rotateY rotateZ scale(zoom) translate(-cam)`.

**For anything flat at z = 0**, this is exactly a camera at distance 2400 / zoom. That is a dolly with a fixed lens of
about 45 mm across 1920 px. A close-up is shot from close, so keystone grows with zoom: 4.5% at zoom 1, 8.3% at 1.8 and
14.2% at 3 on the lab's test content.

**For anything with depth, it is not a camera.** z is never scaled, so:
- the floor's tilt changes with zoom;
- translateZ layers lose their parallax, up to 144 px away from where a real camera would put a point at z -300;
- Phone3D's 34 px thickness plates thin out as the camera pushes in.

The table comes from `npx tsx src/lab3d/tools/diagnose.ts`, using today's maths. Columns:
- eye = where a level floor would vanish;
- floor VP = where the 78° floor vanishes;
- haze = `StudioGround`;
- seen = the floor's angle to the screen (90 = edge-on).

| Scene, camera | zoom | rx / ry | eye y | floor VP y | haze y | floor seen | camera distance | keystone |
|---|---|---|---|---|---|---|---|---|
| s09 HOME | 1.30 | -8 / -10 | 203 | -512 | 670 | 66.6° | 1846 | 4.3% |
| s09 MACRO | 1.90 | -8 / -10 | 203 | -862 | 670 | 60.0° | 1263 | 6.3% |
| s10 frame 0 = FOLD_LANDING | 1.00 | -8 / -10 | 203 | -342 | 670 | 70.0° | 2400 | 5.1% |
| s10 flight, CAM_FLY_B (f297-342) | 1.40 | -10 / -24 | 117 | -738 | 670 | 63.4° | 1714 | **28.5%** |
| s10 phone match, CAM_MATCH (f600-655) | 1.80 | -4 / -16 | 372 | -615 | 713 | 65.1° | 1333 | **27.3%** |
| s11 start = PHONE_CAM_END | 0.87 | -3 / -5 | 414 | -37 | 713 | 76.5° | 2759 | 3.8% |
| s11 CAM_STRUCT_A / _B | 0.80 / 0.86 | -5 / -9, -4 / -3 | 330 / 372 | -93 / -75 | 713 | 75.3° / 75.6° | 3000 / 2791 | 6.7% / 2.4% |
| s11 compare, after the impact | 1.22 / 1.28 | -4 / -4 | 372 | -264 / -296 | 713 | 71.5° / 70.8° | 1975 / 1881 | 4.5% / 4.7% |
| s11 CAM_LAST (= s12 frame 0) | 1.19 | -3 / -2 | 414 | -203 | 713 | 72.8° | 2017 | 1.7% |
| s12 CAM_PHONE, then the dive at zoom 14 | 0.75 → 14 | -3 / -5 | 414 | 26 → off | 713 | 77.9° → 14.6° | 3200 → 171 | 3.2% |
| s13 CAM_A / mid-move | 1.10 / 1.00 | -8 / -5, -8 / -10 | 203 | -391 / -342 | 648 | 68.8° / 70.0° | 2182 / 2400 | 2.4% / **10.4%** |

### 1.3 Clipping, occlusion, flattened 3D contexts, mixed spaces

- **Clipping and occlusion:** the teeth and the floor intersection (1.1, items 1 and 3).
- **Flattened 3D contexts.** `opacity` on a `preserve-3d` wrapper flattens it. This happens at S11.tsx l.180 (the phone
  fading out, frames 6-25) and at S12.tsx l.109 and l.114 (the proof parts and the phone, frames 0-40). Phone3D's
  thickness plates collapse into one plane during those fades. Minor, but it is real.
- **Blur filters in 3D.** `filter: blur()` on translateZ layers (S10.tsx l.206 stacks, the Ghost.tsx layers) blurs
  within the layer's own plane. That is fine for planes parallel to the frame, and wrong on a tilted floor.
  - Studio.tsx notes that a blur filter in a tilted World "renders as a hard-edged rectangle". The cause: the layer's
    bounds clip the blur.
  - The fix: pad the filtered box, and give it a painted, near-invisible background (`DepthBlur`, lab3d/stage.tsx).
- **Mixed spaces.** s12's signal icon is in screen space (S12.tsx l.269), beside a phone turned -5°. s09's conversation
  bubbles are also in screen space. Supers belong in screen space. UI objects that belong to the world should be in it.

### 1.4 Text on 3D planes: measurably soft at some zooms

Chromium rasterizes a 3D-transformed layer at a scale it snaps from the transform. Between zoom 1.08 and 1.42 that scale
stays at 1, so the text is up-sampled.

**How it was measured.** The lab's `sharp` view renders the same card at the same on-screen size through each pipeline;
`src/lab3d/tools/sharpness.py` measures it.
- The figure is the 99th-percentile edge steepness, as a percentage of screen-space DOM text.
- Still renders and sequence renders give identical numbers, so this is deterministic and the stills are representative.

| zoom | 0.87 | 1.0 | 1.13 | 1.25 | 1.42 | 1.5 | 2.0 | 2.5 | 3.0 | 3.5 |
|---|---|---|---|---|---|---|---|---|---|---|
| today's World | 92 | 89 | 82 | **79** | **75** | 92 | 92 | 97 | 92 | **55** |
| lens camera (same raster) | 93 | 87 | 82 | 77 | 74 | 94 | 91 | 97 | 95 | 54 |
| today's World + `<Crisp factor={2}>` | — | **99.7** | **98.9** | **95** | **94.5** | 93 | 91 | 86 | 79 | 56 |
| three.js canvas texture (4 px per world px) | 84 | 84 | 81 | 79 | 77 | 77 | 87 | 86 | 83 | 83 |

**What `<Crisp>` does.** It lays its content out twice as large (CSS `zoom: 2`) and scales it back by 0.5, so Chromium
rasterizes the layer at twice the resolution. No re-authoring is needed.

**Where the soft zooms fall in the film:**
- s11's compare and impact, at 1.18-1.28;
- s11's end, at 1.12-1.19;
- s10's card and Speak, at 1.18-1.32;
- s09's home, at 1.3.

**The rule this gives:**
- Wrap text planes read at zoom up to 1.5 in `<Crisp factor={2}>`.
- Leave them unwrapped at 1.5-3.
- Never ask the viewer to read text at about 3.5 on a 3D plane.

## 2. Prototype (a): a lens-correct camera (`src/lab3d/lens.tsx`)

**The model.** A physical camera orbits the look-at point at distance D, with focal length F. In CSS:
`perspective: F` on the frame, then the world transform
`translate(centre) scale3d(s, s, s) rotateX rotateY rotateZ translate3d(-cam)`, with s = F / D. The 3D scale is
uniform, so depth scales with x and y.

**The two modes:**
- **`dolly`**: F = lens, D = lens / zoom. This is today's transform with `scale(zoom)` replaced by
  `scale3d(zoom, zoom, zoom)`. Every z = 0 point lands on the same pixel as today: the max difference is 4.6e-13 px over
  all 18 cameras of section 1.2. The floor, translateZ layers and thickness become correct: points at z -300 move up to
  144 px.
- **`lens`**: F = lens · zoom, D = lens − `dolly`. The perspective no longer changes with zoom, so a close-up is a longer
  lens, not a camera in the subject's face. `dolly` moves the camera on purpose.

**What it exports:** `projectLens`, `aimLens` (geo.ts `aimTilted` for any mode), `horizonY`, `floorVanishY`,
`floorAngleSeen` and `keystone`.

**The comparison** is `out/spatial-lab/camera-compare.png`: the same content (brand keypad, today's 78° floor, a word
stack at z -400 to -1200, a chip at z +160, a slab with Phone3D-style plates) at zoom 1, 1.8 and 3, turned rx -8 / ry -14.

| | zoom 1 | zoom 1.8 | zoom 3 |
|---|---|---|---|
| today: floor seen / floor VP / keystone | 70.0° / -350 / 4.5% | **61.1°** / -819 / 8.3% | **49.5°** / -1569 / 14.2% |
| dolly | 70.0° / -350 / 4.5% | 70.0° / -350 / 8.3% | 70.0° / -350 / 14.2% |
| lens | 70.0° / -350 / 4.5% | 70.0° / -1063 / **4.5%** | 70.0° / -2131 / **4.5%** |

In lens mode, the floor's vanishing point moves only because the whole picture is magnified about its centre. That is
what a lens zoom does.

## 3. Prototype (b): s11's proof in disciplined CSS 2.5D

The code is `src/lab3d/stage.tsx`, `src/lab3d/proof/ProofCss.tsx` and `proof/shot.ts`. It has the same content and
beats as s11 in 240 frames: rest, rise, 9 fits, 2 fits, 3 against 8 fails (impact hold 3 frames), strike, pull back to
"water".

- **Lens and plane.** A long lens: 5200 px focal, about 100 mm, in lens mode, so the push from zoom 1.0 to 1.42 adds no
  distortion. One shared plane, and one shared turn (ry -7 → -4, rx -3.5) that comes from the camera. No element has its
  own rotation.
- **Floor and sky.**
  - The floor is level (90°). It is drawn in its own pass with the same camera, so it vanishes exactly on the eye level,
    and it can never intersect or print over an object.
  - The sky's haze sits on `horizonY(cam)`.
  - Dots are drawn 3× longer in depth, so at the grazing angle they read as dots in rows rather than dashes.
  - The far floor is defocused in screen space: a sharp and a 5 px-blurred copy of the ground pass, crossfaded by a
    vertical mask. A CSS blur on the tilted floor itself would blur along the floor, not on screen.
- **Real thickness.** `<Slab>` stacks the outline in 6-8 layers from z 0 to the face. The visible sides are the ones the
  camera can see: a lit band on top and a shaded band on the right. The side colours carry the key light.
- **Shadows on the floor.** These are radial and linear gradients, with no CSS blur, so they are cheap and never
  hard-edged.
  - The card stands on the floor, with a tight contact shadow and a cast shadow away from a light at the top left, front.
  - The floating keys and chip have faint, wide shadows. From this camera these are correctly hidden behind the card.
- **No clipping.** The teeth are part of the card's silhouette: one SVG path, one stroke, extended per tooth as it docks.
- **Recede by darkening and defocus, never by opacity.**
  - `<DepthBlur>` computes the circle of confusion from the lens: aperture 60 world px, focus at the lock.
  - The struck card goes from about 2 px of blur at the reject to about 10 px at the end, and darkens by colour.
  - The keys darken by colour.
- **Sharp text.** Every slab face goes through `<Crisp factor={2}>`.
- **Cost.**
  - 17.4 ms/frame, against 17-19.5 ms for today's s11.
  - The depth blur (the far card plus the full-frame ground copy) costs about 2 ms/frame: 15.3 ms without it.

## 4. Prototype (c): the same shot in three.js (`src/lab3d/three/`)

**Installed (pinned) and peer dependencies.**

| Package | Pin | Why this version |
|---|---|---|
| `@remotion/three` | 4.0.542 | Peers: `three >= 0.137`, `@react-three/fiber >= 8`, `react >= 16.8`, `remotion 4.0.542`; Remotion tests it with three 0.178.0 and fiber 9.2.0 |
| `three` | 0.178.0 | |
| `@react-three/fiber` | 9.2.0 | Peer `react ^19`, which the film's 19.3.1 satisfies |
| `@types/three` | 0.178.1 (dev) | |

**Install size.** +49.4 MB in `node_modules` across 22 packages (no existing package changed version):
- runtime, about 36 MB, of which `three` is 32 MB on disk (the bundle takes only the core and module builds);
- types, about 13 MB, of which `@types/three` pulls 7.5 MB of a physics engine's typings.

**troika-three-text.** It was evaluated, then uninstalled: it reads woff2 but not variable-font axes, so the brand's
variable Atkinson Hyperlegible Next and Mono would render at their default instance, with no 500/600/700.

**What it renders.**
- Keys, chip and card are extruded rounded shapes with 5-segment bevels. The card's outline includes its teeth and is
  rebuilt when a tooth docks.
- Lights: a hemisphere fill, a key light from the top left, a rim light from behind, and a room environment for the
  plastic's reflections.
- Shadows are VSM, radius 22, from a 1024 map. With PCF-soft, the edges stayed crisp at this scale.
- The floor is fogged dots plus a shadow catcher, under the film's CSS sky.
- Text and decoration are canvas textures with the loaded fonts.

**Headless with `--gl=angle`: yes.** ANGLE's Metal renderer, WebGL2, `antialias` true, `SAMPLES` 4 (MSAA 4x), max
anisotropy 16. The HUD prints this (`"hud": true`). A 240-frame video render produced correct, animated frames
(`out/spatial-lab/timing/video-check.png`, middle row).

**Time.** 14.2 ms/frame at concurrency 4; 420-1090 ms per still (the first one includes shader compilation).

**Text.** Canvas textures at 4 texture px per world px, mipmapped, anisotropic: 77-87% sharp. That is never as sharp as
CSS with `<Crisp>`, but it is steady across zooms. To go higher, use SDF text with static font instances. Cutting those
needs fontTools, which is not installed.

**Not prototyped: depth of field.** It needs a post pass (a bokeh pass in an EffectComposer). The composer renders to a
target that loses the canvas MSAA unless the target is multisampled, so it is an extra cost and an extra risk.

## 5. Stills (full size, 1920 × 1080) and how to reproduce them

**Where they are.** All in `film/out/spatial-lab/`.

| Moment | Today | CSS fix | three.js |
|---|---|---|---|
| Lock and key (s11 f180, lab f40) | `1-rest-current.png` | `1-rest-css.png` | `1-rest-three.png` |
| The reject (s11 f480, lab f156) | `2-reject-current.png` | `2-reject-css.png` | `2-reject-three.png` |
| Back to "water" (s11 f540, lab f236) | `3-end-current.png` | `3-end-css.png` | `3-end-three.png` |

**Also there:**
- `side-by-side.png`: all nine stills.
- `camera-compare.png`: section 2.
- `sharpness-zoom1.25.png`: the six pipelines at s11's compare zoom.
- `diag/`: s09-s13 stills, the s11 contact sheet, and frames from the delivered mp4.

**To reproduce.** Run these from `film/`.

```
npx tsx src/lab3d/tools/diagnose.ts                                   # the numbers of 1.2 and 1.1 (3)
npx tsx src/lab3d/tools/stills.ts out/spatial-lab SpatialLab:156:x --props '{"view":"proof-css"}'
npx tsx src/lab3d/tools/stills.ts out/spatial-lab SpatialLab:156:y --props '{"view":"proof-three","hud":true}'
npx tsx src/lab3d/tools/stills.ts out/spatial-lab/camera SpatialLab:60:z --props '{"view":"camera","mode":"legacy"}'
npx tsx src/lab3d/tools/stills.ts out/spatial-lab SpatialLab:0:s --props '{"view":"sharp","zoom":1.25}'
python3 -I src/lab3d/tools/sharpness.py out/spatial-lab/s.png
npx remotion render src/index.ts SpatialLab out/x.mp4 --props='{"view":"proof-three"}' --concurrency=4 --gl=angle --muted
```

## 6. Recommendation: fix s09-s13 in CSS; three.js only for one isolated hero shot, if at all

**Why CSS.**
- **The causes are local and fixable in CSS.** Every cause in section 1 can be fixed there, and the CSS rebuild reaches
  a coherent 3D read: one horizon, real thickness on the right sides, shadows on the floor, defocus instead of
  translucency, no clipping and sharp text. It does so at today's cost.
- **The film is DOM-native, and its seams depend on it.** That covers the brand parts (Keypad, Parts, BigChip, Supers),
  the real phone captures, the fold, s10's frame 0 (`FOLD_LANDING`), the phone hand-over into s11, and the chip-to-pill
  morph into s12. A three.js hybrid would have to re-solve each seam as a DOM-to-WebGL pixel match, or replace it with a
  hard cut.
- **Text is sharper in CSS.** CSS with `<Crisp>` reaches 93-99.7% in the film's zoom range; three.js canvas text reaches
  77-87%.

**Cost and risk.**

| Option | Work | Risk |
|---|---|---|
| Step 1: `scale3d` in camera.tsx and geo.ts | 15 min, plus regression contact sheets (about 1 h) | **Low.** z = 0 is unchanged and zoom 1 is identical, so FOLD_LANDING is untouched. Things at z ≠ 0 move: s10 stacks, s12 ghost layers, s13 laptop, keycaps and switch, Phone3D plates. Check them |
| Steps 2-4: lens per shot, level floor in its own pass, haze on the horizon, shadows, Slab, Crisp | 1-1.5 days with a review | **Medium.** The look changes: a level floor is more grazing, so rx must be re-tuned per scene. Do both sides of a seam in one go |
| s11 fixes for the mid builder: teeth, no opacity, receding card, `<Crisp>` | Half a day | **Low** |
| three.js for s11's lock and key only | 1-2 days to parity, plus its two seams | **High.** It needs a DOM↔WebGL match at the phone hand-over and at the chip→pill morph, text at 77-87%, and +49 MB of dependencies |
| three.js for s09-s13 | Several days | **Very high.** Every seam, the captures, the fold, the ghost cloud, and the supers must be re-composited |

**Where three.js would earn its place.** A single object whose light and shadow are the point, cut in and out on hard
cuts with no DOM seam. Two examples: the compare as its own macro shot, or the icon's keypad in the close. It works
headless today, at 14 ms/frame.

## 7. An API for the builders

**CSS.** Proposed as `lib/stage.tsx`; the prototype is `src/lab3d/stage.tsx` and `lens.tsx`.

- **`<Studio cam glow ground={{ y, spacing, dot, aspect, far, near }} shadows={…} focusZ aperture groundDof>`.** It
  replaces `StudioGround` + `World` + `Floor`. It draws the sky with the haze on `horizonY(cam)`, the ground pass, then
  the object pass, all with the same camera.
  - The camera's motion blur wraps both passes in **one** `HtmlInCanvas` (STYLE: never two canvases side by side).
- **The primitives:**
  - `<Plane x y z>`: a plane parallel to the frame. The turn always comes from the camera.
  - `<Slab w h r depth face side sideLit layers border outline crisp>`: thickness. It replaces the box-shadow side.
  - `<GroundShadow x z w d lift strength>` and `<CastShadow x z w height elevation azimuth lift strength>`: shadows on
    the floor.
  - `<DepthBlur z box dim>`: defocus from the lens. "Darken first" is `dim`.
  - `<Crisp w h factor>`: sharp text on 3D planes.
- **The helpers:** `project(p, cam)`, `aim(p, screen, cam)`, `horizonY(cam)`, `cocAt(z)`.
- **The rules:**
  - No `opacity` on objects, and no `opacity`, `filter`, `overflow`, `clip-path` or `mask` on a `preserve-3d` wrapper.
  - No element-own rotations.
  - Every object stands on the floor, or has a shadow on it.
  - Read text at zoom up to 3, and through `<Crisp>` below 1.5.

**three.js, if a hero shot uses it.** These would be extracted from `src/lab3d/three/ProofThree.tsx`.
- `<LensRig cam>` maps the same `LensCam` to the three camera, so a cut between a DOM frame and a WebGL frame can match
  framing exactly.
- The parts: `<Key3D digit size depth bevel state>`, `<Card3D w h teeth state>`, `<Chip3D>`, `<Floor3D y>` and
  `<StudioLights>`.
- Text through `canvasTexture()`.

## 8. What the lead changes in `lib/camera.tsx` and `Studio.tsx`, in order, and what happens at the seams

1. **camera.tsx l.85.** Replace `scale(${cam.zoom})` with `scale3d(${cam.zoom}, ${cam.zoom}, ${cam.zoom})`, and in
   geo.ts l.21 write `let z = (p.z ?? 0) * cam.zoom`. This is the 'dolly' mode.
   - **What it fixes:** the floor swing, depth parallax, and Phone3D's thickness.
   - **The seams:**
     - **s09→s10 (FOLD_LANDING):** unchanged. At zoom 1 the 2D and 3D scales coincide for all content.
     - **s10→s11 and s11→s12:** z = 0 pixels are unchanged, and things at z ≠ 0 change identically on both sides
       (same World, same camera).
     - `aimTilted` and `FOLD_LANDING.x/y` are unchanged, because they project z = 0 points.
2. **camera.tsx: give `Cam` a `lens` (focal px, default 2400, log-interpolated like zoom), an optional `dolly`, and
   `zoomMode: 'dolly' | 'lens'`.** In 'lens' mode the World's perspective is `lens × zoom`; `optics()` in lab3d/lens.tsx
   is the reference. Opt in per shot or per chapter, for example lens 3600-5200 for s10-s12's UI close-ups.
   - This changes z = 0 pixels at zoom ≠ 1, so switch both sides of a seam together.
   - If s10 takes a new lens at frame 0, put it in `FOLD_LANDING.cam` (s09 ends on it) and recompute `FOLD_LANDING.x/y`.
3. **camera.tsx: export `project`, `aim` and `horizonY`.** Then delete the copies in `components/mid/geo.ts` and
   `components/problem/geo.ts`, so one maths serves every builder.
4. **Studio.tsx:**
   - **(a)** `Floor` angle 90 (level). Show more floor by tilting the camera down, not the floor up. Add the dot `aspect`.
   - **(b)** Render the floor as its own pass with the same camera (`<Studio>` above): no intersections, and the depth
     blur becomes possible.
   - **(c)** `StudioGround` haze at `horizonY(cam)`, not a fixed 62-66%. It then moves with the camera, identically on
     both sides of each seam.
   - **(d)** Add `GroundShadow`, `CastShadow`, `DepthBlur`, `Crisp` and `Slab`. Keep `ContactGlow` as an optional rim
     light.
   - **(e)** Keypad: draw the side on the faces a downward camera sees (top, and right when ry < 0), or use `Slab`.
5. **Check every seam** with a contact sheet of the last frame and the next scene's frame 0, at scale 1. Their
   difference must be 0.

## 9. Files

**Production (phase A, 2026-11-11, after the decision "CSS, no three.js").**

| File | What it is |
|---|---|
| `film/src/lib/camera.tsx` | The physical camera. It adds `scale3d`, the `lens`, `zoomMode`, `dolly` and `eye` fields, and `project`, `aim`, `horizonY`, `cocAt`, `optics` and `magnification`. Motion blur stays at 10 px a frame by default; `blurAbove` opts into 40 |
| `film/src/lib/stage.tsx` | `Studio`, `Plane`, `Slab`, `GroundShadow`, `CastShadow`, `DepthBlur` and `Crisp` |
| `film/src/components/brand/Studio.tsx` | `Floor level`, the dot `aspect`, children that lie on the floor, and `StudioGround cam` |
| `film/src/components/brand/Keypad.tsx` | `body="slab"` |
| `film/STYLE.md` | "Spatial rules" |

**What changed after this research.**
- **three.js was uninstalled** and its lab view removed. The measurements in section 4 stay as the record.
- **A stall from geometry behind the camera.** With a 40 px motion-blur threshold, sequence renders of s12's opening
  stalled Chromium in every full run (frames 24-36, where its floors reach behind the camera).
  - It happened with both the old 2D zoom and the new 3D one, so it is not the camera change.
  - With 10 px every run completed. So `World` keeps 10 by default, and `blurAbove` is a prop: `<Studio>` uses 40.
  - `<Studio>` keeps its floor in front of the eye.
  - Raise the global default once no scene has geometry behind the camera.

**Lab code** (Tools → `SpatialLab`, the builders' reference).

| File | What it is |
|---|---|
| `film/src/lab3d/proof/ProofCss.tsx`, `proof/shot.ts` | s11's proof shot on `lib/stage` (view `proof-css`) |
| `film/src/lab3d/StageTest.tsx` | `Keypad body="slab"` and a `Slab` card on the level floor, with pitch 0 and a raised eye, lens 5400, then a whip and a push (view `stage`) |
| `film/src/lab3d/CameraCompare.tsx` | The camera comparison, including the old maths (view `camera`) |
| `film/src/lab3d/SharpTest.tsx` | The text-sharpness view (view `sharp`) |
| `film/src/lab3d/lens.tsx` | The comparison maths, including the old `World` ('legacy') |

**Tools** (all in `film/src/lab3d/tools/`):
- `stills.ts`: named full-size stills, with timings.
- `frames.ts`: regression frames, with `--range` and `--timeout`.
- `regress.py`: diffs of two runs, and of seam pairs.
- `sheets.py`: contact sheets.
- `diagnose.ts`
- `nearplane.ts`
- `sharpness.py`

**Changed outside the lab:** `film/src/Root.tsx`, one line (the `SpatialLab` composition in Tools).
