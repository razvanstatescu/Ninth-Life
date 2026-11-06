import type { KeyDef } from '@/lib/keys';

/** design-system Key (nl-key): letters lead, the digit sits small in the corner. */
export function Key({ def, lit, onPress }: { def: KeyDef; lit?: boolean; onPress: (def: KeyDef) => void }) {
  return (
    <button
      type="button"
      className={lit ? 'nl-key is-lit' : 'nl-key'}
      aria-label={def.ariaLabel}
      data-key={def.id}
      data-pad-focus=""
      onClick={() => onPress(def)}
    >
      <span className="nl-key__digit" aria-hidden="true">
        {def.digit}
      </span>
      {def.letters ? (
        <span className="nl-key__letters" aria-hidden="true">
          {def.letters}
        </span>
      ) : (
        <span className="nl-key__word" aria-hidden="true">
          {def.word}
        </span>
      )}
    </button>
  );
}
