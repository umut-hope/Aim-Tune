/**
 * Flick scoring. Accuracy dominates; time to click is a secondary factor.
 *
 * Errors are judged relative to the flick size (missing a 90° flick by 5° is
 * better than missing a 20° flick by 5°), so blocks with different target
 * angles stay comparable.
 */

export interface Shot {
  /** Angle from the crosshair to the target when it appeared, degrees. */
  targetAngle: number
  /** Signed along-path error, degrees. Positive = overshoot. */
  along: number
  /** Signed perpendicular error, degrees. */
  perpendicular: number
  /** Time from target appearing to the click, milliseconds. */
  timeMs: number
}

export interface ScoringOptions {
  /** Relative error (total error / flick angle) at which accuracy drops to 0.5. */
  errorScale: number
  /** Share of the shot score that comes from time, 0..1. */
  timeWeight: number
  /** Reference time for a 0° flick, ms. A shot this fast scores 0.5 on time. */
  timeBaseMs: number
  /** Extra reference time per degree of flick, ms. */
  timePerDegMs: number
  /** Shots faster than this are treated as accidental clicks and ignored. */
  minTimeMs: number
  /** Shots slower than this are treated as the player not reacting and ignored. */
  maxTimeMs: number
  /** Shots with a relative error above this are treated as misclicks and ignored. */
  maxRelativeError: number
}

export const DEFAULT_SCORING: Readonly<ScoringOptions> = {
  errorScale: 0.1,
  timeWeight: 0.2,
  timeBaseMs: 400,
  timePerDegMs: 4,
  minTimeMs: 80,
  maxTimeMs: 4000,
  maxRelativeError: 1,
}

/**
 * Smallest flick size errors are judged against, degrees. Hand precision has a
 * floor, so missing a 5° correction by 1° should not count as a 20% miss.
 */
export const MIN_REFERENCE_ANGLE = 15

export function relativeError(shot: Shot): number {
  return Math.hypot(shot.along, shot.perpendicular) / Math.max(shot.targetAngle, MIN_REFERENCE_ANGLE)
}

export function isValidShot(shot: Shot, options: ScoringOptions = DEFAULT_SCORING): boolean {
  return (
    Number.isFinite(shot.along) &&
    Number.isFinite(shot.perpendicular) &&
    shot.targetAngle > 0 &&
    shot.timeMs >= options.minTimeMs &&
    shot.timeMs <= options.maxTimeMs &&
    relativeError(shot) <= options.maxRelativeError
  )
}

/** Accuracy part of a shot, in (0, 1]. 1 = dead centre. */
export function accuracyScore(shot: Shot, options: ScoringOptions = DEFAULT_SCORING): number {
  const r = relativeError(shot) / options.errorScale
  return 1 / (1 + r * r)
}

/** Time part of a shot, in (0, 1). Faster = higher; scaled by flick size. */
export function timeScore(shot: Shot, options: ScoringOptions = DEFAULT_SCORING): number {
  const ref = options.timeBaseMs + options.timePerDegMs * shot.targetAngle
  return ref / (ref + Math.max(0, shot.timeMs))
}

/** Score of one shot, in (0, 1). */
export function shotScore(shot: Shot, options: ScoringOptions = DEFAULT_SCORING): number {
  const w = options.timeWeight
  return (1 - w) * accuracyScore(shot, options) + w * timeScore(shot, options)
}

export interface BlockSummary {
  shotCount: number
  validCount: number
  /** Mean shot score of valid shots, 0..1. NaN when there are no valid shots. */
  score: number
  /** Standard error of `score`. Infinity with fewer than two valid shots. */
  scoreError: number
  /**
   * Mean signed along error relative to flick size. +0.1 = overshooting by 10%
   * on average, −0.1 = undershooting by 10%.
   */
  bias: number
  /** Standard deviation of the relative along error. NaN with fewer than two valid shots. */
  biasSpread: number
  /** Mean signed along error, degrees. */
  meanAlong: number
  /** Mean absolute perpendicular error, degrees. */
  meanAbsPerpendicular: number
  meanTimeMs: number
}

export const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? Number.NaN : xs.reduce((a, b) => a + b, 0) / xs.length

/** Sample standard deviation; NaN with fewer than two values. */
export const sampleSd = (xs: readonly number[]): number => {
  if (xs.length < 2) return Number.NaN
  const m = mean(xs)
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1))
}

export function summarizeBlock(
  shots: readonly Shot[],
  options: ScoringOptions = DEFAULT_SCORING,
): BlockSummary {
  const valid = shots.filter((s) => isValidShot(s, options))
  const scores = valid.map((s) => shotScore(s, options))
  const score = mean(scores)

  const scoreError = scores.length >= 2 ? sampleSd(scores) / Math.sqrt(scores.length) : Number.POSITIVE_INFINITY
  const relAlong = valid.map((s) => s.along / s.targetAngle)

  return {
    shotCount: shots.length,
    validCount: valid.length,
    score,
    scoreError,
    bias: mean(relAlong),
    biasSpread: sampleSd(relAlong),
    meanAlong: mean(valid.map((s) => s.along)),
    meanAbsPerpendicular: mean(valid.map((s) => Math.abs(s.perpendicular))),
    meanTimeMs: mean(valid.map((s) => s.timeMs)),
  }
}
