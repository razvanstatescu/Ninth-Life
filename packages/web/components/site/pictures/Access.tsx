/**
 * Works the way you type: the five box drawings (design.md 4.4; MS-7.3, MS-7.4, MS-7.7, MS-10.8). Pictures, not
 * controls: aria-hidden, divs only, nothing focusable (MS-7.2). Each root is a data-play drawing that plays once
 * (A7); the base styles show the finished state (MS-7.5).
 *
 * - Drawn keypad keys keep 64 or 84px from the KeypadPicture constants, set inline. The Touch drawing is the one
 *   exception: its keys are the app's true 72 and 128px (MS-10.8).
 * - Round 4 (2026-11-13, Claude Code): a loose key always sits on a key panel (.site-key-panel: --panel and --lift,
 *   as the app's keypad), so plum keys never meet a plum Night stage (the Touch keys and the Night half's key were
 *   invisible in Night). The switch drawing is the section's lead: the highlight steps over rows 1 and 2, the switch
 *   picks row 2, then key 4, and the key's word ("I", the demo's first word) appears in the sentence card.
 * - The drawn computer keys are the "Website drawings" element of design/system/README.md.
 * - Ember appears only as a pressed ring or the scan ring, one at a time (MS-7.3). The switch's press is a
 *   line-strong ring, so ember stays on the keypad.
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
import { SiteIcon, moon, sun } from '../icons';
import { play, role, type KStep, type Span } from './roles';

/** The switch drawing's example: the demo's first press (key 4) and the word it types ("I"), or digits only. */
export interface ScanExample {
  key: '4';
  /** The decoder's word for key 4, as the demo's chip writes it ("I"); null when the build had no dictionary. */
  word: string | null;
}

/** A drawn computer key, with its pressed ring from step k until u as an overlay. */
function Kbd({ children, ring, className }: { children: ReactNode; ring?: Span; className?: string }) {
  return (
    <span className={className ? `site-kbd ${className}` : 'site-kbd'}>
      {children}
      {ring ? <span className={`site-press-ring ${role('ring', ...ring)}`} /> : null}
    </span>
  );
}

/**
 * Keyboard: each key is pressed in turn at the quick step (0.4 s), and what it does appears as its ring goes (cause
 * leads, effect follows). Its rings end before Touch's start in the same row (review N7).
 */
export function KeyLegend() {
  return (
    <div className={`site-drawing site-keylegend ${play('quick')}`} data-play="" aria-hidden="true">
      <Kbd ring={[0, 1]}>4</Kbd>
      <span className={`site-keylegend__what ${role('in', 1)}`}>types g h i</span>
      <Kbd ring={[1, 2]}>Enter</Kbd>
      <span className={`site-keylegend__what ${role('in', 2)}`}>speaks</span>
      <Kbd ring={[2, 3]}>Backspace</Kbd>
      <span className={`site-keylegend__what ${role('in', 3)}`}>goes back</span>
      <span className="site-kbd-pair">
        <Kbd className="site-kbd--up">
          <Icon name="back" />
        </Kbd>
        <Kbd className="site-kbd--down">
          <Icon name="back" />
        </Kbd>
        <span className={`site-press-ring ${role('ring', 3, 4)}`} />
      </span>
      <span className={`site-keylegend__what ${role('in', 4)}`}>pick a sentence</span>
    </div>
  );
}

const TOUCH_MIN_RING: readonly KeyRing[] = [{ key: '2', k: 0, u: 1 }];
const TOUCH_XL_RING: readonly KeyRing[] = [{ key: '2', k: 1, u: 2 }];

