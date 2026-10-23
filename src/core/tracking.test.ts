import { describe, expect, it } from 'vitest'
import { TARGET_ANGULAR_RADIUS_DEG, angleBetween, directionFromYawPitch } from './angles'
import { seededRng } from './testing/simulated-player'
import {
  DEFAULT_TRACKING,
  pathAt,
  pathDirection,
  pathSpeed,
  randomPath,
  summarizeTrackingBlock,
  summarizeTrial,
  trackingError,
  type TrackPath,
  type TrackSample,
} from './tracking'
import { isOnScreen, resolveView } from './view'

const view = resolveView({ gameFov: { default: 90, type: 'horizontal-4:3', adjustable: false }, aspect: 16 / 9 })

/** A path that only moves left/right: yaw = 10·sin(t), so it heads left (+yaw) at t = 0. */
const simple: TrackPath = {
  yaw: [
    { amplitude: 10, frequency: 1, phase: 0 },
    { amplitude: 0, frequency: 1, phase: 0 },
  ],
  pitch: { amplitude: 0, frequency: 1, phase: 0 },
}

describe('randomPath', () => {
  it('starts on the home direction', () => {
    const p = randomPath(seededRng(1), view)
    expect(pathAt(p, 0).yaw).toBeCloseTo(0, 12)
    expect(pathAt(p, 0).pitch).toBeCloseTo(0, 12)
  })

  it('stays on screen and moves at roughly the requested speed', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const p = randomPath(seededRng(seed), view, { speed: 35 })
      let speedSum = 0
      let n = 0
      for (let t = 0; t <= 10; t += 0.05) {
        const { yaw, pitch } = pathAt(p, t)
        const dir = directionFromYawPitch(yaw, pitch)
        const angle = angleBetween([0, 0, -1], dir)
        const screenDir = (Math.atan2(pitch, -yaw) * 180) / Math.PI
        expect(isOnScreen(view, angle, screenDir)).toBe(true)
        speedSum += pathSpeed(p, t)
        n++
      }
      const avg = speedSum / n
      expect(avg).toBeGreaterThan(12)
      expect(avg).toBeLessThan(45)
    }
  })

  it('speeds up from rest instead of darting off', () => {
    const p = randomPath(seededRng(3), view, { rampSec: 0.4 })
    expect(pathSpeed(p, 0)).toBeCloseTo(0, 9)
    const full = randomPath(seededRng(3), view, { rampSec: 0 })
    // Halfway through the ramp the speed is about half of what it would be.
    expect(pathSpeed(p, 0.2)).toBeLessThan(pathSpeed(full, 0.1) * 0.7 + 1e-9)
    // After the ramp the path continues at full speed.
    expect(pathSpeed(p, 1.2)).toBeCloseTo(pathSpeed(full, 1.0), 6)
  })

  it('rejects bad options', () => {
    expect(() => randomPath(seededRng(1), view, { speed: 0 })).toThrow(RangeError)
    expect(() => randomPath(seededRng(1), view, { rampSec: -1 })).toThrow(RangeError)
  })
})

describe('pathSpeed', () => {
  it('matches the derivative of the path', () => {
    // yaw = 10 sin t → 10 cos t degrees per second.
    expect(pathSpeed(simple, 0)).toBeCloseTo(10, 6)
    expect(pathSpeed(simple, Math.PI / 2)).toBeCloseTo(0, 6)
  })
})

describe('trackingError', () => {
  it('is zero on the target', () => {
    const e = trackingError(pathDirection(simple, 0.3), simple, 0.3)
    expect(e.total).toBeCloseTo(0, 6)
    expect(e.along).toBeCloseTo(0, 6)
  })

  it('reports ahead of the motion as positive and behind as negative', () => {
    // At t = 0 the target is at yaw 0, moving left (+yaw).
    const ahead = trackingError(directionFromYawPitch(2, 0), simple, 0)
    const behind = trackingError(directionFromYawPitch(-2, 0), simple, 0)
    expect(ahead.along).toBeCloseTo(2, 3)
    expect(behind.along).toBeCloseTo(-2, 3)
    expect(Math.abs(ahead.across)).toBeLessThan(1e-6)
  })

  it('puts vertical misses across a sideways motion', () => {
    const e = trackingError(directionFromYawPitch(0, 1.5), simple, 0)
    expect(Math.abs(e.across)).toBeCloseTo(1.5, 3)
    expect(Math.abs(e.along)).toBeLessThan(1e-3)
  })

  it('handles a momentarily still target', () => {
    // At t = π/2 the target turns around and stands still.
    const e = trackingError(directionFromYawPitch(10, 1), simple, Math.PI / 2)
    expect(e.total).toBeCloseTo(1, 3)
  })
})

const sample = (total: number, along: number, dtMs = 10, speed = 30): TrackSample => ({
  dtMs,
  speed,
  error: { total, along, across: 0 },
})

describe('summarizeTrial', () => {
  it('scores time on target and weights by frame time', () => {
    const t = summarizeTrial([sample(0, 0, 300), sample(TARGET_ANGULAR_RADIUS_DEG * 4, 0, 100)], {
      ...DEFAULT_TRACKING,
      settleMs: 0,
    })
    expect(t.durationMs).toBe(400)
    expect(t.onTarget).toBeCloseTo(0.75, 9)
    expect(t.score).toBeGreaterThan(0.75)
    expect(t.score).toBeLessThan(1)
    expect(t.valid).toBe(false) // too short
  })

  it('turns a steady lead or lag into a flick-style bias', () => {
    // 30°/s with 200 ms reaction: 0.6° ahead ≈ +10%.
    const ahead = summarizeTrial(Array.from({ length: 200 }, () => sample(0.6, 0.6)))
    expect(ahead.bias).toBeCloseTo(0.1, 9)
    expect(ahead.valid).toBe(true)
    const behind = summarizeTrial(Array.from({ length: 200 }, () => sample(1.2, -1.2)))
    expect(behind.bias).toBeCloseTo(-0.2, 9)
  })

  it('leaves the start of a run out of the score', () => {
    // 500 ms far behind (reacting), then 1.5 s right on the target.
    const samples = [
      ...Array.from({ length: 50 }, () => sample(8, -8)),
      ...Array.from({ length: 150 }, () => sample(0.2, 0)),
    ]
    const t = summarizeTrial(samples)
    expect(t.durationMs).toBe(1500)
    expect(t.meanAlong).toBeCloseTo(0, 9)
    expect(summarizeTrial(samples, { ...DEFAULT_TRACKING, settleMs: 0 }).meanAlong).toBeLessThan(-1.5)
  })

  it('marks a trial where the player was not tracking as invalid', () => {
    expect(summarizeTrial(Array.from({ length: 200 }, () => sample(30, 0))).valid).toBe(false)
    expect(summarizeTrial([]).valid).toBe(false)
  })
})

describe('summarizeTrackingBlock', () => {
  it('averages valid trials into a search block summary', () => {
    const good = summarizeTrial(Array.from({ length: 200 }, () => sample(0.6, 0.6)))
    const okay = summarizeTrial(Array.from({ length: 200 }, () => sample(2, -1.2)))
    const afk = summarizeTrial(Array.from({ length: 200 }, () => sample(40, 0)))
    const block = summarizeTrackingBlock([good, okay, afk])
    expect(block.shotCount).toBe(3)
    expect(block.validCount).toBe(2)
    expect(block.score).toBeCloseTo((good.score + okay.score) / 2, 9)
    expect(block.bias).toBeCloseTo((0.1 - 0.2) / 2, 9)
    expect(Number.isFinite(block.scoreError)).toBe(true)
  })
})
