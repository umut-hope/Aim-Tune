/**
 * Setup form logic: which values to prefill, and the player's current cm/360.
 */
import type { Range } from '../core/search'
import { cmPer360, toCm, type DistanceUnit } from '../core/units'
import type { ResolvedView } from '../core/view'
import type { AimStyle } from '../core/combined'
import { formatNumber, parsePositive } from './links'

/** Select value for "I know my cm/360" instead of a game. */
export const MANUAL_GAME = '__manual'

/** Form state as typed. Strings, so half-typed values like "1." survive. */
export interface SetupForm {
  gameId: string
  sens: string
  dpi: string
  /** cm/360 (or in/360) typed directly, used with MANUAL_GAME. */
  distance: string
  /** In-game FOV override, optional. */
  fov: string
}

export const DEFAULT_FORM: Readonly<SetupForm> = { gameId: '', sens: '', dpi: '800', distance: '', fov: '' }

export interface SetupSource {
  game?: string
  sens?: number
  dpi?: number
}

/**
 * Fills the form from sources in priority order (URL first, then saved
 * profile). Unknown games are skipped; a sens only counts together with the
 * game it belongs to.
 */
export function prefillForm(sources: readonly SetupSource[], isKnownGame: (id: string) => boolean): SetupForm {
  const form: SetupForm = { ...DEFAULT_FORM }

  const withGame = sources.find((s) => s.game !== undefined && isKnownGame(s.game))
  if (withGame?.game) {
    form.gameId = withGame.game
    if (withGame.sens !== undefined) form.sens = formatNumber(withGame.sens, 4)
  }

  const withDpi = sources.find((s) => s.dpi !== undefined)
  if (withDpi?.dpi !== undefined) form.dpi = formatNumber(withDpi.dpi, 0)
  return form
}

/** The player's current cm/360 from the form, or null when it cannot be worked out yet. */
export function currentCm360(form: SetupForm, gameYaw: number | null, unit: DistanceUnit): number | null {
  if (form.gameId === MANUAL_GAME) {
    const d = parsePositive(form.distance)
    return d === null ? null : toCm(d, unit)
  }
  const sens = parsePositive(form.sens)
  const dpi = parsePositive(form.dpi)
  if (sens === null || dpi === null || gameYaw === null) return null
  return cmPer360(sens, gameYaw, dpi)
}

/** Current cm/360 values outside this range are almost certainly typos. */
export function isPlausibleCm360(cm: number): boolean {
  return cm >= 5 && cm <= 200
}

export type TestKind = 'full' | 'flick' | 'tracking'

/** Everything the test needs, decided on the setup screen. */
export interface StartConfig {
  kind: TestKind
  /**
   * Counts per inch as this browser reports them (DPI × calibration). Used to
   * turn the camera; in-game sens is converted with `dpi`.
   */
  inputDpi: number
  /** How the player's game mostly asks them to aim; weights the full test. */
  style: AimStyle
  dpi: number
  view: ResolvedView
  initial: Range
  gameId: string | null
  /** Player's cm/360 before the test, if known. */
  current: number | null
}
