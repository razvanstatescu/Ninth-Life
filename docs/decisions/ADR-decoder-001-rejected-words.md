# ADR-decoder-001: Return the model's rejected words, not just a count

- Status: accepted
- Date: 2026-11-06
- Plan item: F7 (`docs/plan/01-implementation-plan.md`)
- Contract: `docs/architecture/contracts.md` §3 (`POST /api/decode` response), additive

## Context
The proof panel design strikes through the model's wrong word ("wafer" next to "water") so people
can see the model was overruled. The decoder only returned `rejected: number`, so the panel could
show a struck word only when the client's own re-check caught it, which never happens for words
the server already dropped.

## Decision
The 200 response gains one field (all existing fields unchanged):

```ts
rejectedWords: { slot: number; word: string; expectedCode: string }[];
```

- For each rejected model candidate **with one word per slot**, in model order, every word that
  does not match its slot's code (`validate([word], [codes[slot]], mode)` is false).
- `word` is the core-`normalize`d form and must match `^[a-z]+(?:'[a-z]+)*$` with at most 16
  characters; any other string is left out, so no model text beyond such a word reaches the client.
- Never a word that appears in any returned candidate (so a struck word is never also offered).
- One entry per (slot, word), at most 5. `expectedCode` is `codes[slot]`.
- `[]` on degraded replies (timeout, error, unparseable) and when nothing was rejected. A rejected
  sentence with the wrong number of words contributes nothing (its words do not line up with the
  keys); it is still counted in `rejected`.
- Not logged: `DecodeMetrics` keeps only the `rejected` count (DS-6).

`DecodeResponseSchema` and `RejectedWordSchema` (zod) describe the response; tests check every
handler reply against them.

The web client re-checks each item (slot in range, `expectedCode === codes[slot]`, word shape,
the word really does not match the keys, not in an accepted sentence), caps at 5, and passes them to
the proof panel as `RejectedSuggestion` entries with `slot` set. The panel renders them as
`nl-chip--reject` chips (struck through, "will not be spoken") with a note such as: *The model
suggested "wafer". Your keys spell water or waves, so wafer was dropped and will not be spoken.*
Nothing in this path can make a word speakable.

## Alternatives
- Return the whole rejected sentences: more model text in the response for no display gain, and
  sentences of the wrong length cannot be aligned anyway.
- Keep only the count: does not meet the design.

## Consequences
- Requirement decoder-service DS-1.7, property-tested in `packages/decoder/test/handler.test.ts`
  ("DS-1.7 rejected words are never in candidates ..."); the DS-6 privacy property now includes a
  path where the response carries a rejected word that must not be logged.
- Older clients ignore the field; a client talking to an older server sees no `rejectedWords` and
  falls back to the count note.
