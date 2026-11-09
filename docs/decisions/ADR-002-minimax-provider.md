# ADR-002: MiniMax as a second model provider (for now)

- Status: accepted (interim)
- Date: 2026-11-09
- Decided by: the user (product owner)
- Amends: ADR-001 decision 2 (Anthropic is no longer the only provider). Everything else in
  ADR-001 stands: one Vercel route, no AWS, no third-party store.

## Context
Development continues from a local machine with a MiniMax API key and no Anthropic key. MiniMax
offers an Anthropic-compatible Messages endpoint, so the decoder's plain-`fetch` client, prompt,
parser and validator can be reused without a fork.

## Decision
1. The decoder supports two providers behind the same `AnthropicLlmClient` (it speaks the
   Anthropic Messages protocol): `anthropic` (api.anthropic.com) and `minimax`
   (`https://api.minimax.io/anthropic/v1/messages` by default, `MINIMAX_BASE_URL` overrides the host).
2. Models: `MiniMax-M3` (default when only `MINIMAX_API_KEY` is set; sent with
   `thinking: {type: "disabled"}`) and `MiniMax-M3.1-Flash` (always thinks; sent with
   `output_config.effort: "low"` and 1,024 extra `max_tokens`; for the eval, likely too slow for
   the route). `DECODE_MODEL` picks one explicitly; its provider decides which key is used.
3. MiniMax requests send `Authorization: Bearer` and `x-api-key` and `anthropic-version: 2023-06-01`;
   no `cache_control` (not documented by MiniMax), no sampling parameters (MiniMax ignores them).
4. `DECODE_TIMEOUT_MS` (300-9,000 ms, default 1,200) sets the route's model deadline. The client's
   budget is derived from it at build time (+300 ms, `NEXT_PUBLIC_DECODE_TIMEOUT_MS`).
5. The opt-in copy (Settings, About, Welcome) names the provider the route really calls.
   `next.config.mjs` derives `NEXT_PUBLIC_DECODE_PROVIDER` from the route's env with the same rule
   as the decoder (`packages/web/lib/publicEnv.mjs`, pinned by `test/publicEnv.test.ts`).

## Trade-offs accepted
- **Weaker privacy terms than Anthropic.** MiniMax publishes no fixed deletion period for API data
  and no promise not to use it to improve its services; its privacy policy says data is stored in
  the United States; the operator is a Singapore company (`docs/research/minimax-models.md`). The
  copy says this plainly. Before public launch with MiniMax, re-read MiniMax's current terms or
  switch back to Anthropic.
- **"EU key" is not EU processing.** No official MiniMax EU host was found (2026-11-09). If the key
  is for a regional host, set `MINIMAX_BASE_URL`; the copy still says processing is not limited to
  the EU.
- **No spend-limit runbook yet** for MiniMax (ADR-001's hard cap was the Anthropic workspace limit).
  Use a prepaid balance or MiniMax's own limits; the kill switch (`LLM_ENABLED`) is unchanged.
- **Latency unmeasured.** If MiniMax is slower than the deadline, every call degrades to ghost
  beams (still correct, just unranked). Measure with the live check, then raise `DECODE_TIMEOUT_MS`.

## Consequences
- `.kiro/steering/privacy.md`, `docs/architecture/decoder.md` and `packages/web/.env.example`
  describe both providers.
- Switching back is configuration only: set `ANTHROPIC_API_KEY` (and unset `DECODE_MODEL` or set a
  Claude model), rebuild.
