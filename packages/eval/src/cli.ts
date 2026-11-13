/**
 * Ninth Life eval CLI.
 *
 *   pnpm -F @ninth/eval quick      200-item deterministic subset, prints a markdown table
 *   pnpm -F @ninth/eval eval       full test set, writes RESULTS.json and RESULTS.md
 *
 * Options:
 *   --quick              200-item subset (seeded)
 *   --seed <n>           subset seed (default 9)
 *   --k <n>              candidates per decode (default 5)
 *   --only B0,B1         run only these configs
 *   --llm <module>       ES module whose default export (or `createProposer`) returns an
 *                        LlmProposer; enables B2-B4
 *   --lexicon <path>     LexiconFile (v1) or LexiconFileV2 to evaluate (default data/lexicon/en.v1.json);
 *                        data/lexicon/en.v2.json gives the same results (ADR-data-003)
 *   --bigram <path>      BigramFile to evaluate (default data/lexicon/en.bigram.v1.json)
 *   --letter-penalty <x> log10 penalty for one-letter words other than a/i (default: core's,
 *                        ADR-core-002); 0 turns it off
 *   --out <dir>          where to write RESULTS.json / RESULTS.md (default packages/eval)
 *   --write / --no-write force writing on or off (quick defaults to off, full to on)
 *   --json               print RESULTS.json to stdout instead of the table
 *   --no-initials        skip the offline initials-mode baseline (B0/B1 with one key per word)
 *   --intent oracle      reply types (ADR-008): only items with a partner line and a reply type read
 *                        off the gold sentence ("?" ask, no/not... disagree, yes/ok... agree); runs B1
 *                        and B1i "B1+intent (oracle)". An upper bound: prints only, and never writes
 *                        RESULTS into packages/eval (pass --write --out <dir> to keep it elsewhere)
 *
 * B2-B4 against the Anthropic API: `pnpm -F @ninth/eval llm` (src/llm/cli.ts). Rewriting
 * RESULTS.md here keeps the "Model ranking" sections that command wrote.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ghostIntentDecoder, type LlmProposer } from './decoders';
import { oracleItems } from './intent';
import { EVAL_DIR, lexiconSourceSha, loadBigramFile, loadFixture, loadLexiconFile, PATHS, readLock } from './fixture';
import { withLlmSections } from './llm/report';
import { initialsTable, resultsMarkdown, table } from './report';
import { Lexicon } from '@ninth/core';
import { DEFAULT_K, DEFAULT_SEED, latticeCoverage, runEval, selectItems, serializeResults } from './run';

interface Args {
  quick: boolean;
  seed: number;
  k: number;
  only?: string[];
  llm?: string;
  lexicon?: string;
  bigram?: string;
  letterPenalty?: number;
  out: string;
  write?: boolean;
  json: boolean;
  initials: boolean;
  intent?: 'oracle';
}

export function parseArgs(argv: string[]): Args {
  const a: Args = { quick: false, seed: DEFAULT_SEED, k: DEFAULT_K, out: EVAL_DIR, json: false, initials: true };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i]!;
    const val = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${x} needs a value`);
      return v;
    };
    if (x === '--quick') a.quick = true;
    else if (x === '--seed') a.seed = toInt(val(), x);
    else if (x === '--k') a.k = toInt(val(), x);
    else if (x === '--only') a.only = val().split(',').map((s) => s.trim());
    else if (x === '--llm') a.llm = val();
    else if (x === '--lexicon') a.lexicon = resolve(val());
    else if (x === '--bigram') a.bigram = resolve(val());
    else if (x === '--letter-penalty') a.letterPenalty = toPenalty(val(), x);
    else if (x === '--out') a.out = resolve(val());
    else if (x === '--write') a.write = true;
    else if (x === '--no-write') a.write = false;
    else if (x === '--json') a.json = true;
    else if (x === '--no-initials') a.initials = false;
    else if (x === '--intent') {
      const v = val();
      if (v !== 'oracle') throw new Error(`--intent takes oracle (got ${v})`);
      a.intent = v;
    }
    else if (x === '--') continue;
    else throw new Error(`unknown option ${x}`);
  }
  if (a.intent && a.write && a.out === EVAL_DIR) throw new Error('--intent oracle is an upper bound on a subset: it never writes RESULTS into packages/eval; pick another --out');
  return a;
}

function toInt(v: string, name: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer`);
  return n;
}

function toPenalty(v: string, name: string): number {
  const n = Number(v);
  if (v.trim() === '' || !Number.isFinite(n) || n > 0) throw new Error(`${name} must be a number <= 0`);
  return n;
}

async function loadProposer(spec: string): Promise<LlmProposer> {
  const url = pathToFileURL(isAbsolute(spec) ? spec : resolve(process.cwd(), spec)).href;
  const mod = (await import(url)) as { default?: () => LlmProposer | Promise<LlmProposer>; createProposer?: () => LlmProposer | Promise<LlmProposer> };
  const make = mod.createProposer ?? mod.default;
  if (typeof make !== 'function') throw new Error(`${spec}: export createProposer() or a default factory`);
  return make();
}

export async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const lock = readLock();
  const { items, sha256 } = loadFixture(PATHS.fixture, lock);
  const lexicon = loadLexiconFile(args.lexicon);
  const bigram = loadBigramFile(args.bigram);
  for (const [name, got, want] of [
    ['lexicon', lexiconSourceSha(lexicon), lock.lexicon.sha256],
    ['bigram', bigram.sha256, lock.bigram.sha256],
  ] as const) {
    if (got !== want) process.stderr.write(`warning: ${name} SHA-256 differs from eval.lock (data rebuilt since the test set was frozen)\n`);
  }
  const llm = args.llm ? await loadProposer(args.llm) : undefined;

  const common = {
    items,
    fixture: { path: lock.fixture.path, sha256 },
    lexicon,
    bigram,
    quick: args.quick,
    seed: args.seed,
    k: args.k,
    lm: args.letterPenalty === undefined ? undefined : { letterPenalty: args.letterPenalty },
  };
  if (args.intent) {
    const lex = Lexicon.fromJSON(lexicon.data);
    const run = await runEval({
      ...common,
      select: (all) => oracleItems(selectItems(all, args.quick, args.seed)),
      only: args.only ?? ['B1', 'B1i'],
      extra: [ghostIntentDecoder(lex, bigram.data, common.lm)],
      intent: 'oracle',
    });
    if (args.write) {
      mkdirSync(args.out, { recursive: true });
      writeFileSync(join(args.out, 'RESULTS.intent-oracle.json'), serializeResults(run.results));
    }
    if (args.json) process.stdout.write(serializeResults(run.results));
    else {
      process.stdout.write(`Reply type from the gold sentence (upper bound, not a measurement): ${run.results.subset.items} items with a partner line and a reply type, k=${run.results.k}\n\n`);
      process.stdout.write(table(run.results, run.timing) + '\n');
    }
    return 0;
  }
  const { results, timing } = await runEval({ ...common, only: args.only, llm });
  // Initials-mode baseline (spec Req 9): offline configs only, same items.
  let initialsTiming = {};
  if (args.initials) {
    const ini = await runEval({ ...common, mode: 'initials', only: (args.only ?? ['B0', 'B1']).filter((id) => id === 'B0' || id === 'B1') });
    if (ini.results.configs.length > 0) {
      const lex = Lexicon.fromJSON(lexicon.data);
      const evaluated = selectItems(items, args.quick, args.seed);
      results.initials = { mode: 'initials', configs: ini.results.configs, coverage: latticeCoverage(evaluated, lex, 'initials') };
      initialsTiming = ini.timing;
    }
  }

  const write = args.write ?? !args.quick;
  if (write) {
    mkdirSync(args.out, { recursive: true });
    const jsonPath = join(args.out, 'RESULTS.json');
    const mdPath = join(args.out, 'RESULTS.md');
    writeFileSync(jsonPath, serializeResults(results));
    const previous = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : '';
    const md = resultsMarkdown(results, timing, { node: process.versions.node, platform: `${process.platform}-${process.arch}` }, initialsTiming);
    writeFileSync(mdPath, withLlmSections(md, previous));
    process.stderr.write(`wrote ${relative(process.cwd(), jsonPath)} and ${relative(process.cwd(), mdPath)}\n`);
  }
  if (args.json) process.stdout.write(serializeResults(results));
  else {
    const s = results.subset;
    process.stdout.write(`${s.quick ? 'Quick subset' : 'Full set'}: ${s.items} items, seed ${s.seed}, k=${results.k}\n\n`);
    process.stdout.write(table(results, timing) + '\n');
    if (results.initials) process.stdout.write(`\nInitials mode (one key per word), same items:\n\n${initialsTable(results.initials.configs, initialsTiming)}\n`);
  }
  return 0;
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err: unknown) => {
      process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    },
  );
}
