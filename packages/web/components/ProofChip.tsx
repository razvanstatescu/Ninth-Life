import { Icon } from './Icon';

export type ChipState = 'match' | 'new' | 'reject' | 'typing';

const ICON = { match: 'check', new: 'plus', reject: 'x' } as const;
/** Read aloud after the word: "water, matches". */
export const CHIP_SR_TEXT: Record<ChipState, string> = {
  match: 'matches your keys',
  new: 'matches your keys, not in your words yet',
  reject: 'does not match your keys, will not be spoken',
  typing: 'still typing',
};

/**
 * design-system ProofChip (nl-chip). State is told apart by icon, border style and text
 * treatment, never by color alone.
 */
export function ProofChip({ state, word, code }: { state: ChipState; word: string; code: string }) {
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
