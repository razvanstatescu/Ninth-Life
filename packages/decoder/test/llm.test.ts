import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { describe, expect, it } from 'vitest';
import { anthropicBody, assertEu, BedrockLlmClient, LlmError, novaBody, readAnthropic, type InvokeModelSender } from '../src/llm.js';
import { costMicros, iamArns, MODEL_PROFILES } from '../src/models.js';

const prompt = { system: 'SYS', user: 'USER' };

function stub(response: unknown) {
  const sent: { cmd: InvokeModelCommand; signal?: AbortSignal }[] = [];
  const client: InvokeModelSender = {
    async send(cmd, opts) {
      sent.push({ cmd, signal: opts?.abortSignal });
      return { body: new TextEncoder().encode(JSON.stringify(response)) };
    },
  };
  return { client, sent };
}

describe('model profiles (DS-7: EU only)', () => {
  it('every profile is an EU geo profile routing only to EU Regions', () => {
    for (const p of Object.values(MODEL_PROFILES)) {
      expect(p.profileId.startsWith('eu.')).toBe(true);
      expect(p.destinationRegions.every((r) => r.startsWith('eu-'))).toBe(true);
      expect(() => assertEu('eu-central-1', p)).not.toThrow();
    }
  });

  it('refuses non-EU regions', () => {
    expect(() => assertEu('us-east-1', MODEL_PROFILES['haiku-4.5'])).toThrow(LlmError);
    expect(() => new BedrockLlmClient({ model: 'haiku-4.5', region: 'us-west-2', client: stub({}).client })).toThrow();
  });

  it('builds the IAM ARNs AWS documents for geo profiles', () => {
    const a = iamArns(MODEL_PROFILES['haiku-4.5'], '111122223333');
    expect(a.profileArn).toBe(
      'arn:aws:bedrock:eu-central-1:111122223333:inference-profile/eu.anthropic.claude-haiku-4-5-20251001-v1:0',
    );
    expect(a.foundationModelArns).toContain(
      'arn:aws:bedrock:eu-west-3::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0',
    );
    expect(a.foundationModelArns).toHaveLength(6);
  });

  it('estimates cost in micro-dollars', () => {
    // Haiku 4.5 EU: 900 in * $1.10/M + 100 out * $5.50/M = $0.00154
    expect(costMicros(MODEL_PROFILES['haiku-4.5'], { inputTokens: 900, outputTokens: 100 })).toBe(1540);
  });
});

describe('request bodies', () => {
  it('Haiku 4.5: temperature 0.3, no thinking field, no cache checkpoint', () => {
    const b = anthropicBody(MODEL_PROFILES['haiku-4.5'], prompt, 120);
    expect(b).toMatchObject({ anthropic_version: 'bedrock-2023-05-31', max_tokens: 120, temperature: 0.3 });
    expect(b.thinking).toBeUndefined();
    expect(JSON.stringify(b.system)).not.toContain('cache_control');
  });

  it('Haiku 5.5: no temperature (non-default values 400), thinking disabled, system cached', () => {
    const b = anthropicBody(MODEL_PROFILES['haiku-5.5'], prompt, 120);
    expect('temperature' in b).toBe(false);
    expect(b.thinking).toEqual({ type: 'disabled' });
    expect(b.system).toEqual([{ type: 'text', text: 'SYS', cache_control: { type: 'ephemeral' } }]);
    expect(b.messages).toEqual([{ role: 'user', content: [{ type: 'text', text: 'USER' }] }]);
  });

  it('Nova Micro: messages-v1 body', () => {
    const b = novaBody(MODEL_PROFILES['nova-micro'], prompt, 120);
    expect(b).toEqual({
      schemaVersion: 'messages-v1',
      system: [{ text: 'SYS' }],
      messages: [{ role: 'user', content: [{ text: 'USER' }] }],
      inferenceConfig: { maxTokens: 120, temperature: 0.3 },
    });
  });
});

describe('responses', () => {
  it('reads text blocks by type (thinking blocks may come first)', () => {
    const r = readAnthropic({
      content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"c":[]}' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 3, cache_read_input_tokens: 7 },
    });
    expect(r.text).toBe('{"c":[]}');
    expect(r.usage).toEqual({ inputTokens: 10, outputTokens: 3, cacheReadTokens: 7, cacheWriteTokens: 0 });
  });

  it('turns a refusal into an error', () => {
    expect(() => readAnthropic({ content: [], stop_reason: 'refusal' })).toThrow(LlmError);
  });
});

describe('BedrockLlmClient', () => {
  it('invokes the EU profile with the abort signal and parses the reply', async () => {
    const { client, sent } = stub({ content: [{ type: 'text', text: 'hi' }], usage: { input_tokens: 1, output_tokens: 1 } });
    const llm = new BedrockLlmClient({ model: 'haiku-4.5', client });
    const ac = new AbortController();
    const r = await llm.complete(prompt, { maxTokens: 120, signal: ac.signal });
    expect(r.text).toBe('hi');
    expect(sent[0]!.cmd.input.modelId).toBe('eu.anthropic.claude-haiku-4-5-20251001-v1:0');
    expect(sent[0]!.signal).toBe(ac.signal);
    const body = JSON.parse(new TextDecoder().decode(sent[0]!.cmd.input.body as Uint8Array));
    expect(body.max_tokens).toBe(120);
  });

  it('reads Nova replies', async () => {
    const { client } = stub({ output: { message: { content: [{ text: '{"c":[]}' }] } }, usage: { inputTokens: 5, outputTokens: 2 } });
    const llm = new BedrockLlmClient({ model: 'nova-micro', client });
    const r = await llm.complete(prompt, { maxTokens: 120, signal: new AbortController().signal });
    expect(r.text).toBe('{"c":[]}');
    expect(r.usage.inputTokens).toBe(5);
  });
});
