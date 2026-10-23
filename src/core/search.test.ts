import { describe, expect, it } from 'vitest'
import type { Shot } from './scoring'
import {
  createSearch,
  decideRound,
  geometricCenter,
  initialRange,
  rangeBeyond,
  nextBlock,
  searchResult,
  submitBlock,
  testPoints,
  type BlockResult,
  type SearchState,
} from './search'
import { summarizeBlock } from './scoring'

/** A block of identical shots with the given relative along error. */
const shots = (n: number, relAlong: number, extra: Partial<Shot> = {}): Shot[] =>
  Array.from({ length: n }, (_, i) => ({
    targetAngle: 40,
    along: relAlong * 40 + (i % 2 === 0 ? 0.5 : -0.5),
    perpendicular: 0,
    timeMs: 600,
    ...extra,
  }))

/** Perfect, noise-free player who prefers `preferred` cm/360. */
function deterministicRun(preferred: number, state: SearchState): SearchState {
  let s = state
  for (let b = nextBlock(s); b; b = nextBlock(s)) {
    s = submitBlock(s, shots(b.shots, preferred / b.cm360 - 1))
  }
  return s
}

const block = (cm360: number, side: 'low' | 'high', relAlong: number, n = 10): BlockResult => ({
  cm360,
  side,
  summary: summarizeBlock(shots(n, relAlong)),
})

describe('searching without a bias tie-break', () => {
  const block = (cm360: number, side: 'low' | 'high', score: number, n = 5): BlockResult => ({
    cm360,
    side,
    summary: { ...summarizeBlock(shots(n, 0)), score, scoreError: 0.02, bias: -0.3 },
  })

  it('ignores bias and declares no winner when scores are close', () => {
    expect(decideRound(block(30, 'low', 0.8), block(45, 'high', 0.81), 1, false)).toMatchObject({
      winner: null,
      decidedBy: 'none',
    })
    expect(decideRound(block(30, 'low', 0.8), block(45, 'high', 0.9), 1, false)).toMatchObject({
      winner: 'high',
      decidedBy: 'score',
    })
  })

  it('keeps the range after an undecided round', () => {
    let s = createSearch({ warmupShots: 0, biasTieBreak: false, rounds: 2 })
    const flat = shots(10, 0)
    s = submitBlock(s, flat)
    s = submitBlock(s, flat)
    expect(s.history[0]!.winner).toBeNull()
    expect(s.range).toEqual({ lo: 20, hi: 60 })
  })

  it('flags an edge when every round chose that side', () => {
    let s = createSearch({ warmupShots: 0, biasTieBreak: false, rounds: 3 })
    for (let b = nextBlock(s); b; b = nextBlock(s)) {
      // Longer distances score better every time.
      s = submitBlock(s, shots(10, b.side === 'high' ? 0 : 0.3))
    }
    expect(searchResult(s)!.edge).toBe('high')
  })
})

describe('rangeBeyond', () => {
  it('centres the next test on the edge the result hit', () => {
    const high = rangeBeyond({ lo: 20, hi: 60 }, 'high')
    expect(high.lo).toBeCloseTo(42, 9)
    expect(high.hi).toBeCloseTo(78, 9)
    const low = rangeBeyond({ lo: 20, hi: 60 }, 'low')
    expect(low.lo).toBeCloseTo(14, 9)
    expect(low.hi).toBeCloseTo(26, 9)
  })

  it('overlaps the previous range so the edge itself is tested again', () => {
    const r = rangeBeyond({ lo: 30, hi: 50 }, 'high')
    expect(r.lo).toBeLessThan(50)
    expect(r.hi).toBeGreaterThan(50)
  })

  it('stays within plausible distances', () => {
    expect(rangeBeyond({ lo: 120, hi: 180 }, 'high').hi).toBe(200)
    expect(rangeBeyond({ lo: 6, hi: 12 }, 'low').lo).toBe(5)
  })

  it('rejects bad input', () => {
    expect(() => rangeBeyond({ lo: 50, hi: 40 }, 'high')).toThrow(RangeError)
    expect(() => rangeBeyond({ lo: 20, hi: 60 }, 'high', 2)).toThrow(RangeError)
  })

  it('finds a player beyond the first range on the second try', () => {
    // A noise-free player at 75 cm: the first run flags the high edge, the follow-up covers 75.
    const first = searchResult(deterministicRun(75, createSearch()))!
    expect(first.edge).toBe('high')
    const second = searchResult(deterministicRun(75, createSearch({ initial: rangeBeyond({ lo: 20, hi: 60 }, 'high') })))!
    expect(second.edge).toBeNull()
    expect(second.range.lo).toBeLessThanOrEqual(75)
    expect(second.range.hi).toBeGreaterThanOrEqual(75)
  })
})

describe('initialRange', () => {
  it('defaults to 20–60 cm', () => {
    expect(initialRange()).toEqual({ lo: 20, hi: 60 })
    expect(initialRange(null)).toEqual({ lo: 20, hi: 60 })
  })

  it('centres ±30% on the current sens when known', () => {
    const r = initialRange(40)
    expect(r.lo).toBeCloseTo(28)
    expect(r.hi).toBeCloseTo(52)
  })

  it('rejects bad input', () => {
    expect(() => initialRange(-5)).toThrow(RangeError)
    expect(() => initialRange(40, 1.5)).toThrow(RangeError)
    expect(() => createSearch({ initial: { lo: 50, hi: 40 } })).toThrow(RangeError)
    expect(() => createSearch({ rounds: 0 })).toThrow(RangeError)
  })
})

