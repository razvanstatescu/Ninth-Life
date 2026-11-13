# Research

Checked **2026-11-10**. This file holds the facts behind the creative direction and the production guide.
Each fact has a source. "Not verified" means exactly that: check it before relying on it.

How it was gathered: the repository was read directly. The web research was done by three research agents and
is second-hand to this file; where a page could not be opened (Devpost and a few policy pages answer automated
readers with an error), the fact comes from a search-engine extract of that page and is marked.

Two web addresses are left out on purpose because they contain a word this repository never writes
(`.kiro/steering/trademarks.md`). They are described in words instead.

## 1. The hackathon

Kiroween 2026, category **Resurrection**: "Bring your favorite dead technology back to life. Reimagine obsolete
tech with today's innovations or solving tomorrow's problems." Tagline of the 2026 edition: "Build something
wicked and git commit to the darkness."

Source for this section unless noted: https://kiroween.devpost.com/rules and https://kiroween.devpost.com/ , read
through search extracts on 2026-11-10, and matching rows R-01 to R-09 of `docs/research/assumptions-register.md`
(read by the team on 2026-11-06). **Read the live rules page once by hand before the cut is locked.**

### Video rules

| Rule | Wording | What it means for this film |
|---|---|---|
| Length | "should be less than three (3) minutes. Judges are not required to watch beyond three minutes." | 1:54 is safe |
| Content | "should include footage that shows the Project functioning on the device for which it was built." | Real captures of the app on a phone, a tablet and a laptop-width window are required, not optional |
| Hosting | "Upload it to YouTube and make it public." | Public, not unlisted. Check it plays signed out |
| Other people's material | "must not include third party trademarks, or copyrighted music or other material unless the Entrant has permission to use such material." | No maker names, logos or recognisable products; music and sounds must be ours or licensed to us |
| Language | English | All text in English |
| Generated content | No rule about generated pictures, music or voice was found | Not verified. Say in the video description what was generated and with what |
| Deadline | 4 December 2026, 2:00 pm Pacific Time | The team's own submit day is 3 December (`docs/submission/CHECKLIST.md`) |

### How it is judged

Stage one is a pass or fail check on theme fit and use of Kiro. Stage two has five criteria of equal weight, 20%
each:

| Criterion | What the judges ask | Where the film answers |
|---|---|---|
| Potential Impact | A real problem for a real audience; would it be used | Scene 9 |
| Technological Implementation | How well and how widely Kiro is used | Scene 14, but mostly the repository and the write-up |
| Design | "a complete, coherent product experience, not just a technical proof of concept"; "intuitive, polished, and intentional" | Every capture; the film's own finish |
| Innovation/Idea | How new the idea is | Acts 1 and 2 together; scene 11 |
| Presentation | "Does the video clearly demonstrate the project working end-to-end?" "Does the pitch communicate what problem is solved, who it's for, and why it matters?" "Is the presentation creative and memorable?" | Scenes 7, 9, 10 to 13; the voice |

- Judges "may choose to judge based solely on the text description, images, and video". The film may be all a
  judge sees of the app.
- Judging "may utilize expert panels, peer review, automated AI-driven analysis". Plain on-screen text and a
  caption file help a machine reader as well as a person.
- **Best Demo** ($1,000) goes to the highest Presentation score among the top 10% overall. No entry step.
- No rule found requires Kiro footage in the video. Kiro use is shown by the `/.kiro` folder and the write-up. A
  short Kiro scene is prudent, because a judge may score from the video alone; it is not mandatory.
- A spooky look is asked for only in the Costume Contest category. For Resurrection it is flavour, not a scored
  item.

### What earlier winners did

From the 2025 gallery (search extract of https://kiroween-2025.devpost.com/project-gallery; the videos could not
be watched, so their structure is **not verified**):

