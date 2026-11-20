/**
 * Scene 12b (third cut, 2026-11-19; second pass after the owner's review: "still a bit rushed"): the real app keeps up
 * with the conversation (bars 33-37, 10 s). Every screen is a real capture of the live app (scripts/capture/capture.mjs
 * groups `convo`, `water` and `show-water`), moved as pieces. 08-revision-v3.md, "The real-app reel".
 *
 * Second pass: three shots, one per narrator line, each with ONE camera idea and a hold after every change. Cut from
 * the first pass: the Whole conversation sheet, the push into it, the Show press there and the whip to the phone.
 *
 * "It keeps up with the conversation."            (shot 1, 0.0-2.6 s)
 *   Hard cut on bar 33's downbeat to a macro of the real strip, "You: I need water" (the line s10 spoke), drifting in.
 *   In the narrator's pause the rest of the laptop screen flies in from depth, block by block, and seats around it
 *   while the camera pulls out slowly to the whole screen (lift and re-seat); then it holds.
 * "Listen to what they say, and answer in one press."   (shot 2, 2.6-6.0 s, one framing, no camera moves)
 *   The camera settles on the conversation: strip, panel and quick replies all in frame. The pointer clicks Listen: the
 *   panel opens as the app opens it and their words type into the field ("Do you want it cold?", from the fake
 *   recogniser that stands in for the browser's). A hold, then Done: the strip shows their line, with the quick
 *   replies and reply types. On "one" the pointer presses "Yes."; the strip answers "You: Yes.". A hold.
 * "Or show it, and flip it to face them."          (shot 3, 6.0-10.0 s)
 *   A cut on bar 36's downbeat to the phone with "I need water" typed. On "show" a fingertip taps Show and the Show
 *   screen grows out of the button. A hold on the big text. A tap on Flip turns the message round (the real flipped
 *   capture lands under it); the phone lays back and moves away from us, towards the person opposite.
 *
 * Truth: the captures are the live app at night.statescu.net; the voice and the recogniser are test stand-ins, so no
 * voice is claimed. One ember thing at most (the phone capture's Speak); presses are moon rings and a drawn pointer.
 * Never shows "neff" (a brand): no capture here lists the sentences for the keys.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { BAR, JUMP, sceneLen, sec } from '../timeline';
import { EASE, mix, ramp } from '../lib/anim';
import { StudioGround } from '../components/brand/Studio';
import { narrIn } from '../components/type/Type';
import { Sfx } from '../audio/Audio';
import { TouchRing } from '../components/close/Phone';
import { PlaneView, Pointer, Tile, box, camAt, cap, centre, pointerAt } from '../components/reel/reel';

const END = sceneLen('s12b');
const w = (id: 'n18b-keeps-up' | 'n18c-listen' | 'n18d-show-flip', i: number) => narrIn('s12b', id, i);

// ---- the captures ---------------------------------------------------------------------------------------
const YOU = cap('convo-you');
const LISTENING = cap('convo-listening');
const HEARD = cap('convo-heard');
const THEIR = cap('convo-their');
const YES = cap('convo-yes');
const PHONE = cap('phone-water');
const SHOW_UP = cap('show-water-upright');
const SHOW_FLIP = cap('show-water-flipped');

// ---- time (local frames), from the narrator's words and the bars ---------------------------------------
const PILL_IN = sec(0.45);
const ASSEMBLE = w('n18b-keeps-up', 2) + sec(0.04); // just after "up": the pause carries the assembly
const FLY_LEN = sec(0.6);
const FLY_GAP = 4;
const SEATED = ASSEMBLE + sec(1.0); // the slow pull-out lands on the whole screen
const FRAME2 = w('n18c-listen', 0) - sec(0.38); // the camera settles on the conversation before "Listen"
const CLICK_LISTEN = w('n18c-listen', 0) + sec(0.06);
const OPEN = CLICK_LISTEN + JUMP;
const WIPE = w('n18c-listen', 2) - sec(0.02); // "what they say": their words type in
const WIPE_LEN = sec(0.75);
const HEARD_AT = WIPE + WIPE_LEN + 1;
const CLICK_DONE = w('n18c-listen', 5) + sec(0.12); // on "and", after a hold on their line
const THEIR_AT = CLICK_DONE + JUMP;
const CLICK_YES = w('n18c-listen', 8); // "one"
const YES_AT = CLICK_YES + JUMP;
const CUT = 3 * BAR; // bar 36's downbeat: the phone
const TAP_SHOW = w('n18d-show-flip', 1); // "show"
const SHOW_OPEN = TAP_SHOW + sec(0.08);
const SHOW_LEN = sec(0.42);
const FLIP = w('n18d-show-flip', 4); // "flip"
const TAP_FLIP = FLIP - sec(0.16);
/** The flip (research, 2026-11-19): a 4-degree counter-turn over 7 frames, then 180 degrees over 0.65 s, eased. */
const WIND = 7;
const TURN = sec(0.65);
const LAY = FLIP + TURN + sec(0.12);
const LAY_LEN = sec(1.0);

