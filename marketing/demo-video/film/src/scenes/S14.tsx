/**
 * Scene 14 (third cut, 2026-11-19; second pass after the owner's review: "messy, text getting out of boxes"): how Kiro
 * was used (bars 40-46, 14 s). 08-revision-v3.md, "The Kiro chapter". Decision D15: never "Built with Kiro".
 *
 * Rules of this pass: at most two quoted cards on screen, each sized to its content with even padding, every quoted line
 * on one line at 34-40 px (short real lines, or a marked "…" cut that verify-kiro.ts checks); a station leaves by
 * stepping back and fading while the next one lands; one ember thing at most (the active workflow step).
 *
 * Bar 40 b1-2  "Made for Kiroween 2026" on the lift's downbeat; it rises to a header.
 * Spec         n19b "In Kiro, features start as specs.": requirement 1.3 lands on "Kiro"; the task that implements it
 *              (task 5, Req 1.2-1.6) lands under it on "features", joined by a line; it is ticked on "specs".
 * Steering     "Steering holds the rules,": product.md lands on "Steering", privacy.md on "rules".
 * Hooks        "...and hooks run the checks on every save.": the saved file pulses to the two PostFileSave hooks, which
 *              light on "run"; their results (as run on 2026-11-19) land on "checks"; on "every save" it runs again.
 * CLI          n19d "On GitHub, Kiro's CLI can review pull requests, headless.": the workflow's three steps light in turn;
 *              under them one card at a time: the kiro-cli line on "CLI", the read-only agent on "review", and the
 *              comment the workflow posts (its real header and footer) on "headless". Set up, not yet run: "can".
 * Rail         the Kiro features used, lit as each is shown; MCP and Powers at the end.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { evolvePath } from '@remotion/paths';
import { C, FONT } from '../tokens';
import { BEAT, EIGHTH, sceneLen, sec } from '../timeline';
import { EASE, mix, ramp } from '../lib/anim';
import { StudioGround } from '../components/brand/Studio';
import { Super, narrIn } from '../components/type/Type';
import { Sfx } from '../audio/Audio';
import { COMMENT, KIRO } from '../components/close/kiro';
import { QuoteCard } from '../components/close/KiroCards';

const END = sceneLen('s14');
const wd = (id: 'n19b-specs' | 'n19c-hooks' | 'n19d-cli', i: number) => narrIn('s14', id, i);

// ---- time (local frames) ----------------------------------------------------------------------------------
const RISE = sec(0.2);
const EARLY = sec(0.03);
const TITLE_WORDS = [-RISE - EARLY, -RISE, EIGHTH - EARLY, BEAT - EARLY];
const HEAD_AT = BEAT * 2 - sec(0.3);
const HEAD_MOVE = sec(0.3);

const T = {
  spec: wd('n19b-specs', 1), // "Kiro"
  task: wd('n19b-specs', 2), // "features"
  tick: wd('n19b-specs', 5), // "specs"
  steer: wd('n19c-hooks', 0), // "Steering"
  rules: wd('n19c-hooks', 3), // "rules"
  hooks: wd('n19c-hooks', 5), // "hooks"
  run: wd('n19c-hooks', 6), // "run"
  checks: wd('n19c-hooks', 8), // "checks"
  every: wd('n19c-hooks', 10), // "every"
  github: wd('n19d-cli', 1), // "GitHub"
  cli: wd('n19d-cli', 3), // "CLI"
  cliCard: wd('n19d-cli', 2), // "Kiro's": the CLI line lands as the narrator names it
  review: wd('n19d-cli', 5), // "review"
  headless: wd('n19d-cli', 8), // "headless"
};

/** Each station: when it starts arriving and when it starts leaving (in the narrator's pauses). */
const LEAVE = sec(0.2);
/** A station is gone before the next one's first element starts landing (no two stations on screen at once). */
const STATIONS = [
  { from: T.spec - sec(0.1), leave: T.steer - sec(0.12) - LEAVE - 2 },
  { from: T.steer - sec(0.12), leave: T.hooks - sec(0.24) - LEAVE - 2 },
  { from: T.hooks - sec(0.24), leave: T.github - sec(0.12) - LEAVE - 2 },
  { from: T.github - sec(0.12), leave: END + 1 },
];

