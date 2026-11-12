/**
 * Parts for the middle of Act 2 in the second cut (s10 to s12). Pure: every state comes from props.
 *
 *  TheySaid    the app's "They said" panel (.partner: label over the other person's line), recreated
 *  MidFloor    the studio's dot floor (brand/Studio Floor) with the dot size as a parameter, for worlds
 *              whose px are not screen px (the phone world is image px at zoom 0.435); a local variant
 *  CardShell   the sentence card's fill, Clear and placeholder, forming from a box around the words
 *  SignalIcon  our own signal bars (Act 1's status bars, now moon), losing bars
 *  Phone3D     <Device> with thickness plates behind it, so a 3D turn reads as an object
 */
import React from 'react';
import { C, FONT } from '../../tokens';
import { Icon } from '../brand/Icon';
import { LightSweep } from '../brand/Studio';
import { Device, PhoneFallback } from './Screens';
import { PHONE_DEFAULT, type Capture } from './capture';

/**
 * The other person's last line, as the app shows it on wide screens (label "They said", then the line). `veil` 0..1
 * darkens it towards night (a back plane recedes by darkening, never by transparency).
 */
export const TheySaid: React.FC<{ text: string; s: number; width: number; opacity?: number; veil?: number }> = ({ text, s, width, opacity = 1, veil = 0 }) => (
  <div
    style={{
      position: 'relative',
      width,
      boxSizing: 'border-box',
      padding: `${16 * s}px ${16 * s}px ${16 * s}px ${24 * s}px`,
      borderRadius: 28 * s,
      background: C.surface,
      fontFamily: FONT.sans,
      opacity: opacity < 1 ? opacity : undefined,
    }}
  >
    <div style={{ fontSize: 16 * s, lineHeight: `${20 * s}px`, fontWeight: 600, color: C.inkMuted }}>They said</div>
    <div style={{ marginTop: 4 * s, fontSize: 22 * s, lineHeight: `${30 * s}px`, fontWeight: 400, color: C.ink, whiteSpace: 'nowrap' }}>{text}</div>
    {veil > 0 ? <div style={{ position: 'absolute', inset: 0, borderRadius: 28 * s, background: `rgba(20,10,46,${veil})` }} /> : null}
  </div>
);

/** brand/Studio <Floor> with the dot radius as a parameter (world px). Put it first inside <World>. */
export const MidFloor: React.FC<{
  y: number;
  x?: number;
  width?: number;
  near?: number;
  far?: number;
  spacing?: number;
  dot?: number;
  opacity?: number;
  angle?: number;
}> = ({ y, x = 0, width = 9000, near = 1400, far = 5200, spacing = 84, dot = 5, opacity = 1, angle = 78 }) => {
  const depth = near + far;
  const originPct = (far / depth) * 100;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - width / 2,
        top: y - far,
        width,
        height: depth,
        transformOrigin: `50% ${originPct}%`,
        transform: `rotateX(${angle}deg)`,
        opacity,
        backgroundImage: `radial-gradient(circle, rgba(141,128,194,0.42) ${dot}px, rgba(141,128,194,0) ${dot * 1.4}px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
        backgroundPosition: `${spacing / 2}px ${spacing / 2}px`,
        maskImage: `linear-gradient(to bottom, transparent 0%, black ${originPct * 0.55}%, black ${originPct + 6}%, transparent 100%)`,
        WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${originPct * 0.55}%, black ${originPct + 6}%, transparent 100%)`,
        pointerEvents: 'none',
      }}
    />
  );
};

/**
 * The sentence card's shell (.phone-card): surface-sunken fill, Clear at the top right, the app's
 * placeholder when empty. `form` 0..1 grows the fill from the box `from` (card-local px) to the card.
 */