- The 2025 Resurrection winner brought back the fax machine as an interface for older people who are left behind
  by apps (https://faxi.jp/en/). It framed old hardware as the answer to a present human need, not as nostalgia.
- A project that put a social network on an old flip phone won a judges' choice award. Keypad phones as a
  resurrection subject are not new to these judges, so the film's own idea (the keypad gets a voice) must be
  clear early.

### Advice from the organiser's platform

Devpost, "6 tips for making a winning hackathon demo video"
(https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video) and "How to present a successful
hackathon demo" (https://info.devpost.com/blog/how-to-present-a-successful-hackathon-demo):

- "Start with your pitch and a quick overview of your project before diving in."
- Say what it does, how it solves the problem and how it works.
- "Make your presentation clear and concise. Don't try to pack in way too much information."
- "Skip mundane flows."

Consequence: Act 1 is kept to 28 s, the product is on screen at 0:28 and has spoken by 0:38, and each scene of
Act 2 makes one point.

## 2. The resurrection theme

Ways film and advertising show something coming back, and what this film does with each:

| Motif | Reference | Use here |
|---|---|---|
| A dead screen flickers on | The switch-on and switch-off of a tube television | Yes. Scenes 1 and 4. The best fit, because the product is a screen |
| Static as a channel to somewhere else | The haunted television of 1980s horror films (https://www.pajiba.com/film_reviews/kill-your-television-poltergeist-turns-40.php) | Yes, quietly: the 3 by 3 dots in scene 5 |
| A spark travelling through a circuit | The title sequence of "Halt and Catch Fire" (https://www.artofthetitle.com/feature/top-10-title-sequences-of-2014/) | In spirit: one light that becomes a key |
| Ember from ashes | Much used in press about relaunched old phones | Restrained: an ember glow, never a phoenix |
| A mock funeral, then a return | Brand relaunch campaigns | No |
| The laboratory and "it's alive" | The 1931 film | No. A heavy cliché |
| Flat line to heartbeat, defibrillator | Very common | **Never.** Worn out, and medical (creative direction, section 6) |
| A cat with nine lives | No outside reference; it is the product's own name and icon | Yes, only through the icon and the number nine |

Grown-up Halloween, as opposed to cartoon Halloween:

- The "Stranger Things" titles are type only, with light through real film for imperfection
  (https://www.maxon.net/en/article/animating-the-stranger-things-title-sequence-case-study). Type and light can
  carry a spooky mood without a single monster.
- Decor and brand guides agree on deep amber on plum or black, low warm light, and a seasonal look that is "a
  natural extension, not an out-of-character deviation" of the brand
  (https://www.bigpartnership.co.uk/?p=1603, search extract). That is the brand's palette already.

## 3. The "hypermotion" style

**It is not an established term.** No motion-design publication or glossary defines it. It appears as the name of
studios and tools that make fast product launch films (https://hypermotion.art/ offers 16 s and 24 s templates;
https://www.hypermotionstudios.com/ promises to "explain the product in under 60 seconds"). This project uses the
word as a working label and defines it in the creative direction, section 5.

### References to study

| Film | Why |
|---|---|
| Apple, "Don't Blink" (2016), 107 s | The best-documented fast type-driven film. Breakdown: https://motionographer.com/2016/09/14/4-ways-dont-blink-is-a-masterclass-of-type-and-rhythm/ |
| Raycast, "New Raycast. Coming 2026", 0:39 (https://www.youtube.com/watch?v=Mi173xGb0ZA) | Cropped pieces of a dark interface, names ticking past |
| Figma, "Introducing Figma Motion" (2026), 1:09 (https://www.youtube.com/watch?v=l3HuAYXyOTo) | Interface parts as the actors |
| Remotion's own trailers, made in Remotion with public source: https://github.com/remotion-dev/trailer-lambda | Proof the style can be built with this tool, and code to read |
| `trycua/launchpad`, an MIT-licensed Remotion template for launch films | Structure of a launch film as code |

The second and third were described by https://www.moonb.io/blog/product-launch-video and not watched here.

### Craft rules with a source

- In "Don't Blink" most words are on screen for 5 to 7 frames at 30 frames a second (about 0.2 s), almost all of
  one or two syllables. There is **one** dead stop and **one** move into depth in the whole film. Lesson: speed
  needs rests, and one special move is stronger than many.
- No standard limits words on screen. A working ceiling borrowed from subtitle practice is 20 characters a
  second: plan 2 short words a second, never more than 3
  (https://oakgen.ai/blog/kinetic-typography-without-after-effects, search extract).
- "Simplify real screens before animating them"; zoomed call-outs; one workflow per short demo
  (https://hera.video/templates/ui-animation-product-demo, search extract).
- Sound: a whoosh that ends on a dull hit gives a title somewhere to land; a riser that stops dead before the cut
  hits harder; clicks only when something visibly stops, attaches or appears
  (https://sonilo.com/ai-music/whoosh-sound-effect-guide, search extract).
- 120 beats a minute gives a whole number of frames per beat (15 at 30 frames a second, 30 at 60). Tempos such as
  128 do not, and drift.

Not verified: a typical tempo or shot length for this style. The numbers in the storyboard are this project's
own choices.

## 4. The old look, and viewer safety

### Television picture

- A known CSS recipe (https://aleclownes.com/2017/02/01/crt-display.html): scanlines as a 2 px repeating gradient
  with the dark half at 25% black; a faint red, green and blue stripe every 3 px; colour fringes from a blue and
  a red shadow offset by up to 4 px.
- Static must change its random seed over time; do not stack scanlines on top of a second fine mask, which makes
  moiré (search extract, https://moshpro.app/guides/retro-effects/).
- Tracking lines refresh about 12 times a second in common shader recipes.
- Switching off: the bright line is thinner at its ends, thicker in the middle and shrinks at a slowing rate. It
  is not a snap (a recollection on https://creativecow.net/?p=940531, search extract).
- Not verified: sourced numbers for screen curve, picture roll or phosphor fade. Set them by eye.

### Pixel screen of an early-2000s phone

- 84 by 48 pixels, dark dots on a light ground (https://learn.adafruit.com/, product guide for the common
  84 x 48 monochrome display module, search extract).
- A palette used by pixel-art game jams for this kind of screen: light `#c7f0d8`, dark `#43523d`. It is a
  convention among hobbyists, not a measured value. (The source's address contains a maker's name and is left out.)
- Not verified: response time ("ghosting") or the exact form of status icons. All icons in the film are our own
  drawings in any case.

### Free pixel fonts

All SIL Open Font License 1.1, so they may be used and shipped in a film.

| Font | Look | Use |
|---|---|---|
| Tiny5 (https://fontsource.org/fonts/tiny5/about) | A 5-pixel grid, after 1980s and 1990s calculators and digital devices | The pixel screen |
| Doto (https://fontsource.org/fonts/doto/about) | Dot matrix on a 6 by 10 grid, with variable dot size | An alternative for the pixel screen |
| VT323 (https://fontsource.org/fonts/vt323/about) | A tube terminal | The television's own display and Act 1's caption lines |
| Pixelify Sans, Silkscreen | Rounder pixel faces | Spares |

None of these copies a phone maker's font.

### Flashing and patterns

**WCAG 2.2, success criterion 2.3.1**
(https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html):

- Content must not flash "more than three times in any one second period", unless the flash is below the
  thresholds.
- A general flash is "a pair of opposing changes in relative luminance of 10% or more of the maximum relative
  luminance (1.0)" where the darker image is below 0.80.
- A red flash is "any pair of opposing transitions involving a saturated red".
- The area that matters is a quarter of a 10 degree field of view, about 341 by 256 px on a 1024 by 768 screen.
- Exception: "a fine, balanced, pattern such as white noise or an alternating checkerboard pattern" with squares
  smaller than 0.1 degree.

**ITU-R BT.1702**, the broadcast guidance
(https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1702-3-202311-I!!PDF-E.pdf):

- More than three flashes a second over more than 25% of the screen is not permitted.
- **Fast cuts count as flashes.**
- A flashing sequence longer than 5 s may be a risk even when it keeps to the limit.
- Regular patterns: more than five pairs of light and dark stripes are a risk when they cover more than 40% of
  the screen and stand still, or more than 25% and move or flash. A pattern flowing smoothly in one direction is
  exempt.

Ofcom's rule 2.12 asks UK broadcasters for the same care; its guidance note could not be opened and is **not
verified** here.

What follows for this film is in the creative direction, section 9. In short: fine, low-contrast static that
changes 12 times a second; faint scanlines that never flash; no bright-dark-bright cutting in Act 2; no red.

## 5. The history of 9-key predictive text

Background for the write-up and for scene 5. `docs/submission/VIDEO_SCRIPT.md` notes that the old opening line
("In 1998 this keypad was built so people who could not speak could type") had no source. These are the sources
found.

| Fact | Source | Strength |
|---|---|---|
| The patent "Reduced keyboard disambiguating computer", US 5,818,437, names Dale L. Grover, Martin T. King and Clifford A. Kushler; filed 26 July 1995, granted 6 October 1998; assigned to Tegic Communications | https://patents.google.com/patent/US5818437 (search extract) | Primary document |
| The method "was born out of the work that King and his co-founder Cliff Kushler did in developing products for people with disabilities". King had built an eye-tracking communication device; the two studied writing with only a few eye positions | Wired, 23 September 2010, a feature written after Martin King's death, republished by Gizmodo. Its title and address contain a word this repository does not write | Journalism |
| It was "a direct development of his early work on a low-cost eye-tracking system" | Quentin Stafford-Fraser, a business partner of King: https://statusq.org/archives/2010/09/20/ | A colleague's tribute |
| "Since 1999 it has surfaced in commercial products" (phones) | MacKenzie and Soukoreff: https://www.yorku.ca/mack/hci3.html | Academic |
| With it, a letter takes about 1.007 key presses; the older multi-press method takes about 2.03 | https://www.yorku.ca/mack/uist01.html (search extract) | Academic |
| A model predicts an expert at up to 40.6 words a minute with one thumb. This is a model's upper bound, not a measurement of people | Silfverberg, MacKenzie and Korhonen, CHI 2000: https://www.yorku.ca/mack/chi00.html | Academic, a prediction |
| The letters on the keys follow a public standard, ITU-T E.161 | https://www.itu.int/rec/T-REC-E.161 | Standard |
| "Shipped on more than 2.5 billion devices" (2007); "about four billion phones" (2010) | A vendor's filing and the Wired feature | Vendor numbers; do not put them on screen |
| Smartphones first outsold feature phones in 2013 | Gartner, as reported in the press (search extract) | Secondary |

What this means:

- **The strongest story fact is true enough to tell, with care:** the idea came out of work on communication
  tools for people with disabilities. Two independent accounts say so. No primary document was found, so say
  "grew out of work on", not "was built for", and give no year for that.
- The year 1998 is the year the patent was granted, not the year of the assistive work. The old line mixed the two.
- Do not link the keypad's decline to one product or one year; no source was found for the cause.
- No speed number belongs in the film. The 40.6 figure is a model, and `product.md` bans speed claims that our
  own tests did not measure.
- Whether this history appears in the film is decision D4 in the [README](README.md). It names no medical
  condition, but it brings the film closer to a disability framing than the product's stated purpose does. The
  default is to keep it out of the film and to cite it in the Devpost text as background, which `product.md`
  allows. To use it in any shipped text, first add the sources to `docs/research/` (the two full addresses can
  only go in `docs/research/assumptions-register.md`, the one research file the trademark check lets name them).

## 6. The tools

### Remotion

| Fact | Source |
|---|---|
| Latest release 4.0.542; version 5 is not out | https://github.com/remotion-dev/remotion/releases |
| Free for an individual, a company of up to 3 employees, or "an organization or team of individuals with up to 3 people". Contractors on the same project count. The team is 3 people | https://www.remotion.dev/docs/license/faq |
| New project: `npx create-video@latest --yes --blank --no-tailwind .` (the folder must be empty). Existing project: add `remotion` and `@remotion/cli` at the same exact version, with no `^` | https://www.remotion.dev/docs/getting-started , https://www.remotion.dev/docs/brownfield |
| `@remotion/effects` (since 4.0.464) has about 90 effects, among them `whiteNoise`, `noise`, `scanlines`, `barrelDistortion`, `chromaticAberration`, `vignette`, `glow`. They are passed in an `effects` prop. `createEffect()` makes custom ones | https://www.remotion.dev/docs/effects , https://www.remotion.dev/docs/create-effect |
| `<HtmlInCanvas>` (since 4.0.455) draws ordinary React and CSS into a canvas so effects can be applied. It needs `--gl=angle` when rendering; in the Studio it needs Chrome 149 or later with the flag `chrome://flags/#canvas-draw-element`. Images from other origins are dropped unless served with CORS headers | https://www.remotion.dev/docs/html-in-canvas |
| `@remotion/media` gives the recommended `<Audio>` and `<Video>`. Volume is a number driven by `interpolate()`; there is no fade prop. `trimBefore`, `durationInFrames`, `loop`, `playbackRate` | https://www.remotion.dev/docs/media/audio |
| `@remotion/transitions`: `TransitionSeries`, many presentations (fade, slide, wipe, zoom-blur, linear-blur and more) and custom ones | https://www.remotion.dev/docs/transitions |
| `@remotion/motion-blur`: `<HtmlInCanvasMotionBlur>` (recommended), `<CameraMotionBlur>`, `<Trail>` | https://www.remotion.dev/docs/motion-blur |
| `@remotion/google-fonts` includes Atkinson Hyperlegible Next and Atkinson Hyperlegible Mono | The package source |
| Animate only from `useCurrentFrame()`. CSS transitions and animations "will not render correctly". Use `random(seed)`, never `Math.random()`. Avoid `background-image` and `mask-image` (flicker) | https://www.remotion.dev/docs/flickering , https://www.remotion.dev/docs/using-randomness |
| Render defaults: H.264, CRF 18, audio 320 kbit/s. Options: `--pixel-format`, `--color-space bt709`, `--concurrency`, `npx remotion benchmark` | https://www.remotion.dev/docs/encoding , https://www.remotion.dev/docs/cli/render |
| Slow without a graphics card: `box-shadow`, `text-shadow`, gradients, blur filters, canvas and WebGL. The `angle` renderer leaks memory on long renders, so render in parts | https://www.remotion.dev/docs/gpu , https://www.remotion.dev/docs/gl-options |
| Official skills for coding agents: `npx remotion skills add`. **The copy of the skill on this machine dates from February 2026 and knows nothing of effects or `<HtmlInCanvas>`: reinstall it first** | https://www.remotion.dev/docs/ai/skills , https://www.remotion.dev/docs/ai/claude-code-plugin |

Not verified: an official guide for a pnpm monorepo, an official recipe for cutting to the beat, and any figure
for render time. `@remotion/sfx` offers hosted sounds, each under its own licence; this film does not use them.

### ElevenLabs

| Fact | Source |
|---|---|
| Music: `POST /v1/music`. Set `model_id` to `music_v2_5` (the default is an older model that is being removed). Either a `prompt` with `music_length_ms`, or a `composition_plan` of sections, each with its own text and `duration_ms` (3 to 120 s), which is kept exactly. `force_instrumental`. A `seed` works only with a plan and only roughly | https://elevenlabs.io/docs/api-reference/music/compose |
| The music model "accurately follows BPM"; write the tempo and key in the prompt | https://elevenlabs.io/docs/overview/capabilities/music/best-practices |
| Naming a band or musician in a prompt is refused | https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music/quickstart |
| Stems can be separated afterwards: `POST /v1/music/stem-separation` | https://elevenlabs.io/docs/api-reference/music/separate-stems |
| Music licence: paid plans allow "All online and offline commercial use permitted, except film, TV, radio, and Studio Games". The free plan needs attribution and has no downloads. The API needs a paid plan | https://elevenlabs.io/music-terms |
| Sound effects: `POST /v1/sound-generation`, `model_id` `eleven_text_to_sound_v3`, `text`, `duration_seconds` 0.5 to 30, `prompt_influence` 0 to 1 (default 0.3), `loop`. MP3, or 48 kHz WAV when not looping. Royalty-free; commercial use needs a paid plan | https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert |
| Speech: models `eleven_v4` (best), `eleven_multilingual_v2` (most stable). The default voices "will expire on December 31, 2026". Paid plans include a commercial licence | https://elevenlabs.io/docs/overview/models , https://elevenlabs.io/docs/overview/capabilities/voices |
| Rough cost of this film: 6 music takes of 2 minutes, about 10,800 credits; 40 effects, 3,200 to 8,000; a few spoken lines, under 200. About 15,000 to 20,000 credits. The $6 plan has 30,000; the $22 plan has 121,000 | https://elevenlabs.io/pricing |

An online hackathon video is "online commercial use", so a paid plan covers it. That reading is ours; the terms
were not checked by a lawyer.

### OpenAI image model

| Fact | Source |
|---|---|
| There is no model called exactly "gpt image 2.6". The current ones are **`gpt-image-2.6-sunburst`** (detailed work) and **`gpt-image-2.6-flare`** (fast drafts) | https://developers.openai.com/api/docs/models |
| Endpoints: `/v1/images/generations` and `/v1/images/edits`. `quality`: low to max. `background`: transparent, opaque, auto. Output: png, jpeg, webp. Up to 10 pictures a call. Edits take 1 to 16 input pictures | https://developers.openai.com/api/reference/resources/images/methods/generate |
| **No seed.** For a consistent series, make one style picture first and pass it to `/v1/images/edits` for every later picture, repeating the same style text and saying what changes | https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide |
| Sizes must be multiples of 16, up to 3840 on the long side. **1920 x 1080 is not valid.** Use 2560 x 1440 (exact 16:9) and scale down | https://developers.openai.com/api/docs/guides/image-generation |
| Custom sizes and transparent backgrounds are written up for the 2.5 models; for 2.6 they are **not verified**. Test first; fall back to 1536 x 1024 and crop | Same |
| Price: $30 per million picture output tokens; no per-picture table. Budget a few dollars for 60 to 80 pictures | https://developers.openai.com/api/docs/pricing |
| Pictures carry content credentials and a watermark signal, which editing or converting may remove | https://developers.openai.com/api/docs/guides/content-provenance |

Not verified: OpenAI's terms on who owns the output (the policy pages could not be opened). Read
https://openai.com/policies/ before publishing.

## 7. What the repository already gives the film

| Thing | Where | Note |
|---|---|---|
| Brand colours, type, sizes, motion tokens | `design/system/tokens.json` | The single source for Act 2's look |
| Component CSS with an `nl-` prefix | `design/system/components/bundle.css` | Hero shots are built from this |
| Logo files and rules | `design/system/assets/Logos/` | The icon is never animated, tilted or put on a phone |
| The brand book, with a video surface | `design/system/README.md`, `design/artboards/Video-social.dc.html` | Written mainly for the app and the website; the owner confirmed on 2026-11-10 that its motion and video lines do not bind this film (creative direction, section 10) |
| An earlier 2:50 script with a narrator | `docs/submission/VIDEO_SCRIPT.md` | Its rules on trademarks, voice names and the end card still apply. Its length, narrator, "no music" and "never draw a phone" do not (owner's decisions, 2026-11-10) |
| The real decoder | `packages/core` (`decodeGhost`, `encodeWord`) and `data/lexicon/` | Used to check every sentence in the storyboard |
| A demo that already replays real decoder output | `packages/web/components/site/site-data.ts`, `KeypadDemo.tsx` | The pattern to copy for build-time data |
| The app: phone, tablet and wide layouts, Night and Day | `packages/web`, screenshots in `docs/a11y/screens/` | Early, but every screen the storyboard needs exists: main screen, sentences, proof, scanning, settings, Show mode |
| Measured results | `packages/eval/RESULTS.md` | The film shows no numbers. If one is ever added it comes from here, with the method |
| The trademark check | `scripts/tm-lint.mjs` | Scans `marketing/` too, prompts included |
| Kiro evidence | `docs/KIRO_LOG.md`; `docs/kiro/evidence/` | The evidence folder does not exist yet. Scene 14 depends on it |
| Keys for the tools | `marketing/.env` (`OPENAI_API_KEY`, `ELEVENLABS_API_KEY`) | Ignored by git. Never print or commit it |

## 8. Open points

- The live rules page has not been read directly since 2026-11-06.
- No winning 2025 demo video was watched.
- Whether the chosen ElevenLabs voice is cleared for commercial use on the plan in use (per-voice terms were
  not checked).
- Transparent backgrounds and custom sizes on the 2.6 image models.
- Render time for a 2-minute film with canvas effects on the team's machine.
- OpenAI's and ElevenLabs's terms were read as documentation, not as legal advice.
