/**
 * Full test (flick part + tracking part, blended) against simulated players
 * whose flick and tracking preferences are known. Each run's expected answer
 * is the log-average of the flick preference and the tracker's best distance,
 * using the weights that run actually applied (tracking counts only as much
 * as its rounds decided). Thresholds come from 100-seed runs with headroom.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_MICRO_SHARE } from './angles'
import { FULL_FLICK_SEARCH, FULL_TRACKING_SEARCH, STYLE_WEIGHTS, blendResults, type AimStyle } from './combined'
import { createSearch, nextBlock, searchResult, submitBlock, submitSummary, type SearchResult } from './search'
import { makePlayer, seededRng, simulateBlock, type PlayerProfile } from './testing/simulated-player'
import { makeTracker, simulateTrial, trackingOptimum, type TrackerProfile } from './testing/simulated-tracker'
import { summarizeTrackingBlock, summarizeTrial } from './tracking'
import { resolveView } from './view'

const view = resolveView({ gameFov: { default: 90, type: 'horizontal-4:3', adjustable: false }, aspect: 16 / 9 })
const SEEDS = 60
const STYLES: readonly AimStyle[] = ['flicks', 'both', 'tracking']

function flickPart(p: PlayerProfile, rng: () => number): SearchResult {
  let s = createSearch(FULL_FLICK_SEARCH)
  for (let b = nextBlock(s); b; b = nextBlock(s)) {
    s = submitBlock(s, simulateBlock(p, b, rng, { view, microShare: DEFAULT_MICRO_SHARE }))
  }
  return searchResult(s)!
}

function trackingPart(p: TrackerProfile, rng: () => number): SearchResult {
  let s = createSearch(FULL_TRACKING_SEARCH)
  for (let b = nextBlock(s); b; b = nextBlock(s)) {
    s = submitSummary(s, summarizeTrackingBlock(Array.from({ length: b.shots }, () => summarizeTrial(simulateTrial(p, b.cm360, view, rng)))))
  }
  return searchResult(s)!
}

function evaluate(flicker: PlayerProfile, tracker: TrackerProfile) {
  const runs = Array.from({ length: SEEDS }, (_, i) => {
    const rng = seededRng(i + 1)
    return { flick: flickPart(flicker, rng), tracking: trackingPart(tracker, rng) }
  })
  const trackingBest = trackingOptimum(tracker, view)
  return STYLES.map((style) => {
    const blended = runs.map((r) => blendResults(r.flick, r.tracking, STYLE_WEIGHTS[style]))
    const targets = blended.map((b) =>
      Math.exp(b.applied.flick * Math.log(flicker.preferredCm360) + b.applied.tracking * Math.log(trackingBest)),
    )
    const errors = blended.map((b, i) => Math.abs(b.center / targets[i]! - 1)).sort((a, b) => a - b)
    return {
      style,
      medianError: errors[Math.floor(SEEDS / 2)]!,
      coverage: blended.filter((b, i) => b.range.lo <= targets[i]! && targets[i]! <= b.range.hi).length / SEEDS,
    }
  })
}

describe('full test with simulated players', () => {
  it('gives about the same answer for every style when both skills agree', () => {
    for (const s of evaluate(makePlayer(38), makeTracker(38))) {
      expect(s.medianError).toBeLessThan(0.06)
      expect(s.coverage).toBeGreaterThan(0.85)
    }
  })

  it('stays close to the applied blend when flicking and tracking prefer different distances', () => {
    // Tracking decides only about half its rounds at a realistic reaction time,
    // so it moves the result less than its nominal weight; the check is against
    // the weights each run actually applied.
    for (const s of evaluate(makePlayer(42), makeTracker(32))) {
      expect(s.medianError).toBeLessThan(0.08)
      expect(s.coverage).toBeGreaterThan(0.85)
    }
  })
}, 120000)
