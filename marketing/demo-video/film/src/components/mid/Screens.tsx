/**
 * Devices for the middle of Act 2: a plain frame drawn by us (the look of brand/Parts DeviceFrame)
 * holding a real capture, or, when the capture or its entry is missing, a screen recreated from the
 * brand parts at the capture's size, so both paths frame the same thing.
 *
 * <Device> puts the SCREEN's top-left corner at its own origin and draws the frame around it, in
 * world px: `scale` world px per image px of the capture. `zoom` is the camera zoom, so the frame's
 * edge line and shadow keep their on-screen size at any scale.
 */
import React from 'react';
import { Img } from 'remotion';
import { C, FONT } from '../../tokens';
import { Icon, type IconName } from '../brand/Icon';
import type { DeviceKind } from '../brand/Parts';
import type { Capture, CaptureEntry } from './capture';
import { HeroCard } from './HeroCard';
import decoded from '../../data/decoded.json';

/** Bezel and corner radius in px for a screen of width w (same proportions as Parts DeviceFrame). */
export const frameMetrics = (kind: DeviceKind, w: number) => {
  const bezel = kind === 'phone' ? Math.round(w * 0.045) : kind === 'tablet' ? Math.round(w * 0.03) : Math.round(w * 0.018);
  const outerR = kind === 'phone' ? Math.round(w * 0.14) : kind === 'tablet' ? Math.round(w * 0.05) : Math.round(w * 0.02);
  return { bezel, outerR, innerR: Math.max(8, outerR - bezel) };
};

export type DeviceProps = {
  kind: DeviceKind;
  /** The capture, or null for the recreated screen. */
  capture: Capture | null;
  /** Size and dpr when the capture is missing (from capture.ts defaults). */
  fallbackEntry: CaptureEntry;
  /** The recreated screen, drawn in CSS px at the capture's viewport size. */
  fallback: React.ReactNode;
  /** World px per image px. */
  scale: number;
  /** The camera's zoom (keeps the edge line and shadow at their on-screen size). */
  zoom: number;
  /** 0..1 opacity of the frame and its shadow (the screen stays). */
  chrome?: number;
  /** Optional clip-path for the screen (in world px of the screen box). */
  clip?: string;
};

export const Device: React.FC<DeviceProps> = ({ kind, capture, fallbackEntry, fallback, scale, zoom, chrome = 1, clip }) => {
  const entry = capture ?? fallbackEntry;
  const w = entry.width * scale;
  const h = entry.height * scale;
  const { bezel, outerR, innerR } = frameMetrics(kind, w);
  const px = 1 / zoom; // one screen px in world px
  const vw = entry.viewport?.[0] ?? entry.width / entry.dpr;
  const vh = entry.viewport?.[1] ?? entry.height / entry.dpr;
  const cssScale = (entry.width / vw) * scale;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }}>
      {chrome > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: -bezel,
            top: -bezel,
            width: w + bezel * 2,
            height: h + bezel * 2,
            borderRadius: outerR,
            background: C.surface,
            boxShadow: `inset 0 0 0 ${2 * px}px ${C.lineStrong}, 0 ${16 * px}px ${40 * px}px rgba(8,4,20,0.55), 0 ${40 * px}px ${120 * px}px rgba(8,4,20,0.6)`,
            opacity: chrome,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: w,
          height: h,
          borderRadius: innerR,
          overflow: 'hidden',
          background: C.ground,
          clipPath: clip,
        }}
      >
        {capture ? (
          <Img src={capture.src} style={{ display: 'block', width: w, height: h }} />
        ) : (
          <div style={{ width: vw, height: vh, transform: `scale(${cssScale})`, transformOrigin: '0 0' }}>{fallback}</div>
        )}
      </div>
    </div>
  );
};

// ---- Recreated screens (CSS px). Used only when a capture is missing. ------------------------------

const LEGENDS: Record<string, { digit: string; letters: string }> = Object.fromEntries(decoded.keypad.keys.map((k) => [k.id, { digit: k.digit, letters: k.letters }]));
const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['star', '0', 'hash'],
];

