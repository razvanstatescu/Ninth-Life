# ADR-008: Reply types steer ranking only

- Status: accepted
- Date: 2026-11-11
- Decided by: the lead on this branch, to be confirmed by the product owner
- Spec: `web-ui` Requirement 29; `decoder-service` DS-9 (amends DS-5.2, DS-6.1, DS-6.6)
- Code: `packages/core/src/intent.ts` (`rankByIntent`), `packages/decoder/src/schema.ts` (`context.intent`),
  `packages/decoder/src/prompt.ts` (prompt v8)

## Context
When the other person has just spoken, the person typing often knows the kind of answer before the
words: yes, no, or a question. The keys alone cannot tell "no my way" from "on my way" (both `66 69 929`).
We want that choice to help order the sentences without letting anything but the keys decide the words,
and without sending more than needed.

## Options
1. Free-text tone or instruction to the model. Rejected: it is text the person did not mean to say,
   it is a prompt-injection path, and it suggests the model decides.
2. Reply types that add words (for example "Yes," in front). Rejected: breaks "every spoken word matches
   the keys pressed".
3. Partial accept (tap one word of a suggestion). Rejected for now: every word is already typed, so
   there is nothing left to accept; word targets would break the 56px rule; switch scanning would need a
   third level. A word chip in the proof sheet would need its own spec.
4. Three toggles, Agree / Disagree / Ask, that only reorder sentences that already match the keys.
   Chosen.

## Decision
- **Set:** Agree, Disagree, Ask. None pressed means no steering. They reorder; Ask also sets a visible "?"
  (punctuation, outside the words) that the person can change or remove.
- **Offline:** `rankByIntent(candidates, intent?)` in `@ninth/core`, pure. Adjusted score = score +
  `INTENT_WEIGHT` (2, log10 units) x `intentCue(words, intent)`, then a stable sort. Cues read only the
  candidate's own words: Ask +1 for a question starter first; Disagree +1 for no/not/never/nope/nah first,
  +1 for any negative word (including the "n't" forms), -1 for an agreeing word first; Agree +1 for an
  agreeing word first, -1 for no/not/never/nope/nah first. The output is always a permutation of the
  input, so every sentence still passes `validate()`. The app decodes a pool of `INTENT_POOL` (12),
  re-ranks it and shows the top 5.
- **Model:** optional `context.intent` (`agree` | `disagree` | `ask`) in the decode request; anything
  else is a 400 that names the path, never the value. Prompt v8 renders it as
  `<reply_type>agree</reply_type>` right after `<partner>` and adds rule 8: use it only to order
  readings of the same keys; it never changes rules 1 to 4. One new invented few-shot (`66 69 929`,
  partner "Are you coming?", agree, answer "on my way") validates. The system prompt stays a constant.
- **Fallback:** the client sends beams it already re-ranked, so the degraded reply follows the reply
  type with nothing added on the server.
- **Privacy:** the reply type is sent only while model ranking is on, and is named in every "what is
  sent" sentence. It is never logged: `DecodeMetrics` has no field for it, and the DS-6 property puts a
  reply type on every path and checks that no log line has an `intent` key or a reply-type value.

## Consequences
- Offline, the keys already decide almost every word, so the visible change is mostly the "?" and the
  no/on cases. On the fixture items with a reply type read off the gold sentence,
  `pnpm -F @ninth/eval eval -- --intent oracle` (full frozen set, prints only) showed no change in sentence top-1 against B1. Any
  effect with the model is unmeasured: `pnpm -F @ninth/eval llm --intent oracle` (an upper bound) and a
  v6-vs-v8 regression without a reply type need a key. Copy makes no effect claim until a result is in
  `packages/eval/RESULTS.md`.
- The system prompt grows by about 140 estimated tokens (chars / 4); it stays above the Haiku 5.5 cache
  minimum.
- Copy must not say the model understands or decides: "Agree, Disagree and Ask change the order of the
  sentences for your keys. They never change the words."
- The way back: drop `context.intent` from the client request (the field is optional) and stop calling
  `rankByIntent`; prompt v8 without a reply type renders the same user turn as v6.
