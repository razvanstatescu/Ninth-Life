# Ninth Life

**The old keypad, back as your voice.**

Ninth Life brings back 9-key predictive text as a free web app for typing to talk. Press one key per
letter on keys 2 to 9 and hear the sentence you meant: every spoken word matches the keys on screen,
and nothing gets there without your press. A proof check makes sure of that, so a language model
can help rank sentences but can never put words in someone's mouth. It works offline, in any modern
browser, with a keyboard, touch or a single switch.

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
   partner's last line to the app's `/api/decode` route, which asks a model to pick the most likely
   sentence: Claude Haiku through the Anthropic API, or MiniMax-M3 through MiniMax's
   Anthropic-compatible API ([ADR-002](docs/decisions/ADR-002-minimax-provider.md)).
3. **Proof.** Every candidate goes through a deterministic validator: each word must encode to
   exactly the keys on screen. Anything else is shown struck through and is never spoken.

## Repository layout

```
packages/core     keymap, validator, lexicon, language model, beam search, scanning (pure TS)
packages/web      Next.js app (App Router), design-system components, speech, PWA
packages/decoder  decode service: handleDecode(), Anthropic client, kill switch, route adapter
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

Requires Node 22 and pnpm 10. Ghost mode needs no key. For model ranking, copy
`packages/web/.env.example` to `packages/web/.env.local`, set `LLM_ENABLED=true` and either
`ANTHROPIC_API_KEY` or `MINIMAX_API_KEY` ([decoder docs](docs/architecture/decoder.md#providers-adr-002)).

## License

Code: MIT ([LICENSE](LICENSE)). Data under `data/`: CC BY-SA 4.0 ([data/LICENSE](data/LICENSE),
[data/NOTICE.md](data/NOTICE.md)). Fonts: Atkinson Hyperlegible Next and Mono, SIL Open Font License.

Development only: Lighthouse 13.6.0 (Apache-2.0), with Sentry CLI 0.49.0 (FSL-1.1-Apache-2.0) and oxc-parser 0.152.0 (MIT) pulled in through it, not shipped.
