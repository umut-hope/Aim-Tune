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
 *
 * Tracking often cannot tell two distances apart (reaction lag dominates).
 * Its say is therefore scaled by the share of its rounds that were actually
 * decided: a tracking part that decided nothing does not move the result.
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

/** Flick part of the full test: the flick defaults. */
export const FULL_FLICK_SEARCH: Readonly<SearchOptions> = {}

/** Tracking part of the full test: fewer rounds than tracking-only, the same rules. */
export const FULL_TRACKING_SEARCH: Readonly<SearchOptions> = {
  ...TRACKING_SEARCH,
  rounds: 3,
  shotsPerBlock: 3,
  warmupShots: 1,
}

/** Weighted geometric mean of two distances. */
function blend(a: number, b: number, w: SkillWeights): number {
  if (w.tracking === 0) return a
  if (w.flick === 0) return b
  return Math.exp(w.flick * Math.log(a) + w.tracking * Math.log(b))
}

export interface BlendedResult {
  range: Range
  center: number
  /** Weights the player chose. */
  weights: SkillWeights
  /** Weights actually applied, after scaling tracking by how much it decided. */
  applied: SkillWeights
  /** Share of tracking rounds that picked a winner, 0..1. */
  trackingDecided: number
  flick: SearchResult
  tracking: SearchResult
  /** Where tracking alone pointed compared with flicks; 'unknown' if it decided nothing. */
  trackingLean: 'shorter' | 'longer' | 'same' | 'unknown'
}

/** Share of rounds with a winner; 1 when no rounds are known (e.g. a shared link). */
export function decidedShare(result: SearchResult): number {
  if (result.rounds.length === 0) return 1
  return result.rounds.filter((r) => r.winner !== null).length / result.rounds.length
}

/** Tracking weight scaled by how much the tracking part could tell. */
export function appliedWeights(weights: SkillWeights, trackingDecided: number): SkillWeights {
  const tracking = weights.tracking * Math.min(1, Math.max(0, trackingDecided))
  return { flick: 1 - tracking, tracking }
}

/** Results this far apart (±7%) count as pointing somewhere else. */
const LEAN_THRESHOLD = 0.07

export function blendResults(flick: SearchResult, tracking: SearchResult, weights: SkillWeights): BlendedResult {
  if (!(weights.flick >= 0 && weights.tracking >= 0 && Math.abs(weights.flick + weights.tracking - 1) < 1e-9)) {
    throw new RangeError('weights must be non-negative and add up to 1')
  }
  const trackingDecided = decidedShare(tracking)
  const applied = appliedWeights(weights, trackingDecided)
  const ratio = tracking.center / flick.center
  return {
    range: {
      lo: blend(flick.range.lo, tracking.range.lo, applied),
      hi: blend(flick.range.hi, tracking.range.hi, applied),
    },
    center: blend(flick.center, tracking.center, applied),
    weights,
    applied,
    trackingDecided,
    flick,
    tracking,
    trackingLean:
      trackingDecided === 0
        ? 'unknown'
        : ratio < 1 - LEAN_THRESHOLD
          ? 'shorter'
          : ratio > 1 + LEAN_THRESHOLD
            ? 'longer'
            : 'same',
  }
}
