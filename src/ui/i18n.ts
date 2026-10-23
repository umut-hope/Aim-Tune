/**
 * Language choice. Order: `?lang=` in the URL, then the saved choice, then the
 * browser language (Turkish for `tr*`, English for everything else).
 */

export const LANGS = ['en', 'tr'] as const
export type Lang = (typeof LANGS)[number]

export const LANG_KEY = 'aimtune:lang'
const PARAM = 'lang'

/** A supported language code, or null. Case-insensitive; region suffixes are ignored. */
export function parseLang(value: string | null | undefined): Lang | null {
  const code = value?.trim().toLowerCase().split(/[-_]/)[0]
  return LANGS.find((l) => l === code) ?? null
}

/** The browser's first language decides: Turkish for `tr*`, English otherwise. */
export function browserLang(languages: readonly string[]): Lang {
  return parseLang(languages[0]) === 'tr' ? 'tr' : 'en'
}

export interface LangSources {
  /** location.search */
  search: string
  /** Saved choice, as stored. */
  stored: string | null
  /** navigator.languages (or [navigator.language]). */
  browser: readonly string[]
}

export function resolveLang({ search, stored, browser }: LangSources): Lang {
  return parseLang(new URLSearchParams(search).get(PARAM)) ?? parseLang(stored) ?? browserLang(browser)
}

export function loadLang(storage: Storage | undefined): string | null {
  try {
    return storage?.getItem(LANG_KEY) ?? null
  } catch {
    return null
  }
}

export function saveLang(lang: Lang, storage: Storage | undefined): void {
  try {
    storage?.setItem(LANG_KEY, lang)
  } catch {
    // Not remembered; still used for this visit.
  }
}

/**
 * Keeps an explicit `?lang=` across a URL change: copies it from `from` into
 * the query string `to` (both "?…" or empty). With `lang`, sets that value
 * instead, but only when `from` already had one, so a plain URL stays plain.
 */
export function carryLang(to: string, from: string, lang?: Lang): string {
  const old = parseLang(new URLSearchParams(from).get(PARAM))
  const params = new URLSearchParams(to)
  if (old === null) params.delete(PARAM)
  else params.set(PARAM, lang ?? old)
  const q = params.toString()
  return q ? `?${q}` : ''
}
