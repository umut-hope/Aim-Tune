/**
 * Tracking search against simulated trackers. In this model the best tracking
 * distance is about 2.5% shorter than the player's flick preference (a little
 * extra speed makes up for reaction lag), found by scanning expected scores
 * with many trials. Thresholds come from 100-seed runs with headroom.
 */
import { describe, expect, it } from 'vitest'
import { createSearch, nextBlock, searchResult, submitSummary, type SearchResult } from './search'
import { makeTracker, simulateTrial, type TrackerProfile } from './testing/simulated-tracker'
import { seededRng } from './testing/simulated-player'
import { TRACKING_SEARCH, summarizeTrackingBlock, summarizeTrial } from './tracking'
import { resolveView } from './view'

const view = resolveView({ gameFov: { default: 90, type: 'horizontal-4:3', adjustable: false }, aspect: 16 / 9 })
const SEEDS = 50
const OPTIMUM_SHARE = 0.975

function run(player: TrackerProfile, seed: number): SearchResult {
  const rng = seededRng(seed)
  let state = createSearch(TRACKING_SEARCH)
  for (let b = nextBlock(state); b; b = nextBlock(state)) {
    const trials = Array.from({ length: b.shots }, () => summarizeTrial(simulateTrial(player, b.cm360, view, rng)))
    state = submitSummary(state, summarizeTrackingBlock(trials))
  }
  return searchResult(state)!
}

function evaluate(player: TrackerProfile) {
  const best = player.preferredCm360 * OPTIMUM_SHARE
  const errors: number[] = []
  let covered = 0
  for (let seed = 1; seed <= SEEDS; seed++) {
    const r = run(player, seed)
    errors.push(Math.abs(r.center / best - 1))
    if (r.range.lo <= best && best <= r.range.hi) covered++
  }
  errors.sort((a, b) => a - b)
  return { median: errors[Math.floor(SEEDS / 2)]!, coverage: covered / SEEDS }
}

describe('tracking search with simulated trackers', () => {
  it.each([25, 52])('finds an average tracker who prefers %i cm/360', (preferred) => {
    const s = evaluate(makeTracker(preferred))
    expect(s.median).toBeLessThan(0.1)
    expect(s.coverage).toBeGreaterThan(0.75)
  })

  it('covers a noisy tracker with a wider range', () => {
    const s = evaluate(makeTracker(38, { speedNoise: 0.25, tremorCm: 1.2 }))
    expect(s.median).toBeLessThan(0.12)
    expect(s.coverage).toBeGreaterThan(0.75)
  })
}, 120000)