export const CardShell: React.FC<{
  w: number;
  h: number;
  r: number;
  s: number;
  form?: number;
  from?: { x: number; y: number; w: number; h: number };
  clear?: number;
  placeholder?: number;
  padLeft: number;
  textTop: number;
  fontPx: number;
}> = ({ w, h, r, s, form = 1, from, clear = 1, placeholder = 0, padLeft, textTop, fontPx }) => {
  const f = Math.max(0, Math.min(1, form));
  const box = from ?? { x: 0, y: 0, w, h };
  const top = box.y * (1 - f);
  const left = box.x * (1 - f);
  const right = (w - box.x - box.w) * (1 - f);
  const bottom = (h - box.y - box.h) * (1 - f);
  const clearSize = 56 * s;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
      {f > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: r,
            background: C.surfaceSunken,
            clipPath: f < 1 ? `inset(${top}px ${right}px ${bottom}px ${left}px round ${r * (0.4 + 0.6 * f)}px)` : undefined,
            opacity: Math.min(1, f * 2.5),
          }}
        />
      ) : null}
      {clear > 0 ? (
        <div
          style={{
            position: 'absolute',
            right: 8 * s * 2.2,
            top: 8 * s * 2.2,
            width: clearSize,
            height: clearSize,
            boxSizing: 'border-box',
            borderRadius: 18 * s,
            border: `${2 * s}px solid ${C.lineStrong}`,
            display: 'grid',
            placeItems: 'center',
            opacity: clear,
          }}
        >
          <Icon name="x" size={22 * s} color={C.ink} stroke={2.5} />
        </div>
      ) : null}
      {placeholder > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: padLeft,
            top: textTop,
            fontFamily: FONT.sans,
            fontSize: fontPx * 0.62,
            lineHeight: `${fontPx * 1.16}px`,
            fontWeight: 400,
            color: C.inkMuted,
            whiteSpace: 'nowrap',
            opacity: placeholder,
          }}
        >
          Press a key to start
        </div>
      ) : null}
    </div>
  );
};

/** Our own signal bars (Act 1's status bars, now moon on night). `bars` 0..4 still standing, fractional fades the next. */
export const SignalIcon: React.FC<{ size: number; bars: number; color?: string }> = ({ size, bars, color = C.moon }) => {
  const w = size;
  const barW = w * 0.16;
  const gap = w * 0.08;
  return (
    <div style={{ position: 'relative', width: w, height: w }}>
      {[0, 1, 2, 3].map((i) => {
        const h = w * (0.28 + i * 0.24);
        const on = Math.max(0, Math.min(1, bars - i));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: i * (barW + gap),
              bottom: 0,
              width: barW,
              height: h,
              borderRadius: barW * 0.3,
              boxSizing: 'border-box',
              border: `${Math.max(2, w * 0.025)}px solid ${color}`,
              background: color,
              backgroundClip: 'padding-box',
              opacity: 0.25 + 0.75 * on,
              // A fallen bar keeps its outline (the shape says "no signal"), its fill goes.
              backgroundColor: on > 0.5 ? color : 'transparent',
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * The phone frame with its capture (components/mid/Screens <Device>), plus thickness: three plates
 * behind it, so when the camera turns the phone reads as an object. World px = image px of the capture.
 * `sweep` 0..1: one soft light across the glass (counts as the chapter's one sweep).
 */
export const Phone3D: React.FC<{
  capture: Capture | null;
  status: string;
  zoom: number;
  chrome?: number;
  clip?: string;
  thickness?: number;
  sweep?: number;
}> = ({ capture, status, zoom, chrome = 1, clip, thickness = 34, sweep = 0 }) => {
  const entry = capture ?? PHONE_DEFAULT;
  const w = entry.width;
  const h = entry.height;
  const bezel = Math.round(w * 0.045);
  const outerR = Math.round(w * 0.14);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d' }}>
      {chrome > 0
        ? [1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: -bezel,
                top: -bezel,
                width: w + bezel * 2,
                height: h + bezel * 2,
                borderRadius: outerR,
                background: i === 3 ? '#0e0722' : '#170c34',
                boxShadow: `inset 0 0 0 ${2 / zoom}px #2a1b55`,
                transform: `translateZ(${(-thickness * i) / 3}px)`,
                opacity: chrome,
              }}
            />
          ))
        : null}
      <div style={{ position: 'absolute', left: 0, top: 0, transform: 'translateZ(0.5px)', transformStyle: 'preserve-3d' }}>
        <Device
          kind="phone"
          capture={capture}
          fallbackEntry={PHONE_DEFAULT}
          fallback={<PhoneFallback status={status} />}
          scale={1}
          zoom={zoom}
          chrome={chrome}
          clip={clip}
        />
        {sweep > 0 && sweep < 1 ? (
          <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: Math.max(8, outerR - bezel), overflow: 'hidden' }}>
            <LightSweep progress={sweep} intensity={0.12} width={38} />
          </div>
        ) : null}
      </div>
    </div>
  );
};
