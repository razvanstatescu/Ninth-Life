# Act 1, the old world: research and build spec

Research v2, field 10. Written 2026-11-10 for the second cut of "Hello again".
It answers the owner's review of Act 1: a more real, more detailed phone (still generic), a screen that looks like a
real old phone's interface, a narrator in a different voice from the app's, and more "wow".

Read it with [02-creative-direction.md](../02-creative-direction.md) (the rules),
[03-script-storyboard.md](../03-script-storyboard.md), [film/STYLE.md](../film/STYLE.md) (the hand-off contract) and
the sibling research in this folder: `12-transitions.md` (Act 1 transitions and the Act 1 to Act 2 handover; this
file follows its narrator timing rule) and `14-narrator-tools/` (ElevenLabs tooling).

Conventions. 60 fps. Times are film seconds; frames are absolute (Act 1 is frames 0 to 1679). "Inferred" marks my
own reasoning, not a source. No phone maker or model is named anywhere in this file; where a source page names one,
it is linked and described in words.

Files written with this note:

- [10-act1-lcd-states.png](10-act1-lcd-states.png): a mock-up of the recommended 96 x 64 screen in every state of
  the act, rendered from the real fonts on the real pixel grid (research only, not film code).
- [10-act1-phone-front.svg](10-act1-phone-front.svg): the front view of our generic phone in millimetres. Clean line
  art on purpose: it is also the guide drawing for the first image edit (section 4.3).

## 0. The short version

1. **The phone reads as fake because it was designed to have nothing on it.** The brief removed the earpiece, soft
   keys, navigation key, call keys and microphone (02, section 7), and the flat grey guide image pushed the image
   model toward a moulded toy. A plain rounded slab with a window and twelve square keys reads as a calculator or a
   remote. Give it the anatomy every keypad phone of 2002 to 2006 shared, and avoid only the features that belong to
   particular makers (section 2.7).
2. **Proportions from data:** bar-shaped monochrome phones announced 2002 to 2006 had a median size of about
   103 to 106 x 45 x 20 mm and weighed about 97 g. Our phone: 106 x 46 x 19 mm, dimensioned in the SVG.
3. **A real screen:** 96 x 64 pixels (the most common resolution among monochrome phones that list one), 3:2, with a
   status row (signal, input mode, predictive sign, character counter, battery), a three-line editor and two
   soft-key labels. The pixel-exact layout is in section 3.2; the states after each press of 4, 3, 5, 5, 6 are
   "I", "He", "Gel", "Hell", "Hello", the same as the real decoder.
4. **Render it like an STN LCD, not an LED sign:** pixels fill about 94% of the pitch (the current film uses 86%),
   contrast about 5:1, slow response (pixels darken in about 150 ms and clear in about 200 ms), faint parallax
   shadows, an uneven edge-lit backlight, and glass, dust and halation on top.
5. **Make the stills from one dimensioned design,** not from a flat guide: a line drawing turned into a photograph,
   then every other still as a reference edit of that master. Keys blank, legends composited. Find the screen
   corners and key centres afterwards from lit-minus-unlit difference images, and composite with Remotion's
   `cornerPin` effect.
6. **One room, one night.** A drawer of forgotten gadgets on Halloween night. The old phone wakes by itself
   (23:59, Fri 31 Oct, no network), types "Hello" with no hand on it, its battery dies, the keypad goes quiet. The
   tube television stays only as bookends: we push through its glass at the start and pull back out at the end,
   where it switches off to the dot. The phone shots are clean, full-frame and photoreal.
7. **Narrator:** 41 words in 28 s, five lines, a lower, older, warmer voice than the app's. It stops by frame 1620
   so the drop into Act 2 lands in silence.
8. **Halloween without a costume:** the date on the idle screen, the ghost typing, a real analog-TV "ghost" on the
   picture as it locks, a stopped watch at midnight, moonlight, dust. No pumpkins, cobwebs or jump scares.

## 1. Why the current Act 1 reads as fake

I read `public/img/img-01` to `img-07`, the act's components (`PixelScreen.tsx`, `Keypad.tsx`, `Plate.tsx`,
`TubePicture.tsx`, `shots.tsx`, `layout.ts`), `src/data/plates.json`, `manifest/images.json`, the scenes S01 to S05,
and extracted frames 0 to 1680 from `out/ninth-life-hello-again.mp4`. The lead's read (the screen too wide and
flat-filled, no status bar, the keypad a separate inset, the whole-phone shots small and murky) is right on all four
counts; the table adds six more.

