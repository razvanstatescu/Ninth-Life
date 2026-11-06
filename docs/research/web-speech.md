# Web Speech API: voices, bugs and privacy (2026)

What the browsers actually do with `speechSynthesis` on the devices our users have, and what that means for
`packages/web/lib/speech.ts`. Checked **2026-11-06** by the speech owner. Requirements: web-ui Req 4 and
Req 18 (`.kiro/specs/web-ui/requirements.md`). Steering: `.kiro/steering/voice.md`.

How to read the status column:

- **verified**: a primary source (spec, MDN, vendor page, browser bug tracker) or a maintained test dataset says so.
- **secondary**: a credible secondary source (project issue tracker, engineering blog) says so; not re-tested by us.
- **unverified**: from memory or one old forum post; check on a real device before relying on it.

No row here was tested on a real device by us yet. Task 33 in `.kiro/specs/web-ui/tasks.md` is that check;
put the results in the "Device log" at the end.

## Main sources

| # | Source | What it is | Date |
|---|---|---|---|
| S1 | https://github.com/readium/speech (`docs/WebSpeech.md`, `json/*.json`, `json/filters/*.json`) | Readium Foundation's maintained per-language list of voices per browser and OS, with notes on browser bugs (BSD-3-Clause). Successor of "web-speech-recommended-voices" | fetched 2026-11-06; the notes cite counts "as of April 2024" |
| S2 | https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService | MDN: `localService` true = local synthesizer, false = remote service | fetched 2026-11-06 (register W-03) |
| S3 | https://github.com/phetsims/utterance-queue/issues/60 | PhET: long utterances with Google voices on Chromium stop after about 15 s with no `end`; the pause/resume keep-alive breaks Android Chrome | fetched 2026-11-06 (register W-01) |
| S4 | https://www.caktusgroup.com/blog/2025/11/03/the-halting-problem/ | Caktus Group, 3 Nov 2025: the same stall on Chrome/Ubuntu with Google voices; `speaking` stays true; a 14 s pause/resume interval as workaround | 2025-11-03 |
| S5 | https://bugs.webkit.org/show_bug.cgi?id=223473 | WebKit: `speechSynthesis.speak` on iOS honours `audioPlaybackRequiresUserGesture` (fixed 2021-03-18, iOS 14) | 2021 |
| S6 | https://groups.google.com/a/chromium.org/g/blink-dev/c/WsnBm53M4Pc | blink-dev: `speak()` without user activation removed in Chrome | register W-02 |
| S7 | https://bugs.webkit.org/show_bug.cgi?id=191745 ; https://lists.webkit.org/pipermail/webkit-unassigned/2022-March/1027449.html (bug 238189) ; https://bugs.webkit.org/show_bug.cgi?id=211776 | WebKit: after `cancel()`, queued utterances are dropped (191745) or fire no `start`/`end` (238189, Safari 15); `end` missing after `cancel()` (211776, iOS 13.4.1) | 2018-2022; current status not shown |
| S8 | https://bugzilla.mozilla.org/show_bug.cgi?id=1522074 | Firefox: a `speak()` straight after `cancel()` is wiped out (still open, last updated about 3 years ago) | 2019-2023 |
| S9 | Chromium issue 509488 (cited in Stack Overflow answers) | `end` of an utterance sometimes never dispatched; keeping a reference to the utterance is the common workaround | old; status unknown |
| S10 | https://support.microsoft.com/en-us/windows/appendix-a-supported-languages-and-voices-4486e345-7730-53da-fcfe-55cc64300f01 | Microsoft: Windows voices per language, natural voices, how to download them | fetched 2026-11-06 |
| S11 | https://issues.fluidproject.org/browse/FLUID-6736/ | Safari 15.4 returned an empty `getVoices()`; fixed in 15.5; not reproduced in 17.5 | 2022-2024 |

## 1. Which voices each browser exposes

"Local" means `localService === true` (speech made on the device, works offline). "Online" means `false` (the
text goes to a remote service). Counts are S1's, "as of April 2024" unless stated.