// ---- the laptop plane: real blocks, by name ------------------------------------------------------------
const B = {
  header: box(YOU, 'header'),
  partner: box(YOU, 'partner'),
  speak: box(YOU, 'speakbar'),
  quick: box(YOU, 'quick'),
  keypad: box(YOU, 'keypad'),
  tools: box(YOU, 'pad-tools'),
};
const LISTEN_PANEL = box(LISTENING, 'partner');
const HEARD_PANEL = box(HEARD, 'partner');
const FIELD = box(HEARD, 'partner-field');
/** Where the heard line's glyphs run in the field (measured on convo-heard.png at 4x: image x 302 to 998). */
const HEARD_TEXT = { x0: 75, x1: 251 };
const TYPES = box(THEIR, 'reply-types');
const PILL = box(YOU, 'partner-row');

/** The order the blocks fly in (the strip is already there), and where each comes from (spread out, in depth). */
const FLY: { key: keyof typeof B; dx: number; dy: number }[] = [
  { key: 'speak', dx: -0.05, dy: 0.05 },
  { key: 'keypad', dx: 0.08, dy: -0.02 },
  { key: 'quick', dx: -0.06, dy: 0.09 },
  { key: 'header', dx: 0, dy: -0.08 },
  { key: 'tools', dx: 0.09, dy: 0.08 },
];

const OPEN_LEN = sec(0.32);
const LISTEN_BTN = box(YOU, 'partner-b1');
const DONE_BTN = box(HEARD, 'partner-b2');
const YES_BTN = box(THEIR, 'reply-yes');
const PRESSES = [
  { at: CLICK_LISTEN, r: LISTEN_BTN },
  { at: CLICK_DONE, r: { ...DONE_BTN, y: DONE_BTN.y } },
  { at: CLICK_YES, r: YES_BTN },
];
/** y of the blocks under the They said panel: they move as the panel opens; the panel closes in one step (the app's). */
const below = (frame: number) => {
  const open = ramp(frame, OPEN, OPEN_LEN, 0, 1, EASE.camera);
  const heard = ramp(frame, HEARD_AT, sec(0.15), 0, 1, EASE.camera);
  const close = ramp(frame, THEIR_AT, sec(0.3), 0, 1, EASE.camera);
  const listenDy = LISTEN_PANEL.h - B.partner.h;
  const heardDy = HEARD_PANEL.h - B.partner.h;
  return mix(mix(mix(0, listenDy, open), heardDy, heard * open), 0, close);
};

