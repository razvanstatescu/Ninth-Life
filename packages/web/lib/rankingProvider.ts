/**
 * Who receives what is sent for model ranking, for the opt-in copy (Settings, About, Welcome).
 * NEXT_PUBLIC_DECODE_PROVIDER is set at build time from the route's own env (lib/publicEnv.mjs),
 * so the copy names the provider the route really calls. ADR-001 (Anthropic), ADR-002 (MiniMax).
 */
export type RankingProvider = 'anthropic' | 'minimax';

export function rankingProvider(): RankingProvider {
  return process.env.NEXT_PUBLIC_DECODE_PROVIDER === 'minimax' ? 'minimax' : 'anthropic';
}

export interface ProviderCopy {
  /** "Anthropic's Claude API" */
  service: string;
  /** "Anthropic" */
  company: string;
  /** What the provider says about keeping and training on API data. Facts with sources only. */
  retention: string;
  /** Where the provider processes the data, per provider so a new one never inherits it. Never claim EU-only. */
  region: string;
}

// Sources: docs/research/anthropic-models.md (Anthropic) and docs/research/minimax-models.md (MiniMax).
export const PROVIDER_COPY: Readonly<Record<RankingProvider, ProviderCopy>> = {
  anthropic: {
    service: "Anthropic's Claude API",
    company: 'Anthropic',
    retention:
      'Anthropic says it deletes API inputs and outputs within 30 days, keeps them longer only for policy enforcement or legal reasons, and does not use them to train its models by default.',
    region: 'Processing is not limited to the EU.',
  },
  minimax: {
    service: "MiniMax's API",
    company: 'MiniMax',
    retention:
      'MiniMax does not publish a fixed deletion period for API data or a promise not to use it to improve its services. Its privacy policy says data is stored in the United States.',
    region: 'Processing is not limited to the EU.',
  },
};

/**
 * What model ranking sends, in the order of the request fields buildRequest (lib/decodeClient.ts) fills:
 * `codes`, `lattice`, `beams`, `context.partner`. `v`, `lang`, `mode` and `k` are protocol fields with no
 * typed data. The website's ranking drawing lists these words (MS-7.10).
 */
export const RANKING_SENT = [
  'Your keys',
  'The dictionary words that match them',
  "Ninth Life's own best guesses",
  "The other person's last line",
] as const;

export function providerCopy(p: RankingProvider = rankingProvider()): ProviderCopy {
  return PROVIDER_COPY[p];
}