| Browser | Windows | macOS | ChromeOS | Android | iOS / iPadOS | Status |
|---|---|---|---|---|---|---|
| **Chrome** | Windows voices (local), plus 19 Google voices in 15 languages (online) | macOS system voices (local) plus the Google voices (online) | 4 sets: ChromeOS voices, Android voices (50+ languages, local and network variants), Natural voices (install in settings, offline), eSpeak (38 languages, very low quality) | Not the real voice list: an unfiltered list of languages/regions, localized, including ones whose voice pack is not installed; choosing one falls back to an English voice | WebKit engine: same as Safari | verified (S1) |
| **Edge** | Windows voices (local) plus 250+ "Online (Natural)" voices in 75 languages (online) | Same online set; on macOS only 18 show until the first utterance, then 250+ | n/a | **Empty list**: Web Speech unusable | WebKit: same as Safari | verified (S1) |
| **Safari** | n/a | System voices (local). Downloadable and Siri voices are **not** listed; installing a better variant can make the preloaded one vanish | n/a | n/a | Same set as macOS; some voices listed twice | verified (S1) |
| **Firefox** | Windows voices (local), no voices of its own | System voices (local); new voices need a full reboot to appear | n/a | Android speech service; tags like `eng-US-f000`; smaller list than Chrome | WebKit: same as Safari | verified (S1) for macOS and tags; Android list size secondary |
| **Chrome on Linux** | | | | | | Only the Google online voices unless speech-dispatcher voices are installed (S4: "only Google-provided voices were available" on Ubuntu) — secondary |

Notes:

- Windows natural voices (installed from Narrator settings, offline) show up only in Edge, not in Chrome or Firefox (S1). Windows lists 98 voices in 36 languages across Windows 10 and 11 (S1, from S10).
- On iOS and iPadOS every browser uses WebKit, so "Chrome on iPhone" behaves like Safari (S1). The EU's Digital Markets Act allows other engines on iOS in the EU; whether any shipped browser uses its own engine with its own speech in 2026 is **unverified**.
- Firefox gives each voice a unique URN as `voiceURI`; most other browsers set `voiceURI` to the name and do not keep it unique; macOS localizes voice names (S1). Remembering a voice by `voiceURI` works within one browser but is not unique everywhere.

## 2. Which voices are local (offline)

| Voices | `localService` | Status |
|---|---|---|
| Windows voices (Microsoft David, Zira, Mark; Andrei; Helena, Laura, Pablo ...) in Chrome, Edge, Firefox | true | verified as local by S1; flag value per browser **unverified** on device |
| Edge "Microsoft ... Online (Natural)" | false ("strictly for an online use", S1) | verified (S1) |
| Chrome desktop "Google ..." voices | false; "all of these voices require online access ... without any fallback" (S1) | verified (S1) |
| macOS / iOS system voices in Safari and Chrome | true | verified (S1 says `localService` "seems to be working as expected") |
| ChromeOS and Android Google TTS voices | both kinds exist: names end in `-local` or `-network` (S1 `altNames`); which flag Chrome on Android reports is **unverified** | partly verified |
| ChromeOS Natural voices | offline once installed (S1) | verified (S1) |

S1 judges `localService` reliable enough that its lists do not record it. We still treat it as the only signal and
label voices by it.

## 3. Known bugs and quirks

