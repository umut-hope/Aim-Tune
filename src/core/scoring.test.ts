import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SCORING,
  accuracyScore,
  isValidShot,
  shotScore,
  summarizeBlock,
  timeScore,
  type Shot,
} from './scoring'

const shot = (over: Partial<Shot> = {}): Shot => ({
  targetAngle: 50,
  along: 0,
  perpendicular: 0,
  timeMs: 500,
  ...over,
})

describe('shot scoring', () => {
  it('gives full accuracy for a perfect shot and 0.5 at the error scale', () => {
    expect(accuracyScore(shot())).toBe(1)
    expect(accuracyScore(shot({ along: 5 }))).toBeCloseTo(0.5, 12) // 5 / 50 = 0.1
  })

  it('treats overshoot and undershoot of the same size equally', () => {
    expect(shotScore(shot({ along: 4 }))).toBeCloseTo(shotScore(shot({ along: -4 })), 12)
  })

  it('judges error relative to the flick size', () => {
    expect(accuracyScore(shot({ targetAngle: 90, along: 5 }))).toBeGreaterThan(
      accuracyScore(shot({ targetAngle: 20, along: 5 })),
    )
  })

  it('rewards speed, scaled by flick size', () => {
    expect(timeScore(shot({ timeMs: 400 }))).toBeGreaterThan(timeScore(shot({ timeMs: 800 })))
    expect(timeScore(shot({ targetAngle: 90, timeMs: 700 }))).toBeGreaterThan(
      timeScore(shot({ targetAngle: 20, timeMs: 700 })),
    )
  })

  it('weights accuracy above time', () => {
    const accurateSlow = shotScore(shot({ along: 1, timeMs: 1500 }))
    const fastSloppy = shotScore(shot({ along: 8, timeMs: 250 }))
    expect(accurateSlow).toBeGreaterThan(fastSloppy)
  })

  it('stays within (0, 1]', () => {
    for (const s of [shot(), shot({ along: 200, timeMs: 4000 }), shot({ timeMs: 0 })]) {
      const v = shotScore(s)
      expect(v).toBeGreaterThan(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})

describe('isValidShot', () => {
  it('drops accidental clicks, AFK shots and wild misses', () => {
    expect(isValidShot(shot())).toBe(true)
    expect(isValidShot(shot({ timeMs: DEFAULT_SCORING.minTimeMs - 1 }))).toBe(false)
    expect(isValidShot(shot({ timeMs: DEFAULT_SCORING.maxTimeMs + 1 }))).toBe(false)
    expect(isValidShot(shot({ along: 60 }))).toBe(false)
    expect(isValidShot(shot({ along: Number.NaN }))).toBe(false)
  })
})

describe('summarizeBlock', () => {
  it('reports signed bias relative to flick size', () => {
    const over = summarizeBlock([shot({ along: 5 }), shot({ targetAngle: 20, along: 2 })])
    expect(over.bias).toBeCloseTo(0.1, 12)
    expect(over.meanAlong).toBeCloseTo(3.5, 12)
    const under = summarizeBlock([shot({ along: -5 }), shot({ along: -10 })])
    expect(under.bias).toBeCloseTo(-0.15, 12)
  })

  it('excludes invalid shots from every statistic', () => {
    const s = summarizeBlock([shot({ along: 2 }), shot({ along: 2 }), shot({ along: 90 })])
    expect(s.shotCount).toBe(3)
    expect(s.validCount).toBe(2)
    expect(s.meanAlong).toBeCloseTo(2, 12)
    expect(s.scoreError).toBeCloseTo(0, 12)
    expect(s.biasSpread).toBeCloseTo(0, 12)
  })

  it('handles empty and single-shot blocks', () => {
    const empty = summarizeBlock([])
    expect(empty.validCount).toBe(0)
    expect(empty.score).toBeNaN()
    expect(empty.scoreError).toBe(Number.POSITIVE_INFINITY)
    const one = summarizeBlock([shot()])
    expect(one.scoreError).toBe(Number.POSITIVE_INFINITY)
    expect(one.biasSpread).toBeNaN()
  })

  it('ranks a tight block above a scattered one', () => {
    const tight = summarizeBlock([-1, 1, -2, 2, 0].map((along) => shot({ along })))
    const loose = summarizeBlock([-8, 8, -10, 6, 4].map((along) => shot({ along })))
    expect(tight.score).toBeGreaterThan(loose.score)
  })
})
