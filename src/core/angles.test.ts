import { describe, expect, it } from 'vitest'
import {
  angleBetween,
  directionFromYawPitch,
  flickError,
  randomTargetSpec,
  targetDirection,
  type Vec3,
} from './angles'
import { seededRng } from './testing/simulated-player'
import { isOnScreen, resolveView } from './view'

const FORWARD: Vec3 = [0, 0, -1]

/** Direction reached by rotating `from` by `deg` along screen direction `dir`. */
const along = (deg: number, dir: number, from: Vec3 = FORWARD) => targetDirection(from, deg, dir)

describe('directionFromYawPitch', () => {
  it('follows the three.js frame', () => {
    const f = directionFromYawPitch(0, 0)
    expect(f[0]).toBeCloseTo(0)
    expect(f[1]).toBeCloseTo(0)
    expect(f[2]).toBeCloseTo(-1)
    const left = directionFromYawPitch(90, 0)
    expect(left[0]).toBeCloseTo(-1)
    expect(left[2]).toBeCloseTo(0)
    expect(directionFromYawPitch(0, 90)[1]).toBeCloseTo(1)
  })
})

describe('targetDirection', () => {
  it('places the target at the requested angle from the start', () => {
    const cases: [number, number][] = [[20, 0], [45, 180], [90, 30], [60, 210]]
    for (const [deg, dir] of cases) {
      expect(angleBetween(FORWARD, along(deg, dir))).toBeCloseTo(deg, 9)
    }
  })

  it('maps 0° to screen right and 90° to screen up', () => {
    const right = along(30, 0)
    expect(right[0]).toBeGreaterThan(0)
    expect(right[1]).toBeCloseTo(0)
    const up = along(30, 90)
    expect(up[1]).toBeGreaterThan(0)
    expect(up[0]).toBeCloseTo(0)
  })
})

describe('flickError', () => {
  const start = directionFromYawPitch(15, 5)

  it('is zero for a perfect flick', () => {
    const target = along(50, 10, start)
    const e = flickError(start, target, target)
    expect(e.flickAngle).toBeCloseTo(50, 9)
    expect(e.along).toBeCloseTo(0, 9)
    expect(e.perpendicular).toBeCloseTo(0, 9)
    expect(e.total).toBeCloseTo(0, 6)
  })

  it('reports overshoot as positive and undershoot as negative', () => {
    for (const dir of [0, 180, 25, 200]) {
      const target = along(40, dir, start)
      expect(flickError(start, target, along(46, dir, start)).along).toBeCloseTo(6, 9)
      expect(flickError(start, target, along(33, dir, start)).along).toBeCloseTo(-7, 9)
    }
  })

  it('measures the perpendicular miss with a counter-clockwise positive sign', () => {
    // Flick to the right; a click slightly above the path is counter-clockwise.
    const target = along(40, 0)
    const above = flickError(FORWARD, target, directionFromYawPitch(-40, 3))
    const below = flickError(FORWARD, target, directionFromYawPitch(-40, -3))
    expect(above.perpendicular).toBeGreaterThan(0)
    expect(below.perpendicular).toBeCloseTo(-above.perpendicular, 9)
    expect(Math.abs(above.along)).toBeLessThan(0.1)

    // Same offset with a flick to the left: above the path is now clockwise.
    const leftTarget = along(40, 180)
    expect(flickError(FORWARD, leftTarget, directionFromYawPitch(40, 3)).perpendicular).toBeLessThan(0)
  })

  it('splits a combined miss into both components', () => {
    const target = along(60, 0)
    // 5° past the target along the path, then 2° off it (upwards = counter-clockwise).
    const click = targetDirection(along(65, 0), 2, 90)
    const e = flickError(FORWARD, target, click)
    expect(e.along).toBeCloseTo(5, 1)
    expect(e.perpendicular).toBeCloseTo(2, 1)
    expect(e.total).toBeCloseTo(Math.hypot(5, 2), 1)
  })

  it('treats a click on the wrong side of the start as a large undershoot', () => {
    const target = along(30, 0)
    expect(flickError(FORWARD, target, along(10, 180)).along).toBeCloseTo(-40, 9)
  })

  it('rejects a degenerate flick', () => {
    expect(() => flickError(FORWARD, FORWARD, FORWARD)).toThrow(RangeError)
  })
})

describe('randomTargetSpec', () => {
  it('stays within the angle and tilt limits and covers both sides', () => {
    const rng = seededRng(7)
    let left = 0
    for (let i = 0; i < 500; i++) {
      const { angleDeg, directionDeg } = randomTargetSpec(rng)
      expect(angleDeg).toBeGreaterThanOrEqual(20)
      expect(angleDeg).toBeLessThanOrEqual(90)
      const tilt = directionDeg > 90 ? 180 - directionDeg : directionDeg
      expect(Math.abs(tilt)).toBeLessThanOrEqual(30)
      if (directionDeg > 90) left++
    }
    expect(left).toBeGreaterThan(200)
    expect(left).toBeLessThan(300)
  })

  it('keeps every target on screen when given a view', () => {
    const rng = seededRng(11)
    const view = resolveView({ gameFov: { default: 90, type: 'horizontal-4:3', adjustable: false }, aspect: 16 / 9 })
    let maxSeen = 0
    for (let i = 0; i < 1000; i++) {
      const { angleDeg, directionDeg } = randomTargetSpec(rng, { view })
      expect(isOnScreen(view, angleDeg, directionDeg, 0.9)).toBe(true)
      expect(angleDeg).toBeGreaterThanOrEqual(20)
      maxSeen = Math.max(maxSeen, angleDeg)
    }
    // ~106° horizontal: the side edge is at 53°, so flicks no longer reach 90°.
    expect(maxSeen).toBeGreaterThan(45)
    expect(maxSeen).toBeLessThan(60)
  })

  it('lowers the minimum instead of going off screen in a very narrow view', () => {
    const rng = seededRng(3)
    const view = { verticalFov: 20, aspect: 16 / 9 } // about 35° horizontal
    for (let i = 0; i < 200; i++) {
      const { angleDeg, directionDeg } = randomTargetSpec(rng, { view })
      expect(isOnScreen(view, angleDeg, directionDeg, 0.9)).toBe(true)
      expect(angleDeg).toBeGreaterThan(0)
    }
  })

  it('mixes in small corrections at the requested share', () => {
    const rng = seededRng(21)
    let micro = 0
    for (let i = 0; i < 1000; i++) {
      const { angleDeg } = randomTargetSpec(rng, { microShare: 0.3 })
      if (angleDeg < 20) {
        micro++
        expect(angleDeg).toBeGreaterThanOrEqual(4)
        expect(angleDeg).toBeLessThanOrEqual(15)
      }
    }
    expect(micro).toBeGreaterThan(250)
    expect(micro).toBeLessThan(350)
  })

  it('draws the same targets as before when small corrections are off', () => {
    const a = seededRng(5)
    const b = seededRng(5)
    for (let i = 0; i < 50; i++) expect(randomTargetSpec(a)).toEqual(randomTargetSpec(b, { microShare: 0 }))
  })

  it('rejects invalid options', () => {
    expect(() => randomTargetSpec(Math.random, { microShare: 1.5 })).toThrow(RangeError)
    expect(() => randomTargetSpec(Math.random, { minAngle: 50, maxAngle: 40 })).toThrow(RangeError)
    expect(() => randomTargetSpec(Math.random, { maxTilt: 120 })).toThrow(RangeError)
  })
})