| # | Quirk | Where | What we do | Status |
|---|---|---|---|---|
| B1 | **Long-utterance cutoff.** Utterances over about 14-15 s stop silently; no `end` or `error`; `speaking` stays true | Chrome desktop with the Google online voices (Windows, Linux, macOS); not seen with Edge voices | Chunks of at most 160 characters at rate 1 (about 11 s at an estimated 14 characters a second), fewer at slower rates (80 at 0.5), so no chunk should reach the cutoff (Req 18.2) | verified (S1, S3, S4); the 14 chars/s rate is our estimate |
| B2 | **Pause/resume keep-alive** (calling `pause()` then `resume()` every ~14 s) keeps Google voices going on desktop but **breaks speech on Android Chrome** | Chrome | Not used (`voice.md` rule 5) | secondary (S3, S4) |
| B3 | **`end` never fires** sometimes; a reference to the utterance avoids it in many reports (garbage collection) | Chromium | Every utterance is held in a set until it settles, and a per-chunk watchdog (3x the estimate + 2 s after `start`) moves on (Req 18.3, 18.10) | secondary (S9) |
| B4 | **`voiceschanged` timing.** `getVoices()` is empty at first in Chrome, Edge and Firefox; the event can come late, more than once, or with an empty list | Chromium, Firefox | `loadVoices()` waits up to 2 s for a non-empty list; `useVoices` ignores an early empty event (Req 18.6) | verified (MDN, S1) |
| B5 | **`voiceschanged` never fires** in some Safari versions; `getVoices()` was empty in Safari 15.4 (fixed 15.5) | Safari | After an empty wait, `useVoices` looks again every 1 s, 5 times (Req 18.7) | secondary (S11, Stack Overflow) |
| B6 | **iOS gesture rule.** iOS speaks only from a user gesture (WebKit honours `audioPlaybackRequiresUserGesture`, on by default in Mobile Safari); Chrome also removed `speak()` without user activation | iOS, Chrome | `speak()` is synchronous and called straight from the click/key/switch handler (Req 4.1); a refused call errors with `not-allowed`, which opens show mode (Req 18.11) | verified (S5, S6) |
| B7 | **`cancel()` then `speak()`**: the next utterance can be dropped (Firefox 1522074; Safari 191745 keeps only the last of several queued); Safari may fire no `start`/`end` for utterances queued right after `cancel()` (238189) or no `end` after `cancel()` (211776) | Safari, Firefox | Cancel only when something is speaking or queued (Req 18.8); queue one chunk at a time from the previous `end`, so nothing waits in a queue a cancel could wipe (Req 18.3); a replaced sentence is settled by us, not by its late events (Req 18.9). We do **not** add the 125-250 ms delay some projects use after `cancel()`, because a timer breaks the iOS gesture rule | secondary (S7, S8) |
| B8 | **Late events after `cancel()`**: the cancelled utterance fires `error` (`interrupted` or `canceled`) or `end` after the next one started | all | Each sentence is a session; once replaced or stopped, its events are ignored (Req 18.9) | verified by the spec's event model; timing secondary |
| B9 | **Android voice list**: Chrome on Android lists languages, not voices, including ones not installed (falls back to English), does not mark the user's default, and uses `en_us` tags | Chrome on Android | Tags are normalized (`en_us`, `eng-US-f000`) before matching (Req 18.13); show mode stays the fallback | verified (S1) |
| B10 | **Edge on Android returns no voices** | Edge on Android | Show mode (Req 4.5). Tell people to use Chrome on Android | verified (S1) |
| B11 | **`default` is true on every voice** in Safari | Safari | The `default` flag is ignored when every voice claims it (Req 18.13) | verified (S1) |
| B12 | **Novelty voices** (Albert, Bad News, Bells, Zarvox ...) and very low quality voices (Eloquence: Eddy, Flo, Grandma ...; eSpeak) are preloaded and can win an alphabetical tie | macOS, iOS, ChromeOS | Listed last in the picker and never chosen by default (Req 18.4) | verified (S1 filters) |
| B13 | **Pause/resume** in general: `pause()` acts like `cancel()` on Android Chrome; `resume()` after a long pause can fail | Chrome | No pause button in the app; `speak()` calls `resume()` only if the engine reports it is paused | secondary (S3); per-platform detail unverified |
| B14 | **Edge natural voices ignore pitch** and some characters need escaping | Edge | Pitch stays a setting; the Settings help could say "pitch may not change online voices" (not done: components are not in this scope) | secondary (S1 issue links) |
| B15 | **First Android/ChromeOS utterance can take up to a minute** | ChromeOS, Android voices | The watchdog starts at `start`, not at `speak()`, so a slow first start is not cut off | secondary (S1) |
| B16 | ChromeOS uninstalls voice packs after updates; macOS Firefox needs a reboot for new voices | ChromeOS, Firefox | Show mode and the no-voice message in Settings | verified (S1) |

## 4. Privacy of online voices

- `localService === false` means "a remote speech synthesizer service" makes the audio (S2). The words of the
  sentence leave the device for the browser maker's service: Google for Chrome's "Google ..." voices, Microsoft
  for Edge's "Online (Natural)" voices. What those services log or keep is set by the browser maker's privacy
  terms, not by us, and we have **not verified** any retention period. Do not claim one.
- What people type is their voice. With an online voice, a whole conversation can pass through a third party even
  while model ranking is off. That is why online voices are labelled "online" in the picker, the Settings help says
  "Online voices send the text to the browser maker", and on-device voices are listed first (Req 4.3).
- These voices also fail offline. On Chrome desktop with only Google voices (Chrome on Linux), the app has no
  offline voice at all; show mode covers that.
- The About page and privacy notice should name this in plain words next to the model-ranking paragraph:
  "If you choose an online voice, your browser sends each sentence to its maker's speech service to turn it into
  sound." (Suggested copy for the web owner; the page is outside this task's scope.)

## 5. Romanian (ro-RO) and Spanish (es-ES) voices

From S1's `json/ro.json` and `json/es.json` and S10. "Preloaded" is S1's field; "local" follows section 2.

### ro-RO

