/**
 * B2-B4 with the Anthropic API or MiniMax's Anthropic-compatible API (spec eval-harness Req 8, ADR-002).
 *
 *   pnpm -F @ninth/eval llm --plan                         cost estimate only, no calls, no key
 *   pnpm -F @ninth/eval llm --dry-run --limit 20           whole path against the fake API
 *   pnpm -F @ninth/eval llm --model claude-haiku-5-5       real run (needs ANTHROPIC_API_KEY)
 *   pnpm -F @ninth/eval llm --model MiniMax-M3             real run (needs MINIMAX_API_KEY)
 *
 * Options:
 *   --model <id>        claude-haiku-5-5 (default), claude-haiku-4-5, MiniMax-M3 or MiniMax-M3.1-Flash
 *   --limit <n>         seeded sample of n items (default: the full frozen test set)
 *   --seed <n>          sample seed (default 9)
 *   --mode <m>          letter (default) or initials (the codes become each word's first key)
 *   --only B2,B3,B4     configs to run (default B2,B3,B4 in letter mode, B4 in initials mode);
 *                       B0 and B1 always run on the same items for comparison
 *   --k <n>             candidates per decode (default 5)
 *   --concurrency <n>   requests in flight (default 4)
 *   --plan              print the cost estimate and stop
 *   --dry-run           use the in-process fake Messages API; no key, no network, separate cache
 *   --yes               proceed when the estimate is above $1
 *   --out <dir>         where RESULTS.md and RESULTS.llm.json are updated (default packages/eval);
 *                       a dry run writes only with --out, never into packages/eval
 *   --no-write          print only
 *   --items-out <path>  per-item JSONL (default .cache/llm/runs/<model>-<mode>-<date>.jsonl)
 *   --cache-dir <dir>   response cache root (default packages/eval/.cache/llm)
 *   --intent oracle     reply types (ADR-008): only items with a partner line and a reply type read off
 *                       the gold sentence; B4 sends it as context.intent with re-ranked beams, and B1i
 *                       (B1+intent) runs beside B1. An upper bound, in its own RESULTS section
 *
 * Exit codes: 0 done, 1 error (nothing written), 2 no API key for the model's provider, 3 estimate above $1
 * without --yes.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bigramModel, Lexicon, type Mode } from '@ninth/core';
import { apiVersionFor, costMicros, DEFAULT_MODEL, isModelId, MODEL_IDS, MODEL_PROFILES, type ModelId } from '@ninth/decoder';
import { ghostIntentDecoder, type LlmConfig } from '../decoders';
import { oracleIntent, oracleItems } from '../intent';
import { EVAL_DIR, loadBigramFile, loadFixture, loadLexiconFile, PATHS, readLock } from '../fixture';
import { sample } from '../rng';
import { DEFAULT_K, DEFAULT_SEED, HARNESS_VERSION, runEval } from '../run';
import { codesFor } from '../simulate';
import type { TestItem } from '../types';
import { llmDecoders, planCalls, type LlmRunContext } from './configs';
import { CONFIRM_ABOVE_USD, estimateCost, formatEstimate } from './estimate';
import { fakeMessagesApi } from './fake-api';
import { renderSection, runId, upsertSection, type LlmResultsFile, type LlmRunResults } from './report';
import { ApiTransport, ResponseCache } from './transport';

export interface LlmArgs {
  model: ModelId;
  limit?: number;
  seed: number;
  mode: Mode;
  only?: LlmConfig[];
  k: number;
  concurrency: number;
  plan: boolean;
  dryRun: boolean;
  yes: boolean;
  out?: string;
  write: boolean;
  itemsOut?: string;
  cacheDir: string;
  intent?: 'oracle';
}

const CONFIGS: readonly LlmConfig[] = ['B2', 'B3', 'B4'];

export function parseLlmArgs(argv: string[]): LlmArgs {
  const a: LlmArgs = { model: DEFAULT_MODEL, seed: DEFAULT_SEED, mode: 'letter', k: DEFAULT_K, concurrency: 4, plan: false, dryRun: false, yes: false, write: true, cacheDir: join(EVAL_DIR, '.cache', 'llm') };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i]!;
    const val = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${x} needs a value`);
      return v;
    };
    const int = (min: number) => {
      const v = val();
      const n = Number(v);
      if (!Number.isInteger(n) || n < min) throw new Error(`${x} must be an integer >= ${min}`);
      return n;
    };
    if (x === '--model') {
      const v = val();
      if (!isModelId(v)) throw new Error(`--model must be one of ${MODEL_IDS.join(', ')} (got ${v})`);
      a.model = v;
    } else if (x === '--limit') a.limit = int(1);
    else if (x === '--seed') a.seed = int(0);
    else if (x === '--mode') {
      const v = val();
      if (v !== 'letter' && v !== 'initials') throw new Error('--mode must be letter or initials');
      a.mode = v;
    } else if (x === '--only') {
      const ids = val().split(',').map((s) => s.trim());
      for (const id of ids) if (!(CONFIGS as readonly string[]).includes(id)) throw new Error(`--only takes B2, B3, B4 (got ${id})`);
      a.only = ids as LlmConfig[];
    } else if (x === '--k') a.k = int(1);
    else if (x === '--concurrency') a.concurrency = int(1);
    else if (x === '--plan') a.plan = true;
    else if (x === '--dry-run') a.dryRun = true;
    else if (x === '--yes') a.yes = true;
    else if (x === '--out') a.out = resolve(val());
    else if (x === '--write') a.write = true;
    else if (x === '--no-write') a.write = false;
    else if (x === '--items-out') a.itemsOut = resolve(val());
    else if (x === '--cache-dir') a.cacheDir = resolve(val());
    else if (x === '--intent') {
      const v = val();
      if (v !== 'oracle') throw new Error(`--intent takes oracle (got ${v})`);
      a.intent = v;
    }
    else if (x === '--') continue;
    else throw new Error(`unknown option ${x}`);
  }
  if (a.k > 5) throw new Error('--k must be at most 5 (the decode route limit)');
  if (a.dryRun && a.out === EVAL_DIR) throw new Error('a dry run never writes into packages/eval (its numbers are not measurements); pick another --out');
  return a;
}

export interface LlmMainDeps {
  env?: Record<string, string | undefined>;
  /** The network for real runs (default global fetch). */
  fetch?: typeof fetch;
  /** UTC date for the section title (default today). */
  date?: string;
  out?: (s: string) => void;
  err?: (s: string) => void;
  /** Backoff sleep (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
}

export async function llmMain(argv: string[], deps: LlmMainDeps = {}): Promise<number> {
  const out = deps.out ?? ((s: string) => process.stdout.write(s));
  const err = deps.err ?? ((s: string) => process.stderr.write(s));
  const env = deps.env ?? process.env;
  const args = parseLlmArgs(argv);
  const profile = MODEL_PROFILES[args.model];
  const ids = args.only ?? (args.mode === 'initials' ? (['B4'] as LlmConfig[]) : CONFIGS);
  const date = deps.date ?? new Date().toISOString().slice(0, 10);

  const lock = readLock();
  const { items, sha256 } = loadFixture(PATHS.fixture, lock);
  const lexFile = loadLexiconFile();
  const bigFile = loadBigramFile();
  const lex = Lexicon.fromJSON(lexFile.data);
  const lm = bigramModel(bigFile.data, lex);
  const pool = args.intent ? oracleItems(items) : items;
  const selected: TestItem[] = args.limit ? sample(pool, args.limit, args.seed) : pool.slice();

  // A dry run never shares cache entries with real replies.
  const cache = new ResponseCache(join(args.cacheDir, args.dryRun ? 'fake' : profile.provider));
  const plan = await planCalls(
    ids,
    selected.map((it) => ({ id: it.id, codes: codesFor(it, args.mode), partner: it.partner, intent: args.intent ? oracleIntent(it) : undefined })),
    args.mode,
    args.k,
    { lex, lm, profile },
  );
  const est = estimateCost(plan, profile, cache, args.k);
  out(formatEstimate(est, profile.label) + '\n');
  out(`  items: ${selected.length}${args.limit ? ` (seeded sample, seed ${args.seed})` : ' (full frozen test set)'}, mode ${args.mode}, configs ${ids.join(', ')}\n\n`);
  if (args.plan) return 0;

  const keyEnv = profile.provider === 'minimax' ? 'MINIMAX_API_KEY' : 'ANTHROPIC_API_KEY';
  const apiKey = args.dryRun ? 'dry-run-placeholder' : (env[keyEnv] ?? '').trim();
  if (!apiKey) {
    err(`${keyEnv} is not set: nothing was sent. Export it (never write it to a file) or use --dry-run / --plan.\n`);
    return 2;
  }
  if (!args.dryRun && est.usd > CONFIRM_ABOVE_USD && !args.yes) {
    err(`The estimate is above $${CONFIRM_ABOVE_USD}: rerun with --yes to proceed.\n`);
    return 3;
  }

  const transport = new ApiTransport({
    network: args.dryRun ? fakeMessagesApi() : (deps.fetch ?? ((u, i) => fetch(u, i))),
    cache,
    concurrency: args.concurrency,
    sleep: deps.sleep,
    log: (m) => err(`  ${m}\n`),
  });
  const baseUrl = profile.provider === 'minimax' ? env.MINIMAX_BASE_URL : undefined;
  const ctx: LlmRunContext = { lex, lm, profile, transport, apiKey, baseUrl };
  const run = await runEval({
    items,
    select: () => selected,
    fixture: { path: lock.fixture.path, sha256 },
    lexicon: lexFile,
    bigram: bigFile,
    k: args.k,
    mode: args.mode,
    seed: args.seed,
    only: ['B0', 'B1', ...(args.intent ? ['B1i'] : []), ...ids],
    extra: [...(args.intent ? [ghostIntentDecoder(lex, bigFile.data)] : []), ...llmDecoders(ids, ctx)],
    concurrency: args.concurrency,
    ...(args.intent ? { intent: args.intent } : {}),
  });

  const spentMicros = transport.sent.reduce((s, e) => {
    const u = (e.response as { usage?: Record<string, number> } | null)?.usage ?? {};
    return s + costMicros(profile, { inputTokens: u.input_tokens ?? 0, outputTokens: u.output_tokens ?? 0, cacheReadTokens: u.cache_read_input_tokens ?? 0, cacheWriteTokens: u.cache_creation_input_tokens ?? 0 });
  }, 0);
  const results: LlmRunResults = {
    harness: HARNESS_VERSION,
    model: profile.id,
    label: profile.label,
    anthropicVersion: apiVersionFor(profile.provider),
    mode: args.mode,
    k: args.k,
    fixture: { path: lock.fixture.path, sha256 },
    subset: { items: selected.length, limit: args.limit ?? null, seed: args.seed },
    configs: run.results.configs.filter((c) => c.status === 'ok'),
    ...(args.intent ? { intent: args.intent } : {}),
  };
  const command = `pnpm -F @ninth/eval llm ${argv.filter((a) => a !== '--yes').join(' ')}`.trim();
  const section = renderSection(results, run.timing, {
    date,
    dryRun: args.dryRun,
    concurrency: args.concurrency,
    command,
    network: { sent: transport.sent.length, hits: transport.hits, retries: transport.retries, spentUsd: spentMicros / 1e6 },
  });
  out(section);

  // Per-item records (gitignored by default): what each config showed and what each call cost.
  const itemsOut = args.itemsOut ?? join(args.cacheDir, 'runs', `${args.dryRun ? 'dry-' : ''}${profile.id}-${args.mode}${args.intent ? '-intent-oracle' : ''}-${date}.jsonl`);
  mkdirSync(dirname(itemsOut), { recursive: true });
  const lines: string[] = [];
  for (const c of results.configs) {
    run.items.forEach((it, i) => {
      const r = run.perItem[c.id]![i]!;
      const o = run.outputs[c.id]![i]!;
      lines.push(
        JSON.stringify({
          config: c.id,
          id: it.id,
          src: it.src,
          rank: r.rank,
          words: r.words,
          wordsCorrect: r.wordsCorrect,
          rawCount: r.rawCount,
          invalidRaw: r.invalidRaw,
          candidates: o.candidates.slice(0, args.k).map((w) => w.join(' ')),
          llm: o.llm,
        }),
      );
    });
  }
  writeFileSync(itemsOut, lines.join('\n') + '\n');
  err(`per-item records: ${relative(process.cwd(), itemsOut)}\n`);

  const target = args.out ?? (args.dryRun ? undefined : EVAL_DIR);
  if (args.write && target) {
    mkdirSync(target, { recursive: true });
    const mdPath = join(target, 'RESULTS.md');
    const jsonPath = join(target, 'RESULTS.llm.json');
    const md = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : '';
    writeFileSync(mdPath, upsertSection(md, runId(results.model, results.mode, results.intent), section));
    const file: LlmResultsFile = existsSync(jsonPath) ? (JSON.parse(readFileSync(jsonPath, 'utf8')) as LlmResultsFile) : { harness: HARNESS_VERSION, runs: {} };
    file.runs[runId(results.model, results.mode, results.intent)] = results;
    file.runs = Object.fromEntries(Object.entries(file.runs).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(jsonPath, JSON.stringify(file, null, 2) + '\n');
    err(`updated ${relative(process.cwd(), mdPath)} and ${relative(process.cwd(), jsonPath)}\n`);
  } else if (args.write && args.dryRun) {
    err('dry run: RESULTS.md not touched (pass --out <dir> to write the dry-run section somewhere else)\n');
  }
  return 0;
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  llmMain(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
      process.exit(1);
    },
  );
}
