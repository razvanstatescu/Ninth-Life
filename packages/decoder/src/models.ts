// Model profiles for the cloud decoder. Dependency-free so `packages/infra` can import it
// (`@ninth/decoder/models`) and scope IAM to exactly these ARNs.
//
// Sources (checked 2026-11-06, see docs/research/bedrock-models.md):
// - Haiku 4.5 model card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html
// - Haiku 5.5 model card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-5-5.html
// - Nova Micro model card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-micro.html
// - Anthropic pricing (10% premium on regional/geo endpoints): https://platform.claude.com/docs/en/about-claude/pricing

export type ModelKey = 'haiku-4.5' | 'haiku-5.5' | 'nova-micro';

/** The only AWS Region the decoder runs in (EU data residency). */
export const HOME_REGION = 'eu-central-1';

export interface PriceUsdPerMTok {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
}

export interface ModelProfile {
  key: ModelKey;
  /** Short name returned to clients in `model`. */
  label: string;
  /** Geo (EU) cross-Region inference profile ID, passed as `modelId`. */
  profileId: string;
  /** Underlying foundation model ID (for IAM foundation-model ARNs). */
  foundationModelId: string;
  /** Destination Regions the EU profile may route to when called from eu-central-1. */
  destinationRegions: readonly string[];
  /** Request/response body family for InvokeModel. */
  family: 'anthropic' | 'nova';
  /** Sampling temperature, or undefined to omit it (Haiku 5.5 rejects non-default values). */
  temperature?: number;
  /** Send `thinking: {type: "disabled"}` + low effort (Haiku 5.5 thinks by default). */
  disableThinking: boolean;
  /** Mark the system prompt with a cache checkpoint. */
  cacheSystem: boolean;
  /** Minimum tokens per cache checkpoint on Bedrock (below this, caching silently does nothing). */
  cacheMinTokens: number;
  /** Prices for the EU geo profile. `verified` false means derived or third-party. */
  price: PriceUsdPerMTok;
  priceVerified: boolean;
}

const ANTHROPIC_EU_DESTINATIONS = [
  'eu-central-1',
  'eu-north-1',
  'eu-south-1',
  'eu-south-2',
  'eu-west-1',
  'eu-west-3',
] as const;

export const MODEL_PROFILES: Readonly<Record<ModelKey, ModelProfile>> = {
  'haiku-4.5': {
    key: 'haiku-4.5',
    label: 'haiku-4.5',
    profileId: 'eu.anthropic.claude-haiku-4-5-20251001-v1:0',
    foundationModelId: 'anthropic.claude-haiku-4-5-20251001-v1:0',
    destinationRegions: ANTHROPIC_EU_DESTINATIONS,
    family: 'anthropic',
    temperature: 0.3,
    disableThinking: false, // Haiku 4.5 does not think unless asked
    cacheSystem: false, // min 4,096 tokens per checkpoint; our prefix is ~1K, so it would never cache
    cacheMinTokens: 4096,
    // Anthropic list $1 / $5 plus the 10% regional premium. AWS pricing page did not render numbers.
    price: { input: 1.1, output: 5.5, cacheRead: 0.11, cacheWrite5m: 1.375 },
    priceVerified: false,
  },
  'haiku-5.5': {
    key: 'haiku-5.5',
    label: 'haiku-5.5',
    profileId: 'eu.anthropic.claude-haiku-5-5',
    foundationModelId: 'anthropic.claude-haiku-5-5',
    destinationRegions: ANTHROPIC_EU_DESTINATIONS,
    family: 'anthropic',
    temperature: undefined, // any temperature other than 1 returns a 400
    disableThinking: true,
    cacheSystem: true, // min 512 tokens per checkpoint
    cacheMinTokens: 512,
    // Anthropic list $0.10 / $0.50 (prompts <= 100K) plus the 10% regional premium.
    price: { input: 0.11, output: 0.55, cacheRead: 0.011, cacheWrite5m: 0.1375 },
    priceVerified: false,
  },
  'nova-micro': {
    key: 'nova-micro',
    label: 'nova-micro',
    profileId: 'eu.amazon.nova-micro-v1:0',
    foundationModelId: 'amazon.nova-micro-v1:0',
    destinationRegions: ['eu-central-1', 'eu-north-1', 'eu-west-1', 'eu-west-3'],
    family: 'nova',
    temperature: 0.3,
    disableThinking: false,
    cacheSystem: false,
    cacheMinTokens: 1024,
    // Third-party aggregators only (cloudprice.net, futureagi.com). Unverified.
    price: { input: 0.046, output: 0.184, cacheRead: 0.0115, cacheWrite5m: 0.046 },
    priceVerified: false,
  },
};

export function isModelKey(v: string | undefined): v is ModelKey {
  return v === 'haiku-4.5' || v === 'haiku-5.5' || v === 'nova-micro';
}

/** Estimated cost of one call in micro-dollars (1e-6 USD), rounded up. */
export function costMicros(
  p: ModelProfile,
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number },
): number {
  const usd =
    (usage.inputTokens * p.price.input +
      usage.outputTokens * p.price.output +
      (usage.cacheReadTokens ?? 0) * p.price.cacheRead +
      (usage.cacheWriteTokens ?? 0) * p.price.cacheWrite5m) /
    1_000_000;
  return Math.ceil(usd * 1_000_000);
}

/** IAM resource ARNs needed to invoke `p` through its EU geo profile from HOME_REGION. */
export function iamArns(p: ModelProfile, account: string, region = HOME_REGION) {
  return {
    profileArn: `arn:aws:bedrock:${region}:${account}:inference-profile/${p.profileId}`,
    foundationModelArns: p.destinationRegions.map(
      (r) => `arn:aws:bedrock:${r}::foundation-model/${p.foundationModelId}`,
    ),
  };
}