const LaptopScreen: React.FC<{ frame: number }> = ({ frame }) => {
  const dy = below(frame);
  const panelH =
    frame >= THEIR_AT
      ? B.partner.h
      : mix(mix(B.partner.h, LISTEN_PANEL.h, ramp(frame, OPEN, OPEN_LEN, 0, 1, EASE.camera)), HEARD_PANEL.h, ramp(frame, HEARD_AT, sec(0.15), 0, 1, EASE.camera));
  // Which capture the They said strip shows: the app changes in one step (a swap on the frame it reacts).
  const partnerCap = frame >= YES_AT ? YES : frame >= THEIR_AT ? THEIR : frame >= HEARD_AT ? HEARD : frame >= OPEN ? LISTENING : YOU;
  const partnerSrc = partnerCap === LISTENING ? LISTEN_PANEL : partnerCap === HEARD ? HEARD_PANEL : B.partner;
  const frameIn = ramp(frame, ASSEMBLE + sec(0.3), sec(0.45), 0, 1, EASE.out);
  const typesIn = frame >= THEIR_AT && frame < YES_AT ? ramp(frame, THEIR_AT + sec(0.08), sec(0.2), 0, 1, EASE.camera) : 0;
  const typed = ramp(frame, WIPE, WIPE_LEN, 0, 1, EASE.linear);
  return (
    <>
      {/* The device: a plain frame of our own, then the screen's ground. */}
      <div style={{ position: 'absolute', left: -26, top: -26, width: 1440 + 52, height: 900 + 52, borderRadius: 30, background: C.surface, boxShadow: `inset 0 0 0 2px ${C.lineStrong}, 0 40px 120px rgba(8,4,20,0.6)`, opacity: frameIn, transform: 'translateZ(-2px)' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1440, height: 900, borderRadius: 6, background: C.night, opacity: frameIn, transform: 'translateZ(-1px)' }} />
      {/* The strip is the hero from the first frame; the other blocks fly in from depth. */}
      <Tile c={partnerCap} src={{ ...partnerSrc, h: Math.max(partnerSrc.h, panelH) }} h={panelH} radius={14} />
      {frame >= WIPE && frame < HEARD_AT ? (
        // Their words arrive in the field (speech to text): the placeholder clears and the heard line types in, its
        // glyphs uncovered left to right (the field's own fill covers what is not there yet).
        <>
          <Tile c={HEARD} src={FIELD} at={{ x: FIELD.x, y: FIELD.y }} radius={10} />
          <div
            style={{
              position: 'absolute',
              left: mix(HEARD_TEXT.x0, HEARD_TEXT.x1, typed),
              top: FIELD.y + 4,
              width: Math.max(0, FIELD.x + FIELD.w - 4 - mix(HEARD_TEXT.x0, HEARD_TEXT.x1, typed)),
              height: FIELD.h - 8,
              background: C.plum,
              transform: 'translateZ(0.5px)',
            }}
          />
        </>
      ) : null}
      {FLY.map(({ key, dx, dy: fy }, i) => {
        const r = B[key];
        const start = ASSEMBLE + i * FLY_GAP;
        if (frame < start) return null;
        const p = ramp(frame, start, FLY_LEN, 0, 1, EASE.camera);
        const moves = key === 'speak' || key === 'quick';
        const from = { x: r.x + dx * 1440, y: r.y + fy * 900 };
        const yNow = r.y + (moves ? dy : 0);
        return <Tile key={key} c={YOU} src={r} at={{ x: mix(from.x, r.x, p), y: mix(from.y, yNow, p) }} z={mix(-900, 0, p)} dim={0.55 * (1 - p)} radius={12} />;
      })}
      {typesIn > 0 ? <Tile c={THEIR} src={TYPES} at={{ x: TYPES.x, y: TYPES.y + 18 * (1 - typesIn) }} opacity={typesIn} radius={12} /> : null}
      {/* Before each press, the control it will press lights softly (the eye lands before the click). */}
      {PRESSES.map(({ at, r }) => {
        const on = ramp(frame, at - 10, 8, 0, 1, EASE.out) * ramp(frame, at + JUMP, sec(0.25), 1, 0, EASE.out);
        if (on <= 0) return null;
        return <div key={at} style={{ position: 'absolute', left: r.x - 3, top: r.y - 3 + (r === YES_BTN ? 0 : 0), width: r.w + 6, height: r.h + 6, borderRadius: 16, boxShadow: `0 0 0 3px rgba(238,232,255,${0.85 * on}), 0 0 22px rgba(238,232,255,${0.35 * on})`, transform: 'translateZ(1px)' }} />;
      })}
    </>
  );
};

