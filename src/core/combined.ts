/**
 * Full test: a flick part and a tracking part in one session, blended into
 * one recommendation with weights the player picks by how their game plays.
 *
 * Why blend results instead of mixing scores: a sens that is 25% off costs a
 * flick a large share of its accuracy, but costs tracking only a few percent.
 * Mixed into one score, flicks would decide every time whatever the weights.
 * Each part therefore finds its own best range, and the two are averaged on
 * a log scale (sensitivity feels proportional). The tracking range is wider,
 * so more tracking weight both shifts the result and honestly widens it.
 */
import type { Range, SearchOptions, SearchResult } from './search'
import { TRACKING_SEARCH } from './tracking'

/** How the player's game mostly asks them to aim. */
export type AimStyle = 'flicks' | 'both' | 'tracking'

export interface SkillWeights {
  flick: number
  tracking: number
}

/** Blend weights per style; each pair adds up to 1. */
export const STYLE_WEIGHTS: Readonly<Record<AimStyle, SkillWeights>> = {
  flicks: { flick: 0.85, tracking: 0.15 },
  both: { flick: 0.6, tracking: 0.4 },
  tracking: { flick: 0.35, tracking: 0.65 },
}

/** Flick part of the full test: shorter blocks than the flick-only test. */
export const FULL_FLICK_SEARCH: Readonly<SearchOptions> = { rounds: 5, shotsPerBlock: 8, warmupShots: 6 }

/** Tracking part of the full test: fewer rounds than tracking-only, the same rules. */
export const FULL_TRACKING_SEARCH: Readonly<SearchOptions> = {
  ...TRACKING_SEARCH,
  rounds: 3,
  shotsPerBlock: 4,
  warmupShots: 1,
}

/** Weighted geometric mean of two distances. */
function blend(a: number, b: number, w: SkillWeights): number {
  return Math.exp(w.flick * Math.log(a) + w.tracking * Math.log(b))
}

export interface BlendedResult {
  range: Range
  center: number
  weights: SkillWeights
  flick: SearchResult
  tracking: SearchResult
  /** Where tracking alone pointed compared with flicks, if clearly different. */
  trackingLean: 'shorter' | 'longer' | 'same'
}

/** Results this far apart (±7%) count as pointing somewhere else. */
const LEAN_THRESHOLD = 0.07

export function blendResults(flick: SearchResult, tracking: SearchResult, weights: SkillWeights): BlendedResult {
  if (!(weights.flick >= 0 && weights.tracking >= 0 && Math.abs(weights.flick + weights.tracking - 1) < 1e-9)) {
    throw new RangeError('weights must be non-negative and add up to 1')
  }
  const ratio = tracking.center / flick.center
  return {
    range: {
      lo: blend(flick.range.lo, tracking.range.lo, weights),
      hi: blend(flick.range.hi, tracking.range.hi, weights),
    },
    center: blend(flick.center, tracking.center, weights),
    weights,
    flick,
    tracking,
    trackingLean: ratio < 1 - LEAN_THRESHOLD ? 'shorter' : ratio > 1 + LEAN_THRESHOLD ? 'longer' : 'same',
  }
}
