/**
 * Offline unless you choose: the four box drawings (design.md 4.4; MS-7.3, MS-7.4, MS-7.7, MS-7.10). Pictures, not
 * controls: aria-hidden, divs only, nothing focusable (MS-7.2). Each root is a data-play drawing that plays once
 * (A7); the base styles show the finished state (MS-7.5).
 *
 * Round 4 (2026-11-13, Claude Code; decisions §2 "Boxes"): one grammar for the section. A dashed outline is this
 * device (.site-bound, the boundary); a feature drawn on its edge is one way out; an arrow leaving it is data
 * leaving, labelled with what goes; a cloud marks where it goes. Nothing else crosses the line, and there are no
 * locks, shields or badges. The lead map shows what stays inside and the three ways out; each card opens one.
 *
 * - What model ranking sends is real text in the card (rankingSentText(), MS-4.6; an MS-7.2 exception), drawn at
 *   the top of the stage; the drawing holds an aria-hidden copy only to keep its room (RankingDoor's `sent`).
 * - No provider and no browser maker is named in a drawing (MS-4.8, MS-7.10): the card text names them. The Voices
 *   rows use the voice picker's label format and the Settings help text; no drawing says which voice is the default
 *   (pickVoice may choose an online voice).
 * - No class names a device (MS-4.3).
 */
import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { SiteIcon, cloud, toggle } from '../icons';
import { Arrow, ListenButton, Strip } from './Conversation';
import { play, role } from './roles';

/** This device: a dashed outline, its ways out on the top edge, what stays inside, and its name on the bottom edge. */
function Bound({ doors, children }: { doors: ReactNode; children?: ReactNode }) {
  return (
    <div className="site-bound">
      <div className="site-bound__doors">{doors}</div>
      {children}
      <span className="site-bound__label">This device</span>
    </div>
  );
}

/** A place outside this device, marked with a cloud (round 4). */
export function Dest({ children }: { children: ReactNode }) {
  return (
    <div className="site-dest">
      <SiteIcon d={cloud} />
      <span>{children}</span>
    </div>
  );
}

const KEPT = ['The dictionary', 'Saved phrases', 'My words'] as const;

/**
 * On your device (the section's lead): what you type, the dictionary, saved phrases and My words rise in inside the
 * outline (0-3), the offline status (4), then the three ways out on its edge as one group (5).
 */
export function DeviceMap({ sentence, keys }: { sentence: string; keys: string }) {
  return (
    <div className={`site-drawing site-map ${play('quick')}`} data-play="" aria-hidden="true">
      <Bound
        doors={
          <span className={`site-bound__ways ${role('in', 5)}`}>
            <span className="site-door">
              <SiteIcon d={toggle} />
              <span className="site-door__name">Model ranking</span>
            </span>
            <span className="site-door">
              <Icon name="voice" />
              <span className="site-door__name">Online voices</span>
            </span>
            <span className="site-door">
              <Icon name="mic" />
              <span className="site-door__name">Listen</span>
            </span>
          </span>
        }
      >
        <div className="site-bound__inside">
          <div className={`site-well ${role('rise', 0)}`}>
            <span className="site-well__text">{sentence}</span>
            <span className="site-well__keys">{keys}</span>
          </div>
          <ul className="site-bound__kept">
            {KEPT.map((text, i) => (
              <li key={text} className={role('rise', ([1, 2, 3] as const)[i]!)}>
                <Icon name="check" />
                {text}
              </li>
            ))}
          </ul>
          <span className={`site-bound__pill ${role('rise', 4)}`}>
            <Icon name="offline" />
            <span>Offline. Using your dictionary.</span>
          </span>
        </div>
      </Bound>
    </div>
  );
}

/**
 * Model ranking: the switch on the device's edge goes from Off to On (1; a line-strong outline marks the press, never
 * ember), and an arrow leaves the device (2) towards what is sent, which the card shows as real text above it. Off
 * is the default, said in words inside the outline. `sent` is that real text again, aria-hidden and invisible, only
 * so the drawing keeps the room the real text takes (it wraps the same way at every width).
 */
export function RankingDoor({ sent }: { sent: ReactNode }) {
  return (
    <div className={`site-drawing site-door-ranking ${play('quick')}`} data-play="" aria-hidden="true">
      <div className="site-sent site-sent--room">{sent}</div>
      <Arrow k={2} turn="up" />
      <Bound
        doors={
          <span className="site-door site-door--switch">
            <span className={`site-outline ${role('ring', 0, 1)}`} />
            <span className="site-cell">
              <span className={`site-door__row ${role('out', 1)}`}>
                <span className="site-toggle">
                  <span className="site-toggle__knob" />
                </span>
                Model ranking
                <span className="site-door__state">Off</span>
              </span>
              <span className={`site-door__row ${role('in', 1)}`}>
                <span className="site-toggle site-toggle--on">
                  <span className="site-toggle__knob" />
                </span>
                Model ranking
                <span className="site-door__state">On</span>
              </span>
            </span>
          </span>
        }
      >
        <span className="site-bound__note">Off until you turn it on</span>
      </Bound>
    </div>
  );
}

/**
 * Voices: the voice on this device keeps your words inside (1, its check and line); the online voice sits on the edge
 * and its text leaves for the browser maker's service (2, the arrow and its line). Settings help text wording (MS-7.10).
 */
export function VoiceDoor() {
  return (
    <div className={`site-drawing site-door-voices ${play('frame')}`} data-play="" aria-hidden="true">
      <Dest>The browser maker</Dest>
      <Arrow k={2} turn="up" label="The text" />
      <Bound
        doors={
          <span className="site-voice site-voice--out">
            <span className="site-voice__name">Voice (en, online)</span>
            <span className={`site-voice__line ${role('in', 2)}`}>Sends the text to the browser maker</span>
          </span>
        }
      >
        <span className="site-voice">
          <span className="site-voice__name">
            Voice (en, on this device)
            <span className={`site-voice__check ${role('mark', 1)}`}>
              <Icon name="check" />
            </span>
          </span>
          <span className={`site-voice__line ${role('in', 1)}`}>Keeps your words on the device</span>
        </span>
      </Bound>
    </div>
  );
}

/**
 * Listen: Listen on the device's edge is pressed (1) and reads Stop; the strip says it is listening (2); the other
 * person's voice goes out to the browser maker's service and text comes back (3); their line fills in (4); Listen
 * returns (5). At most three changes at one instant; last change 3,700 ms after the trigger in a third column.
 */
export function ListenDoor() {
  return (
    <div className={`site-drawing site-door-listen ${play('quick')}`} data-play="" aria-hidden="true">
      <Dest>The browser maker</Dest>
      <span className="site-arrows">
        <Arrow k={3} turn="up" label="Their voice" />
        <Arrow k={3} turn="down" label="Text" />
      </span>
      <Bound doors={<ListenButton back={5} />}>
        <Strip from={2} at={4} />
      </Bound>
    </div>
  );
}
