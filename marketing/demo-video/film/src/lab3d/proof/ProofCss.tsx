/**
 * Spatial lab: s11's proof shot rebuilt in disciplined CSS 2.5D on the production API (lib/stage, lib/camera), the
 * reference for the builders (STYLE.md "Spatial rules"; research-v2/16-spatial-tech.md, section 3).
 *
 * - One shared plane and one shared turn (the camera's); every object's back is on z = 0, its thickness real (<Slab>).
 * - A long lens (5200 px, lens zoom: the perspective does not change as the camera pushes in).
 * - The floor is level, in its own pass: it vanishes on the camera's eye level, the haze sits on that line, and it can
 *   never cut or print over an object. Soft shadows lie on it. The far floor is defocused in screen space.
 * - The card's teeth are part of its silhouette (one path, one stroke): nothing is clipped.
 * - The struck card recedes in depth: it darkens and defocuses (circle of confusion from the lens), never turns translucent.
 */
import React from 'react';
import { interpolateColors, useCurrentFrame } from 'remotion';
import { C, FONT } from '../../tokens';
import { Icon } from '../../components/brand/Icon';
import { CastShadow, DepthBlur, GroundShadow, Plane, Slab, Studio } from '../../lib/stage';
import {
  CARD,
  CARD_IN,
  CHIP,
  FLOOR_Y,
  KEY,
  KEYS,
  KS,
  LEGEND,
  REJECT,
  TEETH,
  cardPath,
  camAt,
  keyX,
  stateAt,
  toothCentre,
  toothPath,
} from './shot';

const MATCH_FILL = '#2a2f54';
const KEY_SIDE = '#170c34';
const KEY_SIDE_LIT = '#3a2672';
const dimmed = (c: string, a: number) => (a <= 0 ? c : interpolateColors(a, [0, 1], [c, C.night]));

const Key: React.FC<{ digit: string; dim: number; ring: { amount: number; fit: boolean } }> = ({ digit, dim, ring }) => {
  const k = KS / 96;
  return (
    <Slab w={KS} h={KS} r={KEY.r} depth={KEY.depth} layers={8} face={dimmed(C.key, dim)} side={dimmed(KEY_SIDE, dim)} sideLit={dimmed(KEY_SIDE_LIT, dim)}>
      {/* the key light on the cap (top left), as the film's keys */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: KEY.r, background: `linear-gradient(160deg, rgba(238,232,255,${0.15 * (1 - dim)}) 0%, rgba(238,232,255,0) 46%)`, boxShadow: `inset 0 ${2 * k}px 0 rgba(238,232,255,${0.14 * (1 - dim)})` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: dimmed(C.onKey, dim * 0.8) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 46 * k, lineHeight: 1, fontWeight: 500 }}>{digit}</div>
        <div style={{ fontFamily: FONT.sans, fontSize: 15 * k, lineHeight: 1, fontWeight: 700, letterSpacing: '0.08em', marginTop: 8 * k, opacity: 0.85 }}>{LEGEND[digit]}</div>
      </div>
      {ring.amount > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: -12,
            borderRadius: KEY.r + 12,
            border: `8px ${ring.fit ? 'solid' : 'dashed'} ${ring.fit ? C.proofMatch : C.proofReject}`,
            opacity: ring.amount,
          }}
        />
      ) : null}
    </Slab>
  );
};

const WaterChip: React.FC = () => (
  <Slab w={CHIP.w} h={CHIP.h} r={CHIP.r} depth={CHIP.depth} layers={5} face={MATCH_FILL} side="#141a3a" sideLit="#2c3a66" border={{ width: 7, color: C.proofMatch }}>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, fontFamily: FONT.sans }}>
      <Icon name="check" size={84} color={C.proofMatch} stroke={2.6} />
      <div style={{ fontSize: 112, lineHeight: 1, fontWeight: 600, color: C.ink, marginTop: -10 }}>water</div>
      <div style={{ fontFamily: FONT.mono, fontSize: 70, lineHeight: 1, fontWeight: 500, letterSpacing: '0.22em', color: C.inkMuted, marginLeft: 12 }}>{KEYS.join('')}</div>
    </div>
  </Slab>
);

