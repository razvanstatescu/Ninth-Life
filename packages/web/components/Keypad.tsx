import { KEY_ROWS, type KeyDef } from '@/lib/keys';
import { Key } from './Key';

/**
 * design-system Keypad (nl-keypad): 12 keys on the moon bubble, fixed layout.
 * Scanning: the active row gets is-scanning, then the active key inside it gets is-lit.
 */
export function Keypad({
  onPress,
  scanRow = -1,
  litKey = null,
}: {
  onPress: (def: KeyDef) => void;
  /** Row with the scan ring, or -1. */
  scanRow?: number;
  /** [row, cell] of the lit key, or null. */
  litKey?: readonly [number, number] | null;
}) {
  return (
    <div className="nl-keypad" role="group" aria-label="Keypad">
      {KEY_ROWS.map((row, r) => (
        <div key={r} className={r === scanRow ? 'nl-keypad__row is-scanning' : 'nl-keypad__row'}>
          {row.map((def, c) => (
            <Key key={def.id} def={def} lit={!!litKey && litKey[0] === r && litKey[1] === c} onPress={onPress} />
          ))}
        </div>
      ))}
    </div>
  );
}