/** A key of the app's phone keypad (wider than tall), legends as in .nl-key. */
const RectKey: React.FC<{ id: string; w: number; h: number }> = ({ id, w, h }) => {
  const { digit, letters } = LEGENDS[id]!;
  const word = letters.length > 4 || /[a-z]/.test(letters);
  return (
    <div style={{ position: 'relative', width: w, height: h, borderRadius: 22, background: C.key, color: C.onKey, flex: 'none' }}>
      <div style={{ position: 'absolute', left: 12, top: 9, fontFamily: FONT.mono, fontSize: 15, lineHeight: '16px', fontWeight: 500 }}>{digit}</div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          paddingTop: 4,
          fontFamily: FONT.sans,
          fontSize: word ? 18 : id === '1' ? 22 : letters.length > 3 ? 26 : 30,
          fontWeight: 700,
          letterSpacing: word ? 0 : '0.04em',
          lineHeight: 1,
        }}
      >
        {letters}
      </div>
    </div>
  );
};

/** The keypad panel with rectangular keys: pad 6, gap 8 (the phone and tablet shells). */
const RectKeypad: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => {
  const pad = 6;
  const gap = 8;
  const kw = (w - 2 * pad - 2 * gap) / 3;
  const kh = (h - 2 * pad - 3 * gap) / 4;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 30, background: C.panel }}>
      {ROWS.map((row, r) => (
        <div key={r} style={{ position: 'absolute', left: pad, top: pad + r * (kh + gap), display: 'flex', gap }}>
          {row.map((id) => (
            <RectKey key={id} id={id} w={kw} h={kh} />
          ))}
        </div>
      ))}
    </div>
  );
};

/** The header mark: the icon's cat bubble with its ninth key (as the app's header shows it). */
const Mark: React.FC<{ x: number; y: number; size: number }> = ({ x, y, size }) => (
  <svg width={size} height={size} viewBox="200 150 624 720" style={{ position: 'absolute', left: x, top: y }}>
    <g fill={C.moon}>
      <polygon points="290,336 310,186 430,306" />
      <polygon points="734,336 714,186 594,306" />
      <polygon points="340,730 318,846 450,752" />
      <rect x="252" y="300" width="520" height="460" rx="110" />
    </g>
    <rect x="560" y="560" width="140" height="140" rx="36" fill={C.ember} stroke={C.plum} strokeWidth="18" />
  </svg>
);

const Pill: React.FC<{ x: number; y: number; label: string; icon?: IconName }> = ({ x, y, label, icon }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      height: 36,
      boxSizing: 'border-box',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 14px',
      borderRadius: 999,
      border: `2px solid ${C.lineStrong}`,
      fontFamily: FONT.sans,
      fontSize: 16,
      fontWeight: 600,
      color: C.ink,
      whiteSpace: 'nowrap',
    }}
  >
    {icon ? <Icon name={icon} size={18} color={icon === 'check' ? C.proofMatch : C.proofNew} /> : null}
    {label}
  </div>
);

const SquareButton: React.FC<{ x: number; y: number; size?: number; children: React.ReactNode }> = ({ x, y, size = 56, children }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: size,
      height: size,
      boxSizing: 'border-box',
      borderRadius: 18,
      border: `2px solid ${C.lineStrong}`,
      display: 'grid',
      placeItems: 'center',
      color: C.ink,
    }}
  >
    {children}
  </div>
);

/** The They said button's speech bubble (drawn here: the film's icon set has no bubble). */
const Bubble: React.FC = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16v11H11l-5 4v-4H4z" />
    <path d="M8 9h8M8 12.5h5" />
  </svg>
);

