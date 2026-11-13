/**
 * The person's side of the conversation, in WORLD space inside the <Studio> (lib/stage):
 *  - the reply field, a plum slab floating over the grid (what is typed, a steady caret);
 *  - the grey chip: it rises from behind the field's top edge on "language", offers "I need tea", writes it into the
 *    field on "put" and sinks back behind it (n12);
 *  - a plain grid of the 26 letters in slab cells (the brand key at 88 px), floating just above the floor;
 *  - n09: a fingertip comes in from below, hovers over I (its shadow on the cells), comes down between I and J: J
 *    registers and sinks, then it is deleted;
 *  - n10: one switch, a dome standing on the floor, comes on; the ember highlight steps one cell per beat, A to I, and
 *    the switch picks I.
 * During n11's rack focus everything here defocuses and darkens a little (lib/stage DepthBlur, never a fade). At the
 * fold the cells are Fold.tsx's; the field steps back behind the arriving keypad, darkening.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C } from '../../tokens';
import { EASE, jump, mix, ramp } from '../../lib/anim';
import { EIGHTH, sec } from '../../timeline';
import { DepthBlur, Plane, Slab } from '../../lib/stage';
import { CELL, CELL_DEPTH, CHIP, CHIP_HIDE, CHIP_REST, FIELD, FLOOR_Y, KEY_OF, LAND, LETTERS, SWITCH, SWITCH_H, TOUCH, cellAt, indexOf } from './layout';
import {
  CHIP_RISE,
  CHIP_T,
  FIELD_BACK,
  FOLD,
  SCAN_STEPS,
  SELECT,
  SWITCH_GONE,
  SWITCH_IN,
  TOUCH_T,
  scanStep,
} from './time';
import { CellBody, ChipFace, FieldFace, GREY, Ring, SLAB_SIDE, SLAB_SIDE_LIT, SwitchBody, capTop, tint } from './parts';

const SUGGESTION = 'I need tea';
const TYPED = 'I';

/** 0..1: the ember highlight on letter i (A..I, one per beat; it rests on I). */
export const scanLit = (frame: number, i: number) => {
  if (i >= SCAN_STEPS) return 0;
  const on = jump(frame, scanStep(i));
  const off = i < SCAN_STEPS - 1 ? jump(frame, scanStep(i + 1)) : 0;
  return on * (1 - off);
};

/** Where the fingertip is (world px; z above the cells' caps) and how far it is pressed. */
const fingertip = (frame: number) => {
  const I = cellAt(indexOf(TOUCH.target));
  const J = cellAt(indexOf(TOUCH.hit));
  const land = { x: mix(I.x, J.x, TOUCH.landAt), y: I.y };
  const come = ramp(frame, TOUCH_T.enter, TOUCH_T.hover - TOUCH_T.enter, 0, 1, EASE.camera);
  const down = ramp(frame, TOUCH_T.hover, TOUCH_T.tap - TOUCH_T.hover, 0, 1, EASE.in);
  const up = ramp(frame, TOUCH_T.lift, sec(0.13), 0, 1, EASE.out);
  const away = ramp(frame, TOUCH_T.lift + sec(0.05), TOUCH_T.gone - TOUCH_T.lift - sec(0.05), 0, 1, EASE.in);
  const x = land.x + TOUCH.from.dx * (1 - come) + (TOUCH.from.dx + 40) * away;
  const y = land.y + TOUCH.from.dy * (1 - come) + (TOUCH.from.dy + 60) * away;
  const h = TOUCH.hover * (1 - down * (1 - up));
  const press = ramp(frame, TOUCH_T.tap, sec(0.05), 0, 1, EASE.linear) * (1 - up);
  return { x, y, h, press, on: frame >= TOUCH_T.enter && frame < TOUCH_T.gone };
};

