/**
 * Range-narrowing search over cm/360.
 *
 * Each round tests two distances inside the current range (at 1/4 and 3/4 of
 * it, on a log scale, since sensitivity feels proportional), scores a block of
 * flicks at each, and keeps the half around the better one. When the two
 * scores are too close to call, the flick bias decides: systematic overshoot
 * means the sens is too high (cm/360 too small), undershoot means too low.
 *
 * The search is a pure state machine: `nextBlock` says what to run next,
 * `submitBlock` returns a new state. No timers, DOM or randomness.
 */
import { DEFAULT_SCORING, summarizeBlock, type BlockSummary, type ScoringOptions, type Shot } from './scoring'

export interface Range {
  /** Smaller cm/360 (higher sens). */
  lo: number
  /** Larger cm/360 (lower sens). */
  hi: number
}

export interface SearchConfig {
  initial: Range
  rounds: number
  shotsPerBlock: number
  /** Unscored shots at the middle of the range before round 1. 0 = no warm-up. */
  warmupShots: number
  /**
   * Score difference, in standard errors, needed to pick a winner by score.
   * Below it the round is decided by flick bias.
   */
  tieZ: number
  /** Smallest share of valid shots for a block to count; otherwise it is repeated once. */
  minValidShare: number
  /** How many times an unreliable block may be repeated. */
  maxRetries: number
  /** The recommended range is at least ±this share around its centre. */
  minHalfWidth: number
  /**
   * The range also widens to ±z standard errors of the player's last-round
   * flick spread, so inconsistent aim gives an honestly wider range.
   */
  uncertaintyZ: number
  scoring: ScoringOptions
}

export type SearchOptions = Partial<Omit<SearchConfig, 'scoring'>> & {
  scoring?: Partial<ScoringOptions>
}

/** Default starting range when the player's current sens is unknown. */
export const DEFAULT_RANGE: Readonly<Range> = { lo: 20, hi: 60 }

export const DEFAULT_SEARCH: Readonly<Omit<SearchConfig, 'initial' | 'scoring'>> = {
  rounds: 5,
  shotsPerBlock: 10,
  warmupShots: 10,
  tieZ: 1,
  minValidShare: 0.6,
  maxRetries: 1,
  minHalfWidth: 0.04,
  uncertaintyZ: 1.645,
}

export type Side = 'low' | 'high'

export interface BlockRequest {
  kind: 'warmup' | 'scored'
  cm360: number
  shots: number
  /** 0-based round index; -1 for the warm-up. */
  round: number
  side: Side | null
  /** 0 on the first try, 1+ when an unreliable block is repeated. */
  attempt: number
}

export interface BlockResult {
  cm360: number
  side: Side
  summary: BlockSummary
}

export interface RoundResult {
  round: number
  range: Range
  low: BlockResult
  high: BlockResult
  winner: Side | null
  decidedBy: 'score' | 'bias' | 'none'
  /** Optimum suggested by flick bias in this round, cm/360. NaN if unavailable. */
  biasEstimate: number
}

export interface SearchState {
  readonly config: SearchConfig
  readonly range: Range
  readonly round: number
  readonly warmupDone: boolean
  readonly attempt: number
  /** Scored block already run in the current round, if any. */
  readonly pending: BlockResult | null
  readonly history: readonly RoundResult[]
}

export interface SearchResult {
  /** Recommended cm/360 range, never narrower than ±minHalfWidth. */
  range: Range
  /** Centre of the recommendation, cm/360. */
  center: number
  /** The bracket the search ended on, before widening. */
  finalBracket: Range
  /** Half-width used for the recommendation, as a share of `center`. */
  halfWidth: number
  /**
   * Set when the search ended against an edge of the starting range and the
   * flick bias says the optimum lies beyond it.
   */
  edge: Side | null
  rounds: readonly RoundResult[]
}

function assertRange(range: Range): void {
  if (!(Number.isFinite(range.lo) && Number.isFinite(range.hi) && range.lo > 0 && range.hi > range.lo)) {
    throw new RangeError(`invalid cm/360 range ${range.lo}–${range.hi}`)
  }
}

/**
 * Starting range: ±spread around the player's current cm/360 when known,
 * otherwise the default 20–60 cm.
 */
export function initialRange(currentCm360?: number | null, spread = 0.3): Range {
  if (currentCm360 == null) return { ...DEFAULT_RANGE }
  if (!(Number.isFinite(currentCm360) && currentCm360 > 0)) {
    throw new RangeError(`current cm/360 must be a positive number, got ${currentCm360}`)
  }
  if (!(spread > 0 && spread < 1)) throw new RangeError(`spread must be in (0, 1), got ${spread}`)
  return { lo: currentCm360 * (1 - spread), hi: currentCm360 * (1 + spread) }
}

