# 14. The narrator's voice and the mix

Written 2026-11-10 for the second cut of "Hello again". The owner now wants a narrator: in Act 1 where there is text
on screen and when the set goes dark, and through Act 2 as one continuous story. This replaces rule 1 of
`02-creative-direction.md` ("No narrator"). The app's own voice stays as it is: ElevenLabs "Angela"
(`PT4nqlKZfc06VW1BuClj`, `eleven_multilingual_v2`), three lines.

**How this was done.** Nobody could listen. Every judgement below comes from measurements of real test reads,
from the voice library's own data, and from the cited documents. A person must still listen to the comparison file
(section 3.7) before the voice is locked.

## 0. In one screen

| | |
|---|---|
| **Narrator** | **Frederick Surrey - Smooth and Velvety**, voice id `j9jfwdrw7BRfcR43Qohk` (library voice, male, British, middle-aged). Runner-up: **James**, `EkK5I93UQWFDigLMpZcX` (male, American), if the owner wants an American narrator or a brighter voice |
| **Model** | `eleven_v4` |
| **Settings** | `stability` 0.6, `similarity_boost` 0.8. Nothing else exists on v4 (no style, no speed, no SSML) |
| **Delivery** | Act 1 lines start with the tag `[quiet, measured narration]` (or `[softly]`); Act 2 lines untagged. Fixed `seed` per line. `previous_request_ids` (up to 3) inside one act only |
| **Format** | `POST /v1/text-to-speech/{voice_id}/with-timestamps?output_format=wav_48000` (48 kHz, 16-bit, mono, with character times) |
| **Why not a woman's voice** | Both tested women sit at Angela's pitch: Jane −0.2 / +2.0 semitones, Verity −2.1 / −0.1. Frederick sits 9 to 11 semitones below her, with a different accent |
| **Credits used** | **1,158** (1,100 speech, 58 transcription), by the per-request `character-cost` header. The account counter went from 7,027 to 8,205 (+1,178) of 30,054; **21,849 left**. The 20-credit gap is unexplained (another agent, or counter lag) |
| **Comparison file** | `marketing/demo-video/film/_takes/narrator-tests/compare/narrator-compare.wav` (also `.m4a`, 86 s; order in section 3.7) |
| **Mix in one line** | Narrator 2 LU under the app voice; music at least 11 LU under the narrator while he speaks (about a 15 dB dip of today's track, or drums −18 dB and the rest −12 dB); limit the narrator to −6.5 dBTP; the whole film still goes to −14 LUFS through `finish-audio.py` |

## 1. ElevenLabs text to speech today

Checked against the live API (`GET /v1/models`, this account, 2026-11-10) and the docs.

| Model id | What it is | Voice settings | Tags | Stitching | Max characters | Cost here (measured) |
|---|---|---|---|---|---|---|
| `eleven_v4` | Newest, released 28 Sep 2026; "our highest-quality model, ideal for content creation, audiobooks" ([v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4), [launch post](https://elevenlabs.io/blog/eleven-v4)) | stability, similarity only | yes, free text in `[ ]` | yes | 10,000 | 92 chars → 20 credits, 56 → 12 |
| `eleven_v4_turbo` | Real-time variant for agents, ~100 ms latency ([models](https://elevenlabs.io/docs/overview/models)) | same | yes | not documented | 10,000 (API) | rate ×0.5 (API); not tested |
| `eleven_v3` | Previous generation, "dramatic delivery" ([models](https://elevenlabs.io/docs/overview/models)) | — | yes | **no** ([stitching guide](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching)) | 5,000 | not tested |
| `eleven_multilingual_v2` | Previous generation; "Most stable on long-form generations" ([models](https://elevenlabs.io/docs/overview/models)) | stability, similarity, style, speaker boost, speed 0.7-1.2 | no (read aloud) | yes | 10,000 | 56 chars → 12 credits |
| `eleven_flash_v2_5` | Fast and cheap, real-time | — | no | — | 40,000 | not tested |

`eleven_turbo_v2` and `eleven_turbo_v2_5` are listed as deprecated ([models](https://elevenlabs.io/docs/overview/models)).
The docs call v4 "a net upgrade over Eleven v3, delivering better results in almost every case" and say it "is under
active, continuous development", so its behaviour "may shift over time"
([v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)). Re-test before the final
render if weeks pass.

**Which model for 15 separate narrator lines: `eleven_v4`.** ElevenLabs says v4 "preserves speaker identity more
reliably across generations, dialogue, narration, and regenerated lines" and that stitching is "significantly more
reliable" ([launch post](https://elevenlabs.io/blog/eleven-v4)). Our own reads agree (section 3): on v4 all six voices
spoke at 2.4 to 2.7 words a second with 0.4 to 0.6 s pauses at full stops, and two seeds of the same line differed
by about 1 dB in spectrum and about 1 semitone in pitch. On `eleven_multilingual_v2` the same lines ran from 2.2 to
4.4 words a second depending on the voice (Frederick's Act 2 line rushed through in 2.5 s with a single pause),
with less pitch movement. v2 stays the fallback, mainly because it has a speed control. The earlier session chose
v2 for the app's voice for that reason (v4 "spoke too fast" for one-to-two-word lines, `film/scripts/audio/prompts/voice.json`); for narration the v4
pace is right.

### 1.1 Timings (`/with-timestamps`)

The endpoint returns `audio_base64` plus `alignment` and `normalized_alignment`: per **character**, three equal-length
lists (`characters`, `character_start_times_seconds`, `character_end_times_seconds`)
([API reference](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)). Words have to be
grouped by hand (`voice_finalize.py` already does it). An audio tag is part of the text and gets characters of its
own (a few ms each); drop it when grouping.

Measured today on v4: letter durations vary (standard deviation 23 to 31 ms), and word starts land on average 35 to
62 ms from the speech-to-text word starts, per take (worst single word 173 ms). The earlier session saw uniform v4 times; that is no longer
the case. For subtitles that must be frame-exact, run the **Forced Alignment** API on the chosen take (audio plus
text in, word times out; priced like speech to text) ([forced alignment](https://elevenlabs.io/docs/overview/capabilities/forced-alignment)).

### 1.2 Continuity between requests

- `previous_text` / `next_text`: text around this request, for continuity. Ignored if request ids are also sent.
- `previous_request_ids` / `next_request_ids`: at most 3 each; "The results will be best when the same model is used
  across the generations"; `next_request_ids` is meant for regenerating one clip so it fits its neighbours
  ([API reference](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)).
- Request ids "should be no older than two hours"; more than 3 returns 400; not available on `eleven_v3`
  ([stitching guide](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching)).
- The id comes back in the `request-id` response header; `character-cost` gives the cost of that request (same guide).

Measured (section 3.5): stitching made **no consistent difference** to pitch or timbre drift across seven short,
separate lines. It costs nothing, so use it inside an act; never across the Act 1 / Act 2 boundary (it would carry
the hushed delivery over).

### 1.3 Voice settings

v4: "Both variants use two voice settings: Stability and Similarity." Lower stability allows "more expressive, varied
delivery"; higher similarity enforces the reference "at the cost of some naturalness". "Style and Speed sliders are
not available in Eleven v4, and SSML is not supported." `clone_strength` exists only for professional clones
fine-tuned for v4 ([v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4),
[API reference](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)).

Measured on Frederick: stability 0.35, 0.6 and 0.85 gave the same pace (2.40 to 2.47 words a second on the Act 1
line) and similar pitch ranges; seed-to-seed spectrum differences were 0.90 to 0.95, 0.93 to 0.99 and 0.83 to 0.85 dB.
No measurable reason to move off the middle. Start at **0.6 / 0.8**; raise stability to 0.75 if, across the full script,
some lines sound like a different mood.

Pace on v4 comes from the text: "Ellipses (...) add pauses and weight", capitals add emphasis
([best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)). Measured: a full
stop gives 0.44 to 0.59 s, a comma 0.2 to 0.3 s. Tags did **not** change the pace (every Act 1 variant of both
finalists, untagged or tagged: 2.40 to 2.58 words a second). If a line must be slower, split it into two requests and place them apart in the edit (the film
places sound to the frame), or stretch by at most about 5% with the `rubberband` tool already in the music pipeline.

### 1.4 Pronunciation

- v4: IPA between slashes in the text, e.g. `/ˈkiːroʊ/` (syntax only; the right sound for "Kiro" is not known, below);
  "results can still vary by voice and phrase"
  ([best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)).
- v2: no phoneme tags on Multilingual v2; use alias rules in a pronunciation dictionary (TXT or `.pls`, "only the very
  first replacement is used", case-sensitive), up to 3 dictionaries per request via
  `pronunciation_dictionary_locators` (same page; [API reference](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)).
- Words to check by ear in this film: **Kiro** (I found no official pronunciation; the name is explained as Japanese
  for "circuit", "pathway" or "route" ([dev.to, Kiro account](https://dev.to/kirodotdev/the-kiro-meaning-why-this-name-perfectly-captures-the-ai-development-crossroads-4i5o)), so ask the
  sponsor or match their own videos), **Ninth Life**, **AAC** (letters, if the script uses it). Not tested here: a
  transcript cannot show how a word was pronounced.

### 1.5 Format for video

`wav_48000` worked on this account and returns a 48 kHz, 16-bit, mono WAV inside the JSON. The docs list a tier only
for 44.1 kHz PCM/WAV (Pro) and 192 kbps MP3 (Creator); none for 48 kHz
([API reference](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)). `pcm_48000` (raw)
also exists. v4 file lengths come in steps of 80 ms (silence padded at the end; the takes end 0.13 to 0.27 s after the
last word), so always trim by measured sound, as `voice_finalize.py` does.

### 1.6 Licence of a library voice for a public video

- ElevenLabs terms (updated 9 Oct 2026): free users "may only use the Services for non-commercial purposes"; paid users
  "may use the Services for commercial purposes"; "you retain all rights in and to your Output"; the terms set no duty
  to disclose generated audio ([terms](https://elevenlabs.io/terms-of-use)).
- Voice library: "Voice Library voices are not available via the API to free tier users"; a notice period (30 days to 2
  years) keeps a removed voice usable for that long; outputs made before removal remain usable
  ([voice library](https://elevenlabs.io/docs/eleven-creative/voices/voice-library),
  [addendum, updated 6 Mar 2026](https://elevenlabs.io/vla)). A library voice does not have to be added to "My Voices"
  to be used; all six candidates worked by id without being added.
- **Not verified: this account's tier is `payg`.** Pay As You Go is described as a payment option "with or without a
  paid subscription" ([billing](https://elevenlabs.io/docs/overview/administration/billing)), and the docs do not say
  whether PAYG credits alone carry the commercial licence. The account does reach library voices through the API, which
  free accounts cannot. **The owner should confirm the commercial status in the account's subscription page before
  upload.** (The asset plan already says a paid plan is needed for the licence.)
- Default (premade) voices such as "George" stop working on 31 Dec 2026
  ([default voices](https://elevenlabs.io/docs/help-center/product/voices/my-voices/what-are-default-voices)), and the
  account's premade voices are not verified for v4. Library voices only.
- Repo rules: no voice names on screen (`.kiro/steering/trademarks.md`). Extend the planned description line to the
  narrator: "The narrator's voice and the app's voice in this film were generated. In the app, the voice comes from
  your device." YouTube asks creators to "disclose AI-generated or altered content that seems realistic"; its page
  does not say whether a generic synthetic narrator counts, so tick the AI-content setting at upload to be safe
  ([YouTube help](https://support.google.com/youtube/answer/14328491)).

## 2. Shortlist

Searched `GET /v1/shared-voices` (14 queries, 1,045 English voices) and the account's 39 voices. Kept: English; no
credit multiplier; no live moderation; notice period at least 365 days; verified for `eleven_v4`; middle-aged or
older; nothing in name or description about trailers, characters, villains, ads, ASMR or celebrities. Excluded on
purpose: "Don - Movie Trailers…" (on the account), a voice carrying a celebrity's name, all premade voices.

| # | Voice (id) | Description (the owner's own words, shortened) | Accent, age | Used in a year / users | Licence notes | Sample |
|---|---|---|---|---|---|---|
| 1 | **Frederick Surrey - Smooth and Velvety** (`j9jfwdrw7BRfcR43Qohk`) | "calm, well spoken British narrator full of intrigue and wonder … Mystery & History documentaries … smooth & velvety tone" | British, middle-aged | 2.49 bn characters / 677,227 | notice 730 days; rate 1; no live moderation; studio quality ("high_quality"); featured; shared Apr 2024 | [mp3](https://storage.googleapis.com/eleven-public-prod/custom/voices/j9jfwdrw7BRfcR43Qohk/Vyj86dr4NJ1Tr82nEPdw.mp3) |
| 2 | **James - Husky, Engaging and Bold** (`EkK5I93UQWFDigLMpZcX`) | "slightly husky and bassy … Modulated, controlled, and direct … captivating narrations, or storytelling". ElevenLabs uses it in its own v4 showcase | American, middle-aged | 4.83 bn / 2,008,188 | notice 730 days; rate 1; studio quality; shared Jan 2025 | [mp3](https://storage.googleapis.com/eleven-public-prod/database/workspace/48ab3aae468d4e9baded4b1693820088/voices/EkK5I93UQWFDigLMpZcX/xvjT3EK4vD3zlwfawHeV.mp3) |
| 3 | **Nathaniel - Engaging, British and Calm** (`AeRdCCKzvd23BpJoofzx`) | re-recorded "with a mysterious tone … suspenseful stories … calm and soothing delivery" | British, middle-aged | 0.99 bn / 314,257 | notice 730 days; rate 1; studio quality | preview through the API (signed URL in `film/_takes/narrator-tests/api/shared-voices.json`) |
| 4 | **Brian** (`n8kTUi6dVrplENT9Un56`, already on the account) | "Natural, warm male voice … smooth, confident, and conversational delivery … narration, storytelling" | American, middle-aged | 0.15 bn / 60,137 | notice 730 days; rate 1; "professional" category; listed May 2026 | [mp3](https://storage.googleapis.com/eleven-public-prod/database/workspace/f9fe023ec77441e098b03ad41d4fcc44/voices/n8kTUi6dVrplENT9Un56/nWAx55MkBUMLF6PAGCnC.mp3) |
| 5 | **Verity X - Calm British Narration** (`1hlpeD1ydbI2ow0Tt3EW`) | "smooth, warm, and engaging tone … clarity, authority and flow" | British, middle-aged, female | 0.22 bn / 104,285 | notice 730 days; rate 1; studio quality | [mp3](https://storage.googleapis.com/eleven-public-prod/database/user/TBCGBdfm5sahGkhMn2WcXK1i4Ya2/voices/1hlpeD1ydbI2ow0Tt3EW/MkZlPtwXrpeBsWHHd9Py.mp3) |
| 6 | **Jane - Professional Audiobook Reader** (`RILOU7YmBhvwJGDGjNmP`) | "audiobook narrator in her 50s with a nice tone and cadence" | British, older, female | 1.51 bn / 520,934 | notice 730 days; rate 1; studio quality; featured | [mp3](https://storage.googleapis.com/eleven-public-prod/database/workspace/20dd3b9a3ec14f77bc0f5688c9f44ff5/voices/RILOU7YmBhvwJGDGjNmP/rg0TiCrZRw0nfGOZiVoe.mp3) |

All six are verified for `eleven_v4` in English. For comparison, Angela (the app voice) carries a **2× credit
multiplier** (`rate` 2), which matters for retakes of the app lines, not for the narrator.

## 3. Test reads

### 3.1 What was made

Lines: **A** (Act 1, hushed) "Nine keys. One press per letter. And the phone guessed the word." and **B** (Act 2,
clear) "Some people type to talk. For an afternoon, or for good."

| Set | Voices | Takes | Purpose |
|---|---|---|---|
| v4: A with `[quiet, measured narration]`, B untagged; stability 0.6, similarity 0.8 | all 6 | 2 seeds each line (24) | the main comparison; seed-to-seed stability |
| `eleven_multilingual_v2`, stability 0.5, similarity 0.8, style 0, speed 1.0, no tags | all 6 | 1 each line (12) | model comparison |
| v4 stability 0.35 and 0.85 | Frederick | 2 seeds, both lines (8) | settings |
| v4 Act 1 line untagged, and with `[softly]` | Frederick, James | 4 | tags |
| v4 Act 2 line with `[warm, clear narration]` | Frederick, James | 2 | tags |
| v4 seven separate lines (4 Act 1, 3 Act 2; test text, not the script), independent and stitched | Frederick, James | 28 | drift over a sequence |

All 78 takes: 48 kHz WAV from `/with-timestamps`, transcribed with `scribe_v3` speech to text. **All 78 transcripts
match the words** (only commas and full stops differ). Each take is logged in `film/manifest/audio.json`
(ids `narrator-test/...`).

### 3.2 How it was measured

`research-v2/14-narrator-tools/measure.py`: speech span (1 ms peak envelope above peak −40 dB), words and syllables
a second, pauses (10 ms frames 35 dB under the loudest, at least 120 ms), integrated loudness and true peak (FFmpeg
`ebur128`), pitch (pYIN, 128 ms window, voiced frames within 25 dB of the loudest; checked against YIN, within 0.5 Hz
on every take), share of energy at 1 to 4 kHz, and a long-term spectrum in 1/3 octaves for "how different do two
takes sound". Angela's reference is her three film lines: median pitch 192 Hz.

### 3.3 Results on v4 (two seeds averaged)

| Voice | Speech A / B (s) | Words/s A / B | Pause at full stop (s) | LUFS A / B (raw) | Pitch A / B (Hz) | Pitch range A / B (semitones, p10-p90) | vs Angela A / B (semitones) | Spectrum distance to Angela (dB) | 1-4 kHz share, B | Seed-to-seed (dB) | A vs B (dB, semitones) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Frederick | 4.93 / 4.12 | 2.43 / 2.67 | 0.44-0.59 | −22.6 / −20.1 | 100 / 113 | 9.3 / 9.7 | −11.3 / −9.1 | 9.0 | 0.062 | 0.96 | 3.2, −2.1 |
| James | 4.74 / 4.15 | 2.54 / 2.65 | 0.46-0.55 | −23.4 / −22.2 | 112 / 137 | 8.3 / 9.2 | −9.4 / −5.9 | 8.3 | 0.115 | 0.80 | 3.3, −3.5 |
| Nathaniel | 4.89 / 4.04 | 2.46 / 2.72 | 0.41-0.56 | −21.0 / −20.5 | 101 / 116 | 6.7 / 10.9 | −11.1 / −8.8 | 9.4 | 0.027 | 0.50 | 2.6, −2.3 |
| Brian | 4.77 / 4.22 | 2.52 / 2.60 | 0.47-0.61 | −21.9 / −19.0 | 106 / 140 | 10.6 / 12.8 | −10.4 / −5.5 | 8.6 | 0.165 | 0.92 | 3.6, −4.8 |
| Verity | 4.90 / 4.33 | 2.46 / 2.54 | 0.35-0.53 | −22.6 / −19.1 | 170 / 191 | 8.5 / 12.5 | −2.1 / −0.1 | 5.1 | 0.100 | 0.96 | 4.0, −2.0 |
| Jane | 4.97 / 4.28 | 2.41 / 2.57 | 0.50-0.55 | −22.6 / −22.8 | 190 / 216 | 5.7 / 9.5 | −0.2 / +2.0 | 3.8 | 0.133 | 0.96 | 3.8, −2.2 |

Other measures: true peaks −1.0 to −8.3 dBTP raw; peak-to-loudness ratio 14 to 19.5 dB (this matters for the mix, 4.3).
Noise before the first word of the hushed takes: Jane −80 to −82 dBFS, James −70 to −77, Brian −68 to −74, Frederick
−63 to −71, Nathaniel and Verity −64 to −69 (trim it off; it is masked in the mix anyway). Word times from the TTS
alignment were 40 to 52 ms (mean) from the transcript's.

### 3.4 Model, settings and tags

- **multilingual_v2** (same lines): words a second Frederick 3.24 / 4.37, Brian 2.98 / 3.12, Verity 2.71 / 2.86,
  Jane 2.34 / 2.84, Nathaniel 2.47 / 2.62, James 2.20 / 2.42 (with a 1.12 s pause). Pitch ranges narrower
  (Jane 4.1 / 4.9 semitones, Frederick 7.1 / 8.4). v4 is more even across voices and more animated within a line.
- **Stability** 0.35 / 0.6 / 0.85: no measurable change (1.3).
- **Act 1 tags** (line A): untagged Frederick 122 Hz at −19.6 LUFS; `[softly]` 100 Hz, −24.1 LUFS; `[quiet, measured
  narration]` 97-103 Hz, −22.7 LUFS. James: 127, 106, 111-112 Hz (−21.9, −25.7, −22.8 to −23.9 LUFS). So a hushed tag
  lowers pitch by 2 to 4 semitones and level by 1 to 4.5 dB; it does not slow the read.
- **Act 2 tag** `[warm, clear narration]`: Frederick 135 Hz (untagged 113), range 13.6 semitones (9.7), pause after
  "talk" 0.34 s (0.53), 2.81 words a second. Livelier and brighter, closer to a presenter. Keep Act 2 untagged unless a
  listener prefers this.

### 3.5 Seven separate lines: does the timbre drift?

| Run | Act 1 pitch SD (semitones) | Act 1 spectrum spread, mean / max (dB) | Act 2 pitch SD | Act 2 spectrum spread | Act 2 vs Act 1 |
|---|---|---|---|---|---|
| Frederick, independent | 1.37 | 2.77 / 3.33 | 0.62 | 2.56 / 3.03 | +6.2 semitones |
| Frederick, stitched | 1.18 | 2.44 / 2.93 | 1.95 | 2.59 / 3.11 | +6.1 |
| James, independent | 0.40 | 2.22 / 2.66 | 1.55 | 1.82 / 2.35 | +5.3 |
| James, stitched | 0.68 | 2.08 / 2.53 | 1.33 | 2.01 / 2.66 | +5.6 |

Within an act both voices stay steady (pitch SD 0.4 to 2 semitones; seed-to-seed alone is about 1). James is the
steadier of the two. Stitching helped some measures and hurt others: no consistent effect. **The real jump is between
the acts: 5 to 6 semitones**, from the hushed tag (2 to 4) plus the brighter untagged Act 2 read. That may be exactly
the night-to-morning change the film wants, but a listener must confirm it still sounds like one man. If not, leave
the tag off the last Act 1 line before the cut (untagged, line A sat close to the Act 2 read: Frederick 122 Hz against
113, James 127 against 137) or try a milder tag by ear. `[softly]` is no fix: it dropped as far as the measured tag
(Frederick 100 Hz, James 106 Hz).

### 3.6 Ranking, and why

1. **Frederick Surrey.** His own description is the brief almost word for word. Measured: the clearest separation
   from Angela (9 to 11 semitones lower, 9 dB spectrum distance, British against her American accent); natural v4 pace
   with clean sentence pauses; seed-to-seed under 1 dB; the smallest A/B pitch shift of the men in the two-line test.
   Weak points, all fixable in the mix: modest presence (1-4 kHz share 0.062, so he needs the EQ lift in 4.3 and a
   deeper music dip than James), a noisier lead-in on hushed takes, and v2 rushes him (use v4 only).
2. **James.** The steadier of the two finalists across seven lines, cleaner floor, more presence (0.115), the most
   used narrator in the library, and in ElevenLabs' own v4 showcase. Against: American like Angela (less contrast), a bigger act-to-act pitch
   change (−3.5 semitones on A/B), and "Husky … Bold" in his name is the closest of the six to a trailer voice.
3. **Nathaniel.** The steadiest seed to seed (0.5 dB) and described as "mysterious", but the darkest voice by far (1-4
   kHz share 0.027): the hardest to keep clear under music and on phone speakers.
4. **Brian.** Brightest and on the account already, but the hushed tag moved him the most (−4.8 semitones, spectral
   centroid 282 → 538 Hz between the lines): the two acts may sound like two people. Raw peaks reach −1.0 dBTP.
5. **Verity** and 6. **Jane.** Good narrators, but at Angela's pitch (Jane within 0.2 semitones on line A); viewers would
   have only the accent to tell narrator from app. Keep a man's voice for the narrator.

### 3.7 The comparison file

`marketing/demo-video/film/_takes/narrator-tests/compare/narrator-compare.wav` (48 kHz, 24-bit, mono; same in
`narrator-compare.m4a`; cue list in `narrator-compare.cues.json`). Every clip is trimmed and set to −20 LUFS, so the ear
compares voices, not levels (file: −20.9 LUFS, true peak −1.0 dBTP). One long low tone marks the reference; **N short
beeps before candidate N**.

| Time | What plays |
|---|---|
| 0:00.5 | one long low tone, then **Angela (the app voice)**: "Hello again.", "I need water.", "It is good to be back." |
| 0:08.1 | 1 beep: **Frederick Surrey**, Act 1 line (v4, tag), then Act 2 line |
| 0:20.5 | 2 beeps: **James** |
| 0:33.0 | 3 beeps: **Nathaniel** |
| 0:45.8 | 4 beeps: **Brian** |
| 0:58.8 | 5 beeps: **Verity X** |
| 1:12.3 | 6 beeps: **Jane** (ends 1:26) |

Also `narrator-extras.wav` (134 s): for Frederick (1 beep) then James (2 beeps), the Act 1 line untagged, `[softly]`
and with the measured tag; the Act 2 line second seed and with `[warm, clear narration]`; both lines on
multilingual_v2; then the seven-line stitched run. Cues in `narrator-extras.cues.json`.

### 3.8 Credits

Budget about 2,000; used **1,158**: v4 384, seven-line runs 336, v2 156, settings and tag tests 224, speech to text 58
(78 files; also reported as $0.021 in the `fiat-cost-before-overages` header). Costs came out at about 0.22 credits
per character for both v4 and v2 on this account, well under the 1 credit per character that `GET /v1/models` lists
(`character_cost_multiplier` 1). Account: 7,027 used before, 8,205 after, limit 30,054, **21,849 left**.

## 4. Mixing the narrator with music and effects

### 4.1 Levels

Set the balance by ear in the Remotion render, measured with `ebur128` short-term loudness on the stereo render. Then
`film/scripts/finish-audio.py` lifts the whole film linearly to −14 LUFS integrated, true peak −1.6 dBTP (it already
does this). YouTube turns content louder than about −14 LUFS down and does not turn quiet content up (reported, not
documented by YouTube: [Meterplugs](https://www.meterplugs.com/blog/2019/09/18/youtube-changes-loudness-reference-to-14-lufs.html)).

| Layer | Relative to the Act 2 narrator | Example in the render (before the master gain) |
|---|---|---|
| App voice (3 lines) | **+2 LU**: still the loudest thing in the film | −14 LUFS. Today's files measure −15.1, −13.1 and −17.2 LUFS (mono, gated), 4 LU apart: level all three to −17 LUFS mono |
| **Narrator, Act 2** | **0 (reference)** | **−16 LUFS** (mono file at −19 LUFS: a mono clip on both channels reads 3 dB higher) |
| Narrator, Act 1 (hushed) | −2 LU | −18 LUFS |
| Music under the narrator | **−11 LU or lower** (−12 to −14 is safer) | −27 LUFS or lower |
| Music alone (gaps of 2 s or more) | −1 to −2 LU | −17 to −18 LUFS |
| Act 1 beds (hum, hiss, room, drone) under the narrator | −15 LU or lower | −33 LUFS or lower |
| Key tones, effects | short events; keep them out of narrated words | — |

Why 11 LU: a listening test on TV documentaries recommends "at least 10 LU difference for CoM [commentary over music]
and at least 15 LU for CoA [commentary over ambience]"; "non-experts preferred LDs that were 4 LU higher than the
ones preferred by experts" (Torcoli et al., JAES 67(12), 2019, doi 10.17743/jaes.2019.0052,
[record](https://cris.fau.de/publications/234640600)). Viewers here are non-experts, many on laptop or phone speakers.

**Measured with the film's music** (`mixcheck.py`, Frederick's Act 2 line at −16 LUFS, `act2.wav` bars 13-19, the
main groove, at the film's volume 0.85, which plays at −12.2 LUFS in stereo):

| Music under the narrator | Music (LUFS) | Narrator − music (LU) | Narrator − music at 2 kHz (dB) | Approx. SII |
|---|---|---|---|---|
| no dip (today, outside scene 10) | −12.2 | −3.8 | −2.2 | 0.51 |
| −12 dB (today's scene 10 dip) | −24.2 | 8.2 | +9.8 | 0.91 |
| −15 dB | −27.2 | **11.2** | +12.8 | 0.97 |
| −15 dB plus −3 dB at 2.5 kHz | −27.3 | 11.3 | +15.1 | 1.00 |
| drums −18 dB, the rest −9 dB (stems) | −25.3 | 9.3 | +14.4 | 0.96 |
| drums −18 dB, the rest −12 dB | −27.4 | **11.4** | +15.2 | 1.00 |
| drums muted, the rest −10 dB | −27.4 | **11.4** | +20.7 | 0.99 |

SII here is an approximation: octave-band importance weights 0.0617, 0.1671, 0.2373, 0.2648, 0.2142, 0.0549 for 250 Hz
to 8 kHz (the example in the R `SII` package's documentation of ANSI S3.5-1997,
[rdrr.io](https://rdrr.io/cran/SII/man/sii.html)), audibility (SNR + 15) / 30. SII was built for steady noise, so use
it to compare rows, not as an absolute. The 1, 2 and 4 kHz bands carry 72% of the weight; that is where the music has
to make room. The drums stem carries most of the 2-8 kHz energy (without drums, the narrator is +25 dB at 4 kHz
before any dip). James, with more presence, gets +14.9 dB at 2 kHz from a 12 dB dip where Frederick gets +9.8.

**So: dip today's music by 15 dB under the narrator** (12 dB if the music's base volume drops from 0.85 to about 0.6),
or work on the stems: drums −18 dB and the rest −12 dB (keeps a faint beat), or drums out and the rest −10 dB.

### 4.2 Ducking (timing)

Remotion knows where every word is, so the dip can start before the voice instead of reacting to it like a sidechain
compressor (one vendor's sidechain ducker defaults to a 10 ms attack and a 200 ms release, and suggests releases of
500 to 1,500 ms to keep music down through natural pauses ([Vindral docs](https://composer-docs.vindral.com/operators/operators-sidechain-ducking.html));
a quick attack "Prevents masking of initial spoken consonants", "A slow release prevents pumping"
([Finchley](https://www.finchley.co.uk/finchley-learning/visual-podcast/audio-engineering-in-a-professional-podcast-post-production-tools-duckers))).
At 120 BPM:

- **Down:** start 15 frames (an eighth note, 250 ms) before the line's first sound; reach the full dip 3 frames (50
  ms) before it, so a 12-frame ramp.
- **Hold:** through any gap under 1.5 s (3 beats) between narrator lines: one long dip, no pumping.
- **Up:** start 7 frames (120 ms) after the last word ends; rise over 30 frames (one beat, 500 ms); end on a beat when
  the edit allows.
- Ramp in **dB, not linear gain** (interpolate −15 → 0 dB, then convert), so the release sounds even.
- In code: add narrator windows to `MUSIC.ducks` in `timeline.ts`, built from the narrator's word times, with a
  per-window depth; `musicLevel()` in `src/audio/Audio.tsx` now hard-codes 12 dB with 3/6-frame ramps. For different
  depths on drums and the rest, play `act2-drums.wav` and `act2-other.wav` as two `<Audio>` tracks instead of
  `act2.wav` (they sum to it within −55 dB, per the manifest).
- The app's three lines keep their full stops (music off), plus 0.5 s of nothing between any narrator word and an app
  line.

Act 1 has no music: dip the **hiss** by 6 to 10 dB while the narrator speaks (broadband, it masks consonants most);
keep the drone and hum (low) but at least 15 LU under the voice overall. No static burst, TV on/off sound or key beep
on top of a narrated word. At the end of Act 1 (set off, black, the dot, white text), the narrator is alone over room
tone: the most intimate moment; keep it dry (no reverb, as the creative direction says).

### 4.3 EQ and dynamics

Remotion's `<Audio>` has volume and playback rate only, so bake processing into the files with FFmpeg.

**Narrator chain** (tested, `chain_test.py`): gain to −19 LUFS → `highpass=f=80:poles=2` → `acompressor=threshold=-16dB:ratio=2:attack=10:release=120:knee=6`
(1 to 3 dB on loud syllables) → `equalizer=f=3000:t=q:w=1.0:g=2` → `deesser=i=0.4` → gain back to −19 LUFS →
4× oversampled `alimiter=limit=0.473:level=disabled` (−6.5 dBTP). On seven Frederick and James takes it brought the
peak-to-loudness ratio from 15.8-18.2 dB to 13.1-13.6 dB, true peak exactly −6.5 dBTP, loudness −19.6 to −20.1 LUFS.
Why it is needed: `finish-audio.py` aims at −14 LUFS with a −1.6 dBTP ceiling, which leaves about 12.4 dB from loudness
to peak; raw narrator takes (15-19 dB) would hit the ceiling and push `loudnorm` out of its linear mode. Order matters:
the limiter must come last (a first try with the limiter before the final gain left the ratio unchanged).

Basis for the numbers: high-pass "at 80Hz", up to 100 Hz for some voices; sibilance "in the 5-8k region", reduced
with "a dynamic cut" ([Music Guy Mixing](https://www.musicguymixing.com/eq-for-voice-over/)); presence "in the 3-7 kHz
range" ([iZotope Neutron 2 manual](https://s3.amazonaws.com/izotopedownloads/docs/neutron2/equalizer/index.html)).
Judge the 3 kHz lift by ear: Frederick needs it more than James.

**Music while the narrator speaks:** a −3 dB bell at 2.5 kHz (Q 1) adds 2.3 dB of clearance at 2 kHz and 1.6 dB at 4
kHz without changing the music's loudness (table above). Make it as a second file (`act2-other-pocket.wav`) and
cross-fade to it inside the dip windows, or apply it in a final FFmpeg pass that reads a dip map. There is little to
gain from cutting the music's low end for the narrator: the 250 Hz band carries about 6% of the SII weight (4.1).

### 4.4 Keeping the app's voice apart from the narrator

| Cue | App voice | Narrator |
|---|---|---|
| Who | Woman, American, 192 Hz | Man, British, 100-113 Hz (Frederick: 9 to 11 semitones lower, measured) |
| Model and pace | multilingual_v2 at speed 0.70-0.75: slow, even, one short sentence | v4, natural narration, 2.4-2.7 words a second |
| Music | stops dead (scenes 7, 15) or dips (scene 10) | dips 15 dB, never stops |
| Level | +2 LU | reference |
| Picture | its words light up on screen as they are spoken | never word-highlighted |
| Words | only what the user typed | never says the app's sentences, never talks over them; 0.5 s clear either side |
| Captions | "App voice: …" | "Narrator: …" (`scripts/make-srt.ts`) |

No telephone, radio or robot filter on the app's voice: the asset plan (section 4.4) wants it to "sound like a good
device voice", with no "robot". A man's voice for the narrator does most of the work; the rules above do the rest.

### 4.5 Music that leaves room for a voice

Instruments: kick, sub bass and a soft low pad sit mostly below the bands that matter for understanding speech (4.1:
1, 2 and 4 kHz carry 72% of the SII weight); the 1-4 kHz band is where hi-hats, claps, snare crack, bright plucks,
piano and guitar chords, leads and arpeggios compete with consonants (in our measurement, the drums stem held most of
the 2-8 kHz energy).
Under narration, keep the groove's foot (kick, sub) and lose or soften the top (hats, claps) and any melody.

Arrangement: write the composition plan around the script. Narrated stretches become sparse chunks; the music opens
up only where nobody speaks (the drop at bar 6, the "Free." hits, scene changes). Chunks are 3 to 120 s, up to 30 per
song, and "the first chunk is the most important: its styles set the overall tone"; `context_adherence` (`low`,
`medium`, `high`) sets how closely a chunk follows its neighbours
([composition plans](https://elevenlabs.io/docs/eleven-api/guides/how-to/music/composition-plans)). Prompting
advice that fits: "Without the *just*, the model fills the silence — mark the silences explicitly"; for loops "the
negative space is the prompt" ([music best practices](https://elevenlabs.io/docs/overview/capabilities/music/best-practices)).

A narrated chunk, for the existing plan (`film/scripts/audio/prompts/music.json` keeps 120 BPM, A minor, instrumental):

```json
{
  "text": "[Groove under voice]\n{just the kick, the warm sub bass and a soft low pad; leave the middle and top empty}",
  "duration_ms": 12000,
  "positive_styles": ["sparse underscore", "just a soft kick on every beat", "warm analog sub bass",
                      "soft low pad", "dark and warm", "120 BPM", "A minor", "instrumental"],
  "negative_styles": ["lead melody", "vocals", "vocal chops", "hi-hats", "claps", "snare", "cymbals",
                      "bright plucks", "arpeggios", "piano", "guitar"],
  "context_adherence": "high"
}
```

What the current music API adds:

- **Inpainting** keeps what already works: upload `act2.wav` (`POST /v1/music/upload`, priced like a generation,
  checked for copyright; `extract_composition_plan` returns a plan) ([upload](https://elevenlabs.io/docs/api-reference/music/upload)),
  then compose a plan of **audio-reference chunks** (kept unchanged) and **generation chunks** (regenerated) for the
  narrated bars. A generation chunk can carry `conditioning_ref` (a slice of at most 30 s of the stored song) with
  `condition_strength` `low` to `xhigh`, to stay close to the original groove
  ([inpainting](https://elevenlabs.io/docs/eleven-api/guides/how-to/music/inpainting)). This is the best way to get
  sparse versions of exactly the narrated bars without losing tempo, key or the drop. Re-check 120 BPM with the
  existing `music_grid.py` and `BeatCheck` afterwards.
- **Section lengths are always enforced** on `music_v2`/`music_v2_5`; `store_for_inpainting` keeps a new song
  available for later edits; `seed` exists but "exact reproducibility is not guaranteed"
  ([compose](https://elevenlabs.io/docs/api-reference/music/compose)).
- **Stem separation** (`POST /v1/music/stem-separation`, zip of stems) ([stems](https://elevenlabs.io/docs/api-reference/music/separate-stems));
  the docs list no `stem_variation_id` values; `six_stems_v1` worked in the earlier session.
- **Video to music** writes music for a video, with `separate_tracks` for music and effects
  ([video to music](https://elevenlabs.io/docs/api-reference/music/video-to-music)); it has no tempo parameter (only a
  description, up to 10 tags, and an option to take the BPM and mood from the video's own audio), so it does not fit a
  film cut to an exact 120 BPM grid.
- Cost: music did not move the account's character counter in the earlier session (`act2-t1.json`: 0 credits); the
  help centre only says the cost "depends on the length of your track"
  ([music cost](https://elevenlabs.io/docs/help-center/product/core-capabilities/music/how-much-does-eleven-music-cost)).
  Not verified.

### 4.6 Checks after the mix

- `ebur128` on the render: narrator lines at the planned short-term level (±1 LU); music under narration at least 11
  LU below it; the three app lines the loudest speech.
- `finish-audio.py` reports linear normalisation (no dynamic mode) and true peak at or under −1.6 dBTP.
- Listen three ways (production guide): with sound, without, sound only; plus once on a phone speaker and once on
  a laptop at low volume. The narrator must be clear without turning up.

## 5. Open questions and what was not verified

1. **Listening.** Nothing here was heard. A person must listen to `narrator-compare.wav` and `narrator-extras.wav` and
   confirm: the voice is warm and not trailer-like; Act 1 and Act 2 sound like the same man; no odd breaths or
   artefacts.
2. **Licence on a PAYG account** (1.6). Confirm before upload.
3. **Kiro's pronunciation** (1.4).
4. **The 20-credit gap** between the ledger and the account counter (0).
5. **`film/scripts/audio/qa.py` will now fail one check**: it compares the number of manifest entries with the number of
   files in `public/audio` (`len(man) != len(present)`), and the 78 test entries live in `_takes/`. Fix: count only
   entries whose path starts with `public/`. I may not edit that file.
6. v4 "is under active, continuous development": re-run one line before the final generation and compare with these
   measurements.
7. YouTube's −14 LUFS reference is widely reported, not documented by YouTube.

## 6. Files

- Tools (scripts, plans): `marketing/demo-video/research-v2/14-narrator-tools/`: `inspect.mjs` and `library.mjs`
  (free API reads), `gen.mjs` and `seq.mjs` (generation, with a credit ledger and a budget stop), `stt.mjs`,
  `measure.py`, `seq_measure.py`, `build_compare.py`, `mixcheck.py`, `chain_test.py`, `manifest_append.py`,
  `narrator-plan.json`, `seq-plan.json`. Run the Python ones with `film/.venv/bin/python -I`, the Node ones with
  `node --env-file=marketing/.env` (the key is read from the environment and never printed).
- Takes and data: `marketing/demo-video/film/_takes/narrator-tests/` (git-ignored): `<voice>/<variant>/` takes with
  request, alignment and transcript; `metrics.json`, `seq-metrics.json`, `ledger.json`, `api/` (models, plan,
  library search), `compare/`, `chain-test/`.
- Manifest: 78 entries appended to `marketing/demo-video/film/manifest/audio.json` (the 54 existing entries are
  byte-identical).
