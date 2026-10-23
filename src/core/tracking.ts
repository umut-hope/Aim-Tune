/**
 * Tracking: following a moving target with the crosshair. Pure functions.
 *
 * A trial starts with the target on the home direction; it then moves along a
 * smooth path for a few seconds. Every frame the error between crosshair and
 * target is split along the target's motion: positive = ahead of it (the sens
 * carries the hand too far, like overshoot), negative = behind it (lagging,
 * like undershoot). Scores and biases are shaped like flick blocks so the same
 * search procedure can narrow the range.
 */
import {
  TARGET_ANGULAR_RADIUS_DEG,
  add,
  angleBetween,
  cross,
  directionFromYawPitch,
  dot,
  normalize,
  scale,
  toDegrees,
  type Vec3,
} from './angles'
import { mean, sampleSd, type BlockSummary } from './scoring'
import type { SearchOptions } from './search'
import { horizontalFromVertical, type View } from './view'

/** Sum of two sines per axis: smooth, bounded, and hard to predict. */
export interface TrackPath {
  yaw: readonly [Wave, Wave]
  pitch: Wave
  /**
   * Seconds over which the target speeds up from rest, so a run does not open
   * with the target darting away before anyone can react. 0 = full speed at once.
   */
  rampSec?: number
}

interface Wave {
  amplitude: number
  /** Radians per second. */
  frequency: number
  phase: number
}

export interface PathOptions {
  /** Typical angular speed of the target, degrees per second. */
  speed: number
  /** Ease-in time from rest to full speed, seconds. */
  rampSec: number
  /** Share of the half-screen the path may use. */
  spread: number
}

export const DEFAULT_PATH: Readonly<PathOptions> = { speed: 35, rampSec: 0.4, spread: 0.7 }

/** A wave offset so that it is 0 at t = 0: every path starts on the home direction. */
const waveAt = (w: Wave, t: number): number => w.amplitude * (Math.sin(w.frequency * t + w.phase) - Math.sin(w.phase))
const waveRate = (w: Wave, t: number): number => w.amplitude * w.frequency * Math.cos(w.frequency * t + w.phase)

export function randomPath(rng: () => number, view: View, options: Partial<PathOptions> = {}): TrackPath {
  const o = { ...DEFAULT_PATH, ...options }
  if (!(o.speed > 0 && o.spread > 0 && o.spread <= 1 && o.rampSec >= 0)) throw new RangeError('invalid path options')
  // Offsets from waveAt reach at most twice the amplitude, so halve the limits.
  const yawLimit = ((horizontalFromVertical(view.verticalFov, view.aspect) / 2) * o.spread) / 2
  const pitchLimit = ((view.verticalFov / 2) * o.spread) / 2
  const a1 = yawLimit * 0.65
  const a2 = yawLimit * 0.35
  // Peak yaw speed ≈ a1·f1 + a2·f2; pick f1 so it lands near the requested speed.
  const f1 = (o.speed * (0.85 + rng() * 0.3)) / (a1 + a2 * 1.7)
  return {
    yaw: [
      { amplitude: a1, frequency: f1, phase: rng() * Math.PI * 2 },
      { amplitude: a2, frequency: f1 * 1.7, phase: rng() * Math.PI * 2 },
    ],
    pitch: { amplitude: pitchLimit * 0.5, frequency: f1 * 0.8, phase: rng() * Math.PI * 2 },
    rampSec: o.rampSec,
  }
}

/**
 * The path's own clock: during the ramp it runs slower, so the target's speed
 * grows linearly from 0 to full. Afterwards it runs at the normal rate.
 */
function pathTime(path: TrackPath, t: number): number {
  const r = path.rampSec ?? 0
  if (r <= 0 || t <= 0) return t
  return t < r ? (t * t) / (2 * r) : t - r / 2
}

/** How fast the path's clock runs at real time `t` (0..1). */
function pathRate(path: TrackPath, t: number): number {
  const r = path.rampSec ?? 0
  if (r <= 0 || t >= r) return 1
  return Math.max(0, t / r)
}

/** Target position at time `t` (seconds), as yaw/pitch offsets from home (degrees). */
export function pathAt(path: TrackPath, t: number): { yaw: number; pitch: number } {
  const u = pathTime(path, t)
  return { yaw: waveAt(path.yaw[0], u) + waveAt(path.yaw[1], u), pitch: waveAt(path.pitch, u) }
}

export function pathDirection(path: TrackPath, t: number): Vec3 {
  const p = pathAt(path, t)
  return directionFromYawPitch(p.yaw, p.pitch)
}

/** Angular speed of the target at time `t`, degrees per second. */
export function pathSpeed(path: TrackPath, t: number): number {
  const p = pathAt(path, t)
  const u = pathTime(path, t)
  const k = pathRate(path, t)
  const yawRate = (waveRate(path.yaw[0], u) + waveRate(path.yaw[1], u)) * Math.cos((p.pitch * Math.PI) / 180)
  return k * Math.hypot(yawRate, waveRate(path.pitch, u))
}

export interface TrackingError {
  /** Angle between crosshair and target, degrees. */
  total: number
  /** Signed error along the target's motion: positive = ahead, negative = behind. */
  along: number
  /** Signed error across the motion, degrees. */
  across: number
}

/**
 * Splits the crosshair's miss along and across the direction the target is
 * moving. With a still target everything is reported as `across`.
 */
