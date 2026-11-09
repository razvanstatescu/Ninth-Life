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

## Open questions

1. Latency from the Vercel region (production), which may differ from a laptop in the EU.
2. Ranking quality versus Haiku 5.5 on the same 200 items (needs an Anthropic key).
3. Whether a prompt tuned for M3 (few-shots, shorter system prompt) closes the gap to Flash.
