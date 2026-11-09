# MiniMax models, prices and API rules for the decoder

Checked: 2026-11-09. Owner: decoder. Decision: `docs/decisions/ADR-002-minimax-provider.md`.
Markers: **Verified** (official MiniMax page read on the date above), **Unverified** (third-party
or not found).

## Summary

| Model | API ID | Input / output per 1M tokens | Cache read | Thinking | Status |
|---|---|---|---|---|---|
| MiniMax-M3 (decoder default with MiniMax) | `MiniMax-M3` | $0.30 / $1.20 (prompts up to 512K) | $0.06 | off when omitted; `disabled` keeps it off | Verified |
| MiniMax-M3.1-Flash | `MiniMax-M3.1-Flash` | $0.15 / $0.60 | $0.015 | always on; `disabled` is a 400 | Verified |

Sources: <https://platform.minimax.io/docs/guides/pricing>,
<https://platform.minimax.io/docs/api-reference/text-anthropic-api>,
<https://platform.minimax.io/docs/guides/text-generation>.

Per decode (~1,350 in / ~105 out tokens, no cache): MiniMax-M3 about $0.00053, so $40 is about
75,000 decodes (estimate, same token counts as Haiku 5.5 in `docs/architecture/decoder.md`).

## Request rules we rely on

- **Endpoint** (Verified): `POST https://api.minimax.io/anthropic/v1/messages` (international).
  China: `https://api.minimaxi.com/anthropic`. **No official EU host found**; a blog post mentions
  `api-eu.minimaxi.com` (Unverified). `MINIMAX_BASE_URL` overrides the host.
- **Auth** (Verified): curl examples send `Authorization: Bearer <key>`; the Anthropic SDK setup
  (which sends `x-api-key`) is also documented. The decoder sends both.
- **anthropic-version**: not documented; the decoder sends `2023-06-01` (the Anthropic SDK default).
- **Sampling** (Verified): `temperature` ignored (always 1), `top_p` ignored (0.95), `top_k`
  ignored. The decoder sends none.
- **Thinking** (Verified): counts toward `max_tokens`. M3: omitted = off, `{type: "disabled"}` =
  off. M3.1-Flash: always on, `output_config.effort` `low`..`max`, default `max`, `none` is a 400.
- **`system`** as supported (Verified); as an array of text blocks: not documented, works in the
  Anthropic SDK shape (confirm with the live check). **`cache_control`**: not documented; not sent.
- **Response**: content blocks `thinking` and `text`; the decoder reads `text` blocks only.

## Privacy and data terms

- API privacy policy (updated 2026-03-30): personal data "stored in the data center located in the
  United States"; EEA transfers under the EU-US Data Privacy Framework; retention "as soon as it is
  reasonable that your personal data is no longer required" (no fixed period). Read through
  excerpts; re-read <https://platform.minimax.io> legal pages before a public launch.
- No published zero-data-retention option (Unverified, third-party: zdr.dev). Open Platform terms
  reportedly allow using inputs and outputs to improve services (Unverified, third-party
  commentary). Operator of the international API: Nanonoble Pte. Ltd., Singapore (Unverified).
- MiniMax prohibits sending protected health information (Unverified, third-party). Ninth Life
  sends key codes, candidate words and the partner's last line; treat it as private conversation.

## Measured (2026-11-09, from the EU, international host `api.minimax.io`)

- **Request shape accepted**: HTTP 200 with system as text blocks, both auth headers, version
  2023-06-01 and `thinking: {type: "disabled"}`; no thinking block in the reply; the reply parsed
  and passed `validate()` ("i need water"). Live check passed.
- **Prompt cache**: a first call already reported `cache_read_input_tokens: 128` with no
  `cache_control` sent, so MiniMax caches some prefix on its own.
- **Latency**: live check (new connection per run) 654-5,253 ms over 6 calls. Through
  `/api/decode` in `pnpm dev` (connection reused) 598, 656, 741, 777, 1,286, 1,444, 1,610,
  2,663 ms: half would miss the 1,200 ms default deadline. See the eval below for the deadline
  choice (2,000 ms).

## Model lineup (checked 2026-11-09)

