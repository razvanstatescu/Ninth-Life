/**
 * Lab: a short reference sequence that exercises the shared parts (camera, keypad, cards, chips, type).
 * Not part of the film. Builders can copy patterns from here.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from './tokens';
import { BEAT, EIGHTH, sec } from './timeline';
import { World, At, useCamera } from './lib/camera';
import { Keypad, keyCenter, keyIdOf, type KeyId } from './components/brand/Keypad';
import { SentenceCard, Candidate, ProofChip, SpeakButton } from './components/brand/Parts';
import { AppIcon, NightGround, DotField } from './components/brand/Logo';
import { Super } from './components/type/Type';
import { jump } from './lib/anim';
import decoded from './data/decoded.json';

const SIZE = 128;
const PAD_X = -380;
const PAD_Y = 40;

export const Lab: React.FC = () => {
  const frame = useCurrentFrame();
  const s = decoded.sentences['hello-again'];
  const t0 = sec(1);
  // One press per eighth note from t0.
  const pressAt = s.presses.map((_, i) => t0 + i * EIGHTH);
  const pressed = pressAt.filter((f) => frame >= f).length; // presses done
  const lastKey = pressed > 0 ? keyIdOf(s.presses[pressed - 1]!) : undefined;
  const lastAt = pressed > 0 ? pressAt[pressed - 1]! : 0;
  const step = pressed > 0 ? s.steps[pressed - 1]! : undefined;

  const keys: Partial<Record<KeyId, { press?: number }>> = {};
  if (lastKey && frame - lastAt < EIGHTH) keys[lastKey] = { press: jump(frame, lastAt) };

  // Camera: wide, then step to each pressed key, then whip to the card.
  const camKeys = [
    { f: 0, x: -100, y: 0, zoom: 0.9 },
    { f: t0 - 12, x: -100, y: 0, zoom: 0.9 },
    ...pressAt.flatMap((f, i) => {
      const c = keyCenter(keyIdOf(s.presses[i]!), SIZE);
      return [{ f: f - 6, zoom: 1.7, x: PAD_X + c.x * 0.6, y: PAD_Y + c.y * 0.6 }, { f: f + 8 }];
    }),
    { f: t0 + pressAt.length * EIGHTH + 4, x: 330, y: -150, zoom: 1.35 },
    { f: t0 + pressAt.length * EIGHTH + 4 + BEAT * 2 },
  ];
  const { cam, vel } = useCamera(camKeys);

  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <NightGround glow={{ x: 50, y: 45, r: 60, strength: 0.9 }} />
      <World cam={cam} vel={vel}>
        <DotField opacity={0.8} />
        <At x={PAD_X} y={PAD_Y}>
          <Keypad size={SIZE} keys={keys} />
        </At>
        <At x={330} y={-150}>
          <SentenceCard text={step?.text ?? ''} digits={step?.codes.join(' ') ?? ''} width={720} caret />
        </At>
        <At x={330} y={60}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {s.candidates.map((c, i) => (
              <Candidate key={c} rank={i + 1} text={c} selected={0} width={600} />
            ))}
          </div>
        </At>
        <At x={330} y={300}>
          <div style={{ display: 'flex', gap: 12 }}>
            <ProofChip word="Hello" code="43556" kind="match" />
            <ProofChip word="again" code="24246" kind="match" />
            <ProofChip word="wafer" code="92337" kind="reject" />
          </div>
        </At>
        <At x={330} y={430}>
          <SpeakButton />
        </At>
        <At x={-1100} y={-200}>
          <AppIcon size={360} />
        </At>
      </World>
      <Super text="One press per letter." at={sec(0.2)} out={sec(0.95)} size={88} y={140} />
    </AbsoluteFill>
  );
};
