/**
 * Flow of the tracking test. A pure state machine on top of the search, like
 * the flick flow. The scene feeds it the camera direction and the time.
 *
 * Phases:
 *   ready          waiting for the player to start the next block
 *   waiting        target sits on the home direction; holding the crosshair
 *                  on it for a moment starts the trial
 *   tracking       target moves; every frame is sampled
 *   round-summary  both distances of a round tested
 *   paused         Esc pressed; the trial in progress is discarded
 *   done           search finished, `result` is set
 */
import { TARGET_ANGULAR_RADIUS_DEG, angleBetween, type Vec3 } from '../core/angles'
import {
  createSearch,
  isDone,
  nextBlock,
  searchResult,
  submitSummary,
  type BlockRequest,
  type RoundResult,
  type SearchOptions,
  type SearchResult,
  type SearchState,
} from '../core/search'
import {
  DEFAULT_TRACKING,
  TRACKING_SEARCH,
  TRIAL_MS,
  pathDirection,
  pathSpeed,
  randomPath,
  summarizeTrackingBlock,
  summarizeTrial,
  trackingError,
  type PathOptions,
  type TrackPath,
  type TrackSample,
  type TrialSummary,
} from '../core/tracking'
import type { View } from '../core/view'

export type TrackingPhase = 'ready' | 'waiting' | 'tracking' | 'round-summary' | 'paused' | 'done'

export interface TrackingFlowConfig {
  view: View
  search: SearchOptions
  path: Partial<PathOptions>
  trialMs: number
  /** How long the crosshair must rest on the still target before it moves, ms. */
  holdMs: number
  home: Vec3
  rng: () => number
}

export interface TrackingFlowState {
  readonly config: TrackingFlowConfig
  readonly search: SearchState
  readonly phase: TrackingPhase
  readonly pausedFrom: TrackingPhase | null
  readonly block: BlockRequest | null
  /** Finished trials of the current block. */
  readonly trials: readonly TrialSummary[]
  /** Path of the current (or next) trial. */
  readonly path: TrackPath | null
  readonly holdStart: number | null
  readonly trialStart: number | null
  readonly lastFrame: number | null
  readonly samples: readonly TrackSample[]
  readonly lastRound: RoundResult | null
  readonly result: SearchResult | null
}

export function createTrackingFlow(config: Partial<TrackingFlowConfig> & { view: View }): TrackingFlowState {
  const resolved: TrackingFlowConfig = {
    view: config.view,
    search: { ...TRACKING_SEARCH, ...config.search },
    path: config.path ?? {},
    trialMs: config.trialMs ?? TRIAL_MS,
    holdMs: config.holdMs ?? 400,
    home: config.home ?? [0, 0, -1],
    rng: config.rng ?? Math.random,
  }
  const search = createSearch(resolved.search)
  return {
    config: resolved,
    search,
    phase: 'ready',
    pausedFrom: null,
    block: nextBlock(search),
    trials: [],
    path: null,
    holdStart: null,
    trialStart: null,
    lastFrame: null,
    samples: [],
    lastRound: null,
    result: null,
  }
}

const freshTrial = (state: TrackingFlowState): Partial<TrackingFlowState> => ({
  phase: 'waiting',
  path: randomPath(state.config.rng, state.config.view, state.config.path),
  holdStart: null,
  trialStart: null,
  lastFrame: null,
  samples: [],
})

/** Starts the current block, or leaves the round summary. */
export function proceed(state: TrackingFlowState): TrackingFlowState {
  if (state.phase === 'round-summary') return { ...state, phase: 'ready' }
  if (state.phase !== 'ready' || !state.block) return state
  return { ...state, ...freshTrial(state), trials: [] }
}

/** Seconds since the current trial started. */
function trialTime(state: TrackingFlowState, now: number): number {
  return state.trialStart === null ? 0 : (now - state.trialStart) / 1000
}

/** Where the target is right now, or null when none is shown. */
export function targetDirection(state: TrackingFlowState, now: number): Vec3 | null {
  if (!state.path) return null
  if (state.phase === 'waiting') return state.config.home
  if (state.phase === 'tracking') return pathDirection(state.path, trialTime(state, now))
  return null
}

