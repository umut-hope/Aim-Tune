/**
 * A/B feel test: free aiming with two sensitivities the player switches
 * between. In blind mode the A/B labels are assigned at random and only
 * revealed after the pick. Hits and time per option are recorded as context,
 * but the player's own choice is the result.
 *
 * Phases: ready (intro panel) → playing ⇄ paused (Esc) → done (after a choice).
 */

export type AbChoice = 0 | 1 | 'same'

export interface AbOption {
  /** cm/360. */
  cm360: number
  /** What the player called it before the test, e.g. "Current". */
  name: string
}

export interface AbStats {
  timeMs: number
  shots: number
  hits: number
}

export interface AbState {
  /** Options in label order: index 0 is shown as "A", 1 as "B". */
  readonly options: readonly [AbOption, AbOption]
  readonly blind: boolean
  readonly active: 0 | 1
  readonly phase: 'ready' | 'playing' | 'paused' | 'done'
  readonly stats: readonly [AbStats, AbStats]
  readonly switches: number
  readonly choice: AbChoice | null
}

export const LABELS = ['A', 'B'] as const

/** Time on each option before a choice is accepted, ms. Short, but enough to feel both. */
export const MIN_TRY_MS = 5000

export interface AbConfig {
  first: AbOption
  second: AbOption
  blind: boolean
  rng?: () => number
}

const emptyStats = (): AbStats => ({ timeMs: 0, shots: 0, hits: 0 })

export function createAbTest(config: AbConfig): AbState {
  for (const o of [config.first, config.second]) {
    if (!(Number.isFinite(o.cm360) && o.cm360 > 0)) throw new RangeError(`invalid cm/360 ${o.cm360}`)
  }
  const swap = config.blind && (config.rng ?? Math.random)() < 0.5
  const options: [AbOption, AbOption] = swap ? [config.second, config.first] : [config.first, config.second]
  return {
    options,
    blind: config.blind,
    active: 0,
    phase: 'ready',
    stats: [emptyStats(), emptyStats()],
    switches: 0,
    choice: null,
  }
}

function updateStats(state: AbState, change: (s: AbStats) => AbStats): AbState {
  const stats: [AbStats, AbStats] = [state.stats[0], state.stats[1]]
  stats[state.active] = change(stats[state.active])
  return { ...state, stats }
}

/** Leaves the intro panel and starts aiming. */
export function start(state: AbState): AbState {
  return state.phase === 'ready' ? { ...state, phase: 'playing' } : state
}

/** Switches to the other option. */
export function toggle(state: AbState): AbState {
  if (state.phase !== 'playing') return state
  return { ...state, active: state.active === 0 ? 1 : 0, switches: state.switches + 1 }
}

/** Adds play time to the active option. */
export function tick(state: AbState, dtMs: number): AbState {
  if (state.phase !== 'playing' || !(dtMs > 0)) return state
  // Cap long frames (tab in background) so they do not count as play time.
  return updateStats(state, (s) => ({ ...s, timeMs: s.timeMs + Math.min(dtMs, 250) }))
}

export function shoot(state: AbState, hit: boolean): AbState {
  if (state.phase !== 'playing') return state
  return updateStats(state, (s) => ({ ...s, shots: s.shots + 1, hits: s.hits + (hit ? 1 : 0) }))
}

export function pause(state: AbState): AbState {
  return state.phase === 'playing' ? { ...state, phase: 'paused' } : state
}

export function resume(state: AbState): AbState {
  return state.phase === 'paused' ? { ...state, phase: 'playing' } : state
}

/** True once both options were used for at least MIN_TRY_MS. */
export function canChoose(state: AbState): boolean {
  return state.stats[0].timeMs >= MIN_TRY_MS && state.stats[1].timeMs >= MIN_TRY_MS
}

export function choose(state: AbState, choice: AbChoice): AbState {
  if (state.phase === 'done' || !canChoose(state)) return state
  return { ...state, phase: 'done', choice }
}

/** The active option's cm/360, used to turn the camera. */
export function activeCm360(state: AbState): number {
  return state.options[state.active].cm360
}

export interface AbOutcome {
  choice: AbChoice
  /** The preferred option, or null for "no difference". */
  preferred: AbOption | null
  options: readonly [AbOption, AbOption]
  stats: readonly [AbStats, AbStats]
  blind: boolean
}

export function outcome(state: AbState): AbOutcome | null {
  if (state.phase !== 'done' || state.choice === null) return null
  return {
    choice: state.choice,
    preferred: state.choice === 'same' ? null : state.options[state.choice],
    options: state.options,
    stats: state.stats,
    blind: state.blind,
  }
}
