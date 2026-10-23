/**
 * Full test (flick part + tracking part, blended) against simulated players
 * whose flick and tracking preferences are known. The expected answer is the
 * weighted log-average of the flick preference and the tracking optimum
 * (about 2.5% below the tracker's preference in this model). Thresholds come
 * from 100-seed runs with headroom.
 */
import { describe, expect, it } from 'vitest'
import { FULL_FLICK_SEARCH, FULL_TRACKING_SEARCH, STYLE_WEIGHTS, blendResults, type AimStyle } from './combined'
import { createSearch, nextBlock, searchResult, submitBlock, submitSummary, type SearchResult } from './search'
import { makePlayer, seededRng, simulateBlock, type PlayerProfile } from './testing/simulated-player'
import { makeTracker, simulateTrial, type TrackerProfile } from './testing/simulated-tracker'
import { summarizeTrackingBlock, summarizeTrial } from './tracking'
import { resolveView } from './view'

const view = resolveView({ gameFov: { default: 90, type: 'horizontal-4:3', adjustable: false }, aspect: 16 / 9 })
const SEEDS = 60
const STYLES: readonly AimStyle[] = ['flicks', 'both', 'tracking']

function flickPart(p: PlayerProfile, rng: () => number): SearchResult {
  let s = createSearch(FULL_FLICK_SEARCH)
  for (let b = nextBlock(s); b; b = nextBlock(s)) s = submitBlock(s, simulateBlock(p, b, rng, { view }))
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
  const trackingBest = tracker.preferredCm360 * 0.975
  return STYLES.map((style) => {
    const w = STYLE_WEIGHTS[style]
    const target = Math.exp(w.flick * Math.log(flicker.preferredCm360) + w.tracking * Math.log(trackingBest))
    const blended = runs.map((r) => blendResults(r.flick, r.tracking, w))
    const centers = blended.map((b) => b.center).sort((a, b) => a - b)
    return {
      style,
      target,
      median: centers[Math.floor(SEEDS / 2)]!,
      coverage: blended.filter((b) => b.range.lo <= target && target <= b.range.hi).length / SEEDS,
    }
  })
}

describe('full test with simulated players', () => {
  it('gives about the same answer for every style when both skills agree', () => {
    for (const s of evaluate(makePlayer(38), makeTracker(38))) {
      expect(Math.abs(s.median / s.target - 1)).toBeLessThan(0.06)
      expect(s.coverage).toBeGreaterThan(0.85)
    }
  })

  it('follows the weights when flicking and tracking prefer different distances', () => {
    const stats = evaluate(makePlayer(42), makeTracker(32))
    for (const s of stats) {
      expect(Math.abs(s.median / s.target - 1)).toBeLessThan(0.06)
      expect(s.coverage).toBeGreaterThan(0.85)
    }
    // More tracking weight, shorter distance.
    expect(stats[0]!.median).toBeGreaterThan(stats[1]!.median)
    expect(stats[1]!.median).toBeGreaterThan(stats[2]!.median)
  })
}, 120000)
