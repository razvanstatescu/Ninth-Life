/**
 * Offline unless you choose: the map of this device (design.md 4.4; MS-7.3, MS-7.4, MS-7.7, MS-7.10). A picture, not
 * controls: aria-hidden, divs only, nothing focusable (MS-7.2). Each root is a data-play drawing that plays once
 * (A7); the base styles show the finished state (MS-7.5).
 *
 * Round 4 (2026-11-13; decisions §2 "Boxes"): one grammar for the section. A dashed outline is this
 * device (.site-bound, the boundary); a feature drawn on its edge is one way out; an arrow leaving it is data
 * leaving, labelled with what goes; a cloud marks where it goes. Nothing else crosses the line, and there are no
 * locks, shields or badges. The map shows what stays inside and the three ways out.
 *
 * Round 5 (2026-11-17): the three door drawings (Model ranking, Voices, Listen) are gone. Each repeated a way out the
 * map already draws, with its own outline and small print; the section now lists the three ways out as rows of text
 * (sections/Privacy.tsx).
 * - No provider and no browser maker is named in the drawing (MS-4.8, MS-7.10).
 * - No class names a device (MS-4.3).
 */
import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { SiteIcon, toggle } from '../icons';
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
