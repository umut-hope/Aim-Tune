/**
 * Mouse calibration: slide the mouse a known distance and compare the counts
 * the browser reports with what the entered DPI should give. Catches what the
 * browser does to mouse input without raw input (display scaling, Windows
 * pointer speed) and mistyped DPI. Acceleration is speed-dependent and is
 * only partly caught, so the slide should be slow and steady.
 *
 * The correction applies to turning the camera in the tests only; in-game
 * sens is still converted with the player's real DPI.
 */
import { z } from 'zod'
import { CM_PER_INCH } from '../core/units'

export const CALIBRATION_KEY = 'aimtune:calibration'
/** Long side of an A4 sheet, cm: something almost everyone has at hand. */
export const DEFAULT_REFERENCE_CM = 29.7
/** Within this, the browser's counts match the DPI and no correction is needed. */
export const MATCH_TOLERANCE = 0.03
/** A saved calibration is reused for this long. */
const MAX_AGE_DAYS = 30

/** Counts per inch the browser actually reported over a known distance. */
export function measuredDpi(counts: number, distanceCm: number): number {
  return Math.abs(counts) / (distanceCm / CM_PER_INCH)
}

export type CalibrationVerdict = 'match' | 'off' | 'implausible'

/** Ratio of reported to expected counts; 1 = the browser reports exactly the entered DPI. */
export function judgeRatio(ratio: number): CalibrationVerdict {
  // A bad slide (lifted mouse, wrong distance) gives absurd ratios.
  if (!(ratio >= 0.4 && ratio <= 2.5)) return 'implausible'
  return Math.abs(ratio - 1) <= MATCH_TOLERANCE ? 'match' : 'off'
}

const Saved = z.record(
  z.string().max(20),
  z.object({ ratio: z.number().min(0.4).max(2.5), at: z.string().max(40) }),
)

/** Saved input ratio for this browser, or null when there is none (or it is old). */
export function loadCalibration(
  storage: Pick<Storage, 'getItem'> | undefined,
  browser: string,
  now = Date.now(),
): number | null {
  try {
    const parsed = Saved.safeParse(JSON.parse(storage?.getItem(CALIBRATION_KEY) ?? 'null'))
    if (!parsed.success) return null
    const entry = parsed.data[browser]
    if (!entry) return null
    const age = now - Date.parse(entry.at)
    return Number.isFinite(age) && age <= MAX_AGE_DAYS * 24 * 60 * 60 * 1000 ? entry.ratio : null
  } catch {
    return null
  }
}

export function saveCalibration(
  storage: (Pick<Storage, 'getItem'> & Pick<Storage, 'setItem'>) | undefined,
  browser: string,
  ratio: number,
  now = Date.now(),
): void {
  try {
    const current = Saved.safeParse(JSON.parse(storage?.getItem(CALIBRATION_KEY) ?? '{}'))
    const all = current.success ? current.data : {}
    all[browser] = { ratio, at: new Date(now).toISOString() }
    storage?.setItem(CALIBRATION_KEY, JSON.stringify(all))
  } catch {
    // Not remembered; still used for this visit.
  }
}

export function clearCalibration(
  storage: (Pick<Storage, 'getItem'> & Pick<Storage, 'setItem'>) | undefined,
  browser: string,
): void {
  try {
    const current = Saved.safeParse(JSON.parse(storage?.getItem(CALIBRATION_KEY) ?? '{}'))
    if (!current.success) return
    delete current.data[browser]
    storage?.setItem(CALIBRATION_KEY, JSON.stringify(current.data))
  } catch {
    // Nothing to do.
  }
}
