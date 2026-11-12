/**
 * Time for the opening of Act 2 (scenes 6-9). S06 and S07 are one continuous shot, so their parts are
 * driven by ONE clock: frames since Act 2 bar 1 beat 1 (`t`). A scene turns its local frame into `t`
 * with `act2Offset(id)`.
 */
import { ACT2_START, SCENES, at, type SceneId } from '../../timeline';

/** Frames since Act 2 bar 1 beat 1 of a bar position (bars and beats count from 1; eighth is 0 or 1). */
export const b = (bar: number, beat = 1, eighth = 0) => at(bar, beat, eighth) - ACT2_START;

/** Add to a scene's local frame to get `t`. */
export const act2Offset = (id: SceneId) => SCENES[id].from - ACT2_START;