/** Plausible limits for any cm/360 the test will try. */
export const CM360_LIMITS: Readonly<Range> = { lo: 5, hi: 200 }

/**
 * Starting range for a follow-up test when the result hit an edge: centred on
 * that edge of the previous starting range, ±spread, so the search can look
 * past it. Clamped to plausible distances.
 */
export function rangeBeyond(previous: Range, edge: Side, spread = 0.3): Range {
  assertRange(previous)
  if (!(spread > 0 && spread < 1)) throw new RangeError(`spread must be in (0, 1), got ${spread}`)
  const center = edge === 'high' ? previous.hi : previous.lo
  return {
    lo: Math.max(CM360_LIMITS.lo, center * (1 - spread)),
    hi: Math.min(CM360_LIMITS.hi, center * (1 + spread)),
  }
}

export function geometricCenter(range: Range): number {
  return Math.sqrt(range.lo * range.hi)
}

/** The two distances tested in a round: 1/4 and 3/4 of the range on a log scale. */
export function testPoints(range: Range): Record<Side, number> {
  const quarter = Math.pow(range.hi / range.lo, 0.25)
  return { low: range.lo * quarter, high: range.hi / quarter }
}

/** Half of `range` (log scale) centred on `center`. */
function halveAround(range: Range, center: number): Range {
  const quarter = Math.pow(range.hi / range.lo, 0.25)
  return { lo: center / quarter, hi: center * quarter }
}

export function createSearch(options: SearchOptions = {}): SearchState {
  const { scoring, ...rest } = options
  const config: SearchConfig = {
    ...DEFAULT_SEARCH,
    initial: { ...DEFAULT_RANGE },
    ...rest,
    scoring: { ...DEFAULT_SCORING, ...scoring },
  }
  assertRange(config.initial)
  if (!(Number.isInteger(config.rounds) && config.rounds >= 1)) {
    throw new RangeError(`rounds must be a positive integer, got ${config.rounds}`)
  }
  if (!(Number.isInteger(config.shotsPerBlock) && config.shotsPerBlock >= 1)) {
    throw new RangeError(`shotsPerBlock must be a positive integer, got ${config.shotsPerBlock}`)
  }
  if (!(Number.isInteger(config.warmupShots) && config.warmupShots >= 0)) {
    throw new RangeError(`warmupShots must be a non-negative integer, got ${config.warmupShots}`)
  }
  return {
    config,
    range: { ...config.initial },
    round: 0,
    warmupDone: config.warmupShots === 0,
    attempt: 0,
    pending: null,
    history: [],
  }
}

export function isDone(state: SearchState): boolean {
  return state.round >= state.config.rounds
}

/** Rounds alternate which side goes first, so fatigue and learning hit both sides evenly. */
function sideOrder(round: number): readonly [Side, Side] {
  return round % 2 === 0 ? ['low', 'high'] : ['high', 'low']
}

/** The block to run next, or `null` when the search is finished. */
export function nextBlock(state: SearchState): BlockRequest | null {
  const { config } = state
  if (!state.warmupDone) {
    return {
      kind: 'warmup',
      cm360: geometricCenter(config.initial),
      shots: config.warmupShots,
      round: -1,
      side: null,
      attempt: 0,
    }
  }
  if (isDone(state)) return null

  const order = sideOrder(state.round)
  const side = state.pending ? order[1] : order[0]
  return {
    kind: 'scored',
    cm360: testPoints(state.range)[side],
    shots: config.shotsPerBlock,
    round: state.round,
    side,
    attempt: state.attempt,
  }
}

/** Optimum implied by one block's bias: overshooting by b means the hand expected cm × (1 + b). */
function impliedOptimum(block: BlockResult): number {
  const b = block.summary.bias
  if (!Number.isFinite(b)) return Number.NaN
  return block.cm360 * (1 + Math.max(b, -0.9))
}

function biasEstimate(low: BlockResult, high: BlockResult): number {
  const estimates = [impliedOptimum(low), impliedOptimum(high)].filter(Number.isFinite)
  if (estimates.length === 0) return Number.NaN
  return Math.exp(estimates.reduce((acc, e) => acc + Math.log(e), 0) / estimates.length)
}