/** Touch: key 2 at the app's smallest and largest sizes on one key panel, each tapped once, then its size shows. */
export function TouchSizes() {
  return (
    <div className={`site-drawing site-touch ${play('frame')}`} data-play="" aria-hidden="true">
      <div className="site-key-panel site-touch__keys">
        <KeyPicture id="2" size={TOUCH_MIN_SIZE} rings={TOUCH_MIN_RING} className="site-key--touch site-key--min" />
        <KeyPicture id="2" size={TOUCH_XL_SIZE} rings={TOUCH_XL_RING} className="site-key--touch" />
      </div>
      <div className="site-touch__sizes">
        <span className={role('in', 1)}>72</span>
        <span className={role('in', 2)}>128</span>
      </div>
    </div>
  );
}

/** One scan highlight on the drawn keypad's own grid: a row or one key. */
const SCAN: readonly (readonly ['row1' | 'row2' | 'key4', string])[] = [
  ['row1', role('ring', 0, 1)],
  ['row2', role('ring', 1, 3)],
  ['key4', role('mark', 3)],
];

/**
 * One or two switches (the section's lead): rows 1 and 2 are scanned, the switch picks row 2 (2), key 4 is scanned
 * (3), the switch picks it (4) and its word appears in the sentence card (5). It rests with key 4 in the scan ring
 * (the Keypad's is-scanning look) and the word shown: the before and the after (MS-7.5). The speed scale shows the
 * range the card states (0.4 to 5 seconds a step).
 */
export function ScanPlay({ example }: { example: ScanExample }) {
  return (
    <div className={`site-drawing site-scan ${play('quick')}`} data-play="" aria-hidden="true">
      <div className="site-scan__main">
        <div className="site-scan__well">
          <span className="site-cell">
            <span className={`site-well__hint ${role('out', 5)}`}>Press a key to start</span>
            <span className={`site-scan__typed ${role('in', 5)}`}>
              {example.word ? <span className="site-well__text">{example.word}</span> : null}
              <span className="site-well__keys">{example.key}</span>
            </span>
          </span>
        </div>
        <div className="site-scan__pad">
          <KeypadPicture size={KEY_DRAWING_SIZE} />
          <div className="site-scan__rings">
            {SCAN.map(([at, roles]) => (
              <div key={at} className={`site-scan__ring site-scan__ring--${at} ${roles}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="site-scan__side">
        <div className="site-scan__button">
          <Icon name="switch" />
          <div className={`site-scan__press ${role('ring', 2, 3)}`} />
          <div className={`site-scan__press ${role('ring', 4, 5)}`} />
        </div>
        <div className="site-scan__words">
          <span className="site-scan__label">Switch</span>
          <span className="site-speed">
            0.4 s<span className="site-speed__track" />5 s
          </span>
        </div>
      </div>
    </div>
  );
}

function ThemeHalf({ theme, label, grow, roles }: { theme: 'night' | 'day'; label: string; grow: 3 | 4; roles?: string }) {
  return (
    <div className={roles ? `site-themes__half ${roles}` : 'site-themes__half'} data-theme={theme}>
      <span className="site-themes__label">
        <SiteIcon d={theme === 'night' ? moon : sun} />
        {label}
      </span>
      <span className="site-themes__hi">Hi</span>
      <div className="site-key-panel site-cell site-themes__key">
        <span className={role('out', grow)}>
          <KeyPicture id="4" size={KEY_DRAWING_SIZE} />
        </span>
        <span className={role('in', grow)}>
          <KeyPicture id="4" size={KEY_DRAWING_XL_SIZE} />
        </span>
      </div>
    </div>
  );
}

/**
 * Your view: the Day half joins the Night half (1), the key size goes from Large to Extra large (2), and the key in
 * each half follows (3, 4), so no instant holds more than three changes (no size animation: two drawn keys swap).
 */
export function ThemeHalves() {
  return (
    <div className={`site-drawing site-themes ${play('frame')}`} data-play="" aria-hidden="true">
      <div className="site-themes__halves">
        <ThemeHalf theme="night" label="Night" grow={3} />
        <ThemeHalf theme="day" label="Day" grow={4} roles={role('in', 1)} />
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