describe('testPoints', () => {
  it('splits the range into log-scale quarters', () => {
    const { low, high } = testPoints({ lo: 20, hi: 80 })
    expect(low).toBeCloseTo(20 * Math.SQRT2, 9)
    expect(high).toBeCloseTo(80 / Math.SQRT2, 9)
    expect(Math.sqrt(low * high)).toBeCloseTo(geometricCenter({ lo: 20, hi: 80 }), 9)
  })
})

describe('search state machine', () => {
  it('runs an unscored warm-up first, then two blocks per round', () => {
    let s = createSearch({ rounds: 2, shotsPerBlock: 4, warmupShots: 6 })
    const warmup = nextBlock(s)!
    expect(warmup).toMatchObject({ kind: 'warmup', shots: 6, round: -1, side: null })
    expect(warmup.cm360).toBeCloseTo(Math.sqrt(20 * 60))
    // Warm-up results never affect the search, even if they are terrible.
    s = submitBlock(s, shots(6, 0.9))
    expect(s.range).toEqual({ lo: 20, hi: 60 })

    const seen: string[] = []
    for (let b = nextBlock(s); b; b = nextBlock(s)) {
      expect(b.kind).toBe('scored')
      expect(b.shots).toBe(4)
      seen.push(`${b.round}:${b.side}`)
      s = submitBlock(s, shots(4, 0))
    }
    // Sides alternate which goes first each round.
    expect(seen).toEqual(['0:low', '0:high', '1:high', '1:low'])
    expect(searchResult(s)).not.toBeNull()
    expect(() => submitBlock(s, [])).toThrow()
  })

  it('skips the warm-up when warmupShots is 0', () => {
    expect(nextBlock(createSearch({ warmupShots: 0 }))?.kind).toBe('scored')
  })

  it('returns no result until finished', () => {
    expect(searchResult(createSearch())).toBeNull()
  })

  it('halves the range (log scale) every round', () => {
    const s = deterministicRun(40, createSearch({ warmupShots: 0 }))
    const ratios = s.history.map((r) => r.range.hi / r.range.lo)
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]!).toBeCloseTo(Math.sqrt(ratios[i - 1]!), 9)
    }
  })

  it('repeats a block with too many invalid shots, once', () => {
    let s = createSearch({ warmupShots: 0, shotsPerBlock: 10 })
    const bad = shots(10, 0, { timeMs: 20 }) // all faster than a human can react
    s = submitBlock(s, bad)
    expect(nextBlock(s)).toMatchObject({ side: 'low', attempt: 1 })
    expect(s.pending).toBeNull()
    s = submitBlock(s, bad)
    // Second failure is accepted so the test cannot loop forever.
    expect(s.pending?.summary.validCount).toBe(0)
    expect(nextBlock(s)).toMatchObject({ side: 'high', attempt: 0 })
  })
})

describe('decideRound', () => {
  it('picks the clearly better score', () => {
    const low = block(30, 'low', 0.25)
    const high = block(45, 'high', 0.02)
    expect(decideRound(low, high, 1)).toMatchObject({ winner: 'high', decidedBy: 'score' })
  })

  it('falls back to flick bias when scores are too close to call', () => {
    // Same error size, opposite sign: scores tie, bias says the optimum is near 36.
    const low = block(30, 'low', 0.2)
    const high = block(45, 'high', -0.2)
    const d = decideRound(low, high, 1)
    expect(d.decidedBy).toBe('bias')
    expect(d.winner).toBe('low')
    expect(d.biasEstimate).toBeCloseTo(Math.sqrt(30 * 1.2 * 45 * 0.8), 6)
  })

  it('uses the only block with valid shots', () => {
    const empty: BlockResult = { cm360: 30, side: 'low', summary: summarizeBlock([]) }
    expect(decideRound(empty, block(45, 'high', 0.1), 1)).toMatchObject({ winner: 'high' })
  })

  it('declares no winner when nothing is known', () => {
    const empty = (side: 'low' | 'high'): BlockResult => ({ cm360: 30, side, summary: summarizeBlock([]) })
    expect(decideRound(empty('low'), empty('high'), 1)).toMatchObject({ winner: null, decidedBy: 'none' })
  })
})

describe('searchResult', () => {
  it('converges on a noise-free player', () => {
    for (const preferred of [24, 33, 41, 55]) {
      const r = searchResult(deterministicRun(preferred, createSearch()))!
      expect(r.range.lo).toBeLessThanOrEqual(preferred)
      expect(r.range.hi).toBeGreaterThanOrEqual(preferred)
      expect(Math.abs(r.center / preferred - 1)).toBeLessThan(0.04)
      expect(r.edge).toBeNull()
    }
  })

  it('never reports a range narrower than ±minHalfWidth', () => {
    const r = searchResult(deterministicRun(40, createSearch({ rounds: 8 })))!
    expect(r.finalBracket.hi / r.finalBracket.lo).toBeLessThan(1.01)
    expect(r.range.hi / r.center).toBeCloseTo(1.04, 6)
    expect(r.center / r.range.lo).toBeCloseTo(1.04, 6)
  })

  it('flags when the optimum lies beyond the tested range', () => {
    const high = searchResult(deterministicRun(90, createSearch()))!
    expect(high.edge).toBe('high')
    expect(high.finalBracket.hi).toBeCloseTo(60, 9)
    const low = searchResult(deterministicRun(12, createSearch()))!
    expect(low.edge).toBe('low')
    expect(low.finalBracket.lo).toBeCloseTo(20, 9)
  })
})
