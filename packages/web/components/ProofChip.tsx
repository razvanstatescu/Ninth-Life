import { Icon } from './Icon';

export type ChipState = 'match' | 'new' | 'reject' | 'typing' | 'unspelled';

const ICON = { match: 'check', new: 'plus', reject: 'x' } as const;
/** Read aloud after the word: "water, matches". */
export const CHIP_SR_TEXT: Record<ChipState, string> = {
  match: 'matches your keys',
  new: 'matches your keys, not in your words yet',
  reject: 'does not match your keys, will not be spoken',
  typing: 'still typing',
  unspelled: 'not spelled yet',
};

/**
 * design-system ProofChip (nl-chip). State is told apart by icon, border style and text
 * treatment, never by color alone. App-only states: `typing` (dotted, no icon) and `unspelled`
 * (dotted, the digits and the words "not spelled yet": no dictionary word matches these keys and
 * the person has not spelled one; web-ui Req 20.2).
 */
export function ProofChip({ state, word, code }: { state: ChipState; word: string; code: string }) {
  if (state === 'unspelled') {
    return (
      <span className="nl-chip nl-chip--unspelled" data-state={state}>
        <span className="nl-chip__word nl-chip__digits">{code}</span>
        <span className="nl-chip__note" aria-hidden="true">
          not spelled yet
        </span>
        <span className="nl-sr-only">, {CHIP_SR_TEXT[state]}. Keys {code.split('').join(' ')}.</span>
      </span>
    );
  }
  return (
    <span className={`nl-chip nl-chip--${state}`} data-state={state}>
      {state !== 'typing' ? <Icon name={ICON[state]} /> : null}
      <span className="nl-chip__word">{word}</span>
      <span className="nl-chip__code" aria-hidden="true">
        {code}
      </span>
      <span className="nl-sr-only">, {CHIP_SR_TEXT[state]}. Keys {code.split('').join(' ')}.</span>
    </span>
  );
}