export function trackingError(camera: Vec3, path: TrackPath, t: number): TrackingError {
  const target = pathDirection(path, t)
  const c = normalize(camera)
  const total = angleBetween(c, target)
  const h = 1e-3
  const motion = add(pathDirection(path, t + h), scale(pathDirection(path, t - h), -1))
  // Tangent of motion, made exactly perpendicular to the target direction.
  const tangent = add(motion, scale(target, -dot(motion, target)))
  const len = Math.hypot(tangent[0], tangent[1], tangent[2])
  if (len < 1e-12) return { total, along: 0, across: total }
  const v = scale(tangent, 1 / len)
  const n = cross(target, v)
  const forward = dot(c, target)
  return {
    total,
    along: toDegrees(Math.atan2(dot(c, v), forward)),
    across: toDegrees(Math.atan2(dot(c, n), forward)),
  }
}

export interface TrackSample {
  /** Frame duration, ms. */
  dtMs: number
  error: TrackingError
  /** Target speed during the frame, degrees per second. */
  speed: number
}

export interface TrackingScoring {
  /** Error at which a frame scores 0.5, degrees. */
  errorScale: number
  /**
   * Reaction time used to turn ahead/behind error into a relative bias:
   * a gain mismatch g gives a steady error of about (g − 1) · speed · τ.
   */
  reactionMs: number
  /** Trials with a larger mean error are treated as not tracking at all. */
  maxMeanError: number
  /** Trials shorter than this (paused, cut off) are ignored. Counts scored time only. */
  minDurationMs: number
  /**
   * Start of each run left out of the score, ms. The first moments mostly
   * measure reaction time (the target moves before the hand does), not sens.
   */
  settleMs: number
}

export const DEFAULT_TRACKING: Readonly<TrackingScoring> = {
  errorScale: TARGET_ANGULAR_RADIUS_DEG * 1.5,
  reactionMs: 200,
  maxMeanError: 15,
  minDurationMs: 1000,
  settleMs: 500,
}

export interface TrialSummary {
  durationMs: number
  /** Time-weighted score, 0..1. */
  score: number
  /** Share of time with the crosshair on the target. */
  onTarget: number
  meanError: number
  /** Time-weighted mean ahead (+) / behind (−) error, degrees. */
  meanAlong: number
  meanAbsAcross: number
  /** meanAlong relative to speed × reaction time; the flick-style bias. */
  bias: number
  valid: boolean
}

export function summarizeTrial(samples: readonly TrackSample[], options: TrackingScoring = DEFAULT_TRACKING): TrialSummary {
  let duration = 0
  let score = 0
  let onTarget = 0
  let error = 0
  let along = 0
  let across = 0
  let speed = 0
  let elapsed = 0
  for (const s of samples) {
    if (!(s.dtMs > 0)) continue
    elapsed += s.dtMs
    if (elapsed <= options.settleMs) continue
    const r = s.error.total / options.errorScale
    duration += s.dtMs
    score += s.dtMs / (1 + r * r)
    if (s.error.total <= TARGET_ANGULAR_RADIUS_DEG) onTarget += s.dtMs
    error += s.dtMs * s.error.total
    along += s.dtMs * s.error.along
    across += s.dtMs * Math.abs(s.error.across)
    speed += s.dtMs * s.speed
  }
  if (duration === 0) {
    return { durationMs: 0, score: 0, onTarget: 0, meanError: Number.NaN, meanAlong: Number.NaN, meanAbsAcross: Number.NaN, bias: Number.NaN, valid: false }
  }
  const meanError = error / duration
  const meanSpeed = speed / duration
  const meanAlong = along / duration
  const lagScale = meanSpeed * (options.reactionMs / 1000)
  return {
    durationMs: duration,
    score: score / duration,
    onTarget: onTarget / duration,
    meanError,
    meanAlong,
    meanAbsAcross: across / duration,
    bias: lagScale > 0 ? meanAlong / lagScale : 0,
    valid: duration >= options.minDurationMs && meanError <= options.maxMeanError,
  }
}

/** Combines trials into the block summary the search procedure expects. */
export function summarizeTrackingBlock(trials: readonly TrialSummary[]): BlockSummary {
  const valid = trials.filter((t) => t.valid)
  const scores = valid.map((t) => t.score)
  const biases = valid.map((t) => t.bias)
  return {
    shotCount: trials.length,
    validCount: valid.length,
    score: mean(scores),
    scoreError: scores.length >= 2 ? sampleSd(scores) / Math.sqrt(scores.length) : Number.POSITIVE_INFINITY,
    bias: mean(biases),
    biasSpread: sampleSd(biases),
    meanAlong: mean(valid.map((t) => t.meanAlong)),
    meanAbsPerpendicular: mean(valid.map((t) => t.meanAbsAcross)),
    meanTimeMs: mean(valid.map((t) => t.durationMs)),
  }
}

/** Length of one tracking run, ms (the first DEFAULT_TRACKING.settleMs are not scored). */
export const TRIAL_MS = 5000

/**
 * Search settings for tracking, tuned with simulated players. Tracking scores
 * change little near the best distance and reaction lag shifts the ahead/behind
 * bias for everyone, so rounds are decided by score alone and a round that
 * cannot tell the two distances apart keeps the range as it was. Results are
 * honestly wider than the flick test's.
 */
export const TRACKING_SEARCH: Readonly<SearchOptions> = {
  rounds: 4,
  shotsPerBlock: 3,
  warmupShots: 2,
  tieZ: 1.25,
  biasTieBreak: false,
}
