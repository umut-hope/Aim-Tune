/**
 * Unit conversions. The conversion math itself lives in yawmatch and is only
 * re-exported here, so both sites always agree on the numbers.
 */
import { degreesPerCount, sensFromCm360 } from 'yawmatch/src/core/convert'

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
