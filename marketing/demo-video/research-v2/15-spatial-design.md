# Spatial design for 0:45 to 1:35

Research v2, field 15. Written 2026-11-11 after the owner's note on the second cut: "I would work a bit more on the
spacial effects / look from 00:45 to 1:35 especially the part I've attached in the screenshot that simply looks
broken. Do more research into how can you improve that 3D / spacial effect you went for."

Read it with [11-act2-hypermotion-wow.md](11-act2-hypermotion-wow.md) (the "lit night studio", wow techniques,
costs) and [12-transitions.md](12-transitions.md) (grammar, ember baton). This file does not repeat them. Where it
corrects them, it says so. Units: 1920 x 1080, 60 fps, 120 BPM, 1 beat = 30 frames (f), 1 bar = 120 f.

**Method.** I extracted the frames of `film/out/ninth-life-hello-again.mp4` at 0.5 s steps from 0:44 to 1:36 and the
18 frames of the lead's sheet at full size, and looked at them. I read the camera and floor code
(`src/lib/camera.tsx`, `src/components/brand/Studio.tsx`, `src/components/mid/*`, `src/components/problem/*`) and
recomputed its projection in Python (`project()` in `mid/geo.ts` is the same maths). I rendered proof stills of the
proposals as plain HTML and CSS in headless Chrome 157 (not in Remotion, not film code; images in
[15-spatial/](15-spatial/)). I watched no video: every claim about other work comes from the linked page. "Inferred"
marks my own reasoning; "measured" marks a number I computed or measured here.

## 0. The short version

1. **The owner is right, and the cause is the camera rig, not the content.** Three things break the illusion:
   - The floor is not a floor. `Floor` is tilted `rotateX(78deg)`, so it is a ramp rising 12 degrees, and because
     the zoom is a 2D `scale()`, its slope changes with the zoom: 5 degrees in the phone shots, 22 degrees in the s09
     macro. Its horizon sits 220 to 1,070 px above the horizon the camera gives the UI (measured, section 1).
   - The camera pitches and yaws together on a 45 mm-equivalent lens (perspective 2400), and the yaw changes on
     almost every camera key. Rows of UI above and below the horizon lean opposite ways, which reads as "every
     element at its own angle".
   - Nothing is grounded or lit: no shadows (the `ContactGlow` is a light, not a shadow), see-through dimming
     (opacity), drop shadows that imply a wall behind standing cards, and keys whose bottom lip says "seen from
     below" over a floor seen from above.