| # | Problem | Evidence | Fix |
|---|---|---|---|
| 1 | The phone has no phone anatomy | IMG-06 and IMG-07: a rounded slab, a window, twelve square keys. No earpiece, soft keys, navigation key, call keys, microphone or cover seam. That was the brief (02, section 7; 04, IMG-06 prompt "Nothing else on the front") | Sections 2.6, 2.7 |
| 2 | The guide image made it a toy | `scripts/images/guides.py` sends a flat grey rounded rectangle and twelve grey squares; the model followed it literally, as a moulded object | Section 4.3 |
| 3 | Keys glow only at their edges | IMG-01: light leaks around each key, but nothing shines through it. Backlit phone keys light their legends: the paint is laser-etched so "only the legends" light ([Nelson-Miller](https://nelson-miller.com/how-laser-etching-is-performed-on-silicone-rubber-keypads)) | Section 2.4 |
| 4 | Key legends are a terminal font with the app's words | `Keypad.tsx` draws VT323 "back", "space", "next". Physical legends were printed or etched sans figures, and those three words are the app's labels | Sections 2.4, 3.6 |
| 5 | The screen close-up is a 2.4:1 strip | `plates.json` gives IMG-04's display as 1910 x 795 px (2.40:1). The prompt asked for 7:4 twice and the model ignored it (manifest note). Phone screens of the time were about 1.25:1 to 1.75:1 (from the resolutions in section 2.3, square pixels assumed) | Section 3.2 |
| 6 | The screen has no phone interface | A mint ground, a word, a floating "43556" at top centre. No signal or battery, no input mode, no counter, no soft keys. A phone never showed the digits pressed; that is the app's feature | Section 3 |
| 7 | The pixels read as an LED sign | `PixelScreen` draws each dot at 0.86 of the pitch (14% gaps) and doubles Tiny5 into 2 x 2 blocks. An STN module drawing shows 0.45 mm dots with 0.03 mm gaps, about 6% ([datasheet](https://focuslcds.com/wp-content/uploads/Specs/G12864G-FTY-LW653_Spec.pdf), p. 3) | Section 3.5 |
| 8 | The keypad is a picture-in-picture | `ScreenShot` places IMG-01 in an inset with a 4 px black border over the screen: an editing graphic, not part of a phone | Section 6 |
| 9 | Small and murky | In shot 2a the plate is scaled 0.731, so the phone is about 351 x 760 px of the 1920 x 1080 frame and its display about 268 x 150 px. Measured luma of frames at 4.8 s and 19.5 s: mean 32 and 33 of 255, 95th percentile 77 and 67, top 0.5% 225 and 105. Almost the whole picture sits in one dark band; the tube layer then adds 0.7 px blur, colour fringe, 20% scanlines, a 0.6 vignette and 12% static | Sections 5, 6 |
| 10 | Nothing behaves physically | Lights switch instantly, the lit screen lights nothing around it, keys never move, the screen never lags | Sections 3.5, 6 |

What works and should stay: the worn-key macro (IMG-03) has real material detail; the tube's switch-on and
switch-off, the 12 Hz stepped grid and the dot hand-off are strong (`12-transitions.md` agrees).

## 2. Anatomy of a generic candybar keypad phone, about 2000 to 2006

### 2.1 Proportions

Source: a public CSV scrape of one phone-spec database ([foykes/gsm-arena-dataset](https://github.com/foykes/gsm-arena-dataset),
10,592 rows; an older scrape made with [arwinneil/phone-dataset](https://github.com/arwinneil/phone-dataset),
copied in [this repository](https://github.com/TheOX7/Handphone-SAW-Algorithm-Streamlit), gave the same figures).
I kept rows whose display type says monochrome and whose announcement year is 1999 to 2006 (259 phones), and
called a phone bar-shaped when its length is at least twice its width, which drops most folding phones. This is
second-hand and incomplete for that era: use it as ranges.

| Announced | Bar-shaped phones | Length, mm: median (middle half) | Width | Thickness |
|---|---|---|---|---|
| 1999 to 2001 | 145 | 116 (109 to 130) | 46 (45 to 50) | 22 (18.5 to 24) |
| 2002 to 2003 | 47 | 106 (101 to 107) | 45 (44 to 46) | 20 (20 to 21) |
| 2004 to 2006 | 25 | 103 (101 to 105) | 45 (44 to 45.7) | 19.7 (17 to 21) |
| All | 217 | 109 (105 to 120) | 46 (44 to 49) | 21 (18.7 to 23) |

Median weight 97 g (middle half 84 to 120 g). Keys: a 2010 ergonomics study of thumb use on small phones tested
key pitches of 7, 8 and 9 mm vertically and 10, 11 and 12 mm horizontally, on bodies 38 to 44 mm wide
([Journal of Human Ergology 39(2)](https://www.jstage.jst.go.jp/article/jhe/39/2/39_133/_article/-char/en)).

### 2.2 Materials and finishes

- Housing: painted ABS and polycarbonate; one museum record of a keypad phone of about 2000 to 2003 lists "ABS and
  polycarbonate", a polyamide casing and an acrylic (PMMA) screen window
  ([MoDiP](https://www.modip.ac.uk/artefact/aibdc-005286)).
- Window: clear acrylic or polycarbonate, which "typically suffer from poor abrasion resistance", hence hard
  coatings ([patent US 9,477,346](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9477346)). In
  practice: fine scratches and swirl marks are the most truthful wear.
- Keys: silicone rubber, painted and laser-etched so the legends let light through
  ([Nelson-Miller](https://nelson-miller.com/how-laser-etching-is-performed-on-silicone-rubber-keypads)).
- For this film (inferred): a satin pewter-grey metallic front, a charcoal back and charcoal keys. A mid-grey
  metallic catches moonlight along every edge, which fixes the tonal range; the current graphite disappears into
  the dark.

### 2.3 The screen window and the monochrome LCD

**Resolutions.** Of the 165 monochrome phones from 1999 to 2006 in the scrape that list a resolution:

| Resolution | Phones | Note |
|---|---|---|
| 96 x 64 | 36 | the most common |
| 101 x 64 | 13 | |
| 101 x 80 | 12 | |
| 96 x 65 | 11 | a 2003 driver datasheet is titled "65 x 96 pixels matrix LCD driver", for "telecom equipment" ([copy](https://hobbielektronika.hu/forum/getfile.php?id=216142)) |
| 98 x 64, 112 x 64, 128 x 64 | 8 each | |
| 84 x 48 | 1 | a 1999 controller datasheet: "48 x 84 pixels matrix LCD controller/driver" for "telecommunications equipment" ([PDF](https://cdn-shop.adafruit.com/datasheets/pcd8544.pdf)). Common in the late 1990s, but the scrape lists most such phones by text lines, not pixels |
| 128 x 128 | 2 | rare in monochrome; inferred: it became a common colour size |

The scrape gives "5 lines" of text most often (66 phones), then 4 (28) and 6 (24).

**Pitch.** An 84 x 48 module of that kind is "about 1.5 inch diagonal" ([Adafruit](https://www.adafruit.com/product/338)),
so its pitch is about 0.39 mm (computed: 38.1 mm diagonal at 1.75:1 is 33.1 x 18.9 mm). I found no datasheet for a
96 x 64 phone panel; at a typical active area of about 29 x 19 mm the pitch is about 0.30 mm (inferred).

**Panel and colour.** STN panels show "a yellow-green or blue cast"; film-compensated FSTN gives a neutral black and
white ([Orient Display](https://www.orientdisplay.com/?p=23053)). A typical module of this type is "FSTN, positive,
transflective" with an edge-lit yellow-green LED backlight
([datasheet](https://focuslcds.com/wp-content/uploads/Specs/G12864G-FTY-LW653_Spec.pdf), p. 3). Positive means dark
pixels on a light ground. Transflective means it reflects room light and is also lit from behind.

**Contrast and speed.** The same datasheet gives a contrast ratio of 5 typical (3 minimum), and response times at
25 °C of 150 ms typical (250 max) to switch a pixel on and 200 ms typical (300 max) to switch it off (p. 5). That
slowness is the visible "ghosting": a changed word fades through for a few frames.

**Pixel grid.** The same drawing: dots 0.45 mm square with 0.03 mm gaps. The grid is a fine dark mesh, not a field
of separate dots. Unlit pixels are faintly visible against the ground.

**Shadow pixels.** In a reflective black-and-white LCD the light passes different pixels on its way in and out, so
"a shadow is generated in the display ... This phenomenon is called parallax"
([US 6,906,767](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6906767), priority 1999). Viewed
at a slant "the image is duplicated on the screen"; with a 0.33 mm pixel pitch, a rear substrate of 0.8 mm or more
gave "a large parallax", below 0.6 mm none worth noting
([US 7,787,078](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7787078), priority 2004). So: a soft
offset shadow under every dark pixel, strongest when the screen is lit by room light from one side (moonlight),
weak when the backlight dominates.

**In a dark room** (inferred from the above and from how a camera exposes for a dim room): the lit ground clips
toward its lightest value and blooms softly onto the black border; the backlight is brighter near its LED edge;
the screen is the key light of the scene, washing the top keys in green and pooling green on nearby surfaces; dust
and scratches on the lens catch that light; when the backlight dies, the screen falls to a dim olive grey lit only
by the moon, and the last image can stay faintly visible for a moment.

### 2.4 The keypad

- **Layout.** Twelve keys in a 3 x 4 grid with letters per ITU-T E.161
  ([ITU](https://www.itu.int/rec/T-REC-E.161)): 2 abc, 3 def, 4 ghi, 5 jkl, 6 mno, 7 pqrs, 8 tuv, 9 wxyz.
  Assignment of characters to the 12 keys is standardised in ETSI ES 202 130, which puts the list of special
  characters, starting with space, on one entry key, "Key 1 recommended" (Table 118,
  [ETSI ES 202 130 V2.1.2](https://www.etsi.org/deliver/etsi_es/202100_202199/202130/02.01.02_60/es_202130v020102p.pdf)).
  Many phones put space on 0; ours does, which also rhymes with the app.
- **Above the grid:** two soft keys, a four-way navigation key with a centre button, and call and end keys. ETSI's
  2004 guide talks about "send and end functionality on hard or soft keys" and soft keys generally (R 9.5.g,
  [ETSI EG 202 132](https://www.etsi.org/deliver/etsi_eg/202100_202199/202132/01.01.01_50/eg_202132v010101m.pdf)).
- **How the light gets through.** LEDs sit in or beside the translucent elastomeric keypad, sometimes
  side-emitting into a light guide, and the light "is diffused into the translucent keypad ... and dispersed"
  ([US 5,708,428](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5708428), filed 1996). The top
  paint is laser-etched away to light "only the legends"
  ([Nelson-Miller](https://nelson-miller.com/how-laser-etching-is-performed-on-silicone-rubber-keypads)). So a lit
  keypad shows: bright legends, a thinner leak around key edges, and hot spots near the few LEDs (inferred: about
  plus or minus 25%).
- **Legend style (our design):** on a wide key, the digit at the left about 3 mm tall, the letters at the right
  about 1.6 mm tall, in a plain straight-sided sans such as Barlow Semi Condensed (OFL,
  [Fontsource](https://fontsource.org/fonts/barlow-semi-condensed)). Never a pixel font on a physical key.

### 2.5 Wear (our direction)

The most-used keys polished smooth and glossy in a thumb-shaped patch, their legend paint thinned there; hairline
swirls and a few deep scratches on the lens; paint worn through on the corners; grime in the seams; lint in the
earpiece slot; in the drawer, a fine even layer of dust that the lit screen makes glow.

### 2.6 Our phone, dimensioned

All in mm, origin at the top-left of the front face. The SVG draws exactly this.

| Part | Position and size |
|---|---|
| Body | 46 wide, 106 tall, 19 thick; front corners radius 8; rounded side edges; smooth top, no aerial |
| Earpiece slot | 10 x 1.2, centred at (23, 6.5) |
| Acrylic lens | x 4 to 42, y 9.5 to 38.5, radius 3 |
| Display window (inside the black print) | x 6 to 40, y 11 to 37 (34 x 26), radius 1.5 |
| LCD active area | 28.8 x 19.2 (96 x 64 at 0.30), x 8.6 to 37.4, y 13.6 to 32.8; the wider unlit LCD margin is at the bottom, where the driver sits (inferred) |
| Soft keys | 10 x 4.5 pills centred at (9, 42.5) and (37, 42.5) |
| Navigation key | circle diameter 14 centred at (23, 46); centre button diameter 6 |
| Call keys | 10 x 5 pills centred at (9, 50) and (37, 50) |
| Keys | 12.5 x 6.5, radius 2.5; columns at x 9, 23, 37 (pitch 14); rows at y 60.5, 69, 77.5, 86 (pitch 8.5) |
| Microphone | hole diameter 0.9 at (23, 99) |

### 2.7 Keep it generic: what to avoid

Every keypad phone shared the parts above, so they are safe. What makes a phone recognisable is a maker's
signature. The list below is from my memory of the period and was not checked against sources (no source could be
cited without naming the makers). A person still compares every take with well-known handsets, as
04-asset-plan already requires. ETSI's 2004 guide supports the general point: many core functions "are represented
by brand-specific symbols" and makers had "different keypad assignments"
([ETSI EG 202 132](https://www.etsi.org/deliver/etsi_eg/202100_202199/202132/01.01.01_50/eg_202132v010101m.pdf), 7.2.1, 9.3).

| Avoid (signature of one maker or model) | Use instead (shared by many) |
|---|---|
| One wide soft key centred under the screen with a separate clear key | Two soft keys, left and right |
| Idle screen with tall bar meters running down the left and right edges | A horizontal status row at the top |
| A start-up animation of two hands; any hand graphic | No start-up animation |
| A snake game, a famous ringtone, a Morse-like message alert | Our own five-note motif and beeps |
| Curved "smiling" key rows, teardrop or crescent keys, a joystick, a side jog dial, sliders, swivels, flips | A straight 3 x 4 grid of identical wide keys on a bar body |
| Patterned or coloured exchangeable covers, translucent "ice" shells | One satin metallic grey, a charcoal back |
| A stub aerial at a top corner | A smooth top (internal aerial) |
| Hourglass waists, oval screens, curved "banana" bodies | A plain rounded rectangle, 106 x 46 x 19 |
| A firmware font, or a fan-made copy of one | The OFL fonts in section 3.6 |
| Copied status or menu icons | Our own icons, drawn on the grid (section 3.2) |

## 3. The monochrome phone interface

### 3.1 What the screens had

- **Status:** signal strength and battery charge are standard indicators; ETSI lists "signal strength indication"
  and "battery status indication (e.g. low and full)" and asks that a low battery be "clearly visible" and also
  "signalled audibly" ([ETSI EG 202 132](https://www.etsi.org/deliver/etsi_eg/202100_202199/202132/01.01.01_50/eg_202132v010101m.pdf), 9.2, table 5).
- **Input mode:** "The status for text input (predictive/non-predictive, capitals, numeric input) should be displayed
  on the screen either permanently or for a short period after a change of input mode" (R 9.3.i, same guide).
  Common forms: "abc", "Abc" (first letter capital), "ABC", "123", plus a sign that prediction is on.
- **Character counter:** one message holds "160 7-bit ... characters" (140 bytes), 153 per part when split
  ([Wikipedia: SMS](https://en.wikipedia.org/wiki/SMS)), so editors counted down from 160 (the exact display form
  varied; ours is a plain number).
- **The word in progress:** the 1995 patent behind 9-key prediction places "a highlighted copy of this word ...
  provisionally in the text output window", with the most frequent word first by default
  ([US 5,818,437](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5818437)). The display "updates as
  each keypress is entered", and a "next" key steps through other words for the same keys
  ([Wikipedia: Predictive text](https://en.wikipedia.org/wiki/Predictive_text)). We underline the word in progress:
  in the mock-up an underline reads better than inverse video at this size.
- **Soft keys** carried context labels such as Options, Clear, Back, Menu.
- **Symbols were not standard**, so every icon on our screen is our own drawing.

### 3.2 The recommended screen: 96 x 64, pixel by pixel

Coordinates are LCD pixels, x 0 to 95, y 0 to 63, origin top-left. Small text is Tiny5 at 8 px (5 px capitals);
when drawn at origin y, its capitals fill rows y + 2 to y + 6 and its descenders row y + 7. Large text is Departure
Mono at 11 px (8 px capitals), drawn twice 1 px apart for a bold stem (old bitmap bolding); at origin y its
capitals fill rows y + 3 to y + 10 and its descenders rows y + 11 to y + 12. All checked in
[10-act1-lcd-states.png](10-act1-lcd-states.png).

| Element | Pixels | Drawing |
|---|---|---|
| Aerial sign | 5 x 7 at (0, 0): row 0 x 0 to 4; row 1 x 1 and 3; column x 2, rows 1 to 6 | our own |
| Signal bars | 4 bars, 2 px wide, at x 6, 9, 12, 15; heights 2, 3, 5, 7; bottoms on row 6. No signal: only each bar's 2 x 1 base | our own |
| Input mode | "Abc", small text, origin (19, -1): capitals rows 1 to 5, ink x 19 to 30 | Tiny5 |
| Predictive sign | 5 x 5 at (33, 1): a 3 x 3 grid of single dots (it rhymes with the act's 3 x 3 wink) | our own |
| Counter | small text right-aligned to x 80, origin y -1 ("160" is x 70 to 80) | Tiny5 |
| Battery | outline 11 x 7 at x 83 to 93, y 0 to 6; tip x 94, y 2 to 4; bars 2 x 3 at x 85, 88, 91, y 2 to 4. Low: 1 bar. Empty: 0 bars, blinking at 2 Hz | our own |
| Header rule | every second pixel of row 8 | |
| Editor lines | large text at x 1, origins y 8, 21, 34 (capitals on rows 11 to 18, 24 to 31, 37 to 44); 7 px a character, 13 characters a line | Departure Mono, bold |
| Word in progress | 1 px underline on row 21 (line 1) under the word's ink | |
| Cursor | 1 x 11 at one pixel after the text, rows 10 to 20; 1 Hz blink (500 ms on, 500 ms off) | |
| Left soft key | "Options" at origin (1, 56): capitals rows 58 to 62, descender row 63 | Tiny5 |
| Right soft key | "Clear" right-aligned to x 94 (or "Back" while the message is empty) | Tiny5 |

### 3.3 The screen after each press

The phone is in "Abc" mode, so the first letter is a capital, as the app's sentence case. The words are the real
decoder's (`src/data/decoded.json`, `sentences.hello.steps`) and are also what a frequency-ranked engine of the
period would plausibly show; the exact behaviour varied by phone and dictionary (not verified on a real handset).

| Time | Key | Line 1 (underlined = in progress) | Counter | What the viewer sees |
|---|---|---|---|---|
| 6.6 | | cursor only | 160 | the editor opens |
| 7.8 | 4 | <u>I</u> | 159 | one letter |
| 8.3 | 3 | <u>He</u> | 158 | a word already |
| 8.8 | 5 | <u>Gel</u> | 157 | the first letter changes, G |
| 9.3 | 5 | <u>Hell</u> | 156 | it changes back to H: the phone changes its mind |
| 9.8 | 6 | <u>Hello</u> | 155 | the word |
| 10.4 | 0 | Hello and a space, no underline | 154 | the word is accepted; the cursor moves on |

Each press: the key's light jumps on in that frame; the screen takes the new state on the next 12 Hz step (at most
5 frames later); new dark pixels reach full darkness over 3 steps (0.6, 0.9, 1.0) and old ones clear over 3 steps
(0.5, 0.2, 0), about 250 ms, inside the datasheet's 150 to 300 ms. That keeps Act 1's stepped grid and shows the
slow LCD.

### 3.4 The other screens

- **Idle (the phone wakes):** aerial and empty bars, battery with 1 bar; "No network" (small, centred, origin
  y 10); "23:59" (large bold, centred, origin y 19); "Fri 31 Oct" (small, centred, origin y 35); soft keys "Menu"
  and "Names". No header rule. 31 October 2003 was a Friday (checked).
- **Battery low:** header stays, battery empty and blinking; an outline battery 19 x 11 at x 38 to 56, y 15 to 25
  with a 2 x 5 tip; "Battery low" in large regular text, centred, origin y 28; right soft key "OK"; two short beeps.
  Then the backlight dies: all lights to zero in 2 steps, pixels clear in 3 steps after.
- **Dead:** all pixels off, backlight off; the ground is a dim olive grey lit by moonlight, with dust on the lens.
- **Optional, "the dead screen speaks"** (section 6.4): the end lines as faint pixels on the dead screen, lit only
  by the moon, with strong parallax shadows.
- A "Message sent" screen is not needed: the act never sends.

### 3.5 Rendering the LCD in Remotion

Keep `PixelScreen`'s approach (rasterise the fonts into a real 1-bit grid at runtime) and change these values. The
numbers marked inferred are my starting points; set them by eye on a full-size still.

| Property | Value |
|---|---|
| Grid | 96 x 64; at the straight-on macro one LCD pixel is about 13 px on screen |
| Dot | 94% of the pitch (6% gap, from the datasheet drawing), corners rounded about 8% of the pitch (inferred) |
| Lit pixel | `#2c3622` at 90% so the ground's texture shows through; unlit pixels 3 to 4% darker than the ground (the faint matrix); no matrix outside the active area |
| Ground, backlit | yellow-green, about `#b0cc76` in the middle to `#c4dc8a` at the LED edge (bottom), corners 12% darker, fixed low-frequency mottling of plus or minus 2% (inferred). The current mint `#c7f0d8` / `#43523d` is a hobbyist palette (01-research); it is cooler than any STN cast I found, so treat it as a creative choice |
| Contrast | lit pixels at about one fifth of the ground's luminance (contrast 5 typical) |
| Response | stepped, section 3.3 |
| Parallax shadow | backlit: offset 0.3 px right and 0.4 px down (in LCD pixels), 12% opacity, 0.3 px blur. Moonlit, backlight off: offset 0.8 and 1.0, 35%. Light from the upper left (inferred). For scale, an open-source handheld-LCD shader defaults to a 55% shadow at a (2, 2) offset with 1.65 blur ([libretro parameters](https://github.com/libretro/slang-shaders/blob/master/handheld/shaders/gameboy/shader-files/gb-params.inc)): a stronger, stylised look than ours |
| Inner shadow | the black print sits about 1 mm in front of the LCD: a soft 6 to 10 px shadow along the window's inner edge |
| Glass | lay the plate's own window region back over the LCD with a screen blend at 60 to 80%: reflections, scratches and dust stay real. When lit, add the plate's fine detail again, tinted green, so the dust glows |
| Halation | `glow` from `@remotion/effects` on the lit screen and keys only: radius about 48 px at 1080p, intensity 0.25, threshold 0.6, in the backlight colour (inferred) |
| Angled view | about 25% less contrast and lit pixels shifted toward blue-grey `#36403a` (inferred; STN contrast falls off-axis) |
| Keys | legend core 100%, inner glow 2 px at 60%, bloom 10 to 14 px at 20%; a fixed hot-spot map (1.15 near two LEDs, 0.8 far); pressed key times 1.4 for 3 steps and a 1.5% dip with 6% darkening for 2 steps; unlit legends pale grey at 35% |

`@remotion/effects` 4.0.542 in the film already has `cornerPin` (pins a canvas layer to four UV corners; WebGL2 or
WebGPU; [docs](https://www.remotion.dev/docs/effects/corner-pin)), `glow`, `lensBlur` (bokeh with an iris shape
and highlight gain), `linearProgressiveBlur` (depth-of-field falloff), `lut` and `curves` (I read the type
definitions in `film/node_modules/@remotion/effects/dist`). Keep STYLE.md's rule: no `HtmlInCanvas` inside another.

### 3.6 Pixel fonts that fit the period

Checked on 2026-11-10. "Crisp" means every pixel lands on the grid when drawn at that size (my own test with the
font files).

| Font | Licence | Grid | Use |
|---|---|---|---|
| Tiny5, Stefan Schmidt ([Fontsource](https://fontsource.org/fonts/tiny5)) | SIL OFL 1.1 | crisp at 8 px, 5 px capitals | status row, counter, soft keys, small idle text. Already shipped (`tiny5-latin-400.woff2`). The current upstream file is a variable font with extra axes; keep the static 400 file |
| Departure Mono, Helena Zhang ([repository](https://github.com/rektdeckard/departure-mono)) | SIL OFL (font; the site is MIT) | crisp at 11 px, 8 px capitals; "pixel-perfect" at multiples of 11 px; "inspired by ... the tiny pixel fonts of the late 90s/early 00s" | the editor and the clock, bolded by double drawing |
| Micro 5, Sarah Cadigan-Fried ([Fontsource](https://fontsource.org/fonts/micro-5)) | SIL OFL | 5 px capitals; crisp at 11 px in my test | alternative small face |
| Jersey 10, same designer ([Fontsource](https://fontsource.org/fonts/jersey-10)) | SIL OFL | 10 px capitals (the number is the capital height) | alternative heavy large face; not crisp at whole sizes in my test, check first |
| Silkscreen, Jason Kottke, 1999 ([Fontsource](https://fontsource.org/fonts/silkscreen)) | SIL OFL | 8 px, capitals only | labels in capitals |
| Spleen ([repository](https://github.com/fcambus/spleen)) | BSD 2-Clause | 5 x 8, 6 x 12 bitmaps | monospace fallback |
| monogram, datagoblin ([page](https://datagoblin.itch.io/monogram)) | CC0 | 5 px wide | fallback |
| VT323, Peter Hull ([Fontsource](https://fontsource.org/fonts/vt323)) | SIL OFL | terminal | the tube's on-screen display and the act's caption lines only, never on the phone |

A "Pixel Operator" family is reported as CC0 on font sites, but I could not verify its licence at the source; skip
it unless someone does.

## 4. Photoreal stills with gpt-image-2.6

### 4.1 What the docs say (read 2026-11-10)

- **Models.** `gpt-image-2.6-sunburst` ("detailed visual work") and `gpt-image-2.6-flare` ("fast iteration") are
  listed for `/v1/images/generations` and `/v1/images/edits`; priced per token: image output $30 per million tokens
  ([model page](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst)).
- **Parameters for 2.6** ([2.6 prompting guide](https://developers.openai.com/api/docs/guides/image-prompting)):
  `quality` auto, low, medium, high, xhigh or max; `complexity` low, medium or high ("Both Sunburst and Flare use
  high when you omit the field"); `background` auto, opaque or transparent; output png, jpeg, webp (generations
  also svg and gif); `markup` on edits; "Omit `input_fidelity` on image edits".
- **Sizes.** "For a custom size, use multiples of 16 for both dimensions and an aspect ratio from 1:3 to 3:1"
  (2.6 guide). The image guide adds "neither edge may exceed 3840 pixels", a total of 655,360 to 8,294,400 pixels,
  and "Resolutions above 2560x1440 are experimental"
  ([image generation guide](https://developers.openai.com/api/docs/guides/image-generation)); the API reference
  states those limits for the 2.5 models and does not name 2.6
  ([edit reference](https://developers.openai.com/api/reference/resources/images/methods/edit)). 2560 x 1440 with
  `gpt-image-2.6-sunburst` is proven in this repo (`manifest/images.json`).
- **Transparent backgrounds.** The 2.6 guide says both models "support image generation, editing, and transparent
  backgrounds" and to "check the decoded alpha channel"; the API reference names only the 2.5 models (and
  `gpt-image-2` in preview). Test once with Flare at low quality before relying on it.
- **Edits.** Up to 16 input images ([edit reference](https://developers.openai.com/api/reference/resources/images/methods/edit)).
  `markup` is "a transparent PNG overlaid on the first image" with the same dimensions; additional images "serve as
  references"; never combine it with `mask` (2.6 guide). The reference says markup "Supports GPT Image 2.5" while
  the guide shows it with 2.6: test it.
- **Limits.** The model "can still struggle with precise text placement" and "may have difficulty placing elements
  precisely in structured or layout-sensitive compositions" (image generation guide). That is why legends and
  screen content are ours, and positions are measured after the fact.

### 4.2 Prompting for product-photo realism

From the 2.6 guide: say "photorealistic" or "real photograph"; name materials, lighting, colours and medium;
"Treat camera specifications as cues for appearance, not a guarantee"; separate the scene, subject, details and
constraints; for edits say "change only X" and list what must stay; give each reference image a number and a role;
change one thing per edit; if part of an image must stay pixel-identical, "composite the approved edit into the
original".

What I add for this subject (inferred):

- **Lens and distance:** 100 mm macro equivalent; f/5.6 for the wide, f/8 to f/11 for macros so a whole key row is
  sharp. For flat compositing shots, ask for "from far away with a long lens so the edges stay parallel".
- **Light:** one motivated source (moonlight from the upper left), deep shadows, no studio lights, no rim lights,
  no flare. The phone's own glow is added later from a lit edit.
- **Materials by name:** satin metallic paint with a faint fleck, charcoal translucent rubber with a satin coat,
  clear acrylic with a black printed border, a seam between covers.
- **Imperfections by name:** hairline swirl marks, a few deep scratches, paint worn through on corners, polished
  key centres, grime in seams, even dust.
- **Exclusions by name:** no text, digits, symbols, logos or labels anywhere; no hands; and the signature features of
  section 2.7.

### 4.3 A straight-on master with a dark screen

1. Render `10-act1-phone-front.svg` to a PNG at the master's framing: black lines on white, the phone centred and
   vertical, 90% of the frame height, in a 1440 x 2560 portrait frame (the master is a reference, not a film
   frame, so give the phone the most pixels).
2. Send it as image 1 to `/v1/images/edits` with the 2.6 guide's own sketch pattern: "Turn this drawing into a
   photorealistic image. Preserve the exact layout, proportions, and perspective ... Do not add new elements or
   text." (prompt P1). A line drawing of a complete phone gives the model a real object to render; the flat grey
   guide gave it a shape to fill.
3. Ask for the screen "switched off: dark, even olive-grey glass with no image", and place the light so its
   reflection falls outside the window.
4. Approve the master by eye at 100% (section 4.8), then make the lit version (P1-LIT) as an edit with complexity
   low.
5. Composite: the LCD canvas pinned to the window's four corners (`cornerPin`, or a CSS `matrix3d` built from the
   homography, column-major per [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix3d);
   [perspective-transform](https://www.npmjs.com/package/perspective-transform) computes it), then the plate's own
   glass over it (section 3.5). Key legends and glows the same way, per key.

### 4.4 Finding the screen corners and key centres

1. Difference image: lit edit minus unlit plate (luminance). The glow outlines the window, every key and the
   navigation key. If the lit edit moved anything, check alignment first; in this repo the IMG-01 to IMG-02 edit
   held within about 1 to 2 px (manifest note).
2. Optional chroma edits for clean masks: "Change only the display glass: fill it with flat, uniform pure magenta
   (#FF00FF)"; the same for the key tops in cyan. Use these only as masks.
3. Threshold, open and close, find connected components (OpenCV `findContours`). The largest blob is the window;
   fit a line to each of its four edges and intersect them for sub-pixel corners (`fitLine`; `cornerSubPix` to
   refine on the plate).
4. Map the design in millimetres (section 2.6) through the window's homography to get the LCD active area, the
   keys' quads and centres; then fit a 3 x 4 lattice to the 12 detected key centroids by least squares and keep the
   detected value where it differs by less than 2 px.
5. Save to `plates.json` as quads: `window`, `active`, `keys.{id}.quad`, `keys.{id}.center`, plus the light pass file.
   Check with an overlay still (as `scripts/images/boxes.py` does now) and a checkerboard pinned into the window.

### 4.5 Keeping a set consistent

- Approve the master first; make every other still an edit with the master as image 1 ("Image 1 is the phone: keep
  its exact design, proportions, materials and colours") and, for a scene, the approved scene as image 2.
- Repeat the same blocks (4.7) word for word in every prompt; vary only the scene or the change.
- New viewpoints are the weak point: give the master and a crop of the relevant area as references, and expect two
  or three rounds.
- Targeted edits (lit, dust, masks): complexity low, quality high. New compositions: complexity high.
- Check each take against the master by flicking between them at the same scale, and against section 2.7.

### 4.6 Avoiding garbled legends

Generate every key blank ("completely unprinted") and draw the legends in code, in perspective, with their glow and
the plate's depth-of-field blur. Check every take at 100% for stray marks on keys and for invented text on
background objects (cassette labels, watch dials, batteries). Remove strays with a markup edit (circle them, "remove
the marks inside the red circles, keep everything else") at complexity low, or reject the take.

### 4.7 Shared prompt blocks

**[NIGHT]** A real photograph, not a render or an illustration. Night in a dark room; the only light is cool, soft
moonlight from a window at the upper left, with deep blue-violet shadows and natural falloff. Full-frame camera,
100 mm macro lens, ISO 3200, fine natural grain, subtle lens vignette. Muted, slightly desaturated colour. No studio
lighting, no rim lights, no lens flare.

**[PHONE]** The phone: an ordinary keypad mobile phone from about 2004, an invented design that copies no real model
and carries no brand. A slim bar 106 mm tall, 46 mm wide and 19 mm thick: a softly rounded rectangle with 8 mm corner
radii, gently rounded side edges and a smooth top edge with no aerial. Front cover in satin pewter-grey painted
plastic with a faint metallic fleck; a thin seam runs around the sides where it meets the darker charcoal back
cover. On the front, from top to bottom: a short horizontal earpiece slot; a clear acrylic lens with a thin black
printed border around a small monochrome display, 34 mm wide and 26 mm tall, switched off, dark olive-grey glass
showing no image; a row with a small pill-shaped key at each side and, between them, a round four-way navigation key
with a separate round centre button; a second pill-shaped key at each side below the first; then twelve identical
keys in three columns and four rows, each a wide rounded rectangle about 12.5 by 6.5 mm, in dark charcoal
translucent rubber with a satin coating, evenly spaced in a straight grid; a tiny microphone hole near the bottom
edge.

**[WEAR]** Used for years: hairline scratches and fine swirl marks on the acrylic lens, a few deeper scratches,
paint worn through to darker plastic on the corners, the most-used keys polished smooth and slightly glossy in the
middle, a little grime in the seams.

**[NO-TEXT]** Every key and the whole body are completely unprinted: no digits, no letters, no symbols, no icons,
no logo, no brand name, no sticker, no text anywhere in the picture. No hands, no people. No curved or tilted key
rows, no oval or teardrop keys, no joystick, no aerial, no patterned or coloured cover.

**[LIT]** Change only the light: switch on the phone's backlights. The display glows evenly in soft pale
yellow-green, a little brighter along its lower edge, and shows no image, text or pixels. All keys are lit from
beneath with the same light, which leaks softly around each key's edge and glows faintly through the rubber; the
glow spills a little onto the surfaces around the phone and catches the dust. Keep everything else exactly as it
is: framing, phone geometry and position, every key, scratches, dust, moonlight and shadows.

### 4.8 The prompts

Final takes: `gpt-image-2.6-sunburst`, quality high (compare xhigh on the macros). Drafts: `gpt-image-2.6-flare`,
medium. PNG, background opaque.

| Id | Shots | Endpoint, inputs, size, complexity | Prompt |
|---|---|---|---|
| P1 master | identity reference for all; the "same keys" handover in `12-transitions.md` | edits; image 1 = the SVG drawing as PNG; 1440 x 2560; high | Image 1 is a line drawing of a product. Turn it into a photorealistic photograph of that product. Preserve the exact layout, proportions and perspective of the drawing; do not add new elements or text; the dashed rectangle is only a guide and must not appear. [PHONE] [WEAR] Scene: the phone lies face up on a dark matte surface, photographed from directly above with the lens axis exactly perpendicular to its face, from far away with a long lens so its edges stay parallel; centred, long side vertical, filling 90% of the frame height. Soft moonlight from the upper left grazes the keys and the lens; its reflection falls outside the display window. [NIGHT] [NO-TEXT] |
| P1-LIT | lit reference; light pass | edits; image 1 = P1; same size; low | Image 1 is the approved photograph. [LIT] [NO-TEXT] |
| P5 drawer | shots 1, 2, 3, 6, 7 | edits; image 1 = P1; 2560 x 1440 (try 3840 x 2160, experimental, for more push room); high | Image 1 shows a phone: keep its exact design, proportions, materials and colours. [PHONE] New photograph. [NIGHT] Looking straight down into an open wooden drawer of forgotten things; a soft band of moonlight from the upper left falls across it. Inside, the phone from image 1 lies face up, switched off, near the centre, long side vertical, filling about 45% of the frame height, its face parallel to the picture, among a loose tangle of old charger cables, a cassette tape with a blank label, a wristwatch with a plain dial and no numerals whose hands stand at midnight, a few coins, rubber bands, a small key on a ring and two unlabelled batteries. Everything lies under a fine, even layer of grey dust; the phone's lens and keys are dusty too. [WEAR] [NO-TEXT] No labels, logos or printing on any object. |
| P5-LIT | shot 3 (the wake) | edits; image 1 = P5; low | Image 1 is the approved photograph. [LIT] The moonlight is unchanged. [NO-TEXT] |
| P2-D macro | shots 4, 5 | edits; image 1 = P1 (the phone), image 2 = P5 (the scene); 2560 x 1440; high | Image 1 is the phone: keep its exact design. [PHONE] Image 2 is the scene: keep its light, dust and drawer. New photograph: an extreme macro of the same dusty phone lying in the drawer, taken from the keypad end with the camera tilted 35 degrees off the phone's face. The display window is sharp in the upper middle of the frame and fills about 60% of the frame width; the navigation key and the top row of keys are large and softly out of focus across the bottom of the frame. 100 mm macro lens at f/8. The display is switched off: dark olive-grey glass behind the acrylic lens, fine dust and hairline scratches on the lens, a faint cool reflection of the window along its upper edge. [NIGHT] [NO-TEXT] |
| P2-D-LIT | shots 4, 5 | edits; image 1 = P2-D; low | Image 1 is the approved photograph. [LIT] [NO-TEXT] |
| P3-D keypad | optional insert; "same keys" handover | edits; image 1 = P1, image 2 = P5; 2560 x 1440; high | Image 1 is the phone, image 2 the scene. [PHONE] New photograph: straight down onto the keypad of the same dusty phone in the drawer, the lens axis perpendicular to the keys; the twelve keys fill the frame height and are sharp; the navigation key is cut off at the top edge. 100 mm macro lens at f/11. Keys unlit. [WEAR] [NIGHT] [NO-TEXT] |
| P3-D-LIT | as P3-D | edits; image 1 = P3-D; low | Image 1 is the approved photograph. [LIT] [NO-TEXT] |
| P6 nightstand | the alternative arc (6.4) | edits; image 1 = P1; 2560 x 1440; high | Image 1 shows a phone: keep its exact design. [PHONE] New photograph. [NIGHT] A dark bedroom corner: a wooden bedside table under a window with thin curtains; a full moon, slightly soft, shows through the glass; cool moonlight crosses the table in a soft band. On the table, the phone from image 1 lies face up, switched off, long side vertical, filling about 30% of the frame height, seen from above at 70 degrees; beside it a half-full glass of water and a closed book with a plain cloth cover. The phone sharp, the window soft. [NO-TEXT] No clock with numerals, no posters, no labels. |
| P7 profile | optional glamour insert | edits; image 1 = P1, image 2 = P5 or P6; 2560 x 1440; high | Image 1 is the phone, image 2 the scene. [PHONE] New photograph: a low side view at the height of the surface of the same phone lying in the scene of image 2, showing its 19 mm thickness, rounded edges, the seam between the covers and the keys standing slightly proud of the face; moonlight draws a thin highlight along the top edge; shallow depth of field. [NIGHT] [NO-TEXT] |
| M1, M2 masks | utility | edits; image 1 = any approved plate; low | Image 1 is the approved photograph. Change only the display glass: fill it with flat, uniform pure magenta (#FF00FF), no shading. Keep everything else exactly as it is. (M2: the tops of the twelve keypad keys in flat pure cyan, #00FFFF.) |

Budget: about 6 takes for each new composition and 12 for P1, 2 for each edit: about 60 pictures. The glass of water
in P6 is a quiet echo of Act 2's "I need water"; drop it if it distracts.

### 4.9 Checklist for every still

- Nothing that reads as a letter, digit, symbol or logo at 100%, on the phone or any object.
- Compared by a person with well-known handsets of 1998 to 2006 and with section 2.7; not to be taken for any.
- Earpiece, window, two soft keys, a round navigation key, two call keys, twelve identical keys in a straight grid,
  microphone. Nothing else on the front.
- The window close to 34 x 26 (about 1.3:1), the screen switched off and empty.
- No hands, faces or warm light (no ember in Act 1).
- Matches P1 in design and P5 in light and dust.
- Sharp enough for the planned push-in at 1080p; manifest line written; `node scripts/tm-lint.mjs` passes.

## 5. The Act 1 look and the Halloween mood

### 5.1 References and what to take from them

I did not watch any of these; descriptions come from the linked pages.

| Reference | What it is | Take | Leave |
|---|---|---|---|
| Analog horror web series: Local 58 (2015), Gemini Home Entertainment (2019), The Mandela Catalogue (2021) | Fictional broadcasts and tapes with "low-fidelity graphics, cryptic messages, few to no traditional jump scares" and analog distortion ([Wikipedia](https://en.wikipedia.org/wiki/Analog_horror)). Messages that "urge us to remain calm"; empty places at night ("an abandoned park or an empty classroom after dark") that look ordinary but feel wrong ([/Film](https://www.slashfilm.com/1899869/analog-horror-skinamarink-subgenre-meaning-explained)) | A calm voice, words on a dark screen, an ordinary place at night that feels slightly wrong, restraint | Dread, emergency alerts, faces, distorted voices, anything that frightens |
| The television sign-off | A closing announcement, an anthem, a test card, a tone, static ([Wikipedia](https://en.wikipedia.org/wiki/Sign-off)) | The shape of our ending: a calm closing line, then the set goes off | Test cards and colour bars (some are protected; bars carry saturated red, which the film bans) |
| Analog TV "ghosting" | "a replica of the transmitted image, offset in position, that is superimposed on top of the main image", from multipath reception ([Wikipedia](https://en.wikipedia.org/wiki/Ghosting_(television))) | A faint ghost on the picture as it locks in shot 1: a real artefact with a Halloween name, and the app's offline mode is called ghost mode | A strong double image |
| "Lamp" (2002 advertisement) | An old lamp left at the roadside in bad weather while its owner enjoys a new one; the twist: "It has no feelings, and the new one is much better." Cannes Grand Prix 2003 ([Wikipedia](https://en.wikipedia.org/wiki/Lamp_(advertisement))) | Sympathy for a discarded object at night. Our answer is the opposite of its twist: old is not the same as bad | Its irony |
| Anthology television's host narrator | The host's openings and closings "usually summarize the episode's events" ([Wikipedia](https://en.wikipedia.org/wiki/The_Twilight_Zone_(1959_TV_series))) | A calm narrator who frames the story instead of selling | Pastiche, catchphrases |
| The tube's whine | Flyback whine at 15.625 kHz (PAL) or 15.734 kHz (NTSC), "often heard as a high-pitched whine" ([Wikipedia](https://en.wikipedia.org/wiki/Flyback_transformer)) | Optional, very quiet, only under the tube shots | Anything loud or long |
| Title design with light and type | Already in 01-research (the title of a 1980s-set series, made with light through real film) | Type and light carry mood without monsters | |

### 5.2 What to borrow, in numbers

| Aspect | Act 1 (the photoreal shots) | Source or status |
|---|---|---|
| Grade | One LUT for every plate: blacks lifted to about `#0c0a14` (a hint of the brand's night), cool violet-blue shadows, moonlit highlights about `#c9d2ea`, the yellow-green screen and keys the only saturated colour, saturation minus 15% elsewhere, soft highlight roll-off | inferred; `lut`, `curves` in `@remotion/effects` |
| Tonal range | aim at a mean luma of 35 to 55 and a 95th percentile of 150 to 190 on the photoreal shots (now 32 and 77) | inferred target; measure with the same script |
| Grain | luminance only, 1.5 to 2 px at 1080p, 3 to 4% RMS, a new pattern every 2 frames | inferred; a fine balanced pattern, inside WCAG's exception |
| Halation | glow on the lit screen and keys only (section 3.5) | inferred |
| Lens | vignette 15 to 20%, colour fringe at most 0.5 px at the edges; no scanlines outside the tube | inferred |
| Tube and analog artefacts | only in shots 1, 2 and 7: the current `TubePicture` plus the multipath ghost (a copy 10 to 12 px to the right at 15 to 18%, fading as the picture locks); no tape tracking bands (one look: a broadcast set) | ghosting source above |
| Light | moonlight from the upper left and the phone's own glow, nothing else; no warm light in Act 1 (the ember belongs to the dot) | 02, section 3 |
| Motion | the camera moves smoothly (pushes of 2 to 6% over 3 to 4 s, one 36-frame push through the glass); content steps at 12 Hz | 02, section 4 |
| Pacing for the narrator | shots of 3.6 to 4.6 s; a line starts at least 0.3 s after the picture settles; 0.5 to 1 s of silence between lines; never speech over a loud transition (`12-transitions.md`, rule 4) | voice actors average "2.5 words per second", about 150 a minute ([Bread n Beyond](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/)); Act 1 goes slower on purpose (inferred) |

### 5.3 Halloween without a costume, in this act

- The idle screen reads 23:59, Fri 31 Oct, No network. Nobody points at it.
- The phone wakes by itself and its keys press themselves: no hand in any picture (as 02 already rules), so the
  typing is a ghost's.
- The analog "ghost" on the tube picture in shot 1.
- A stopped wristwatch at midnight in the drawer; moonlight; dust; a cloud crossing the moon while the narrator says
  the keypad went quiet.
- The 3 x 3 wink in shot 8 (as now) and the 3 x 3 predictive sign on the phone's own screen, so the wink has been
  seen before.
- Never: pumpkins, cobwebs, skulls, bats, blood, jump scares, screams, heartbeats (02, section 6).

### 5.4 Viewer safety (02, section 9)

- The wake flicker (half, then full) happens only in the wide drawer shot, where the phone is well under a quarter
  of the frame. In the macro, lights change only once (the death).
- One static burst at most after shot 1 (`12-transitions.md` drops two of the current three).
- The cloud on the moon changes brightness over 3 s, far below a flash.
- The battery icon blinks at 2 Hz but is tiny.
- No saturated red: the call and end legends are icons in the same pale green, not green and red.
- Run `scripts/check-flashes.py` on the new act.

## 6. The Act 1 shot list (28.0 s, frames 0 to 1679)

### 6.1 The narrator

**Voice.** A second ElevenLabs voice that cannot be confused with the app's: if the app's voice is a mid-pitched,
neutral device voice, the narrator is lower, older, warmer and slightly textured, a storyteller at night (for
example a different gender or a clearly lower register). Close and unhurried, about 130 to 140 words a minute in
Act 1, below the usual 150 of voice-over reads. No whisper, no spooky effects, no trailer voice. The narrator
tells; the app only ever speaks the person's words.

**Script (41 words).**

| Line | Starts | Words |
|---|---|---|
| L1 | 4.5 s | We used to write with nine keys. |
| L2 | 7.9 s | One press per letter, (pause; the presses carry on) and the phone worked out the word. |
| L3 | 13.6 s | Then glass replaced the keys, (pause) and the keypad went quiet. |
| L4 | 19.7 s | Old is not the same as bad. |
| L5 | 24.8 s, ending by 27.0 s (frame 1620) | It still has something to say. |

**Fit with the story script.** `13-story-problem-narration.md` (Script A, 46 words) shares L3 to L5 and adds an
opening hook and "Every word it offered matched your keys.", which plants Act 2's proof check. Both fit these
shots: that line can replace L2b ("and the phone worked out the word.") over the end of shot 4, and is true of the
old method, where every offered word fits the keys pressed. Its hook would sit over the tube's switch-on in shot 1,
which `12-transitions.md` asks to keep clear of speech; if the hook is kept, duck the hiss under it. The lead
chooses one script; the picture does not change.

**Making it.** One file per line (3 takes each), the same voice and settings for the whole film, heads trimmed,
placed by frame. For even prosody across separate requests, ElevenLabs offers request stitching
(`previous_request_ids`, at most 3, "not available for the `eleven_v3` model";
[docs](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching)). Mix: no music in Act 1
(drone only); the narrator peaks about 3 dB under the app's voice so "Hello again" stays the most present voice;
key beeps duck 4 dB under speech. Add the narrator lines to the caption file. The video description says the
narration is generated, as it says for the app's voice (04, section 4.4).

**On-screen text** stays for viewers with the sound off (02, section 3) and uses the narration's words, split
where the narrator pauses, in VT323, lower case, digits for numbers ("we used to write with 9 keys."), bottom left over a soft dark gradient on
the photoreal shots.

### 6.2 Shots

"Plate" means a generated still (section 4.8); everything else is drawn by the film.

| # | Time, frames | Picture and motion | Made from | Screen and keys | Sound | Narrator, text |
|---|---|---|---|---|---|---|
| 1 Dead air | 0.00 to 3.00, 0 to 179 | As now: 20 f black; the tube opens in 14 f and brightens over 20 f; full static with "ch 09" top right and "no signal" bottom left from 0.8 s. From 2.5 s the static thins, the picture rolls once and locks on the dark drawer, with the multipath ghost fading out as it locks | Code (`TubePicture`, `switchOn`, `Osd`, `tubeStatic`); plate P5 inside the tube | Phone dark | Room tone; tube thunk; filtered hiss; the low drone from 2.5 s | None; on-screen display only |
| 2 Through the glass | 3.00 to 3.60, 180 to 215 | Push through the tube: zoom 1.0 to 1.3 in log space, ease in and out; curvature, fringe, scanlines, vignette, blur and static ramp to zero; the tube's rounded corners leave the frame. The drawer is now clean, full frame | Code; P5 | Dark | The hiss narrows and stops; a soft air swell | None |
| 3 The phone wakes | 3.60 to 7.20, 216 to 431 | P5 full frame, a smooth push of 4% toward the phone. At 4.2 s (frame 252) the backlights come on in two 12 Hz steps (half, then full); green light spills over the dusty cables and catches the dust on the lens. Optional: a few dust motes in the moonbeam | P5 plus the light pass (P5-LIT minus P5); screen pinned with `cornerPin`; legends per key | Idle screen (section 3.4); at 6.6 s the editor opens: empty, 160, cursor | A tiny click at the wake; the faint whine of the backlight; room tone | L1 4.5 to 7.0; text "we used to write with 9 keys." 4.5 to 7.2 |
| 4 Ghost typing | 7.20 to 11.60, 432 to 695 | P2-D macro: screen sharp, the navigation key and top keys soft in the foreground; 3% push over the shot. Keys 4, 3, 5, 5, 6 at 7.8, 8.3, 8.8, 9.3, 9.8 s (frames 468, 498, 528, 558, 588) and 0 at 10.4 s (624): each pressed key's light jumps and the key dips; presses on keys inside the frame bloom as soft bokeh (`lensBlur` with highlight gain). Optional: a 2% push over 6 frames on the G to H change at 9.3 s | P2-D plus P2-D-LIT; screen pinned, with a `linearProgressiveBlur` matching the plate's focus falloff; legends per key | Section 3.3, step by step | The old set's square beeps E, D, G, G, A, then the 0 key (A2), ducked under speech | L2a 7.9 to 9.0, L2b 9.9 to 11.3; text "one press per letter." 7.9 to 9.8, "the phone worked out the word." 9.8 to 11.6 |
| 5 Battery low | 11.60 to 13.20, 696 to 791 | Same framing, pushed 6% toward the screen. 11.7 s: the battery icon empties and blinks; 11.9 s: "Battery low" and "OK"; 12.8 s (frame 768): all lights die in 2 steps, pixels clear in 3 steps; the screen is now a dim olive grey in moonlight, dust on the lens | As shot 4 | Section 3.4 | Two short, soft, falling square beeps (our own, at 12.0 and 12.3 s, using the old set's 4 and 2 notes); a tiny click at 12.8 s; then room tone | None |
| 6 Quiet | 13.20 to 17.80, 792 to 1067 | Back to P5's framing, now dark: the same place with the light gone. A slow pull back of 4%. From 14.5 s a cloud crosses the moon: the moonlight band dims to 60% and returns over 3 s | P5 only, with a moonlight dimmer | Dark | Room tone, faint wind; the drone sinks four semitones (as the current hum does) | L3a 13.6 to 15.2, L3b 15.6 to 17.0; text "then glass replaced the keys." 13.4 to 15.4, "the keypad went quiet." 15.4 to 17.8 |
| 7 Out, and off | 17.80 to 19.20, 1068 to 1151 | The reverse of shot 2: pull back into the tube over 36 f as its look returns, the ghost creeping back; hold 6 f; switch-off at 18.5 s (frame 1110): picture to a line in 10 f, line to a dot in 20 f; black and a pale dot from frame 1140 | Code (`switchOff`, `BeamDot`); P5 | Dark | Hiss returns softly; the power-down sweep at 18.5 s; silence | None (a loud transition needs a narrator pause) |
| 8 The dot | 19.20 to 28.00, 1152 to 1679 | As the current scene 5, retimed: the pale dot holds; the lines appear under it; at 24.0 to 24.6 s the 3 x 3 wink; from 25.2 s the dot warms to ember over 1.3 s while black deepens to night; the lines cut out at 27.5 s (frame 1650); the ember dot alone, as STYLE.md's hand-off requires | Code (`Dot`, `Line`) | | Room tone; a crackle at the wink; one soft E as the dot warms; the low rising tone from 27.5 s (or `12-transitions.md`'s hum glide) | L4 19.7 to 22.3 with "old is not the same as bad." from 19.6; text only: "it had few keys. big ones." from 22.5 and "it could write with no signal." from 23.7; L5 24.8 to 27.0 with "it still has something to say." from 24.8 |

Totals: 180 + 36 + 216 + 264 + 96 + 276 + 84 + 528 = 1680 frames. Every caption line stays at least 1.8 s.

The middle two lines of shot 8 stay unvoiced on purpose: reading all four lines takes about 10 s of speech, which
would fill the hinge of the film with talk. If the owner wants every line voiced, either shorten them to one spoken
line ("Few keys. Big ones. It wrote with no signal.", about 3 s, from 22.4 s) or take 1.5 s from shot 6.

### 6.3 The hand-off to Act 2

Unchanged contract (STYLE.md): the last frames show only the ember dot, 28 px, `#ffb13d`, glow
`0 0 24px rgba(255,177,61,0.6)`, centred at (960, 540), on night `#140a2e`. The narrator is silent from frame 1620,
so whichever handover `12-transitions.md` settles on (its default stretches the dot into a line at frame 1650)
lands in silence. P1 and P3-D give that file's "same keys" option the straight-on keypad it needs.

### 6.4 Alternatives

- **"Time match" instead of "Haunting"**: swap P5 for P6 (the nightstand) in shots 1 to 3, and use a dusty edit of P6
  ("the same picture years later, switched off, under a fine even layer of dust") for shot 6. More conventional
  (alive, then forgotten), and it keeps the current story's same-place, years-later cut. The drawer version states
  the theme (forgotten technology) in the first second and gives the wake its surprise; I recommend it.
- **"The dead screen speaks"**: shot 8's lines appear as faint pixels on the dead screen in moonlight (the last panel
  of the mock-up) instead of on black, and the last lit pixel becomes the dot. Stronger, but it needs one more plate
  (P2-D's prompt with the camera square to the screen instead of tilted) and a careful hand-off from a square pixel
  to the round dot.
- **Fallback if no phone take passes the look-alike check**: close-ups only. Shots 3 and 6 become P3-D (keys), the
  macro P2-D stays, and the drawer is seen only in the tube.

### 6.5 Mapping to the code

The scenes keep their lengths in `timeline.ts` (S01 0 to 4 s, S02 to 11, S03 to 17, S04 to 22, S05 to 28); the
shots above cross those lines, which `shots.tsx` already allows by driving shots from the absolute frame. Work
falls in the Act 1 owner's files: a new `PixelScreen` (96 x 64, states, response, shadows), `Keypad.tsx` (legends in
a sans, per-key quads, light pass), `Plate.tsx` (quads instead of boxes), `TubePicture` (effect amounts as props for
the push through the glass, the multipath ghost), `timing.ts` (the times above), `Act1Sound.tsx` (beeps, the
battery tones), and `plates.json`.

## 7. What this changes in the existing plan

For the lead and the owner to decide; nothing outside this folder was edited.

| Document | Now | Proposed |
|---|---|---|
| 02, section 3, rule 1 | "No narrator" | The owner's review adds one; the app's voice stays the only voice that speaks the person's words |
| 02, section 7 | One plain phone with "Nothing else on the front"; keys that echo the brand's square keys | The generic anatomy of section 2.6, the avoid list of 2.7, wide keys; the rhyme with the app is the 3 x 4 grid and the five-note motif |
| 02, section 7, and 04, section 2 | An 84 x 48 grid; legends in a pixel face | 96 x 64 (section 3.2); legends in a plain sans; pixel fonts only on the screen |
| 03, scenes 2 to 4 | Inset keypad, "good, home, gone" cycle, worn key, keypad rows going dark | Shots 3 to 6 above. The Next-key cycle moves out (Act 2's candidate list already shows several sentences for one set of keys) |
| 04, section 1 | Flat grey guides, IMG-00 to IMG-07 | A line drawing and P1 to P7 with lit edits and mask edits |

## 8. Not verified

- How a period phone's prediction actually displayed "hello" key by key; our states are the real decoder's.
- The avoid list in section 2.7 (from memory).
- The pixel pitch of a 96 x 64 phone panel (computed from a typical size, not a datasheet).
- Which backlight colours phones of the time used most; the yellow-green choice rests on module datasheets.
- Transparent backgrounds and `markup` on the 2.6 models (the guide and the API reference disagree); custom sizes
  above 2560 x 1440 on 2.6.
- The phone-spec scrape is incomplete and second-hand; its figures are ranges.
- OpenAI's and ElevenLabs's licence terms (as in 01-research, section 8).
- That the generated phone resembles no real model: only a person can judge that.

## 9. Sources

Image model: [2.6 prompting guide](https://developers.openai.com/api/docs/guides/image-prompting),
[image generation guide](https://developers.openai.com/api/docs/guides/image-generation),
[edit reference](https://developers.openai.com/api/reference/resources/images/methods/edit),
[generate reference](https://developers.openai.com/api/reference/resources/images/methods/generate),
[model page](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst).

Phones and screens: [foykes/gsm-arena-dataset](https://github.com/foykes/gsm-arena-dataset),
[arwinneil/phone-dataset](https://github.com/arwinneil/phone-dataset) and
[its copied data](https://github.com/TheOX7/Handphone-SAW-Algorithm-Streamlit),
[Journal of Human Ergology 39(2), 2010](https://www.jstage.jst.go.jp/article/jhe/39/2/39_133/_article/-char/en),
[MoDiP museum record](https://www.modip.ac.uk/artefact/aibdc-005286),
[1999 84 x 48 controller datasheet](https://cdn-shop.adafruit.com/datasheets/pcd8544.pdf),
[2003 96 x 65 driver datasheet](https://hobbielektronika.hu/forum/getfile.php?id=216142),
[Adafruit 84 x 48 module](https://www.adafruit.com/product/338),
[STN module datasheet](https://focuslcds.com/wp-content/uploads/Specs/G12864G-FTY-LW653_Spec.pdf),
[Orient Display on FSTN](https://www.orientdisplay.com/?p=23053),
[US 6,906,767](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6906767),
[US 7,787,078](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7787078),
[US 9,477,346](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9477346),
[libretro handheld LCD shader parameters](https://github.com/libretro/slang-shaders/blob/master/handheld/shaders/gameboy/shader-files/gb-params.inc).

Keypads and interface: [ITU-T E.161](https://www.itu.int/rec/T-REC-E.161),
[ETSI ES 202 130 V2.1.2](https://www.etsi.org/deliver/etsi_es/202100_202199/202130/02.01.02_60/es_202130v020102p.pdf),
[ETSI EG 202 132 V1.1.1](https://www.etsi.org/deliver/etsi_eg/202100_202199/202132/01.01.01_50/eg_202132v010101m.pdf),
[US 5,708,428](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5708428),
[US 5,818,437](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5818437),
[Nelson-Miller on laser etching](https://nelson-miller.com/how-laser-etching-is-performed-on-silicone-rubber-keypads),
[Wikipedia: SMS](https://en.wikipedia.org/wiki/SMS),
[Wikipedia: Predictive text](https://en.wikipedia.org/wiki/Predictive_text).

Fonts: [Tiny5](https://fontsource.org/fonts/tiny5), [Departure Mono](https://github.com/rektdeckard/departure-mono),
[Micro 5](https://fontsource.org/fonts/micro-5), [Jersey 10](https://fontsource.org/fonts/jersey-10),
[Silkscreen](https://fontsource.org/fonts/silkscreen), [Spleen](https://github.com/fcambus/spleen),
[monogram](https://datagoblin.itch.io/monogram), [VT323](https://fontsource.org/fonts/vt323),
[Barlow Semi Condensed](https://fontsource.org/fonts/barlow-semi-condensed).

Look and mood: [Wikipedia: Analog horror](https://en.wikipedia.org/wiki/Analog_horror),
[/Film on analog horror](https://www.slashfilm.com/1899869/analog-horror-skinamarink-subgenre-meaning-explained),
[Wikipedia: Sign-off](https://en.wikipedia.org/wiki/Sign-off),
[Wikipedia: Ghosting (television)](https://en.wikipedia.org/wiki/Ghosting_(television)),
[Wikipedia: Flyback transformer](https://en.wikipedia.org/wiki/Flyback_transformer),
[Wikipedia: Lamp (advertisement)](https://en.wikipedia.org/wiki/Lamp_(advertisement)),
[Wikipedia: The Twilight Zone (1959)](https://en.wikipedia.org/wiki/The_Twilight_Zone_(1959_TV_series)).

Build and voice: [Remotion cornerPin](https://www.remotion.dev/docs/effects/corner-pin),
[MDN matrix3d](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix3d),
[perspective-transform](https://www.npmjs.com/package/perspective-transform),
[ElevenLabs request stitching](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching),
[Bread n Beyond on reading pace](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/).
