/** Aggregate per-item outcomes into the plan section 3.4 metrics. Rounded to 4 decimals. */
import type { ItemResult, Metrics } from './types';

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

export function aggregate(rs: readonly ItemResult[], k: number, hasRaw: boolean, hasCost: boolean): Metrics {
  let words = 0,
    correct = 0,
    t1 = 0,
    tk = 0,
    chars = 0,
    keys = 0,
    scan = 0,
    inv = 0,
    raw = 0,
    unreach = 0,
    usd = 0;
  for (const r of rs) {
    words += r.words;
    correct += r.wordsCorrect;
    if (r.rank === 0) t1++;
    if (r.rank >= 0 && r.rank < k) tk++;
    chars += r.chars;
    keys += r.presses + r.selections;
    scan += r.scanSteps;
    inv += r.invalidRaw;
    raw += r.rawCount;
    if (r.unreachable) unreach++;
    usd += r.usd;
  }
  const n = rs.length || 1;
  const initials = rs.some((r) => r.retyped !== undefined);
  const m: Metrics = {
    items: rs.length,
    words,
    wordAcc: r4(correct / (words || 1)),
    top1: r4(t1 / n),
    top5: r4(tk / n),
    ksr: r4(1 - keys / (chars || 1)),
    scanStepsPerChar: r4(scan / (chars || 1)),
    pressesPerChar: r4(keys / (chars || 1)),
    invalidPreValidator: hasRaw ? r4(inv / (raw || 1)) : null,
    unreachable: unreach,
    usdPer1k: hasCost ? r4((usd / n) * 1000) : null,
  };
  if (initials) m.retypedWords = rs.reduce((s, r) => s + (r.retyped ?? 0), 0);
  if (rs.some((r) => r.completed !== undefined)) m.completedWords = r4(rs.reduce((s, r) => s + (r.completed ?? 0), 0) / (words || 1));
  if (rs.some((r) => r.scanStepsApp !== undefined)) m.scanStepsPerCharApp = r4(rs.reduce((s, r) => s + (r.scanStepsApp ?? 0), 0) / (chars || 1));
  return m;
}

/** p-th percentile (nearest rank) of a list of numbers. */
export function percentile(xs: readonly number[], p: number): number {
  if (xs.length === 0) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[i]!;
}
