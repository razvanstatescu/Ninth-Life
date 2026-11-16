---
inclusion: always
---

# Product: Ninth Life

Ninth Life brings back 9-key predictive text as a free web app for typing to talk. People press keys 2 to 9, one press per letter, and Ninth Life speaks the sentence they meant. A proof check makes sure every spoken word matches the keys on screen, and nothing gets there without your press, so a language model can help rank sentences but can never put words in someone's mouth. It works offline, in any browser, with a keyboard, touch or a single switch.

Kiroween 2026, Resurrection category. Submission deadline: Dec 4, 2026, 2:00 pm PT. The app must stay free and working until judging ends on Jan 29, 2027.

## Intended purpose (use this sentence verbatim)

> Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment.

It goes in the app (About and first run), the README, the website footer, the Devpost text and the video's closing card. Never shorten or soften it. Why: EU guidance (MDCG 2019-11 rev.1, Annex IV) classifies an app "intended to assist persons with a communication disorder ... talk by converting a set of selected symbols into spoken language" as Class I medical device software. Whether software is a medical device turns on the intended purpose the maker states in labels, instructions and promotional material. We state a general-purpose one and keep every claim consistent with it. This is a risk note, not legal advice.

## Who it is for

- Adults who can spell and want to type instead of speaking, for any reason, for an afternoon or for good.
- The people around them: family, friends, conversation partners.
- Speech-language professionals who want a free tool to try.

Write for adults. No cartoons, no baby talk. Describe the tool ("type on 9 keys, hear your sentence"), not the person. When a group must be named, say "people who use AAC". Do not aim product copy at diagnoses or conditions (no "for people with ALS", "for aphasia"): naming a condition the tool is "for" reads as a medical intended purpose. Research notes and the write-up may cite studies, clearly as background.

## What it does (v1)

- Letter mode (default): one key press per letter, offline dictionary decoding ("ghost mode") that always works.
- Optional language-model ranking ("model ranking", opt-in) through the configured provider: Anthropic's Claude API or MiniMax's Anthropic-compatible API (ADR-001, ADR-002). The proof check shows whether every word matches the keys ("Check the words").
- Spell a word letter by letter, "My words" and word packs (web-ui Req 19-22).
- Access: keyboard, touch, 1-switch and 2-switch scanning with adjustable speed.
- Web Speech voices, voice picker, saved phrases on the device only; Show mode (big text, Flip for the person opposite).
- "They said": the other person's last line, typed or heard with Listen (the browser's speech recognition, off until allowed, ADR-004).
- The conversation (web-ui Req 27, ADR-007): what they said and what you said, newest first, kept in memory only and gone on reload. Say again, Show, Copy or Share a turn; Clear conversation asks first.
- Quick replies (web-ui Req 28): "Hold on." "Yes." "No." "Pardon?" "Thanks." one press away when nothing is typed, and in Menu while typing. Each speaks only when pressed; off in Settings.
- Reply types after the other person speaks: Agree, Disagree, Ask. They only change the order of the sentences for your keys, never the words; Ask also adds a question mark (ADR-008, web-ui Req 29).

## Devices (web-ui Req 24, 25; ADR-003)

**Phones are the first target, tablets the second, laptops third.** On phones and tablets the main screen fits the visible screen and never scrolls: sentence card, suggestions, keypad and the action bar [Menu] [Speak] [Show]; everything else opens in a sheet. Tablets work in both orientations (landscape puts the keypad on the right). **Phones are portrait only**: held sideways they show "Turn your phone upright" and keep the sentence. That is a decision by the product owner and a known WCAG 1.3.4 exception; do not "fix" it without a new decision. Check layout changes with `test/e2e/responsive.mjs` (24 measured sizes). The website at `/` is a normal scrolling page and works in both orientations on phones (ADR-006).

## Non-goals

- Not a symbol or core-vocabulary AAC system, not a replacement for anyone's AAC device or clinical assessment.
- No diagnosis, therapy, progress tracking or health data.
- No accounts, no cookies, no analytics, no ads, no paid tier.
- Does not serve people who cannot spell yet; say so plainly.
- No native apps in v1. English first; Romanian and Spanish only as add-on packs.

## Banned claims

Never write, say, or imply any of these, in UI, docs, commits, video, posts or code comments:

- That it treats, helps recover, rehabilitates, restores speech, or is therapy.
- That it is clinically proven, clinically validated, evidence-based, approved, certified or a medical device.
- That it replaces an AAC device, a speech-language assessment or professional advice.
- Any speed, accuracy or keystroke-saving number that our own eval (`packages/eval/RESULTS.md`) did not measure, or any number without a link to the method.
- Research results (for example SpeakFaster) presented as ours.
- "AI understands you", "reads your mind", or anything that suggests the model decides what is said. The person decides; the model only ranks words that match their keys.

Allowed: "free", "works offline", "runs in your browser", "every spoken word matches the keys on screen, and nothing gets there without your press" (short form: "every spoken word matches the keys on screen"; web-ui Req 31.8; the older wording about the keys "you pressed" is retired since Finish the word), and numbers copied from RESULTS.md with the method linked.

## Honest limits to keep visible

Needs literacy and spelling. Voices depend on the device. Model ranking sends the typed digits, candidate words, the partner's last line and the reply type picked (if any) (and, only with "Include what you said" on, the person's last 3 sentences) to the configured provider (`lib/rankingProvider.ts` holds the exact copy): Anthropic (not only in the EU; deletes API inputs and outputs within 30 days unless it must keep them for policy or legal reasons) or MiniMax (no published deletion period or no-training promise; data stored in the US). Listen may send the other person's voice to the browser maker (Google in Chrome, Apple in Safari). Not tested with AAC users unless the user-validation log says so. Not yet tried on real phones and tablets, only in simulators.

## How we work

Spec first for anything non-trivial: `.kiro/specs/<name>/` with EARS requirements, design and tasks, and fast-check properties for the core logic. Each task names the requirement IDs it satisfies. Bugs worth a record get a Bugfix spec. Log Kiro usage in `docs/KIRO_LOG.md` (the `log-task` hook adds spec tasks; add other sessions by hand). Contracts between packages live in `docs/architecture/contracts.md`; decisions in `docs/decisions/`.

