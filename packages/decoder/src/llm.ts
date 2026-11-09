import { costMicros, DEFAULT_MODEL, MODEL_PROFILES, type ModelId, type ModelProfile, type Provider } from './models.js';
import { estimateTokens, type Prompt } from './prompt.js';

// LLM access through the Anthropic Messages API (POST https://api.anthropic.com/v1/messages), or
// MiniMax's Anthropic-compatible endpoint (POST https://api.minimax.io/anthropic/v1/messages, ADR-002).
// Plain fetch, no SDK: one non-streaming call with a small max_tokens, a hard deadline from the
// handler, and no retries (a retry cannot fit the 1.5 s client budget). Every candidate the model
// returns is re-checked by the validator, so this file only has to deliver text.

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface LlmResult {
  text: string;
  usage: LlmUsage;
  stopReason?: string;
}

export interface LlmCallOptions {
  maxTokens: number;
  signal: AbortSignal;
}

export interface LlmClient {
  /** Short model label returned to clients. */
  readonly model: string;
  complete(prompt: Prompt, opts: LlmCallOptions): Promise<LlmResult>;
  /** Estimated cost of a call in micro-dollars, for the daily dollar cap. */
  costMicros(usage: LlmUsage): number;
}

export class LlmError extends Error {
  constructor(
    readonly kind: 'refusal' | 'bad_response' | 'http' | 'config',
    message: string,
    /** Upstream HTTP status, when there was one (logged as a number; the body never is). */
    readonly status?: number,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

/** Abort-aware sleep used by the fake client. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason ?? new Error('aborted'));
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(signal.reason ?? new Error('aborted'));
      },
      { once: true },
    );
  });
}

// ---------------------------------------------------------------------------------------------
// Fake client for tests and local demos.

export type FakeReply =
  | string
  | { text: string; delayMs?: number; usage?: Partial<LlmUsage> }
  | { error: Error; delayMs?: number };

export class FakeLlmClient implements LlmClient {
  readonly model = 'fake';
  readonly calls: Prompt[] = [];
  private readonly reply: (p: Prompt) => FakeReply;
  constructor(reply: FakeReply | ((p: Prompt) => FakeReply)) {
    this.reply = typeof reply === 'function' ? reply : () => reply;
  }
  async complete(prompt: Prompt, opts: LlmCallOptions): Promise<LlmResult> {
    this.calls.push(prompt);
    const r = this.reply(prompt);
    const spec = typeof r === 'string' ? { text: r } : r;
    if (spec.delayMs) await sleep(spec.delayMs, opts.signal);
    if ('error' in spec) throw spec.error;
    return {
      text: spec.text,
      usage: { inputTokens: 100, outputTokens: 20, ...(spec.usage ?? {}) },
      stopReason: 'end_turn',
    };
  }
  costMicros(usage: LlmUsage): number {
    return usage.inputTokens + usage.outputTokens; // 1 micro-dollar per token, easy to assert
  }
}

// ---------------------------------------------------------------------------------------------
// Anthropic Messages API.

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
/**
 * API version 2026-10-21. On it, `temperature`, `top_p` and `top_k` return 400 on every model, so
 * the decoder sends none of them (both Haiku models sample at the default).
 */
export const ANTHROPIC_VERSION = '2026-10-21';

/** MiniMax's international Anthropic-compatible base URL. Override with MINIMAX_BASE_URL. */
export const MINIMAX_BASE_URL = 'https://api.minimax.io/anthropic';
/** MiniMax does not document an anthropic-version; send the one the Anthropic SDK sends. */
export const MINIMAX_ANTHROPIC_VERSION = '2023-06-01';

/** The Messages endpoint for a provider. `baseUrl` may be a base (".../anthropic") or the full URL. */
export function messagesUrl(provider: Provider, baseUrl?: string): string {
  const base = (baseUrl?.trim() || (provider === 'minimax' ? MINIMAX_BASE_URL : 'https://api.anthropic.com')).replace(/\/+$/, '');
  return base.endsWith('/v1/messages') ? base : `${base}/v1/messages`;
}

/** anthropic-version sent to each provider. */
export function apiVersionFor(provider: Provider): string {
  return provider === 'minimax' ? MINIMAX_ANTHROPIC_VERSION : ANTHROPIC_VERSION;
}

/**
 * Request headers. Anthropic takes `x-api-key`. MiniMax documents `Authorization: Bearer` (curl)
 * and also accepts the Anthropic SDK's `x-api-key`; both are sent so either form works.
 */
export function requestHeaders(provider: Provider, apiKey: string): Record<string, string> {
  const h: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': apiVersionFor(provider),
  };
  if (provider === 'minimax') h.authorization = `Bearer ${apiKey}`;
  return h;
}

/** True when the frozen system prompt is long enough to be cached on this model. */
export function shouldCache(p: ModelProfile, system: string): boolean {
  return estimateTokens(system) * p.tokenizerFactor >= p.cacheMinTokens;
}

export function anthropicBody(p: ModelProfile, prompt: Prompt, maxTokens: number): Record<string, unknown> {
  const systemBlock: Record<string, unknown> = { type: 'text', text: prompt.system };
  if (shouldCache(p, prompt.system)) systemBlock.cache_control = { type: 'ephemeral' };
  const body: Record<string, unknown> = {
    model: p.id,
    // Thinking counts toward max_tokens; always-thinking models get headroom on top of the answer.
    max_tokens: maxTokens + (p.thinkingHeadroom ?? 0),
    system: [systemBlock],
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt.user }] }],
  };
  if (p.disableThinking) body.thinking = { type: 'disabled' };
  if (p.effort) body.output_config = { effort: p.effort };
  return body;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

