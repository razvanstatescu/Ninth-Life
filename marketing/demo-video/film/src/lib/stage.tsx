/**
 * The spatial stage (research-v2/16-spatial-tech.md; STYLE.md, "Spatial rules"). Disciplined CSS 2.5D on top of
 * lib/camera's physical camera:
 *
 *  <Studio cam vel ground shadows focusZ aperture groundDof glow>   the whole set, in this order:
 *      the sky (brand StudioGround, its haze ON the camera's horizon),
 *      the ground pass (a level dot floor and the shadows on it, in its OWN 3D context with the same camera, so it can
 *      never cut or print over an object; the far floor defocused in screen space),
 *      the object pass (your parts, world space).
 *      One HtmlInCanvas carries the motion blur for both passes (whips only: blurAbove 40 by default).
 *  <Plane x y z>                    a plane parallel to the frame at depth z. The turn comes from the camera only
 *  <Slab w h r depth face side>     real thickness: the outline in layers from z 0 to the face, so the visible sides
 *                                   are the ones the camera sees. Children are the face's content
 *  <GroundShadow x z w d lift>      a soft shadow lying on the floor (pass it in <Studio shadows>)
 *  <CastShadow x z w height>        the shadow a standing object casts away from the key light (top left, front)
 *  <DepthBlur z box dim>            defocus (and a darkening) for a plane at depth z, from the lens
 *  <Crisp w h factor>               text on 3D planes rasterized at `factor` x: wrap faces read at zoom up to 1.5
 *
 * Rules: objects are opaque (recede by darkening and defocus, never by opacity); nothing inside the 3D chain sets
 * opacity < 1, filter, clip-path, mask or overflow on a preserve-3d element (each flattens the 3D context) except
 * <DepthBlur>, which flattens on purpose.
 */
import React, { createContext, useContext } from 'react';
import { AbsoluteFill, HtmlInCanvas } from 'remotion';
import { HEIGHT, WIDTH } from '../timeline';
import { Floor, StudioGround } from '../components/brand/Studio';
import { WHIP_BLUR_ABOVE, WorldLayer, cocAt, horizonY, motionEffects, needsCanvas, optics, type Cam } from './camera';

type StageCtx = { cam: Cam; focusZ: number; aperture: number };
const Ctx = createContext<StageCtx | null>(null);
/** The <Studio>'s camera and focus, for parts that depend on them (DepthBlur). */
export const useStage = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStage: not inside <Studio>');
  return s;
};

/** The level floor of a <Studio> (brand Floor, level). World px; `y` is where things stand. */
export type GroundLook = {
  y: number;
  x?: number;
  spacing?: number;
  dot?: number;
  /** Dots and rows drawn this much longer in depth, so at a grazing angle they read as dots in rows. Default 3. */
  aspect?: number;
  /** World px behind (far) and in front of (near) the floor line. */
  far?: number;
  near?: number;
  width?: number;
  opacity?: number;
};

type StudioProps = {
  cam: Cam;
  /** From useCamera(): motion blur on whips. */
  vel?: { vx: number; vy: number; zoomRate: number };
  /** px per frame above which the picture blurs. Default 40 (whips only; STYLE.md "Spatial rules"). */
  blurAbove?: number;
  noBlur?: boolean;
  /** The level floor, or null for none. */
  ground?: GroundLook | null;
  /** GroundShadow / CastShadow elements: they lie on the floor (floor coordinates: x across from ground.x, z towards the camera). */
  shadows?: React.ReactNode;
  /** Depth in focus (world px) and the aperture (world px; 0 = everything sharp) for <DepthBlur>. */
  focusZ?: number;
  aperture?: number;
  /** Screen-space defocus of the far floor: blur radius (px) and where it starts (0..1 from the horizon down). */
  groundDof?: { radius: number; from?: number };
  /** The sky's moon glow (percent of the frame), and the haze strength (0..1). */
  glow?: { x: number; y: number; r?: number; strength?: number };
  haze?: number;
  children: React.ReactNode;
};

