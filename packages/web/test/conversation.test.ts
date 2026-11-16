// The conversation thread's rules (web-ui Req 27, ADR-007): the pure reducer, selectors, store, the
// ranking context and its size, and where the thread shows. UI behaviour: conversation-ui.test.tsx.
import fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vitest';
import {
  EMPTY_CONVERSATION,
  MAX_TURNS,
  ME_MAX,
  SAME_TURN_MS,
  THEM_MAX,
  awaitingReply,
  conversationReducer,
  conversationStore,
  decodeContext,
  lastThem,
  lastTurn,
  recentMine,
  threadText,
  type ConversationAction,
  type ConversationState,
} from '@/lib/conversation';
import { DecodeCache, LIMITS, buildRequest } from '@/lib/decodeClient';
import { STACK_NO_HEADER_QUERY, STACK_THREAD_QUERY, threadRows } from '@/lib/layout';
import { DEFAULT_SETTINGS, sanitizeSettings } from '@/lib/settings';

const run = (actions: ConversationAction[], s: ConversationState = EMPTY_CONVERSATION) => actions.reduce(conversationReducer, s);
const them = (text: string, at = 0): ConversationAction => ({ type: 'add', who: 'them', text, via: 'typed', at });
const me = (text: string, at = 0): ConversationAction => ({ type: 'add', who: 'me', text, via: 'keys', at });

const action: fc.Arbitrary<ConversationAction> = fc.oneof(
  fc.record({ type: fc.constant('add' as const), who: fc.constant('them' as const), text: fc.string({ maxLength: 400 }), via: fc.constantFrom('typed' as const, 'heard' as const), at: fc.integer({ min: 0, max: 1e7 }) }),
  fc.record({ type: fc.constant('add' as const), who: fc.constant('me' as const), text: fc.string({ maxLength: 700 }), via: fc.constantFrom('keys' as const, 'phrase' as const, 'quick' as const, 'again' as const, 'shown' as const), at: fc.integer({ min: 0, max: 1e7 }) }),
  fc.record({ type: fc.constant('edit' as const), id: fc.integer({ min: 0, max: 80 }), text: fc.string({ maxLength: 400 }) }),
  fc.record({ type: fc.constant('remove' as const), id: fc.integer({ min: 0, max: 80 }) }),
  fc.constant({ type: 'clear' as const }),
);

afterEach(() => conversationStore.reset());