2. **Premium UI-in-space films get depth from light, ground and layers, not from turning text.** Apple's spatial
   design guidance: "Keep text flat when used as an interface element", "prefer subtle depth", and depth "needs to be
   reinforced with visual cues like light and shadow" ([WWDC23 10072](https://developer.apple.com/videos/play/wwdc2023/10072/)).
   Long lenses reduce perspective distortion ([Autodesk](https://help.autodesk.com/cloudhelp/2015/ENU/3DSMax/files/GUID-DD235AB4-FD21-47F8-9F1B-B5518F453EF3.htm)),
   and if a screen gets hard to read, "reduce the angle or perspective before enlarging the whole device"
   ([Rotato](https://www.rotato.app/help/adjusting-3d-perspective)).
3. **A new rig, five numbers** (section 5): perspective **5400 px** (about a 100 mm lens; today 2400, about 45 mm);
   **zoom as a 2D scale outside the 3D world** (an optical zoom, so keystone never changes with zoom); **pitch 0**,
   with the eye height set by `perspective-origin` (a lens shift); **yaw at most 4 degrees** while text is read and
   12 degrees per move while travelling; **the floor exactly perpendicular** (`rotateX(-90deg)` in world space).
4. **Ground every standing thing** with a light pool on the floor, a tight dark contact shadow inside it, a soft
   penumbra pushed back-right by the top-left key light, and a faint blurred reflection. Shadows read on night when
   the floor under them is lit, which is how photographers shoot dark products on black.
5. **s11, the priority** (section 6.3): show each code once. Today the same five digits appear four times (water's
   code, the lock keys, the teeth, wafer's code) and the card's border cuts the teeth. Proposal A: the five pressed
   keys on a strip of the keypad's moon panel are the lock; "water" is a chip attached to the strip; the model's
   suggestion is one silhouette, a blade with its code as teeth, standing on the floor; the teeth extend one per
   eighth; frontal camera. Stills: [now](15-spatial/01-s11-now-annotated.png),
   [proposal](15-spatial/03-s11-proposed-rig-impact.png).
6. **s12** (section 6.4): contain the dictionary inside the phone ("the ghost phone": the body turns to glass and the
   words live in its silhouette, defocused, only the matches sharp) instead of a full-frame cloud. True 3D
   (three.js) clearly beats CSS only here, if the team wants the dive: thousands of words with real depth of field.
7. **Seven cheap tells to remove everywhere** (section 3.10): screen-space text beside yawed world UI; opacity on 3D
   objects; box-shadow as a drop shadow on standing cards; a dot pattern on a grazing floor (it aliases into dashes);
   crops through words; motion blur on slow moves under narration (the World blurs anything over 10 px a frame,
   which smears text: frame 1:18.5); the camera's yaw swinging back and forth between keys.

## 1. The lead's read, checked

| The lead's read | Verdict | Evidence (measured unless marked) |
|---|---|---|
| Every element has its own angle and plane | **True** | s09: the other person's lines and the supers are screen space (`problem/layout.ts`: "the other person's lines (screen space, drifting up)"), the field and grid are in a world yawed -10 and pitched -8. s11: one world, but the yaw goes -6, -9, -3, -5, -6, -4, -5, -2 over 12 s (`mid/s11.ts` cameras), and the horizon (y = 357 at 1:17.5) runs through the middle of the stack, so rows above it lean up-right and rows below lean down-right: the chip's top edge rises 6 px across, the teeth's top edge falls 4 px ([annotated frame](15-spatial/01-s11-now-annotated.png)) |
| Big close-ups get strong keystone (yaw, short perspective, 2D zoom) | **True, with a correction** | Perspective 2400 on a 1920 px frame is a 43.6 degree horizontal field, about a 45 mm lens. A plane that fills the frame shows a near/far size ratio of 1.09 at 6 degrees of yaw and 1.13 at 9 degrees; at 5400 px it is 1.04 and 1.06. The 2D `scale(zoom)` does not make that worse by itself (the keystone at the frame edges depends only on lens and yaw), but it makes the rig inconsistent: under yaw it acts like a dolly for in-plane geometry and like a zoom lens for `translateZ` offsets, and it changes the floor's slope (next rows) |
| Parts clip each other (the card cuts the teeth) | **True** | `ModelCard` draws the teeth, then the card body over them with a 26 px overlap (`TOOTH.overlap`) and a border, so the teeth look sunk behind the card. At the impact the card moves back in z while the teeth still compare, so the columns leave their keys (1:21.6). In the fold (1:01.7) the letter cells pass through each other |
| Objects float over a dot floor whose vanishing point does not match | **True** | The floor is `rotateX(78deg)`: a ramp. Its horizon vs the horizon of a true floor under the same camera: s09/s10 landing y = -342 vs 203 (545 px apart); s09 macro (zoom 1.9) -862 vs 203, the floor rising 22 degrees; s11 compare (zoom 1.18) -245 vs 372; the whole-phone hold (zoom 0.435) 190 vs 414, rising 5 degrees; the upper-half phone shots (zoom 0.87) -37 vs 414, rising 10.5 degrees. 11 (section 3.12) recommended 74 to 80 degrees; that number is the cause. The close builder already compensates for the slope in code (`S13.tsx`: "The floor is tilted 12 degrees from level") |
| Nothing is grounded: no shadows, no depth of field | **True** | `ContactGlow` is a moon ellipse at 10% (a light). Cards carry `box-shadow: 0 16px 40px` on their own vertical plane, which implies a wall behind them. Keys carry a solid bottom lip (`0 8px 0 0 #170c34`), the look of a key seen from below, while the floor is seen from above. Depth of field appears only on the ghost layers and lattice stacks (1.2 to 3 px) |
| The ghost-mode cloud reads as clutter | **True** | `mid/Ghost.tsx`: 280 + 170 + 64 words across the whole frame; the near layer is 48 to 92 px at 40 to 60% moon, the same size and brightness range as the matches, so nothing leads (1:30.0, 1:31.2) |

Found besides the lead's list:
- **Motion blur on slow moves.** `World` blurs any move above 10 px a frame (`BLUR_THRESHOLD`); the step-left under
  "Every word must match" smears all text (frame 1:18.5).
- **See-through dimming.** The lock keys and the pushed-back card dim through `opacity`, so the floor's dots show
  through them (1:21.6 to 1:25.5). In CSS, `opacity` below 1 also forces `transform-style: flat` on that element
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style)).
- **Crops through text.** The keypad's legends at the left edge (1:06.5, 1:09.0), the bubble at the top edge
  (0:52.5), teeth slivers at the bottom edge for 3.5 s (1:22.5 to 1:25.5), the keycap "8" at the right edge (1:33.5).
- **Repetition.** In s11 the viewer compares 20 digits to find one.

## 2. References: how UI is staged in space when it looks premium

Few studios publish camera numbers for UI films; the guidance with numbers comes from design systems built for UI
in space, CG camera documentation, product photography and perception research. 11 (section 2) already lists twelve
launch films; these add the spatial side.

**Design systems for UI in real space**
- **Apple, visionOS.** Spatial layout: "Provide visual cues that accurately communicate the depth of your content",
  "Use depth to communicate hierarchy... the window recedes along the z-axis", "In general, avoid adding depth to
  text" ([HIG, spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout)).
  Principles of spatial design: "prefer subtle depth. It's easy to overdo"; "Text... can be distracting and difficult
  to read when it's 3D, especially at an angle"; panels "always turn to face someone when moving"; "most other
  objects should cast a shadow... This grounds them" ([WWDC23 10072](https://developer.apple.com/videos/play/wwdc2023/10072/)).
  Design for spatial UI: ornaments at a window's edge "overlap the bottom edge by 20 points"; a sheet appears and
  "The parent window pushes back and dims"; and, for layered icons, "Avoid using large regions of semitransparent
  pixels" ([WWDC23 10076](https://developer.apple.com/videos/play/wwdc2023/10076/)). Comfort: conflicting depth cues cause
  discomfort; repeating patterns should be broken up; "avoid fast turns or pure rotational motion"; avoid
  oscillation near 0.2 Hz; "utilize higher contrast for reading text and lower contrast, transparency, or blur to
  redirect visual attention elsewhere" ([WWDC23 10078](https://developer.apple.com/videos/play/wwdc2023/10078/)).
  These are for a headset; that they carry over to a flat film is my inference, strongest for text and shadows.
- **Apple, Liquid Glass** ([WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/)): highlights come
  from light sources that "move in space... defining its silhouette"; a larger glass element "casts deeper, richer
  shadows"; the shadow's opacity rises over text "to create additional separation"; "always avoid glass on glass".
- **Google, Material.** Two lights: key light for directional shadows, ambient light for soft shadows "from all
  angles" ([Material 1, environment](https://m1.material.io/material-design/environment.html)). In the dark theme,
  shadows are hard to see, so elevation is shown by lighter surfaces: a white overlay of 5% at 1 dp up to 16% at
  24 dp ([Material 2, dark theme](https://m2.material.io/design/color/dark-theme);
  [Flutter's implementation note](https://flutter.googlesource.com/mirrors/flutter/+/e17f8d367d1f1f01b99fd858881c70729fb27318%5E%21)).
  Material 3 moved to tonal surfaces; I did not check its numbers.
- **Microsoft, Fluent**: built on "light, depth, motion, materials, and scale"
  ([Microsoft Design](https://medium.com/microsoft-design/fluent-design-behind-the-design-973028062fcc)). I found no
  official numbers for its depth layers.

**Studios and product teams**
- **Microsoft Surface Copilot+PC launch films** (Microsoft Visual Design with Wes Cockx, 2024): the credits separate
  a "UI Production Director" and UI designer from the CG director, CG artists and 3D animators
  ([Stash](https://www.stashmedia.tv/wes-cockx-launches-surface-copilotpc-for-microsoft)). The page gives no camera
  details; the split itself is the lesson: the UI is designed flat at final size, and the 3D work is the stage around it (inferred).
- **Territory Studio**, screen graphics for film: "the viewer immediately recognizes when something is just numbers,
  or scrolls randomly in the background"; for information that is not relevant, "we can do a much cruder version"
  ([interview, 2017](https://www.pushing-pixels.org/?p=13856)). In their holographic work "Depth of field is used to
  help keep the UI legible" ([HUDS+GUIS on Shanghai Fortress](https://www.hudsandguis.com/home/2019/shanghai-fortress)).
  This is the answer to the ghost cloud.
- **Ordinary Folk for Spline** (2022): a launch film made inside a browser-based real-time 3D tool
  ([Stash](https://www.stashmedia.tv/?p=85806)). Evidence that real-time browser 3D can carry a studio-grade film;
  the page has no technique details.
- **Linear, "A Linear spin on Liquid Glass"** (2025): "we modeled a physical light source that moves through space",
  keeping "a sense of depth without losing clarity" ([Linear](https://linear.app/now/linear-liquid-glass)).
- **Rotato** (a device-mockup animation tool): "A stronger perspective makes depth more pronounced"; "If the screen
  becomes difficult to read, reduce the angle or perspective before enlarging the whole device"; for animations it
  advises checking the most angled part of the move, not only the first frame
  ([help](https://www.rotato.app/help/adjusting-3d-perspective)). On depth of field:
  "used to direct attention", but not when "showing your audience a complete design for the first time"
  ([blog](https://rotato.app/blog/depth-of-field)).
- **Practitioners on mockups**: realistic mockups need soft shadows that match the light, because "Our brains are
  incredibly good at detecting light inconsistencies" ([DEV, 2026](https://dev.to/sudhanshu_verma_a476f5eeb/what-makes-an-iphone-mockup-actually-look-real-3o4b)).

**Camera craft**
- "Short focal lengths (wide FOV) emphasize the distortions of perspective"; "Long focal lengths (narrow FOV) reduce
  perspective distortion"; a 50 mm lens "appears normal" ([Autodesk 3ds Max](https://help.autodesk.com/cloudhelp/2015/ENU/3DSMax/files/GUID-DD235AB4-FD21-47F8-9F1B-B5518F453EF3.htm)).
- David Ariew (School of Motion): Cinema 4D's default 36 mm is "a relatively wide lens"; long lenses suit tracking
  and orbiting shots and "enhance the parallax"; "wider lenses have a feeling of moving faster"
  ([choosing focal length](https://www.schoolofmotion.com/blog/professional-guide-renders-look-better-choose-focal-length)).
  So: long lens for the product, wide lens only for speed (the dives).
- Shift lenses keep verticals parallel: the camera stays level and only the lens moves up, instead of tilting the
  camera ([Cambridge in Colour](https://www.cambridgeincolour.com/tutorials/tilt-shift.htm);
  [Amateur Photographer](https://amateurphotographer.com/technique/camera_skills/beat-converging-verticals-and-leaning-in-lines)).
  CSS has the same tool: `perspective-origin` "is used as the vanishing point"
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/perspective-origin)).
- Panning: "pan no faster than a full image width every seven seconds", a rule for 24 fps with a 180 degree shutter
  ([RED](https://www.reddigitalcinema.com/red-101/camera-panning-speed)). Our frames are 60 fps and sharp, so the
  mapping to this film is inferred.

**Grounding dark objects on dark** (our case: plum UI on night)
- "Use rim lighting to clearly define the edges of the object"; "Light the background to add separation"
  ([Digital Photography School](https://digital-photography-school.com/how-to-shoot-black-objects-on-black-backgrounds)).
  Separation comes from "a rim light effect with beautiful gradations"
  ([Broncolor and Karl Taylor](https://broncolor.swiss/news/how-to-set-up-lights-for-stunning-black-on-black-product-photography)).
  A glossy black surface gives the product a reflection to stand on
  ([Fstoppers](https://fstoppers.com/fstoppers_lighting_diagrams_shooting_products_on_blac)).
- A curved sweep (cyclorama) removes the line where floor meets wall, which grounds a product but also pulls the eye
  away from it ([NoHo Arts District](https://nohoartsdistrict.com/infinite-backgrounds-visual-storytelling/)). A
  visible horizon must be right; an invisible one cannot be wrong.

**Perception**
- Lower contrast reads as farther, even against size cues: contrast acts like aerial perspective (O'Shea, Blackburn
  and Ono, *Vision Research* 1994; [record](https://researchportal.murdoch.edu.au/esploro/outputs/journalArticle/Contrast-as-a-depth-cue/991005543080007891)).
  Blur also works, most at moderate contrast (O'Shea, Govan and Sekuler, *Perception* 1997;
  [record](https://researchportal.scu.edu.au/esploro/outputs/journalArticle/Blur-and-contrast-as-pictorial-depth/991012821389402368)).
  So: darken first, blur second (STYLE already says so).
- Blur gradients change perceived scale: strong blur makes a scene look like a miniature (the tilt-shift effect;
  Held, Cooper, O'Brien and Banks, *ACM TOG* 2010; [paper](https://escholarship.org/uc/item/3ts0x35k)). Strong depth
  of field on a keypad will read as a small object; keep it modest unless "small" is the point.

**The web platform**
- `perspective` is "the distance between the z=0 plane and the user"; "small values of perspective cause a large
  transformation" ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/perspective)). It equals the camera's
  subject distance, with the field of view adjusted so z = 0 keeps its size
  ([Scott Logic](https://blog.scottlogic.com/2012/09/19/just-what-is-the-css-3d-perspective-property)). three.js
  converts a camera to CSS the same way: perspective = `projectionMatrix[5] x heightHalf`
  ([CSS3DRenderer](https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/renderers/CSS3DRenderer.js)).
- `opacity < 1`, `overflow`, `filter`, `clip-path`, `mask-image` and `mix-blend-mode` force `transform-style: flat`
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style)).
- Chrome re-rasters content on a scale change unless it has `will-change: transform`
  ([Chrome developers](https://developer.chrome.com/blog/re-rastering-composite)).

## 3. What they do, with numbers

### 3.1 Lens

- The equivalence (derived from the definitions above): horizontal field = 2 atan(960 / P); full-frame focal length
  = 18 mm x P / 960, so **P is about 53.3 x the focal length in mm** on a 1920 px frame.

| P (px) | Horizontal field | Lens (35 mm equivalent) | Near/far ratio of a frame-filling plane at 6 deg / 12 deg yaw |
|---|---|---|---|
| 2400 (today) | 43.6 deg | 45 mm | 1.09 / 1.18 |
| 4800 | 22.6 deg | 90 mm | 1.04 / 1.09 |
| **5400** | 20.2 deg | 101 mm | 1.04 / 1.08 |
| 7200 | 15.2 deg | 135 mm | 1.03 / 1.06 |

- Product renders and product photography use long lenses (85 to 135 mm) because they keep proportions and parallel
  edges (Autodesk above; a blog guide calls 85 mm "slight compression that flatters products",
  [EFB Media](https://efbmedia.vercel.app/blog/camera-composition-techniques-product-renders), a weak source).
- Wide lenses are for speed: dives and whips (School of Motion above).
- Keep the lens fixed for the act; a film that changes lens per shot loses its sense of one space (inferred).

### 3.2 Camera vocabulary

| Move | Meaning in this film | How in CSS | Limits |
|---|---|---|---|
| Truck (sideways) | the next item (12's grammar: right = next) | world x | at most 1/7 of the frame width a second under narration (about 270 px/s); faster only in the narrator's pauses |
| Pedestal (up/down) | from keys to sentence, from object to its label | world y; the eye height stays put | same |
| Optical push/pull | a closer look, no change of space | 2D `scale()` outside the 3D world | 1 to 1.5% a second as a drift; push-ins 30 to 45 f |
| Dolly (z) | go inside | `translateZ` of the world | two per act at most (STYLE's dive rule) |
| Turntable (orbit/yaw of the group) | "this is an object" | `rotateY` of the world about the subject | 12 deg per move, 8 deg/s, settles to 4 deg or less before reading; never back and forth |
| Rack focus | attention moves between planes | blur per plane | 18 to 30 f (11, 3.4) |
| Pitch, roll, handheld | not used | | eye height comes from `perspective-origin` instead of pitch |

### 3.3 Planes

- Three depths per shot at most: back (-600 to -1500), hero (0), front (+150 to +400, only for things passing).
- All planes parallel to the hero. Side panels may turn **inward**, toward the eye, by `atan(dx / P)` (a panel 400
  px left of centre: 4 deg); never outward. Apple's tabs "turn inward so they're easier to read" (10072).
- At least 300 px between planes, so parallax reads on a truck (at P 5400, a plane at -600 moves at 0.90 of the
  hero's speed; at -1500, 0.78).
- Text being read: yaw at most 4 deg, pitch 0, not moving in z.

### 3.4 Grounding

- One floor, exactly perpendicular to the UI planes, at the base of what stands on it.
- Its horizon equals the eye height (`perspective-origin` y). Either keep it out of view (fade the floor to night by
  z = -1.2 P) or put it above the top row of text, so that under yaw all rows lean the same way.
- Under each standing object: a light pool, then a contact shadow inside it (shadows read on night only where the
  floor is lit), a penumbra pushed back-right by the top-left key light, and a blurred reflection (recipe in 5.4).
- No `box-shadow` drop shadows on standing objects: on a vertical plane it is a shadow on an invisible wall. Use it
  only where the object is mounted on a surface (keys on the moon panel).

### 3.5 Depth of field and atmosphere

- Darken first: a night veil of 35% per 1000 px behind the focus plane, at most 70%.
- Blur second: 6 px at 600 px behind, 12 px at 1200 (1080p), 24 to 40 px for passing foreground. Never on the hero
  plane, never on text being read.
- Modest blur keeps the keypad from looking like a miniature (Held 2010).

### 3.6 Light and materials

- One key light, top left. Faces get a 160 deg gradient (+8% moon at the top left to -10% night at the bottom
  right). A 2 to 3 px top rim of moon at 25 to 35%. A 4 to 8 px core shadow at the bottom right.
- Rim and back light for separation: the cyc glow (`glowCentre` at 60 to 75%) centred behind the subject and moving
  with it, not fixed to the frame centre.
- Glass only for one layer at a time (Liquid Glass: "avoid glass on glass"): 4 to 10% moon fill, a 2 to 3 px moon rim
  at 35 to 45%, an inner shadow, text at weight 600 or more (visionOS uses heavier weights on glass, 10076).
- Ember spill stays at 0.15 or less (STYLE).

### 3.7 Scale and framing

- One hero per frame at 50 to 90% of the frame height (STYLE), at least 96 px from the frame edges for anything
  readable.
- A crop must take at least 20% of an object and never pass through a word or digit; no slivers (an object less
  than 10% visible) at an edge.

### 3.8 Density and occlusion

- At most four readable text items per frame, supers included.
- Nothing intersects. Two objects either keep a gap of 24 px or more, or overlap on purpose by 20 px or more (the
  ornament rule), never just touch (painters call that a tangent,
  [Visual Composing](https://visualcomposing.blogspot.com/2012/03/touchy-subject.html)).
- An object behind another is behind on purpose: veiled 40% or more, optionally blurred.
- Show each piece of data once (s11's four copies of the code).

### 3.9 Text in 3D

- DOM text, at least 36 px (STYLE), 48 px or more under narration.
- Yaw at most 4 deg, pitch 0, no movement in z while read, no motion blur while read.
- No `will-change: transform` on anything that zooms (Chrome re-raster). Measured here: text under a 3x 2D zoom on a
  wrapper outside the 3D world is as sharp as today's in-world scale (gradient energy 657 vs 651,
  [check](15-spatial/07-zoom-text-check.png); headless Chrome 157, not Remotion's browser).

### 3.10 What makes CSS 3D look cheap, and the fix

| Tell | Where in this cut | Fix |
|---|---|---|
| Several projection systems in one frame | s09 lines and supers in screen space next to a yawed world | one world for the UI; supers in a fixed screen column, aligned to the hero's top and baseline |
| A floor whose horizon disagrees with the objects | everywhere | floor at 90 deg; horizon = `perspective-origin` |
| A wide lens on flat UI | P 2400 | P 5400 |
| Yaw plus pitch (three-point perspective) | every camera key has both | pitch 0; eye height by lens shift |
| A dot texture on a grazing plane | far dots become dashes | dots only in the light pool, spacing 96 to 120 px, faded by z = -0.6 P; or no dots |
| Opacity on objects with things behind | dimmed keys and card | an opaque night veil inside the object |
| Drop shadows on standing cards | `SHADOW.lift`, `ModelCard` | shadows on the floor plane |
| A bottom lip on keys of a standing panel | `Keypad` side, `LockKey` | top bevel highlight plus a cast shadow on the panel; lip 4 px at most |
| DOM order deciding what is in front | teeth under the card; fold cells | one silhouette (SVG path) for things that belong together; z lanes for flights |
| Motion blur on slow moves | threshold 10 px/f | blur only on whips: threshold 40 px/f, or `noBlur` while text is read |
| Random filler words | ghost cloud | contain them, make them cruder (dots, blur), only matches legible |

## 4. The 18 frames

| Time | Scene | What breaks the illusion | Fix |
|---|---|---|---|
| 0:46.0 | s09, "Type to talk." | Dots run to the top of the frame: the floor's horizon is far above the camera's (a ramp). The grid is the smallest thing on screen (cells about 62 px). The bubble and super are screen space beside a yawed field and grid; the grid's rows fan | One frontal world (6.1); grid cells 96 px or more; the other person's lines on a back plane in the same world |
| 0:52.5 | s09, "Hard to hit." | Bubble cut by the top edge. The switch dome floats with no contact. Grid rows slope 23 px across. The 2D zoom re-tilts the floor (15 to 22 deg at zoom 1.3 to 1.9) | Bubble fully in or out; dome on the floor with a contact shadow; optical zoom |
| 0:58.5 | s09, "Tea?" | Two small clusters in the left third, the right half an empty ramp; the ember cell is about 60 px | Compose around the reply field and the grey chip at centre; lines on the back plane at left |
| 1:01.7 | s09, the fold | Cells overlap in clumps (JKL over MNO, PQRS over HI): DOM order, no z. The moon panel appears as a bright keystoned slab | Each key group flies in its own z lane (+80 to +240) so they cross in depth; panel grows from the ember key (s06's move) |
| 1:03.0 | s10, bar 18 | The keypad stands on nothing; its keys' bottom lip says "from below" over a floor "from above"; They said floats at another scale | Floor at 90 deg, contact shadow and pool; top bevel instead of lip; They said on the back plane |
| 1:06.5 | s10, lattice | Keypad cropped through its left keys' legends; the alternatives "h", "g" float above "I" like stray glyphs; four text groups compete | Alternatives directly behind their slot in z, veiled and blurred (6.2); keypad whole or cropped through the panel margin only |
| 1:09.0 | s10, Speak | Keypad sliver cut through legends; Speak floats under the card | Speak attached to the card's bottom edge (overlap 24 px) or standing on the floor |
| 1:12.8 | s10, the real phone | The floor's horizon band runs behind the phone's middle; the phone is a flat cut-out | When a device's base is out of frame, drop the floor (cyc only) or blur it; rim light and 12 px of thickness |
| 1:15.0 | s11, chip forms | Top-heavy: everything in the upper half, empty night below | Compose the whole lock and key from the start (6.3) |
| 1:17.5 | s11 (the owner's frame) | The code four times; teeth sunk behind the card's border; rows fan around a horizon at y = 357; no shadow | [Annotated](15-spatial/01-s11-now-annotated.png); fix in 6.3 |
| 1:19.5 | s11, "Every word" | The structure yawed toward the super, both large; motion blur during the step | Frontal; the super in its column; no blur |
| 1:21.6 | s11, impact | The card is see-through (dots through it); it moved back in z, so its teeth no longer sit under the keys; check and x icons in the gaps; keys touch the top edge | Opaque veil; keep alignment through the verdict, then leave; verdict badges on the keys; 96 px margins |
| 1:23.0 | s11, after | Keys see-through; teeth slivers cut by the bottom edge | Opaque veil; the blade leaves the frame or stays whole |
| 1:25.5 | s11, end | 3.5 s of the same with slivers | As above; the slow drift is fine once the frame is clean |
| 1:28.5 | s12, offline | The signal bars float mid-air at another scale; floor horizon behind the phone's middle | Signal icon as an ornament on the phone's edge; no floor behind a cropped device |
| 1:30.0 | s12, ghost mode | Full-frame scatter of words, irrelevant big words ("numbers", "capital") as bright as the matches, text over text | The ghost phone (6.4) |
| 1:31.2 | s12, the sentence | The sentence and tag inside the same clutter | Clear zone of 1.5x the sentence height; everything else at 15% contrast or less |
| 1:33.5 | s13, keyboard | Laptop UI unreadable (text mostly 9 to 18 px), floating; keycap row cut at the right edge; three scales (supers, laptop, keys) | Laptop on the floor, softened so it is not read; keycaps fully in frame (6.5) |

## 5. A spatial style guide for this film

### 5.1 The rig (replaces STYLE.md "Tilt" and the floor note)

| Setting | Value |
|---|---|
| Lens | `perspective: 5400px` for the act (about 100 mm). 4800 to 7200 allowed per chapter, never changed inside a shot. 2400 only inside a dive or whip |
| Zoom | a 2D `scale(zoom)` on a wrapper outside the perspective container (optical zoom). Never inside the 3D transform |
| Eye height | `perspective-origin` y: 20 to 30% of the frame for reading shots; -60 to 0% for establishing shots that show the floor |
| Pitch | 0 (`rx` only for whips, if at all) |
| Yaw | the world turns about the subject: 4 deg or less while text is read; 12 deg per move and 8 deg/s while travelling; settle 0.5 s before reading; no back-and-forth |
| Roll | 0 |
| Dolly | `translateZ` of the world, for dives only (two per act) |
| Motion blur | whips only: threshold 40 px a frame (today 10), or `noBlur` while text is on screen |

A sketch of `World` with this rig (the lead owns `lib/camera.tsx`; `mid/geo.ts` `project()` must follow):

```tsx
const LENS = 5400; // P = 53.3 x focal length (mm) on a 1920 px frame
// cam: { x, y, zoom, ry, eye /* horizon y, screen px */, dolly /* world px toward the viewer */ }
<AbsoluteFill style={{ overflow: 'hidden' }}>
  <AbsoluteFill style={{ transform: `scale(${cam.zoom})`, transformOrigin: '50% 50%' }}>
    <AbsoluteFill style={{ perspective: `${LENS}px`, perspectiveOrigin: `50% ${cam.eye}px` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d',
        transform: `translate(${WIDTH / 2}px, ${HEIGHT / 2}px) translateZ(${cam.dolly}px) rotateY(${cam.ry}deg) translate(${-cam.x}px, ${-cam.y}px)` }}>
        {children}
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
</AbsoluteFill>
```

### 5.2 Planes and layout

- Back plane -600 to -1500, hero 0, front +150 to +400 (passing only). All parallel; side panels may turn inward by
  `atan(dx / 5400)`.
- Hero 50 to 90% of the frame height; readable things 96 px from the edges; four readable items per frame at most.
- Supers: screen space, in a fixed column (right third or left third), top aligned to the hero's top or baseline.

### 5.3 The floor

```tsx
// WORLD space. Perpendicular to the UI; the line y is where things stand. Children lie on the floor.
<div style={{ position: 'absolute', left: x - 3200, top: y - 1400, width: 6400, height: 1400 + 9000,
  transformOrigin: '50% 1400px', transform: 'rotateX(-90deg)',
  backgroundImage: `radial-gradient(${1.3 * w}px ${1.6 * w}px at 50% ${1400 + 0.3 * w}px,
    rgba(238,232,255,0.13), rgba(238,232,255,0.05) 40%, rgba(238,232,255,0) 75%)` }} />
// w = width of the standing subject. Dots (if kept): a second layer with the dot pattern, spacing 96-120 px,
// radius 4 px, alpha 0.35-0.55, masked by the same ellipse, so they end where the light ends.
```

The floor's own div must not carry a pitch of its own (`rotateX(-90deg)` exactly; today's 78 deg is the ramp).

### 5.4 Shadow, reflection and veil recipes

| Part | Recipe (w = subject width, world px) |
|---|---|
| Contact core | on the floor, under the base: ellipse `1.06w x 0.3w`, centred on the base line; `radial-gradient(closest-side, rgba(4,2,12,0.92), rgba(4,2,12,0.6) 50%, transparent)` |
| Penumbra | ellipse `1.1w x 0.5w`, shifted +6% w to the right and back by 0.25 w; `rgba(4,2,12,0.42)` to transparent |
| Floating object (height h above the floor) | ellipse `1.0w x 0.8w`, opacity `0.35 / (1 + h / 200)`, shifted back-right by h / 3 |
| Reflection | a copy mirrored about the floor line (same vertical plane), `opacity 0.12-0.18`, `blur(4-6px)`, masked to 0 within 60 to 70% of the object's height; blur 8 px or skip on text-heavy objects |
| Dim (push back) | a child `div` filling the object, `background: rgba(20,10,46,0.35-0.7)`, never `opacity` on the object |
| Mounted keys | key on the moon panel: `box-shadow: 7px 12px 18px rgba(20,10,46,0.30)` plus `inset 0 2px 0 rgba(238,232,255,0.30)` (top bevel), lip 4 px at most |

### 5.5 Light, depth of field, motion

- Light: 5.4 and 3.6. One sweep per chapter at 0.15 or less (STYLE), never over text being read.
- Depth of field: far planes 6 px at 600 behind, 12 px at 1200; rack focus 18 to 30 f; never the hero or read text.
- Motion: drift 1 to 1.5% a second; truck 270 px/s at most under narration; spatial moves 30 to 45 f with `EASE.flight`
  or `EASE.camera`; UI snaps stay 8 to 14 f; hold 30 f or more after landing.

### 5.6 Checks per shot

- One still at the most angled frame of every move (Rotato's advice).
- The floor's vanishing point equals `perspective-origin` (draw both on a still).
- Rows of text slope 0.5 deg or less (at P 5400 and 4 deg yaw: about 0.3 deg 400 px from the horizon, measured).
- Nothing see-through, nothing cut through a word, no sliver at an edge.
- Readable at 640 px wide (STYLE).

## 6. Scene redesigns, two options each

Bars and narration as in `07-revision-v2.md`; the ember stays one thing per frame; the app's words stay the app's.

### 6.1 s09, the problem (bars 9 to 17)

**A. "One table, frontal"** (CSS, recommended)
- One world, frontal, P 5400, eye at 28%. The person's side is the hero on the floor: the reply field above the
  grid of 26 cells (96 px or more each), the switch dome on the floor to its right with a contact shadow.
- The other person's lines on a back plane at z -700 in the same world (80 px type renders at about 71 px), drifting
  up linearly as now; sharp (they are read), veiled 15%.
- Camera: optical pushes only. n09 push to 1.6 on the grid for the miss; n10 back to 1.15 to include the switch;
  n11 a rack focus from the grid (blur 6 px, 1 s) to the back plane as "What do you need?" leaves the frame; n12 the
  grey chip attaches to the field's top edge (overlap 20 px) instead of floating.
- The fold: cells lift into z lanes (+80 to +240 by destination row), travel, land into the keypad that grows from
  the ember cell; no two cells share a lane; the ember cell carries the ember (12's contract).
- Supers in the right third, top-aligned to the field.

**B. "Two people, two depths"** (CSS with depth of field)
- The other person's lines large (150 px) on a far plane at z -1500, softened 8 px except when a line arrives (rack
  in 18 f, back out after it is read); the person's side in the foreground, frontal.
- A slow truck left through the section (120 px/s or less): the far plane moves at 0.78 of the hero's speed, so time
  passing is felt as motion.
- The fold as a dolly toward the keys. Stronger cinema, more risk: depth of field on narrated text must be timed to
  the lines.

### 6.2 s10, the solution (bars 18 to 23)

**A. "Keypad on the floor, card in front of the eye"** (CSS, recommended)
- The keypad stands on the floor at left, turned inward 5 deg, with pool, contact shadow and reflection; keys with a
  top bevel and a cast shadow on the panel. The sentence card at right, frontal (yaw 0) on the hero plane; They said
  on the back plane (z -500, veiled 25%); Speak attached to the card's bottom edge.
- The lattice: each slot's other words sit behind it (z -160 and -320), offset up 10 px and right 6 px so they peek
  out, veiled 50 and 75%, blurred 4 and 8 px. On Space the chosen word steps forward (z +40) and the others recede
  to -480 and fade out. The "flight" (bar 21) becomes a truck right along the line, 400 px in 45 f.
- Bar 23, the real phone: standing on the floor, 12 px thick, turntable from 12 to 4 deg (not 16).

**B. "Macro keys, readout above"** (CSS now, three.js if wanted)
- A low, close camera on the keys (about 320 px, two rows visible), P 7200 (135 mm); each press sinks 10 px; the
  decoder's guess on a readout plane above and behind (z -200), sharp while the keys soften 6 px between presses; a
  pedestal up to the readout as the sentence completes.
- In three.js the keys' bevel highlights would move with the camera, which CSS gradients cannot do.

### 6.3 s11, the proof (bars 24 to 29), the priority

**A. "Lock and key, frontal"** (CSS, recommended; stills:
[impact](15-spatial/03-s11-proposed-rig-impact.png), [travel at 12 deg](15-spatial/04-s11-proposed-rig-travel-yaw12.png),
[after](15-spatial/05-s11-proposed-rig-after.png), [same content on today's rig](15-spatial/02-s11-same-content-current-rig.png))
- **Each code once.** The lock is the five keys pressed (9 2 8 3 7, with their letters) on a strip of the keypad's
  moon panel: 180 px keys, 26 px gaps, 34 px padding, 1072 px wide. "water" is the app's proof chip, check and word
  only (the keys under it are its code), attached to the strip's top edge with a 24 px overlap.
- **One silhouette for the suggestion.** The "Model ranking (opt-in)" card becomes a blade standing on the floor:
  label small at left, "wafer" large at right, its code 9 2 3 3 7 as five teeth on its top edge, one SVG path (no
  border crossing the teeth). Teeth 112 x 96 px, each centred under its key, 56 px below the strip at rest.
- **Beats** (same clock as `mid/s11.ts`): bar 24 the chip forms from "water" (as now) and the strip builds under it;
  the blade slides in on the floor from the right during n15. n16: the teeth extend one per eighth like pistons: 9
  touches the strip under its key (solid mint ring and a check badge on the key's bottom-left corner, lock click), 2
  touches; the third stops short against key 8 (the impact: 3 f hold, dashed pink ring and x badge on key 8, the
  tooth outlined dashed pink, bloom 240 px or less, a 4% optical push over 7 f). Then the strike draws over "wafer"
  (7 f), the teeth retract and the blade slides back and right (z -420, x +300), veiled 55% and blurred 4 px, out of
  the lock's line. "water" keeps its check; one low sweep on the chip.
- **Camera:** frontal at rest. One turntable move only, at the arrival (-12 to 0 deg in 45 f, before anything is
  read). Eye at -60% (floor visible behind, dots inside the pool) or 22% (a low band of floor). Push to 1.25 on the
  columns at "must match", pull back after.
- **Ground:** pool, contact shadow under the blade, a faint shadow under the floating strip, blurred reflection of
  the blade.
- No ember in this chapter; mint and pink as in the app, with solid vs dashed and check vs x, so never colour alone.
- The [after](15-spatial/05-s11-proposed-rig-after.png) still shows the blade pushed straight back: with the eye
  above, a receding object rises in frame, so its teeth slide behind the lock (correct perspective, but a cut key
  element). That is why the recommended exit is back and to the right, out of the lock's line.

**B. "A key in a lock"** (three.js, the wow version)
- The lock as five physical keycaps in a moon housing; the suggestion as an extruded key blade with the digits on
  its teeth (SDF text); the blade slides into the housing while the camera orbits from 25 to 0 deg on an 85 mm lens;
  a pin drops for each match; at the third the blade stops dead; it is pulled out and falls back into darkness with
  real depth of field; contact shadows and a reflective floor.
- Build cost: new dependencies (`three`, `@react-three/fiber`, `@remotion/three`), fonts preloaded for SDF text,
  `gl: angle` ([Remotion three](https://www.remotion.dev/docs/three)). Only after A works.

### 6.4 s12, ghost mode (bars 30 to 32)

**A. "The ghost phone"** (CSS, recommended; [still](15-spatial/06-s12-ghost-phone.png))
- The water chip becomes the status pill (12's container transform). The real phone stands on the floor with
  thickness, a moon rim, pool and shadow. Our signal icon is attached to the phone's edge and loses its bars on the
  beats; the pill reads the app's own "Offline" (`lib/status.ts`).
- No dive. On "It still works", the phone's body turns to glass over 30 f and the dictionary is visible inside its
  silhouette, in three faked depths clipped to the screen: far 13 px words at 8% and 2.6 px blur, mid 17 px at 9% and
  1.6 px, near 21 px at 11% and 0.7 px, drifting 0.2 to 0.5 px a frame. They read as texture, not words
  (Territory's "cruder version").
- On each code, its matches from `decoded.json` brighten to 45 to 100% and sharpen within 7 f (4: i, h, g; 6333:
  need; 92837: water, waves, yates, waver); the chosen word rises into the sentence card at the top of the screen.
- "Ghost mode" is an ornament on the phone's top edge (overlap 20 px), landing on the narrator's words. The super
  is an exact excerpt ("It still works.").

**B. "Starfield to sentence"** (three.js; the one place true 3D clearly wins)
- The brief's dive through the phone's glass into a volume of about 3,000 dictionary words as instanced SDF text in
  fog, with real depth of field: everything is soft except a thin focal slab; the camera dollies forward; each code
  pulls its matches into the slab, sharp, then up to the sentence near the camera.
- CSS cannot blur thousands of words per frame at reasonable cost; in WebGL it is one post-process pass. Not
  measured here.

### 6.5 s13, touch, keyboard, one switch (bars 33 to 34)

**A. "Three objects on one table"** (CSS, recommended)
- One set on one floor: the phone (left), the laptop (centre, z -300), the switch with the keypad (right), frontal,
  each with pool and contact shadow. Two trucks right (24 to 30 f each, landing on the narrator's word), each with an
  optical push from 1.0 to 1.15; earlier objects stay in frame, veiled 35%.
- The laptop capture is not meant to be read at 9 to 18 px: blur it 2 px and veil it 20% so it says "the app on a laptop"
  without inviting reading. The keycap row fully in frame (or only 4, 6, 7). The switch dome lit top left, rim lit,
  shadowed; the ember scan ring is the one ember thing.

**B. "One keypad, three inputs"** (CSS)
- The keypad stays centred and frontal for the whole four seconds; the input changes in front of it on the floor: a
  fingertip ring (touch), then three keycaps sliding in (keyboard; the laptop as a soft silhouette at z -900, blurred
  8 px), then the switch dome with the scan ring stepping on the kick. No camera travel, no clutter, one statement:
  the same keypad, any way to press.

### 6.6 Where true 3D beats CSS

| Scene | Verdict |
|---|---|
| s09 | CSS. Flat planes and text; nothing needs real light |
| s10 | CSS for A. three.js only for B's moving highlights on physical keys |
| s11 | CSS for A, which fixes what the owner saw. three.js for B if the team wants a physical key and time remains |
| s12 | **three.js clearly better** for B (thousands of words, fog, real depth of field). CSS is enough for A |
| s13 | CSS |
| Across | three.js would add contact shadows and reflections that follow moving objects (`ContactShadows`, `MeshReflectorMaterial`, [drei](https://drei.docs.pmnd.rs/staging/contact-shadows)); the CSS recipes in 5.4 are enough for objects that stand still while shadows matter |

To mix both in one frame, match the cameras: a three.js `PerspectiveCamera` with vertical field
`2 atan(540 / P)` (11.4 deg at P 5400) at distance P from the z = 0 plane sees what a CSS world with `perspective: P`
sees (the CSS3DRenderer relation above). Put WebGL behind (floor, light, shadows) and DOM UI in front. Text in WebGL
should be SDF text (drei `Text`, troika: "signed distance fields (SDF) and antialiasing",
[drei](https://drei.docs.pmnd.rs/abstractions/text)), with fonts preloaded so frames render the same every time.

## 7. Build order (for the lead)

If time is short, the smallest change that fixes the owner's frame, without touching the lens or the `FOLD_LANDING`
contract: floor `angle` 90 (and drop `S13.tsx`'s slope compensation); a `perspectiveOrigin` prop on `World`
(default `50% 50%`, so other scenes are untouched) to raise the eye where a scene drops its pitch, because a level
floor seen from the frame centre shows only as a thin band (the reason `Studio.tsx` gives for 78 deg); s11 option A's
content (each code once, one silhouette) with the camera at `rx 0, ry 0` while the columns are read; veils instead
of `opacity`; floor shadows instead of drop shadows; motion blur threshold 40; the ghost phone. Then the full order:

1. `World`: P 5400, optical zoom outside the 3D transform, `eye` instead of `rx`, motion blur threshold 40.
   `mid/geo.ts` `project()`/`aimTilted()` and `FOLD_LANDING` must follow (contract change, s09 and s10).
2. `Floor` at exactly 90 deg with the pool; dots only in the pool or none; new `FloorShadow`, `Reflection`, `Dim`
   parts (5.4); `ContactGlow` becomes the pool.
3. s11 option A (the owner's frame).
4. Replace every `opacity` dim on 3D parts with `Dim`; remove drop shadows from standing cards; keys: bevel instead of
   lip.
5. s12 option A; s09 option A; s13 option A; s10 option A.
6. STYLE.md, the lead's call: "Tilt... settles at -1 to -2, never exactly 0" becomes "frontal allowed, yaw 4 deg or
   less while read"; "The camera must look DOWN to see the floor: rx between -6 and -14" becomes "set the eye height
   with `perspective-origin`; pitch 0"; 11's floor angle of 74 to 80 deg becomes 90 deg.

## 8. What I could not verify

- I watched no film. Few studios publish camera numbers for UI work; the lens and grounding numbers come from CG
  documentation, product photography and design systems, and their use here is my inference.
- visionOS guidance is for a headset; I apply it to a flat film by inference.
- The mock stills were rendered in headless Chrome 157 with software compositing, from my own HTML (not the film's
  components, not Remotion's browser, which would not start in my sandbox). Blur and 3D sorting may differ under
  ANGLE in Remotion; check a full-size still of each change in the film.
- The text-sharpness check is one test at 3x zoom.
- I found no source for how small a slope on a text row viewers notice; the 0.5 deg limit is my choice.
- RED's panning rule is for 24 fps with motion blur; its mapping to sharp 60 fps frames is inferred.
- Material's dark-theme overlay values are Material 2's, and I read them from search excerpts (the page did not
  render for my fetcher); the Fluent quote and the EFB Media line also come from search excerpts, not from pages I
  opened.
- three.js paths (6.3 B, 6.4 B) were not built or measured; drei's `ContactShadows` page lists no defaults.
- The EFB Media product-render guide is a weak source; the long-lens claim rests on Autodesk and School of Motion.

## Sources

Design systems: [Apple HIG, spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout),
[WWDC23 10072](https://developer.apple.com/videos/play/wwdc2023/10072/), [WWDC23 10076](https://developer.apple.com/videos/play/wwdc2023/10076/),
[WWDC23 10078](https://developer.apple.com/videos/play/wwdc2023/10078/), [WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/),
[Material 1, environment](https://m1.material.io/material-design/environment.html), [Material 2, dark theme](https://m2.material.io/design/color/dark-theme),
[Flutter elevation overlay](https://flutter.googlesource.com/mirrors/flutter/+/e17f8d367d1f1f01b99fd858881c70729fb27318%5E%21),
[Fluent, Microsoft Design](https://medium.com/microsoft-design/fluent-design-behind-the-design-973028062fcc).

Studios and tools: [Stash, Surface Copilot+PC](https://www.stashmedia.tv/wes-cockx-launches-surface-copilotpc-for-microsoft),
[Territory Studio interview](https://www.pushing-pixels.org/?p=13856), [HUDS+GUIS, Shanghai Fortress](https://www.hudsandguis.com/home/2019/shanghai-fortress),
[Stash, Ordinary Folk for Spline](https://www.stashmedia.tv/?p=85806), [Linear](https://linear.app/now/linear-liquid-glass),
[Rotato perspective](https://www.rotato.app/help/adjusting-3d-perspective), [Rotato depth of field](https://rotato.app/blog/depth-of-field),
[DEV, mockups](https://dev.to/sudhanshu_verma_a476f5eeb/what-makes-an-iphone-mockup-actually-look-real-3o4b).

Camera and photography: [Autodesk](https://help.autodesk.com/cloudhelp/2015/ENU/3DSMax/files/GUID-DD235AB4-FD21-47F8-9F1B-B5518F453EF3.htm),
[School of Motion, focal length](https://www.schoolofmotion.com/blog/professional-guide-renders-look-better-choose-focal-length),
[EFB Media](https://efbmedia.vercel.app/blog/camera-composition-techniques-product-renders),
[Cambridge in Colour](https://www.cambridgeincolour.com/tutorials/tilt-shift.htm), [Amateur Photographer](https://amateurphotographer.com/technique/camera_skills/beat-converging-verticals-and-leaning-in-lines),
[RED panning](https://www.reddigitalcinema.com/red-101/camera-panning-speed), [Digital Photography School](https://digital-photography-school.com/how-to-shoot-black-objects-on-black-backgrounds),
[Broncolor](https://broncolor.swiss/news/how-to-set-up-lights-for-stunning-black-on-black-product-photography),
[Fstoppers](https://fstoppers.com/fstoppers_lighting_diagrams_shooting_products_on_blac), [NoHo Arts District, cyclorama](https://nohoartsdistrict.com/infinite-backgrounds-visual-storytelling/),
[Visual Composing, tangents](https://visualcomposing.blogspot.com/2012/03/touchy-subject.html).

Perception: [O'Shea et al. 1994](https://researchportal.murdoch.edu.au/esploro/outputs/journalArticle/Contrast-as-a-depth-cue/991005543080007891),
[O'Shea et al. 1997](https://researchportal.scu.edu.au/esploro/outputs/journalArticle/Blur-and-contrast-as-pictorial-depth/991012821389402368),
[Held et al. 2010](https://escholarship.org/uc/item/3ts0x35k).

Web and 3D: [MDN perspective](https://developer.mozilla.org/en-US/docs/Web/CSS/perspective),
[MDN perspective-origin](https://developer.mozilla.org/en-US/docs/Web/CSS/perspective-origin),
[MDN transform-style](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style),
[Scott Logic](https://blog.scottlogic.com/2012/09/19/just-what-is-the-css-3d-perspective-property),
[three.js CSS3DRenderer](https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/renderers/CSS3DRenderer.js),
[Chrome re-raster](https://developer.chrome.com/blog/re-rastering-composite), [Remotion three](https://www.remotion.dev/docs/three),
[drei ContactShadows](https://drei.docs.pmnd.rs/staging/contact-shadows), [drei Text](https://drei.docs.pmnd.rs/abstractions/text).

Repository: `film/src/lib/camera.tsx`, `film/src/components/brand/Studio.tsx`, `film/src/components/brand/Keypad.tsx`,
`film/src/components/mid/{s10,s11,s12,geo,Proof2,Parts2,Ghost}.ts(x)`, `film/src/components/problem/layout.ts`,
`film/src/components/handoff.ts`, `film/STYLE.md`, `packages/web/lib/status.ts`.
