/**
 * The fold (bar 17 beat 4 to bar 18 beat 1, the narrator silent), in WORLD space on s10's rig (research-v2/15, 6.1 A;
 * research-v2/12, the fold).
 *
 * The 26 cells lift into their own depth lanes (+80 to +240 by the keypad row they go to; no two share a lane, so
 * they cross in depth instead of clumping), travel and land:
 *  - the ember cell ("I", under the scan highlight) flies first, growing and turning into key 4's place: it is key 4;
 *  - the keypad grows out of it (the brand slab keypad, turned and standing as s10's, scaled about key 4);
 *  - every other cell flies to its key: its body shrinks away and its letter settles where the key's legend has it.
 * The digits come up and the ember's light falls on its neighbours as the last letters land. Everything has arrived on
 * SETTLED; the next frame (LAST) is drawn by S09 with s10's own landing parts, so the cut is exact.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, FONT } from '../../tokens';
import { EASE, mix, ramp } from '../../lib/anim';
import { Crisp, Plane } from '../../lib/stage';
import { KEY_ROWS, Keypad, type KeyId, type KeyState } from '../brand/Keypad';
import decoded from '../../data/decoded.json';
import { CAP_Z, CELL, CELL_DEPTH, KEY_OF, LAND, LETTERS, LETTER_KEYS, PAD, cellAt, keyLocal, padToWorld } from './layout';
import { CELL_FLIGHT, DIGITS_IN, EMBER_FLIGHT, GROW, SCAN_STEPS, SPILL_IN } from './time';
import { CellBody, capTop } from './parts';
import { legendSize, type Glyphs } from './glyphs';

const LEGEND: Record<string, string> = Object.fromEntries(decoded.keypad.keys.map((k) => [k.id, k.letters]));
/** The letter under the highlight when the fold starts (A..I: the ninth). */
const EMBER_LETTER = LETTERS[SCAN_STEPS - 1]!;
const K4 = keyLocal(LAND.ember);
/** The ember key's base centre, landed (world). */
const P4 = padToWorld({ x: K4.x, y: K4.y, z: 0 });
const KS = LAND.key / 96;
/** The legend's glyphs sit 2k below the key's centre (Keypad.tsx: paddingTop 4k in a centred grid). */
const LEGEND_DY = 2 * KS;
/**
 * Letters ride in front of the caps. They stay parallel to the frame (no element turns on its own), so on the turned
 * keypad they sit far enough in front for a glyph's half width x tan(turn) never to reach the cap.
 */
const ON_CAP = 4;
/** The keypad starts this small (scale about key 4) and grows out from under the ember key. */
const GROW_FROM = 0.2;

const rowOf = (id: KeyId) => KEY_ROWS.findIndex((r) => r.includes(id));
const dist = (id: KeyId) => Math.hypot(keyLocal(id).x - K4.x, keyLocal(id).y - K4.y);
/** The other key groups leave nearest to the ember key first; the ember key's own other letters lead. */
const GROUPS: KeyId[] = [LAND.ember, ...LETTER_KEYS.filter((id) => id !== LAND.ember).sort((a, b) => dist(a) - dist(b))];
/** One lane per cell, +80 to +240, by destination row (then alphabet). */
const RANKED = [...LETTERS].sort((a, b) => rowOf(KEY_OF[a]!) - rowOf(KEY_OF[b]!) || LETTERS.indexOf(a) - LETTERS.indexOf(b));
const LANE: Record<string, number> = Object.fromEntries(RANKED.map((ch, r) => [ch, 80 + (160 * r) / (RANKED.length - 1)]));

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** 0..1 linear progress of letter ch's flight. */
const flightU = (frame: number, ch: string) => {
  if (ch === EMBER_LETTER) return clamp01((frame - EMBER_FLIGHT.from) / EMBER_FLIGHT.dur);
  const j = GROUPS.indexOf(KEY_OF[ch]!);
  return clamp01((frame - (CELL_FLIGHT.from + j)) / CELL_FLIGHT.dur);
};
/** Out to the lane quickly, along it, and down onto the key at the end. */
const bump = (u: number) => EASE.out(Math.min(1, u / 0.3)) * (1 - EASE.inOut(clamp01((u - 0.55) / 0.45)));

