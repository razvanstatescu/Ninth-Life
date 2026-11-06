# Devpost text (draft)

Draft of the project description, following the plan's outline (plan §8): problem; what it does; resurrection story;
proof panel; access modes; privacy; eval results from RESULTS.md only; built with; lessons; disclaimer.
Last updated 2026-11-06. Before pasting into Devpost: fill every `[...]`, re-copy the numbers from
`packages/eval/RESULTS.md` on the day, run `node scripts/tm-lint.mjs docs/submission/DEVPOST.md`, and check every
claim against `.kiro/steering/product.md` (banned claims).

---

## Ninth Life

**The old keypad, back as your voice.**

Ninth Life is a free web app that brings back 9-key predictive text as a way to talk. Press keys 2 to 9, one press per
letter, and Ninth Life speaks the sentence you meant. A proof check makes sure every spoken word matches the keys
pressed, so a language model can help rank sentences but can never put words in someone's mouth. It works offline, in
any modern browser, with a keyboard, touch or a single switch.

> Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to
> diagnose, treat or replace a clinical AAC assessment.

Try it: [APP_URL] · Code: [REPO_URL] (MIT; data CC BY-SA 4.0) · Video: [VIDEO_URL]

## The problem

Some people type to talk, for an afternoon or for good. Typing a sentence letter by letter is slow, and with a single
switch every letter means waiting for a highlight to step through a grid. Many AAC tools are designed for children; some
cost money or need an account and a connection.

## What it does

- **Type on 9 keys, hear your sentence.** Keys 2 to 9 carry the letters; one press per letter, 0 for space. The app
  decodes the key sequence into words and ranks whole sentences.
- **Ghost mode, offline, always on.** An on-device dictionary and a word-pair model decode the keys in the browser,
  with no network. After one visit the app works offline.
- **Model ranking, opt-in.** If you turn it on, the possible words for your keys and the other person's last line go to
  Anthropic's Claude API, which picks the most likely sentence from those words only.
- **Speak, or show.** Speak uses your device's voices; on-device voices are listed first and online voices are
  labelled. With no voice, the sentence appears in big text for the other person to read.
- **Saved and quick phrases**, stored on your device only.

## The resurrection

Many people once wrote whole messages on a 12-key phone keypad with predictive text. Ninth Life brings that input
method back, not for messages but as a voice, in the browser, with modern accessibility: large targets, high
contrast, no time limits, and switch scanning. [Optional history paragraph only with a cited source in
`docs/research/`; the plan's "1998" line has no source yet.]

## The proof panel

Every word on screen carries a chip: it **matches your keys**, it is **new** (not in your words yet), or it was
**rejected**. A deterministic validator re-encodes every candidate word and drops any that does not spell exactly the
keys pressed, on the server and again in the browser. When the model suggests a word your keys do not spell, the panel
says so ("The model suggested "wafer". Your keys spell "water", so "wafer" was dropped and will not be spoken."). The
model can reorder; only the person decides what is said, and only a Speak press speaks.

## Access

- **Keyboard:** top-row or numpad digits, Enter to speak, Backspace to delete, arrows to choose a sentence.
- **Touch:** 12 large keys (96px or 128px, never under 72px), single taps only, no swipes or long presses.
- **One or two switches:** row-then-key scanning with adjustable speed (0.4 to 5 s a step), and every sheet and
  setting is reachable by switch.
- Night and Day themes, Atkinson Hyperlegible type, no motion beyond a 120ms highlight change, reduced motion honoured.

## Privacy

No accounts, no cookies, no analytics, no ads. Ghost mode never touches the network. Model ranking is off by default;
when on, it sends the typed digits, candidate words and the "They said" line to Anthropic's Claude API (processed in
Anthropic's infrastructure; Anthropic says it deletes API inputs and outputs within 30 days unless it must keep them for
policy or legal reasons). The decode route logs no request content. If you choose an online voice, your browser sends
each sentence to its maker's speech service to turn it into sound; on-device voices keep it on the device.

## How well does it decode? (simulated-user measurements)

These numbers are from our evaluation harness, which **simulates** a typist pressing the right keys for each test
sentence. They are not measurements with people, and they say nothing about communication speed for any user.
Method: [`docs/architecture/data-and-eval.md`](../architecture/data-and-eval.md) and
[`packages/eval/RESULTS.md`](../../packages/eval/RESULTS.md) (866 test sentences from public AAC text datasets, seed 9, top 5).

| Config (simulated typing) | Word accuracy | Intended sentence ranked first | Intended sentence in the top 5 |
|---|---|---|---|
| Dictionary order only (B0) | 91.5% | 62.4% | 92.0% |
| Ghost mode, offline (B1) | 96.8% | 85.6% | 97.3% |
| Ghost mode, AACText subset (566) | 97.3% | 88.7% | 98.4% |
| Ghost mode, Turk dialogue subset (300) | 96.2% | 79.7% | 95.3% |
| Model ranking (B2-B4) | not run yet | | |

Notes: some AACText test sentences are short stock phrases that also occur in the training text, so the AACText subset
is somewhat optimistic; the Turk subset is shown next to it for that reason. In letter mode every letter is still one
press, so keystroke savings are about zero by design (RESULTS.md, KSR column). Decode latency is in RESULTS.md; it is
wall-clock per call in Node, varies run to run, and is not a browser measurement, so we do not quote it here. [Update the table from RESULTS.md after the final eval run; add B2-B4 only if run.]

## User feedback

[Fill from `docs/validation/protocol.md`, public validation log, only. If no session took place with a person who uses
AAC, write: "Not tested with people who use AAC yet." Never present feedback as efficacy evidence.]

## How we built it

- **Next.js** web app (App Router) with a service worker for offline use, plain CSS from our design tokens.
- **@ninth/core**, a pure TypeScript engine: keymap, validator, lexicon and digit trie, word-pair model, beam search,
  formatter and the switch-scanning reducer, with property-based tests named by requirement.
- **@ninth/decoder**: one route that calls Anthropic's Claude API with a lattice-constrained prompt, validates every
  candidate, and falls back to ghost mode on any error or after 1,500 ms; a kill switch and a spend limit keep it free.
- **Data:** a 58,906-word English lexicon and word-pair model built from open data (wordfreq, AACText, Turk dialogues),
  CC BY-SA 4.0 with a NOTICE.
- **Kiro:** specs with EARS requirements, steering, hooks, custom agents, MCP and a custom power.
  See the Kiro write-up: [KIRO_WRITEUP link]. [Fill only from KIRO_WRITEUP.md once its TODOs are evidence.]

Built with: Kiro, TypeScript, Next.js, React, Serwist, fast-check, Vitest, Playwright, Anthropic Claude API, Web Speech API.

## What we learned

[TODO from the team, from real events. Candidates already documented in the repo: the property test that found
accents typed as apostrophes breaking a word's code (`docs/architecture/core.md`, Finding 1); browser speech differs
more than expected (`docs/research/web-speech.md`); why the product states a general-purpose intended purpose.]

## What's next

[Romanian and Spanish packs if they make the cut; personal vocabulary packs kept in the person's own private repo;
the user-feedback changes.]

---

Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to
diagnose, treat or replace a clinical AAC assessment.
