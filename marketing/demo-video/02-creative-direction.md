# Creative direction

Working title: **"Hello again"**. Written 2026-11-10. Sources for every outside fact are in
[01-research.md](01-research.md). The shot-by-shot plan is in [03-script-storyboard.md](03-script-storyboard.md).

## 1. The idea in one line

A dead keypad says hello again, and this time it says it out loud.

## 2. The story

The category asks for dead technology brought back to solve a problem of today. So the film is not about
nostalgia. Nostalgia is the door; the reason to walk through it is a present need.

1. **We remember it.** Nine keys, one thumb, one press per letter. A whole sentence from a few keys.
2. **It died.** Glass replaced the keys. The keypad went quiet.
3. **Old is not the same as bad.** It had few keys, and they were big. It needed one press per letter. It could
   write with no signal. Nobody stopped needing those things.
4. **It comes back.** One light stays on. It becomes the ninth key.
5. **It has a voice now.** The same keys, the same presses. The app speaks the sentence.
6. **Why it matters.** Some people type to talk, for an afternoon or for good. Typing to talk takes time, and with
   one switch every letter is a wait. Few keys and big keys are exactly what that needs.
7. **Why you can trust it.** Every spoken word matches the keys pressed. A model may rank sentences; it cannot
   put words in anyone's mouth. It works offline, with no account, for free.

Point 3 is the hinge of the film. Each "lesson" from the old keypad is paid off by one feature in Act 2:

| What the old keypad knew (Act 1) | What Ninth Life does with it (Act 2) |
|---|---|
| Few keys | Switch scanning has only 4 rows to step through |
| Big keys | Keys of 72 to 128 px, single taps only |
| One press per letter | The decoder finds the sentence |
| It wrote with no signal | Ghost mode: the dictionary lives on the device |
| It only wrote | Now it speaks, or shows the sentence in big text |

## 3. Three rules that shape everything

1. **No narrator. The only voice in the film is the app's voice.** The film is about a keypad that gets a voice,
   so no human speaks over it. The first spoken words arrive at 0:36, in silence, and they are "Hello again."
   The app speaks three times in total. Everything else is on-screen text, music and sound. The film must make
   full sense with the sound off (the brand is an accessibility brand; this is also the caption strategy).
2. **Noise is the old world. Calm is the brand.** Static, scanlines, flicker and stepped motion exist only in
   Act 1, and they clear at the moment of resurrection. The brand book says "spooky, but calm"; in this film the
   calm *is* the resurrection. After 0:28 the picture is clean. One short callback to the old look is allowed in
   scene 15.
3. **Ember is the life.** There is no ember colour at all in Act 1. The first ember pixel is the dot left by the
   television switching off. From then on there is never more than one ember thing on screen (the brand rule), and it
   is always where the viewer should look.

## 4. Two acts, two looks

| | Act 1: Dead air (0:00 to 0:28) | Act 2: Ninth life (0:28 to 1:54) |
|---|---|---|
| Share of the film | 25% | 75% |
| Feeling | A memory on an old set at night. Quiet, a little eerie, fond | Awake, sure, quick. A product that works |
| Picture | A cathode-ray television picture: static, scanlines, soft focus, vignette. Inside it, one plain keypad phone seen twice, and close-ups of its keys and pixel screen | The brand: night ground, moon panel, plum keys, one ember key. Flat, sharp, deep |
| Colour | Grey static, olive-green pixel screen (`#c7f0d8` light, `#43523d` dark), no ember | `night #140a2e`, `plum #2a1856`, `moon #eee8ff`, `ember #ffb13d` and the semantic tokens |
| Type | Pixel type: Tiny5 on the pixel screen, VT323 for the television's on-screen display (both SIL OFL) | Atkinson Hyperlegible Next ExtraBold for words, Atkinson Hyperlegible Mono for key codes |
| Motion | Stepped. Content moves at 12 frames a second (every 5th frame at 60). Hard cuts through bursts of static. Slow push-ins | Fluid at 60 frames a second. One moving camera over a large flat world. Whip pans, zooms through keys, type on the beat |
| Cut rate | 6 shots in 28 s | About 45 shots in 86 s, with two full stops |
| Sound | Room tone, tube hum, hiss, small square-wave key beeps through a tiny speaker. No music, only a low drone | 120 beats a minute. Drums, bass, a plucked synth. Soft key tones in tune with the music. Two drops to silence for the voice |
| Text | Lower-case, short, slow. At most 6 words a line, at least 1.8 s each | Sentence case, 1 to 5 words a card, on the beat |

The frame rate is part of the contrast. Act 1 is rendered at 60 frames a second like the rest, but its contents
only change every 5th frame, like a slow pixel screen. When Act 2 starts, the picture becomes smooth. Most viewers
will feel that without naming it.

## 5. The "hypermotion" style, defined for this film

