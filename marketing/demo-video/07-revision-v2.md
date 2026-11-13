# Second cut: "Hello again", v2

Written 2026-11-10 by the lead (art direction), after the owner's review of the first cut. This file is the brief
for the second cut. Where it differs from 02 and 03, this file wins. Research behind it:
[research-v2/](research-v2/) (10 Act 1, 11 Act 2 and wow, 12 transitions, 13 story and narration, 14 voice and mix).

## 1. The owner's review (2026-11-10)

- **Act 1.** The phone must look higher quality and real: still generic, but detailed. The typing screen must look
  like a real old phone interface, with signal bars, battery and so on. Add a generated narrator, especially where
  text is on screen and at the end when the screen goes dark and text appears. His voice must differ from the app's.
- **Act 2.**
  - Do not show the tablet layout.
  - Make the outro simpler; there is too much text in its lower part.
  - A narrator voice-over should flow from scene to scene as one continuous story.
  - Show better what problem the app solves, following the path: problem, how we solve it, important features.
- **Research** the two styles, the motion of the important scenes, the transitions and the wow factor (done:
  research-v2).

## 2. Decisions for this cut

| # | Decision | Why |
|---|---|---|
| V1 | **A narrator.** "Frederick Surrey - Smooth and Velvety" (ElevenLabs library voice `j9jfwdrw7BRfcR43Qohk`, British, low), `eleven_v4`. Act 1 is hushed; Act 2 is clear and warm. The app's voice stays "Angela". | The owner asked for one. He sits 9 to 11 semitones under the app's voice and has a different accent, so the two never blur (14). The owner can still swap him: `film/_takes/narrator-tests/compare/narrator-compare.m4a` |
| V2 | **The script is section 3.** About 173 narrator words, plus four lines in the app's voice. Act 2 goes rebirth, then title, problem, solution, proof, offline, access, Kiro, then and now, end. | The owner's path (problem, how, features) runs from the title on; the resurrection stays the first thing Act 2 does (13, Script A) |
| V3 | **The app's last line is "I have something to say."** It replaces "It is good to be back." | It answers Act 1's last line, "It still has something to say." The real decoder puts it first (13) |
| V4 | **Act 1 is one room, one night.** A drawer of forgotten gadgets at 23:59 on Friday 31 October. The phone wakes by itself, types "Hello" with no hand, and its battery dies. The TV is only a bookend. The phone is a real-looking generic bar phone with a 96 x 64 screen and a period status bar. | 10, sections 2, 3 and 6 |
| V5 | **The handover is "Same keys".** Act 2 opens on the old phone's keypad, straight on, with the ember dot as key 9's light. The old keys turn into the app's keys one per eighth note, and the picture's frame rate comes back from 12 to 60. | The resurrection told with the actual keys (12, option A; 11, 4.1). Fallback if the straight-on still fails: 12's "Switched back on" |
| V6 | **Act 2's look is the "lit night studio".** A perspective floor of dots, keys with thickness, a top-left light and ember spill, light sweeps (one per chapter at most), real depth, and hero UI at 50 to 90% of the frame height. | The flatness was mechanical (11, sections 1 and 3.12) |
| V7 | **One grammar, not one camera.** Right means the next item, in means a closer look, out means the real thing, a hard cut on a downbeat starts a chapter, and a shape becoming the next shape means "this becomes that". The ember is the baton. | 12, section 5 |
| V8 | **No tablet anywhere.** Devices shown are a phone and a laptop. | Owner |
| V9 | **The end is two quiet cards.** The lockup first: the icon, "Ninth Life" and the address. Then the closing card: only the intended-purpose sentence, verbatim, for 6 s. "Free. Works offline. Runs in your browser.", the generated-voice note and the Kiro line leave the card. | Owner; product.md requires the sentence on the closing card |
| V10 | **Never "Built with Kiro".** The Kiro chapter says "Made for Kiroween 2026" and shows real `.kiro/` lines. | Decision D15 (`.agents/tasks/marketing-landing/decisions.md`). The first cut broke it twice |
| V11 | **Cut from the film:** Show mode and Flip, "No account / No cookies / No ads", the worn key, the "good / home / gone" cycle, the old TV inset in then and now, and the generated-voice note on screen. The video description carries the disclosures (D2, D8). | Reading time, focus |
| V12 | **Length 1:58** (7,080 frames at 60 fps). Act 1 is 0:00 to 0:28; Act 2 is 45 bars at 120 BPM. | At most 2:00 |
| V13 | **A disciplined spatial look for 0:45 to 1:35** (2026-11-11). The owner called the proof shot "broken". Research `research-v2/15` (design) and `16` (engineering) found: a short virtual lens, a floor that tilted like a ramp, every element at its own angle, clipping, translucency and no shadows. The fix is CSS, not three.js: a long lens (about 5400 px), pitch 0 with a raised horizon, small yaw, `scale3d` zoom, a level floor in its own pass, real thickness, floor shadows and reflections, depth blur instead of opacity, `<Crisp>` text, and motion blur only on whips. s11 became one lock and one key (each code once); s12 a glass "ghost phone" (no dive); s09, s10 and s13 were rebuilt on the same stage. Rules: STYLE.md "Spatial rules" | three.js would have broken the pixel-matched seams and rendered softer text |