| Voice (name as the API reports it) | Where | Local? | Notes |
|---|---|---|---|
| Microsoft Andrei - Romanian (Romania) | Windows (all browsers that list Windows voices) | yes | Male only; added from Narrator settings if not present (S10). No Windows natural voice for Romanian (S10) |
| Microsoft Alina Online (Natural) - Romanian (Romania); Microsoft Emil Online (Natural) | Edge desktop | no (online) | Very high quality (S1) |
| Ioana | macOS, iOS, iPadOS (Safari, and Chrome/Firefox on macOS) | yes | Preloaded (S1) |
| Android Speech Recognition and Synthesis from Google ro-ro-x-vfv-local / -network ("Voce feminină") | Android, ChromeOS | local and network variants | On Android, Chrome lists languages, not voices (B9) |
| (none) | Chrome desktop Google voices | — | Chrome's own online set has **no Romanian** voice (S1 lists none) |
| eSpeak Romanian | ChromeOS | yes | Very low quality; never chosen by default (B12) |

Gaps: Chrome on Windows without the Andrei voice, Chrome on Linux, and Edge on Android have no Romanian voice:
show mode. Firefox has whatever the OS has.

### es-ES

| Voice | Where | Local? | Notes |
|---|---|---|---|
| Microsoft Helena, Laura, Pablo - Spanish (Spain) | Windows | yes | S1, S10 |
| Microsoft Elvira / Alvaro Online (Natural) - Spanish (Spain) | Edge desktop | no | Also Windows natural voices Elvira and Alvaro (offline once installed) but only Edge lists those (S1, S10) |
| Mónica (preloaded), Marisol, Jorge | macOS, iOS, iPadOS | yes | Marisol and Jorge not marked preloaded in S1 (downloadable voices do not show in Safari) |
| Google español | Chrome desktop | no | Subject to the long-utterance cutoff (B1) |
| Google español 1-5 (Natural) / es-es-x-ee?-local | Android, ChromeOS | local and network variants | S1 |

Spanish is far better covered than Romanian on every platform. A Romanian pack must expect show mode on some
devices (plan §11, "No ro-RO voice on some OSes").

## 6. Recommendations for `lib/speech.ts`

Implemented on 2026-11-06 (web-ui Req 18, tests in `packages/web/test/speech-robustness.test.ts`):

1. **Lossless chunking at sentence, then clause, then word boundaries, never mid-word** (Req 18.1). The previous
   chunker re-joined sentence pieces with a space, so in long text "3.50" became "3. 50" and "...and" became
   "... and", and it hard-cut words longer than the limit. Fixed; a 400-text property test checks it.
2. **Chunk size follows the rate** (Req 18.2): 160 characters at rate 1, 80 at rate 0.5, floor 40, to stay under B1.
3. **One chunk at a time, references held, watchdog** (Req 18.3, 18.10): avoids B3 and B7, gives progress
   (`onProgress`), and clears a stuck "Speaking" label.
4. **Cancel only when busy; replaced or stopped sentences settle once** (Req 18.8, 18.9): avoids B7 and B8. Before
   this, a cancelled sentence's late `end` could set "Speaking" back to "Speak" while the new one was playing.
5. **Errors once, by type; `not-allowed` opens show mode** (Req 18.11, 18.12).
6. **Voice choice** (Req 18.4, 18.5, 18.13): language first (an on-device voice in another language cannot be
   understood), then ordinary over novelty voices (the old code picked "Albert" on Safari, where every voice
   claims `default`), then on-device, then region; the remembered voice is kept while it exists and speaks the
   language; tags normalized (the old prefix match treated Estonian `est` as Spanish `es`).
7. **`useVoices`** ignores an early empty `voiceschanged` and re-checks after an empty wait (Req 18.6, 18.7).

Not done here (outside `lib/`, or needs a decision):

8. **Pass the pack language to `pickVoice`** in `CommunicationScreen` and `SettingsSheet` when ro/es packs land
   (both call it without `lang` today, so the default `'en'` is used). Task 34.
9. **Decision for the product owner:** step 6 means that when the device has no on-device voice in the language but
   has an online one, the app speaks with the online voice by default (as it already did when no on-device voice
   existed at all). The stricter option is to fall back to show mode until the person picks an online voice. Either
   way the picker labels it.
10. **Settings copy**: say that pitch may not change some online voices (B14), and say on Android that Edge has no
    voices (B10). Web owner.
11. **Device log** (task 33): run the checks below before the Nov 26 freeze and record them here.

## Device log

Fill in from real devices. Do not copy rows from memory.

| Date | Device and OS | Browser | Voices listed (count, local/online) | 600-char text at rate 0.5 | Speak twice fast | First Speak after load | Notes |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