const Suggestion: React.FC<{ x: number; y: number; w: number; rank: number; text: string; selected?: boolean }> = ({ x, y, w, rank, text, selected }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: 56,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 12px 0 8px',
      borderRadius: 14,
      border: `2px solid ${selected ? C.ember : C.line}`,
      background: selected ? C.emberSoft : C.surface,
      fontFamily: FONT.sans,
      fontSize: 20,
      fontWeight: 600,
      color: C.ink,
      whiteSpace: 'nowrap',
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        display: 'grid',
        placeItems: 'center',
        background: selected ? C.moon : C.surfaceSunken,
        color: selected ? C.onEmber : C.inkMuted,
        fontFamily: FONT.mono,
        fontSize: 16,
        fontWeight: 500,
      }}
    >
      {rank}
    </div>
    {text}
  </div>
);

const OutlineButton: React.FC<{ x: number; y: number; w: number; h?: number; label: string; icon?: IconName; quiet?: boolean; size?: number }> = ({
  x,
  y,
  w,
  h = 56,
  label,
  icon,
  quiet = false,
  size = 20,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 18,
      border: quiet ? 'none' : `2px solid ${C.lineStrong}`,
      background: quiet ? C.surfaceSunken : 'transparent',
      fontFamily: FONT.sans,
      fontSize: size,
      fontWeight: 700,
      color: C.ink,
      whiteSpace: 'nowrap',
    }}
  >
    {icon ? <Icon name={icon} size={size + 2} color={C.ink} /> : null}
    {label}
  </div>
);

const ActionButton: React.FC<{ x: number; y: number; w: number; h?: number; label: string; icon: IconName; primary?: boolean; size?: number }> = ({
  x,
  y,
  w,
  h = 64,
  label,
  icon,
  primary = false,
  size = 22,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 24,
      background: primary ? C.ember : C.surfaceSunken,
      color: primary ? C.onEmber : C.ink,
      fontFamily: FONT.sans,
      fontSize: size,
      fontWeight: primary ? 800 : 700,
      whiteSpace: 'nowrap',
    }}
  >
    <Icon name={icon} size={size + 4} color={primary ? C.onEmber : C.ink} stroke={2.5} />
    {label}
  </div>
);

const W = decoded.sentences['i-need-water'];
const SENTENCE = W.text;
const DIGITS = W.codes.join(' ');

/** The phone shell (390 x 700): header, sentence card, one suggestion row, keypad, action bar. */
export const PhoneFallback: React.FC<{ status: string; statusIcon?: IconName }> = ({ status, statusIcon }) => (
  <div style={{ position: 'relative', width: 390, height: 700, background: C.ground, overflow: 'hidden' }}>
    <Mark x={12} y={12} size={46} />
    <Pill x={64} y={18} label={status} icon={statusIcon} />
    {/* A long status line takes the header's room, as the app's one-line header gives it up. */}
    {status.length <= 16 ? (
      <SquareButton x={322} y={8}>
        <Bubble />
      </SquareButton>
    ) : null}
    <div style={{ position: 'absolute', left: 12, top: 72 }}>
      <HeroCard text={SENTENCE} digits={DIGITS} s={1} />
    </div>
    <Suggestion x={12} y={214} w={280} rank={2} text={decoded.sentences['i-need-water'].candidates[1] ?? ''} />
    <OutlineButton x={300} y={214} w={78} label="More" />
    <RectKeypad x={12} y={278} w={366} h={342} />
    <ActionButton x={12} y={628} w={104} label="Menu" icon="menu" />
    <ActionButton x={124} y={628} w={143} label="Speak" icon="speaker" primary />
    <ActionButton x={275} y={628} w={103} label="Show" icon="show" />
  </div>
);

