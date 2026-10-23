import { describe, expect, it } from 'vitest'
import { TARGET_ANGULAR_RADIUS_DEG, angleBetween, directionFromYawPitch } from '../core/angles'
import { seededRng } from '../core/testing/simulated-player'
import { isOnScreen, resolveView } from '../core/view'
import { createField, directionAt, hitIndex, positionAt, respawn, type FieldTarget } from './ab-field'

const view = resolveView({ gameFov: { default: 90, type: 'horizontal-4:3', adjustable: false }, aspect: 16 / 9 })

/** Screen direction (0° = right, CCW) and angle of a yaw/pitch offset, for isOnScreen. */
function onScreen(yaw: number, pitch: number): boolean {
  const dir = directionFromYawPitch(yaw, pitch)
  const angle = angleBetween([0, 0, -1], dir)
  const screenDir = (Math.atan2(pitch, -yaw) * 180) / Math.PI
  return isOnScreen(view, angle, screenDir)
}

describe('createField', () => {
  it('makes the requested mix of still and moving targets', () => {
    const field = createField(seededRng(1), view, { count: 6, movingShare: 0.5 })
    expect(field).toHaveLength(6)
    expect(field.filter((t) => t.amplitude > 0)).toHaveLength(3)
  })

  it('keeps every target on screen for its whole path', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const target of createField(seededRng(seed), view)) {
        for (let t = 0; t < 10; t += 0.25) {
          const p = positionAt(target, t)
          expect(onScreen(p.yaw, p.pitch)).toBe(true)
        }
      }
    }
  })

  it('spreads targets apart', () => {
    const field = createField(seededRng(4), view)
    for (let i = 0; i < field.length; i++) {
      for (let j = i + 1; j < field.length; j++) {
        expect(angleBetween(directionAt(field[i]!, 0), directionAt(field[j]!, 0))).toBeGreaterThanOrEqual(8)
      }
    }
  })
})

describe('positionAt', () => {
  it('slides moving targets side to side and leaves still ones alone', () => {
    const moving: FieldTarget = { yaw: 10, pitch: 5, amplitude: 6, speed: Math.PI, phase: 0 }
    expect(positionAt(moving, 0.5).yaw).toBeCloseTo(16, 9)
    expect(positionAt(moving, 1.5).yaw).toBeCloseTo(4, 9)
    expect(positionAt(moving, 0.5).pitch).toBe(5)
    const still: FieldTarget = { ...moving, amplitude: 0, speed: 0 }
    expect(positionAt(still, 3).yaw).toBe(10)
  })
})

describe('hitIndex', () => {
  const field: FieldTarget[] = [
    { yaw: 10, pitch: 0, amplitude: 0, speed: 0, phase: 0 },
    { yaw: -10, pitch: 0, amplitude: 0, speed: 0, phase: 0 },
  ]

  it('finds the target under the crosshair', () => {
    expect(hitIndex(field, 0, directionFromYawPitch(-10, 0))).toBe(1)
    expect(hitIndex(field, 0, directionFromYawPitch(10, TARGET_ANGULAR_RADIUS_DEG * 0.9))).toBe(0)
  })

  it('misses just outside the target', () => {
    expect(hitIndex(field, 0, directionFromYawPitch(10, TARGET_ANGULAR_RADIUS_DEG * 1.1))).toBe(-1)
    expect(hitIndex(field, 0, directionFromYawPitch(0, 0))).toBe(-1)
  })

  it('follows moving targets', () => {
    const moving: FieldTarget[] = [{ yaw: 0, pitch: 0, amplitude: 5, speed: Math.PI / 2, phase: 0 }]
    expect(hitIndex(moving, 1, directionFromYawPitch(5, 0))).toBe(0)
    expect(hitIndex(moving, 1, directionFromYawPitch(0, 0))).toBe(-1)
  })
})

describe('respawn', () => {
  it('replaces one target with a new one of the same kind', () => {
    const rng = seededRng(9)
    const field = createField(rng, view)
    const movingIndex = field.findIndex((t) => t.amplitude > 0)
    const next = respawn(field, movingIndex, rng, view, 2)
    expect(next).toHaveLength(field.length)
    expect(next[movingIndex]).not.toEqual(field[movingIndex])
    expect(next[movingIndex]!.amplitude).toBeGreaterThan(0)
    next.forEach((t, i) => {
      if (i !== movingIndex) expect(t).toBe(field[i])
    })
  })

  it('ignores an out-of-range index', () => {
    const field = createField(seededRng(2), view)
    expect(respawn(field, 99, seededRng(3), view, 0)).toEqual(field)
  })
})
