/**
 * Live smoke check against the Anthropic Messages API and MiniMax's Anthropic-compatible endpoint
 * (ADR-001 and ADR-002 open questions; decoder.md "Live check"). Uses the decoder's own client,
 * prompt and parser; sends 1-3 small requests per model.
 *
 *   pnpm -F @ninth/decoder live-check                 every model whose key is set
 *   pnpm -F @ninth/decoder live-check -- --model claude-haiku-5-5
 *   pnpm -F @ninth/decoder live-check -- --model MiniMax-M3
 *   pnpm -F @ninth/decoder live-check -- --require-key  exit 2 instead of skipping without a key
 *
 * Checks, per model:
 *   - the request carries no temperature / top_p / top_k; Haiku 5.5 and MiniMax-M3 send thinking
 *     {type: "disabled"}, Haiku 4.5 and MiniMax-M3.1-Flash send no thinking field;
 *   - the API answers 200, with no refusal, no max_tokens cut-off and (thinking disabled) no thinking block;
 *   - the reply parses and at least one sentence passes validate();
 *   - Haiku 5.5 only: a second, identical request reports cache_read_input_tokens > 0;
 *   - the response time of each call (reported; above the route's 1,200 ms deadline is a warning).
 * Prints a short report. Exit 0 when every check passes or when there is no key (skipped), 1 when a
 * check fails, 2 with --require-key and no key. The key is read from ANTHROPIC_API_KEY and is never
 * printed or written anywhere. Keys: ANTHROPIC_API_KEY for Claude, MINIMAX_API_KEY for MiniMax
 * (MINIMAX_BASE_URL overrides the MiniMax host).
 */
import { validate } from '@ninth/core';
import {
  ANTHROPIC_MODELS,
  apiVersionFor,
  AnthropicLlmClient,
  MINIMAX_MODELS,
  messagesUrl,
  DEFAULT_TIMEOUT_MS,
  buildPrompt,
  isModelId,
  MODEL_PROFILES,
  maxTokensFor,
  parseReply,
  type FetchLike,
  type ModelId,
} from '../src/index.js';

/** An invented request (not from any dataset): "I need water". */
const PROBE = {
  mode: 'letter' as const,
  codes: ['4', '6333', '92837'],
  lattice: [['i', 'g', 'h'], ['need'], ['water']],
  beams: [['i', 'need', 'water']],
  context: { partner: 'Can I get you anything?', recent: [] as string[] },
  k: 3,
};

interface Seen {
  status: number;
  ms: number;
  request: Record<string, unknown>;
  response?: {
    content?: { type: string }[];
    stop_reason?: string;
    usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
    error?: { type?: string; message?: string };
  };
}

export interface LiveCheckOptions {
  /** Anthropic key (ANTHROPIC_API_KEY). */
  apiKey: string | undefined;
  /** MiniMax key (MINIMAX_API_KEY). */
  minimaxApiKey?: string;
  minimaxBaseUrl?: string;
  models?: ModelId[];
  fetch?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  log?: (line: string) => void;
}

export interface LiveCheckResult {
  status: 'pass' | 'fail' | 'skipped';
  failures: string[];
  warnings: string[];
}

