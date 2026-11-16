import { KEY_ROWS, type KeyDef } from '@/lib/keys';
import { Key } from './Key';

/**
 * design-system Keypad (nl-keypad): 12 keys on the moon bubble, fixed layout.
 * Scanning: the active row gets is-scanning, then the active key inside it gets is-lit.
 * A quick repeat press the accept delay did not count marks its key with is-ignored (web-ui Req 30.4).
 */
export function Keypad({
  onPress,
  scanRow = -1,
  litKey = null,
  ignoredKey = null,
}: {
  onPress: (def: KeyDef) => void;
  /** Row with the scan ring, or -1. */
  scanRow?: number;
  /** [row, cell] of the lit key, or null. */
  litKey?: readonly [number, number] | null;
  /** The key whose last press was not counted (a repeat inside the accept delay), or null. */
  ignoredKey?: string | null;
}) {
  return (
    <div className="nl-keypad" role="group" aria-label="Keypad">
      {KEY_ROWS.map((row, r) => (
        <div key={r} className={r === scanRow ? 'nl-keypad__row is-scanning' : 'nl-keypad__row'}>
          {row.map((def, c) => (
            <Key key={def.id} def={def} lit={!!litKey && litKey[0] === r && litKey[1] === c} ignored={ignoredKey === def.id} onPress={onPress} />
          ))}
        </div>
      ))}
    </div>
  );
}
