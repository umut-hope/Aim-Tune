import { describe, expect, it } from 'vitest'
import {
  CALIBRATION_KEY,
  clearCalibration,
  judgeRatio,
  loadCalibration,
  measuredDpi,
  saveCalibration,
} from './calibration'

function memory(entries: Record<string, string> = {}) {
  const data = new Map(Object.entries(entries))
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('measuredDpi', () => {
  it('turns counts over a distance into counts per inch', () => {
    // 29.7 cm = 11.69 in, so 400 DPI gives about 4677 counts.
    expect(measuredDpi(4677.2, 29.7)).toBeCloseTo(400, 1)
    expect(measuredDpi(-4677.2, 29.7)).toBeCloseTo(400, 1)
    // Display scaling at 125% would report only 80% of the counts.
    expect(measuredDpi(4677.2 * 0.8, 29.7) / 400).toBeCloseTo(0.8, 3)
  })
})

describe('judgeRatio', () => {
  it('accepts small differences, flags real ones and rejects bad slides', () => {
    expect(judgeRatio(1.02)).toBe('match')
    expect(judgeRatio(0.8)).toBe('off')
    expect(judgeRatio(1.5)).toBe('off')
    expect(judgeRatio(0.1)).toBe('implausible')
    expect(judgeRatio(4)).toBe('implausible')
    expect(judgeRatio(Number.NaN)).toBe('implausible')
  })
})

describe('calibration storage', () => {
  const NOW = Date.parse('2026-10-24T12:00:00Z')

  it('saves per browser and reads it back', () => {
    const s = memory()
    saveCalibration(s, 'Firefox', 0.8, NOW)
    saveCalibration(s, 'Chrome', 1, NOW)
    expect(loadCalibration(s, 'Firefox', NOW)).toBe(0.8)
    expect(loadCalibration(s, 'Chrome', NOW)).toBe(1)
    expect(loadCalibration(s, 'Safari', NOW)).toBeNull()
  })

  it('forgets calibrations older than a month', () => {
    const s = memory()
    saveCalibration(s, 'Firefox', 0.8, NOW - 40 * 24 * 60 * 60 * 1000)
    expect(loadCalibration(s, 'Firefox', NOW)).toBeNull()
  })

  it('clears one browser', () => {
    const s = memory()
    saveCalibration(s, 'Firefox', 0.8, NOW)
    saveCalibration(s, 'Chrome', 1, NOW)
    clearCalibration(s, 'Firefox')
    expect(loadCalibration(s, 'Firefox', NOW)).toBeNull()
    expect(loadCalibration(s, 'Chrome', NOW)).toBe(1)
  })

  it('ignores corrupt data', () => {
    expect(loadCalibration(memory({ [CALIBRATION_KEY]: '{oops' }), 'Firefox')).toBeNull()
    expect(loadCalibration(memory({ [CALIBRATION_KEY]: JSON.stringify({ Firefox: { ratio: 9, at: 'x' } }) }), 'Firefox')).toBeNull()
    expect(loadCalibration(undefined, 'Firefox')).toBeNull()
  })
})
