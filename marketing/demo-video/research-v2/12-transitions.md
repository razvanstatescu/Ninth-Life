# Transitions: one continuous story

Research v2, field 12. Written 2026-11-10 for the second cut of "Hello again". It covers the transitions inside
Act 1, the Act 1 to Act 2 handover, the changes between Act 2's scenes, and the sound that carries them, now that
the film gets a narrator (the owner's review of the first cut).

Read it with [02-creative-direction.md](../02-creative-direction.md) (the rules),
[06-hypermotion-reference.md](../06-hypermotion-reference.md) (camera, whip and zoom numbers; not repeated here) and
[film/STYLE.md](../film/STYLE.md) (the handoff table). Units: 60 fps and 120 BPM, so 1 beat = 30 frames (f),
1 eighth = 15 f, 1 bar = 120 f = 2 s. Frame numbers are absolute frames of the current cut
(`film/out/ninth-life-hello-again.mp4`, 1:54); I extracted them with ffmpeg and looked at them. I did not watch any
video: claims about other films come from articles, docs and studio pages, each linked. "Inferred" marks my own
reasoning.

## 0. The short version

1. **The handover (section 3).** Default, cheap and strong: **"Switched back on"**. Just before the downbeat the
   ember dot stretches into the tube's line; on the downbeat the line opens, like the power-on at 0:00, but onto
   the clean Act 2 world, where the faint 3 x 3 "wink" of scene 5 comes back as key outlines that fill one per
   eighth note. Stretch goal, if the new Act 1 phone plate is shot straight on: **"Same keys"**: the dot turns out
   to be the old phone's ninth key, and the old keys become the app's keys one per eighth note. The signal
   callback is better spent on the offline chapter.
2. **One grammar, not one camera (section 5).** A camera that never cuts would fight the narrator and turn into a
   gimmick. Use one direction of travel for the whole act: right = the next item, in = a closer look, out = the
   real thing, a hard cut on a downbeat = a new chapter, a shape that becomes the next shape = "this becomes
   that". Three signature moves repeat: the dive (two uses at most), the container transform, the hard cut.
3. **The ember is the baton.** At each chapter change the last ember thing hands over to the next one in the same
   screen place. In the current cut only 1 of Act 2's 10 bar-line scene changes does this (tracker, section 1).
4. **Narrator rules (sections 2 and 6).** Under speech use only invisible transitions (match cut, container
   transform, push, a cut between two phrases). Loud ones (whip, dive, tube switch-off, cut to silence) need a
   narrator pause of at least 1 beat. Bring the narrator in one eighth (15 f) before the picture when the words
   motivate the cut (J-cut); let a closing line run one beat into the next picture (L-cut).
5. **Act 2's hero transition is the fold**: the 26 letter cells of the problem fly into the 9 keys of the
   solution, the highlighted cell carrying its ember into its key. One beat long, narrator silent, a reverse swell
   peaking on the landing, the groove returning on it, then the camera keeps going into "how it works" (no whip).
6. **Two sound morphs, layered.** The tube hum that sank four semitones as the keys died (Act1Sound.tsx) glides
   back up to A, the music's root, into the first downbeat; the static hiss becomes the noise riser above it. Both
   stop dead half a second before the downbeat. Pre-render the glide: Remotion cannot animate `toneFrequency`.
7. **Act 1 gets in-world transitions**: a stepped push into the pixel screen, one slow picture roll, one static
   burst (not three), and a true time match from the lit phone to the same phone under dust.
8. **Fix in the current cut**: the one-frame empty night at frame 4440, the moon pulse inside the title dive
   (frames 2628 to 2636), the cut at bar 23 that nothing motivates, the 179 px ember jump at frame 3480.
9. **Remotion (section 7)**: keep `Film.tsx`'s absolute `<Sequence>`s on the bar grid; carry batons across cuts
   in a bridge layer (what `TransitionSeries.Overlay` does, which does not shorten the timeline); build the key
   wipe as a custom presentation or an in-scene `clip-path: inset(... round ...)`.
10. **Safety (section 8)**: moon (0.83) and ember (0.53) against night (0.006) are far past the 10% flash step.
    Any wipe, iris or glow that shows more than a quarter of the frame in moon or ember is half a flash. Run
    `scripts/check-flashes.py` after every change.

## 1. The current cut, change by change

### Act 1

| Change | Frames | What happens | Verdict for v2 |
|---|---|---|---|
| Power-on | 20 to 50 | A thin line opens to full height in 14 f, brightness rises over 20 f, then static (`switchOn()` in `TubePicture.tsx`) | Keep. The film's opening gesture; section 3 rhymes with it |
| Shot 2a to 2b | 360 to 366 | 6 f of full static, then the pixel screen | Replace with a push into the screen (section 4) |
| Shot 3a to 3b | 876 to 882 | 6 f of static, then the worn key | Replace with one slow picture roll |
| Shot 3b to 4a | 990 to 997 | 7 f of static, then the keypad | Keep as the only static burst after scene 1 |
| Shot 4a to 4b | 1128 | Keypad close-up, dark, then the whole dusty phone | Make it a time match: same framing, lit, then dusty |
| Switch-off | 1236 to 1266 | Picture to a line in 10 f, line to a dot in 20 f, falling brightness, no white flash | Keep. The strongest transition in the film |
| Scene 5 to 6 | 1680 | Dot keeps its place, grows into the ninth key; 8 keys cut in on eighths | Good; upgrade (section 3) |

Three static bursts in about 10 seconds read as a tic, and their hiss sits exactly where a narrator would speak.

### Act 2

| Bar (frame) | What happens | Verdict for v2 |
|---|---|---|
| 2 (1800 to 1810) | The moon panel grows out of the ninth key | Good container transform; keep |
| 4, beat 4 (2120 to 2132) | Whip to Speak, motion blur | Good |
| 5 (2160) | Speak pressed, hard cut to "Hello again." on night, music stops | Good: the cut to silence. Keep |
| 6 (2280) | Hard cut to the icon and name on the drop | Good; add a type match (section 5) |
| 8 beat 4 to 9 (2610 to 2640) | Dive through the icon's centre key into plum, then "Some people type to talk." | Keep the idea, tidy it: frames 2628 to 2636 sweep the moon bubble across the frame (mean luminance 0.11 falling to 0.017, about 14% of the frame bright). It passes the flash screen, but it is a light pulse on a downbeat |
| 11 to 12 (2990 to 3010) | Whip out of the letter fold, whip into "Press 2 to 9." | Replace with the continuous fold (section 5) |
| 16 (3480) | Cut to the close card and Speak | The ember jumps 179 px (selection ring to Speak) |
| 17 (3600) | The phone's screen opens around the card (`clip-path` inset with radius) | Good container transform |
| 18 (3720) | The phone vanishes, its card stays in place | Good match cut |
| 23 (4320) | Hard cut from the proof to the offline phone | Nothing motivates it; section 5 |
| 24 (4440) | One frame of empty night, then "No account." | Fix: a hard cut must land on a formed frame. S14 already does this (`LEAD = 2`: entrances start 2 f early) |
| 25 (4560) | "Free." block, cut to the phone | Ember leaves the centre and returns small, bottom of the phone |
| 25 to 26 | Slide phone, tablet, laptop | The owner removes the tablet; section 5 |
| 27 (4800) | Hard cut from the laptop window to the touch keypad | Nothing motivates it; section 5 |
| 32, 35, 39 | Hard cuts to "Built with Kiro.", then and now, the end card | Right as chapter cuts; section 5 adjusts the end |

**Ember tracker.** I marked ember-coloured pixels (near `#ffb13d`) in every frame at 192 x 108 and compared the last
frame before and the first frame after each bar-line scene change (method in Appendix A; thin rings may be
missed). At bar 3 the ember sits at the same place on both sides (the cut is inside one continuous shot). At the
other nine, there is no ember on at least one side, so the direction's "match the eye" rule (02, section 5) is
almost never exercised.

**Luminance.** The largest frame-to-frame changes are the Act 1 static bursts (mean relative luminance 0.03 to
0.12). In Act 2 no change exceeds 0.06. The current render passes the film's own flash screen
(`film/out/flash-report.json`). Brand colours in relative luminance (WCAG formula, computed): night 0.006, plum
0.018, ember 0.530, moon 0.831, pixel-screen light 0.794.

## 2. A catalogue of transitions

### 2.1 Summary

| Type | What it says | Length at 60 fps, ease | Sound that sells it | Under the narrator? |
|---|---|---|---|---|
| Hard cut on the beat | A new statement; punctuation. School of Motion: use it in fast action or music, for impact, or to re-time to a beat ([SoM](https://www.schoolofmotion.com/blog/six-essential-motion-design-transitions-tutorial)) | 0 f, on beat 1 (chapters) or an eighth | The downbeat itself, or the music stopping on the cut | Yes, between two phrases: it is the narrator's full stop |
| Match cut (shape, colour, motion) | "This is that": "the subconscious auto-completes the story, that subject A and B are equal" ([SoM, match cuts](https://www.schoolofmotion.com/blog/match-cuts)). A graphic match is a metaphor; the classic one turns a thrown bone into an orbiting satellite, a primitive tool into an advanced one ([Wikipedia](https://en.wikipedia.org/wiki/Match_cut)) | A 0 f cut inside an 8 to 14 f move. "If you have a twelve frame move and decide to cut on frame six, pick-up the next shot on frame seven" ([SoM](https://www.schoolofmotion.com/blog/match-cuts)) | Little or none; a key tone if the matched thing is a key; or the same note on both sides | Yes. The best choice under speech |
| Shared-element morph (container transform) | "This becomes that": it "creates a visible connection between two distinct UI elements by seamlessly transforming one element into another" ([Material motion codelab](https://developer.android.com/codelabs/material-motion-android)) | 12 to 20 f, out-expo (`EASE.camera`); 30 f for a hero morph | One tick when it lands; a short soft whoosh if the shape is large | Yes |
| Zoom-through, dive | "Go inside, look closer." Scale as structure: a 1977 film zooms "tenfold every 10 seconds" from a few people to the cosmos and back ([Mental Floss](https://www.mentalfloss.com/article/70340/watch-powers-ten)) | 14 to 16 f in, log zoom x20 to x40; the next shot lands from x1.15 to x1 in about 16 f (06, scene 9) | A whoosh peaking on the covering frame, a soft hit on the downbeat | No: needs a pause of at least 1 beat |
| Shape wipe with the key | The brand opens the next idea; the rounded-square key reads as ours where a circle reads generic (inferred) | 14 to 18 f, out-expo | A soft air swell; a key tone as it starts | Yes, if quiet |
| Whip pan with blur | Energy; a jump in space (06, section 3) | 10 to 16 f (06) | A whoosh peaking on the cut | No |
| Light or glow wipe | Revelation; in this film light is life (02, section 3; inferred) | 20 to 40 f, on one object only | A quiet shimmer | Yes |
| Push and parallax | "Next in a sequence": shared axis is for elements with "a spatial or navigational relationship" ([codelab](https://developer.android.com/codelabs/material-motion-android)); parallax gives depth, as the multiplane camera did from 1937 ([Wikipedia](https://en.wikipedia.org/wiki/Multiplane_camera)) | 12 to 20 f, `EASE.flight`; background at 0.5 to 0.8 of foreground speed (inferred) | A soft whoosh or none; a tick on landing | Yes |
| Glitch to clean | The medium failing, then working: glitch study is "interest in the failure of media to disappear" ([Menkman, quoted in a review](https://www.creativeapplications.net/review/the-glitch-momentum-by-rosa-menkman-review-by-greg-j-smith/)). Here noise is the old world, calm is the brand (02, section 3) | Bursts of about 6 f; at most 0.5 s and 2 bursts a second (02, section 9) | A filtered static burst, then silence | No |
| Tube power-off, power-on | Off: the end of the broadcast, the death. On older sets "the raster would collapse to a spot which would then gradually fade away" ([S.E.R. repair FAQ](https://repairfaq.org/samnew/tvfaq/tvcbspo.htm)). On: waking | Off: 10 f collapse + 20 f shrink; on: 14 f opening, 20 f brightness (`TubePicture.tsx`) | A falling power-down sweep, the hum stopping, then room tone | No: the silence is the point |
| Pixel dissolve | "An old computer." A 1992 game turned "the pixels of the screen to a solid color, only one at a time, seemingly at random" ([Sanglard](https://fabiensanglard.net/fizzlefade)) | 12 to 30 f, stepped at 12 Hz in Act 1 | A soft granular crackle | Yes, quiet, inside one object |
| Picture roll, channel change | The set changes the picture itself, so it does not read as an edit (inferred). A roll is a picture "correct but rolling vertically" ([S.E.R.](https://www.repairfaq.org/samnew/tvfaq/tvvlockl.htm)); its black bar is vertical blanking ([Basic Television, 1975](https://gammaelectronics.xyz/basic_tv_1975_16.html)) | 24 to 40 f, stepped | A low slip in the hum | Yes, quiet |
| J-cut, L-cut, sound bridge | J: the next scene's sound starts first; L: "the sound of a scene carries over into the next scene"; both make "smooth cuts" ([StudioBinder](https://www.studiobinder.com/blog/what-is-a-sound-bridge)) | "1-10 frames offset for making cuts smoother", "10+ frames ... as a stylistic touch" at editing rates ([FireCut](https://firecut.ai/features/remove-silences/j-cuts)). At 60 fps: one eighth (15 f) for a quick cut, one beat (30 f) for a chapter | It is the sound | It is the narrator's tool |
| Riser, silence, hit | Tension and release: a riser "builds for a few seconds, then cuts to a hit on the downbeat"; "dropping everything out for a beat makes the next impact feel enormous" ([Violet Recording](https://violetrecording.com/sound-design-for-trailers/)); "perhaps half a second of silence" before the boom ([Fault](https://fault-magazine.com/?p=107206)) | Riser 1 bar or 2 beats; stop 15 to 30 f before the downbeat; hit on beat 1 | It is the sound | Never in the riser's last beat or the silence |
| Reverse swell | Pulls energy into the cut (inferred) | 30 f, peak on the cut frame | It is the sound | In a pause |
| Sound match | The same note on both sides of a cut ties two worlds (inferred) | The five-note motif E D G G A (02, section 8) | It is the sound | Yes |

### 2.2 Pitfalls and how to build each one in Remotion 4.0.542

Doc links are to remotion.dev; "installed" means present in `film/node_modules` at 4.0.542.

**Hard cut.** Pitfalls: an empty first frame (frame 4440); a night frame cut against a mostly moon or ember frame
and back within 20 f (02, section 9); a cut on every beat for more than a bar strobes. Build: scene boundaries are
`<Sequence>`s on beat frames already; start entering text 2 f before the cut so the first frame is formed (S14's
`LEAD`).

**Match cut.** Pitfalls: a mismatch of more than a few percent in size or place reads as a jump; used often it
becomes a trick; two ember things around the cut break the one-ember rule. Research on viewers supports hiding cuts
this way: in an eye-tracking study, viewers missed about a quarter of cuts between two views of one scene and about
a third when the cut came with a sudden onset of motion, and cuts that follow the continuity rules were missed more
often than cuts that break them (abstract of [Smith and Henderson, 2008, Edit Blindness](https://bop.unibe.ch/JEMR/article/view/2264)). Build: read the
outgoing element's screen box from the camera on the last frame (`toScreen()` in `components/mid/cam.ts`), land the
incoming camera so the element sits there (`aim()`), keep both poses in one shared constants file, as STYLE.md's
handoff table does for scenes 5 and 6.

**Container transform.** Pitfalls: a moon container growing past a quarter of the frame is a large light rise
(count it as half a flash); type scaled non-uniformly while the box morphs (morph the box, swap the content at
50%); corner radii that jump. Build: interpolate `clip-path: inset(t r b l round R)` from box A to box B
([MDN, inset()](https://developer.mozilla.org/en-US/docs/Web/CSS/basic-shape/inset)), as `S10.tsx` shot C already
does; for unlike outlines use `interpolatePath()` ([docs](https://www.remotion.dev/docs/paths/interpolate-path))
with `makeRect({width, height, cornerRadius})` from `@remotion/shapes` (installed); for many-to-many (26 cells to 9
keys) measure first and last boxes and interpolate each item's transform, the FLIP idea: "precalculate the
animation dynamically and let it play out cheaply" ([Lewis](https://aerotwist.com/blog/flip-your-animations/)).

**Dive.** Pitfalls: diving through an ember or moon fill makes the whole frame bright, then dark (banned; 06 flags
the ember key); more than two dives in 86 s is a gimmick; supers in the world become unreadable, so hide them 4 f
before. Build: the `World` camera in log zoom with automatic zoom blur (`lib/camera.tsx`); the `DiveWindow` pattern
in `components/open/Title.tsx`; the installed `zoomBlur()` presentation only if two scenes must overlap.

**Key-shaped wipe.** Pitfalls: revealing a bright scene through a growing key counts toward the flash area; a wipe
at every change looks like presentation software; never rotate the key. Build: a custom presentation
([docs](https://www.remotion.dev/docs/transitions/presentations/custom): the example clips the entering scene with
a `@remotion/shapes` star and leaves the exiting one alone), or in-scene `clip-path`. The built-in `iris()` is a
circle ([docs](https://www.remotion.dev/docs/transitions/presentations/iris), from v4.0.316); `@remotion/effects`
also has `iris-wipe` (polygons and stars) and `radial-wipe` (installed). Sketch in section 7.

**Whip.** 06, sections 2, 3 and 7 cover the numbers and the blur. Pitfalls added here: a whoosh under speech; two
whips in one 4-bar phrase. Build: the `World` blur, or the installed `blurSlide()` and `linearBlur()` presentations.

**Light or glow wipe.** Pitfalls: the direction bans lens flares and light leaks (02, section 5), and
`@remotion/effects` ships a `light-leak` that must stay unused; a moon-coloured band sweeping across more than a
quarter of the frame is a flash pair. Use it only on a small object (a key, the icon), at low intensity, once.
Build: `shine()` from `@remotion/effects/shine` (progress, angle, halo and core intensity; installed) on an
`<HtmlInCanvas>` layer.

**Push and parallax.** Pitfalls: the direction must not flip (left to right is widely read as forward in Western
practice, a convention more than a proven effect: [Wikipedia, screen direction](https://en.wikipedia.org/wiki/Screen_direction));
STYLE.md bans "parallax layers of junk"; a push at every change is a slideshow. Build: the `World` camera with the
`DotField` as the slower layer; or `slide({direction})` from `@remotion/transitions`.

**Glitch to clean.** Pitfalls: static is mid-grey against dark shots, so each burst can be a flash pair; Act 2 bans
glitch (02, section 5); between unrelated scenes it reads as a template. Build: the film's own `tubeStatic`
(`components/act1/tubeStatic.ts`); `@remotion/effects` also has `white-noise`, `tear`, `turbulent-displace` and
`chromatic-aberration` (installed). Step anything that moves with `interpolate(..., {posterize: 5})`, which
"quantizes the input value before interpolation" ([docs](https://www.remotion.dev/docs/interpolate), from v4.0.470).

**Tube off and on.** Pitfalls: some real sets discharged "with a white flash" at switch-off
([S.E.R.](https://repairfaq.org/samnew/tvfaq/tvcbspo.htm)); never copy that. Full size, keep it to the moments
that tell the story: on at 0:00, off at 0:20.6, and back on at the handover if option B is chosen (the small inset
in scene 15 is a callback). The tube's whine sits "just over 15 kHz" and "on the border
of audible for adults" ([S.E.R.](https://repairfaq.org/samnew/tvfaq/tvwhine.htm)), so do not build a cue on it.
Build: `switchOff()`, `switchOn()`, `BeamDot` in `components/act1/`. Do not use `tvSignalOff()` from
`@remotion/effects`: despite the name it "generates color bars, calibration blocks, and a grayscale ramp"
([docs](https://www.remotion.dev/docs/effects/tv-signal-off)), which brings saturated colour into the film.

**Pixel dissolve.** Pitfalls: coarse bright cells blinking in and out flicker; 02 bans dissolves between Act 2
scenes, so keep it inside one object (a key changing material). Build: `pixelDissolve({progress, columns, rows,
seed, feather})`, which "divides the frame into a grid and fades the cells out in a pseudo-random order"
([docs](https://www.remotion.dev/docs/effects/pixel-dissolve), from 4.0.471, WebGL2 or WebGPU), with a fixed seed.

**Picture roll.** Pitfalls: a fast or repeated roll moves toward the regular-pattern rules of ITU-R BT.1702
(01-research, section 4); one slow roll is fine. Build: the `roll` prop of `TubePicture` (used in scene 1).

**J and L cuts, bridges, risers.** Pitfalls: a lead longer than a beat makes the viewer hear an idea long before
seeing it; a riser under speech masks it; one riser per chapter at most. Build: section 6 and 7.

### 2.3 Under the narrator, at a glance

| | Under speech | Needs a pause of 1 beat or more | Never next to the app's voice |
|---|---|---|---|
| Match cut, container transform, push, picture roll, small glow | yes | | |
| Hard cut between two phrases | yes | | |
| Dive, whip, static burst, key wipe with a whoosh | | yes | |
| Tube switch-off, cut to silence, riser and pre-drop silence, hit | | yes | yes |

## 3. The Act 1 to Act 2 handover

What is fixed: scene 5 ends on the ember dot, 28 px, at the centre (960, 540), on night (STYLE.md). The owner wants
the narrator over scene 5's lines, so the narrator's last word must end about one second before the first downbeat
(now frame 1680; so by frame 1620), leaving the riser's last beat and the silence clear. If the narrator reads all
four of scene 5's lines (25 words), that is about 10 s at the 2.5 words a second voice actors read at
([Bread n Beyond](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/)), so scene 5
must grow from 6 s or lose lines. Every option below starts on the narrator's final pause.

### Option A: "Same keys" (the old keys become the app's keys)

- **Picture.** Last beat of scene 5 (frames 1650 to 1680), after the lines go: the ember dot's glow lights what is
  around it, very dimly. It is the ninth key of the old phone, under dust, framed straight on with its 9 key at the
  centre (a match on place: the dot left on the dead screen is the light of a key). Downbeat: no tube, no static,
  this is the real phone in the room. Keys 1 to 8 change one per eighth note, as the keys arrive now: each worn,
  photographed key face dissolves in fine cells into the app's plum key with its moon legend. Bar 2: the fourth row
  (the old star, 0 and hash keys are the app's Back, Space and Next, as `src/data/plates.json` already maps them)
  changes as a group, the phone's body fades to night in 12 f, and the moon panel grows out of the ninth key as it
  does now; the camera pulls back to the app.
- **What it says.** The same keys, a new life: the old object becomes the new tool, the bone-to-satellite idea
  ([Wikipedia](https://en.wikipedia.org/wiki/Match_cut)) told with the actual keys.
- **Sound.** The hum glide (section 6.4) under the end of scene 5, stopping dead as the lines go (frame 1650); the
  reveal happens in that silence; on the downbeat a soft sub hit and the first kick; each key's change is its
  rising key tone (A C D E G A C D, as now).
- **Build.** The plates carry measured key boxes ([plates.json](../film/src/data/plates.json): 12 keys per plate),
  and the 12 keys are the app's 12. Needs a new plate from the Act 1 rebuild: the dusty keypad nearly orthographic
  (keys facing the lens), so flat brand keys sit exactly on the old ones; otherwise match each key with
  `@remotion/effects/corner-pin` or a CSS 3D matrix. Per key, `pixelDissolve` (or a small key-shaped `clip-path`)
  from the plate crop to `<Key>`; stepped at 12 Hz before the downbeat, smooth after. Cost: large (about 1.5 to 2
  days, inferred), and it depends on the new phone passing the "not a real model" check.
- **Risks.** The photographed phone appears on the brand's night for 2 s, which the direction keeps for Act 1;
  count the downbeat as the line. If the plate is not straight on, the overlay will slide.

### Option B: "Switched back on" (recommended default)

- **Picture.** Beat 4 before the downbeat (frames 1650 to 1658): the ember dot stretches sideways into a thin
  line, 4 px tall, 8 f, ease-in. Frames 1658 to 1680: the line holds, in silence. Downbeat (1680): the line opens
  vertically in 14 f, ease-out, exactly like the power-on at 0:00 (`switchOn()`), but the picture it opens onto is
  clean: night, no static, no scanlines, no curvature, and the picture is smooth at 60 fps from this frame.
  Inside, the eight faint dots of scene 5's wink are now thin key outlines around the centre, and the ember drains
  from the line into the ninth key as the opening completes. Then bar 1 runs as now: keys 1 to 8 fill on the
  eighths, the panel grows in bar 2.
- **What it says.** It has been switched back on, and the picture is new. It bookends the power-on at 0:00 and the
  switch-off at 0:20.6, and it pays off the wink ("something trying to come through", 02, section 6): it came
  through. A famous 1962 cut goes from a blown-out match to "the burning hot Arabian desert at sunrise"
  ([Filmsite](https://Filmsite.org/lawr.html)): a small light becoming a whole world. Keep the idea, not the
  brightness.
- **Sound.** The hum glide and the hiss riser (section 6.4) build under the end of scene 5 and stop dead as the
  line forms (frame 1650); 30 f of silence; on the downbeat, the scene 1 power-on thunk under the sub hit and the
  first kick, the bass on A.
- **Build.** `switchOn()` already returns `{open, power}`; use `open` as a clip on the Act 2 hero for 14 f, with no
  `TubePicture` effects. The outlines are the `Dot` wink positions drawn as key strokes. Cost: small (about half a
  day, inferred). Flash: the line is thin and the opened picture is night, so no large light change.

### Option C: "Signal returns"

- **Picture.** If the new Act 1 screen gets realistic status icons (the owner's review), its signal bars die with
  the keys in scene 4. At the handover four small bars rise beside the dot, one per beat of bar 1, with the kick;
  then the dot becomes the ninth key as now.
- **What it says.** The signal is back, which is the direction's own picture of the resurrection (02, section 6).
- **Weakness.** Small on screen, and a bar icon is a cliché of phones. It is stronger as the offline chapter's
  callback ("it could write with no signal" in Act 1, "works offline" in Act 2; section 5). Cost: small.

### Considered and dropped

- **Dive into the dot.** An ember dot filling the frame is a bright full-frame change; diving through an ember
  ring works but repeats the title dive. Dropped.
- **Pixel screen word resolving into the app's card.** Showing the app's card in pixel type would show the app
  untruthfully. Scene 15's "then" and "now" already makes this point.
- **A pulsing dot on a thump.** Reads as a heartbeat, which the direction bans (02, section 6). Keep the dot still.

### Ranking

| Option | Impact (1 to 5) | Build cost | Risk | Use it |
|---|---|---|---|---|
| B, switched back on, with the wink outlines | 4 | Small | Low | **Default** |
| A, same keys | 5 | Large, needs a new plate | Plate registration; old look on night | **If the new plate is straight on** |
| Current: the dot grows into the ninth key | 3 | None | None | Fallback |
| C, signal returns | 2 here, 4 in the offline chapter | Small | Cliché | **In the offline chapter** |

A and B combine: B's opening can reveal A's keypad. Do not stack both into the same 2 s unless the cut is
watched at full speed and still reads.

## 4. Act 1 with a narrator

Act 1 has no beat, so its transitions follow the narrator's breaths. Owner's request: the narrator speaks where
text is on screen, and over scene 5.

| Change (now) | Proposal | Frames | Sound | Narrator |
|---|---|---|---|---|
| Power-on (0:00) | Keep | 14 f open, 20 f brightness | Thunk, rising hum | First words after the picture locks (from 0:03.4), not over the thunk or the loud hiss |
| Shot 2a to 2b (0:06) | A stepped push into the pixel screen (the display box is in `plates.json`), landing as shot 2b | 18 to 24 f, steps at 12 Hz | The hum leans in; no burst | May speak across |
| Shot 3a to 3b (0:14.6) | One slow picture roll, the dark blanking bar passing once | 30 f, stepped | A low slip in the hum | May speak across, quietly |
| Shot 3b to 4a (0:16.5) | The only static burst after scene 1 | 7 f | Filtered burst | Pause |
| Shot 4a to 4b (0:18.8) | A time match: the whole phone lit (the `img-06` framing) loses its key lights row by row, then a hard cut to the same framing under dust (`img-07`) | 0 f cut | L-cut: the hum carries over and keeps sinking | Line about glass over the lit phone; pause on the cut; line about quiet over the dusty one |
| Switch-off (0:20.6) | Keep | 10 + 20 f | Sweep down, hum stops, room tone | Silent from 0.5 s before to 1 s after |
| Scene 5 lines | Each line appears on the narrator's first word (0 to 2 f after its start), from word timings | | Room tone | Reads the lines; ends about 1 s before the downbeat (section 3) |

For time passing in one cut, School of Motion's advice applies: there "should be something for the audience to
focus on that is constant" ([SoM](https://www.schoolofmotion.com/blog/match-cuts)): the phone in the same place.

Optional, test before keeping: let the narrator sound faintly as if heard in a room with the set in Act 1 (a gentle
high-pass and a little room), and dry and close from Act 2, so the resurrection is also heard. Risk: it may read as
two voices; keep the difference small.

## 5. Act 2: one path, told as one story

### 5.1 One grammar, not one camera

| Move | Meaning | Where |
|---|---|---|
| Content moves left (camera right) | The next item | Features, proof steps |
| In (push or dive) | A closer look, how it works inside | Title to problem; card to proof chip |
| Out (pull back) | The real thing, the context | Hero to the real phone (bar 17); proof to the offline phone |
| Up (content rises from below) | What lies under the surface | Once: from the laptop screen down to its keys |
| A shape becomes the next shape | This becomes that | Dot to key; 26 letters to 9 keys; proof chip to status pill; "Free." to Speak |
| Hard cut on a downbeat | A new chapter, or a statement | The app's voice, the problem, Kiro, then and now |

Left is the past: scene 15 already puts "then" on the left and "now" on the right. Nothing else moves left.

### 5.2 The ember baton

At each chapter change, the last ember thing of the outgoing scene and the first of the incoming one sit at the
same screen place (within 8 px, 06) or one visibly becomes the other. Between chapters, frames without ember are
fine (the proof is calm on purpose). Check every render with the tracker (Appendix A).

### 5.3 Change by change

Bars are the current grid; if the narrator script moves things, keep the transition and move the bar.

| Change | The idea handed over | Transition | Length, ease | Sound | Narrator | Cost |
|---|---|---|---|---|---|---|
| Act 1 to rebirth (bar 1) | It comes back | Section 3 | | | Silent | |
| Rebirth to typing (bars 2 to 3) | It works | Continuous camera, as now | | Key tones | Silent: the app speaks first | None |
| Typing to "Hello again." (bar 5) | It speaks | Speak pressed, hard cut to the line on night, music stops dead (keep) | 0 f | Silence, then the voice | Silent from 1 beat before to 1 beat after the voice | None |
| "Hello again." to the title (bar 6) | This is Ninth Life | Hard cut on the drop plus a type match: the name lands on the same baseline and cap height as "Hello again." had; the icon cuts in whole beside it (the icon is never built up, 02) | 0 f | The drop | Silent for the drop bar; the promise over bars 7 to 8, supers as keywords | Small |
| Title to the problem (bar 9) | Typing to talk takes time | Keep the dive into the icon's plum centre key, but close the dive window onto that key sooner, so the moon gaps between the keys are masked out before they grow (or cut to plum on the fastest frame before they pass a tenth of the frame); the new scene lands from x1.15 | 14 to 16 f in | Whoosh to the music's breakdown | Pause through the dive; the problem line starts one eighth after the downbeat | Small |
| Problem to solution (bar 11 to 12, or wherever the groove returns) | Nine keys are enough | **The fold**: each letter cell lifts slightly in depth and flies to its key, one frame apart per key; the cell under the scanning highlight carries the ember into its key; the landing is the groove's return; the camera keeps moving into the "how it works" framing. The whip pair is removed and its 20 f go to the fold | 30 f, `EASE.flight` | Reverse swell peaking on the landing frame; no whoosh | Silent from 1 beat before to the landing; then the solution line | Medium |
| Solution to trust (bars 17 to 18) | Every spoken word matches the keys | Keep: the phone's screen opens around the card, the card stays when the phone goes, the camera zooms into "water", the chip forms | as now | Whoosh small, tick | May speak across: these are match cuts and morphs | None |
| Trust to offline (bar 23) | It needs no network | Container transform: the "water 92837" chip (check icon) becomes the phone's status pill ("Offline"), the camera pulls back to the phone; beside it the film's own offline icon loses its arcs one per eighth, then its strike appears (the signal callback, in brand style so the one-callback rule holds) | 16 to 20 f | Soft whoosh on the pull-back, falling ticks | J-cut: the offline line starts one eighth before the pill lands | Medium |
| Offline to "No account... Free." (bar 24) | No account, no cost | Hard cuts on the beats (keep), each word formed on its first frame | 0 f | The kick | Either silent, or each word exactly on the narrator's words (cuts on word starts, not on beats) | Small |
| "Free." to devices (bar 25) | It runs where you are | The ember "Free." block shrinks and flies to the phone's Speak button (the baton), then the camera slides right to the laptop: "Phone. Laptop. Any modern browser." No tablet | 14 f, then 14 f | Tick, whoosh | May speak across | Small |
| Devices to ways to type (bar 27) | Press keys any way you can | From the laptop window the camera moves down to a row of keycaps rising from below ("Keyboard."), then moves right to a phone's keypad ("Touch.", the fingertip ring), then the round switch slides in from the right with the scanning ring as the ember ("One switch."), then the flip is a cut, as the app does it | 12 to 14 f each | Ticks; the switch's thud | May speak across; the list is the narration | Medium |
| Ways to type to Kiro (bar 32) | How it was made | Hard cut on the downbeat, with the music's lift | 0 f | The lift | J-cut, one eighth | None |
| Kiro to then and now (bar 35) | Same keys, new life | Hard cut into the music's strip-back; the small set on the left keeps its stepped motion | 0 f | Strip-back | The two supers spoken, word for word | None |
| Then and now to the last line (bar 37) | It is good to be back | The set's inset switches off (small, as now); Speak pressed; hard cut; music stops dead | 0 f | Silence, the app's voice | Silent from bar 36, beat 4 | None |
| Last line to the end card (bars 38 to 39) | Where to find it | The line holds 2 beats, night, four notes of the motif; the icon fades in on the fifth; its ninth key's ember fades in last, placed where Speak was pressed (eye match across the silence). One more change at most, then stillness | 36 f, then 54 f | Motif, chord | Silent to the end | Small |

The owner asked for a simpler outro. Seen as a transition, the end card should build in two steps at most (the
lockup, then the address and the intended-purpose sentence together) and then stay still; every further line of
small print is another change for the eye. The intended-purpose sentence must stay, verbatim (product.md).

### 5.4 A camera that never cuts?

It would help in three ways: the story would feel continuous, the direction's "one camera, one world" (02,
section 5) would be literal, and cuts would hide in motion. It would hurt in more:

- **It competes with the narrator.** Listening while tracking a moving frame is harder than listening over a held
  one (inferred). Multimedia-learning research points the same way: people "learn more deeply from a multimedia
  message when extraneous material is excluded rather than included" (coherence, 18 of 19 tests) and when
  "corresponding graphics and narration are presented simultaneously rather than successively" (temporal
  contiguity, 8 of 8 tests) ([Mayer, 2023](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-research-based-principles-for-designing-multimedia-instruction-mayer.pdf)).
  That is teaching research, not marketing, so take it as a hint.
- **It loses punctuation.** A hard cut on a downbeat is the strongest full stop a 120 BPM film has; a flight is a
  comma.
- **It repeats.** The fourth flight between rooms is a pattern the viewer starts to watch instead of the app. Long
  takes are contested even in features: the director of a famous 1948 one-take film later called it "a stunt"
  ([Den of Geek](https://www.denofgeek.com/?p=69610)), while a 2020 critique argues a one-take war film's form is "a
  fitting way to tell the story" ([The Ringer](https://www.theringer.com/movies/2020/2/5/21124081/1917-one-shot-tracking-shot-gimmick-best-picture-sam-mendes)).
  It works when it serves the story.
- **It costs.** One world for 86 s breaks STYLE.md's split of scenes between builders, every change ripples, and
  each long blurred flight is expensive to render.

Verdict: one world per chapter, the grammar of 5.1 between chapters, the ember baton across them. The continuity
comes from the narrator's sentences and the baton, not from the camera.

## 6. The audio side of transitions

### 6.1 Rules

1. **Peaks on cuts.** Start a transition sound before the edit "and let its peak fall on the first frame of the
   new shot"; "a transition placed entirely after the cut always feels late"
   ([Morphic](https://morphic.com/resources/sounds/transition-sound-effects)). Trim silent heads (06).
2. **Tension, then silence, then release** (Violet, Fault, above). At 120 BPM: a riser of 1 bar or 2 beats that
   stops dead 15 to 30 f before beat 1; the hit on beat 1.
3. **Silence is the strongest transition.** The music stops dead for two of the app's three lines and ducks for
   the third. The handover gets one more silence, 15 to 30 f before the first downbeat.
4. **One hit per chapter at most** ("if everything gets a sub, nothing lands", 06).
5. **Whooshes only for moves the eye sees**, rotated among three or four files (06), and only in narrator pauses;
   under speech a move gets a tick on landing instead.
6. **Design elements step back for the voice**: "duck design elements under any dialogue or title card" and, for
   narration, "duck design elements underneath it rather than competing" ([Violet Recording](https://violetrecording.com/sound-design-for-trailers/)).

### 6.2 Cues at 120 BPM

| Cue | Length | Where | Under the narrator |
|---|---|---|---|
| Riser (noise or tone) | 120 f or 60 f | Ends 15 to 30 f before a chapter downbeat | Its last beat: never; earlier: ducked |
| Pre-drop silence | 15 to 30 f | Before the handover, the drop, the groove's return | Narrator silent |
| Sub hit | Transient on the frame | Beat 1 of a chapter | No word within 0.25 s of it |
| Reverse swell | 30 f | Peak on the cut frame | In a pause |
| Whoosh | 0.4 to 0.8 s, peak on the fastest frame | Dive, whip, big push | In a pause; otherwise a tick |
| Tick | About 0.1 s | When something visibly lands | Yes, quiet (about 0.3 to 0.4, as now) |
| Key tone | Per press | Press frame, in A minor pentatonic | Yes |
| Motif E D G G A | 5 notes | Act 1, scene 7, the end | Yes |

### 6.3 Keeping the narrator clear

- **Ducking the music.** One tool's docs call "−6 to −12 dB" a "gentle dip" and "−20 dB" a "typical value — music
  is clearly under the voice but still audible" ([Vindral](https://composer-docs.vindral.com/operators/operators-sidechain-ducking.html)).
  This film's music carries the cuts, so start at about 8 to 12 dB under the narrator (the film already ducks 12 dB
  under the app's voice in bar 16) and set it by ear. For a sidechain, one guide starts music-under-dialogue at
  about 2:1, 15 to 20 ms attack, 600 to 700 ms release ([Sound on Sound](https://www.soundonsound.com/techniques/duck-tales)).
  The film already has stems (`public/audio/music/act2-drums.wav`, `act2-other.wav`): duck the melodic stem more
  than the drums, so the pulse keeps the transitions on the beat (inferred).
- **Ducking the effects.** "Using the vocal signal to duck the effects can make a significant difference, even
  with only a couple of dB of ducking" ([Sound on Sound](https://www.soundonsound.com/techniques/duck-tales)). Key
  every whoosh, tick and riser to the narrator, too.
- **Make room in the speech band.** "The frequency band that most affects speech intelligibility (male and female)
  is between 2.5-5 KHz"; "reduce the music track by 2-4 dB at those frequencies" and boost the voice by the same
  ([ProSoundWeb](https://www.prosoundweb.com/in-the-studio-balancing-dialog-in-post-production/)). Give whooshes
  under speech a low-pass around 6 kHz (inferred).
- **Supers with the narrator.** Keep them short. Adding on-screen text to narrated graphics did not help learning
  in Mayer's tests, but that effect "can be diminished or even reversed when ... the on-screen text is short or in
  a reworded form" ([Mayer, 2023](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-research-based-principles-for-designing-multimedia-instruction-mayer.pdf)).
  The film's 1-to-5-word cards are that short form, and the film must make sense with the sound off (02). Keep J-cut
  leads short (one eighth) so words and pictures stay together.
- **The narrator and the app's voice never touch.** The narrator stops at least 1 beat before each app line and
  resumes at least 1 beat after; never over a static burst or a riser's last beat.
- **Write narration to the grid.** At about 2.5 words a second
  ([Bread n Beyond](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/)), one bar
  holds about 5 words and two bars about 10. Write each sentence to 1 or 2 bars, so its end lands on a bar line
  where a transition can go. At most one sentence per chapter should bridge a cut, and it should break at a comma.
- **Place cuts from word timings, not by ear.** ElevenLabs returns character-level timing from its
  `with-timestamps` endpoint ([docs](https://elevenlabs.io/docs/api-reference/text-to-speech-with-timestamps)); store
  it like `src/data/voice.json`. Pauses: `<break time="x.xs" />` gives "natural pauses up to 3 seconds", but
  "Eleven v4 and Eleven v3 do not support SSML break tags"; with those models use punctuation and text structure
  ([docs](https://elevenlabs.io/docs/best-practices/prompting/controls)). Simplest for transitions: generate one
  file per narrator sentence and place each on the grid.
- **Loudness.** The film's finish already normalises to -14 LUFS integrated, -1.6 dBTP true peak
  (`film/scripts/finish-audio.py`). A third party reports that YouTube has played back at "exactly -14 LUFS"
  since 2019 ([Production Advice](https://productionadvice.co.uk/youtube-loudness/)); I found no YouTube document
  stating it.

### 6.4 Three sound bridges between the worlds

- **The hum comes home.** The tube hum and the drone are already tuned to A: their strongest partials are at 55
  and 110 Hz (measured from `public/audio/amb/hum.wav` and `drone.wav`; A1 is 55 Hz,
  [Wikipedia](https://en.wikipedia.org/wiki/Piano_key_frequencies)). As the keys die, `Act1Sound.tsx` drops the hum
  a semitone per row, to F. At the handover, bring it back at F and glide it up four semitones to A over the last
  beat or two, stop it dead 15 to 30 f before the downbeat, and let the bass enter on A: death was falling pitch,
  life is the home note. Pre-render the glide as a file (`scripts/audio/`), because `toneFrequency` "must stay
  constant" and "animating or keyframing toneFrequency is not supported"
  ([docs](https://www.remotion.dev/docs/media/audio)).
- **The static becomes the riser.** A noise riser is noise through a low-pass filter whose cutoff rises: "apply a
  low-pass filter with resonance set at 15-20% and automate the cutoff frequency to rise at a steady pace"
  ([Unison](https://unison.audio/how-to-create-risers/)). Make Act 2's first riser from Act 1's own hiss, opened
  over the last bar, cut dead with the glide. Layered, the glide is the tonal riser and the hiss the noise riser
  (inferred). Option B uses both (the set coming back on would hum and hiss); option A uses the glide alone.
- **The motif.** E D G G A, thin and square in Act 1, full in scene 7, soft at the end (02, section 8). It is the
  film's audio match cut; keep it exactly in tune and in time each time.

### 6.5 Checks

Listen to every transition at full speed, on laptop speakers and on earphones (inferred practice); mute the
narrator once to check the cuts still land on the music; mute everything once to check the picture still tells
the story (02 requires sound-off sense).

## 7. Building it in Remotion 4.0.542, in this repository

- **Keep the timeline.** `Film.tsx` mounts each scene in an absolute `<Sequence>` on the bar grid. A
  `<TransitionSeries.Transition>` "shortens the total duration because both scenes overlap"
  ([docs](https://www.remotion.dev/docs/transitions/transitionseries)), and the entering scene starts early, so its
  local frame 0 (and every `atIn()` in it) shifts. 06, section 7, already advises hard cuts plus in-scene moves.
- **Batons across a cut.** `<TransitionSeries.Overlay>` (from v4.0.415) renders "on top of the cut point without
  affecting timing"; "the overlay does not shorten the timeline", it is centred on the cut by default and takes an
  `offset` ([docs](https://www.remotion.dev/docs/transitions/transitionseries)). The film can get the same thing
  without converting to a series: a bridge `<Sequence>` above the scenes.

  ```tsx
  // Film.tsx: a baton that crosses the scene 5 / scene 6 cut; no scene's timing changes.
  <Sequence from={SCENES.s06.from - sec(0.5)} durationInFrames={sec(1)} name="bridge: ember line">
    <EmberLine />
  </Sequence>
  ```

- **Two scenes moving together.** Inside one scene's sub-shots, a `TransitionSeries` with the `none()`
  presentation and `useTransitionProgress()` (from v4.0.177; `entering` and `exiting` from 0 to 1;
  [docs](https://www.remotion.dev/docs/transitions/use-transition-progress)) lets each side animate its own elements.
  Add the transition's length back to one sequence to stay on the grid.
- **The key-shaped wipe as a custom presentation** ([docs](https://www.remotion.dev/docs/transitions/presentations/custom)):

  ```tsx
  import React from 'react';
  import { AbsoluteFill } from 'remotion';
  import type { TransitionPresentation, TransitionPresentationComponentProps } from '@remotion/transitions';

  type KeyWipeProps = { box: [number, number, number, number]; radius: number; width: number; height: number };

  const KeyWipe: React.FC<TransitionPresentationComponentProps<KeyWipeProps>> = ({
    children, presentationDirection, presentationProgress: p, passedProps: { box, radius, width, height },
  }) => {
    if (presentationDirection === 'exiting') return <AbsoluteFill>{children}</AbsoluteFill>;
    const [x, y, w, h] = box; // the key's box on screen, px
    const k = 1 - p;
    const clipPath = `inset(${y * k}px ${(width - x - w) * k}px ${(height - y - h) * k}px ${x * k}px round ${radius * k}px)`;
    return <AbsoluteFill style={{ clipPath }}>{children}</AbsoluteFill>;
  };

  export const keyWipe = (props: KeyWipeProps): TransitionPresentation<KeyWipeProps> => ({ component: KeyWipe, props });
  ```

  Use it with `linearTiming({durationInFrames: 16, easing: EASE.camera})`, or skip the series and put the same
  `clipPath` on the incoming shot inside one scene. A sound can ride on a presentation with the `addSound()`
  pattern, which renders an `<Audio>` only on the entering side
  ([docs](https://www.remotion.dev/docs/transitions/audio-transitions)).
- **Other built-ins** (installed): `fade`, `slide`, `wipe`, `iris`, `clockWipe`, `blurSlide`, `linearBlur`,
  `zoomBlur`, `crossZoom`, `dissolve`, `pushCut` and others. `pushCut` (from v4.0.500) adds "a brief flash at the
  edit point" by default, `flashOpacity` 0.2 ([docs](https://www.remotion.dev/docs/transitions/presentations/push-cut)):
  set it to 0 (06). Cube, flip, book flip and swap read as templates (06).
- **Shader transitions.** `makeHtmlInCanvasPresentation()` (from 4.0.456) takes a shader whose `draw()` receives
  the previous and next scenes as images ([docs](https://www.remotion.dev/docs/transitions/make-html-in-canvas-presentation)).
  `<HtmlInCanvas>` needs Chrome 149 or later with a flag, the API is "unstable", WebGL needs `--gl=angle`, and
  nesting needs a newer Chrome ([docs](https://www.remotion.dev/docs/html-in-canvas)). The film's renders already
  use `HtmlInCanvas` effects, so the pipeline works, but test-render one frame of any new effect first.
- **Effects for transitions** (`@remotion/effects`, from 4.0.464, applied in order through an `effects` array;
  [docs](https://www.remotion.dev/docs/effects)): `pixel-dissolve`, `pixelate`, `radial-progressive-pixelate`,
  `iris-wipe`, `radial-wipe`, `shine`, `glow`, `zoom-blur`, `blur`, `scanlines`, `tear`, `white-noise` (installed).
- **Act 1 stepping.** `interpolate(..., {posterize: 5})` and `interpolatePaths(..., {posterize})` give 12 Hz steps
  without hand-written rounding ([docs](https://www.remotion.dev/docs/interpolate)).
- **A transition-versus-narration check** (proposal): list every loud transition frame in one table (like
  `VOICE_AT`) and fail the build if a narrator word from the timing file falls within 1 beat of it, the way
  `verify-kiro.ts` guards the Kiro scene.

## 8. Flash safety for the new transitions

The rules (01-research, section 4): no more than three flashes in any second, a flash being "a pair of opposing
changes in relative luminance of 10% or more" where the darker side is below 0.80, over more than 25% of any 10
degree field, and "the video should be analyzed for risks at full screen"
([W3C, 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)); fast cuts count
(ITU-R BT.1702, in 01).

Night to ember is a step of about 0.52 and night to moon about 0.83, so in this palette any large ember or moon area
appearing is half a flash. The risky moves:

| Move | Risk | Keep it safe |
|---|---|---|
| Dive through ember or moon | Full frame bright, then dark | Dive through plum or night only; close the dive window onto the plum key before the moon gaps grow |
| Key wipe or iris revealing a moon panel | Growing bright area | Reveal night first; let the panel grow afterwards, as scene 6 does |
| Glow or shine sweep | A moon band crossing the frame | Small objects, low intensity, once |
| Scanning-highlight wipe | An ember bar stepping row by row | Ring, not a filled band |
| Pixel dissolve | Bright cells blinking | Fine cells, dark content |
| Static bursts (Act 1) | Mid-grey against dark | At most 0.5 s, at most 2 a second, low contrast (02) |
| The handover line (option B) | Ember line | 4 px tall; the opened picture is night |

Run `python3 -I scripts/check-flashes.py` on every render; it screens a 4 x 4 grid against these thresholds and is
not a certified test.

## 9. What I could not verify

- I watched no videos; film examples come from the articles linked.
- The Material motion spec page did not load; the quotes are from the Material codelab. No Material durations were
  found, so none are used.
- Ofcom's guidance note refused automated access (as in 01). The -14 LUFS YouTube figure is a third party's
  measurement.
- The edit-blindness figures come from the paper's abstract page, not the full text. Mayer's figures come from his
  2023 chapter; they concern learning, not persuasion.
- The multiplane camera date and the screen-direction convention come from Wikipedia via search extracts.
- `TransitionSeries.Overlay`, `pixelDissolve`, `shine` and the custom key wipe were not test-rendered in this
  repository; the hum glide and the hiss riser are untested ideas.
- The ember tracker is a colour heuristic at low resolution; thin rings and small rings can be missed.
- Costs are estimates for a builder who knows the code.
- Ducking amounts come from practitioner guides and tool docs, not standards; set them by ear.
- Mayer's findings come from teaching research and are a hint for a marketing film, not proof.

## Appendix A. The ember tracker

Run on any render; prints the ember's place on both sides of every bar-line change in Act 2.

```python
# python3 -I ember.py   (needs numpy and ffmpeg)
import subprocess, numpy as np
MP4, W, H = "film/out/ninth-life-hello-again.mp4", 192, 108
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", MP4, "-vf", f"scale={W}:{H}:flags=area",
                      "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
a = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
m = (r > 170) & (g > 90) & (g < 215) & (b < 110) & (r - b > 120) & (r > g + 25)  # the ember family
ys, xs = np.mgrid[0:H, 0:W]
n = m.sum(axis=(1, 2))
cx = np.where(n > 0, (m * xs).sum(axis=(1, 2)) / np.maximum(n, 1) * 1920 / W, np.nan)
cy = np.where(n > 0, (m * ys).sum(axis=(1, 2)) / np.maximum(n, 1) * 1080 / H, np.nan)
for bar in [3, 6, 9, 12, 18, 23, 27, 32, 35, 39]:  # scene starts in Act 2
    f = 1680 + 120 * (bar - 1)
    print(bar, f, (cx[f - 1], cy[f - 1]), "->", (cx[f], cy[f]))
```

## Sources

Remotion: [transitions](https://www.remotion.dev/docs/transitions),
[TransitionSeries](https://www.remotion.dev/docs/transitions/transitionseries),
[presentations](https://www.remotion.dev/docs/transitions/presentations),
[custom presentations](https://www.remotion.dev/docs/transitions/presentations/custom),
[timings](https://www.remotion.dev/docs/transitions/timings),
[custom timings](https://www.remotion.dev/docs/transitions/timings/custom),
[useTransitionProgress](https://www.remotion.dev/docs/transitions/use-transition-progress),
[audio transitions](https://www.remotion.dev/docs/transitions/audio-transitions),
[iris](https://www.remotion.dev/docs/transitions/presentations/iris),
[pushCut](https://www.remotion.dev/docs/transitions/presentations/push-cut),
[makeHtmlInCanvasPresentation](https://www.remotion.dev/docs/transitions/make-html-in-canvas-presentation),
[HtmlInCanvas](https://www.remotion.dev/docs/html-in-canvas), [effects](https://www.remotion.dev/docs/effects),
[pixelDissolve](https://www.remotion.dev/docs/effects/pixel-dissolve),
[tvSignalOff](https://www.remotion.dev/docs/effects/tv-signal-off),
[interpolate](https://www.remotion.dev/docs/interpolate),
[interpolatePath](https://www.remotion.dev/docs/paths/interpolate-path),
[makeRect](https://www.remotion.dev/docs/shapes/make-rect), [Audio](https://www.remotion.dev/docs/media/audio).

Editing and motion: [School of Motion, six transitions](https://www.schoolofmotion.com/blog/six-essential-motion-design-transitions-tutorial),
[School of Motion, match cuts](https://www.schoolofmotion.com/blog/match-cuts),
[match cut](https://en.wikipedia.org/wiki/Match_cut),
[a 1962 match-to-desert cut](https://Filmsite.org/lawr.html) (background for "a small light becomes a world"),
[Material motion system](https://m2.material.io/design/motion/the-motion-system.html),
[Material motion codelab](https://developer.android.com/codelabs/material-motion-android),
[Powers of Ten](https://www.mentalfloss.com/article/70340/watch-powers-ten),
[multiplane camera](https://en.wikipedia.org/wiki/Multiplane_camera),
[screen direction](https://en.wikipedia.org/wiki/Screen_direction),
[Edit Blindness](https://bop.unibe.ch/JEMR/article/view/2264),
[FLIP](https://aerotwist.com/blog/flip-your-animations/),
[MDN inset()](https://developer.mozilla.org/en-US/docs/Web/CSS/basic-shape/inset),
[glitch review](https://www.creativeapplications.net/review/the-glitch-momentum-by-rosa-menkman-review-by-greg-j-smith/),
[FizzleFade](https://fabiensanglard.net/fizzlefade),
[Den of Geek on a 1948 one-take film](https://www.denofgeek.com/?p=69610),
[The Ringer on a 2019 one-take film](https://www.theringer.com/movies/2020/2/5/21124081/1917-one-shot-tracking-shot-gimmick-best-picture-sam-mendes),
[Mayer's principles](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-research-based-principles-for-designing-multimedia-instruction-mayer.pdf).

The old set: [power-off spot](https://repairfaq.org/samnew/tvfaq/tvcbspo.htm),
[whine](https://repairfaq.org/samnew/tvfaq/tvwhine.htm),
[vertical lock](https://www.repairfaq.org/samnew/tvfaq/tvvlockl.htm),
[rolling picture and blanking bar](https://gammaelectronics.xyz/basic_tv_1975_16.html).

Sound: [StudioBinder, sound bridge](https://www.studiobinder.com/blog/what-is-a-sound-bridge),
[FireCut, J-cut offsets](https://firecut.ai/features/remove-silences/j-cuts),
[Violet Recording, trailer sound](https://violetrecording.com/sound-design-for-trailers/),
[Fault, trailer audio](https://fault-magazine.com/?p=107206),
[Morphic, transition sounds](https://morphic.com/resources/sounds/transition-sound-effects),
[Unison, risers](https://unison.audio/how-to-create-risers/),
[Vindral, ducking](https://composer-docs.vindral.com/operators/operators-sidechain-ducking.html),
[Sound on Sound, ducking](https://www.soundonsound.com/techniques/duck-tales),
[ProSoundWeb, dialog balance](https://www.prosoundweb.com/in-the-studio-balancing-dialog-in-post-production/),
[piano key frequencies](https://en.wikipedia.org/wiki/Piano_key_frequencies),
[Production Advice, YouTube loudness](https://productionadvice.co.uk/youtube-loudness/),
[Bread n Beyond, words per minute](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/),
[ElevenLabs timestamps](https://elevenlabs.io/docs/api-reference/text-to-speech-with-timestamps),
[ElevenLabs pauses](https://elevenlabs.io/docs/best-practices/prompting/controls).

Safety: [W3C, 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html); ITU-R
BT.1702 via [01-research.md](../01-research.md), section 4.
