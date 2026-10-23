import { describe, expect, it } from 'vitest'
import {
  HISTORY_KEY,
  MAX_HISTORY,
  addToHistory,
  clearHistory,
  combineRecent,
  loadHistory,
  type HistoryEntry,
} from './history'

function memory(entries: Record<string, string> = {}) {
  const data = new Map(Object.entries(entries))
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

const NOW = Date.parse('2026-10-24T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const run = (center: number, daysAgo = 0, kind: HistoryEntry['kind'] = 'flick'): HistoryEntry => ({
  at: new Date(NOW - daysAgo * DAY).toISOString(),
  kind,
  lo: center / 1.05,
  hi: center * 1.05,
  center,
})

describe('history storage', () => {
  it('adds newest first and keeps a limited number', () => {
    const s = memory()
    for (let i = 0; i < MAX_HISTORY + 3; i++) addToHistory(s, run(30 + i))
    const h = loadHistory(s)
    expect(h).toHaveLength(MAX_HISTORY)
    expect(h[0]!.center).toBe(30 + MAX_HISTORY + 2)
  })

  it('ignores corrupt or invalid data', () => {
    expect(loadHistory(memory({ [HISTORY_KEY]: '{oops' }))).toEqual([])
    expect(loadHistory(memory({ [HISTORY_KEY]: JSON.stringify([{ ...run(40), lo: -1 }]) }))).toEqual([])
    expect(loadHistory(memory({ [HISTORY_KEY]: JSON.stringify([{ ...run(40), at: 'yesterday' }]) }))).toEqual([])
    expect(loadHistory(undefined)).toEqual([])
  })

  it('clears', () => {
    const s = memory()
    addToHistory(s, run(40))
    clearHistory(s)
    expect(loadHistory(s)).toEqual([])
  })

  it('survives storage that throws', () => {
    const s = memory()
    s.setItem = () => {
      throw new Error('full')
    }
    expect(addToHistory(s, run(40))).toHaveLength(1)
  })
})

describe('combineRecent', () => {
  it('needs at least two comparable runs', () => {
    expect(combineRecent([], NOW)).toBeNull()
    expect(combineRecent([run(40)], NOW)).toBeNull()
    expect(combineRecent([run(40), run(38, 0, 'tracking')], NOW)).toBeNull()
  })

  it('takes the geometric mean of up to three recent runs', () => {
    const c = combineRecent([run(43), run(38.2), run(44.7), run(31.5)], NOW)!
    expect(c.runs.map((r) => r.center)).toEqual([43, 38.2, 44.7])
    expect(c.center).toBeCloseTo(Math.cbrt(43 * 38.2 * 44.7), 9)
    expect(c.range.lo).toBeLessThan(c.center)
    expect(c.range.hi).toBeGreaterThan(c.center)
  })

  it('treats flick and full tests as comparable, but not tracking-only', () => {
    const c = combineRecent([run(43, 0, 'full'), run(40, 0, 'flick'), run(30, 0, 'tracking')], NOW)!
    expect(c.runs).toHaveLength(2)
  })

  it('leaves out runs older than two weeks', () => {
    expect(combineRecent([run(43), run(38, 20)], NOW)).toBeNull()
  })

  it('flags runs that disagree and widens the range for them', () => {
    const agree = combineRecent([run(42), run(43)], NOW)!
    const disagree = combineRecent([run(43), run(32)], NOW)!
    expect(agree.agreement).toBe('agree')
    expect(disagree.agreement).toBe('disagree')
    expect(disagree.spread).toBeCloseTo(43 / 32, 9)
    expect(disagree.range.hi / disagree.range.lo).toBeGreaterThan(agree.range.hi / agree.range.lo)
  })

  it('never gives a range narrower than ±4%', () => {
    const c = combineRecent([run(40), run(40), run(40)], NOW)!
    expect(c.range.hi / c.center).toBeGreaterThanOrEqual(1.04 - 1e-9)
  })
})