export async function runLiveCheck(o: LiveCheckOptions): Promise<LiveCheckResult> {
  const log = o.log ?? ((l: string) => console.log(l));
  const keys = { anthropic: o.apiKey?.trim(), minimax: o.minimaxApiKey?.trim() };
  const keyName = { anthropic: 'ANTHROPIC_API_KEY', minimax: 'MINIMAX_API_KEY' } as const;
  const requested: ModelId[] = o.models ?? [...(keys.anthropic ? ANTHROPIC_MODELS : []), ...(keys.minimax ? MINIMAX_MODELS : [])];
  const runnable = requested.filter((m) => keys[MODEL_PROFILES[m].provider]);
  if (runnable.length === 0) {
    const missing = [...new Set(requested.map((m) => keyName[MODEL_PROFILES[m].provider]))];
    const names = missing.length ? missing : ['ANTHROPIC_API_KEY', 'MINIMAX_API_KEY'];
    log(`live-check skipped: ${names.map((n) => `${n} is not set`).join(' and ')} (no request was sent).`);
    return { status: 'skipped', failures: [], warnings: [] };
  }
  const realFetch: FetchLike = o.fetch ?? ((u, i) => fetch(u, i));
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = o.now ?? (() => performance.now());
  const failures: string[] = [];
  const warnings: string[] = [];
  const prompt = buildPrompt(PROBE);
  const maxTokens = maxTokensFor(PROBE.codes.length, PROBE.k);

  log(`live-check: max_tokens ${maxTokens}, route deadline ${DEFAULT_TIMEOUT_MS} ms`);
  for (const model of requested) {
    const profile = MODEL_PROFILES[model];
    const apiKey = keys[profile.provider];
    if (!apiKey) {
      log(`${model}: skipped, ${keyName[profile.provider]} is not set`);
      continue;
    }
    const baseUrl = profile.provider === 'minimax' ? o.minimaxBaseUrl : undefined;
    const fail = (msg: string) => {
      failures.push(`${model}: ${msg}`);
      log(`  FAIL ${msg}`);
    };
    const ok = (msg: string) => log(`  ok   ${msg}`);
    log(`${model} (${profile.label}) at ${messagesUrl(profile.provider, baseUrl)}, anthropic-version ${apiVersionFor(profile.provider)}`);

    const call = async (n: number): Promise<Seen | undefined> => {
      let seen: Seen | undefined;
      const recording: FetchLike = async (url, init) => {
        const t0 = now();
        const res = await realFetch(url, init);
        const ms = now() - t0;
        const body = (await res.clone().json().catch(() => undefined)) as Seen['response'];
        seen = { status: res.status, ms, request: JSON.parse(String(init.body)) as Record<string, unknown>, response: body };
        return res;
      };
      const client = new AnthropicLlmClient({ apiKey, model, fetch: recording, baseUrl });
      let text = '';
      let error: unknown;
      try {
        text = (await client.complete(prompt, { maxTokens, signal: AbortSignal.timeout(30_000) })).text;
      } catch (e) {
        error = e;
      }
      if (!seen) {
        fail(`call ${n}: no response (${error instanceof Error ? error.name : 'error'})`);
        return undefined;
      }
      const s: Seen = seen;
      const u = s.response?.usage ?? {};
      log(
        `  call ${n}: HTTP ${s.status} in ${Math.round(s.ms)} ms; input ${u.input_tokens ?? 0}, output ${u.output_tokens ?? 0}, ` +
          `cache read ${u.cache_read_input_tokens ?? 0}, cache write ${u.cache_creation_input_tokens ?? 0} tokens; stop_reason ${s.response?.stop_reason ?? 'n/a'}`,
      );
      if (s.status !== 200) {
        fail(`call ${n}: HTTP ${s.status} ${s.response?.error?.type ?? ''}: ${(s.response?.error?.message ?? '').slice(0, 200)}`);
        return s;
      }
      if (s.ms > DEFAULT_TIMEOUT_MS) {
        warnings.push(`${model}: call ${n} took ${Math.round(s.ms)} ms, above the route's ${DEFAULT_TIMEOUT_MS} ms deadline`);
        log(`  warn call ${n} is slower than the route deadline (the route would return ghost beams)`);
      }
      if (n === 1) {
        const req = s.request;
        const sampling = ['temperature', 'top_p', 'top_k'].filter((p) => p in req);
        if (sampling.length) fail(`request sends ${sampling.join(', ')}`);
        else ok('request has no temperature, top_p or top_k');
        const thinking = JSON.stringify(req.thinking ?? null);
        if (profile.disableThinking) {
          if (thinking === '{"type":"disabled"}') ok('thinking {type: "disabled"} accepted (HTTP 200)');
          else fail(`expected thinking {type: "disabled"}, sent ${thinking}`);
        } else if (req.thinking !== undefined) fail(`expected no thinking field, sent ${thinking}`);
        else ok('no thinking field, accepted (HTTP 200)');
        const reason = s.response?.stop_reason;
        if (reason === 'refusal' || reason === 'max_tokens') fail(`stop_reason ${reason}`);
        const thought = (s.response?.content ?? []).some((b) => b.type === 'thinking' || b.type === 'redacted_thinking');
        if (thought && profile.disableThinking) fail('reply contains a thinking block');
        else if (thought) log('  note reply contains a thinking block (expected: this model always thinks)');
        const reply = parseReply(text);
        const valid = reply.candidates.filter((c) => validate(c, PROBE.codes, PROBE.mode));
        if (reply.unparseable) fail('reply is not {"c": [...]} JSON');
        else if (valid.length === 0) fail(`no sentence passes validate() (${reply.candidates.length} returned)`);
        else ok(`${valid.length} of ${reply.candidates.length} sentences pass validate(); first: "${valid[0]!.join(' ')}"`);
      }
      return s;
    };

    const first = await call(1);
    if (!first || first.status !== 200 || !profile.disableThinking || profile.provider !== 'anthropic') continue;
    // Haiku 5.5 caches the frozen system prompt: an identical request should read it back.
    let second = await call(2);
    if (second && second.status === 200 && !(second.response?.usage?.cache_read_input_tokens ?? 0)) {
      log('  cache read was 0; waiting 3 s and trying once more');
      await sleep(3000);
      second = await call(3);
    }
    const read = second?.response?.usage?.cache_read_input_tokens ?? 0;
    if (second?.status === 200) {
      if (read > 0) ok(`identical request read ${read} tokens from the prompt cache`);
      else fail('cache_read_input_tokens stayed 0 on an identical request (system prompt not cached)');
    }
  }
  const status = failures.length ? 'fail' : 'pass';
  log(status === 'pass' ? `live-check passed${warnings.length ? ` with ${warnings.length} warning(s)` : ''}` : `live-check FAILED: ${failures.length} check(s)`);
  return { status, failures, warnings };
}

function parseCli(argv: string[]): { models?: ModelId[]; requireKey: boolean } {
  let models: ModelId[] | undefined;
  let requireKey = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--') continue;
    if (a === '--require-key') requireKey = true;
    else if (a === '--model') {
      const v = argv[++i];
      if (!isModelId(v)) throw new Error(`--model must be one of ${[...ANTHROPIC_MODELS, ...MINIMAX_MODELS].join(', ')}`);
      models = [...(models ?? []), v];
    } else throw new Error(`unknown option ${a}`);
  }
  return { models, requireKey };
}

const direct = process.argv[1] !== undefined && /live-check\.ts$/.test(process.argv[1]);
if (direct) {
  (async () => {
    const cli = parseCli(process.argv.slice(2));
    const r = await runLiveCheck({
      apiKey: process.env.ANTHROPIC_API_KEY,
      minimaxApiKey: process.env.MINIMAX_API_KEY,
      minimaxBaseUrl: process.env.MINIMAX_BASE_URL,
      models: cli.models,
    });
    if (r.status === 'skipped') return cli.requireKey ? 2 : 0;
    return r.status === 'pass' ? 0 : 1;
  })().then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    },
  );
}