export function decideRound(
  low: BlockResult,
  high: BlockResult,
  tieZ: number,
): { winner: Side | null; decidedBy: RoundResult['decidedBy']; biasEstimate: number } {
  const estimate = biasEstimate(low, high)
  const ls = low.summary
  const hs = high.summary
  const lowOk = Number.isFinite(ls.score)
  const highOk = Number.isFinite(hs.score)

  if (lowOk && highOk) {
    const diff = hs.score - ls.score
    const margin = tieZ * Math.hypot(ls.scoreError, hs.scoreError)
    if (Math.abs(diff) > margin) {
      return { winner: diff > 0 ? 'high' : 'low', decidedBy: 'score', biasEstimate: estimate }
    }
  } else if (lowOk !== highOk) {
    return { winner: lowOk ? 'low' : 'high', decidedBy: 'score', biasEstimate: estimate }
  }

  if (Number.isFinite(estimate)) {
    const distLow = Math.abs(Math.log(estimate / low.cm360))
    const distHigh = Math.abs(Math.log(estimate / high.cm360))
    if (distLow !== distHigh) {
      return { winner: distLow < distHigh ? 'low' : 'high', decidedBy: 'bias', biasEstimate: estimate }
    }
  }
  if (lowOk && highOk && ls.score !== hs.score) {
    return { winner: hs.score > ls.score ? 'high' : 'low', decidedBy: 'score', biasEstimate: estimate }
  }
  return { winner: null, decidedBy: 'none', biasEstimate: estimate }
}

/**
 * Records the shots of the block returned by `nextBlock`. Unreliable blocks
 * (too many invalid shots) are repeated up to `maxRetries` times.
 */
export function submitBlock(state: SearchState, shots: readonly Shot[]): SearchState {
  const request = nextBlock(state)
  if (!request) throw new Error('search is already finished')
  const { config } = state

  if (request.kind === 'warmup') return { ...state, warmupDone: true }

  const summary = summarizeBlock(shots, config.scoring)
  const needed = Math.ceil(config.minValidShare * config.shotsPerBlock)
  if (summary.validCount < needed && state.attempt < config.maxRetries) {
    return { ...state, attempt: state.attempt + 1 }
  }

  const side = request.side!
  const block: BlockResult = { cm360: request.cm360, side, summary }
  if (!state.pending) return { ...state, pending: block, attempt: 0 }

  const low = side === 'low' ? block : state.pending
  const high = side === 'high' ? block : state.pending
  const decision = decideRound(low, high, config.tieZ)
  const center = decision.winner ? testPoints(state.range)[decision.winner] : geometricCenter(state.range)

  const result: RoundResult = { round: state.round, range: state.range, low, high, ...decision }
  return {
    ...state,
    range: halveAround(state.range, center),
    round: state.round + 1,
    attempt: 0,
    pending: null,
    history: [...state.history, result],
  }
}

const EDGE_TOLERANCE = 1e-9

/** Standard error of the mean relative along error, pooled over both blocks of a round. */
function lastRoundSpreadError(round: RoundResult | undefined): number {
  if (!round) return 0
  const parts = [round.low.summary, round.high.summary].filter(
    (s) => Number.isFinite(s.biasSpread) && s.validCount >= 2,
  )
  const n = parts.reduce((acc, s) => acc + s.validCount, 0)
  if (n < 2) return 0
  const pooledVar =
    parts.reduce((acc, s) => acc + (s.validCount - 1) * s.biasSpread ** 2, 0) / (n - parts.length)
  return Math.sqrt(pooledVar / n)
}

/** Final recommendation, or `null` while the search is still running. */
export function searchResult(state: SearchState): SearchResult | null {
  if (!isDone(state)) return null
  const { config } = state
  const bracket = state.range
  const center = geometricCenter(bracket)
  const last = state.history[state.history.length - 1]
  const h = Math.max(config.minHalfWidth, config.uncertaintyZ * lastRoundSpreadError(last))
  const range: Range = {
    lo: Math.min(bracket.lo, center / (1 + h)),
    hi: Math.max(bracket.hi, center * (1 + h)),
  }

  let edge: Side | null = null
  if (last && Number.isFinite(last.biasEstimate)) {
    const atHigh = bracket.hi >= config.initial.hi * (1 - EDGE_TOLERANCE)
    const atLow = bracket.lo <= config.initial.lo * (1 + EDGE_TOLERANCE)
    if (atHigh && last.biasEstimate > bracket.hi) edge = 'high'
    else if (atLow && last.biasEstimate < bracket.lo) edge = 'low'
  }

  return { range, center, finalBracket: bracket, halfWidth: h, edge, rounds: state.history }
}