describe('conversation reducer (web-ui Req 27.1-27.3)', () => {
  it('27.1 never more than 50 turns, oldest dropped first, ids rising, text trimmed and within the limits', () => {
    fc.assert(
      fc.property(fc.array(action, { maxLength: 160 }), (actions) => {
        const s = run(actions);
        expect(s.turns.length).toBeLessThanOrEqual(MAX_TURNS);
        for (let i = 1; i < s.turns.length; i++) expect(s.turns[i]!.id).toBeGreaterThan(s.turns[i - 1]!.id);
        for (const t of s.turns) {
          expect(t.text).toBe(t.text.trim());
          expect(t.text.length).toBeGreaterThan(0);
          expect(t.text.length).toBeLessThanOrEqual(t.who === 'them' ? THEM_MAX : ME_MAX);
          expect(t.text).not.toMatch(/\s{2}|\n/);
        }
      }),
    );
  });

  it('27.1 keeps the newest 50 in order', () => {
    const s = run(Array.from({ length: 60 }, (_, i) => them(`line ${i}`)));
    expect(s.turns).toHaveLength(50);
    expect(s.turns[0]!.text).toBe('line 10');
    expect(lastTurn(s)!.text).toBe('line 59');
  });

  it('27.2 the same "you said" line within 60 s is one turn (Show then Speak, Say again twice); later or different is a new one', () => {
    let s = run([me('I need water', 1000), me('I need water', 1000 + SAME_TURN_MS)]);
    expect(s.turns).toHaveLength(1);
    expect(s.turns[0]!.at).toBe(1000 + SAME_TURN_MS);
    s = run([me('I need water', 1000 + 2 * SAME_TURN_MS + 1)], s);
    expect(s.turns).toHaveLength(2);
    s = run([them('Sorry?'), me('I need water', 1000 + 2 * SAME_TURN_MS + 2)], s);
    expect(s.turns.map((t) => t.who)).toEqual(['me', 'me', 'them', 'me']);
    expect(run([me('Yes.'), me('No.')]).turns).toHaveLength(2);
  });

  it('27.2 property: a "you said" line never follows itself within 60 s', () => {
    fc.assert(
      fc.property(fc.array(action, { maxLength: 80 }), (actions) => {
        const s = run(actions);
        for (let i = 1; i < s.turns.length; i++) {
          const [a, b] = [s.turns[i - 1]!, s.turns[i]!];
          if (a.who === 'me' && b.who === 'me' && a.text === b.text && actions.every((x) => x.type !== 'remove' && x.type !== 'edit'))
            expect(Math.abs(b.at - a.at) > SAME_TURN_MS || b.at < a.at).toBe(true);
        }
      }),
    );
  });

  it('27.3 empty lines are not turns; Change edits only the newest "they said", and saving it empty removes it', () => {
    expect(run([them('   '), me('\n')]).turns).toHaveLength(0);
    let s = run([them('Tea?'), me('Yes.'), them('Milk?')]);
    const [first, , newest] = s.turns;
    expect(run([{ type: 'edit', id: first!.id, text: 'Coffee?' }], s)).toBe(s); // not the newest: ignored
    s = run([{ type: 'edit', id: newest!.id, text: 'Milk or sugar?', via: 'heard' }], s);
    expect(lastThem(s)).toMatchObject({ id: newest!.id, text: 'Milk or sugar?', via: 'heard' });
    s = run([{ type: 'edit', id: newest!.id, text: '  ' }], s);
    expect(s.turns.map((t) => t.text)).toEqual(['Tea?', 'Yes.']);
    expect(lastThem(s)!.text).toBe('Tea?');
  });

  it('27.9 clear removes every turn; ids keep rising after it', () => {
    const s = run([them('a'), me('b'), { type: 'clear' }, them('c')]);
    expect(s.turns.map((t) => [t.id, t.text])).toEqual([[3, 'c']]);
  });
});

describe('selectors', () => {
  it('lastThem, awaitingReply (newest is theirs) and the partner line', () => {
    expect(awaitingReply(EMPTY_CONVERSATION)).toBe(false);
    const s = run([them('Tea?')]);
    expect(awaitingReply(s)).toBe(true);
    expect(awaitingReply(run([me('Yes.')], s))).toBe(false);
    expect(decodeContext(run([me('Yes.')], s), { recent: false })).toEqual({ partner: 'Tea?', recent: [] });
    expect(decodeContext(EMPTY_CONVERSATION, { recent: true })).toEqual({ recent: [] });
  });

  it('27.11 recentMine: at most 3 of your lines, oldest first, each at most 280 characters', () => {
    fc.assert(
      fc.property(fc.array(action, { maxLength: 80 }), fc.integer({ min: 0, max: 5 }), (actions, n) => {
        const s = run(actions);
        const r = recentMine(s, n);
        expect(r.length).toBeLessThanOrEqual(n);
        for (const x of r) expect(x.length).toBeLessThanOrEqual(LIMITS.recentChars);
        const mine = s.turns.filter((t) => t.who === 'me').map((t) => t.text.slice(0, 280));
        expect(r).toEqual(n === 0 ? [] : mine.slice(-n));
      }),
    );
  });

  it('27.11 decodeContext sends recent only when "Include what you said" is on, and only lines from before `before`', () => {
    const s = run([me('one'), them('Tea?'), me('two'), me('three'), me('four')]);
    expect(decodeContext(s, { recent: false }).recent).toEqual([]);
    expect(decodeContext(s, { recent: true }).recent).toEqual(['two', 'three', 'four']);
    expect(decodeContext(s, { recent: true, before: 5 }).recent).toEqual(['one', 'two', 'three']);
  });

  it('threadText: "They said" / "You said" lines, oldest first', () => {
    expect(threadText(run([them('Tea?'), me('Yes please.')]).turns)).toBe('They said: Tea?\nYou said: Yes please.');
  });
});

