# Demo video: "Hello again"

The plan for a 1:54 film about Ninth Life, for Kiroween 2026 (Resurrection category).
Written 2026-11-10.

**Status (2026-11-19): third cut, 2:18.** The real app in the middle (a 10 s reel of real captures) and a narrated
14 s Kiro chapter: [08-revision-v3.md](08-revision-v3.md).

**Status (2026-11-11): second cut built, 1:58.** After the owner's review of the first cut, the brief became
[07-revision-v2.md](07-revision-v2.md); its research is in [research-v2/](research-v2/). The changes:
- a narrator, as one continuous story;
- a photoreal, generic phone with a period phone screen in Act 1;
- Act 2 told as problem, solution, features;
- the "lit night studio" look;
- no tablet;
- a simple end.

The film is in [film/](film/) (Remotion). Render it with `bash film/scripts/render-final.sh`; the outputs go to `film/out/`. How to
change it: [film/README.md](film/README.md). Build rules: [film/STYLE.md](film/STYLE.md), section "Second cut" first.

Before upload, a person still has to:
- **listen:** the narrator (Frederick), the music with its soft added kick and shaker, the four app lines and the old-phone sounds;
- **look:** confirm the generated phone in Act 1 resembles no real model (`film/out/act1-v2/lookalike-check.png`);
- **set** the app's address in `film/src/config.ts`.

Everything above this line in the plan describes the first cut; where it differs from 07, 07 wins.

## The film in five lines

- **Act 1, "Dead air" (28 s).** An old television at night. Static. A plain old keypad phone writes "hello" on
  its pixel screen with five key presses. Glass replaces the keys; the set switches off. One dot stays lit. "Old is not
  the same as bad."
- **Act 2, "Ninth life" (86 s).** The dot turns ember and becomes the ninth key. The same five presses, and the
  app says "Hello again." Then, fast and on the beat: who it is for, how it works, the proof check, offline and
  private, switch scanning, Built with Kiro, the end card.
- **No narrator.** The only voice in the film is the app's voice, three times, each time in silence or under
  lowered music.
- **Noise is the old world, calm is the brand.** Static and stepped motion exist only in Act 1. Act 2 is the
  brand's night, moon and one ember light, moving fast but never bouncing.
- **Tools.** Remotion for the film, ElevenLabs for music, effects and the voice, an OpenAI image model for seven still
  pictures in Act 1. Key tones are made by us; all app footage is the real app.

## The documents

| File | What it holds | Read it if you |
|---|---|---|
| [01-research.md](01-research.md) | Hackathon rules and judging, the resurrection theme, the style, the old look, viewer safety, the keypad's history, tool facts, all with sources | want to know why |
| [02-creative-direction.md](02-creative-direction.md) | The idea, the story, the two looks, motion and sound rules, Halloween without a costume, where this departs from the brand book | decide or review the look |
| [03-script-storyboard.md](03-script-storyboard.md) | Every scene with times, pictures, words, motion and sound | review the content |
| [04-asset-plan.md](04-asset-plan.md) | Pictures and prompts, app captures, key tones, music and effects, the voice, fonts, cost | generate or approve assets |
| [05-production-guide.md](05-production-guide.md) | Instructions for the coding agent: rules, layout, order of work, techniques, checks, render | build it |

## Decided by the owner on 2026-11-10

| # | Question | Decision |
|---|---|---|
| D1 | The brand book says slow fades, no music and real recordings only. Does that bind the film? | No. Those lines were written mainly for the app and the website. The film is free in how it moves and sounds. What it still keeps from the brand is listed in the creative direction, section 10 |
| D2 | The app's voice in the film | Generated with ElevenLabs, like the music and the sound effects. The video description says so, because in the app the voice comes from the device |
| D3 | May Act 1 show a whole phone? | The owner left it to the art direction. Yes: one plain phone of our own design, in two shots (2a and 4b). It must not pass for any real model; if no generated take passes that check, the film falls back to close-ups (creative direction, section 7) |
| | Picture format | 16:9, 1920 x 1080 |

## Still open

D7 blocks the start. The others block a later phase.

