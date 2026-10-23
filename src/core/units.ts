/**
 * Unit conversions. The conversion math itself lives in yawmatch and is only
 * re-exported here, so both sites always agree on the numbers.
 */
import { CM_PER_INCH, degreesPerCount, sensFromCm360 } from 'yawmatch/src/core/convert'

export {
  CM_PER_INCH,
  DEGREES_PER_TURN,
  cmPer360,
  convert360,
  countsPer360,
  degreesPerCount,
  edpi,
  inchesPer360,
  sensFromCm360,
} from 'yawmatch/src/core/convert'

/**
 * Degrees the camera turns per mouse count for a given cm/360 and DPI.
 * The test scene works in cm/360, so it uses a unit yaw (1°/count) internally:
 * the sens that gives this cm/360 at yaw 1 is exactly the degrees per count.
 */
export function degreesPerCountAtCm360(cm360: number, dpi: number): number {
  return degreesPerCount(sensFromCm360(cm360, dpi, 1), 1)
}

/** Unit for mouse travel distances shown to the player. */
export type DistanceUnit = 'cm' | 'in'

/** Converts a distance (e.g. per 360°) in `unit` to centimetres. */
export function toCm(value: number, unit: DistanceUnit): number {
  return unit === 'in' ? value * CM_PER_INCH : value
}

/** Converts centimetres to `unit`. */
export function fromCm(cm: number, unit: DistanceUnit): number {
  return unit === 'in' ? cm / CM_PER_INCH : cm
}