/** Advances the flow by one frame. */
export function tick(state: TrackingFlowState, now: number, cameraDir: Vec3): TrackingFlowState {
  if (state.phase === 'waiting') {
    const onTarget = angleBetween(cameraDir, state.config.home) <= TARGET_ANGULAR_RADIUS_DEG
    if (!onTarget) return state.holdStart === null ? state : { ...state, holdStart: null }
    if (state.holdStart === null) return { ...state, holdStart: now }
    if (now - state.holdStart < state.config.holdMs) return state
    return { ...state, phase: 'tracking', trialStart: now, lastFrame: now, samples: [] }
  }

  if (state.phase !== 'tracking' || !state.path || state.lastFrame === null) return state

  const t = trialTime(state, now)
  const dtMs = now - state.lastFrame
  const samples =
    dtMs > 0
      ? [...state.samples, { dtMs: Math.min(dtMs, 100), speed: pathSpeed(state.path, t), error: trackingError(cameraDir, state.path, t) }]
      : state.samples
  if (t * 1000 < state.config.trialMs) return { ...state, samples, lastFrame: now }

  // A trial counts once most of it was played; the threshold follows the trial length.
  const scoring = { ...DEFAULT_TRACKING, minDurationMs: Math.min(DEFAULT_TRACKING.minDurationMs, state.config.trialMs * 0.8) }
  return finishTrial(state, summarizeTrial(samples, scoring))
}

function finishTrial(state: TrackingFlowState, trial: TrialSummary): TrackingFlowState {
  const block = state.block
  if (!block) return state
  const trials = [...state.trials, trial]
  if (trials.length < block.shots) return { ...state, ...freshTrial(state), trials }

  const search = submitSummary(state.search, summarizeTrackingBlock(trials))
  const roundFinished = search.history.length > state.search.history.length
  const lastRound = roundFinished ? search.history[search.history.length - 1]! : state.lastRound
  const base: TrackingFlowState = {
    ...state,
    search,
    trials: [],
    path: null,
    holdStart: null,
    trialStart: null,
    lastFrame: null,
    samples: [],
    lastRound,
  }
  if (isDone(search)) return { ...base, phase: 'done', block: null, result: searchResult(search) }
  return { ...base, phase: roundFinished ? 'round-summary' : 'ready', block: nextBlock(search) }
}

/** Pauses the test. The trial in progress is discarded. */
export function pause(state: TrackingFlowState): TrackingFlowState {
  if (state.phase === 'paused' || state.phase === 'done') return state
  return { ...state, phase: 'paused', pausedFrom: state.phase }
}

export function resume(state: TrackingFlowState): TrackingFlowState {
  if (state.phase !== 'paused' || !state.pausedFrom) return state
  const from = state.pausedFrom
  if (from === 'waiting' || from === 'tracking') return { ...state, ...freshTrial(state), pausedFrom: null }
  return { ...state, phase: from, pausedFrom: null }
}

export function restart(state: TrackingFlowState): TrackingFlowState {
  return createTrackingFlow(state.config)
}

export function activeCm360(state: TrackingFlowState): number | null {
  return state.block?.cm360 ?? null
}

export interface TrackingHud {
  warmup: boolean
  round: number | null
  rounds: number
  /** 1-based trial in the block. */
  trial: number
  trials: number
  cm360: number | null
  /** Share of the current trial that has passed, 0..1. */
  progress: number
}

export function hud(state: TrackingFlowState, now: number): TrackingHud {
  const block = state.block
  return {
    warmup: block?.kind === 'warmup',
    round: block && block.kind === 'scored' ? block.round + 1 : null,
    rounds: state.search.config.rounds,
    trial: Math.min(state.trials.length + 1, block?.shots ?? 0),
    trials: block?.shots ?? 0,
    cm360: block?.cm360 ?? null,
    progress: state.phase === 'tracking' ? Math.min(1, (trialTime(state, now) * 1000) / state.config.trialMs) : 0,
  }
}
