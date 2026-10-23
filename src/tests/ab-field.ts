/**
 * Targets for the A/B feel test: a few spheres in front of the home direction,
 * some still and some sliding left and right. Hitting one moves it elsewhere.
 * Positions are yaw/pitch offsets (degrees) from straight ahead, so they map
 * directly onto the camera's view.
 */
import { TARGET_ANGULAR_RADIUS_DEG, angleBetween, directionFromYawPitch, type Vec3 } from '../core/angles'
import { horizontalFromVertical, type View } from '../core/view'

export interface FieldTarget {
  /** Centre of the target's path, degrees from straight ahead (positive = left). */
  yaw: number
  pitch: number
  /** Half-width of the side-to-side slide, degrees. 0 = still. */
  amplitude: number
  /** Slide speed, radians of the sine per second. */
  speed: number
  phase: number
}

export interface FieldOptions {
  count: number
  /** Share of targets that move. */
  movingShare: number
  /** Share of the half-screen targets may use. */
  spread: number
  /** Smallest angle between two targets, degrees. */
  minSeparation: number
}

export const DEFAULT_FIELD: Readonly<FieldOptions> = {
  count: 4,
  movingShare: 0.5,
  spread: 0.75,
  minSeparation: 8,
}

function limits(view: View, spread: number): { yaw: number; pitch: number } {
  return {
    yaw: (horizontalFromVertical(view.verticalFov, view.aspect) / 2) * spread,
    pitch: (view.verticalFov / 2) * spread,
  }
}

/** Where a target is at time `t` (seconds). */
export function positionAt(target: FieldTarget, t: number): { yaw: number; pitch: number } {
  return { yaw: target.yaw + target.amplitude * Math.sin(target.speed * t + target.phase), pitch: target.pitch }
}

export function directionAt(target: FieldTarget, t: number): Vec3 {
  const { yaw, pitch } = positionAt(target, t)
  return directionFromYawPitch(yaw, pitch)
}

function makeTarget(
  rng: () => number,
  view: View,
  options: FieldOptions,
  moving: boolean,
  others: readonly FieldTarget[],
  t: number,
): FieldTarget {
  const lim = limits(view, options.spread)
  let best: FieldTarget | null = null
  let bestGap = -1
  // Rejection sampling: keep the candidate furthest from the others.
  for (let attempt = 0; attempt < 30; attempt++) {
    const amplitude = moving ? 4 + rng() * 6 : 0
    const candidate: FieldTarget = {
      yaw: (rng() * 2 - 1) * Math.max(0, lim.yaw - amplitude),
      pitch: (rng() * 2 - 1) * lim.pitch,
      amplitude,
      speed: moving ? 0.8 + rng() * 1.2 : 0,
      phase: rng() * Math.PI * 2,
    }
    const dir = directionAt(candidate, t)
    const gap = Math.min(Number.POSITIVE_INFINITY, ...others.map((o) => angleBetween(dir, directionAt(o, t))))
    if (gap >= options.minSeparation) return candidate
    if (gap > bestGap) {
      best = candidate
      bestGap = gap
    }
  }
  return best!
}

export function createField(rng: () => number, view: View, options: Partial<FieldOptions> = {}): FieldTarget[] {
  const o = { ...DEFAULT_FIELD, ...options }
  const moving = Math.round(o.count * o.movingShare)
  const field: FieldTarget[] = []
  for (let i = 0; i < o.count; i++) field.push(makeTarget(rng, view, o, i < moving, field, 0))
  return field
}

/** Index of the target under the crosshair at time `t`, or -1. */
export function hitIndex(
  field: readonly FieldTarget[],
  t: number,
  cameraDir: Vec3,
  radiusDeg = TARGET_ANGULAR_RADIUS_DEG,
): number {
  let hit = -1
  let closest = Number.POSITIVE_INFINITY
  field.forEach((target, i) => {
    const d = angleBetween(cameraDir, directionAt(target, t))
    if (d <= radiusDeg && d < closest) {
      hit = i
      closest = d
    }
  })
  return hit
}

/** Replaces target `index` with a new one of the same kind (still or moving). */
export function respawn(
  field: readonly FieldTarget[],
  index: number,
  rng: () => number,
  view: View,
  t: number,
  options: Partial<FieldOptions> = {},
): FieldTarget[] {
  const o = { ...DEFAULT_FIELD, ...options }
  const old = field[index]
  if (!old) return [...field]
  const others = field.filter((_, i) => i !== index)
  const next = [...field]
  next[index] = makeTarget(rng, view, o, old.amplitude > 0, others, t)
  return next
}