/** The pointer: it comes in while the camera settles, rests near what is next, and clicks on the narrator's words. */
const POINTER = (() => {
  // The pointer's tip lands just right of each label, so the word it presses stays readable.
  const beside = (r: { x: number; y: number; w: number; h: number }, dx: number) => ({ x: r.x + r.w / 2 + dx, y: r.y + r.h / 2 + 6 });
  const listen = beside(box(YOU, 'partner-b1'), 42);
  const done = beside(box(HEARD, 'partner-b2'), 46);
  const yes = beside(box(THEIR, 'reply-yes'), 40);
  return [
    { f: FRAME2 - sec(0.1), x: 700, y: 470 },
    { f: CLICK_LISTEN - 2, x: listen.x, y: listen.y, click: true },
    { f: OPEN + sec(0.4), x: done.x + 30, y: done.y + 70 },
    { f: CLICK_DONE - 2, x: done.x, y: done.y, click: true },
    { f: CLICK_YES - 2, x: yes.x, y: yes.y, click: true },
  ];
})();

// ---- the laptop camera: a slow pull-out, then one framing for the whole conversation ---------------------
const FULL = { x: 720, y: 318, z: 1.3 };
const TALK = { x: 520, y: 300, z: 1.72 };
const LAPTOP_CAM = [
  { f: 0, cam: { ...centre(PILL), z: 3.0, ry: -3 } },
  { f: ASSEMBLE - sec(0.05), cam: { ...centre(PILL), z: 3.15, ry: -2 } },
  { f: SEATED, cam: { ...FULL, ry: 0 }, ease: EASE.inOut },
  { f: FRAME2 - sec(0.5), cam: { ...FULL, z: 1.33 } },
  { f: FRAME2, cam: TALK, ease: EASE.inOut },
  { f: CUT, cam: { ...TALK, z: 1.77 }, ease: EASE.linear },
];

// ---- the phone: Show grows out of its button, then Flip -------------------------------------------------
const SHOW_BTN = box(PHONE, 'show');
const MESSAGE = box(SHOW_UP, 'show-message');
const FLIP_BTN = box(SHOW_UP, 'show-flip');
const PHONE_FRAME = { bezel: 18, radius: 56 };
/** The whole phone on the cut; a push in as the Show screen opens, so its big text fills the frame; then the lay-back. */
const PHONE_CAM = [
  { f: CUT, cam: { x: 195, y: 350, z: 1.24, ry: -5 } },
  { f: SHOW_OPEN - 2, cam: { x: 195, y: 350, z: 1.28, ry: -3 }, ease: EASE.out },
  { f: SHOW_OPEN + SHOW_LEN + sec(0.2), cam: { x: 195, y: 330, z: 1.46, ry: -2 }, ease: EASE.inOut },
  { f: LAY, cam: { x: 195, y: 330, z: 1.48, ry: -1 }, ease: EASE.linear },
  { f: LAY + LAY_LEN, cam: { x: 195, y: 318, z: 1.08, ry: 0, rx: 46 }, ease: EASE.inOut },
  { f: END, cam: { x: 195, y: 316, z: 1.06, ry: 0, rx: 47 } },
];

