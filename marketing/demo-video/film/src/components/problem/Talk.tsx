/**
 * The other person's lines, on a back plane (TALK.z) in the same world as the person's side (research-v2/15, 6.1 A):
 * moon type in plain plum bubbles, left-aligned, veiled 15% (darker, never transparent), sharp because they are read.
 *
 * A stack of two slots, newest at the bottom. "What do you need?" opens in the bottom slot and drifts up one slot,
 * evenly, in the time it takes the person to answer nothing (time passing); "Tea?" opens in the slot it left; just
 * before "I'll get you tea." the stack makes room and the question leaves the top of the frame. At the fold the lines
 * go on up and out. Never voiced; never the app's UI (the app's own They said comes in s10).
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, ramp } from '../../lib/anim';
import { Crisp, Plane } from '../../lib/stage';
import { TALK, TALK_H, TALK_SLOT } from './layout';
import { TALK_AT, TALK_OPEN, TALK_OUT, TALK_PUSH } from './time';
import { Bubble } from './parts';

export const LINES = [
  { text: 'What do you need?', at: TALK_AT.question },
  { text: 'Tea?', at: TALK_AT.tea },
  { text: "I'll get you tea.", at: TALK_AT.getTea },
] as const;

/** World px per frame on the back plane: one slot between the question and "Tea?". */
export const DRIFT = TALK_SLOT / (TALK_AT.tea - TALK_AT.question);

/** World y of line i's top at a frame (on the back plane). */
export const lineTop = (i: number, frame: number) => {
  const l = LINES[i]!;
  // The stack moves up a slot; the question, in the top slot, goes on up and right out of the frame.
  const push = i < 2 ? TALK_SLOT * (i === 0 ? 2 : 1) * ramp(frame, TALK_PUSH.from, TALK_PUSH.dur, 0, 1, EASE.camera) : 0;
  const out = 1200 * ramp(frame, TALK_OUT.from, TALK_OUT.dur, 0, 1, EASE.in);
  return TALK.slot0 - DRIFT * (frame - l.at) - push - out;
};

/** px of the Crisp box (wider than any line). */
const BOX_W = 1100;

export const Talk: React.FC<{ rack: number }> = ({ rack }) => {
  const frame = useCurrentFrame();
  // In focus during the rack (n11): unveiled; veiled 15% otherwise.
  const veil = TALK.veil * (1 - rack);
  return (
    <>
      {LINES.map((l, i) => {
        if (frame < l.at) return null;
        // The question has left the frame once the stack has made room.
        if (i === 0 && frame >= TALK_PUSH.from + TALK_PUSH.dur) return null;
        if (frame >= TALK_OUT.from + TALK_OUT.dur) return null;
        const open = ramp(frame, l.at, TALK_OPEN, 0, 1, EASE.camera);
        return (
          <Plane key={l.text} x={TALK.left} y={lineTop(i, frame) + (1 - open) * 14} z={TALK.z}>
            <Crisp w={BOX_W} h={TALK_H}>
              <Bubble text={l.text} px={TALK.text} padX={TALK.padX} padY={TALK.padY} lineHeight={TALK.lineHeight} open={open} veil={veil} />
            </Crisp>
          </Plane>
        );
      })}
    </>
  );
};
