/**
 * The look of Act 2 in the second cut, as one reference shot (07-revision-v2.md V6; STYLE.md "Second cut").
 * The app's keypad standing on the dot floor, keys with thickness and a top-left light, the ninth key ember
 * with its spill, one light sweep, a camera that travels in depth and settles. Builders match this.
 *   npx tsx scripts/contact.ts StudioLab 0 179 30 out/lead/studio-lab.png --scale 0.5 --cols 3
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { At, World, useCamera } from './lib/camera';
import { EASE, ramp } from './lib/anim';
import { sec } from './timeline';
import { Keypad, keypadLayout } from './components/brand/Keypad';
import { ContactGlow, Floor, StudioGround } from './components/brand/Studio';
import { Super } from './components/type/Type';

const SIZE = 190;
const L = keypadLayout(SIZE);

export const StudioLab: React.FC = () => {
  const frame = useCurrentFrame();
  const { cam, vel } = useCamera([
    { f: 0, x: 0, y: -40, zoom: 1.5, rx: -14, ry: -18 },
    { f: sec(1.2), x: 0, y: 30, zoom: 0.92, rx: -8, ry: -8, ease: EASE.flight },
    { f: sec(3), x: 0, y: 30, zoom: 0.92, rx: -8, ry: -6 },
  ]);
  const press = (at: number) => ramp(frame, at, 4, 0, 1, EASE.linear) * ramp(frame, at + 8, 10, 1, 0);
  return (
    <>
      <StudioGround glow={{ x: 50, y: 38, r: 70, strength: 1 }} horizon={64} />
      <World cam={cam} vel={vel}>
        <Floor y={L.height / 2 + 14} />
        <ContactGlow x={0} y={L.height / 2 + 18} w={L.width * 1.3} />
        <At x={0} y={0}>
          <Keypad
            size={SIZE}
            depth={8}
            light={1}
            spillFrom="9"
            spill={0.14}
            sweep={ramp(frame, sec(1.6), sec(0.9), 0, 1, EASE.inOut)}
            keys={{
              '9': { lit: 1 },
              '4': { press: press(sec(2.2)), sink: press(sec(2.2)) },
            }}
          />
        </At>
      </World>
      <Super text="Nine big keys." at={sec(2.0)} x={1440} y={420} size={96} align="center" maxWidth={800} />
    </>
  );
};