/** A station's own presence: 1 while it is on, stepping back and fading as it leaves (content moves left: next). */
const Station: React.FC<{ frame: number; i: number; children: React.ReactNode }> = ({ frame, i, children }) => {
  const s = STATIONS[i]!;
  if (frame < s.from - sec(0.15) || frame >= s.leave + LEAVE) return null;
  const out = ramp(frame, s.leave, LEAVE, 0, 1, EASE.in);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - out, transform: `translate3d(${-140 * out}px, 0, ${-260 * out}px)` }}>
      {children}
    </div>
  );
};

/** A card that lands at `at`: from depth and a little to the right, settling in 0.3 s; centred on (x, y) if `centre`. */
const Land: React.FC<{ frame: number; at: number; x: number; y: number; centre?: boolean; children: React.ReactNode }> = ({ frame, at, x, y, centre, children }) => {
  if (frame < at - sec(0.12)) return null;
  const p = ramp(frame, at - sec(0.12), sec(0.32), 0, 1, EASE.camera);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `${centre ? 'translateX(-50%) ' : ''}translate3d(${60 * (1 - p)}px, ${24 * (1 - p)}px, ${300 * (1 - p)}px)`,
        opacity: ramp(frame, at - sec(0.12), sec(0.1), 0, 1, EASE.out),
      }}
    >
      {children}
    </div>
  );
};

// ---- the rail: the Kiro features this project used --------------------------------------------------------
const RAIL = [
  { name: 'Specs', at: T.tick },
  { name: 'Steering', at: T.steer },
  { name: 'Hooks', at: T.hooks },
  { name: 'Agents', at: T.review },
  { name: 'MCP', at: END - sec(0.5) },
  { name: 'Powers', at: END - sec(0.5) + 4 },
  { name: 'CLI', at: T.cli },
];
const Rail: React.FC<{ frame: number }> = ({ frame }) => {
  const appear = ramp(frame, HEAD_AT, sec(0.3), 0, 1, EASE.camera);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 976, display: 'flex', justifyContent: 'center', gap: 16, opacity: appear, transform: `translateY(${24 * (1 - appear)}px)` }}>
      {RAIL.map((r) => {
        const on = frame >= r.at;
        const pop = on ? ramp(frame, r.at, sec(0.25), 1.07, 1, EASE.out) : 1;
        return (
          <div
            key={r.name}
            style={{
              height: 62,
              padding: '0 28px',
              borderRadius: 31,
              display: 'flex',
              alignItems: 'center',
              fontFamily: FONT.sans,
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
              border: `2px solid ${on ? C.lineStrong : C.line}`,
              background: on ? C.surface : 'transparent',
              color: on ? C.moon : 'rgba(189,179,224,0.36)',
              transform: `scale(${pop})`,
            }}
          >
            {r.name}
          </div>
        );
      })}
    </div>
  );
};

// ---- small parts ----------------------------------------------------------------------------------------------
/** A one-line chip: a file, or a result with a check drawn in. Fixed height, content width, even padding. */
const Chip: React.FC<{ text: string; check?: number; flash?: number; width?: number }> = ({ text, check, flash = 0, width }) => (
  <div
    style={{
      position: 'relative',
      height: 96,
      width: width ?? 'max-content',
      boxSizing: 'border-box',
      padding: '0 30px',
      borderRadius: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      background: 'rgba(13,6,30,0.94)',
      border: `2px solid ${flash > 0 ? `rgba(238,232,255,${0.4 + 0.5 * flash})` : C.line}`,
      boxShadow: `0 24px 60px rgba(8,4,20,0.55)${flash > 0 ? `, 0 0 ${40 * flash}px rgba(238,232,255,${0.3 * flash})` : ''}`,
      fontFamily: FONT.mono,
      fontSize: 30,
      fontWeight: 600,
      color: C.ink,
      whiteSpace: 'nowrap',
    }}
  >
    {check !== undefined ? (
      <svg width={38} height={38} viewBox="0 0 40 40" style={{ flex: 'none' }}>
        <path d="M8 21 L17 30 L33 11" fill="none" stroke={C.proofMatch} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" {...evolvePath(check, 'M8 21 L17 30 L33 11')} />
      </svg>
    ) : null}
    <span>{text}</span>
  </div>
);