const Card: React.FC<{ s: ReturnType<typeof stateAt> }> = ({ s }) => {
  const dim = s.cardDim;
  const line = dimmed(C.line, dim);
  const chipBorder = interpolateColors(s.reject, [0, 1], [C.lineStrong, C.proofReject]);
  const wordColor = interpolateColors(s.reject, [0, 1], [C.ink, C.proofReject]);
  // the outline includes the teeth; its box reaches above the body
  const box = { x: -8, y: -260, w: CARD.w + 16, h: CARD.h + 268 };
  return (
    <Slab
      w={CARD.w}
      h={CARD.h}
      r={CARD.r}
      depth={CARD.depth}
      layers={6}
      face={dimmed(C.surface, dim)}
      side={dimmed('#120a2c', dim)}
      outline={{ d: cardPath(s.teeth), box }}
      border={{ width: 4, color: line }}
    >
      {/* the teeth: the suggested word's code, standing on the card's top edge (part of the card) */}
      {TEETH.map((d, i) => {
        const th = s.teeth[i]!;
        const c = toothCentre(i, th.dock);
        const v = th.verdict;
        const colour = dimmed(th.fit ? C.proofMatch : C.proofReject, dim);
        return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: c.x - 60, top: c.y - 40, width: 120, height: 80, display: 'grid', placeItems: 'center', fontFamily: FONT.mono, fontSize: 66, lineHeight: 1, fontWeight: 500, color: v > 0 && !th.fit ? dimmed(C.proofReject, dim) : dimmed(C.ink, dim) }}>
              {d}
            </div>
            {v > 0 ? (
              <>
                <svg width={CARD.w} height={300} viewBox={`0 -280 ${CARD.w} 300`} style={{ position: 'absolute', left: 0, top: -280, overflow: 'visible', opacity: v }}>
                  <path d={toothPath(i, th.dock)} fill="none" stroke={colour} strokeWidth={7} strokeLinejoin="round" strokeDasharray={th.fit ? undefined : '18 12'} />
                </svg>
                <div style={{ position: 'absolute', left: c.x + 72, top: c.y - 28, opacity: v }}>
                  <Icon name={th.fit ? 'check' : 'x'} size={56} color={colour} stroke={3} />
                </div>
              </>
            ) : null}
          </React.Fragment>
        );
      })}
      <div style={{ position: 'absolute', left: CARD_IN.padX, top: CARD_IN.labelY, fontFamily: FONT.sans, fontSize: CARD_IN.labelFont, lineHeight: 1.2, fontWeight: 700, color: dimmed(C.inkMuted, dim), whiteSpace: 'nowrap' }}>
        Model ranking (opt-in)
      </div>
      <div
        style={{
          position: 'absolute',
          left: CARD_IN.chipX,
          top: CARD_IN.chipY,
          width: CARD_IN.chipW,
          height: CARD_IN.chipH,
          boxSizing: 'border-box',
          borderRadius: CARD_IN.chipR,
          border: `6px solid ${dimmed(chipBorder, dim)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26,
          fontFamily: FONT.sans,
        }}
      >
        {s.reject > 0 ? <Icon name="x" size={70} color={dimmed(C.proofReject, dim)} stroke={2.8} style={{ opacity: s.reject }} /> : null}
        <div style={{ position: 'relative', fontSize: 100, lineHeight: 1, fontWeight: 600, color: dimmed(wordColor, dim), marginTop: -8 }}>
          {REJECT.word}
          {s.strike > 0 ? <span style={{ position: 'absolute', left: 0, top: '57%', height: 9, width: `${s.strike * 100}%`, background: dimmed(C.proofReject, dim), borderRadius: 5 }} /> : null}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 62, lineHeight: 1, fontWeight: 500, letterSpacing: '0.22em', color: dimmed(C.inkMuted, dim), marginLeft: 8 }}>{REJECT.code}</div>
      </div>
    </Slab>
  );
};

export const ProofCss: React.FC<{ frame?: number; dof?: boolean }> = ({ frame: at, dof = true }) => {
  const now = useCurrentFrame();
  const frame = at ?? now;
  const cam = camAt(frame);
  const s = stateAt(frame);
  // Light from the top left and in front: shadows fall right and back, softer the higher the object.
  const shadow = (x: number, z: number, w: number, lift: number, strength: number) => (
    <GroundShadow x={x + lift * 0.12} z={z - lift * 0.35} w={w} d={110 + lift * 0.25} lift={lift} strength={strength} />
  );
  const cardBox = { x: -8, y: -260, w: CARD.w + 16, h: CARD.h + 268 };
  return (
    <Studio
      cam={cam}
      focusZ={20}
      aperture={dof ? 60 : 0}
      ground={{ y: FLOOR_Y, spacing: 104, dot: 6, far: 9000, near: 2400, aspect: 3 }}
      groundDof={dof ? { radius: 5, from: 0.0 } : undefined}
      shadows={
        <>
          {/* the lock and the chip float: wide, faint shadows; the card stands on the floor: a tight contact shadow */}
          {shadow(0, 20, 1180, FLOOR_Y - (KEY.top + KS), 0.32)}
          {shadow(0, 10, 900, FLOOR_Y - (CHIP.y + CHIP.h), 0.22)}
          {/* the card: a cast shadow away from the key light, and a tight contact shadow at its base */}
          <CastShadow x={0} z={s.cardZ + 4} w={CARD.w} height={CARD.h + 60} lift={s.lift} strength={0.5 * (1 - 0.4 * s.cardDim)} />
          <GroundShadow x={0} z={s.cardZ + CARD.depth / 2} w={CARD.w * 1.06} d={70} lift={s.lift} strength={0.85 * (1 - 0.4 * s.cardDim)} />
        </>
      }
    >
      <Plane x={CHIP.x} y={CHIP.y}>
        <WaterChip />
      </Plane>
      {KEYS.map((d, i) => (
        <Plane key={i} x={keyX(i) - KS / 2} y={KEY.top}>
          <Key digit={d} dim={s.keyDim} ring={s.rings[i]!} />
        </Plane>
      ))}
      <Plane x={-CARD.w / 2} y={s.cardTop} z={s.cardZ}>
        {dof && s.cardZ < -2 ? (
          <DepthBlur z={s.cardZ} box={cardBox} dim={0}>
            <Card s={s} />
          </DepthBlur>
        ) : (
          <Card s={s} />
        )}
      </Plane>
      {s.bloom > 0 ? (
        <Plane x={keyX(REJECT.diffAt) - 160} y={KEY.top + KS - 120} z={70}>
          <div style={{ width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,143,166,0.30) 0%, rgba(255,143,166,0.1) 50%, rgba(255,143,166,0) 100%)', opacity: s.bloom }} />
        </Plane>
      ) : null}
    </Studio>
  );
};
