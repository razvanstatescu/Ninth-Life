/**
 * Reply type from the gold sentence, for an upper-bound eval of reply types (ADR-008, design C).
 * The person's real choice is unknown, so this "oracle" reads it off the answer:
 *   text ends in "?"              -> ask
 *   first word no/not/never/...   -> disagree
 *   first word yes/yeah/ok/...    -> agree
 * Only items with a partner line get one (a reply type is offered only after the other person spoke).
 * Numbers from it are an upper bound, never a claim about real use.
 */
import type { ReplyIntent } from '@ninth/core';
import type { TestItem } from './types';

const NEG0 = new Set(['no', 'not', 'never', 'nope', 'nah']);
const YES0 = new Set('yes yeah yep ok okay sure right exactly true agreed absolutely definitely fine good great'.split(' '));

export function oracleIntent(item: Pick<TestItem, 'text' | 'words' | 'partner'>): ReplyIntent | undefined {
  if (!item.partner?.trim()) return undefined;
  if (String(item.text).trim().endsWith('?')) return 'ask';
  const first = item.words[0];
  if (first && NEG0.has(first)) return 'disagree';
  if (first && YES0.has(first)) return 'agree';
  return undefined;
}

/** The items an `--intent oracle` run evaluates: those with a partner line and an oracle reply type. */
export function oracleItems(items: readonly TestItem[]): TestItem[] {
  return items.filter((it) => oracleIntent(it) !== undefined);
}
