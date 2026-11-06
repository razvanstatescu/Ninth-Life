import { describe, expect, it } from 'vitest';
import { EnvFlags, SsmFlags, type SsmSender } from '../src/flags.js';

describe('EnvFlags', () => {
  it('only the exact string "true" enables', async () => {
    expect(await new EnvFlags({ LLM_ENABLED: 'true' }).llmEnabled()).toBe(true);
    for (const v of [undefined, '', 'false', '1', 'TRUE ']) expect(await new EnvFlags({ LLM_ENABLED: v }).llmEnabled()).toBe(false);
  });
});

describe('SsmFlags (DS-3 kill switch)', () => {
  function ssm(values: (string | Error)[]) {
    let calls = 0;
    const client: SsmSender = {
      async send() {
        const v = values[Math.min(calls++, values.length - 1)]!;
        if (v instanceof Error) throw v;
        return { Parameter: { Value: v } };
      },
    };
    return { client, calls: () => calls };
  }

  it('reads the parameter and caches it for ttlMs', async () => {
    let now = 0;
    const s = ssm(['true', 'false']);
    const f = new SsmFlags('/ninthlife/llm_enabled', { client: s.client, ttlMs: 30_000, now: () => now });
    expect(await f.llmEnabled()).toBe(true);
    now = 29_999;
    expect(await f.llmEnabled()).toBe(true);
    expect(s.calls()).toBe(1);
    now = 30_000;
    expect(await f.llmEnabled()).toBe(false); // the flip is seen within 30 s
  });

  it('fails closed when SSM errors', async () => {
    const f = new SsmFlags('/p', { client: ssm([new Error('boom')]).client, now: () => 0 });
    expect(await f.llmEnabled()).toBe(false);
  });

  it('treats anything but "true" as disabled', async () => {
    const f = new SsmFlags('/p', { client: ssm(['yes']).client, now: () => 0 });
    expect(await f.llmEnabled()).toBe(false);
  });
});
