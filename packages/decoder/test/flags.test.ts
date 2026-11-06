import { describe, expect, it } from 'vitest';
import { EnvFlags, StaticFlags } from '../src/flags.js';

describe('EnvFlags (DS-3 kill switch)', () => {
  it('only the exact string "true" enables; unset is off', async () => {
    expect(await new EnvFlags({ LLM_ENABLED: 'true' }).llmEnabled()).toBe(true);
    for (const v of [undefined, '', 'false', '1', 'TRUE', 'true ']) expect(await new EnvFlags({ LLM_ENABLED: v }).llmEnabled()).toBe(false);
  });
});

describe('StaticFlags', () => {
  it('can be flipped', async () => {
    const f = new StaticFlags(true);
    f.set(false);
    expect(await f.llmEnabled()).toBe(false);
  });
});
