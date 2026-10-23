import { describe, expect, it } from 'vitest'
import {
  YAWMATCH_URL,
  formatNumber,
  parsePositive,
  parseResultParams,
  parseSetupParams,
  resultQuery,
  yawmatchLink,
} from './links'

describe('parsePositive', () => {
  it.each([
    ['1.5', 1.5],
    ['1,5', 1.5],
    [' 800 ', 800],
    ['.5', 0.5],
    ['2.', 2],
  ])('parses %s', (input, expected) => {
    expect(parsePositive(input)).toBe(expected)
  })

  it.each(['', '0', '-1', 'abc', '1e3', '1.2.3', null, undefined, '9'.repeat(40)])('rejects %s', (input) => {
    expect(parsePositive(input)).toBeNull()
  })
})

describe('formatNumber', () => {
  it('trims trailing zeros', () => {
    expect(formatNumber(1.5, 3)).toBe('1.5')
    expect(formatNumber(2, 3)).toBe('2')
    expect(formatNumber(1.23456, 2)).toBe('1.23')
    expect(formatNumber(Number.NaN)).toBe('–')
  })
})

describe('parseSetupParams', () => {
  it('reads game, sens and dpi', () => {
    expect(parseSetupParams('?game=cs2&sens=1.2&dpi=800')).toEqual({ game: 'cs2', sens: 1.2, dpi: 800 })
  })

  it('drops invalid values instead of guessing', () => {
    expect(parseSetupParams('?game=CS%202&sens=-1&dpi=abc')).toEqual({})
    expect(parseSetupParams('')).toEqual({})
  })
})

describe('result links', () => {
  it('round-trips a full result', () => {
    const r = { lo: 38.04, hi: 41.27, current: 42.9, game: 'cs2', dpi: 400, edge: 'high' as const }
    const q = resultQuery(r)
    expect(q).toBe('?lo=38&hi=41.3&cur=42.9&game=cs2&dpi=400&edge=high')
    expect(parseResultParams(q)).toEqual({ lo: 38, hi: 41.3, current: 42.9, game: 'cs2', dpi: 400, edge: 'high' })
  })

  it('marks tracking results and leaves flick as the default', () => {
    const q = resultQuery({ lo: 30, hi: 40, test: 'tracking' })
    expect(q).toBe('?lo=30&hi=40&test=tracking')
    expect(parseResultParams(q)?.test).toBe('tracking')
    expect(resultQuery({ lo: 30, hi: 40, test: 'flick' })).toBe('?lo=30&hi=40')
    expect(parseResultParams('?lo=30&hi=40&test=other')?.test).toBeUndefined()
  })

  it('needs a valid range', () => {
    expect(parseResultParams('?lo=40&hi=38')).toBeNull()
    expect(parseResultParams('?lo=40')).toBeNull()
    expect(parseResultParams('?game=cs2&sens=1')).toBeNull()
    expect(parseResultParams('?lo=1&hi=9999')).toBeNull()
  })

  it('ignores unknown extras', () => {
    expect(parseResultParams('?lo=30&hi=33&edge=sideways&game=Bad!')).toEqual({ lo: 30, hi: 33 })
  })
})

describe('yawmatchLink', () => {
  it('prefills the converter', () => {
    expect(yawmatchLink({ game: 'valorant', sens: 0.3712345, dpi: 800 })).toBe(
      `${YAWMATCH_URL}?from=valorant&sens=0.3712&dpi=800`,
    )
  })

  it('falls back to the home page', () => {
    expect(yawmatchLink()).toBe(YAWMATCH_URL)
  })
})
