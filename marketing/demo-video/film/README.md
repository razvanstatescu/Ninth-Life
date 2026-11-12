# "Hello again": the Ninth Life demo film

A 1:58 film (16:9, 1920 x 1080, 60 fps) for Kiroween 2026, built in Remotion. The plan behind it is
one folder up: `../07-revision-v2.md` (the brief for this second cut), `../README.md` (decisions),
`../research-v2/` (research). Build rules for anyone editing a scene: `STYLE.md` (its "Second cut"
section first).

## Render it

Needs Node 22, ffmpeg and python3 (with numpy and Pillow).

```bash
npm install
CONCURRENCY=8 bash scripts/render-final.sh
```

The script checks the decoder data, type-checks, runs the repository's trademark check, renders, runs
the flash check, normalises the loudness for YouTube, writes the captions and the thumbnail:

| Output (in `out/`) | What |
|---|---|
| `ninth-life-hello-again.mp4` | The film to upload (H.264 CRF 16, yuv420p, BT.709; AAC 320k at -14 LUFS, true peak under -1 dBTP) |
| `ninth-life-hello-again.srt` | Captions: the narrator, the app's spoken lines ("App voice:") and sound descriptions |
| `thumbnail.png` | 1280 x 720 |
| `flash-report.json` | The flash screening result (a screening tool, not a certified analysis) |
| `film-raw.mp4` | The render before the loudness pass |

A full render takes a few minutes on a recent Mac.

## Change things

| To change | Edit |
|---|---|
| The app's address on the end card | `src/config.ts` `APP_URL` (now `null`: the card says "Link in the description") |
| Any time in the film | `src/timeline.ts` (scenes, bars, the narrator's and the app's cues, quiet zones, music mutes); then `npx tsx scripts/check-narration.ts` |
| A sound | Replace the file in `public/audio/` with the same name, same format (48 kHz WAV) |
| The app's voice lines | `public/audio/voice/*.wav` and their word timings in `src/data/voice.json` |
| The narrator | `public/audio/narration/*.wav`, word timings in `src/data/narration.json`, the script in `scripts/audio/prompts/narration.json` |
| The mix | `src/audio/mix.ts` (levels, ducking under the narrator, which music files) |
| The music | `public/audio/music/act2-v2*.wav`: 90.000 s, 120 BPM, bar 1 beat 1 at 0 (film 0:28), with drums and other stems; `mix.ts` picks the variant |
| What the decoder shows | Nothing by hand: `npx tsx scripts/build-data.ts` rebuilds `src/data/decoded.json` from the real decoder and fails if a sentence the film relies on changes |
| App captures | `node scripts/capture/capture.mjs <group>` against the running app (http://localhost:3000/app); never `next build` while the dev server runs |

Preview a scene as a contact sheet (no Studio needed):

```bash
npx tsx scripts/contact.ts S07 0 359 12 out/s07.png --scale 0.3
```

The Remotion Studio (`npm run studio`) needs Chrome 149 or later with
`chrome://flags/#canvas-draw-element` enabled to preview the canvas effects of Act 1 and the camera
blur; renders work without it.

## How it was made

- **Picture:** Remotion 4.0.542. Act 1 uses `@remotion/effects` on `<HtmlInCanvas>` (static,
  scanlines, curve, colour fringe, vignette) over generated plates; Act 2 is built from the brand's
  components (`src/components/brand/`) and real captures of the running app.
- **Data:** every sentence, guess and key code is the output of the app's own offline decoder
  (`@ninth/core`).
- **Stills:** OpenAI `gpt-image-2.6-sunburst` (Act 1 plates), records in `manifest/images.json`,
  scripts in `scripts/images/`.
- **Sound:** ElevenLabs music (`music_v2_5`), sound effects (`eleven_text_to_sound_v3`) and speech
  (`eleven_multilingual_v2`, voice "Angela"); key tones, hum, hiss, room tone, whooshes and several
  effects synthesised with ffmpeg. Records in `manifest/audio.json`, scripts and prompts in
  `scripts/audio/`.
- **Captures:** Playwright against the running app, records in `manifest/captures.json`.
- **Team:** built with Claude Code by a lead and seven agents (research, sound, captures, Act 1,
  three Act 2 builders). Not built in Kiro; do not list it as Kiro work.

## Folder

```
src/
  timeline.ts tokens.ts fonts.ts config.ts     shared settings (lead)
  lib/        anim.ts camera.tsx               motion vocabulary, camera with motion blur
  components/ brand/ type/                     brand parts, kinetic type (lead)
              act1/ open/ mid/ close/          each builder's own parts
  audio/      Audio.tsx                        sound placement, music and voice (Soundtrack)
  scenes/     S01.tsx ... S16.tsx Act1Sound.tsx
  data/       decoded.json voice.json music.json captures.json plates.json
  Film.tsx Root.tsx Thumbnail.tsx BeatCheck.tsx Lab.tsx
public/       fonts/ (OFL) img/ audio/ captures/
scripts/      render-final.sh contact.ts build-data.ts check-flashes.py finish-audio.py make-srt.ts
              audio/ images/ capture/
manifest/     audio.json images.json captures.json (where every asset came from)
```

`public/` holds about 135 MB of assets (the music stems alone are about 33 MB and are not used by the
film). Decide before committing whether to keep them in git or in storage.
