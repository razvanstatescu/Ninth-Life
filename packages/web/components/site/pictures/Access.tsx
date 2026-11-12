/**
 * Works the way you type: the five box drawings (design.md 4.4; MS-7.3, MS-7.4, MS-7.7, MS-10.8).
 * Pictures, not controls: aria-hidden, divs only, nothing focusable (MS-7.2). Each root is a data-play
 * drawing that plays once (A7); the base styles show the finished state (MS-7.5).
 *
 * - Drawn keypad keys keep 64 or 84px from the KeypadPicture constants, set inline. The Touch drawing
 *   is the one exception: its keys are the app's true 72 and 128px (MS-10.8).
 * - The drawn computer keys are the "Website drawings" element of design/system/README.md.
 * - Ember appears only as a pressed ring or the scan ring, one at a time (MS-7.3). The switch's press
 *   is a line-strong ring, so ember stays on the keypad.
 * - No device body: the layout boxes are bare boxes, and no class names a device (MS-4.3).
 */
import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import {
  KEY_DRAWING_SIZE,
  KEY_DRAWING_XL_SIZE,
  KeyPicture,
  KeypadPicture,
  TOUCH_MIN_SIZE,
  TOUCH_XL_SIZE,
  type KeyRing,
} from '../KeypadPicture';
import { play, role, type KStep, type Span } from './roles';

/** A drawn computer key, with its pressed ring from step k until u as an overlay. */
function Kbd({ children, ring, className }: { children: ReactNode; ring?: Span; className?: string }) {
  return (
    <span className={className ? `site-kbd ${className}` : 'site-kbd'}>
      {children}
      {ring ? <span className={`site-press-ring ${role('ring', ...ring)}`} /> : null}
    </span>
  );
}

/** Keyboard: each key is pressed in turn, the arrow pair together, at the quick step (0.4 s), so its rings
 *  end before Touch's start in the same row (review N7). */
export function KeyLegend() {
  return (
    <div className={`site-drawing site-keylegend ${play('quick')}`} data-play="" aria-hidden="true">
      <Kbd ring={[0, 1]}>4</Kbd>
      <span className="site-keylegend__what">types g h i</span>
      <Kbd ring={[1, 2]}>Enter</Kbd>
      <span className="site-keylegend__what">speaks</span>
      <Kbd ring={[2, 3]}>Backspace</Kbd>
      <span className="site-keylegend__what">goes back</span>
      <span className="site-kbd-pair">
        <Kbd className="site-kbd--up">
          <Icon name="back" />
        </Kbd>
        <Kbd className="site-kbd--down">
          <Icon name="back" />
        </Kbd>
        <span className={`site-press-ring ${role('ring', 3, 4)}`} />
      </span>
      <span className="site-keylegend__what">pick a sentence</span>
    </div>
  );
}

const TOUCH_MIN_RING: readonly KeyRing[] = [{ key: '2', k: 0, u: 1 }];
const TOUCH_XL_RING: readonly KeyRing[] = [{ key: '2', k: 1, u: 2 }];

/** Touch: key 2 at the app's smallest and largest sizes, each tapped once. */
export function TouchSizes() {
  return (
    <div className={`site-drawing site-touch ${play('frame')}`} data-play="" aria-hidden="true">
      <div className="site-touch__col">
        <KeyPicture id="2" size={TOUCH_MIN_SIZE} rings={TOUCH_MIN_RING} className="site-key--touch" />
        <span className="site-touch__px">72</span>
      </div>
      <div className="site-touch__col">
        <KeyPicture id="2" size={TOUCH_XL_SIZE} rings={TOUCH_XL_RING} className="site-key--touch" />
        <span className="site-touch__px">128</span>
      </div>
    </div>
  );
}

/**
 * One or two switches: rows 1, 2 and 3 are scanned, the switch picks row 3, then keys 7, 8 and 9 are
 * scanned and the switch picks 9. It rests with key 9 in the scan ring (the Keypad's is-scanning look).
 */
export function ScanPlay() {
  return (
    <div className={`site-drawing site-scan ${play('quick')}`} data-play="" aria-hidden="true">
      <div className="site-scan__pad">
        <KeypadPicture size={KEY_DRAWING_SIZE} />
        <div className="site-scan__rings">
          <div className={`site-scan__ring site-scan__ring--row1 ${role('ring', 0, 1)}`} />
          <div className={`site-scan__ring site-scan__ring--row2 ${role('ring', 1, 2)}`} />
          <div className={`site-scan__ring site-scan__ring--row3 ${role('ring', 2, 4)}`} />
          <div className={`site-scan__ring site-scan__ring--key7 ${role('ring', 4, 5)}`} />
          <div className={`site-scan__ring site-scan__ring--key8 ${role('ring', 5, 6)}`} />
          <div className={`site-scan__ring site-scan__ring--key9 ${role('mark', 6)}`} />
        </div>
      </div>
      <div className="site-scan__switch">
        <div className="site-scan__button">
          <Icon name="switch" />
          <div className={`site-scan__press ${role('ring', 3, 4)}`} />
          <div className={`site-scan__press ${role('ring', 6, 7)}`} />
        </div>
        <span className="site-scan__label">Switch</span>
      </div>
    </div>
  );
}

function ThemeHalf({ theme, label, roles }: { theme: 'night' | 'day'; label: string; roles?: string }) {
  return (
    <div className={roles ? `site-themes__half ${roles}` : 'site-themes__half'} data-theme={theme}>
      <span className="site-themes__label">{label}</span>
      <span className="site-themes__hi">Hi</span>
      <div className="site-cell site-themes__key">
        <span className={role('out', 2)}>
          <KeyPicture id="4" size={KEY_DRAWING_SIZE} />
        </span>
        <span className={role('in', 2)}>
          <KeyPicture id="4" size={KEY_DRAWING_XL_SIZE} />
        </span>
      </div>
    </div>
  );
}

/** Your view: the Day half joins the Night half, then both keys go from large to extra large (no size animation). */
export function ThemeHalves() {
  return (
    <div className={`site-drawing site-themes ${play('frame')}`} data-play="" aria-hidden="true">
      <div className="site-themes__halves">
        <ThemeHalf theme="night" label="Night" />
        <ThemeHalf theme="day" label="Day" roles={role('in', 1)} />
      </div>
      <div className="site-cell site-themes__size">
        <span className={role('out', 2)}>Large</span>
        <span className={role('in', 2)}>Extra large</span>
      </div>
    </div>
  );
}

const LAYOUTS: readonly (readonly ['upright' | 'landscape' | 'wide', string, KStep])[] = [
  ['upright', 'Phone', 0],
  ['landscape', 'Tablet', 1],
  ['wide', 'Laptop', 2],
];

/** Phones, tablets and laptops: three bare layout boxes arriving left to right (V12, V31). */
export function LayoutBoxes() {
  return (
    <div className={`site-drawing site-layouts ${play('frame')}`} data-play="" aria-hidden="true">
      {LAYOUTS.map(([shape, label, k]) => (
        <div key={shape} className={`site-layouts__col ${role('rise', k)}`}>
          <div className={`site-layouts__box site-layouts__box--${shape}`}>
            <span className="site-layouts__bar" />
            <span className="site-layouts__line" />
            <span className="site-layouts__line" />
            <span className="site-layouts__keys" />
            <span className="site-layouts__pills">
              <span />
              <span />
              <span />
            </span>
          </div>
          <span className="site-layouts__label">{label}</span>
        </div>
      ))}
    </div>
  );
}
