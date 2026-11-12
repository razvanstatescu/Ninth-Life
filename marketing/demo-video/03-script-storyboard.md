# Script and storyboard

Working title: **"Hello again"**. Written 2026-11-10. Read [02-creative-direction.md](02-creative-direction.md)
first; it explains the rules this storyboard follows.

## Format

| | |
|---|---|
| Length | **1:54** (6,840 frames). Hard limit 1:58. The owner's limit is 2:00; the hackathon's is 3:00 |
| Picture | 1920 x 1080, 16:9, 60 frames a second, safe margins 64 px |
| Tempo | Act 1 has no beat. Act 2 is exactly 120 beats a minute: 1 beat = 30 frames, 1 eighth note = 15 frames, 1 bar = 120 frames = 2 s |
| Voice | No narrator. The app speaks 3 sentences: "Hello again." (0:36), "I need water." (0:58), "It is good to be back." (1:40). The lines are generated with ElevenLabs (owner's decision, 2026-11-10) |
| Text | All meaning is on screen. A caption file adds sound descriptions (see the end of this file) |

Act 2 times are given in bars. Bar *n* starts at frame `1680 + 120 x (n - 1)`, which is `0:28 + 2 x (n - 1)` seconds.
"Beat 3 of bar 5" means frame `1680 + 120 x 4 + 30 x 2`.

Every sentence, key code and candidate list below was checked on 2026-11-10 against the real offline decoder
(`@ninth/core` `decodeGhost` with `data/lexicon/en.v1.json` and `en.bigram.v1.json`):

| Sentence | Keys | What the decoder ranks first, second, third |
|---|---|---|
| hello | 43556 | hello |
| hello again | 43556 24246 | hello again, hello chain, hello chaim |
| i need water | 4 6333 92837 | i need water, i need waves, i need yates |
| it is good to be back | 48 47 4663 86 23 2225 | it is good to be back, it is home to be back, it is gone to be back |
| (one word) 4663 | 4663 | good, home, gone, hood |
| water / waves / wafer | 92837 / 92837 / 92337 | "wafer" differs at the third key |

The film must compute these again at build time and stop the build if any first choice changes (production guide,
section 5). Nothing on screen is typed by hand.

## Timeline at a glance

| # | Scene | Time | Bars | Length | What the viewer learns |
|---|---|---|---|---|---|
| | **Act 1: Dead air** | **0:00 to 0:28** | | **28 s** | |
| 1 | Power on | 0:00 to 0:04 | | 4 s | An old set wakes up at night |
| 2 | Nine keys | 0:04 to 0:11 | | 7 s | We used to write with 9 keys, one press per letter |
| 3 | The phone worked out the word | 0:11 to 0:17 | | 6 s | One code can be several words |
| 4 | The keys went away | 0:17 to 0:22 | | 5 s | The keypad died |
| 5 | The dot | 0:22 to 0:28 | | 6 s | Old is not the same as bad; one light stays on |
| | **Act 2: Ninth life** | **0:28 to 1:54** | **1 to 43** | **86 s** | |
| 6 | The ninth key | 0:28 to 0:32 | 1 to 2 | 4 s | The light becomes a key; the keypad comes back |
| 7 | Hello again | 0:32 to 0:38 | 3 to 5 | 6 s | Same keys, and now it speaks |
| 8 | Title | 0:38 to 0:44 | 6 to 8 | 6 s | Ninth Life: the old keypad, back as your voice |
| 9 | Who it is for | 0:44 to 0:50 | 9 to 11 | 6 s | Some people type to talk, and that takes time |
| 10 | How it works | 0:50 to 1:02 | 12 to 17 | 12 s | Press keys, it finds the sentence, it speaks |
| 11 | The proof | 1:02 to 1:12 | 18 to 22 | 10 s | Every spoken word matches the keys |
| 12 | Offline, private, free | 1:12 to 1:20 | 23 to 26 | 8 s | No signal, no account, any screen |
| 13 | Ways to type | 1:20 to 1:30 | 27 to 31 | 10 s | Touch, keyboard, one switch, or show the text |
| 14 | Built with Kiro | 1:30 to 1:36 | 32 to 34 | 6 s | How it was made |
| 15 | Then and now | 1:36 to 1:44 | 35 to 38 | 8 s | The same keys, a new life |
| 16 | End card | 1:44 to 1:54 | 39 to 43 | 10 s | Where to try it; what it is and is not |

The product is on screen from 0:28. Its first working demo (typing and speaking) ends at 0:38.

---

## Act 1: Dead air

Look: a cathode-ray television picture fills the frame (static, faint scanlines, soft edges, slight curve,
vignette). Contents change only every 5th frame. No ember colour. Text is lower-case in pixel type, in the pale
green of the pixel screen. Each text line stays at least 1.8 s.

### Scene 1. Power on (0:00 to 0:04, frames 0 to 239)

| Time | Picture | Text on screen | Motion | Sound |
|---|---|---|---|---|
| 0:00.0 | Black | | 20 frames of black | Silence, then faint room tone |
| 0:00.3 | The picture opens from a thin horizontal line to full height | | Opens over 14 frames, slowing down. Not a flash: brightness rises over 20 frames | Tube "thunk", rising hum |
| 0:00.8 | Full-frame static. Top right, the set's own display | `ch 09` (top right), `no signal` (bottom left) | Static changes 12 times a second | Hiss, filtered and quiet |
| 0:02.5 | The static thins; a dim picture starts to hold: a dark shape with rows of pale lights | `ch 09` stays | Two short rolls of the picture, then it locks | Hiss drops; a low drone starts |

`ch 09` is the only place the number nine appears in Act 1. Do not explain it.

### Scene 2. Nine keys (0:04 to 0:11, frames 240 to 659)

| Time | Picture | Text on screen | Motion | Sound |
|---|---|---|---|---|
| 0:04.0 | **Shot 2a.** The whole phone: a plain keypad phone of our own design, lying on a dark table in moonlight, its small screen and twelve keys glowing pale green. Legends and screen contents are drawn by the film | "we used to write with 9 keys." | Slow push in (3% over the shot) | Drone, hum |
| 0:06.0 | Cut through 6 frames of static to **shot 2b**: a pixel screen, 84 x 48 pixels, olive green. A cursor blinks slowly (once a second) | | Hard cut | Short static burst |
| 0:06.5 | Keys 4, 3, 5, 5, 6 are pressed, one every 0.5 s. A small inset (bottom right) shows the keypad in close-up, with the pressed key lighting. The screen shows the decoder's best guess after each press, ending in `hello` | "one thumb. one press per letter." (from 0:07.5) | Each press: the key light jumps on, the screen redraws on the next stepped frame | Five thin square-wave beeps: E, D, G, G, A. This is the motif |
| 0:09.5 | `hello` stays. The cursor blinks | | Hold | The last beep rings out |

### Scene 3. The phone worked out the word (0:11 to 0:17, frames 660 to 1019)

| Time | Picture | Text on screen | Motion | Sound |
|---|---|---|---|---|
| 0:11.0 | Pixel screen, new line. Keys 4, 6, 6, 3. The screen shows `good` | | One press every 0.4 s | Four beeps: E, A, A, D |
| 0:12.8 | The "next" key is pressed twice. The word changes: `good`, then `home`, then `gone`. A small `4663` stays in the corner of the pixel screen | "the phone worked out the word." | Each change is a redraw, no slide | A lower click for "next" |
| 0:14.6 | Static burst, then **shot 3b**: macro of one worn key, its legend half rubbed away | "a whole sentence, from a few keys." | Slow push in | Burst, then drone |
| 0:16.2 | Static burst | | | Burst |

### Scene 4. The keys went away (0:17 to 0:22, frames 1020 to 1319)

| Time | Picture | Text on screen | Motion | Sound |
|---|---|---|---|---|
| 0:17.0 | **Shot 4a.** The keypad in close-up. The key lights go out row by row, top to bottom | "then glass replaced the keys." | One row every 0.4 s | The hum sinks in pitch with each row |
| 0:18.8 | **Shot 4b.** The phone of shot 2a, in the same place and the same framing, years later: switched off, dark, under an even layer of dust | "the keypad went quiet." | Hard cut. Hold, with a very slow push in | Hiss rises a little |
| 0:20.6 | The television switches off: the picture collapses to a horizontal line, the line shrinks to a dot | | Collapse to a line in 10 frames; the line thins at its ends and shrinks over 20 frames, slowing down; brightness falls, no white flash | Power-down sweep, then **silence** |
| 0:21.3 | Black. One small pale dot in the centre | | Hold | Room tone only |

### Scene 5. The dot (0:22 to 0:28, frames 1320 to 1679)

The hinge of the film. The set is off, so there is no static now: clean black, pixel type, one dot.

| Time | Picture | Text on screen | Motion | Sound |
|---|---|---|---|---|
| 0:22.0 | The dot does not fade | "old is not the same as bad." | Lines appear one under the other and stay | Room tone |
| 0:23.4 | | adds: "it had few keys. big ones." | | |
| 0:24.8 | Around the dot, eight more dots show very faintly for a moment and go (a 3 by 3 grid). This is the one wink (creative direction, section 6) | adds: "it could write with no signal." | Stepped, low contrast, 0.6 s | A tube crackle |
| 0:26.2 | The dot starts to turn from pale grey to ember | adds: "it still has something to say." | Colour change over 1.3 s | One soft key tone from nowhere: E, the first note of "hello" |
| 0:27.5 | The four lines go. The dot is ember, alone | | Text cuts out | A low rising tone starts, half a second long |

---

## Act 2: Ninth life

Look: the brand. Clean, smooth, 60 frames a second. One camera over one large canvas. One ember thing on screen at
a time. Sentence case, Atkinson Hyperlegible Next ExtraBold; key codes in Atkinson Hyperlegible Mono.

"Hero" means a motion-graphics shot built from the design system's CSS and the real decoder's output, with no
device frame. "Capture" means real pixels from the running app inside a plain rounded frame drawn by us.

### Scene 6. The ninth key (bars 1 to 2, 0:28 to 0:32)

| Bar | Picture | Text | Motion | Sound |
|---|---|---|---|---|
| 1 | Hero. The ember dot grows into a rounded key (the ninth key, bottom right of a 3 by 3 grid). Eight plum keys appear around it, one on each eighth note | | The dot's shape changes from a circle to the key's rounded square in 10 frames. The eight keys cut in (no bounce), in the order 1 to 8. The picture is now smooth | Beat 1: a soft, deep hit. A kick on every beat, low bass. One key tone per key, rising: A, C, D, E, G, A, C, D |
| 2 | The moon panel grows out behind the keys. Letters land on the keys. The fourth row (Back, Space, Next) and the sentence card appear. The night ground gets its glow | | Panel grows from the ninth key in 14 frames. The camera pulls back to show the whole keypad and the empty sentence card. The ninth key keeps its ember fill until the first key press of bar 3 | A riser through the bar. Ticks as the parts land |

The eight keys arriving one per eighth note fill bar 1 exactly (8 x 15 frames).

### Scene 7. Hello again (bars 3 to 5, 0:32 to 0:38)

| Bar | Picture | Text | Motion | Sound |
|---|---|---|---|---|
| 3 | Hero. Keys 4, 3, 5, 5, 6 pressed on eighth notes from beat 1, then Space. On the first press the ember jumps from the ninth key to key 4 as a pressed ring, and the ninth key turns plum like the others. The sentence card fills: the decoder's best guess after each press, ending in "Hello". Mono digits `43556` under it | | Tight on the keys and the card; Speak is out of frame. The camera steps to each pressed key (8 frames) | Drums build. Soft key tones: E, D, G, G, A. The same notes as scene 2, now full |
| 4 | Keys 2, 4, 2, 4, 6 on eighth notes. The card reads "Hello again", digits `43556 24246` | | On beat 4 the camera whips to Speak, which now has the ember fill | Key tones: C, E, C, E, A. The riser peaks |
| 5 | Beat 1: Speak is pressed. **Everything stops.** The sentence fills the screen in moon type on night. The words light one after the other as they are spoken | **Hello again** | Hard cut to the big sentence on beat 1. No motion while the voice speaks | Beat 1: the music stops dead. 12 frames of silence. **The app's voice: "Hello again."** Then silence. On beat 4, a one-beat swell |

This is the first voice in the film. Keep the silence around it clean: no hiss, no music tail under the words.

### Scene 8. Title (bars 6 to 8, 0:38 to 0:44)

| Bar | Picture | Text | Motion | Sound |
|---|---|---|---|---|
| 6 | The icon (whole, still) and the name, on night with the moon glow | **Ninth Life** | Hard cut on beat 1 | **The drop.** Full drums, bass and the plucked synth |
| 7 | Same card | adds: "The old keypad, back as your voice." | The 7 words arrive on eighth notes | Groove |
| 8 | The tagline changes | "Type on 9 keys. Hear your sentence." Small, below: "Free, in your browser." | Cut on beat 1. On beat 4 the camera dives through the icon's ember key into scene 9 | A whoosh ending in a soft hit on bar 9 |

### Scene 9. Who it is for (bars 9 to 11, 0:44 to 0:50)

**Revised 2026-11-10 during the build** (the text below was too dense to read in 6 s): bar 9 "Some people type to talk." with a small "For an afternoon, or for good."; bar 10 the letter grid with a small "One switch" label and "Every letter takes time."; bar 11 the grid folds into the keypad, "Nine keys are enough.", whip out. The table below is the earlier version.

| Bar | Picture | Text | Motion | Sound |
|---|---|---|---|---|
| 9 | Type only, on night | "Some people type to talk." (beat 1). "For an afternoon, or for good." (beat 3) | Each line cuts in | The music thins: drums drop to a light pattern |
| 10 | A plain grid of the 26 letters, drawn by us in brand style (not anyone's keyboard). An ember highlight steps through it, one cell per beat, slowly | "Typing to talk takes time." | The highlight jumps, as in the app | One tick per step |
| 11 | The highlight is still only at the fifth letter | "With one switch, every letter is a wait." Then, on beat 3: "The old keypad needs only 9 keys." | On beat 3 the 26 cells fold into the keypad. Whip pan to scene 10 on beat 4 | The drums come back on beat 3 |

No comparison is claimed. The film does not say that 9 keys are faster; no test of ours measured that.

### Scene 10. How it works (bars 12 to 17, 0:50 to 1:02)

| Bar | Picture | Text | Motion | Sound |
|---|---|---|---|---|
| 12 | Hero. The keypad, wide. A highlight jumps over keys 2 to 9, one per eighth note | "Press 2 to 9." | 8 keys x 15 frames fills the bar | Eight key tones, rising |
| 13 | Keys 4, Space, 6, 3, 3, 3 on eighth notes. Card: "I need", digits `4 6333` | "One press per letter." | Split picture: keys left, card right. The camera steps with each press | Key tones |
| 14 | Keys Space, 9, 2, 8, 3, 7. Card: "I need water", digits `4 6333 92837` | | Same | Key tones |
| 15 | The candidate list flies in under the card: "I need water", "I need waves", "I need yates". The first has the selection ring | "It finds the sentence." | The list rises 24 px and fades in over 6 frames, rows 4 frames apart | A soft hit as the list lands |
| 16 | Speak is pressed on beat 1. The words light as they are spoken | "Then it speaks." | The camera pushes in on the card | The music ducks by 12 dB. **The app's voice: "I need water."** |
| 17 | **Capture.** The camera pulls back: all of this is on a real phone screen in a plain frame, showing the whole app | | Pull back in 14 frames, then hold for the rest of the bar | Music back to full on beat 1 |

Bar 17 is the first shot inside a device frame. It tells the viewer that what they just saw is the real app.

### Scene 11. The proof (bars 18 to 22, 1:02 to 1:12)

| Bar | Picture | Text | Motion | Sound |
|---|---|---|---|---|
| 18 | Hero. The camera zooms into the word "water". A proof chip forms around it: check icon, "water", `92837`, filled border | "Every spoken word matches your keys." | Zoom in 12 frames | Whoosh, soft hit |
| 19 | The letters w, a, t, e, r stand over the digits 9, 2, 8, 3, 7. Each letter's key lights in turn | | One letter per eighth note from beat 1 | Five key tones |
| 20 | A second card slides in from the right, labelled "Model ranking (opt-in)". It offers the word "wafer" | "A model can help rank sentences." | Camera steps right | A neutral tick |
| 21 | "wafer" is checked: 9, 2, **3**, 3, 7 under 9, 2, **8**, 3, 7. The third digit does not match. The word is struck through; the chip gets an x icon and a dashed border | The app's own sentence: `The model suggested "wafer". Your keys spell "water", so "wafer" was dropped and will not be spoken.` | Digits compare one per eighth note; the strike draws in 7 frames on beat 4 | A dull, low "no" tick on the mismatch. Not a buzzer |
| 22 | The struck word falls back; "water" stays, with its check | "It cannot put words in your mouth." | Hold the line for the whole bar | The groove drops out for 2 beats, then returns |

The rejected state is never shown by colour alone: icon, strike and border style carry it, as in the app.
A capture of the real proof panel showing the same rejection sits behind bar 22 at the left, in a frame. If the
rejection was made with the test model (`DECODE_FAKE_LLM`), the words "test model" appear under the frame.

### Scene 12. Offline, private, free (bars 23 to 26, 1:12 to 1:20)

**Revised 2026-11-10:** bar 23 reads "Works offline." with a small "Ghost mode" tag; the long line about the dictionary is carried by the app's own status pill ("Offline. Using your dictionary.").

| Bar | Picture | Text | Motion | Sound |
|---|---|---|---|---|
| 23 | **Capture**, phone, with the network off. The app's own status pill is in view. Above the frame, our own "no network" icon | "Works offline." Small: "Ghost mode: the dictionary is on your device." | Camera lands on the pill | Whoosh, hit |
| 24 | Type only | "No account." (beat 1) "No cookies." (beat 2) "No ads." (beat 3) "Free." (beat 4) | Each word replaces the last, on the beat. "Free." has the ember block behind it | Four hits with the kick |
| 25 | **Captures.** A phone, then a tablet in landscape (keypad on the right), in plain frames | "Phone. Tablet." | The camera slides from one frame to the next | Whoosh |
| 26 | **Capture.** A laptop-width window with the wide layout | "Laptop. Any modern browser." | Slide, then hold | |

### Scene 13. Ways to type (bars 27 to 31, 1:20 to 1:30)

| Bar | Picture | Text | Motion | Sound |
|---|---|---|---|---|
| 27 | Hero. A fingertip-sized ring taps three keys (beats 1 and 2). Then a row of our own keycaps, 0 to 9, three of them pressed (beats 3 and 4) | "Touch." then "Keyboard." | Cut on beat 3 | Key tones |
| 28 | **Capture**, phone, switch scanning on. The ember ring steps down the rows, one row per beat. Beside the frame: one large plain round button, drawn by us | "One switch." | The ring jumps. On beat 4 the button is pressed | A tick per step; a soft thud for the button |
| 29 | The ring now steps along the keys of the chosen row. The button is pressed again; a letter appears in the card | "The highlight steps. You press." | Same | Same |
| 30 | **Capture**, the Settings sheet at the scan speed setting. The value changes to a slower one. Back on the keypad the ring now steps once every 2 beats | "Your speed." | The drums go to half time for this bar | Half-time fill |
| 31 | **Capture**, Show mode: the sentence "It is good to be back" in big text, then flipped for the person opposite | "Or show it." | Flip on beat 3, as the app does it | Whoosh on the flip |

A scan step of one beat is 0.5 s. The app allows 0.4 to 5 s a step, so this is a real setting.

### Scene 14. Built with Kiro (bars 32 to 34, 1:30 to 1:36)

**Revised 2026-11-10:** the four cards are "Specs." "Steering." "Hooks." "Workflows.", each showing real text from `.kiro/`; these are the Kiro features the Kiro log records as used (rows of 2026-11-10). No property-test or agent claims.

| Bar | Picture | Text | Motion | Sound |
|---|---|---|---|---|
| 32 | Type on night | "Built with Kiro." | Cut | The music opens up: a lift |
| 33 | Four real captures, one per beat, cropped to the content with no third-party logos | "Specs." "Property tests." "Hooks." "Agents." | One card per beat, stacked in depth | One hit per card |
| 34 | The repository's own `.kiro/` folder tree, set in mono | "Open source. MIT." | Hold | |

**This scene shows only what the Kiro log proves.** Each card needs a row in `docs/KIRO_LOG.md` and a capture
in `docs/kiro/evidence/` (that folder does not exist yet on 2026-11-10). Work done before 2026-11-10 was not done
in Kiro (`.kiro/steering/product.md`, "How we work") and must not be shown as Kiro work. If fewer than three
cards have evidence, use the short version: bar 32 only, as a lower third over the end of scene 13, and give
bars 33 and 34 to scene 10.

### Scene 15. Then and now (bars 35 to 38, 1:36 to 1:44)

| Bar | Picture | Text | Motion | Sound |
|---|---|---|---|---|
| 35 | Left: a small television picture from Act 1, with the pixel screen and `hello`. Right: the sentence card with "Hello again". Small labels under each | "then" (pixel type), "now" (brand type). Centre: "Same keys." | The only return of the old look. The inset keeps its stepped motion | The music strips back to a soft pad and the bass |
| 36 | The inset switches off: line, then dot. The dot is pale, then gone. On the right, the card changes to "It is good to be back", digits `48 47 4663 86 23 2225` | "New life." | Collapse as in scene 4, small | A small power-down sweep |
| 37 | Speak is pressed on beat 1. The sentence fills the screen; the words light as they are spoken | **It is good to be back** | Hard cut on beat 1. Still | The music stops dead. **The app's voice: "It is good to be back."** |
| 38 | The sentence stays for 2 beats, then cuts to night | | | Silence, then the five-note motif once, softly: E, D, G, G, A |

### Scene 16. End card (bars 39 to 43, 1:44 to 1:54)

| Bar | Picture | Text | Motion | Sound |
|---|---|---|---|---|
| 39 | Night with the moon glow. The icon, whole, with its ninth key dark | **Ninth Life** | Fade in over 36 frames (600 ms) | One warm chord, held |
| 40 | The ninth key's ember fades in | "Free. Works offline. Runs in your browser." | Key fades in over 54 frames (900 ms) | |
| 40 to 43 | Everything stays still | `[APP_URL]` · "Built with Kiro for Kiroween 2026" · and, in full: "Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment." | No motion for at least 7 s | The chord fades. In the last second: one key tone, E, the ninth key's note |

The intended-purpose sentence is verbatim, at 30 px or larger, and readable for at least 6 s. The film ends on
night `#140a2e`, not black.

---

## If the film runs long or footage is missing

Cut in this order. Each step keeps the bar grid.

1. Scene 14 becomes the short version (saves 4 s, or gives them to scene 10).
2. Scene 3 loses shot 3b (saves 2.4 s; scene 4 starts earlier).
3. Scene 12 shows phone and laptop only (saves 2 s).
4. Scene 9 loses bar 10's hold: bars 10 and 11 merge (saves 2 s).

Never cut: scene 5, the two silences, bar 17, scene 11, the end card's 6 seconds.

## Caption file

Burned-in text already carries the meaning. The uploaded caption file (`.srt`) adds what a viewer cannot hear:

| Time | Caption |
|---|---|
| 0:00 | [An old television switches on. Static.] |
| 0:06 | [Five small beeps, rising] |
| 0:20 | [The television switches off. Silence.] |
| 0:28 | [A beat starts. Key tones, rising] |
| 0:36 | [Music stops] App voice: Hello again. |
| 0:38 | [Music, full] |
| 0:58 | App voice: I need water. |
| 1:40 | [Music stops] App voice: It is good to be back. |
| 1:43 | [Five soft key tones] |
| 1:53 | [One key tone] |
