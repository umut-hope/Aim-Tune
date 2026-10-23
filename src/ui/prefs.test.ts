import { describe, expect, it } from 'vitest'
import { PROMO_DISMISSED_KEY, dismissPromo, isPromoDismissed } from './prefs'

/** Minimal in-memory Storage. */
function memoryStorage(): Storage {
  const data = new Map<string, string>()
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

const DAY = 24 * 60 * 60 * 1000

describe('promo dismissal', () => {
  it('is shown until dismissed', () => {
    expect(isPromoDismissed(0, memoryStorage())).toBe(false)
  })

  it('stays hidden for the given number of days, then comes back', () => {
    const storage = memoryStorage()
    dismissPromo(14, 1000, storage)
    expect(storage.getItem(PROMO_DISMISSED_KEY)).toBe(String(1000 + 14 * DAY))
    expect(isPromoDismissed(1000 + 13 * DAY, storage)).toBe(true)
    expect(isPromoDismissed(1000 + 14 * DAY + 1, storage)).toBe(false)
  })

  it('uses an aimtune-prefixed key so it does not clash with yawmatch', () => {
    expect(PROMO_DISMISSED_KEY.startsWith('aimtune:')).toBe(true)
  })

  it('ignores garbage values and missing storage', () => {
    const storage = memoryStorage()
    storage.setItem(PROMO_DISMISSED_KEY, 'not a number')
    expect(isPromoDismissed(0, storage)).toBe(false)
    expect(isPromoDismissed(0, undefined)).toBe(false)
    expect(() => dismissPromo(14, 0, undefined)).not.toThrow()
  })

  it('survives storage that throws', () => {
    const broken = memoryStorage()
    broken.getItem = () => {
      throw new Error('blocked')
    }
    broken.setItem = () => {
      throw new Error('blocked')
    }
    expect(isPromoDismissed(0, broken)).toBe(false)
    expect(() => dismissPromo(14, 0, broken)).not.toThrow()
  })
})
