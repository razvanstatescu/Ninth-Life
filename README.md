# Ninth Life

**The old keypad, back as your voice.**

Ninth Life is a free web app that brings back 9-key predictive text as a way to talk. Press keys 2
to 9, one press per letter, and Ninth Life speaks the sentence you meant. A proof check makes sure
every spoken word matches the keys pressed, so a language model can help rank sentences but can
never put words in someone's mouth. It works offline, in any modern browser, with a keyboard, touch
or a single switch.

> Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and
> is not intended to diagnose, treat or replace a clinical AAC assessment.

Built for Kiroween 2026 (Resurrection category).

## Status

Early development (milestone M1: ghost mode in the browser). See
[the implementation plan](docs/plan/01-implementation-plan.md).

## How it works

1. **Ghost mode (always on, offline).** The browser decodes the key codes with a frequency
   dictionary and a bigram model. No network needed.
2. **Model ranking (opt-in).** The browser sends the possible words per slot (the lattice) and the
   partner's last line to a decoder that asks Claude Haiku on Amazon Bedrock (EU region) to pick
   the most likely sentence.
3. **Proof.** Every candidate goes through a deterministic validator: each word must encode to
   exactly the keys pressed. Anything else is shown struck through and is never spoken.

## Repository layout

```
packages/core     keymap, validator, lexicon, language model, beam search, scanning (pure TS)
packages/web      Next.js app (App Router), design-system components, speech, PWA
packages/decoder  decode service: handleDecode(), Bedrock client, quotas, kill switch
packages/infra    AWS CDK stack (eu-central-1)
packages/eval     lexicon/bigram build scripts, evaluation harness, RESULTS.md
data/             lexicons and packs (CC BY-SA 4.0, see data/NOTICE.md)
design/           design system and brand canvas (source of truth for UI)
docs/             knowledge base: start at docs/README.md
.kiro/            Kiro specs, steering, hooks, agents, MCP config, power
```

## Develop

```bash
pnpm install
```

```bash
pnpm test
```

```bash
pnpm dev
```

Requires Node 22 and pnpm 10.

## License

Code: MIT ([LICENSE](LICENSE)). Data under `data/`: CC BY-SA 4.0 ([data/LICENSE](data/LICENSE),
[data/NOTICE.md](data/NOTICE.md)). Fonts: Atkinson Hyperlegible Next and Mono, SIL Open Font License.