export const Studio: React.FC<StudioProps> = ({ cam, vel, blurAbove = WHIP_BLUR_ABOVE, noBlur, ground, shadows, focusZ = 0, aperture = 0, groundDof, glow, haze, children }) => {
  const horizon = horizonY(cam);
  // Nothing may reach behind the eye: geometry there stalls Chromium in sequence renders (measured in s12). The floor's
  // near edge stops at 60% of the camera distance.
  const near = Math.min(ground?.near ?? 1400, 0.6 * optics(cam).D);
  const groundLayer = ground ? (
    <WorldLayer cam={cam}>
      <Floor level y={ground.y} x={ground.x} spacing={ground.spacing ?? 104} dot={ground.dot ?? 6} aspect={ground.aspect ?? 3} far={ground.far} near={near} width={ground.width} opacity={ground.opacity}>
        {shadows}
      </Floor>
    </WorldLayer>
  ) : null;
  // Depth of field on the floor in SCREEN space (a CSS blur on the tilted floor would blur along the floor, not on
  // screen): a sharp and a blurred copy, crossfaded by a vertical mask from the horizon down.
  let groundPass: React.ReactNode = groundLayer;
  if (groundLayer && groundDof && groundDof.radius > 0 && horizon !== null) {
    const h0 = Math.max(0, horizon);
    const a = (h0 + (HEIGHT - h0) * (groundDof.from ?? 0)) / HEIGHT;
    const b = Math.min(1, a + 0.22);
    const mask = (far: boolean) => `linear-gradient(to bottom, ${far ? 'black' : 'transparent'} ${a * 100}%, ${far ? 'transparent' : 'black'} ${b * 100}%)`;
    groundPass = (
      <>
        <AbsoluteFill style={{ maskImage: mask(false), WebkitMaskImage: mask(false) }}>{groundLayer}</AbsoluteFill>
        <AbsoluteFill style={{ filter: `blur(${groundDof.radius}px)`, maskImage: mask(true), WebkitMaskImage: mask(true) }}>{groundLayer}</AbsoluteFill>
      </>
    );
  }
  const passes = (
    <AbsoluteFill>
      {groundPass}
      <WorldLayer cam={cam}>{children}</WorldLayer>
    </AbsoluteFill>
  );
  const canvas = !noBlur && needsCanvas(vel, blurAbove);
  return (
    <Ctx.Provider value={{ cam, focusZ, aperture }}>
      <AbsoluteFill>
        <StudioGround cam={cam} glow={glow ? { r: 70, strength: 1, ...glow } : undefined} haze={haze} />
        {canvas ? (
          <HtmlInCanvas width={WIDTH} height={HEIGHT} effects={motionEffects(vel, blurAbove)}>
            {passes}
          </HtmlInCanvas>
        ) : (
          passes
        )}
      </AbsoluteFill>
    </Ctx.Provider>
  );
};

/** A plane parallel to the frame at depth z, its content's (0, 0) at world (x, y). */
export const Plane: React.FC<{ x?: number; y?: number; z?: number; children: React.ReactNode }> = ({ x = 0, y = 0, z = 0, children }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, transform: `translateZ(${z}px)`, transformStyle: 'preserve-3d' }}>{children}</div>
);

/**
 * Sharp text on 3D planes. Chromium rasterizes a 3D-transformed layer at a scale it snaps from the transform; between
 * zoom 1.08 and 1.42 that scale stays at 1, so text is up-sampled (75-82% of screen-text sharpness). <Crisp> lays its
 * content out `factor` x larger (CSS zoom) and scales it back, so the layer is rasterized `factor` x finer: 92-99.7%
 * for zoom 1-1.5 with factor 2. Leave it off at zoom 1.5-3 (factor 2 there costs sharpness); read nothing at 3.5.
 * Children keep their normal px values and are laid out in a w x h box.
 */
export const Crisp: React.FC<{ w: number; h: number; factor?: number; children: React.ReactNode }> = ({ w, h, factor = 2, children }) =>
  factor <= 1 ? (
    <div style={{ position: 'relative', width: w, height: h }}>{children}</div>
  ) : (
    <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `scale(${1 / factor})` }}>
      <div style={{ position: 'relative', width: w, height: h, zoom: factor }}>{children}</div>
    </div>
  );

/**
 * A rounded slab with thickness: `layers` copies of its outline from the back (z = 0) to the face (z = depth); the face
 * carries `children` (laid out in a w x h box, through <Crisp> unless crisp = 1). The side layers are shaded lighter at
 * the top left (the key light), so the sliver the camera sees on top reads lit and the one on the right in shade.
 * `outline` replaces the rounded rect with an SVG path (one silhouette for things that belong together, such as a card
 * and its teeth: then nothing is cut by its own body).
 */
