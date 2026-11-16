# Competitors and similar apps: findings (researcher "competitors", 2026-11-14)

Search results plus a few page fetches. Reddit and most store review pages were not reachable, so "what reviews say" is thin and flagged. Prices vary by store and date; treat all as indicative. Dot-Dash, Morse AAC Decoder, KeyDeck, Cboard and FreeSpeech are in `docs/research/competitive-landscape.md`; not repeated except where new.

## 1. Feature matrix (text-based AAC)

| Product | Platform / price | Prediction | Voices | Access | Conversation / phrases | Offline / privacy |
|---|---|---|---|---|---|---|
| Proloquo4Text (AssistiveWare) | iPhone, iPad, Watch; one-time, listed USD 119.99 on one store page, third-party prices conflict ([listing](https://apps.apple.com/dm/app/proloquo4text/id751646884)) | Self-learning "PolyPredix" word prediction | Device voices | Not verified | Own phrases, grouping, history of what you said | Works without internet; no cloud sync, manual backup (third-party summary, [marlvel](https://marlvel.ai/apps/proloquo4text)) |
| Proloquo (AssistiveWare) | iOS 26+; USD 9.99/mo or 99.99/yr, 3- and 5-year licences ([listing](https://apps.apple.com/us/app/proloquo/id1521978238)) | Keyboard with word prediction | Acapela voices, Personal Voice | Not listed; developer says "not intended for people with vision or motor issues" | Core-word vocabulary | Offline not stated. Rating 4.0 (149) |
| Predictable (Therapy Box) | iPad/iPhone; USD 159.99 US, GBP 149.99 UK ([UK](https://apps.apple.com/gb/app/predictable/id404445007), [US](https://apps.apple.com/es/app/predictable/id404445007?l=en-GB)) | Word and sentence prediction; online prediction for some languages, daily quota | Device, Personal Voice, ModelTalker, Acapela, SpeakUnique, Voice Keeper, ElevenLabs; offline fallback voice | Bluetooth switch, head-tracking face gestures | Phrase banks | Reviews praise support and voice options; complaints: login after update, crashes, marketing emails ([search summary](https://apps.apple.com/au/app/predictable/id404445007)) |
| Spoken AAC | iOS, Android; free base, Premium USD 12.99/mo, 99/yr, 249 lifetime ([pricing](https://spokenaac.com/help/does-spoken-cost-anything/)) | Learns from your speech, names, places, 60k words, context modes (eating, shopping, medical, school) | 19 built-in, Personal Voice, ElevenLabs cloning (subscribers), Acapela (Android) | Typing, handwriting, VoiceOver/TalkBack; eye-tracking compatibility "tested" | Saved phrases, Show Large, attention button, share text or audio | Incognito Mode (stop learning), Block Words ([features](https://spokenaac.com/features)); offline not stated |
| Speech Assistant AAC | Android, iOS; Android free with upgrades, iOS one listing USD 23.99 (conflicting) | None found | Device voices, Personal Voice, ElevenLabs (one listing) | Not verified | Categorised phrase buttons, full-screen large text | Works offline; ~78% five-star on iOS; one Play review: used in a hospital emergency ([search](https://apps.appfollow.io/ios/speech-assistant-aac/1139762358?country=us)) |
| TD Snap / TD Talk (Tobii Dynavox) | iOS/Windows | Word prediction, resettable learning ([TD Snap Text](https://us.tobiidynavox.com/pages/td-snap-text)); AI phrase prediction shown in TD Talk, March 2025 ([release](https://www.gurufocus.com/news/2741666/tobii-dynavox-shows-how-ai-empowers-people-with-disabilities-at-microsoft-ability-summit)) | Microsoft Neural Voice in TD Talk | Eye gaze, switch (maker's focus) | Topic-organised phrases | Not verified |
| Grid 3 / Grid for iPad (Smartbox) | Windows / iPad; Grid for iPad USD 299.99 or 10.99 subscription, Grid 3 about GBP 480-550 ([sources conflict](https://apps.apple.com/us/app/id1064332378)) | prediction licensed from a mainstream keyboard maker | ElevenLabs integration with cloning (secondary source) | Eye gaze, switch, computer control (Grid 3) | Chat history, memory, Text Talker | Not verified |
| Flexspeak AAC | App Store; USD 9.99/mo, 99.99/yr, 199.99 lifetime, 30-day trial | "AI Prediction": partial phrases to full sentences | Not verified | Not verified | Not verified | Not verified |
| Cboard | Web, apps; free, 46 languages | Symbols, typing alongside pictures | Browser | Not verified | Boards | Offline on Chrome only; cookies for analytics ([site](https://www.cboard.io/)) |

Not verified: Voiceitt, ClaroCom, CoughDrop, Avaz, TippyTalk (no source opened). The names "UKO", "K-Hermes", "Kiko" (Tobii/Grid ambiguous keyboards): a search found nothing, so treat them as not existing as products.

**Pattern in reviews (thin evidence).** Praise: vocabulary, voice choice, support, simple offline "just talk" apps. Complaints: price, subscriptions, crashes after updates, marketing, lack of visual/motor adjustment ([Proloquo](https://apps.apple.com/us/app/proloquo/id1521978238)). Cost is a recurring theme: voice banking costs "free to $1,500" plus device costs ([WebMD](https://www.webmd.com/brain/voice-banking)).

## 2. Built-in OS features (free, and what a web app can or cannot match)

- **Apple Live Speech**: type, speak in phone and FaceTime calls, through the speaker, with Favorite Phrases that sync via iCloud (third-party guide; [Apple](https://support.apple.com/105018)). Personal Voice: on-device, 10 phrases in iOS 26 per a secondary source ([iGeeks](https://www.igeeksblog.com/accessibility-features-in-ios-26-macos-26/)). Eye Tracking (front camera), head tracking, dwell, Vocal Shortcuts ([AFB](https://www.afb.org/blog/entry/ios-26-accessibility-features)).
- **Android**: Camera Switches, Project Activate, Look to Speak (text-free mode 2024), Live Transcribe, Project Relate ([Google](https://blog.google/outreach-initiatives/accessibility/making-android-more-accessible/amp/), [2024](https://blog.google/outreach-initiatives/accessibility/ai-accessibility-update-gaad-2024/)).
- **Windows Eye Control**: dwell keyboard, prediction above keys, shape writing, a text-to-speech window ([Microsoft](https://support.microsoft.com/en-US/accessibility/windows/eye-control/eye-control-basics-in-windows)); hardware requirement sources conflict.
- **A web app cannot**: speak into a phone call, use Personal Voice (browser access not verified), or read the camera as a switch without our own work. **It can**: be a big-key target for OS eye/head/dwell input (the OS drives the pointer; test it), run on any device, and be the thing Live Speech lacks: sentence decoding with fewer targets. Live Speech is plain typing; Apple's own typing in Live Speech has no 12-key mode.

## 3. Ambiguous and reduced keyboards: what happened

- 9-key predictive text was fast by keystrokes: KSPC about 1.007 for dictionary disambiguation vs 2.03 for multitap, though that figure "rests on assumptions"; weak spots are non-dictionary words needing a mode switch and collisions needing an extra press ([MacKenzie UIST 2001](https://www.yorku.ca/mack/uist01.html)). I found no source on why people left; the obvious cause, touchscreen QWERTY with autocorrect, is my inference, not a sourced fact.
- Revival is hardware QWERTY (Clicks, Unihertz Titan 2), not 9-key; Hackaday covered a DIY 9-key keypad for smartphones (hackaday.com, 2026-06-24). KaiOS: WhatsApp support ended ([TechCrunch 2024](https://techcrunch.com/2024/10/05/5-dumbphones-that-can-still-run-whatsapp)); no 2026 market data found.
- AAC research: ambiguous keyboards originated in AAC; fewer keys means larger targets and less scanning time, but more ambiguity ([review](https://pubs.asha.org/doi/abs/10.1044/aac13.1.12), [York](https://www.yorku.ca/mack/TOCHI2010.html)). MacKenzie and Felzer's SAK: one key, one selection per character; a review site reports 1.834 scan steps per character ([summary](https://a11y-paradise.onrender.com/reviews/69dbafc605ba885c9e7e913c), secondary); follow-on Qanti reached 6.59 wpm. Ours is 3.57 steps per character (RESULTS.md), so scanning efficiency is a place to gain.
- MessagEase: 12-key layout still sold, stale on iOS (user reviews of crashes, no update in four years) ([App Store](https://apps.apple.com/us/app/-/id990325092)). Minuum, 8pen: not verified. Dasher: still described by Microsoft as unlike other predictors ([Microsoft](https://blogs.microsoft.com/accessibility/dasher-software-remains-an-amazing-alternative-to-traditional-on-screen-keyboard/)); no recent adoption data.
- **Lesson (inference):** these died of weak distribution and learning cost, not that the idea failed in AAC. We differ by printing the letters on the keys.

## 4. AI in AAC, 2024-2026

- **SpeakFaster** ([Nature Comms 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11530652)): initials-only entry plus LLM expansion; simulated KSR 0.657 vs 0.482 for a mainstream phone keyboard's prediction; two eye-gaze users 29-61% faster (6.54 vs 4.05 wpm scripted); non-AAC users saved keystrokes but were not faster; reviewing options took 12.7-21.2 s; "significant cognitive overhead"; needs internet, a 64B model and conversation context. The paper reports no participant comments on trust or authorship.
- Shipping: Spoken (AI prediction), Flexspeak ("partial phrases to full sentences"), TD Talk (AI phrase prediction). Voices: ElevenLabs Impact program with Bridging Voice and the Scott-Morgan Foundation gives free clones to eligible adults ([ElevenLabs](https://elevenlabs.io/blog/impact-program-announcement)). Acapela and The Voice Keeper appear in Predictable's voice list. "KWickChat", "Speak Ease", ModelTalker details: not verified.
- Trust and authorship: the AAC community consultation (Griffiths et al., [J Enabling Tech 2024](https://discovery.dundee.ac.uk/en/publications/use-of-artificial-intelligence-ai-in-augmentative-and-alternative/)) found broad support for a Code of Practice; full text paywalled, so findings not verified. A 2025 paper "Whose line is it anyway?" on AI and authentic authorship exists (title only, not verified). No clinician or user quotes on errors were found.

## 5. Conclusions for Ninth Life

### (a) Table stakes we lack

**A1. Word completion while typing a word** (Proloquo4Text, Predictable, Spoken, Grid, Windows Eye Control all offer it)
- Problem: letter mode saves 0% keystrokes (lead finding 1).
- Solution: after 2+ key presses, offer the top 3 dictionary words that match the keys; one press accepts the word. Reuse the decoder's lexicon; the proof check holds by construction.
- Why: it is the one feature every text-AAC app has, and SpeakFaster shows keystroke savings are what users feel.
- Effort: M. Risks: more targets on a calm screen; keep 3 slots, big and stable.

**A2. History / "say it again"** (Proloquo4Text, Grid chat history)
- Problem: re-typing a sentence the partner missed costs the full effort.
- Solution: a session-only list of the last ~10 spoken sentences, tap to re-speak or save. Memory only; clears on close, matching privacy.md.
- Why: the thread exists; this makes it reusable. Effort: S. Risks: storing without a press; keep it memory-only and say so.

**A3. Voice controls and an attention sound** (Spoken, Speech Assistant: rate, pitch, attention button)
- Problem: voices vary by device; a person needs to get attention before speaking.
- Solution: voice picker, rate slider, optional chime before speaking. Effort: S. Risks: browser voice list differs; test iOS Safari.

### (b) Cheap differentiators

**B1. Initials mode with proof check** (SpeakFaster's best path, without its cloud)
- Problem: one press per word. Solution: the existing core mode gets a UI; the decoder proposes sentences for the initials, the proof check rejects any that do not match. Why: best-evidenced speed idea in the field; nobody ships it offline and verified. Effort: M-L. Risks: SpeakFaster found cognitive overhead and poor results off-script; ship as optional, show "no match" honestly.

**B2. Scanning efficiency for 12 keys**
- Solution: frequency-ordered scan, SAK-style (1.8 steps per character reported vs our 3.57). Why: paid apps scan generic keyboards. Effort: M. Risks: moving targets confuse switch users; keep a stable-order option.

**B3. Privacy controls as a visible feature**
- Spoken needs Incognito and Block Words because it learns by default. We never learn: say so, and offer "My words" as opt-in. Effort: S.

**B4. Test and document dwell/eye/head use with OS features**
- Large keys suit Apple Eye Tracking, Windows Eye Control. Verify dwell-click works, add a "hover-safe" mode. Effort: S. Risks: not tested with users; claim only "works with", never "for".

### (c) Do NOT copy

- Cloud voices and cloning (ElevenLabs): cloud dependency, paid tiers; instead document how to use the device's own voice.
- Learning from everything typed and cloud sync: breaks "nothing stored without a press".
- Whole-sentence LLM generation (Flexspeak-style "complete the sentence"): drops the proof check.
- Subscriptions, ads, marketing email (Predictable complaint).
- Symbol boards (Cboard, Proloquo): different user, GPL and licence issues.
- Therapy or "for condition" framing.
- Phone-call speaking: a browser cannot do it; do not promise.

### (d) The 3 competitor features with the strongest evidence of user value

1. **Abbreviation/initials expansion** (SpeakFaster): eye-gaze users 29-61% faster, KSR +14-46 points; but only two AAC users and a cloud model ([paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC11530652)).
2. **Voice choice and personal voice** (Predictable, Spoken, Apple): the most-mentioned praise; poor speech is "a significant negative factor" (Microsoft paper cited via search; not opened). Our share: pick and tune the device voice.
3. **Fast, offline saved phrases with large display** (Speech Assistant, Spoken Show Large): the hospital-emergency review; we already have them, so protect them.

Rejected for lack of evidence: emotion/tone prosody (no source found), multilingual (out of scope, English only).