export function readAnthropic(json: unknown): LlmResult {
  const r = json as AnthropicResponse;
  if (r?.stop_reason === 'refusal') throw new LlmError('refusal', 'model declined');
  if (!Array.isArray(r?.content)) throw new LlmError('bad_response', 'no content');
  // Read blocks by type: a response may start with thinking blocks.
  const text = r.content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('');
  return {
    text,
    stopReason: r.stop_reason,
    usage: {
      inputTokens: r.usage?.input_tokens ?? 0,
      outputTokens: r.usage?.output_tokens ?? 0,
      cacheReadTokens: r.usage?.cache_read_input_tokens ?? 0,
      cacheWriteTokens: r.usage?.cache_creation_input_tokens ?? 0,
    },
  };
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface AnthropicLlmOptions {
  apiKey: string;
  model?: ModelId;
  fetch?: FetchLike;
  /** Full Messages URL (tests). Wins over `baseUrl`. */
  url?: string;
  /** Provider base URL, e.g. MINIMAX_BASE_URL for a regional MiniMax host. */
  baseUrl?: string;
}

export class AnthropicLlmClient implements LlmClient {
  readonly model: string;
  readonly profile: ModelProfile;
  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;
  private readonly url: string;

  constructor(opts: AnthropicLlmOptions) {
    if (!opts.apiKey) throw new LlmError('config', 'missing API key');
    this.apiKey = opts.apiKey;
    this.profile = MODEL_PROFILES[opts.model ?? DEFAULT_MODEL];
    this.model = this.profile.label;
    this.fetchImpl = opts.fetch ?? ((u, i) => fetch(u, i));
    this.url = opts.url ?? messagesUrl(this.profile.provider, opts.baseUrl);
  }

  get provider(): Provider {
    return this.profile.provider;
  }

  async complete(prompt: Prompt, opts: LlmCallOptions): Promise<LlmResult> {
    const res = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: requestHeaders(this.profile.provider, this.apiKey),
      body: JSON.stringify(anthropicBody(this.profile, prompt, opts.maxTokens)),
      signal: opts.signal,
    });
    if (!res.ok) {
      // Drain the body so the connection can be reused; never surface its text.
      await res.text().catch(() => '');
      throw new LlmError('http', 'upstream error', res.status);
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new LlmError('bad_response', 'body is not JSON');
    }
    return readAnthropic(json);
  }

  costMicros(usage: LlmUsage): number {
    return costMicros(this.profile, usage);
  }
}