export const Side: React.FC<{ rack: number; crisp: number }> = ({ rack, crisp }) => {
  const frame = useCurrentFrame();
  /** Defocus and a little darkening while the focus is on the conversation (n11). */
  const soft = (z: number, box: { x: number; y: number; w: number; h: number }, node: React.ReactNode) =>
    rack > 0 ? (
      <DepthBlur z={z} box={box} dim={0.18 * rack}>
        {node}
      </DepthBlur>
    ) : (
      node
    );

  // ---- the reply -------------------------------------------------------------------------------------
  let text = '';
  if (frame >= TOUCH_T.tap && frame < TOUCH_T.del) text = TOUCH.hit;
  if (frame >= SELECT) text = TYPED;
  const insert = ramp(frame, CHIP_T.write, sec(0.15), 0, 1, EASE.camera);
  const inserted = frame >= CHIP_T.write ? SUGGESTION.slice(TYPED.length) : '';
  // At the fold the field steps back behind the arriving keypad, darkening (never fading).
  const back = ramp(frame, FIELD_BACK.from, FIELD_BACK.dur, 0, 1, EASE.in);
  const fieldZ = -90 * back;

  // ---- the chip: rises from behind the field's top edge, writes, sinks back -------------------------------
  const rise = ramp(frame, CHIP_T.in - CHIP_RISE / 2, CHIP_RISE, 0, 1, EASE.camera);
  const sink = ramp(frame, CHIP_T.write + sec(0.08), sec(0.2), 0, 1, EASE.in);
  const chipUp = rise * (1 - sink);
  const accept = ramp(frame, CHIP_T.write - sec(0.05), sec(0.05), 0, 1, EASE.linear) * (1 - sink);

  // ---- the fingertip and the miss ---------------------------------------------------------------------------
  const tip = fingertip(frame);
  const hitAt = TOUCH_T.tap;
  const hitFlash = jump(frame, hitAt) * (1 - jump(frame, hitAt + EIGHTH));
  const hitSink = ramp(frame, hitAt, 3, 0, 1, EASE.linear) * ramp(frame, hitAt + EIGHTH, sec(0.15), 1, 0, EASE.out);
  const capZ = capTop(CELL, CELL_DEPTH);

  // ---- one switch -------------------------------------------------------------------------------------------
  const on = ramp(frame, SWITCH_IN, sec(0.13), 0, 1, EASE.out);
  const press = ramp(frame, SELECT, 3, 0, 1, EASE.linear) * ramp(frame, SELECT + EIGHTH, sec(0.15), 1, 0, EASE.out);
  const selSink = press;

  return (
    <>
      {/* The chip first: it is behind the field (its plane further back), whose face hides its lower edge. */}
      {chipUp > 0 && frame < FOLD ? (
        <Plane x={CHIP_REST.left} y={CHIP_REST.top + (1 - chipUp) * CHIP_HIDE} z={CHIP.z}>
          <Slab
            w={CHIP.w}
            h={CHIP.h}
            r={CHIP.r}
            depth={CHIP.depth}
            crisp={crisp}
            layers={5}
            face={GREY.face}
            side={GREY.side}
            sideLit={GREY.sideLit}
            border={{ width: 3, color: tint(GREY.rim, GREY.rimAccept, accept) }}
          >
            <ChipFace w={CHIP.w} h={CHIP.h} px={CHIP.text} text={SUGGESTION} />
          </Slab>
        </Plane>
      ) : null}

      <Plane x={FIELD.left} y={FIELD.top} z={fieldZ}>
        {soft(
          fieldZ,
          { x: 0, y: 0, w: FIELD.w, h: FIELD.h },
          <Slab
            w={FIELD.w}
            h={FIELD.h}
            r={FIELD.r}
            depth={FIELD.depth}
            crisp={crisp}
            face={C.surface}
            side={tint(SLAB_SIDE, C.night, 0.55 * back)}
            sideLit={tint(SLAB_SIDE_LIT, C.night, 0.55 * back)}
            border={{ width: 3, color: C.lineStrong }}
          >
            <FieldFace w={FIELD.w} h={FIELD.h} text={text} padX={FIELD.padX} px={FIELD.text} inserted={inserted} insert={insert} caret={inserted && insert < 1 ? 0 : 1} />
            {/* The veil: the face darkens towards night as it steps back (opaque all the way). */}
            {back > 0 ? <div style={{ position: 'absolute', inset: 0, borderRadius: FIELD.r, background: `rgba(20,10,46,${0.55 * back})` }} /> : null}
          </Slab>,
        )}
      </Plane>

      {/* The grid: drawn here until the fold takes the cells. */}
      {frame < FOLD
        ? LETTERS.map((ch, i) => {
            const c = cellAt(i);
            const isHit = ch === TOUCH.hit;
            const isSel = ch === TYPED;
            // The fingertip's shadow on the cap: below and right of it (key light top left, in front), softer and
            // further away the higher it is.
            const shade =
              tip.on && (ch === TOUCH.target || isHit)
                ? {
                    x: tip.x + tip.h * 0.18 - (c.x - CELL / 2),
                    y: tip.y + tip.h * 0.42 - (c.y - CELL / 2),
                    r: (TOUCH.size / 2) * (1 + tip.h / 220),
                    a: 0.5 / (1 + tip.h / 70),
                  }
                : null;
            return (
              <Plane key={ch} x={c.x - CELL / 2} y={c.y - CELL / 2}>
                {soft(
                  0,
                  { x: 0, y: 0, w: CELL, h: CELL },
                  <CellBody
                    id={KEY_OF[ch]!}
                    letter={ch}
                    size={CELL}
                    depth={CELL_DEPTH}
                    light={LAND.light}
                    lit={scanLit(frame, i)}
                    sink={isHit ? hitSink : isSel ? selSink : 0}
                    rim={1}
                    flash={isHit ? hitFlash : 0}
                    shade={shade}
                    crisp={crisp}
                  />,
                )}
              </Plane>
            );
          })
        : null}

      {/* One switch, standing on the floor; it leaves the scene below the frame in n12. */}
      {frame < SWITCH_GONE ? (
        <Plane x={SWITCH.x - SWITCH.w / 2} y={FLOOR_Y - SWITCH_H}>
          {soft(
            0,
            { x: 0, y: 0, w: SWITCH.w, h: SWITCH_H },
            <SwitchBody w={SWITCH.w} baseH={SWITCH.baseH} domeW={SWITCH.domeW} domeH={SWITCH.domeH} on={on} press={press} />,
          )}
        </Plane>
      ) : null}

      {/* The fingertip, in front of the cells. */}
      {tip.on ? (
        <Plane x={tip.x - TOUCH.size / 2} y={tip.y - TOUCH.size / 2} z={capZ + 1 + tip.h}>
          <Ring size={TOUCH.size} down={tip.press} />
        </Plane>
      ) : null}
    </>
  );
};
