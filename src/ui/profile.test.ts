import { describe, expect, it } from 'vitest'
import { SHARED_PROFILE_KEY, YAWMATCH_PROFILE_KEY, loadProfile, saveProfile } from './profile'

function storageWith(entries: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(entries))
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  }
}

describe('loadProfile', () => {
  it('reads the shared profile', () => {
    const s = storageWith({ [SHARED_PROFILE_KEY]: JSON.stringify({ dpi: 800, mainGame: 'cs2', sens: 1.2 }) })
    expect(loadProfile(s)).toEqual({ game: 'cs2', sens: 1.2, dpi: 800 })
  })

  it("falls back to yawmatch's own profile", () => {
    const s = storageWith({ [YAWMATCH_PROFILE_KEY]: JSON.stringify({ from: 'valorant', to: 'cs2', sens: '0,4', dpi: '800' }) })
    expect(loadProfile(s)).toEqual({ game: 'valorant', sens: 0.4, dpi: 800 })
  })

  it('prefers the shared profile over yawmatch', () => {
    const s = storageWith({
      [SHARED_PROFILE_KEY]: JSON.stringify({ dpi: 400, mainGame: 'cs2', sens: 2 }),
      [YAWMATCH_PROFILE_KEY]: JSON.stringify({ from: 'valorant', sens: '0.4', dpi: '800' }),
    })
    expect(loadProfile(s).game).toBe('cs2')
  })

  it('ignores malformed data', () => {
    expect(loadProfile(storageWith({ [SHARED_PROFILE_KEY]: '{oops' }))).toEqual({})
    expect(loadProfile(storageWith({ [SHARED_PROFILE_KEY]: JSON.stringify({ dpi: -1, mainGame: 'cs2', sens: 1 }) }))).toEqual({})
    expect(loadProfile(storageWith({ [YAWMATCH_PROFILE_KEY]: JSON.stringify({ from: 'Not A Slug' }) }))).toEqual({})
    expect(loadProfile(storageWith({ [YAWMATCH_PROFILE_KEY]: JSON.stringify({ sens: 'abc', dpi: '0' }) }))).toEqual({})
    expect(loadProfile(undefined)).toEqual({})
  })
})

describe('saveProfile', () => {
  it('writes the shared format', () => {
    const s = storageWith()
    expect(saveProfile(s, { dpi: 800, mainGame: 'cs2', sens: 1.05 })).toBe(true)
    expect(JSON.parse(s.getItem(SHARED_PROFILE_KEY)!)).toEqual({ dpi: 800, mainGame: 'cs2', sens: 1.05 })
    expect(loadProfile(s)).toEqual({ game: 'cs2', sens: 1.05, dpi: 800 })
  })

  it('refuses invalid values and missing storage', () => {
    expect(saveProfile(storageWith(), { dpi: 0, mainGame: 'cs2', sens: 1 })).toBe(false)
    expect(saveProfile(undefined, { dpi: 800, mainGame: 'cs2', sens: 1 })).toBe(false)
  })

  it('reports a storage that throws', () => {
    const s = storageWith()
    s.setItem = () => {
      throw new Error('full')
    }
    expect(saveProfile(s, { dpi: 800, mainGame: 'cs2', sens: 1 })).toBe(false)
  })
})
