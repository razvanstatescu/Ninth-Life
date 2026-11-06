/**
 * An in-process stand-in for POST /v1/messages, for `--dry-run` and tests (spec Req 8.8).
 *
 * The real `AnthropicLlmClient` talks to it through the eval transport, so a dry run exercises the
 * whole path (request body, cache, retries, reply reading, parse, validate, handleDecode) without
 * a key or the network. Its answers are deterministic and deliberately simple: it reads the user
 * turn the decoder built, returns the listed guesses (or, for an unconstrained prompt, the first
 * letter of each key), and always adds one sentence whose first word breaks the keys, so the
 * invalid-before-validator path is never empty. It rejects sampling parameters with a 400, as API
 * version 2026-10-21 does. Its numbers are not model measurements.
 */
import { KEY_LETTERS, type Digit } from '@ninth/core';
import type { FetchLike } from '@ninth/decoder';

interface ParsedTurn {
  mode: 'letter' | 'initials';
  slots: { code: string; words: string[] }[];
  guesses: string[][];
  k: number;
}

export function parseUserTurn(text: string): ParsedTurn {
  const mode = /<mode>initials<\/mode>/.test(text) ? 'initials' : 'letter';
  const slots: ParsedTurn['slots'] = [];
  const slotBlock = /<slots>\n([\s\S]*?)\n<\/slots>/.exec(text)?.[1] ?? '';
  for (const line of slotBlock.split('\n')) {
    const m = /^\d+ \[([2-9]+)\]: (.*)$/.exec(line);
    if (!m) continue;
    const words = m[2] === '(none listed)' ? [] : m[2]!.split(' | ');
    slots.push({ code: m[1]!, words });
  }
  const guessBlock = /<guesses>\n([\s\S]*?)\n<\/guesses>/.exec(text)?.[1] ?? '';
  const guesses = guessBlock ? guessBlock.split('\n').map((l) => l.split(' ')) : [];
  const k = Number(/<k>(\d+)<\/k>/.exec(text)?.[1] ?? 5);
  return { mode, slots, guesses, k };
}

/** A word that cannot match `code`: its first letter is on another key. */
function breaking(code: string, len: number): string {
  return (code.startsWith('2') ? 'd' : 'a').repeat(Math.max(1, len));
}

export function fakeAnswer(turn: ParsedTurn): string[][] {
  const out: string[][] = [];
  const seen = new Set<string>();
  const add = (c: string[]) => {
    if (c.length === 0 || seen.has(c.join(' '))) return;
    seen.add(c.join(' '));
    out.push(c);
  };
  for (const g of turn.guesses) if (out.length < turn.k - 1) add(g);
  if (out.length === 0) {
    const pick = turn.slots.map(({ code, words }) => {
      if (words[0]) return words[0];
      const letters = [...code].map((d) => KEY_LETTERS[d as Digit]?.[0] ?? 'a');
      return turn.mode === 'initials' ? (letters[0] ?? 'a') : letters.join('');
    });
    add(pick);
  }
  const first = out[0] ?? turn.slots.map((s) => s.words[0] ?? 'a');
  const code0 = turn.slots[0]?.code ?? '2';
  add([breaking(code0, turn.mode === 'initials' ? 3 : code0.length), ...first.slice(1)]);
  return out;
}

const tokens = (s: string) => Math.ceil(s.length / 4);

export interface FakeApiOptions {
  /** Called once per request with the parsed body, e.g. to inject faults in tests. */
  onRequest?: (body: Record<string, unknown>) => Response | undefined;
}

export function fakeMessagesApi(opts: FakeApiOptions = {}): FetchLike {
  return async (_url, init) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    const injected = opts.onRequest?.(body);
    if (injected) return injected;
    for (const p of ['temperature', 'top_p', 'top_k']) {
      if (p in body) {
        return new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: `${p} is not supported` } }), { status: 400 });
      }
    }
    const system = (body.system as { text: string; cache_control?: unknown }[] | undefined)?.[0];
    const user = ((body.messages as { content: { text: string }[] }[] | undefined)?.[0]?.content?.[0]?.text) ?? '';
    const text = JSON.stringify({ c: fakeAnswer(parseUserTurn(user)) });
    const sysTokens = tokens(system?.text ?? '');
    const cached = system?.cache_control !== undefined;
    return new Response(
      JSON.stringify({
        id: 'msg_fake',
        type: 'message',
        role: 'assistant',
        model: body.model,
        content: [{ type: 'text', text }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: tokens(user) + (cached ? 0 : sysTokens),
          output_tokens: tokens(text),
          cache_read_input_tokens: cached ? sysTokens : 0,
          cache_creation_input_tokens: 0,
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
}
