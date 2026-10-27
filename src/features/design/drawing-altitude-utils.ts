/* Drawing-altitude ruler bounds and snapping.
   Pure helper shared by the Design ruler and the Studio shell commit path. */

export const RULER_MIN = 0
export const RULER_MAX = 500
export const RULER_STEP = 0.5

export function clampSnapRuler(v: number): number {
  if (!Number.isFinite(v)) return 2.0
  return Math.min(RULER_MAX, Math.max(RULER_MIN, Math.round(v * 2) / 2))
}