| # | Question | Recommendation | Needed by |
|---|---|---|---|
| **D7** | Is this the video submitted to the hackathon, replacing the 2:50 script, or an extra film? | It is the submission video. It shows the app working end to end, which is what the Presentation criterion asks. The price: Kiro gets 6 s instead of 25 s, so the Kiro write-up must carry that part alone | Start |
| **D4** | 9-key predictive text grew out of work on communication tools for people with disabilities (research, section 5). It is the strongest story fact we have. Put a line about it in the film? | Not in the film: it moves the film toward a disability framing that the product's stated purpose avoids. Use it in the Devpost text as cited background, after adding the sources to `docs/research/` | Before the animatic is approved |
| **D5** | Scene 14 (Built with Kiro, 6 s) needs at least three captures of real Kiro work, each with a row in `docs/KIRO_LOG.md`. The evidence folder does not exist yet | Plan the full scene and collect the captures by the feature freeze. The storyboard has a short version if there are fewer than three | Finish phase |
| **D6** | 60 frames a second (smoother, and part of the old-versus-new contrast) or 30 (half the render time)? | 60. Every time in the film comes from one file, so falling back to 30 is one change | Set-up |
| **D8** | The video description and write-up should say which tools made the film. `trademarks.md` does not list Remotion, ElevenLabs or OpenAI under "Fine to name" | Name them in the description and the write-up, never in the picture, and add them to the steering file's list | Upload |
| **D9** | The end card needs the app's public address | | Finish phase |

## Things to know

- **No maker's name, and no real phone.** The brief asked for the look of one well-known maker's old keypad
  phones. This repository never writes that maker's name, or the usual two-character name for 9-key predictive
  text, and the hackathon bans third-party trademarks in the video. So the phone in Act 1 is an invented, plain
  one, the documents say "the old phone keypad" and "9-key predictive text", and the image prompts name no
  product. `node scripts/tm-lint.mjs` passes with this folder included.
- **The phone picture is the riskiest asset.** Image models drift toward the famous handsets of that time. A
  person must compare each take with them before it is used.
- **Medical pictures of resurrection are out**: no heart monitor, no flat line, no defibrillator. They would work
  against the product's stated purpose. The resurrection is a signal coming back.
- **Static is used with limits.** Fine, low-contrast, 12 changes a second, short bursts, and a flash check on the
  final file (creative direction, section 9).
- **"Hypermotion" is not an established term**; it is a few studios' name. The creative direction defines what it
  means here.
- **The image model is not called "gpt image 2.6".** The current ids are `gpt-image-2.6-sunburst` (detailed) and
  `gpt-image-2.6-flare` (drafts). It has no seed and cannot make 1920 x 1080; the plan uses 2560 x 1440 and a
  reference picture for consistency.
- **A paid ElevenLabs plan is required** for the API and the licence. About 15,000 to 20,000 credits.
- **The Remotion skill installed on this machine is out of date** (February 2026). The guide says to reinstall it
  first.
- **The app is still early.** App captures are made by a script and can be redone in minutes when the app
  changes, so they come last.

## What was and was not verified

- Verified in this repository on 2026-11-10: every sentence, key code and candidate list in the storyboard, by
  running the real offline decoder; the brand rules; the app's screens.
- Second-hand: all web research (three research agents). Devpost's pages refuse automated readers, so the rules
  are quoted from search extracts and from the team's own notes of 2026-11-06. **Read the live rules page by hand
  before the cut is locked.**
- Not verified: per-voice licence terms for the chosen ElevenLabs voice; OpenAI's output ownership terms; transparent backgrounds and
  custom sizes on the 2.6 image models; render time; how past winners' videos were structured. The full list is
  in research, section 8.

## A possible schedule

The deadline is 4 December 2026, 2:00 pm Pacific Time; the team's own submit day is 3 December.

| By | What |
|---|---|
| 13 Nov | Decision D7. Project set up. Animatic watched and agreed |
| 20 Nov | Act 2 built with today's captures. Act 1 pictures approved |
| 26 Nov | The app's feature freeze. Music, effects and voice approved |
| 28 Nov | Final captures from the frozen app. Picture lock |
| 1 Dec | Checks passed, final render, captions, thumbnail |
| 2 Dec | Public upload, played signed out, link in Devpost |
