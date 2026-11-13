/**
 * Contracts between builders (07-revision-v2.md, section 6). Each constant has ONE owner, named in its
 * comment; everyone else only reads it. Change a contract only by asking its owner (through the lead).
 */

/** s05 -> s06. Owner: the Act 1 builder (the dot); the open builder reveals the old keypad around it. */
export const ACT_HANDOFF = {
  /** Screen px: the ember dot on Act 1's last frames, on night. */
  dot: { x: 960, y: 540, size: 28 },
  color: '#ffb13d',
  glow: '0 0 24px rgba(255,177,61,0.6)',
} as const;

/**
 * s09 -> s10, the fold. Owner: the mid builder (s10's first frame). The problem builder flies the 26
 * letter cells into exactly this keypad, landing on bar 18 beat 1.
 *
 * Spatial rework (2026-11-11, STYLE.md "Spatial rules"; research-v2/15, 6.2 A). s10's frame 0 is a lib/stage
 * <Studio>, built by components/mid/landing.tsx (use it for s09's last frame, so the seam is exact):
 *
 *   <Studio cam={FOLD_LANDING.cam} {...landingStage()} shadows={<LandingShadows />}>
 *     <TheySaidBack text="What do you need?" />
 *     <LandingKeypad keys={{ '4': { lit: 1 } }} spillFrom="4" spill={FOLD_LANDING.spill} />
 *   </Studio>
 *
 * - The camera: lens 5400 in lens mode, pitch 0 (rx 0), no yaw, the eye (horizon) raised to screen y 302.
 * - The keypad (Keypad body="slab": real key and panel thickness) has its panel centred on `world`, turned `turn`
 *   degrees about its vertical centre line (rotateY, inward: its left edge comes forward), and stands on the level
 *   floor: its panel's bottom edge is the floor line `floorY`. Key k's centre before the turn is
 *   `world + keyCenter(k, keySize)` (brand/Keypad); after it, x' = x cos(turn), z = -x sin(turn) (x from the panel
 *   centre), and the cap faces sit `depth * keySize / 96` px in front of the panel.
 * - `x`/`y`: where the panel's centre lands on screen (lib/camera project()).
 * - They said: on a back plane (`theySaid`, its top-left corner in world px, z -500), veiled 25%.
 */
export const FOLD_LANDING = {
  /** The camera of s10's frame 0 (lib/camera Cam). */
  cam: { x: 400, y: -8, zoom: 1, rx: 0, ry: 0, rz: 0, lens: 5400, zoomMode: 'lens', eye: 302 },
  /** World centre of the keypad panel. */
  world: { x: 0, y: 0 },
  /** Screen centre of the keypad panel at frame 0 (px), from project(). */
  x: 560,
  y: 548,
  /** Key edge in world px (keypadLayout(keySize) gives the panel: 712.5 x 926.25). At zoom 1 it shows at 86% of the frame height. */
  keySize: 190,
  /** Keypad look at frame 0 (body "slab"). */
  depth: 8,
  light: 1,
  spill: 0.14,
  body: 'slab',
  /** The keypad's own turn, degrees (rotateY about its vertical centre line; inward). */
  turn: 5,
  /** World y of the floor line: the panel's bottom edge (it stands on the floor). */
  floorY: 463.125,
  /** The camera's turn, degrees (same as cam.ry / cam.rx): none. */
  rotateY: 0,
  rotateX: 0,
  /** The <Studio> props of frame 0 besides cam, shadows and children (landing.tsx landingStage()). */
  stage: {
    ground: { y: 463.125, x: 400, width: 16000, spacing: 104, dot: 6, aspect: 3, far: 9000, near: 2400 },
    glow: { x: 34, y: 42, r: 72, strength: 1 },
    groundDof: { radius: 5 },
    aperture: 60,
    focusZ: 0,
  },
  /** They said on its back plane: top-left corner (world px), depth, scale (TheySaid `s`) and veil. On screen at (1010, 120). */
  theySaid: { x: 455, y: -445, z: -500, s: 2.2, veil: 0.25 },
  /**
   * The key that receives the ember: the letter cell under the scan highlight at the fold is "i", so it
   * lands in key 4, the first key s10 presses (the baton). At frame 0 key 4 is lit (ember fill).
   */
  emberKey: '4',
} as const;