/** The tablet shell in landscape (1133 x 658): the talk column on the left, the keypad on the right. */
export const TabletFallback: React.FC = () => {
  const cands = decoded.sentences['i-need-water'].candidates;
  return (
    <div style={{ position: 'relative', width: 1133, height: 658, background: C.ground, overflow: 'hidden' }}>
      <Mark x={16} y={14} size={46} />
      <Pill x={76} y={18} label="On device" icon="check" />
      <SquareButton x={530} y={8}>
        <Bubble />
      </SquareButton>
      <div style={{ position: 'absolute', left: 16, top: 72 }}>
        <HeroCard text={SENTENCE} digits={DIGITS} s={1} width={570} height={134} />
      </div>
      <Suggestion x={16} y={214} w={570} rank={2} text={cands[1] ?? ''} />
      <Suggestion x={16} y={278} w={484} rank={3} text={cands[2] ?? ''} />
      <OutlineButton x={508} y={278} w={78} label="More" />
      <ActionButton x={16} y={586} w={104} label="Menu" icon="menu" />
      <ActionButton x={128} y={586} w={348} label="Speak" icon="speaker" primary />
      <ActionButton x={484} y={586} w={102} label="Show" icon="show" />
      <RectKeypad x={611} y={230} w={506} h={420} />
    </div>
  );
};

/** The wide layout (1440 x 900, scrolled so the sentences and the proof are in view). */
export const LaptopFallback: React.FC = () => {
  const s = decoded.sentences['i-need-water'];
  const rows = s.candidates; // the decoder's top three (decoded.json)
  return (
    <div style={{ position: 'relative', width: 1440, height: 900, background: C.ground, overflow: 'hidden', fontFamily: FONT.sans }}>
      <div style={{ position: 'absolute', left: 40, top: 36, width: 968, height: 112, borderRadius: 28, background: C.surfaceSunken }} />
      <div style={{ position: 'absolute', left: 64, top: 50, fontSize: 40, lineHeight: '48px', fontWeight: 600, color: C.ink }}>{SENTENCE}</div>
      <div style={{ position: 'absolute', left: 64, top: 104, fontFamily: FONT.mono, fontSize: 20, lineHeight: '28px', fontWeight: 500, letterSpacing: '0.06em', color: C.inkMuted }}>{DIGITS}</div>
      <ActionButton x={832} y={52} w={159} h={80} label="Speak" icon="speaker" primary size={22} />
      <OutlineButton x={40} y={160} w={126} label="Clear" icon="x" />
      <OutlineButton x={178} y={160} w={187} label="Save phrase" quiet />
      <OutlineButton x={377} y={160} w={126} label="Show" icon="show" quiet />
      <OutlineButton x={515} y={160} w={210} label="Spell this word" />
      <div style={{ position: 'absolute', left: 40, top: 236, fontSize: 18, fontWeight: 600, color: C.inkMuted }}>Sentences for your keys</div>
      {rows.map((t, i) => (
        <div key={t} style={{ position: 'absolute', left: 40, top: 272 + i * 84 }}>
          <Suggestion x={0} y={0} w={968} rank={i + 1} text={t} selected={i === 0} />
        </div>
      ))}
      <div style={{ position: 'absolute', left: 40, top: 540, width: 968, height: 168, borderRadius: 28, background: C.surface }}>
        <div style={{ position: 'absolute', left: 24, top: 20, fontSize: 22, fontWeight: 800, color: C.ink }}>Proof</div>
        <div style={{ position: 'absolute', left: 24, top: 56, fontSize: 16, fontWeight: 500, color: C.inkMuted }}>Every word that can be spoken matches the keys you pressed.</div>
        <div style={{ position: 'absolute', left: 24, top: 96, display: 'flex', gap: 12 }}>
          {s.proof.map((p, i) => (
            <div
              key={p.code}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 48,
                padding: '0 16px 0 12px',
                borderRadius: 14,
                border: `2px solid ${C.proofMatch}`,
                background: '#2a2f54',
                fontSize: 22,
                fontWeight: 600,
                color: C.ink,
              }}
            >
              <Icon name="check" size={22} color={C.proofMatch} />
              {i === 0 ? 'I' : p.word}
              <span style={{ fontFamily: FONT.mono, fontSize: 15, color: C.inkMuted, marginLeft: 4 }}>{p.code}</span>
            </div>
          ))}
        </div>
      </div>
      <RectKeypad x={1040} y={-60} w={360} h={456} />
    </div>
  );
};