Only two text models are available: `MiniMax-M3` (released 2026-06-01) and `MiniMax-M3.1-Flash`
(2026-10-19, "ultra-efficient open-weight model for everyday work", tunable thinking depth). The
M2.x family, including the `-highspeed` variants (M2.1, M2.5, M2.7), is closed to new users since
2026-10-19 and retires on **2026-11-18**; M-Plan traffic to them is routed to M3.1-Flash. Sources:
<https://platform.minimax.io/docs/faq/models.md>, <https://platform.minimax.io/docs/release-notes/models.md>.
Third-party speed reports disagree (M3.1-Flash time to first token from about 1 s to 2.6 s, M3
slightly slower; OrcaRouter p50 3,952 ms M3 versus 2,660 ms Flash): Unverified, and they measure
long outputs. For our ~50-token answers our own numbers below are what counts.

## Eval: which model for ranking (2026-11-09, 200-item seeded sample, letter mode)

Run from a laptop in the EU, concurrency 4, `pnpm -F @ninth/eval llm --model <id> --limit 200`;
full tables in `packages/eval/RESULTS.md`. B4 is the shipping design (lattice + validator).
"At deadline" counts the model's answer when the call finished in time and the offline ghost
answer otherwise, which is what a person sees (198 items with a model call).

| | Offline (B1) | MiniMax-M3 | MiniMax-M3.1-Flash |
|---|---|---|---|
| B4 sentence top-1, no deadline | 85.4% | 94.4% | 97.0% |
| B4 top-5 | 98.0% | 98.0% | 98.5% |
| Latency p50 / p90 / p95 | 0 | 900 / 1,634 / 2,619 ms | 1,558 / 3,218 / 4,025 ms |
| Top-1 at 1,200 ms deadline | | 91.4% (76% ranked) | 85.9% (29% ranked) |
| Top-1 at 2,000 ms | | 93.4% (94% ranked) | 90.4% (67% ranked) |
| Top-1 at 3,000 ms | | 93.4% (96% ranked) | 94.9% (87% ranked) |
| Top-1 at 4,000 ms | | 93.9% (98% ranked) | 95.5% (94% ranked) |
| Output tokens per B4 call | | 49 | 106 (thinking at effort low) |
| Cost per 1,000 decodes | | $0.35 | $0.19 |
| Raw, unconstrained (B2) top-1 / invalid | | 4.5% / 97% | 49.5% / 9% (82 of 200 replies unparseable) |

Reading it:
- **Both models help a lot**: about +8 points top-1 over offline ranking alone at a 2-3 s deadline.
- **M3 is the better fit for the app**: it gets nearly all of its gain by 2 s, so the reordering
  lands soon after the person stops typing. Flash needs 4-6 s to pass M3, and its gain at equal
  deadlines (94.9% versus 93.4% at 3 s, 3 items of 198) is within noise.
- **Flash is cheaper** per call despite thinking, and better when the model has no word list
  (B2), which the app never uses.
- Late answers reorder candidates already on screen (`CommunicationScreen.tsx`: ghost first, model
  order when it arrives, any key press cancels), so a shorter deadline is also a UX choice.

**Decision for now: `MiniMax-M3`, `DECODE_TIMEOUT_MS=2000`** (same top-1 as 3,000 ms in this
sample, and late reorders end a second sooner). Revisit Flash if MiniMax speeds it up.

## Prompt experiments (2026-11-09, MiniMax-M3, B4, letter mode)

Question: does a prompt tuned for M3 close the gap to Flash? Each variant is a full 200-item B4 run
(seed 9, 198 items with a model call, concurrency 4) with `--out` and `--cache-dir` in a temp dir,
so `packages/eval/RESULTS.md` was not touched. Another agent was calling MiniMax at the same time,
so compare latencies within this table only. One sentence is 0.5 point; the same prompt run twice
moved by 1 item (v0 vs v0 rerun, v6 vs v6 rerun), so a gain under ~1.5 points is noise.

Reading the baseline misses first: in 10 of its 11 wrong top-1s M3 had returned the first ghost
guess unchanged ("e mail of", "thank you for informing of", "make it fight" after "around six?").
It anchors on `<guesses>` and on the most frequent lattice word.

