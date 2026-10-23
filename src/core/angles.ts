/**
 * Angle and flick-error math. Pure functions, no three.js dependency.
 *
 * Coordinate frame matches three.js: +X right, +Y up, camera looks down -Z.
 * Yaw is a rotation about +Y (positive turns left), pitch about the camera's
 * right axis (positive looks up). All public angles are in degrees.
 */

import { maxOnScreenAngle, type View } from './view'

export type Vec3 = readonly [number, number, number]

const DEG = Math.PI / 180
const WORLD_UP: Vec3 = [0, 1, 0]

/** Below this angle (degrees) two directions are treated as identical. */
const MIN_FLICK_DEG = 1e-6

export const toRadians = (deg: number): number => deg * DEG
export const toDegrees = (rad: number): number => rad / DEG

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

export function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k]
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function length(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2])
}

export function normalize(a: Vec3): Vec3 {
  const len = length(a)
  if (!(len > 0) || !Number.isFinite(len)) {
    throw new RangeError('cannot normalize a zero or non-finite vector')
  }
  return scale(a, 1 / len)
}

/** Angle between two directions, in degrees. Numerically stable for small angles. */
export function angleBetween(a: Vec3, b: Vec3): number {
  return toDegrees(Math.atan2(length(cross(a, b)), dot(a, b)))
}

/** View direction for a camera yaw/pitch (three.js Euler order 'YXZ'). */
export function directionFromYawPitch(yawDeg: number, pitchDeg: number): Vec3 {
  const yaw = toRadians(yawDeg)
  const pitch = toRadians(pitchDeg)
  const c = Math.cos(pitch)
  return [-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c]
}

/**
 * Screen-space basis for a view direction: `right` and `up` as the player sees
 * them. Undefined when looking straight up or down.
 */
export function viewBasis(forward: Vec3): { right: Vec3; up: Vec3 } {
  const f = normalize(forward)
  const right = normalize(cross(f, WORLD_UP))
  const up = cross(right, f)
  return { right, up }
}

/**
 * Direction of a target placed `angleDeg` away from `forward`, along the screen
 * direction `directionDeg` (0° = right, 90° = up, counter-clockwise).
 */
export function targetDirection(forward: Vec3, angleDeg: number, directionDeg: number): Vec3 {
  const f = normalize(forward)
  const { right, up } = viewBasis(f)
  const phi = toRadians(directionDeg)
  const screenDir = add(scale(right, Math.cos(phi)), scale(up, Math.sin(phi)))
  const theta = toRadians(angleDeg)
  return add(scale(f, Math.cos(theta)), scale(screenDir, Math.sin(theta)))
}

export interface FlickError {
  /** Angle between the start direction and the target. */
  flickAngle: number
  /**
   * Signed error along the flick path. Positive = overshoot (went past the
   * target), negative = undershoot (stopped short).
   */
  along: number
  /**
   * Signed error perpendicular to the flick path. Positive = counter-clockwise
   * of the flick direction (left of it, as seen when facing the way the flick goes).
   */
  perpendicular: number
  /** Total angular distance between the click direction and the target. */
  total: number
}

/**
 * Splits the miss of one flick into along-path and perpendicular parts.
 *
 * The flick path is the great circle from `start` to `target`. `along` compares
 * how far the click got along that circle with how far the target was;
 * `perpendicular` is how far the click lies off the circle.
 */
export function flickError(start: Vec3, target: Vec3, click: Vec3): FlickError {
  const s = normalize(start)
  const t = normalize(target)
  const c = normalize(click)

  const flickAngle = angleBetween(s, t)
  if (flickAngle < MIN_FLICK_DEG || flickAngle > 180 - MIN_FLICK_DEG) {
    throw new RangeError(`flick angle must be between 0° and 180° (exclusive), got ${flickAngle}`)
  }

  // Normal of the flick plane, oriented so that a positive component means
  // counter-clockwise of the flick direction.
  const n = normalize(cross(t, s))
  // Unit vector in the flick plane, 90° ahead of `s` towards the target.
  const ahead = cross(s, n)

  const offPlane = dot(c, n)
  const perpendicular = toDegrees(Math.asin(Math.max(-1, Math.min(1, offPlane))))
  const progressed = toDegrees(Math.atan2(dot(c, ahead), dot(c, s)))

  return {
    flickAngle,
    along: progressed - flickAngle,
    perpendicular,
    total: angleBetween(c, t),
  }
}

export interface TargetSpecOptions {
  /** Smallest flick angle in degrees. Default 20. */
  minAngle?: number
  /** Largest flick angle in degrees. Default 90; further limited by `view`. */
  maxAngle?: number
  /**
   * Largest tilt of the flick direction away from horizontal, in degrees.
   * Default 30: flicks are mostly left/right, as in most shooters.
   */
  maxTilt?: number
  /**
   * The test camera's view. When set, targets always appear on screen: the
   * flick is aimed at something the player can see, as in a real fight.
   */
  view?: View
  /** Share of the half-screen targets may use, with `view`. Default 0.9. */
  edgeMargin?: number
}

export interface TargetSpec {
  angleDeg: number
  /** Screen direction, 0° = right, 90° = up, counter-clockwise. */
  directionDeg: number
}

/**
 * Random flick angle and screen direction. `rng` returns values in [0, 1).
 *
 * With a `view`, the angle is capped so the target stays on screen in the
 * chosen direction. If the view is too narrow for `minAngle`, the lower bound
 * drops to half the cap rather than placing targets off screen.
 */
export function randomTargetSpec(rng: () => number, options: TargetSpecOptions = {}): TargetSpec {
  const minAngle = options.minAngle ?? 20
  const maxAngle = options.maxAngle ?? 90
  const maxTilt = options.maxTilt ?? 30
  if (!(minAngle > 0 && maxAngle <= 180 && minAngle <= maxAngle)) {
    throw new RangeError(`invalid angle range ${minAngle}–${maxAngle}`)
  }
  if (!(maxTilt >= 0 && maxTilt <= 90)) {
    throw new RangeError(`maxTilt must be between 0 and 90, got ${maxTilt}`)
  }

  const tilt = (rng() * 2 - 1) * maxTilt
  const directionDeg = rng() < 0.5 ? tilt : 180 - tilt

  let hi = maxAngle
  let lo = minAngle
  if (options.view) {
    hi = Math.min(hi, maxOnScreenAngle(options.view, directionDeg, options.edgeMargin ?? 0.9))
    if (hi < lo) lo = hi / 2
  }
  const angleDeg = lo + rng() * (hi - lo)
  return { angleDeg, directionDeg }
}
