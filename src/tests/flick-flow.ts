/**
 * Flow of the flick test: warm-up, blocks of shots, round summaries, pause.
 * A pure state machine on top of the search procedure. The scene feeds it the
 * camera direction and the time; it says where the target is and what to show.
 *
 * Phases:
 *   ready          waiting for the player to start the next block
 *   waiting        player returns to the home dot; after a short random delay
 *                  on it, the next target appears
 *   aiming         target visible, waiting for the click
 *   round-summary  both distances of a round tested; show which scored better
 *   paused         Esc pressed; a shot in progress is discarded
 *   done           search finished, `result` is set
 */
import {
  angleBetween,
  flickError,
  randomTargetSpec,
  targetDirection,
  type TargetSpec,
  type TargetSpecOptions,
  type Vec3,
} from '../core/angles'
import type { Shot } from '../core/scoring'
import {
  createSearch,
  isDone,
  nextBlock,
  searchResult,
  submitBlock,
  type BlockRequest,
  type RoundResult,
  type SearchOptions,
  type SearchResult,
  type SearchState,
} from '../core/search'

export type FlickPhase = 'ready' | 'waiting' | 'aiming' | 'round-summary' | 'paused' | 'done'

export interface FlickFlowConfig {
  search: SearchOptions
  targets: TargetSpecOptions
  /**
   * Fixed direction the player returns to before every target, so each flick
   * starts from the same place and every target appears on screen.
   */
  home: Vec3
  /** How close to `home` the crosshair must be, degrees. */
  homeTolerance: number
  /** Random delay on the home dot before each target, ms, so it cannot be anticipated. */
  spawnDelayMs: readonly [number, number]
  /** Returns values in [0, 1). Seeded in tests. */
  rng: () => number
}

export interface ActiveTarget {
  spec: TargetSpec
  /** Camera direction when the target appeared. */
  start: Vec3
  direction: Vec3
  shownAt: number
}

export interface FlickFlowState {
  readonly config: FlickFlowConfig
  readonly search: SearchState
  readonly phase: FlickPhase
  /** Phase to return to after a pause. */
  readonly pausedFrom: FlickPhase | null
  /** Block being run (or about to run). Null when done. */
  readonly block: BlockRequest | null
  readonly shots: readonly Shot[]
  readonly target: ActiveTarget | null
  /** When the next target appears; null until the player is on the home dot. */
  readonly spawnAt: number | null
  /** Most recently finished round, for the between-rounds panel. */
  readonly lastRound: RoundResult | null
  readonly result: SearchResult | null
}

export function createFlickFlow(config: Partial<FlickFlowConfig> = {}): FlickFlowState {
  const resolved: FlickFlowConfig = {
    search: config.search ?? {},
    targets: config.targets ?? {},
    home: config.home ?? [0, 0, -1],
    homeTolerance: config.homeTolerance ?? 2,
    spawnDelayMs: config.spawnDelayMs ?? [400, 1000],
    rng: config.rng ?? Math.random,
  }
  const [lo, hi] = resolved.spawnDelayMs
  if (!(lo >= 0 && hi >= lo)) throw new RangeError(`invalid spawn delay ${lo}–${hi}`)
  if (!(resolved.homeTolerance > 0)) throw new RangeError('homeTolerance must be positive')

  const search = createSearch(resolved.search)
  return {
    config: resolved,
    search,
    phase: 'ready',
    pausedFrom: null,
    block: nextBlock(search),
    shots: [],
    target: null,
    spawnAt: null,
    lastRound: null,
    result: null,
  }
}

function spawnDelay(config: FlickFlowConfig): number {
  const [lo, hi] = config.spawnDelayMs
  return lo + config.rng() * (hi - lo)
}

/** Starts the current block, or leaves the round summary. */
export function proceed(state: FlickFlowState): FlickFlowState {
  if (state.phase === 'round-summary') return { ...state, phase: 'ready' }
  if (state.phase !== 'ready' || !state.block) return state
  return { ...state, phase: 'waiting', spawnAt: null, shots: [] }
}