| Variant | What changed (from v0) | Top-1 | Top-5 | At 2 s | p50 / p95 ms | Out tok/call | Cost |
|---|---|---|---|---|---|---|---|
| v0 | shipping prompt (cached replies from the model eval) | 94.4% | 99.0% | 93.4% | 900 / 2,619 | 49 | $0 (cached) |
| v0 rerun | same prompt, fresh calls (noise check) | 93.9% | 99.5% | 93.9% | 918 / 2,094 | 48 | $0.065 |
| v1 | system note: guesses come from a word-pair counter and are often wrong in one word, check every slot, listed first = most common, not best fit; rule 5 "rank by meaning, follow the partner's line" | 95.5% | 99.5% | 94.9% | 832 / 2,289 | 28 | $0.072 |
| v2 | v1 + two few-shots where the first guess is wrong ("tell of more", new "how about dive/five" with a partner line) | 94.4% | 99.5% | 93.4% | 811 / 2,278 | 27 | $0.073 |
| v5 | v1 without `<guesses>` at all (lattice and partner only) | 88.4% | 99.5% | 89.4% | 852 / 3,388 | 27 | $0.069 |
| v7 | user turn reordered only: `<partner>`, `<recent>`, `<guesses>`, then `<slots>` (v0 rules) | 94.9% | 99.5% | 94.9% | 875 / 2,838 | 46 | $0.068 |
| **v6** | **v1 note and rule 5 + v7 order** | **97.5%** | **99.5%** | **97.5%** | 833 / 2,403 | 29 | $0.067 |
| v6 rerun | same prompt, fresh calls | 96.5% | 99.5% | 95.5% | 864 / 2,493 | 33 | $0.029 (more MiniMax cache reads) |

Confirmation on a disjoint sample (seed 2, `--limit 260`, minus the 61 items shared with seed 9:
195 items with a model call; offline B1 85.1%), both prompts run back to back:

| Variant | Top-1 | Top-5 | At 2 s | p50 / p95 ms | Out tok/call | Cost |
|---|---|---|---|---|---|---|
| v0 | 90.8% (177) | 98.5% | 90.3% | 921 / 2,348 | 54 | $0.062 |
| v6 | 93.8% (183) | 98.5% | 93.3% | 861 / 3,552 | 32 | $0.063 |

v6 fixed 6 items and broke none on that sample ("this meal is fine", "work out fine",
"run an errand soon", "we'll have some rice"). Initials mode (seed 9, 200 items, B4): word accuracy
22.4% with both prompts, sentence top-1 0.0% vs 0.5%, so no regression; v6 proposes more
unlisted words there (18.7% of raw candidates fail the validator vs 5.6%), which the validator drops.

Reading it:
- **Adopted: v6** (`packages/decoder/src/prompt.ts`). +2.8 points top-1 on seed 9 (mean of two runs each:
  186.5 vs 192 of 198, 94.2% vs 97.0%) and +3.1 on the disjoint seed-2 sample, where it fixed 6 and broke 0. That
  puts M3 at the level of M3.1-Flash (97.0%) at M3's speed: top-1 at the 2 s deadline 95.5-97.5%.
- **Neither half works alone** (v1 +1 point, v7 +0.5, both noise); together they are well past noise
  on two samples. The note tells the model the guesses are fallible; context first lets it judge
  the slots against the partner's line.
- **Guesses are essential** (v5: -6 points). Without them M3 mostly takes the most frequent word per
  slot ("call of tomorrow"), so it is a weak judge on its own; the ghost beams carry most of the
  language model and the LLM corrects one word.
- **More few-shots did not help** (v2), and cost ~120 input tokens.
- **Shorter answers**: with the note M3 gives fewer alternatives (median 1-2 instead of 5; the ghost
  beams still fill top-5, which did not drop), so output falls from ~49 to ~29 tokens and p50 from
  ~900 to ~840 ms. p95 is dominated by MiniMax's tail and moved both ways between runs.
- **Input**: system prompt ~930 tokens (chars/4) instead of ~840; ~1,450 input tokens per call.
- **Provider-neutral**: plain text and tag order only, no sampling parameters or provider fields, so
  it is valid for Claude Haiku too; Haiku itself was not re-measured (no Anthropic key here).
- Remaining v6 misses on seed 9 are mostly not fixable by ranking: two "lets" targets typed without
  the apostrophe, "tonite" (not in the lexicon), "all gone" vs "all good" with no context,
  "pain" vs "rain kept me inside".
- **Spend**: $0.68 of MiniMax calls in total for these 11 runs (from each reply's `usage` at list
  prices; v0 cost nothing, its replies were cached).

## Open questions

1. Latency from the Vercel region (production), which may differ from a laptop in the EU.
2. Ranking quality versus Haiku 5.5 on the same 200 items (needs an Anthropic key).
3. Answered by "Prompt experiments": the v6 prompt brings M3 to Flash-level top-1. The model eval
   table above was measured with the earlier prompt; rerun it (and Haiku 5.5) on v6.