describe('the store (memory only)', () => {
  it('notifies subscribers and resets', () => {
    let calls = 0;
    const off = conversationStore.subscribe(() => (calls += 1));
    conversationStore.dispatch(them('Hi'));
    conversationStore.dispatch(them('')); // no change, no call
    expect(calls).toBe(1);
    expect(conversationStore.get().turns).toHaveLength(1);
    off();
    conversationStore.reset();
    expect(conversationStore.get()).toBe(EMPTY_CONVERSATION);
  });
});

describe('model ranking context (web-ui Req 27.11, contracts.md §3)', () => {
  const codes = Array.from({ length: 20 }, () => '9999999999999999');
  const lat = codes.map(() => Array.from({ length: 12 }, (_, i) => `wwwwwwwwwwwwwww${String.fromCharCode(97 + i)}`));

  it('stays under 4 KB with 3 recent lines of 280 characters and a 280-character partner line', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ minLength: 280, maxLength: 280 }), { minLength: 3, maxLength: 3 }), fc.string({ maxLength: 280 }), (recent, partner) => {
        const req = buildRequest(codes, lat, partner, 'letter', 5, [], recent)!;
        expect(new TextEncoder().encode(JSON.stringify(req)).length).toBeLessThanOrEqual(LIMITS.bodyBytes);
        expect(req.context.recent.length).toBeLessThanOrEqual(3);
        for (const r of req.context.recent) expect(r.length).toBeLessThanOrEqual(280);
      }),
    );
    const ascii = buildRequest(['4'], [['i']], 'Tea?', 'letter', 5, [], ['a'.repeat(280), 'b'.repeat(280), 'c'.repeat(280), 'd'])!;
    expect(ascii.context.recent).toEqual(['b'.repeat(280), 'c'.repeat(280), 'd']);
    // Long non-Latin text is 3 bytes a character: the oldest lines go before the body would pass 4 KB.
    const wide = buildRequest(codes, lat, 'ă'.repeat(280), 'letter', 5, [], ['你'.repeat(280), '你'.repeat(280), '你'.repeat(280)])!;
    expect(new TextEncoder().encode(JSON.stringify(wide)).length).toBeLessThanOrEqual(LIMITS.bodyBytes);
  });

  it('sends no recent lines unless given (the default stays empty)', () => {
    expect(buildRequest(['4'], [['i']], undefined, 'letter')!.context).toEqual({ recent: [] });
  });

  it('the cache key changes when the recent lines change, and is the old key with none', () => {
    expect(DecodeCache.key(['4'], 'hi')).toBe('4|hi');
    expect(DecodeCache.key(['4'], 'hi', [])).toBe('4|hi');
    const a = DecodeCache.key(['4'], 'hi', ['yes']);
    expect(a).not.toBe('4|hi');
    expect(DecodeCache.key(['4'], 'hi', ['no'])).not.toBe(a);
    expect(DecodeCache.key(['4'], 'hi', ['a|b'])).not.toBe(DecodeCache.key(['4'], 'hi', ['a', 'b']));
  });

  it('"Include what you said" (llmRecent) is off unless turned on', () => {
    expect(DEFAULT_SETTINGS.llmRecent).toBe(false);
    expect(sanitizeSettings({ llmRecent: 'yes' }).llmRecent).toBe(false);
    expect(sanitizeSettings({ llmRecent: true }).llmRecent).toBe(true);
  });
});

describe('where the thread shows (web-ui Req 27.4-27.6)', () => {
  it('threadRows: none on short stacks, the header on phones, a strip on split and tall stacks, a panel on laptops', () => {
    expect(threadRows('stack', { tall: false, noHeader: true })).toBe(0);
    expect(threadRows('stack', { tall: false, noHeader: false })).toBe(1);
    expect(threadRows('stack', { tall: true, noHeader: false })).toBe(2);
    expect(threadRows('split', { tall: false, noHeader: false })).toBe(2);
    expect(threadRows('wide', { tall: false, noHeader: false })).toBe(3);
    expect(threadRows('compact', { tall: false, noHeader: false })).toBe(3);
    expect(threadRows('rotate', { tall: false, noHeader: false })).toBe(0);
    expect(STACK_THREAD_QUERY).toBe('(min-height: 1150px)');
    expect(STACK_NO_HEADER_QUERY).toBe('(max-height: 639px)');
  });
});
