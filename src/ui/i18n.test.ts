import { describe, expect, it } from 'vitest'
import { LANG_KEY, browserLang, carryLang, loadLang, parseLang, resolveLang, saveLang } from './i18n'
import { en } from './messages/en'
import { esc, num } from './messages/html'
import { tr } from './messages/tr'

/**
 * Every leaf of a dictionary as "path: kind". Functions also report their
 * arity, and arrays (and arrays a function returns) their length, so both
 * languages must have the same keys, the same parameters and the same number
 * of list items.
 */
function shape(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return [`${path}: array(${value.length})`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))]
  if (typeof value === 'function') {
    const out = [`${path}: function(${value.length})`]
    // List-returning messages are called with neutral arguments to compare their length.
    if (path.endsWith('stepsHtml')) out.push(...shape((value as (n: number) => unknown)(5), `${path}()`))
    return out
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .flatMap((k) => shape((value as Record<string, unknown>)[k], path ? `${path}.${k}` : k))
  }
  return [`${path}: ${typeof value}`]
}

describe('dictionaries', () => {
  it('have exactly the same keys, parameters and list lengths', () => {
    expect(shape(tr)).toEqual(shape(en))
  })

  it('have no empty strings', () => {
    const empty = (value: unknown, path: string): string[] => {
      if (typeof value === 'string') return value.trim() === '' ? [path] : []
      if (value !== null && typeof value === 'object') {
        return Object.entries(value).flatMap(([k, v]) => empty(v, `${path}.${k}`))
      }
      return []
    }
    // how.distance.text[1] is the text after the yawmatch link; it is never empty either.
    expect(empty(en, 'en')).toEqual([])
    expect(empty(tr, 'tr')).toEqual([])
  })

  it('escape values put into markup', () => {
    expect(esc('<b>"A&B"</b>')).toBe('&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;')
    expect(num('1.5')).toBe('<span class="num">1.5</span>')
    expect(en.results.sensInHtml('<x>', '800')).not.toContain('<x>')
    expect(tr.results.sensInHtml('<x>', '800')).not.toContain('<x>')
  })

  it('format percentages the local way', () => {
    expect(en.common.percent(12)).toBe('12%')
    expect(tr.common.percent(12)).toBe('%12')
  })
})

describe('parseLang', () => {
  it('accepts supported codes, any case, with a region', () => {
    expect(parseLang('tr')).toBe('tr')
    expect(parseLang('EN')).toBe('en')
    expect(parseLang('tr-TR')).toBe('tr')
    expect(parseLang('en_GB')).toBe('en')
  })

  it('rejects anything else', () => {
    expect(parseLang('de')).toBeNull()
    expect(parseLang('')).toBeNull()
    expect(parseLang(null)).toBeNull()
    expect(parseLang(undefined)).toBeNull()
    expect(parseLang('turkish')).toBeNull()
  })
})

describe('browserLang', () => {
  it('is Turkish only for tr*', () => {
    expect(browserLang(['tr-TR', 'en-US'])).toBe('tr')
    expect(browserLang(['tr'])).toBe('tr')
    expect(browserLang(['de-DE', 'tr'])).toBe('en')
    expect(browserLang(['en-US'])).toBe('en')
    expect(browserLang([])).toBe('en')
  })
})

describe('resolveLang', () => {
  it('lets the URL win over the saved choice and the browser', () => {
    expect(resolveLang({ search: '?lang=tr', stored: 'en', browser: ['en-US'] })).toBe('tr')
    expect(resolveLang({ search: '?game=cs2&lang=en', stored: 'tr', browser: ['tr-TR'] })).toBe('en')
  })

  it('uses the saved choice next', () => {
    expect(resolveLang({ search: '', stored: 'tr', browser: ['en-US'] })).toBe('tr')
    expect(resolveLang({ search: '?lang=xx', stored: 'en', browser: ['tr-TR'] })).toBe('en')
  })

  it('falls back to the browser language', () => {
    expect(resolveLang({ search: '', stored: null, browser: ['tr-TR'] })).toBe('tr')
    expect(resolveLang({ search: '', stored: 'garbage', browser: ['fr-FR'] })).toBe('en')
  })
})

describe('saved choice', () => {
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
      setItem: (k, v) => void data.set(k, v),
    }
  }

  it('round-trips under the aimtune: key', () => {
    const storage = memoryStorage()
    expect(loadLang(storage)).toBeNull()
    saveLang('tr', storage)
    expect(storage.getItem(LANG_KEY)).toBe('tr')
    expect(LANG_KEY.startsWith('aimtune:')).toBe(true)
    expect(loadLang(storage)).toBe('tr')
  })

  it('survives blocked or missing storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage
    expect(loadLang(blocked)).toBeNull()
    expect(() => saveLang('en', blocked)).not.toThrow()
    expect(loadLang(undefined)).toBeNull()
  })
})

describe('carryLang', () => {
  it('copies an explicit lang into the new query', () => {
    expect(carryLang('?lo=38&hi=41', '?lang=tr')).toBe('?lo=38&hi=41&lang=tr')
    expect(carryLang('', '?game=cs2&lang=en')).toBe('?lang=en')
  })

  it('leaves a plain URL plain', () => {
    expect(carryLang('?lo=38&hi=41', '?game=cs2')).toBe('?lo=38&hi=41')
    expect(carryLang('', '')).toBe('')
    expect(carryLang('?lang=tr', '')).toBe('')
  })

  it('updates the lang only when the URL already had one', () => {
    expect(carryLang('?lang=tr&dpi=800', '?lang=tr&dpi=800', 'en')).toBe('?lang=en&dpi=800')
    expect(carryLang('?dpi=800', '?dpi=800', 'en')).toBe('?dpi=800')
  })
})
