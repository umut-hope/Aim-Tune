import { describe, expect, it } from 'vitest'
import { STYLE_WEIGHTS, blendResults } from './combined'
import type { SearchResult } from './search'

const result = (lo: number, hi: number): SearchResult => ({
  range: { lo, hi },
  center: Math.sqrt(lo * hi),
  finalBracket: { lo, hi },
  halfWidth: 0.04,
  edge: null,
  rounds: [],
})

describe('STYLE_WEIGHTS', () => {
  it('add up to one per style and order from flick-heavy to tracking-heavy', () => {
    for (const w of Object.values(STYLE_WEIGHTS)) expect(w.flick + w.tracking).toBeCloseTo(1, 12)
    expect(STYLE_WEIGHTS.flicks.flick).toBeGreaterThan(STYLE_WEIGHTS.both.flick)
    expect(STYLE_WEIGHTS.both.flick).toBeGreaterThan(STYLE_WEIGHTS.tracking.flick)
  })
})

describe('blendResults', () => {
  const flick = result(40, 44)
  const tracking = result(28, 36)

  it('averages on a log scale with the weights', () => {
    const b = blendResults(flick, tracking, { flick: 0.5, tracking: 0.5 })
    expect(b.range.lo).toBeCloseTo(Math.sqrt(40 * 28), 9)
    expect(b.range.hi).toBeCloseTo(Math.sqrt(44 * 36), 9)
    expect(b.center).toBeCloseTo(Math.sqrt(flick.center * tracking.center), 9)
  })

  it('moves towards tracking as its weight grows', () => {
    const centers = (['flicks', 'both', 'tracking'] as const).map((s) => blendResults(flick, tracking, STYLE_WEIGHTS[s]).center)
    expect(centers[0]).toBeGreaterThan(centers[1]!)
    expect(centers[1]).toBeGreaterThan(centers[2]!)
  })

  it('gets wider with more weight on the wider tracking range', () => {
    const width = (s: 'flicks' | 'tracking') => {
      const r = blendResults(flick, tracking, STYLE_WEIGHTS[s]).range
      return r.hi / r.lo
    }
    expect(width('tracking')).toBeGreaterThan(width('flicks'))
  })

  it('reports where tracking alone pointed', () => {
    expect(blendResults(flick, tracking, STYLE_WEIGHTS.both).trackingLean).toBe('shorter')
    expect(blendResults(flick, result(41, 43), STYLE_WEIGHTS.both).trackingLean).toBe('same')
    expect(blendResults(flick, result(46, 52), STYLE_WEIGHTS.both).trackingLean).toBe('longer')
  })

  it('rejects weights that do not add up', () => {
    expect(() => blendResults(flick, tracking, { flick: 0.5, tracking: 0.6 })).toThrow(RangeError)
  })
})
