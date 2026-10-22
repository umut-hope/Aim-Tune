/**
 * End-to-end checks of scoring + search against simulated players whose
 * preferred cm/360 is known. Thresholds are set from runs of 300 seeds each
 * with some headroom, so they catch regressions without being flaky (all
 * randomness is seeded, so results are reproducible anyway).
 */
import { describe, expect, it } from 'vitest'
import { createSearch, initialRange, nextBlock, searchResult, submitBlock, type SearchOptions, type SearchResult } from './search'
import { makePlayer, seededRng, simulateBlock, type PlayerProfile } from './testing/simulated-player'

const SEEDS = 300

function runSearch(player: PlayerProfile, seed: number, options: SearchOptions = {}): SearchResult {
  const rng = seededRng(seed)
  let state = createSearch(options)
  for (let b = nextBlock(state); b; b = nextBlock(state)) {
    state = submitBlock(state, simulateBlock(player, b, rng))
  }
  return searchResult(state)!
}

interface Stats {
  /** Relative error of the recommended centre at the 50th / 90th / 100th percentile. */
  median: number
  p90: number
  max: number
  /** Share of runs whose recommended range contains the true preference. */
  coverage: number
  meanHalfWidth: number
  edges: number
}

function evaluate(player: PlayerProfile, options: SearchOptions = {}): Stats {
  const errors: number[] = []
  let covered = 0
  let halfWidths = 0
  let edges = 0
  for (let seed = 1; seed <= SEEDS; seed++) {
    const r = runSearch(player, seed, options)
    errors.push(Math.abs(r.center / player.preferredCm360 - 1))
    if (r.range.lo <= player.preferredCm360 && player.preferredCm360 <= r.range.hi) covered++
    halfWidths += r.halfWidth
    if (r.edge) edges++
  }
  errors.sort((a, b) => a - b)
  const at = (q: number) => errors[Math.floor(q * (errors.length - 1))]!
  return {
    median: at(0.5),
    p90: at(0.9),
    max: at(1),
    coverage: covered / SEEDS,
    meanHalfWidth: halfWidths / SEEDS,
    edges,
  }
}

describe('simulated players', () => {
  it.each([25, 38, 52])('finds an average player who prefers %i cm/360', (preferred) => {
    const s = evaluate(makePlayer(preferred))
    expect(s.median).toBeLessThan(0.04)
    expect(s.p90).toBeLessThan(0.07)
    expect(s.max).toBeLessThan(0.2)
    expect(s.coverage).toBeGreaterThan(0.75)
    expect(s.edges).toBe(0)
  })

  it('starts around the current sens and still finds a different preference', () => {
    // Plays at 32 cm today, but the hand is actually tuned to 38 cm.
    const s = evaluate(makePlayer(38), { initial: initialRange(32) })
    expect(s.median).toBeLessThan(0.04)
    expect(s.p90).toBeLessThan(0.07)
  })

  it('gives an inconsistent player a wider range rather than false precision', () => {
    const steady = evaluate(makePlayer(38))
    const noisy = evaluate(makePlayer(38, { distanceNoise: 0.2, perpendicularNoise: 0.08 }))
    expect(noisy.median).toBeLessThan(0.07)
    expect(noisy.p90).toBeLessThan(0.14)
    expect(noisy.meanHalfWidth).toBeGreaterThan(steady.meanHalfWidth * 1.4)
    expect(noisy.coverage).toBeGreaterThan(0.7)
  })

  it('stays on target when the player adapts during each block', () => {
    const s = evaluate(makePlayer(38, { adaptRate: 0.08 }))
    expect(s.median).toBeLessThan(0.05)
    expect(s.p90).toBeLessThan(0.1)
  })

  it('shrugs off occasional wild shots', () => {
    const s = evaluate(makePlayer(38, { lapseRate: 0.1 }))
    expect(s.median).toBeLessThan(0.05)
    expect(s.p90).toBeLessThan(0.07)
  })

  it('handles fixed hand jitter that punishes high sens', () => {
    const s = evaluate(makePlayer(38, { handJitterCm: 0.3 }))
    expect(s.median).toBeLessThan(0.05)
    expect(s.p90).toBeLessThan(0.1)
  })

  it('separates two players with different preferences', () => {
    let separated = 0
    for (let seed = 1; seed <= SEEDS; seed++) {
      const a = runSearch(makePlayer(30), seed)
      const b = runSearch(makePlayer(45), seed)
      if (a.range.hi < b.range.lo) separated++
    }
    expect(separated / SEEDS).toBeGreaterThan(0.95)
  })

  it.each([
    [75, 'high'],
    [14, 'low'],
  ] as const)('flags a preference of %i cm/360 as beyond the %s end', (preferred, side) => {
    let flagged = 0
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = runSearch(makePlayer(preferred), seed)
      if (r.edge === side) flagged++
      expect(r.edge === null || r.edge === side).toBe(true)
    }
    expect(flagged / SEEDS).toBeGreaterThan(0.85)
  })
})
