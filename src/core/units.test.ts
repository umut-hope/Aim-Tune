import { describe, expect, it } from 'vitest'
import { cmPer360, degreesPerCountAtCm360, fromCm, sensFromCm360, toCm } from './units'

describe('degreesPerCountAtCm360', () => {
  it('matches 360° spread over the counts of one turn', () => {
    // 40 cm at 800 DPI = 40 / 2.54 * 800 counts per 360°.
    const counts = (40 / 2.54) * 800
    expect(degreesPerCountAtCm360(40, 800)).toBeCloseTo(360 / counts, 12)
  })

  it('agrees with the yawmatch conversion for a real game yaw', () => {
    const yaw = 0.022
    const sens = sensFromCm360(34.6, 800, yaw)
    expect(cmPer360(sens, yaw, 800)).toBeCloseTo(34.6, 10)
    expect(degreesPerCountAtCm360(34.6, 800)).toBeCloseTo(sens * yaw, 12)
  })

  it('rejects invalid input', () => {
    expect(() => degreesPerCountAtCm360(0, 800)).toThrow(RangeError)
    expect(() => degreesPerCountAtCm360(40, -1)).toThrow(RangeError)
  })
})

describe('toCm / fromCm', () => {
  it('converts inches and passes centimetres through', () => {
    expect(toCm(10, 'in')).toBeCloseTo(25.4, 12)
    expect(fromCm(25.4, 'in')).toBeCloseTo(10, 12)
    expect(toCm(42.9, 'cm')).toBe(42.9)
    expect(fromCm(42.9, 'cm')).toBe(42.9)
    expect(fromCm(toCm(16.9, 'in'), 'in')).toBeCloseTo(16.9, 12)
  })
})