export const Slab: React.FC<{
  w: number;
  h: number;
  r: number;
  depth: number;
  face: string;
  side: string;
  sideLit?: string;
  layers?: number;
  border?: { width: number; color: string; dashed?: boolean };
  outline?: { d: string; box: { x: number; y: number; w: number; h: number } };
  faceStyle?: React.CSSProperties;
  crisp?: number;
  children?: React.ReactNode;
}> = ({ w, h, r, depth, face, side, sideLit, layers = 6, border, outline, faceStyle, crisp = 2, children }) => {
  const n = Math.max(2, layers);
  const sideFill = `linear-gradient(165deg, ${sideLit ?? side} 0%, ${side} 55%)`;
  const shape = (fill: string, z: number, key: string, stroke?: { width: number; color: string; dashed?: boolean }) =>
    outline ? (
      <svg
        key={key}
        width={outline.box.w}
        height={outline.box.h}
        viewBox={`${outline.box.x} ${outline.box.y} ${outline.box.w} ${outline.box.h}`}
        style={{ position: 'absolute', left: outline.box.x, top: outline.box.y, transform: `translateZ(${z}px)`, overflow: 'visible' }}
      >
        <path d={outline.d} fill={fill} stroke={stroke?.color ?? 'none'} strokeWidth={stroke?.width ?? 0} strokeDasharray={stroke?.dashed ? `${stroke.width * 2.6} ${stroke.width * 1.8}` : undefined} strokeLinejoin="round" />
      </svg>
    ) : (
      <div
        key={key}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: w,
          height: h,
          boxSizing: 'border-box',
          borderRadius: r,
          background: fill,
          border: stroke ? `${stroke.width}px ${stroke.dashed ? 'dashed' : 'solid'} ${stroke.color}` : undefined,
          transform: `translateZ(${z}px)`,
        }}
      />
    );
  return (
    <div style={{ position: 'relative', width: w, height: h, transformStyle: 'preserve-3d' }}>
      {Array.from({ length: n - 1 }, (_, i) => shape(outline ? side : sideFill, (depth * i) / (n - 1), `l${i}`))}
      {shape(face, depth, 'face', border)}
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translateZ(${depth + 0.5}px)`, ...faceStyle }}>
        <Crisp w={w} h={h} factor={crisp}>
          {children}
        </Crisp>
      </div>
    </div>
  );
};

/**
 * A soft shadow ON the floor at (x, z), w across and d deep (world px). Radial gradients, no CSS blur (cheap and never
 * hard-edged). `lift`: the object is that far above the floor (the shadow widens and fades). Use in <Studio shadows>.
 */
export const GroundShadow: React.FC<{ x: number; z: number; w: number; d: number; strength?: number; lift?: number }> = ({ x, z, w, d, strength = 0.6, lift = 0 }) => {
  const spread = 1 + lift / 300;
  const W = w * spread;
  const Dd = d * spread;
  const a = strength / Math.sqrt(spread);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - W / 2,
        // floor coordinates: down the floor element is towards the camera (+z)
        top: z - Dd / 2,
        width: W,
        height: Dd,
        borderRadius: '50%',
        background: `radial-gradient(closest-side, rgba(6,2,16,${a}) 0%, rgba(6,2,16,${a * 0.55}) 45%, rgba(6,2,16,${a * 0.18}) 75%, rgba(6,2,16,0) 100%)`,
      }}
    />
  );
};

/**
 * The shadow a standing object casts away from a light in front, above and to the left: a soft parallelogram on the
 * floor from its base line (x, z, width w) going back by height / tan(elevation) and sideways by the azimuth, darkest
 * at the base. `lift`: the object's base is that far above the floor (the shadow detaches and softens).
 */
export const CastShadow: React.FC<{ x: number; z: number; w: number; height: number; elevation?: number; azimuth?: number; strength?: number; lift?: number }> = ({
  x,
  z,
  w,
  height,
  elevation = 40,
  azimuth = 28,
  strength = 0.5,
  lift = 0,
}) => {
  const cot = 1 / Math.tan((elevation * Math.PI) / 180);
  const L = height * cot;
  const back = lift * cot;
  const tanAz = Math.tan((azimuth * Math.PI) / 180);
  const skew = (-Math.atan2((L + back) * tanAz, L) * 180) / Math.PI;
  const a = strength / (1 + lift / 200);
  const edge = 'linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)';
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2 + back * tanAz,
        top: z - back - L,
        width: w,
        height: L,
        transformOrigin: '50% 100%',
        transform: `skewX(${skew}deg)`,
        background: `linear-gradient(to top, rgba(6,2,16,${a}) 0%, rgba(6,2,16,${a * 0.45}) 35%, rgba(6,2,16,${a * 0.12}) 75%, rgba(6,2,16,0) 100%)`,
        maskImage: edge,
        WebkitMaskImage: edge,
      }}
    />
  );
};

/**
 * Defocus for a plane at depth z: the circle of confusion from the <Studio>'s lens, aperture and focus. It flattens its
 * subtree (a CSS filter does; a defocused slab needs no sides) and pads its box, with a painted, near-invisible
 * backdrop, so the blur is never clipped to a hard edge. Darken first: `dim` 0..1 darkens without transparency.
 * `box`: the content's extent relative to the parent's origin.
 */
export const DepthBlur: React.FC<{ z: number; box: { x: number; y: number; w: number; h: number }; pad?: number; dim?: number; max?: number; children: React.ReactNode }> = ({
  z,
  box,
  pad = 60,
  dim = 0,
  max = 18,
  children,
}) => {
  const s = useStage();
  const coc = Math.min(max, cocAt(z, s.cam, { focusZ: s.focusZ, aperture: s.aperture }));
  const local = coc / Math.max(0.05, optics(s.cam).s);
  const filters = [local > 0.3 ? `blur(${(local / 2).toFixed(2)}px)` : '', dim > 0 ? `brightness(${(1 - 0.7 * dim).toFixed(3)})` : ''].filter(Boolean).join(' ');
  if (!filters) return <>{children}</>;
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x - pad,
        top: box.y - pad,
        width: box.w + 2 * pad,
        height: box.h + 2 * pad,
        filter: filters,
        background: 'rgba(20,10,46,0.004)',
      }}
    >
      <div style={{ position: 'absolute', left: pad - box.x, top: pad - box.y }}>{children}</div>
    </div>
  );
};
