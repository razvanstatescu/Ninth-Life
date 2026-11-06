# Competitive landscape: refresh

A short update to the source plan's section 2 table, checked on **2026-11-06**. The plan's rows are kept as background; this page records what is new and what was re-checked. Products are named for research only; never use their names or logos in the product, site or video (`.kiro/steering/trademarks.md`).

## How this was checked

- Kiroween 2026 gallery: https://kiroween.devpost.com/project-gallery shows **no projects yet** (galleries open after submissions close). The hackathon page lists 9,657 participants.
- GitHub repository search (public API, sorted by last update), with queries pairing `kiroween` with: `aac`, `morse`, `predictive`, the old 9-key trade name, `speech`, `text-to-speech`, `voice`, `keyboard`, `typing`, `switch`, `phone`, `communication`, `nonverbal`, `accessibility`, `resurrection`, `2026`; plus `morse-aac-decoder`, `aac predictive text`, `ambiguous keyboard aac`, `aac llm web` without `kiroween`.
- Search finds only repositories whose name or description match. Teams that name their repo differently, or keep it private until the deadline, are invisible. Treat "no competitor found" as "none visible today".

## Kiroween 2026 entries that touch our space

| Project | What it is | Verified | Overlap with Ninth Life |
|---|---|---|---|
| Dot-Dash (`Hussnain-Butt/dot-dash`) | "One-switch Morse code typing that speaks for people who can't speak or move much. Runs in the browser. Kiroween 2026 entry." Created 2026-10-31. | yes (repo search) | Closest rival: browser, single switch, speech output. Differs: Morse needs code learning; 9-key needs none, adds context ranking and the proof check. |
| Krishi Telegram (`tab-for-akshay/krishi-telegram`) | Resurrection entry: farm-advisory "telegrams" in 20 words, with Morse-code audio. Created 2026-11-01. | yes (repo and README) | Same category and "old tech returns" story; not a typing or AAC tool. |
| GhostLight (`Youssef123ya/ghostlight-kiroween-2026`) | Browser-local accessibility repair workshop for HTML, built with Kiro CLI. Created 2026-11-02. | yes (repo search) | Accessibility theme only; a developer tool, not an AAC tool. |
| Side A language lab (`RynoRocks/side-a-language-lab`) | 1980s cassette language lab with AI voice tutors. Created 2026-10-30. | yes (repo search) | Voice and resurrection, different users. |
| Kiroween Silver (`hugozerken/kiroween-silver`) | Senior-friendly phone plus smart-glasses vision assistant (Resurrection). Created 2026-11-01. | yes (repo search) | Accessibility-adjacent, different input and users. |

The "Resurrection" category is crowded with protocol and UI revivals (BBS, Gopher, IRC, teletext, RSS, pagers, messenger clients, a darkroom, HyperCard). None found revives 9-key text entry or targets typing to talk.

## Outside Kiroween, recent and related

| Project | What it is | Verified | Note |
|---|---|---|---|
| Morse AAC Decoder (`Hermit005-io/morse-aac-decoder`) | One-switch Morse typing that learns each person's timing; cites switch-Morse speed research. Created **2026-10-06**. | yes (repo and README) | The plan's missing "morse-aac-decoder" (open question 7). Created before the Oct 30 submission period, so it is not an eligible Kiroween 2026 project as it stands. Its description closely matches Dot-Dash. |
| KeyDeck Plus (`CALL911imonfire/KeyDeck_Plus`) | Free, customizable on-screen keyboard with dwell, swipe and switch scanning, word prediction, spoken phrases. Created 2026-10-21. | yes (repo and README) | Desktop keyboard replacement, full layout. Our angle stays: 12 large keys, sentence-level decoding, offline, browser. |
| Local AAC Desktop App (`KeriGagnow/Local-AAC-Desktop-App`) | Desktop AAC app using local retrieval (RAG) and ChromaDB to predict. Created 2026-10-04. | yes (repo search) | Local LLM-assisted prediction; desktop install. |
| Multimodal input with gaze, switch, voice and LLM (`guntas-13/multimodal-input-with-gaze-switch-voice-llm`) | Course project web app (2025). | yes (repo search) | Research prototype. |

## Plan section 2 rows, status

| Row | Status today |
|---|---|
| Cboard (GPL-3.0 code; symbol sets with their own licenses) | not re-checked (u) |
| FreeSpeech AAC (MIT, Svelte, GPT-assisted phrasing) | not re-checked (u) |
| Spoken AAC (commercial, LLM prediction) | not re-checked (u) |
| Predictable, Proloquo4Text, Keeble (commercial text AAC and keyboard) | not re-checked (u); prices may have changed |
| Proloquo2Go, TouchChat, LAMP WFL, TD Snap, Grid 3, CoughDrop | not re-checked (u) |
| SmartPredict (RERC on AAC) | not re-checked (u) |
| SpeakFaster (Google research) | not re-checked (u); figures in the plan come from the 2024 Nature Communications paper |
| Dasher, OS switch access and type-to-speak features | not re-checked (u) |
| Dot-Dash | re-verified (above) |

## What this means for us

1. No visible entry combines 9-key disambiguation, sentence decoding with a proof check, offline mode and switch scanning. The novelty claim in the Devpost text can say "we found no other entry that ..." with this date, not "the first".
2. Dot-Dash is the comparison judges will make. The video should show, in the first 30 seconds, that there is nothing to learn: the letters are printed on the keys.
3. The category is crowded with nostalgia revivals. Lead with the real problem (typing to talk is slow) and the safety idea (the model cannot put words in your mouth), not with nostalgia.
4. Re-run the searches on Nov 20 and Dec 2; the gallery itself only opens after the deadline.
