import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { costMicros, HOME_REGION, MODEL_PROFILES, type ModelKey, type ModelProfile } from './models.js';
import type { Prompt } from './prompt.js';

// LLM access. InvokeModel (not Converse) because:
// - it takes the native Anthropic Messages body, so `cache_control`, `thinking` and the sampling
//   rules of each Claude model are sent exactly as Anthropic documents them;
// - the pinned @aws-sdk/client-bedrock-runtime 3.712.0 has no Converse `cachePoint` type.
// See docs/research/bedrock-models.md.

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
    readonly kind: 'refusal' | 'bad_response' | 'config',
    message: string,
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
// Fake client for tests and local dev.

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
// Bedrock request/response bodies.

export function anthropicBody(p: ModelProfile, prompt: Prompt, maxTokens: number): Record<string, unknown> {
  const system: Record<string, unknown>[] = [{ type: 'text', text: prompt.system }];
  if (p.cacheSystem) system[0]!.cache_control = { type: 'ephemeral' };
  const body: Record<string, unknown> = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt.user }] }],
  };
  if (p.temperature !== undefined) body.temperature = p.temperature;
  if (p.disableThinking) body.thinking = { type: 'disabled' };
  return body;
}

export function novaBody(p: ModelProfile, prompt: Prompt, maxTokens: number): Record<string, unknown> {
  return {
    schemaVersion: 'messages-v1',
    system: [{ text: prompt.system }],
    messages: [{ role: 'user', content: [{ text: prompt.user }] }],
    inferenceConfig: { maxTokens, ...(p.temperature !== undefined ? { temperature: p.temperature } : {}) },
  };
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

interface NovaResponse {
  output?: { message?: { content?: { text?: string }[] } };
  stopReason?: string;
  usage?: { inputTokens?: number; outputTokens?: number; cacheReadInputTokenCount?: number; cacheWriteInputTokenCount?: number };
}

export function readAnthropic(json: unknown): LlmResult {
  const r = json as AnthropicResponse;
  if (r.stop_reason === 'refusal') throw new LlmError('refusal', 'model declined');
  if (!Array.isArray(r.content)) throw new LlmError('bad_response', 'no content');
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

export function readNova(json: unknown): LlmResult {
  const r = json as NovaResponse;
  const parts = r.output?.message?.content;
  if (!Array.isArray(parts)) throw new LlmError('bad_response', 'no content');
  return {
    text: parts.map((c) => c.text ?? '').join(''),
    stopReason: r.stopReason,
    usage: {
      inputTokens: r.usage?.inputTokens ?? 0,
      outputTokens: r.usage?.outputTokens ?? 0,
      cacheReadTokens: r.usage?.cacheReadInputTokenCount ?? 0,
      cacheWriteTokens: r.usage?.cacheWriteInputTokenCount ?? 0,
    },
  };
}

/** Minimal shape of the SDK client we use, so tests can pass a stub. */
export interface InvokeModelSender {
  send(cmd: InvokeModelCommand, opts?: { abortSignal?: AbortSignal }): Promise<{ body?: Uint8Array }>;
}

export interface BedrockLlmOptions {
  model: ModelKey;
  region?: string;
  client?: InvokeModelSender;
}

/** Refuse any configuration that could send text outside the EU. */
export function assertEu(region: string, p: ModelProfile): void {
  if (!/^eu-[a-z]+-\d$/.test(region)) throw new LlmError('config', 'decoder region must be an EU region');
  if (!p.profileId.startsWith('eu.')) throw new LlmError('config', 'model must use an EU geo inference profile');
  if (!p.destinationRegions.every((r) => r.startsWith('eu-'))) {
    throw new LlmError('config', 'profile routes outside the EU');
  }
}

export class BedrockLlmClient implements LlmClient {
  readonly model: string;
  readonly profile: ModelProfile;
  private readonly client: InvokeModelSender;

  constructor(opts: BedrockLlmOptions) {
    this.profile = MODEL_PROFILES[opts.model];
    const region = opts.region ?? HOME_REGION;
    assertEu(region, this.profile);
    this.model = this.profile.label;
    // maxAttempts 1: the whole decode has a 1.5 s budget, so retries only add cost.
    this.client = opts.client ?? new BedrockRuntimeClient({ region, maxAttempts: 1 });
  }

  async complete(prompt: Prompt, opts: LlmCallOptions): Promise<LlmResult> {
    const p = this.profile;
    const body = p.family === 'anthropic' ? anthropicBody(p, prompt, opts.maxTokens) : novaBody(p, prompt, opts.maxTokens);
    const out = await this.client.send(
      new InvokeModelCommand({
        modelId: p.profileId,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(JSON.stringify(body)),
      }),
      { abortSignal: opts.signal },
    );
    if (!out.body) throw new LlmError('bad_response', 'empty body');
    let json: unknown;
    try {
      json = JSON.parse(new TextDecoder().decode(out.body));
    } catch {
      throw new LlmError('bad_response', 'body is not JSON');
    }
    return p.family === 'anthropic' ? readAnthropic(json) : readNova(json);
  }

  costMicros(usage: LlmUsage): number {
    return costMicros(this.profile, usage);
  }
}