## 3. The script

N is the narrator; APP is the app's voice. Times are estimates until the real lines are measured; the timeline
places each line from its measured length (`src/data/narration.json`). Act 2 bar *n* starts at 0:28 + 2 x (*n* - 1)
s. Key words are the only text the narrator gets on screen: an exact excerpt of the spoken line, appearing 0 to 4
frames before the word is spoken.

### Act 1, hushed (0:00 to 0:28)

| Id | About | Speaker | Line | On screen (pixel type, lower case) |
|---|---|---|---|---|
| n01 | 0:01 to 0:05 | N | A ghost story... about a keypad that learned to talk. | The set's own `ch 09`, `no signal` |
| n02 | 0:07.6 to 0:10 | N | Nine keys. One press per letter. | nine keys. one press per letter. |
| n03 | 0:10.4 to 0:12 | N | And the phone worked out the word. | the phone worked out the word. |
| n04 | 0:13.4 to 0:17.8 | N | Then glass replaced the keys... and the keypad went quiet. | then glass replaced the keys. / the keypad went quiet. |
| n05 | 0:19.7 to 0:22.3 | N | But old is not the same as bad. | old is not the same as bad. |
| | 0:22.5 to 0:24.6 | | (text only) | it had few keys. big ones. / it could write with no signal. |
| n06 | 0:24.8 to 0:27.0 | N | It still has something to say. | it still has something to say. |

The narrator is silent from 0:27.0, so the handover lands in silence.

### Act 2, clear and warm (0:28 to 1:58)