/** Whether the crosshair is on the home dot. */
export function isOnHome(state: FlickFlowState, cameraDir: Vec3): boolean {
  return angleBetween(cameraDir, state.config.home) <= state.config.homeTolerance
}

/**
 * Shows the next target once the player has stayed on the home dot for the
 * spawn delay. Leaving the dot restarts the delay. `cameraDir` is the current
 * view direction.
 */
export function tick(state: FlickFlowState, now: number, cameraDir: Vec3): FlickFlowState {
  if (state.phase !== 'waiting') return state
  if (!isOnHome(state, cameraDir)) return state.spawnAt === null ? state : { ...state, spawnAt: null }
  if (state.spawnAt === null) return { ...state, spawnAt: now + spawnDelay(state.config) }
  if (now < state.spawnAt) return state

  const spec = randomTargetSpec(state.config.rng, state.config.targets)
  return {
    ...state,
    phase: 'aiming',
    spawnAt: null,
    target: {
      spec,
      start: cameraDir,
      direction: targetDirection(cameraDir, spec.angleDeg, spec.directionDeg),
      shownAt: now,
    },
  }
}

/** Records a click at the current camera direction. Ignored unless a target is visible. */
export function click(state: FlickFlowState, now: number, cameraDir: Vec3): FlickFlowState {
  const { target, block } = state
  if (state.phase !== 'aiming' || !target || !block) return state

  const error = flickError(target.start, target.direction, cameraDir)
  const shot: Shot = {
    targetAngle: error.flickAngle,
    along: error.along,
    perpendicular: error.perpendicular,
    timeMs: now - target.shownAt,
  }
  const shots = [...state.shots, shot]

  if (shots.length < block.shots) {
    return { ...state, phase: 'waiting', target: null, shots, spawnAt: null }
  }

  const search = submitBlock(state.search, shots)
  const roundFinished = search.history.length > state.search.history.length
  const lastRound = roundFinished ? search.history[search.history.length - 1]! : state.lastRound
  const base = { ...state, search, target: null, shots: [], spawnAt: null, lastRound }

  if (isDone(search)) {
    return { ...base, phase: 'done', block: null, result: searchResult(search) }
  }
  return { ...base, phase: roundFinished ? 'round-summary' : 'ready', block: nextBlock(search) }
}

/** Pauses the test (Esc / lost pointer lock). A shot in progress is thrown away. */
export function pause(state: FlickFlowState): FlickFlowState {
  if (state.phase === 'paused' || state.phase === 'done') return state
  return { ...state, phase: 'paused', pausedFrom: state.phase, target: null, spawnAt: null }
}

export function resume(state: FlickFlowState): FlickFlowState {
  if (state.phase !== 'paused' || !state.pausedFrom) return state
  const from = state.pausedFrom
  if (from === 'waiting' || from === 'aiming') {
    return { ...state, phase: 'waiting', pausedFrom: null, spawnAt: null }
  }
  return { ...state, phase: from, pausedFrom: null }
}

/** Starts over with the same settings. */
export function restart(state: FlickFlowState): FlickFlowState {
  return createFlickFlow(state.config)
}

/** cm/360 the mouse should use right now. */
export function activeCm360(state: FlickFlowState): number | null {
  return state.block?.cm360 ?? null
}

export interface HudInfo {
  warmup: boolean
  /** 1-based round, null during the warm-up. */
  round: number | null
  rounds: number
  /** 1-based shot about to be (or being) taken. */
  shot: number
  shots: number
  cm360: number | null
}

export function hud(state: FlickFlowState): HudInfo {
  const block = state.block
  return {
    warmup: block?.kind === 'warmup',
    round: block && block.kind === 'scored' ? block.round + 1 : null,
    rounds: state.search.config.rounds,
    shot: Math.min(state.shots.length + 1, block?.shots ?? 0),
    shots: block?.shots ?? 0,
    cm360: block?.cm360 ?? null,
  }
}
