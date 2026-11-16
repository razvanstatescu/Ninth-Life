import type { KeyDef } from '@/lib/keys';

/**
 * design-system Key (nl-key): letters lead, the digit sits small in the corner. `ignored`: the last press
 * was a repeat inside the accept delay and was not counted; a dashed inner ring shows it (shape, not colour).
 */
export function Key({ def, lit, ignored, onPress }: { def: KeyDef; lit?: boolean; ignored?: boolean; onPress: (def: KeyDef) => void }) {
  return (
    <button
      type="button"
      className={['nl-key', lit && 'is-lit', ignored && 'is-ignored'].filter(Boolean).join(' ')}
      data-ignored={ignored ? '' : undefined}
      aria-label={def.ariaLabel}
      data-key={def.id}
      data-pad-focus=""
      onClick={() => onPress(def)}
    >
      <span className="nl-key__digit" aria-hidden="true">
        {def.digit}
      </span>
      {' '}
      {def.letters ? (
        <span
          className={def.letters.length > 3 ? 'nl-key__letters nl-key__letters--4' : 'nl-key__letters'}
          aria-hidden="true"
        >
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
