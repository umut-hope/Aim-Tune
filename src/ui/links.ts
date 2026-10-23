/**
 * URL parameters: setup prefill (`?game=&sens=&dpi=`), shareable results and
 * deep links into yawmatch. Nothing is stored server-side; everything a link
 * needs is in its query string.
 */

export const YAWMATCH_URL = 'https://umut-hope.github.io/Yaw-Match/'

const GAME_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_PARAM_LENGTH = 32

/** Parses a user-typed positive number; accepts "," as the decimal separator. */
export function parsePositive(input: string | null | undefined): number | null {
  if (input == null) return null
  const trimmed = input.trim().replace(',', '.')
  if (trimmed.length === 0 || trimmed.length > MAX_PARAM_LENGTH) return null
  if (!/^\d*\.?\d+$|^\d+\.$/.test(trimmed)) return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Formats a number with up to `decimals` places, trimming trailing zeros. */
export function formatNumber(n: number, decimals = 4): string {
  if (!Number.isFinite(n)) return '–'
  return String(Number(n.toFixed(decimals)))
}

function gameParam(value: string | null): string | undefined {
  return value !== null && value.length <= MAX_PARAM_LENGTH && GAME_ID.test(value) ? value : undefined
}

export interface SetupParams {
  game?: string
  sens?: number
  dpi?: number
}

/** Reads `?game=&sens=&dpi=`. Invalid values are dropped, not guessed. */
export function parseSetupParams(search: string): SetupParams {
  const params = new URLSearchParams(search)
  const out: SetupParams = {}
  const game = gameParam(params.get('game'))
  const sens = parsePositive(params.get('sens'))
  const dpi = parsePositive(params.get('dpi'))
  if (game) out.game = game
  if (sens !== null) out.sens = sens
  if (dpi !== null) out.dpi = dpi
  return out
}

export interface ResultParams {
  /** Recommended range, cm/360. */
  lo: number
  hi: number
  /** Player's cm/360 before the test, if known. */
  current?: number
  game?: string
  dpi?: number
  /** Set when the best distance may lie beyond the tested range. */
  edge?: 'low' | 'high'
  /** Which test produced it. Flick when absent. */
  test?: 'flick' | 'tracking'
}

/** Query string for a shareable result link. */
export function resultQuery(r: ResultParams): string {
  const params = new URLSearchParams()
  params.set('lo', formatNumber(r.lo, 1))
  params.set('hi', formatNumber(r.hi, 1))
  if (r.current !== undefined) params.set('cur', formatNumber(r.current, 1))
  if (r.game !== undefined) params.set('game', r.game)
  if (r.dpi !== undefined) params.set('dpi', formatNumber(r.dpi, 0))
  if (r.edge !== undefined) params.set('edge', r.edge)
  if (r.test === 'tracking') params.set('test', 'tracking')
  return `?${params.toString()}`
}

/** Reads a shared result, or null when the query is not a (valid) result link. */
export function parseResultParams(search: string): ResultParams | null {
  const params = new URLSearchParams(search)
  const lo = parsePositive(params.get('lo'))
  const hi = parsePositive(params.get('hi'))
  if (lo === null || hi === null || lo >= hi || hi > 500) return null

  const out: ResultParams = { lo, hi }
  const current = parsePositive(params.get('cur'))
  const game = gameParam(params.get('game'))
  const dpi = parsePositive(params.get('dpi'))
  const edge = params.get('edge')
  if (current !== null && current <= 500) out.current = current
  if (game) out.game = game
  if (dpi !== null) out.dpi = dpi
  if (edge === 'low' || edge === 'high') out.edge = edge
  if (params.get('test') === 'tracking') out.test = 'tracking'
  return out
}

/** Deep link into yawmatch's converter, prefilled with a game, sens and DPI. */
export function yawmatchLink(from?: { game: string; sens: number; dpi?: number }): string {
  if (!from) return YAWMATCH_URL
  const params = new URLSearchParams()
  params.set('from', from.game)
  params.set('sens', formatNumber(from.sens, 4))
  if (from.dpi !== undefined) params.set('dpi', formatNumber(from.dpi, 0))
  return `${YAWMATCH_URL}?${params.toString()}`
}
