/**
 * The 12-key drawing for the website (marketing-site design.md "Drawings"). A picture, not a control:
 * aria-hidden, divs instead of buttons, nothing focusable (MS-7.2). The layout and digits are the
 * design system's fixed keypad (KEY_ROWS).
 *
 * The key size is an inline custom property on the .nl-keypad element. It must be inline: the app's
 * extra-large key setting (data-keysize="xl" on <html>) sets the size with a 0,2,0 selector in
 * components.css, and only an inline property beats it, so the drawings keep 64 to 84px keys whatever
 * the setting (MS-10.5, MS-10.8). No other file sets the size of a drawing.
 *
 * The hero's keypad is not a drawing since W4 (2026-11-12): KeypadDemo renders real buttons with the same
 * KeyFace and the same inline size. No 'use client' and no server-only import, so both can use this file.
 */
import type { CSSProperties } from 'react';
import { ALL_KEYS, KEY_ROWS, type KeyDef, type KeyId } from '@/lib/keys';
import { role, type KStep, type UStep } from './pictures/roles';

/** Key size for the How it works and Ways to type drawings. */
export const KEY_DRAWING_SIZE = '64px';
/** The larger drawn key (the Your view drawing's extra-large key). */
export const KEY_DRAWING_XL_SIZE = '84px';
/** The Touch drawing's true key sizes, the one exception to the 64-84px drawn keys (MS-10.8). */
export const TOUCH_MIN_SIZE = 'var(--key-min)';
export const TOUCH_XL_SIZE = 'var(--key-xl)';

export type KeyDrawingSize = typeof KEY_DRAWING_SIZE;
export type SingleKeySize = typeof KEY_DRAWING_SIZE | typeof KEY_DRAWING_XL_SIZE | typeof TOUCH_MIN_SIZE | typeof TOUCH_XL_SIZE;

/** A pressed ring on a drawn key, shown from step k until u; late: a repeated press (design.md 3.2). */
export interface KeyRing {
  key: KeyId;
  k: KStep;
  u: UStep;
  late?: 'late';
}

/** The rings inside one key: absolute overlays, so the key's layout never changes. */
function Rings({ id, rings }: { id: KeyId; rings?: readonly KeyRing[] }) {
  return (
    <>
      {rings
        ?.filter((ring) => ring.key === id)
        .map((ring, i) => <div key={i} className={`site-key-ring ${role('ring', ring.k, ring.u, ring.late)}`} />)}
    </>
  );
}

/** A key's face: the digit, then its letters or its word. Shared by the drawings and the hero's try-it keys (W4). */
export function KeyFace({ def }: { def: KeyDef }) {
  return (
    <>
      <span className="nl-key__digit">{def.digit}</span>{' '}
      {def.letters ? (
        <span className={def.letters.length > 3 ? 'nl-key__letters nl-key__letters--4' : 'nl-key__letters'}>{def.letters}</span>
      ) : (
        <span className="nl-key__word">{def.word}</span>
      )}
    </>
  );
}

export function KeypadPicture({
  size,
  pressed,
  className,
  rings,
  rows,
}: {
  size: KeyDrawingSize;
  /** The key drawn with the pressed ring. */
  pressed?: string;
  className?: string;
  /** Played pressed rings (A7); a key may hold several with different steps. */
  rings?: readonly KeyRing[];
  /** Only the first rows, a crop of the keypad on its panel (How step 1 draws rows 1 and 2, keys 1 to 6). */
  rows?: 2;
}) {
  const style = { '--nl-key': size } as CSSProperties;
  return (
    <div className={className ? `nl-keypad site-pad ${className}` : 'nl-keypad site-pad'} style={style} aria-hidden="true">
      {(rows ? KEY_ROWS.slice(0, rows) : KEY_ROWS).map((row, r) => (
        <div key={r} className="nl-keypad__row">
          {row.map((def) => {
            let cls = 'nl-key site-key';
            if (pressed === def.id) cls += ' is-pressed';
            return (
              <div key={def.id} className={cls}>
                <KeyFace def={def} />
                <Rings id={def.id} rings={rings} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * One drawn key on its own wrapper, outside .nl-keypad, with --nl-key inline on the wrapper, so the
 * app's key-size setting ([data-keysize="xl"] .nl-keypad) cannot reach it (MS-10.8).
 */
export function KeyPicture({
  id,
  size,
  rings,
  className,
}: {
  id: KeyId;
  size: SingleKeySize;
  rings?: readonly KeyRing[];
  className?: string;
}) {
  const def = ALL_KEYS.find((d) => d.id === id)!;
  const style = { '--nl-key': size } as CSSProperties;
  return (
    <div className="site-key-picture" style={style} aria-hidden="true">
      <div className={className ? `nl-key site-key ${className}` : 'nl-key site-key'}>
        <KeyFace def={def} />
        <Rings id={id} rings={rings} />
      </div>
    </div>
  );
}
