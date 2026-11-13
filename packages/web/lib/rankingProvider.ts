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
}

// Sources: docs/research/anthropic-models.md (Anthropic) and docs/research/minimax-models.md (MiniMax).
export const PROVIDER_COPY: Readonly<Record<RankingProvider, ProviderCopy>> = {
  anthropic: {
    service: "Anthropic's Claude API",
    company: 'Anthropic',
    retention:
      'Anthropic says it deletes API inputs and outputs within 30 days, keeps them longer only for policy enforcement or legal reasons, and does not use them to train its models by default.',
  },
  minimax: {
    service: "MiniMax's API",
    company: 'MiniMax',
    retention:
      'MiniMax does not publish a fixed deletion period for API data or a promise not to use it to improve its services. Its privacy policy says data is stored in the United States.',
  },
};

/**
 * What model ranking sends, said the same way in Settings, About and Welcome (web-ui Req 12.1, 27.11,
 * 29.9, ADR-007, ADR-008). The reply type goes only while one is pressed; `recent` only when the person
 * also turns on "Include what you said" (off by default).
 */
export const SENT_FOR_RANKING =
  "your keys, the dictionary words for them, the app's own best-guess sentences, the last thing the other person said and the reply type you picked (Agree, Disagree or Ask)";
/** What reply types do, for Settings and About help (web-ui Req 29.2, 29.3). No effect claim, ADR-008. */
export const REPLY_TYPES_HELP = 'Agree, Disagree and Ask change the order of the sentences for your keys. They never change the words. Ask also adds a question mark.';
export const RECENT_SENDS = 'the last 3 things you said in this conversation';
export const RECENT_SETTING = 'Include what you said';

export function providerCopy(p: RankingProvider = rankingProvider()): ProviderCopy {
  return PROVIDER_COPY[p];
}
