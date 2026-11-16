# Tech feasibility: ambitious features for Ninth Life (tech, 2026-11-14)

Sizes were measured today from the file hosts (HF API, jsDelivr, Google Storage) unless marked. "Not verified" means no primary source or no published measurement. Nothing here was tested on a real phone; re-measure every phone speed on the Moto G-class profile (`docs/testing/performance.md`).

## Ground rules any big feature must keep

- **Bytes:** first load stays about 530 KB. A model loads only after an explicit press ("Download the camera switch, 7 MB"), into a Serwist runtime cache (CacheFirst, versioned URL), **self-hosted** (MediaPipe's samples default to jsDelivr and storage.googleapis.com: a third-party request we do not make today). Then call `navigator.storage.persist()`; WebKit grants it on heuristics "like whether the website is opened as a Home Screen Web App"; origin quota up to 60% of disk ([WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/)).
- **Proof check:** every item below changes how a press arrives (input) or how the chosen text sounds (output). None of them adds a word.
- **ONNX runtime cost** for any transformers.js/ORT model: `ort-wasm-simd-threaded.wasm` is 2.8 MB brotli (CPU) and the WebGPU build is 4.8 MB brotli (onnxruntime-web 1.31.1, measured). Multithreaded WASM needs cross-origin isolation (COOP/COEP headers). Without it, inference runs single-threaded (not verified for our pages).

## 1. Camera as a switch (face gestures). Recommended wow feature

**Problem.** Scanning needs a physical switch or a key. RESULTS.md gives 3.57 steps per character, so each select matters. Adapted switches plus an interface cost money and setup. Many people who could use scanning have a working face but no switch to hand.
**Solution.** Settings > Access > "Camera switch (on this device)". It lazy-loads MediaPipe Face Landmarker, runs `detectForVideo` on a 320x240 front-camera stream at about 15 fps and reads 52 blendshape scores ([Google](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker)). It then emits exactly the same `select`/`advance` the Space/Enter switch emits into `useScanner`, which already has `acceptDelayMs`. Gestures: **raise eyebrows** (`browInnerUp`), **open mouth** (`jawOpen`), **smile**, and a **long blink only** (≥ 500 ms, both eyes; ordinary blinks would fire constantly). One gesture gives 1-switch mode; two gestures give 2-switch mode (move / select).
- Calibration screen: "Relax" for 3 s (baseline), then "Do it 3 times" (peak). The threshold sits at about 60% of the way from baseline to peak, with hysteresis. Hold time is adjustable from 0.2 to 1.5 s, plus a refractory period. Android's Camera Switches exposes the same two ideas, gesture size and hold duration ([Google support](https://support.google.com/accessibility/android/answer/11150722)).
- Feedback: a calm horizontal level bar per gesture, no flashing, and a small optional camera preview for positioning only. "No face seen" pauses the scan instead of firing.
**Why it is worth it.** Any device with a camera becomes a switch, no purchase. Prior art is fragmented: Android Camera Switches (open mouth, smile, raise eyebrows, look left/right/up; works system-wide, and "can't be used with other apps that use the camera"), iOS Switch Control's camera head-movement switch, and iOS facial expressions, which need a TrueDepth camera ([Apple](https://support.apple.com/en-ug/119835), [AbilityNet](https://mcmw.abilitynet.org.uk/how-to-use-switches-to-control-your-device-in-ios-18-on-your-iphone-or-ipad)). Ace Centre's EyeCommander (blink switch, Windows) says Mac facial gestures "don't allow you to change and calibrate the detection enough for it to work for everyone", and that it "uses a lot of CPU power" ([Ace Centre](https://acecentre.org.uk/resources/eyecommander)). Calibration is the differentiator; laptops and Chromebooks have nothing native.
**Effort.** L (4-5 days): 1 day MediaPipe loop + caching, 2 days calibration UI and scanner wiring, 1-2 days device testing and copy.
**Risks.** Lighting, glasses and head angle; no published false-positive rates; Ace Centre calls pure computer vision "not that reliable". Battery and heat not measured (keep 15 fps, low resolution). On iOS, use `playsinline muted` video or Safari hijacks it ([three.js forum](https://discourse.threejs.org/t/best-production-ready-face-tracking-solution-for-three-js-webar-on-ios-android-browsers/94064)). Ask for **video only**, because audio capture changes the iOS audio session (§5). One report shows the GPU delegate giving wrong outputs on iOS Safari for a different MediaPipe task ([#6142](https://github.com/google-ai-edge/mediapipe/issues/6142)), so fall back to the CPU delegate. Copy: "a face gesture can act as your switch", never a condition.

| | |
|---|---|
| Bytes, when | 3.76 MB model (`face_landmarker.task` float16) + 3.3 MB brotli WASM (14.7 MB raw) + 156 KB JS ≈ **7.2 MB**, only after "Download camera switch" |
| Offline | Yes, after the download (runtime cache) |
| Chrome Android | Expected to work (getUserMedia + WASM/WebGL); FPS on mid-range phones **not verified** |
| Safari iOS | Expected to work. One competitor's self-published table says MediaPipe runs at 9 ms / 60 fps on an iPhone 16 Pro in Safari ([micro-facemesh README](https://cdn.jsdelivr.net/npm/@svenflow/micro-facemesh@0.1.2/README.md)), not independently verified; older iPhones not verified |
| Desktop | Chrome, Edge, Safari, Firefox (WASM CPU fallback everywhere) |
| Proof / privacy | Proof untouched (it is a switch). Frames stay in page memory, never stored or sent; model files self-hosted; licence Apache-2.0 (`@mediapipe/tasks-vision` 1.2.3) |
| Demo moment | Phone on a stand, the person's hands still in their lap. The scan highlight steps across the keys; they raise their eyebrows, a key lights, and "I need water" builds and is spoken. A level bar fills with each raise. |

Honest about the clip: at 1.2 s a step, 12 characters is about 51 s of scanning. Film a short reply in 2-switch mode (brows move, mouth selects) or a quick reply, label any speed-up, and record it rather than run it live.

## 2. Better voices on-device

**Problem.** "Voices depend on your device". Android Chrome lists languages rather than voices, Chrome on Linux has no offline voice, and online voices send the text to Google or Microsoft (`docs/research/web-speech.md` B9, §4). `speechSynthesis` output cannot be captured, so we cannot make a voice message or put the voice into a web call.
**Solution.** Opt-in "Download a natural voice (about 30 MB)": a Web Worker synthesizes clause by clause (we already chunk), played through Web Audio with the `AudioContext` resumed synchronously in the press handler (iOS gesture rule); system voice as fallback while loading or if too slow. Bonus: the PCM can be shared as a WAV via Web Share (a voice message).

| Model | Download (measured) | Licence | Notes |
|---|---|---|---|
| **Kitten TTS 0.8 nano int8** | 24.4 MB ([HF](https://huggingface.co/KittenML/kitten-tts-nano-0.8-int8)) | Apache-2.0 weights | 8 English voices. The web ports bundle espeak-ng data, which is **GPL-3.0** ([kitten-tts-webgpu](https://cdn.jsdelivr.net/npm/kitten-tts-webgpu@0.1.1/README.md)). One port reports nano at 0.93 s on an M4 Pro (7.3x real time) and the mini model at about 1.2 s on an iPhone 17 Pro Max in Safari |
| Kitten TTS 2 nano / pico | 17.4 MB / 8.0 MB ONNX per language + about 6.4 MB G2P ([HF](https://huggingface.co/KittenML/kitten-tts-2-nano)) | Apache-2.0 | Published **2026-11-13**; its own G2P (no espeak), 37 voices. No browser port verified: too new to bet the demo on |
| Kokoro-82M | 86 MB (q8f16) to 326 MB fp32 ([HF](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX)) | Apache-2.0 | Best quality of the group. The HN thread on the WebGPU demo (early 2025, date inferred) reports "~30s for 4s audio" (Pixel 6a), "screeching noises" (S21 Chrome) and "Crashes on iPhone safari" ([HN](https://hn.svelte.dev/item/42973769)); old, but enough to keep it off phones |
| Piper (medium voices) | about 63 MB per voice ([HF](https://huggingface.co/rhasspy/piper-voices)) | Archived MIT code; active fork is GPL-3.0; per-voice licences vary | rhasspy/piper was archived in Oct 2025 ([AUR/secondary](https://aur.archlinux.org/packages/piper-tts)) |
| Kyutai Pocket TTS | 219 MB (100M); new English 2M/7M/18M variants at 47/67/112 MB | MIT code, CC-BY-4.0 weights, gated repo | About 6x real time on 2 cores of an M4 Air, about 200 ms to the first chunk, browser ports community only ([GitHub](https://github.com/kyutai-labs/pocket-tts)) |
| Supertonic 3 | about 398 MB across 4 ONNX files ([HF](https://huggingface.co/Supertone/supertonic-3)) | OpenRAIL-M (use restrictions) | Too big |

**Why it is worth it.** One consistent, natural, offline voice on every device. The text never goes to a browser maker. It also makes audio we can share.
**Effort.** L (4-5 days), including a phone go/no-go spike on day 1.
**Risks.** Phone speed unmeasured: if a mid-range Android needs > 1.5 s to first audio, it is tablet/laptop only. iOS Safari memory. G2P mispronunciations (words right, sound wrong). espeak-ng GPL-3.0 beside our MIT code needs a licence decision.
**Demo moment.** Airplane-mode icon on screen. The same sentence plays first in the phone's built-in voice, then in the downloaded natural voice.

### A personal voice

- **Apple Personal Voice is not reachable from a web page (verified in source).** WebKit's voice list keeps only `voice.isSystemVoice` voices and marks every voice `isDefault` ([PlatformSpeechSynthesizerCocoa.mm](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/cocoa/PlatformSpeechSynthesizerCocoa.mm), `appendVoices`). Native apps must call `requestPersonalVoiceAuthorization` ([WWDC23 notes](https://wwdcnotes.com/notes/wwdc23/10033)).
- **On-device cloning in the browser:** Pocket TTS clones from a WAV, but its weights are gated and its terms prohibit "voice impersonation or cloning without explicit and lawful consent" ([HF card](https://huggingface.co/kyutai/pocket-tts)). Kitten TTS 2 clones from 5-30 s, but that model is 1.7B ([GitHub](https://github.com/KittenML/KittenTTS)). Neither fits 10 days or a phone.
- **Cloud cloning** sends a voice recording to a third party: breaks the privacy posture. **Drop**; revisit later with a consent flow (own voice only, spoken consent phrase, watermark).

## 3. On-device language model

- **Chrome Prompt API (Gemini Nano)** is on the web from Chrome 148, but it is "not yet supported" on Chrome for Android or iOS. It needs ≥ 22 GB free disk and either > 4 GB VRAM or 16 GB RAM with 4 cores ([Chrome docs, updated 2026-10-21](https://developer.chrome.com/docs/ai/prompt-api)). It is desktop-only and fails on a mid-range phone.
- **WebLLM / transformers.js:** WebGPU ships in Safari 26 on iOS ([WebKit bug quoting the release post](https://bugs.webkit.org/show_bug.cgi?id=301627)) and in Chrome on Android on recent GPUs. Sizes I measured: SmolLM2-135M q4f16 118 MB, Gemma-3-270M q4f16 273 MB, Qwen3-0.6B q4f16 570 MB. A June 2026 essay found that WebGPU being present "was not enough" to predict whether a small LLM run on a phone completes ([summary](https://devbytes.co.in/news/mobile-browsers-are-not-yet-ready-for-small-language-models)). chat.webllm.ai needs 1 GB buffers and fails on iOS ([WebKit 275958](https://bugs.webkit.org/show_bug.cgi?id=275958)). I found no measured tokens/s on a phone browser.
- **Constrained output:** WebLLM ships XGrammar (JSON, regex, EBNF), but we do not need it: with the proof check, a small model should **score** the lattice's candidates (one batched forward pass, summed log-probs), not generate.
- **Verdict: drop for the hackathon** (source plan: "stretch only, after Nov 26"). Honest next step: SmolLM2-135M rescoring in `packages/eval` under Node against B1 ghost (85.6% top-1); if it does not win, nothing to ship.

## 4. Typing fewer keys: what the research measured

| Work | What was measured | Context |
|---|---|---|
| SpeakFaster ([Nat Commun 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11530652/)) | 57% more motor actions saved than predictive keyboards (simulation); 29-60% faster entry for 2 eye-gaze typists | Letter initials, fine-tuned LLMs, conversation context, cloud |
| KWickChat ([IUI 2022](https://www.pokristensson.com/pubs/ShenEtAlIUI2022.pdf)) | About 71% keystroke savings, simulation only | Bag of keywords; GPT-2 **adds** words |
| Trnka et al. ([2008](https://www.eecis.udel.edu/~mccoy/publications/2008/trnka08at.pdf)) | 8.09 wpm (advanced prediction, 50.3% KS) vs 5.50 (basic, 18.2%) vs 5.06 (none) | Simulated 1.5 s per key; poor predictions get ignored |
| 3-Key-Input ([arXiv 2606.11642](https://arxiv.org/html/2606.11642)) | 3 keys is a practical minimum with LM decoding | Offline, "not real-time" |
| Ours, RESULTS.md | Initials on 12 keys: ceiling 3.1% of sentences; B4 MiniMax initials 0% top-5 | Ambiguous initials are far harder than SpeakFaster's letter initials |

Conclusions: (a) **drop the "Phantom" initials mode**. Our own eval shows it cannot work on keypad initials, and SpeakFaster's gains rely on letters plus a large model. (b) KWickChat-style keyword expansion adds words, so it breaks the proof check. Reject it. (c) Word completion and next-word prediction are the realistic savings, and they must be good or people ignore them (Trnka). Keep the rule that a completion is shown only when it matches the keys typed so far, and measure KSR in the eval before quoting anything.

## 5. Inputs that fit the 12-key idea

| Input | Works where | Effort | Verdict |
|---|---|---|---|
| USB/Bluetooth **numeric keypad** | Anywhere a keyboard works; the app already maps numpad digits, `*`, `/` and Enter (`lib/keyboard.ts`) | 0 (docs and one help line) | **Keep. Best honest Resurrection prop**: the physical 12-key feel, about $10 |
| USB **foot pedal** / switch interfaces that send keystrokes | Same as keyboard | 0 | Keep (mention in help) |
| **Gamepad API**, incl. Xbox Adaptive Controller (19 × 3.5 mm switch jacks, [Xbox](https://xbox.com/en-US/accessories/controllers/xbox-adaptive-controller)) | Gamepad API is Baseline ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/gamepad)); XAC pairs with iPhone/iPad ([Apple](https://support.apple.com/en-au/111101)); XAC buttons through Safari's Gamepad API **not verified** | S (1 day): poll in rAF, map any button to switch 1/2 | **Keep.** It turns the XAC, a common switch hub, into our switches |
| **DTMF "dial a sentence"**: decode a phone dial pad's tones from the mic (Goertzel, 8 bins, a few KB) | Any browser with getUserMedia; iPhone dial tones are "the standard tones for automated systems" ([Apple Community](https://discussions.apple.com/thread/254017582)); Android has a dial-pad-tones setting ([AOSP](https://git.replicant.us/replicant-next/packages_apps_Settings/plain/src/com/android/settings/notification/DialPadTonePreferenceController.java)) | S-M (1-2 days) | Optional demo garnish, low daily use. On iOS, opening the mic lowers or reroutes playback ([WebKit 236219](https://lists.webkit.org/pipermail/webkit-unassigned/2024-October/1189582.html), [311451](https://bugs.webkit.org/show_bug.cgi?id=311451)): run it on a laptop/tablet |
| **Sound switch** (click/hum via Web Audio) | Same mic caveats; it hears its own voice and the partner | S-M | Defer: iOS ducking and false triggers. iOS Switch Control already offers sound switches natively ([Apple](https://support.apple.com/en-lk/guide/iphone/iphc9d32b862/16/ios)) |
| **Device motion** (tilt/tap) | iOS needs `DeviceMotionEvent.requestPermission()` from a tap ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/requestPermission_static)) | S | Drop: anyone who can tap the phone can already touch the keys |
| Web MIDI pads | Chrome only; WebKit bug open since 2013 ([107250](https://bugs.webkit.org/show_bug.cgi?id=107250)) | S | Drop |
| Old phone keypad over BT / WebHID / Web Serial | Feature phones are not HID keyboards (not verified); Web Serial reached Chrome Android only in 148 ([Chrome](https://developer.chrome.com/release-notes/148)) | L | Drop |

## 6. Partner side

- **Second screen (QR to a live read-only view):** WebRTC needs signaling; without a server that is two QR scans (offer, answer), and raw SDP (about 2.5-3.8 KB) exceeds one QR unless compressed ([QWBP draft](https://magarcia.github.io/qwbp/spec.html)). The user must scan the partner's QR (hard with switches); across networks a third-party STUN server is needed; BroadcastChannel is same-browser only. **Drop** (L, flaky); Show mode with Flip covers face-to-face.
- **Captions of the partner on-device:** Chrome's on-device `processLocally` recognition is desktop-only; Android is listed as unsupported ([caniuse](https://caniuse.com/mdn-api_speechrecognition_processlocally), [blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/P8P-x7AnC6I)). Moonshine-tiny int8 is about 28 MB (7.9 MB encoder + 20.2 MB decoder, [HF](https://huggingface.co/onnx-community/moonshine-tiny-ONNX)); whisper-tiny.en is about 40 MB. M (2-3 days); a real privacy gain for "Listen" (audio now goes to Google/Apple), but the iOS mic issues apply. **After the hackathon.**
- **Phone calls:** a web page cannot put audio into a cellular call. iOS's "Add Audio in Calls" is a native AVFAudio API that apps request ([Apple](https://developer.apple.com/documentation/avfaudio/adding-synthesized-speech-to-calls)). Honest options: speakerphone, or a neural-voice WAV via Web Share. Help text only.
- **Send as a message:** Web Share already exists in the conversation sheet. Nothing new.

## 7. Small, newly possible, clearly useful

- **Screen Wake Lock** while the app is open (setting, default on): this keeps the screen from sleeping mid-conversation. It is fixed for Home Screen apps since iOS 18.4 ([Apple notes](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes)). S (½ day), 0 bytes. I found no wake lock code in `packages/web`.

## Ranked shortlist

1. **Best wow feature: Camera switch** (L). It is useful to real switch users, on-device, about 7 MB loaded on demand, the proof check is untouched, and it makes a clear video moment. Film it; do not run it live. Lighting and false triggers are the flaky part.
2. **Runner-up: offline natural voice with Kitten TTS 0.8 nano** (L, behind a day-1 phone speed spike). It fixes a stated limit and gives an "airplane mode" demo. If the spike fails, offer it for tablets and laptops only, or drop it.
3. **Cheap adds (S, do them anyway):** Gamepad/XAC switches, a numeric keypad in the help and video (the physical "Resurrection" shot), Wake Lock.
4. **Optional garnish:** DTMF dial-a-sentence, only if 1-2 days remain. Run it on a laptop.
5. **Drop:** on-device LLM (phones cannot run it; eval first), initials/Phantom mode (our 3.1% ceiling), personal voice / cloning (not reachable from Safari; consent risk), second screen (signaling), MIDI, device motion, old phone over BT, cloud anything.

Both L items together are about 9-10 days, the whole window: camera switch first, voice only after a hard day-1 go/no-go.