| Id | Bars | About | Speaker | Line | Key words |
|---|---|---|---|---|---|
| | 1 to 4 | 0:28 to 0:36 | | (no narration: the rebirth, then "hello again" typed to the key melody) | the digits |
| app | 5 | 0:36.2 | APP | **Hello again.** | the sentence, lit word by word |
| n07 | 6 to 8 | 0:39 to 0:44 | N | This is Ninth Life. The old phone keypad, back as a way to talk. | A way to talk. |
| n08 | 9 to 10 | 0:44.3 to 0:49 | N | Some people type to talk, for an afternoon, or for good. | Type to talk. / small: For an afternoon, or for good. |
| n09 | 11 | 0:49.3 to 0:52 | N | But small keys are hard to hit. | Hard to hit. |
| n10 | 12 to 13 | 0:52.3 to 0:55.5 | N | With one switch, every letter is a wait. | Every letter is a wait. |
| n11 | 14 | 0:56 to 0:57.6 | N | The conversation moves on. | (the other person's bubbles say it) |
| n12 | 15 to 16 | 0:58 to 1:01.8 | N | And a language model can put words in your mouth. | Words in your mouth. |
| | 17 to 18 | 1:02 | | (the fold: silent from 1 beat before to the landing on bar 18) | |
| n13 | 18 to 19 | 1:02.5 to 1:05.5 | N | So, nine big keys. One press per letter. | Nine big keys. / One press per letter. |
| n14 | 20 to 21 | 1:06.5 to 1:09.5 | N | It finds the sentence. You press Speak. | It finds the sentence. |
| app | 22 | 1:10.1 | APP | **I need water.** | the sentence, lit |
| n15 | 24 to 26 | 1:14.3 to 1:19 | N | A language model can help sort the guesses, if you turn it on. | the app's own label: Model ranking (opt-in) |
| n16 | 26 to 27 | 1:19.3 to 1:22 | N | But every word must match your keys. | Every word must match. |
| n17 | 28 to 29 | 1:23 to 1:26.5 | N | So it can never put words in your mouth. | (the struck "wafer" says it) |
| n18 | 30 to 32 | 1:26.8 to 1:31 | N | No signal? It still works. We call it ghost mode. | Works offline. / tag: Ghost mode |
| n19 | 33 to 34 | 1:32.3 to 1:35.3 | N | Use touch, a keyboard, or one switch. | Touch. / Keyboard. / One switch. |
| | 35 to 36 | 1:36 to 1:40 | | (no narration: the music lifts) | Made for Kiroween 2026, then the cards |
| n20 | 37 to 38 | 1:40.5 to 1:42.7 | N | Same keys. A ninth life. | Same keys. / A ninth life. |
| app | 39 | 1:44.2 | APP | **I have something to say.** | the sentence, lit |
| | 40 | 1:46 to 1:48 | | (silence, then the five-note motif) | |
| n21 | 41 to 42 | 1:48.3 to 1:51 | N | Ninth Life. Free, in your browser. | (the lockup) |
| | 43 to 45 | 1:52 to 1:58 | | (quiet: the closing card) | the intended-purpose sentence |

The other person's lines in the problem (on screen, never voiced) are "What do you need?", then "Tea?", then
"I'll get you tea." A plain grey suggestion chip, like no real app's, then offers "I need tea": words nobody
typed. The solution answers the same question with "I need water".

**Threads that make it one story** (13, 3.4):
- `hello` (Act 1) becomes "Hello again."
- "It still has something to say." becomes "I have something to say."
- "it could write with no signal." becomes "No signal? It still works."
- "Words in your mouth" (the problem) becomes "never put words in your mouth" (the proof).
- "What do you need?" becomes "I need water."
- "A ghost story" becomes "ghost mode".
- "Nine keys. One press per letter." (Act 1) becomes "So, nine big keys. One press per letter."

**Narrator rules** (12, 13, 14):
- Never within 1 beat of an app line.
- Silent over the drop bar, the fold, the proof's impact and both end cards.
- Loud transitions (whip, dive, switch-off) only in his pauses; under his words use invisible ones (match cut,
  container transform, push).
- A line may lead its picture by one eighth (15 f).

## 4. Chapters

The bar map. Every chapter starts on a bar line; `src/timeline.ts` holds the numbers.

| Scene | Chapter | Bars / time | Builder |
|---|---|---|---|
| s01 to s05 | Act 1 | 0:00 to 0:28 | Act 1 |
| s06 | Rebirth: same keys | 1 to 2 | Open |
| s07 | Hello again | 3 to 5 | Open |
| s08 | Title | 6 to 8 | Open |
| s09 | The problem, and the fold | 9 to 17 | Problem |
| s10 | The solution: nine keys, the sentence, "I need water" | 18 to 23 | Mid |
| s11 | The proof | 24 to 29 | Mid |
| s12 | No signal: ghost mode | 30 to 32 | Mid |
| s13 | Touch, keyboard, one switch | 33 to 34 | Close |
| s14 | Made for Kiroween | 35 to 36 | Close |
| s15 | Same keys, and "I have something to say" | 37 to 40 | Close |
| s16 | The lockup, then the closing card | 41 to 45 | Close |

### s01 to s05, Act 1 (Act 1 builder)

Follow 10-act1-old-world.md section 6.2 (eight shots, 28 s), with the narration of section 3.
- **Phone and stills.** A generated, generic bar phone (P stills) with the screen and the key lights composited by
  the film: 96 x 64 screen, the status bar, the states of 10 section 3.3, legends drawn in code, a backlight that
  bleeds through the legends.
- **The look.** The CRT is only the bookend: power-on and push through the glass, then pull back out and switch
  off to the dot.
- **Static.** One burst at most after the opening.
- **The hand-off.** The last frames show only the ember dot (28 px, #ffb13d, glow `0 0 24px rgba(255,177,61,0.6)`,
  centred at 960, 540) on night. The black deepens to night while the dot warms. The narrator is silent from 27.0 s.
- **Sound.**
  - The drawer's room tone, the backlight wake, the old key beeps E D G G A, the battery-low beeps and the
    power-down.
  - The hum sinks as the light dies, then glides back up to A (a pre-rendered file) under the end of s05 and stops
    dead 15 to 30 f before 0:28.

### s06, Rebirth: same keys (bars 1 to 2, open builder)

Bar 1:
- **Beat 1.** The dot's glow lights the old phone's keypad, straight on and under dust; the dot is key 9's backlight,
  at the dot's place. Sub hit and the first kick.
- **From beat 2.** Keys 8 and 6 change, then 5, then 7 and 3, then 4 and 2, then 1 (by distance from the ninth),
  one per eighth: each photographed key face dissolves in fine cells into the app's plum key with its moon legend.
  Each change has its rising key tone.
- **Through the first three eighths** the picture moves on Act 1's 12 Hz steps, then 20, 30 and 60: the frame rate
  comes back to life.

Bar 2:
- The bottom row (Back, Space, Next) changes as a group.
- The phone's body fades to night in 12 f, and the moon panel grows from the ninth key.
- The camera pulls back onto the night studio floor, the app's keypad standing on it, key 9 ember: the one ember
  thing.

Fallback if the straight-on still is not usable: 12's option B, "Switched back on".

### s07, Hello again (bars 3 to 5, open builder)

- Keys 4 3 5 5 6, Space, 2 4 2 4 6 on eighths, with the key melody.
- The decoder's guess sits large above the keys (160 to 200 px) and redraws on each press, from `decoded.json`. The
  real "Hell" step stays for one eighth, as a quiet wink.
- Bar 5, beat 1: Speak is pressed, then a hard cut to "Hello again." on night. The music stops dead; the app speaks.
- **The voice made visible:** the spoken word goes to full moon while the rest sit at 35%, and a soft ember pool
  under the spoken word breathes with the voice's loudness (`visualizeAudio`). It is the one ember thing.

### s08, Title (bars 6 to 8, open builder)

- **Bar 6, beat 1 (the drop).** A type match: "Ninth Life" lands on the baseline and cap height "Hello again." had,
  and the icon cuts in whole beside it.
- **The narrator, from bar 6 beat 3.** The key words "A way to talk." follow the spoken words.
- **Bar 8, beat 4: the dive** into the icon's plum centre key, then s09 lands from x1.15. Fix the first cut's moon
  pulse inside the dive (frames 2628 to 2636 there): close the dive window onto the key before the moon gaps grow.

### s09, The problem, and the fold (bars 9 to 17, problem builder)

One world on night, the floor below.
- **The conversation.** The other person's lines, in moon type, left-aligned, about 80 px, drift upward steadily
  (time passing, linear). A new line arrives on the narration: "What do you need?" (bar 9), "Tea?" (bar 14) and
  "I'll get you tea." (bar 14, beat 3).
- **The reply.** The person's reply builds in a field beneath, on a plain grid of 26 small letter cells of our own
  (not anyone's keyboard).
  - n09: a fingertip ring reaches for a small cell and misses its neighbour (a wrong letter, then a deletion).
  - n10: one switch. The ember highlight steps one cell per beat across the grid, with a tick per step.
  - n11: "What do you need?" drifts out of the top of the frame before the reply has three letters.
- **The suggestion (n12).** A plain grey suggestion chip offers "I need tea", writing words nobody typed into the
  reply field.
- **The fold** (one beat before bar 18, landing exactly on bar 18 beat 1). The 26 cells lift in depth and fly into
  the 9 keys of s10's first frame (letters regroup by key, one frame apart per key). The cell under the highlight
  carries the ember into its key. A reverse swell peaks on the landing; the groove returns on it; no whoosh. The
  landing layout is the contract in section 6.

No numbers, no comparison, no "faster", no "fewer presses" (KSR is near 0 in RESULTS.md). The grey chip must look
like no real app.

### s10, The solution (bars 18 to 23, mid builder)

- **Bar 18.** The keypad large (keys about 190 px, 85% of the frame height), turned `rotateY(-10deg)`, standing on
  the floor. The app's "They said" line shows "What do you need?" (the app's real They said slot, recreated). n13
  "So, nine big keys. One press per letter."
- **Bars 19 to 21: the lattice behind the keys** (11, 4.3A). Keys 4, Space, 6333, Space, 92837 on eighths. Each
  press sinks its key 6 px, the code builds in mono, and the open word redraws with the decoder's real guess. On each
  Space the word locks into a slot and the other words with the same keys peel back behind it in depth. After
  92837, "wave" becomes "water" on the last press (a 2 f hold). The camera flies along the slots, the chosen path
  lights, the lattice collapses into the sentence card, and the top sentences rise with the ember selection ring.
  n14 over bars 20 to 21.
- **Bar 22: Speak, then "I need water."** Speak is large and ember. It is pressed on beat 1 with a 3 f hold; the
  app speaks, the music ducks, and the voice is made visible as in s07.
- **Bar 23: the pull-back to the real phone.** A 3D turn of 12 to 16 degrees that settles to 6 or less, the real
  capture in a phone frame of our own. A breath.

### s11, The proof (bars 24 to 29, mid builder)

"Lock and key" (11, 4.4A):
- Zoom into "water"; the chip forms: check, water, 92837.
- The "Model ranking (opt-in)" card slides in offering "wafer" during n15. Its code, 9 2 3 3 7, is cut into its
  bottom edge like a key's teeth; the keys pressed for "water" (9 2 8 3 7) are the lock.
- n16. The columns meet one per eighth: 9 fits, 2 fits, 3 against 8 does not.
- **The impact** (narrator silent): a 3 f hold, the column outlined in the reject style (x icon, dashed border, not
  colour alone), a low soft "no", the card pushed back and darkened. The strike draws in over 7 f, and the app's
  own sentence appears small as UI text.
- n17 after the impact. "water" keeps its check, with one low light sweep.

### s12, No signal: ghost mode (bars 30 to 32, mid builder)

- **Container transform:** the "water" chip becomes the phone's status pill, and the camera pulls back to the phone.
- **The signal callback:** beside the phone our own signal icon loses its bars one per beat, in the brand style
  (Act 1's bars, now moon), and the pill reads the app's real offline copy. The music thins to a pad.
- **The dive** through the phone's night glass (14 to 16 f, plum or night fill only): inside, the dictionary as
  thousands of faint words in three depths, drifting. Keys pressed in a translucent keypad plane brighten their
  matches, which fly forward into the sentence. The music returns as the sentence forms.
- The tag "Ghost mode" (the app's own name) on the spoken words.
- **Truth:** never "nothing leaves your device" (model ranking sends data when on); "works offline" is allowed.

### s13, Touch, keyboard, one switch (bars 33 to 34, close builder)

Three quick framings, the camera moving right, each landing on the narrator's word:
- **Touch.** The phone; a fingertip ring taps keys.
- **Keyboard.** A laptop with the app (the real laptop capture), and a row of keycaps of our own pressed 4, 6, 7.
- **One switch.** A plain round switch of our own (a plum dome, lit top left, a moon rim), with the keypad and the
  ember scan ring. The ring steps one row per beat on the kick, the switch is pressed, the row locks, then the key.

No tablet.

### s14, Made for Kiroween (bars 35 to 36, close builder)

- "Made for Kiroween 2026" on the downbeat with the music's lift.
- Then four glass cards in depth, one per beat: Spec, Steering, Hook, Workflow. Each holds one real excerpt in mono,
  36 px or more, with at least 1.5 s per card, checked by `components/close/verify-kiro.ts`.
- The only allowed claims are those in D15 and `docs/KIRO_LOG.md`. A short true subline is allowed, e.g. "Specs,
  steering and hooks, in Kiro." Never "Built with Kiro".
- No narration.

### s15, Same keys, and "I have something to say" (bars 37 to 40, close builder)

- **Bars 37 to 38.** Left: the old phone from Act 1 (a still), its screen showing `Hello`. Right: the app's card with
  "Hello again" and its codes. n20, with the key words "Same keys." and "A ninth life."; left is the past, as before.
- **Bar 38, beat 3.** The old screen switches off, and the card changes to "I have something to say" with the codes
  4 4283 766384464 86 729 (from the decoder). Speak rises under it as the one ember thing.
- **Bar 39, beat 1.** Speak is pressed, then a hard cut to the sentence on night. The music stops dead; the app
  speaks, the voice made visible.
- **Bar 40.** The sentence holds 2 beats, then night. Four notes of the motif play on eighths; the fifth lands on
  s16's first frame.

### s16, The lockup, then the closing card (bars 41 to 45, close builder)

- **Bars 41 to 42: the lockup.**
  - The icon and "Ninth Life" fade in whole over 36 f; the ninth key's ember fades in last, at the place where Speak
    was pressed.
  - The address on one line under it: `APP_URL`, or "Link in the description" while it is null.
  - n21 "Ninth Life. Free, in your browser."
  - Nothing else.
- **Bars 43 to 45: the closing card.**
  - The lockup fades out over 24 f and the intended-purpose sentence fades in alone, centred, moon on night, 40 px,
    for 6 s. It is verbatim `INTENDED_PURPOSE` from config.ts.
  - The music's tail and silence; no narration. The film ends on this card.

## 5. Sound

- **The narrator.**
  - One file per line, at the narrator target, 2 LU under the app's voice.
  - The music dips about 15 dB under him: drums 18 dB and the rest 12 dB when stems are used (14, 4.1).
  - Effects key off him by a couple of dB.
  - Whooshes only in his pauses; under his words a move gets a quiet tick on landing.
- **The music, v2.** One new 90 s track at 120 BPM, bar 1 at 0:28, built to the bar map:
  - bars 1 to 4: build;
  - bar 5: stop;
  - bar 6: the drop;
  - bars 9 to 17: a thinned, darker pulse;
  - bar 18: the groove returns on the fold;
  - bar 22: ducked;
  - bars 24 to 29: focused, with 2 beats out at the impact;
  - bar 30: thins to a pad, returning on bar 31 or 32;
  - bars 33 to 34: the kick as the scan clock;
  - bars 35 to 36: the lift;
  - bars 37 to 38: a strip-back;
  - bars 39 to 40: stop and the motif;
  - bars 41 to 45: the end chord and its tail.
  It is generated with stems if possible.
- **Mutes and ducks.** Hard mutes for the app's lines at bars 5 and 39; a duck at bar 22.
- **New effects.** The hum glide (pre-rendered), the battery-low beeps, the backlight wake, the bubble arrivals
  (soft ticks), the switch press, a quiet shimmer for the dictionary, and the signal ticks.
- **Captions.** Captions name the speaker ("Narrator:" and "App voice:") and describe the sounds.

## 6. Contracts between builders

| Hand-off | Frame | What must match |
|---|---|---|
| s05 to s06 | 1680 (0:28) | The ember dot, 28 px, at (960, 540), on night; s06 reveals the old keypad around it with key 9's light at that point |
| s08 to s09 | bar 9 | The dive ends on plum; s09 lands from x1.15 on night |
| s09 to s10 | bar 18, beat 1 | The fold lands on s10's first-frame keypad: `FOLD_LANDING` in `src/components/handoff.ts` (keypad centre, key size, turn), owned by the mid builder, read by the problem builder |
| s10 to s11 | bar 24 | s11 starts on s10's last frame, the real phone (world units shared, as in the first cut) |
| s11 to s12 | bar 30 | The water chip becomes the status pill (container transform) |
| s12 to s13 | bar 33 | A hard cut on the downbeat, or the ember baton (the ember scan ring starts where the last ember thing was) |
| s15 to s16 | bar 41 | The icon's ember key fades in where Speak was pressed |

Every chapter change: the last ember thing and the next one sit within 8 px of each other, or one visibly becomes the
other (12, 5.2). Run the ember tracker (12, appendix A) on the render.

## 7. Production

| Who | What |
|---|---|
| Lead | Timeline, shared parts (night studio floor, keys with depth and light, sweeps, ember pool, narration playback and ducking, key-word timing helpers), STYLE.md, captions, integration, checks, render |
| Sound | Narration, the app's new line and levels, music v2 with stems, new effects, mix values |
| Act 1 | Stills (gpt-image-2.6), the Act 1 rebuild |
| Open | s06 to s08 |
| Problem | s09 |
| Mid | s10 to s12 |
| Close | s13 to s16 |

Checks before the render:
- the decoder data (build-data);
- tsc;
- tm-lint;
- verify-kiro;
- the flash check;
- loudness;
- the ember tracker;
- frame sheets of every chapter at full and quarter size (text must read in a 640 px player).

Checks a person must still do:
- listen (the narrator, the music, every app line);
- confirm the generated phone resembles no real model;
- set `APP_URL`.

## 8. Upload text (draft)

For YouTube and the Devpost form. Paste it, then fill the address. Decision D8 (README) is still open: the
tool names below (ElevenLabs, OpenAI, Remotion) are not on the "Fine to name" list in
`.kiro/steering/trademarks.md`. Add them there if the owner agrees; otherwise replace them with "generated
voices, music and pictures".

> **Ninth Life: Hello again**
>
> Ninth Life brings back the old phone keypad as a free web app for typing to talk. Press keys 2 to 9, one
> press per letter, and Ninth Life finds the sentence and speaks it. Every spoken word matches the keys you
> pressed. It works offline, in your browser, with touch, a keyboard or a single switch.
>
> Try it: <address>
> Code: https://github.com/razvanstatescu/Ninth-Life
>
> Made for Kiroween 2026.
>
> Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not
> intended to diagnose, treat or replace a clinical AAC assessment.
>
> About this film:
> - The narrator, the app's voice, the music and the sound effects were generated with ElevenLabs. In the
>   app, the voice comes from your device.
> - The phone in the first act was generated with an OpenAI image model; it shows no real phone.
> - Made in Remotion.
> - The dictionary words on screen come from Ninth Life's offline dictionary, built from wordfreq 3.1.1 by
>   Robyn Speer, CC BY-SA 4.0 (see data/NOTICE.md in the repository).

Captions: upload `film/out/ninth-life-hello-again.srt`. They name the speaker ("Narrator:", "App voice:") and
describe the sounds.