/** The keypad's scale about key 4 at a frame (0 = not there yet). */
export const growScale = (frame: number) => (frame < GROW.from ? 0 : mix(GROW_FROM, 1, ramp(frame, GROW.from, GROW.dur, 0, 1, EASE.camera)));

/** A point on the growing keypad (panel px, before the turn) in world px. */
const onPad = (q: { x: number; y: number; z: number }, s: number) => padToWorld({ x: K4.x + s * (q.x - K4.x), y: K4.y + s * (q.y - K4.y), z: s * q.z });

/**
 * Content centred on world point p; `turned` gives it the keypad's turn (rotateY about its own vertical axis), so it
 * is parallel to the landed keypad. Only two orientations exist in the fold: the frame's and the keypad's.
 */
const Centred: React.FC<{ p: { x: number; y: number; z: number }; turned?: boolean; w: number; h: number; children: React.ReactNode }> = ({ p, turned, w, h, children }) => (
  <Plane x={p.x} y={p.y} z={p.z}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d', transform: turned ? `rotateY(${LAND.turn}deg)` : undefined }}>
      <div style={{ position: 'absolute', left: -w / 2, top: -h / 2, transformStyle: 'preserve-3d' }}>{children}</div>
    </div>
  </Plane>
);

export const Fold: React.FC<{ glyphs: Glyphs | null }> = ({ glyphs }) => {
  const frame = useCurrentFrame();
  const s = growScale(frame);
  const digits = ramp(frame, DIGITS_IN.from, DIGITS_IN.dur, 0, 1, EASE.out);
  const spill = LAND.spill * ramp(frame, SPILL_IN.from, SPILL_IN.dur, 0, 1, EASE.out);
  const glyph = (ch: string) => glyphs?.[ch] ?? { x: 0, size: legendSize(LEGEND[KEY_OF[ch]!]!, LAND.key) };

  // ---- the ember cell: it becomes key 4 --------------------------------------------------------------------
  const eu = flightU(frame, EMBER_LETTER);
  const et = EASE.flight(eu);
  const eFrom = cellAt(LETTERS.indexOf(EMBER_LETTER));
  const eSize = mix(CELL, LAND.key, et);
  const eDepth = mix(CELL_DEPTH, LAND.depth, et);
  const eCentre = { x: mix(eFrom.x, P4.x, et), y: mix(eFrom.y, P4.y, et), z: mix(0, P4.z, et) + LANE[EMBER_LETTER]! * bump(eu) };
  const eGlyph = glyph(EMBER_LETTER);

  // ---- the other cells: bodies and letters ---------------------------------------------------------------------
  const cells = LETTERS.filter((ch) => ch !== EMBER_LETTER).map((ch) => {
    const u = flightU(frame, ch);
    const t = EASE.flight(u);
    const id = KEY_OF[ch]!;
    const from = cellAt(LETTERS.indexOf(ch));
    const g = glyph(ch);
    const q = { x: keyLocal(id).x + g.x, y: keyLocal(id).y + LEGEND_DY, z: CAP_Z + ON_CAP };
    // Each letter aims at its final place; only as it lands does it take the keypad's last bit of growth (on the
    // ember key it lands on the ember cell, which is already full size).
    const ride = id === LAND.ember ? 1 : mix(1, Math.max(s, GROW_FROM), t ** 4);
    const to = onPad(q, ride);
    const cellCap = capTop(CELL, CELL_DEPTH);
    const p = { x: mix(from.x, to.x, t), y: mix(from.y, to.y, t), z: mix(cellCap + ON_CAP, to.z, t) + LANE[ch]! * bump(u) };
    const bodySize = CELL * (1 - EASE.in(clamp01((u - 0.3) / 0.6)));
    const px = mix(CELL * 0.5, g.size * ride, t);
    const onEmber = id === LAND.ember && u > 0.85;
    return { ch, id, u, t, p, bodySize, px, onEmber };
  });

  const growKeys: Partial<Record<KeyId, KeyState>> = {};
  for (const id of LETTER_KEYS) growKeys[id] = id === LAND.ember ? { appear: 0 } : { legend: 0 };

  return (
    <>
      {/* The keypad, growing out from under the ember key (turned and standing as s10's). */}
      {s > 0 ? (
        <Plane x={P4.x} y={P4.y} z={P4.z}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              transformStyle: 'preserve-3d',
              transform: `rotateY(${LAND.turn}deg) scale3d(${s}, ${s}, ${s}) translate(${-K4.x}px, ${-K4.y}px)`,
            }}
          >
            <div style={{ position: 'absolute', left: -PAD.width / 2, top: -PAD.height / 2, transformStyle: 'preserve-3d' }}>
              <Keypad size={LAND.key} depth={LAND.depth} light={LAND.light} body="slab" keys={growKeys} spillFrom={spill > 0 ? LAND.ember : undefined} spill={spill} />
              {/* The letter keys' digits come up as the letters land (the brand legend draws them after the cut). */}
              {digits > 0
                ? LETTER_KEYS.filter((id) => id !== LAND.ember).map((id) => {
                    const c = keyLocal(id);
                    return (
                      <div
                        key={`d${id}`}
                        style={{
                          position: 'absolute',
                          left: PAD.width / 2 + c.x - LAND.key / 2 + 12 * KS,
                          top: PAD.height / 2 + c.y - LAND.key / 2 + 9 * KS,
                          transform: `translateZ(${CAP_Z + ON_CAP}px)`,
                          fontFamily: FONT.mono,
                          fontSize: 15 * KS,
                          lineHeight: `${16 * KS}px`,
                          fontWeight: 500,
                          color: C.onKey,
                          opacity: digits,
                        }}
                      >
                        {id}
                      </div>
                    );
                  })
                : null}
            </div>
          </div>
        </Plane>
      ) : null}

      {/* The ember cell, becoming key 4 (it takes the keypad's turn as it lifts off): it keeps its fill all the way;
          its own letter moves to its legend place. */}
      <Centred p={eCentre} turned w={eSize} h={eSize}>
        <CellBody
          id={LAND.ember}
          letter={EMBER_LETTER}
          size={eSize}
          depth={eDepth}
          light={LAND.light}
          lit={1}
          rim={0}
          letterPx={mix(CELL * 0.5, eGlyph.size, et)}
          letterDx={eGlyph.x * et}
          letterDy={LEGEND_DY * et}
          digit={digits}
          crisp={eu < 0.5 ? 2 : 1}
        />
      </Centred>

      {/* The other cells' bodies, shrinking away under their letters. */}
      {cells.map((c) =>
        c.bodySize > 2 ? (
          <Centred key={`b${c.ch}`} p={{ ...c.p, z: c.p.z - capTop(c.bodySize, CELL_DEPTH) - ON_CAP }} w={c.bodySize} h={c.bodySize}>
            <CellBody id={c.id} letter={c.ch} size={c.bodySize} depth={CELL_DEPTH} light={LAND.light} rim={1 - c.t} showLetter={false} crisp={1} />
          </Centred>
        ) : null,
      )}

      {/* The letters, each settling where its key's legend has it. */}
      {cells.map((c) => {
        const box = Math.ceil(c.px * 1.6);
        return (
          <Centred key={`l${c.ch}`} p={c.p} w={box} h={box}>
            <Crisp w={box} h={box} factor={c.u < 0.5 ? 2 : 1}>
              <div
                style={{
                  position: 'absolute',
                  left: box / 2,
                  top: box / 2,
                  translate: '-50% -50%',
                  fontFamily: FONT.sans,
                  fontWeight: 700,
                  fontSize: c.px,
                  lineHeight: 1,
                  color: c.onEmber ? C.onEmber : C.onKey,
                  whiteSpace: 'pre',
                }}
              >
                {c.ch}
              </div>
            </Crisp>
          </Centred>
        );
      })}
    </>
  );
};