const PhoneShow: React.FC<{ frame: number }> = ({ frame }) => {
  const open = ramp(frame, SHOW_OPEN, SHOW_LEN, 0, 1, EASE.camera);
  const turn = ramp(frame, FLIP, TURN, 0, 1, EASE.inOut);
  const wind = frame < FLIP ? ramp(frame, FLIP - WIND, WIND, 0, 1, EASE.out) : 1 - ramp(frame, FLIP, sec(0.2), 0, 1, EASE.out);
  const flipped = frame >= FLIP + TURN;
  const r = PHONE_FRAME.radius - PHONE_FRAME.bezel;
  // The Show screen grows from the Show button's rectangle to the whole screen (a container transform).
  const inset = {
    t: mix(SHOW_BTN.y, 0, open),
    r: mix(390 - SHOW_BTN.x - SHOW_BTN.w, 0, open),
    b: mix(700 - SHOW_BTN.y - SHOW_BTN.h, 0, open),
    l: mix(SHOW_BTN.x, 0, open),
    round: mix(20, r, open),
  };
  return (
    <>
      <div style={{ position: 'absolute', left: -PHONE_FRAME.bezel, top: -PHONE_FRAME.bezel, width: 390 + 2 * PHONE_FRAME.bezel, height: 700 + 2 * PHONE_FRAME.bezel, borderRadius: PHONE_FRAME.radius, background: C.surface, boxShadow: `inset 0 0 0 2px ${C.lineStrong}, 0 40px 120px rgba(8,4,20,0.6)` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 700, borderRadius: r, overflow: 'hidden' }}>
        <Tile c={PHONE} src={{ x: 0, y: 0, w: 390, h: 700 }} />
        {frame >= SHOW_OPEN ? (
          <div style={{ position: 'absolute', inset: 0, clipPath: `inset(${inset.t}px ${inset.r}px ${inset.b}px ${inset.l}px round ${inset.round}px)` }}>
            {flipped ? (
              <Tile c={SHOW_FLIP} src={{ x: 0, y: 0, w: 390, h: 700 }} />
            ) : (
              <>
                <Tile c={SHOW_UP} src={{ x: 0, y: 0, w: 390, h: 700 }} />
                {frame >= FLIP - WIND ? (
                  <>
                    {/* The message turns 180 degrees in place, exactly as the app's Flip does. */}
                    <div style={{ position: 'absolute', left: MESSAGE.x, top: MESSAGE.y, width: MESSAGE.w, height: MESSAGE.h, background: C.night }} />
                    <Tile c={SHOW_UP} src={MESSAGE} rotate={180 * turn - 4 * wind} />
                  </>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
      <TouchRing x={SHOW_BTN.x + SHOW_BTN.w / 2} y={SHOW_BTN.y + SHOW_BTN.h / 2} d={70} at={TAP_SHOW} hold={6} />
      <TouchRing x={FLIP_BTN.x + FLIP_BTN.w / 2} y={FLIP_BTN.y + FLIP_BTN.h / 2} d={70} at={TAP_FLIP} hold={6} />
    </>
  );
};

export const S12B: React.FC = () => {
  const frame = useCurrentFrame();
  const phone = frame >= CUT;
  const pillIn = ramp(frame, 0, PILL_IN, 0, 1, EASE.camera);
  const lcam = camAt(frame, LAPTOP_CAM);
  // The strip arrives from the right on the cut (content moving left: the next thing).
  const laptopCam = { ...lcam, x: lcam.x - 70 * (1 - pillIn) };
  const ptr = pointerAt(frame, POINTER);
  const ptrOn = frame >= POINTER[0]!.f;
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <StudioGround glow={{ x: 50, y: 46, r: 70, strength: 0.9 }} haze={0.4} />
      {!phone ? (
        <PlaneView cam={laptopCam}>
          <LaptopScreen frame={frame} />
          {ptrOn ? <Pointer x={ptr.x} y={ptr.y} click={ptr.click} opacity={ramp(frame, POINTER[0]!.f, sec(0.15), 0, 1)} /> : null}
        </PlaneView>
      ) : (
        <PlaneView cam={camAt(frame, PHONE_CAM)}>
          <PhoneShow frame={frame} />
        </PlaneView>
      )}

      {/* Sound: a soft hit on the cut, ticks where things land or are pressed, one whoosh in the pause, the flip. */}
      <Sfx id="sub-hit" at={0} volume={0.3} />
      <Sfx id="tick" at={PILL_IN} volume={0.25} />
      <Sfx id="whoosh-3" at={ASSEMBLE + FLY_LEN - sec(0.45)} volume={0.45} />
      <Sfx id="tick" at={ASSEMBLE + FLY_LEN + 4 * FLY_GAP} volume={0.28} />
      <Sfx id="tick" at={CLICK_LISTEN} volume={0.4} />
      <Sfx id="tick" at={CLICK_DONE} volume={0.35} />
      <Sfx id="tick" at={CLICK_YES} volume={0.45} />
      <Sfx id="sub-hit" at={CUT} volume={0.22} />
      <Sfx id="tick" at={TAP_SHOW} volume={0.4} />
      <Sfx id="tick" at={TAP_FLIP} volume={0.35} />
      <Sfx id="flip" at={FLIP} volume={0.7} />
      <Sfx id="whoosh-1" at={LAY + LAY_LEN - sec(0.45)} volume={0.3} />
    </AbsoluteFill>
  );
};