"Hypermotion" is a working label, not an established term (see research section 3). Here it means:

- **One camera, one world.** The app's parts (keypad, sentence card, candidate list, proof chips) are laid out
  on one large canvas. The camera flies between them. Scenes change by moving, not by fading.
- **Speed comes from short moves and exact stops, not from shaking.** A move takes 8 to 14 frames and then the
  picture holds still for at least half a second. Nothing drifts while the viewer reads.
- **Type hits the beat.** One idea per card. A word lands on a beat or an eighth note.
- **Match the eye.** Before and after every cut, the ember thing sits at the same place on screen, so the
  viewer's eye never has to search. This is the main cutting rule of Act 2.
- **Two full stops.** A fast film needs places to breathe. Both are the voice: scene 7 and scene 15.
- **Sound for every visible event.** A whoosh that ends in a soft hit for each camera move, a tick only when
  something visibly lands, a key tone for each key press.

### Motion rules for Act 2

| Thing | Rule |
|---|---|
| Camera moves | Position, scale and a small tilt (at most 8 degrees) with perspective. Ease: `cubic-bezier(0.16, 1, 0.3, 1)`. 8 to 14 frames |
| Springs | Critically damped only (`damping: 200`). Nothing bounces or overshoots: the brand forbids bounce, and the app has none |
| The app's own behaviour | Shown as it is. Highlights **jump** with a 120 ms (7 frame) linear colour change. Keys do not squash, wobble or pop |
| A key press | The pressed key shows the ember ring that the website's demo uses (`packages/web/components/site/site.css`, `.site-pressed`). The ring jumps from key to key. While keys are being pressed, Speak is out of frame, so the ring is the only ember thing |
| Kinetic type | Words rise 24 px and fade in over 6 frames, or cut in. No typewriter effect on brand type (the pixel screen in Act 1 may type) |
| Emphasis | Ember is a fill, never text. To stress a word, put an ember block behind it with `on-ember` text. Only one such block at a time, and never while another ember thing is visible |
| Transitions | Whip pan with motion blur in the direction of travel; zoom through a key so its plum fill becomes the next background; a hard cut on the beat. No dissolves between scenes in Act 2, no glitch, no static |
| Depth | A soft moon glow behind the main object (the icon's own radial gradient). No lens flares, no particles, no parallax fog |
| The icon | Never animated, tilted, squashed or built up. It cuts or fades in whole. On the end card its ninth key may fade in last (the website already does this) |

## 6. Halloween without a costume

The brand already owns the night: a night ground, a moon, cat ears, one ember light. The design system chose this
so that it "owns Halloween without a costume". The film keeps to that.

- **Use:** a dark room, moonlight, a television nobody is watching, a signal trying to come through the static,
  a light that will not go out, "ghost mode" (the app's real name for offline decoding), nine lives.
- **The one knowing wink:** in scene 5 a 3 by 3 grid of dots shows faintly in the dark for a moment, as if
  something were trying to come through. It is the old haunted-television idea, played quietly.
- **Do not use:** pumpkins, cartoon ghosts, bats, skulls, cobwebs, blood, dripping type, jump scares, screams,
  a cat with a face, lightning.
- **Never use medical resurrection:** no heart monitor, no flat line, no heartbeat sound, no defibrillator, no
  hospital, no "it's alive" laboratory. The product states a general-purpose intended purpose
  (`.kiro/steering/product.md`), and medical pictures in promotional material work against that. The resurrection
  is a **signal** coming back: "No signal" becomes a picture.

## 7. What Act 1 may show

The hackathon forbids third-party trademarks in the video. The owner decided on 2026-11-10 that a whole phone
may appear if the film needs one, and left the choice to the art direction. The choice: **yes, one phone, in two
shots.**

- **Why.** A whole object says "that time" in one second, where a close-up of keys takes three. And the death in
  scene 4 needs something to happen to: the same phone, in the same place, dark and under dust, is the saddest
  picture in the film and makes the return worth more.
- **Where.** Shot 2a (the phone lit, on a dark table) and shot 4b (the same phone, the same framing, years
  later). Everywhere else Act 1 stays in close-up: keys and the pixel screen.
- **It is our own phone, not anyone's.** A plain rounded body in matte graphite, a small display, and twelve
  identical rounded-square keys in 3 columns and 4 rows, in the proportions of the app's own keypad. Nothing
  else on the front: no navigation key, no call keys, no aerial, no patterned speaker grille, no maker's plate,
  no coloured shell. The keys echo the brand's keys on purpose, so the old keypad and the new one rhyme.
- **It must not pass for a real model.** Image models drift toward the most famous phones of that time. A person
  compares every take with well-known handsets and rejects anything that could be taken for one. If no take
  passes, fall back to close-ups only: the storyboard still works with shot 2a as the keypad macro.
- The keys in generated pictures are **blank**. Letters and digits are drawn on top in the film, so they are
  correct and can light up.
- Everything on the pixel screen is drawn by the film on an 84 by 48 pixel grid. No copied interface, icon set,
  font, game or ringtone of any maker. The key beeps are our own tones.
- No hands or faces in generated pictures.
- The television is a plain dark box seen mostly as a glowing screen. No brand plate, no channel logo.
- The Ninth Life icon never appears on the phone or on its screen.

## 8. Sound direction

Detailed cues are in [04-asset-plan.md](04-asset-plan.md).

- **The key tones are an instrument.** Each key has its own note in A minor pentatonic, so any typed word is a
  small melody that fits the music. "Hello" (4, 3, 5, 5, 6) is E, D, G, G, A: a five-note motif that rises to the
  home note. It is heard three times: thin and square in Act 1, full in scene 7, and once more at the very end.
  The tones are made by us with a script, as the brand book asks ("self-made keypad tones").
- **Act 1** has no music. A low drone, tube hum, hiss and room tone. The silence makes the first beat of Act 2
  land harder.
- **Act 2** is one track at exactly 120 beats a minute, in A minor, so that a beat is 30 frames and a bar is 2
  seconds. It leaves the middle and upper register free for the key tones.
- **The voice gets silence.** In scenes 7 and 15 the music stops dead before the app speaks. In scene 10 the
  music only ducks.
- **Nothing sudden or loud.** No jump-scare stings. Static bursts are short and filtered.

## 9. Safety for viewers

The product serves people who may watch a screen for a long time, and some viewers are sensitive to flashing.
The film follows WCAG 2.3.1 and ITU-R BT.1702 (research section 4):

- Never more than 3 flashes in any second. A flash is a pair of opposite changes in relative luminance of 10% or
  more over more than a quarter of the picture. **Fast cuts between a dark and a bright full frame count.**
- Static is fine grain (noise cells of 2 px or less at 1080p), mid-grey, low contrast (luminance between 0.08 and
  0.35), and changes 12 times a second, not 60.
- A full-frame burst of static lasts at most 0.5 s, and there are at most 2 bursts in any second.
- Scanlines are faint (at most 25% darkening) and never flash or reverse.
- No saturated red anywhere. The proof-reject pink `#ff8fa6` is not a saturated red.
- In Act 2 the large moon panel is the brightest thing. A cut may not go from a mostly-night frame to a
  mostly-moon frame and back within 20 frames.
- The power-off collapse dims over 20 frames; it is not a white flash.
- The render is checked by a script before upload (production guide, section 9).

## 10. The brand book and this film

The owner confirmed on 2026-11-10 that the brand book's motion and video lines ("slow fades", "no licensed
music", "no simulated UI") were written mainly for the app and the website and do not bind this film, and that
generated music, sound effects and voice are fine. So the film is free in how it moves and sounds. What it keeps
from the brand, by choice:

| Kept | How |
|---|---|
| The app is shown truthfully | Highlights jump, nothing bounces. The owner decided on 2026-11-10 that the film is marketing-led: hero shots recreate the app from the design system and may be simplified, enlarged or rearranged, because the app is still in development. They never show a feature the app does not have and keep the app's own words. Real captures of the running app appear in plain device frames in a few shots (scenes 10, 12, 13), so the film also shows the real app working, as the hackathon rules ask |
| One ember thing | Never more than one on screen; a fill, never text |
| The icon | Never animated, tilted, recoloured or put on a phone |
| The palette and the type | Act 2 uses only the tokens and the two Atkinson families |
| The words | Brand voice, no trademarks, no banned claims, the intended-purpose sentence in full |
| Self-made key tones | The brand book asks for them by name; they are also the film's melody |
| Calm | No jump scares, no flashing, static only in Act 1 and within the limits of section 9 |

What changed against the older plan in `docs/submission/VIDEO_SCRIPT.md`: no narrator, 1:54 instead of 2:50,
music, and a 6 s Kiro scene instead of 25 s. Nothing in `design/` or `docs/` has been edited. The brand book's
video line and the Video and social artboard still describe the older plan; a one-line note there would stop the
next reader from being confused.

## 11. Words

All on-screen words follow `.kiro/steering/product.md` and the brand voice: plain, adult, exact, sentence case,
no exclamation marks, digits for numbers.

- Say: "9-key predictive text", "the old phone keypad", "one press per letter", "type to talk".
- Never name a maker or product of old phones or keyboards. `node scripts/tm-lint.mjs` must pass; it
  scans every text file in this folder, including image and music prompts.
- No medical words, no condition names, no speed or accuracy claims, no "AI understands you". The person decides
  what is said; the model only ranks words that match the keys.
- The intended-purpose sentence appears in full on the end card, verbatim, for at least 6 seconds.
