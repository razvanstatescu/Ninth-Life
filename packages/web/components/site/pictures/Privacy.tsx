/**
 * Offline unless you choose: the four box drawings (design.md 4.4; MS-7.3, MS-7.4, MS-7.7, MS-7.10).
 * Pictures, not controls: aria-hidden, divs only, nothing focusable (MS-7.2). Each root is a data-play
 * drawing that plays once (A7); the base styles show the finished state (MS-7.5).
 *
 * - The ranking drawing lists RANKING_SENT (what buildRequest sends), with no count and no provider
 *   name: the card names the provider through providerCopy() (MS-4.6, MS-7.10).
 * - No browser maker is named here; only the Listen card's text does (MS-4.8).
 * - No class names a device (MS-4.3): the boundary is site-boundary.
 */
import { Icon } from '@/components/Icon';
import { RANKING_SENT } from '@/lib/rankingProvider';
import { Strip } from './Conversation';
import { play, role, type KStep } from './roles';

const KEPT: readonly (readonly [string, KStep])[] = [
  ['What you type', 0],
  ['The dictionary', 1],
  ['Saved phrases', 2],
  ['My words', 3],
];

/** On your device: the four things that stay arrive inside the boundary, then the offline status. */
export function DeviceBoundary() {
  return (
    <div className={`site-drawing site-boundary ${play('frame')}`} data-play="" aria-hidden="true">
      <div className="site-boundary__box">
        <span className="site-boundary__label">This device</span>
        <ul className="site-boundary__rows">
          {KEPT.map(([text, k]) => (
            <li key={text} className={role('rise', k)}>
              <Icon name="check" />
              {text}
            </li>
          ))}
        </ul>
      </div>
      <div className={`site-boundary__pill ${role('rise', 4)}`}>
        <Icon name="offline" />
        <span>Offline. Using your dictionary.</span>
      </div>
    </div>
  );
}

const SENT: readonly (readonly [string, KStep])[] = [
  [RANKING_SENT[0], 2],
  [RANKING_SENT[1], 3],
  [RANKING_SENT[2], 4],
  [RANKING_SENT[3], 5],
];

/** A drawn toggle (a div, not a control); its state is also in the words beside it. */
function Toggle({ on }: { on: boolean }) {
  return (
    <span className={on ? 'site-toggle site-toggle--on' : 'site-toggle'}>
      <span className="site-toggle__knob" />
    </span>
  );
}

/** Model ranking: Off (the default) above On and what it sends; a line-strong outline steps from Off to On (V14). */
export function RankingSides() {
  return (
    <div className={`site-drawing site-ranking ${play('quick')}`} data-play="" aria-hidden="true">
      <div className="site-ranking__part">
        <span className={`site-outline ${role('ring', 0, 1)}`} />
        <span className="site-ranking__row">
          <Toggle on={false} />
          Off, the default
        </span>
        <span className="site-ranking__note">Ranked on this device</span>
      </div>
      <div className="site-ranking__part">
        <span className={`site-outline ${role('ring', 1, 6)}`} />
        <span className="site-ranking__row">
          <Toggle on />
          On. Sent to rank:
        </span>
        <ul className="site-ranking__sent">
          {SENT.map(([item, k]) => (
            <li key={item} className={role('rise', k)}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Voices: two rows in the voice picker's label format, with the Settings help text in the singular (V15). */
export function VoiceRows() {
  return (
    <div className={`site-drawing site-voices ${play('frame')}`} data-play="" aria-hidden="true">
      <div className="site-voices__row">
        <span className="site-voices__name">
          Voice (en, on this device)
          <span className={`site-voices__check ${role('mark', 1)}`}>
            <Icon name="check" />
          </span>
        </span>
        <span className={`site-voices__line ${role('in', 1)}`}>Keeps your words on the device</span>
      </div>
      <div className="site-voices__row">
        <span className="site-voices__name">Voice (en, online)</span>
        <span className={`site-voices__line ${role('in', 2)}`}>Sends the text to the browser maker</span>
      </div>
    </div>
  );
}

/**
 * Listen: someone presses Listen, it reads Stop while the status line says so in words, then the
 * other person's line is filled in and Listen returns (V16, accessibility rule 12). The status row is
 * reserved at rest, so it appears without moving anything.
 */
export function ListenStrip() {
  return (
    <div className={`site-drawing site-listen ${play('frame')}`} data-play="" aria-hidden="true">
      <Strip at={3} />
      <div className="nl-btn nl-btn--secondary site-drawn-btn">
        <div className={`site-press-ring ${role('ring', 1, 2)}`} />
        <span className="site-cell">
          <span className={`site-listen__label ${role('out', 2)}`}>
            <Icon name="mic" />
            Listen
          </span>
          <span className={`site-listen__label ${role('during', 2, 3)}`}>
            <Icon name="stop" />
            Stop
          </span>
          <span className={`site-listen__label ${role('in', 3)}`}>
            <Icon name="mic" />
            Listen
          </span>
        </span>
      </div>
      <span className={`site-listen__status ${role('during', 2, 3)}`}>Listening. Ask them to speak now.</span>
    </div>
  );
}
