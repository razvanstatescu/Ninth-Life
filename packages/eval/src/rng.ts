/** Seeded PRNG (mulberry32) and a deterministic shuffle. No Math.random anywhere in the harness. */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates on a copy. */
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** n items chosen by seed, returned in their original order (so output order is stable). */
export function sample<T>(items: readonly T[], n: number, seed: number): T[] {
  if (n >= items.length) return items.slice();
  const idx = shuffled(
    items.map((_, i) => i),
    seed,
  )
    .slice(0, n)
    .sort((a, b) => a - b);
  return idx.map((i) => items[i]!);
}