/** A connector drawn on, with an optional pulse travelling along it. */
const Wire: React.FC<{ d: string; draw: number; pulse?: number }> = ({ d, draw, pulse = 0 }) => {
  const line = evolvePath(draw, d);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
      <path d={d} fill="none" stroke={C.lineStrong} strokeWidth={4} strokeLinecap="round" strokeDasharray={line.strokeDasharray} strokeDashoffset={line.strokeDashoffset} />
      {pulse > 0 && pulse < 1 ? <path d={d} fill="none" stroke={C.moon} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="0.12 1" strokeDashoffset={-mix(-0.12, 1, pulse)} /> : null}
    </svg>
  );
};

/** Card height for `n` quoted lines at line height `lh` (QuoteCard: padding 32 + 36, title 54, rule 46). */
const cardH = (n: number, lh: number) => 32 + 54 + 46 + n * lh + 36;

// ---- the workflow's steps (kiro-review.yml lines 13 and 26, 66, 104) ----------------------------------------
const STEPS = [
  { label: 'Pull request', sub: 'label: kiro-review', at: T.github },
  { label: 'Kiro review', sub: 'CLI V3, headless', at: T.cli },
  { label: 'Post the review', sub: 'on the PR', at: T.headless },
];
const STEP = { w: 430, h: 112, gap: 90, y: 168 };
const Steps: React.FC<{ frame: number }> = ({ frame }) => {
  const total = STEPS.length * STEP.w + (STEPS.length - 1) * STEP.gap;
  const x0 = 960 - total / 2;
  const active = STEPS.reduce((a, s, i) => (frame >= s.at ? i : a), -1);
  return (
    <>
      {STEPS.map((s, i) => {
        const on = frame >= s.at;
        const isActive = i === active && !(i === STEPS.length - 1 && frame >= s.at + sec(0.8));
        const x = x0 + i * (STEP.w + STEP.gap);
        return (
          <React.Fragment key={s.label}>
            {i > 0 ? (
              <div style={{ position: 'absolute', left: x - STEP.gap + 14, top: STEP.y + STEP.h / 2 - 2, width: (STEP.gap - 28) * (on ? 1 : ramp(frame, s.at - sec(0.3), sec(0.3), 0, 1)), height: 4, borderRadius: 2, background: on ? C.lineStrong : C.line }} />
            ) : null}
            <div
              style={{
                position: 'absolute',
                left: x,
                top: STEP.y,
                width: STEP.w,
                height: STEP.h,
                boxSizing: 'border-box',
                borderRadius: 26,
                padding: '0 30px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
                background: isActive ? C.ember : on ? C.surface : 'rgba(31,18,67,0.55)',
                border: `2px solid ${isActive ? C.ember : on ? C.lineStrong : C.line}`,
                color: isActive ? C.onEmber : on ? C.moon : 'rgba(189,179,224,0.45)',
              }}
            >
              <div style={{ fontFamily: FONT.sans, fontSize: 36, lineHeight: '42px', fontWeight: 800 }}>{s.label}</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 24, lineHeight: '30px', fontWeight: 600, opacity: 0.85 }}>{s.sub}</div>
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

const CommentCard: React.FC = () => (
  <div style={{ width: 'max-content', boxSizing: 'border-box', padding: '32px 44px 36px', borderRadius: 30, background: C.surface, border: `2px solid ${C.lineStrong}`, boxShadow: '0 36px 90px rgba(8,4,20,0.6)', whiteSpace: 'nowrap' }}>
    <div style={{ fontFamily: FONT.mono, fontSize: 26, fontWeight: 600, color: C.inkMuted }}>The comment it posts</div>
    <div style={{ fontFamily: FONT.sans, fontSize: 52, lineHeight: '62px', fontWeight: 800, color: C.moon, letterSpacing: '-0.01em', marginTop: 10 }}>{COMMENT.header}</div>
    <div style={{ fontFamily: FONT.mono, fontSize: 30, fontWeight: 600, color: C.inkMuted, marginTop: 12 }}>{COMMENT.footer}</div>
  </div>
);

// ---- the hooks station's geometry (fixed columns, so the wires meet the boxes) -------------------------------
const HOOK = { lh: 48, font: 34 };
const HOOK_H = cardH(2, HOOK.lh);
/** Inside the title-safe width (96 px side margins): 405 + 56 + 760 + 56 + about 420 = 1697 px, centred. */
const COL = { file: 112, fileW: 405, hooks: 573, results: 1389 };
const ROWS = [262, 262 + HOOK_H + 44];
const FILE_Y = (ROWS[0]! + ROWS[1]! + HOOK_H) / 2 - 48;

export const S14: React.FC = () => {
  const frame = useCurrentFrame();
  const head = ramp(frame, HEAD_AT, HEAD_MOVE, 0, 1, EASE.camera);
  const tick = ramp(frame, T.tick, sec(0.12), 0, 1, EASE.linear);
  const fire = (at: number) => (frame < at ? 0 : ramp(frame, at, sec(0.1), 0, 1, EASE.out) * ramp(frame, at + sec(0.45), sec(0.4), 1, 0.3, EASE.out));
  const save1 = ramp(frame, T.hooks, sec(0.45), 0, 1, EASE.inOut);
  const save2 = ramp(frame, T.every, sec(0.45), 0, 1, EASE.inOut);
  const pulse = frame >= T.every ? save2 : save1;
  const flash = Math.max(frame >= T.hooks ? ramp(frame, T.hooks, sec(0.35), 1, 0, EASE.out) : 0, frame >= T.every ? ramp(frame, T.every, sec(0.35), 1, 0, EASE.out) : 0);
  // The CLI station's card slot: one card at a time; each steps up and out before the next one lands (no overlap).
  const OUT = sec(0.18);
  const slot = (from: number, next: number) => {
    const to = next - sec(0.12) - OUT;
    return frame < from - sec(0.12) || frame >= to + OUT ? 0 : 1 - ramp(frame, to, OUT, 0, 1, EASE.in);
  };
  const fileRight = COL.file + COL.fileW;
  const hookLeft = COL.hooks;
  const hookRight = COL.hooks + 760;
  const midY = (r: number) => r + HOOK_H / 2;
  const fileMid = FILE_Y + 48;
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <StudioGround glow={{ x: 50, y: mix(48, 54, head), r: 70, strength: 0.95 }} haze={0} />

      <AbsoluteFill style={{ perspective: '2400px', perspectiveOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
          {/* Spec: the requirement, then the task that implements it. */}
          <Station frame={frame} i={0}>
            {frame >= T.task ? <Wire d={`M 960 ${236 + cardH(1, 52)} L 960 ${236 + cardH(1, 52) + 64}`} draw={ramp(frame, T.task - sec(0.1), sec(0.3), 0, 1, EASE.camera)} /> : null}
            <Land frame={frame} at={T.spec} x={960} y={236} centre>
              <QuoteCard card={KIRO.spec} font={36} line={52} dim={ramp(frame, T.task, sec(0.35), 0, 1, EASE.out)} />
            </Land>
            <Land frame={frame} at={T.task} x={960} y={236 + cardH(1, 52) + 64} centre>
              <QuoteCard card={KIRO.task} font={36} line={52} check={tick} />
            </Land>
          </Station>

          {/* Steering: two rules, one per phrase. */}
          <Station frame={frame} i={1}>
            <Land frame={frame} at={T.steer} x={960} y={250} centre>
              <QuoteCard card={KIRO.product} font={36} line={52} dim={ramp(frame, T.rules, sec(0.35), 0, 1, EASE.out)} />
            </Land>
            <Land frame={frame} at={T.rules} x={960} y={250 + cardH(1, 52) + 56} centre>
              <QuoteCard card={KIRO.privacy} font={36} line={52} />
            </Land>
          </Station>

          {/* Hooks: a save fires both hooks; their results come back. */}
          <Station frame={frame} i={2}>
            <Wire d={`M ${fileRight} ${fileMid} C ${fileRight + 60} ${fileMid}, ${hookLeft - 60} ${midY(ROWS[0]!)}, ${hookLeft} ${midY(ROWS[0]!)}`} draw={ramp(frame, T.hooks - sec(0.15), sec(0.3), 0, 1, EASE.camera)} pulse={pulse} />
            <Wire d={`M ${fileRight} ${fileMid} C ${fileRight + 60} ${fileMid}, ${hookLeft - 60} ${midY(ROWS[1]!)}, ${hookLeft} ${midY(ROWS[1]!)}`} draw={ramp(frame, T.hooks - sec(0.15), sec(0.3), 0, 1, EASE.camera)} pulse={pulse} />
            {frame >= T.checks - sec(0.2)
              ? ROWS.map((r) => <Wire key={r} d={`M ${hookRight} ${midY(r)} L ${COL.results} ${midY(r)}`} draw={ramp(frame, T.checks - sec(0.2), sec(0.2), 0, 1, EASE.camera)} />)
              : null}
            <Land frame={frame} at={T.hooks - sec(0.12)} x={COL.file} y={FILE_Y}>
              <Chip text="core/src/keymap.ts" flash={flash} width={COL.fileW} />
            </Land>
            <Land frame={frame} at={T.hooks} x={COL.hooks} y={ROWS[0]!}>
              <QuoteCard card={KIRO.hookPbt} font={HOOK.font} line={HOOK.lh} width={760} lit={Math.max(fire(T.run), fire(T.every + sec(0.3)))} />
            </Land>
            <Land frame={frame} at={T.hooks + 4} x={COL.hooks} y={ROWS[1]!}>
              <QuoteCard card={KIRO.hookTm} font={HOOK.font} line={HOOK.lh} width={760} lit={Math.max(fire(T.run + 3), fire(T.every + sec(0.3) + 3))} />
            </Land>
            <Land frame={frame} at={T.checks} x={COL.results} y={midY(ROWS[0]!) - 48}>
              <Chip text="Tests 141 passed" check={ramp(frame, T.checks + 4, sec(0.15), 0, 1)} />
            </Land>
            <Land frame={frame} at={T.checks + EIGHTH} x={COL.results} y={midY(ROWS[1]!) - 48}>
              <Chip text="tm-lint: clean" check={ramp(frame, T.checks + EIGHTH + 4, sec(0.15), 0, 1)} />
            </Land>
          </Station>

          {/* CLI: the workflow's steps, and under them one card at a time. */}
          <Station frame={frame} i={3}>
            {frame >= STATIONS[3]!.from ? <Steps frame={frame} /> : null}
            {slot(T.cliCard, T.review) > 0 ? (
              <div style={{ position: 'absolute', inset: 0, opacity: slot(T.cliCard, T.review), transform: `translateY(${-50 * (1 - slot(T.cliCard, T.review)) * (frame >= T.cliCard + sec(0.3) ? 1 : 0)}px)` }}>
                <Land frame={frame} at={T.cliCard} x={960} y={420} centre>
                  <QuoteCard card={KIRO.cli} font={38} line={54} />
                </Land>
              </div>
            ) : null}
            {slot(T.review, T.headless) > 0 ? (
              <div style={{ position: 'absolute', inset: 0, opacity: slot(T.review, T.headless), transform: `translateY(${-50 * (1 - slot(T.review, T.headless)) * (frame >= T.review + sec(0.3) ? 1 : 0)}px)` }}>
                <Land frame={frame} at={T.review} x={960} y={404} centre>
                  <QuoteCard card={KIRO.agent} font={38} line={54} />
                </Land>
              </div>
            ) : null}
            <Land frame={frame} at={T.headless} x={960} y={440} centre>
              <CommentCard />
            </Land>
          </Station>
        </div>
      </AbsoluteFill>

      <Rail frame={frame} />

      <Super text="Made for Kiroween 2026" at={TITLE_WORDS[0]!} wordFrames={TITLE_WORDS} rise={RISE} size={mix(128, 50, head)} y={mix(528, 84, head)} maxWidth={1800} />

      {/* Sound: the lift's downbeat; a tick per landing; the hooks' pulse; one soft hit for the comment. */}
      <Sfx id="sub-hit" at={0} volume={0.35} />
      <Sfx id="tick" at={T.spec} volume={0.35} />
      <Sfx id="tick" at={T.task} volume={0.3} />
      <Sfx id="tick" at={T.tick} volume={0.35} />
      {STATIONS.slice(0, 3).map((s) => (
        <Sfx key={s.leave} id="whoosh-1" at={s.leave - sec(0.2)} volume={0.35} />
      ))}
      <Sfx id="tick" at={T.rules} volume={0.3} />
      <Sfx id="tick" at={T.hooks} volume={0.35} />
      <Sfx id="thump" at={T.run} volume={0.35} />
      <Sfx id="tick" at={T.checks} volume={0.35} />
      <Sfx id="tick" at={T.checks + EIGHTH} volume={0.3} />
      <Sfx id="thump" at={T.every + sec(0.3)} volume={0.3} />
      {STEPS.map((s) => (
        <Sfx key={s.label} id="tick" at={s.at} volume={0.35} />
      ))}
      <Sfx id="tick" at={T.review} volume={0.3} />
      <Sfx id="sub-hit" at={T.headless} volume={0.3} />
      <Sfx id="tick" at={END - sec(0.5)} volume={0.3} />
    </AbsoluteFill>
  );
};
