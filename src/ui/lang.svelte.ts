/**
 * The active language as reactive state. Components read `i18n.t` (the
 * messages) inside templates or `$derived`, so a switch re-renders them.
 */
import { carryLang, loadLang, resolveLang, saveLang, type Lang } from './i18n'
import { en, type Messages } from './messages/en'
import { tr } from './messages/tr'
import { getStorage } from './prefs'

const MESSAGES: Record<Lang, Messages> = { en, tr }

function initial(): Lang {
  if (typeof window === 'undefined') return 'en'
  return resolveLang({
    search: location.search,
    stored: loadLang(getStorage()),
    browser: navigator.languages?.length ? navigator.languages : [navigator.language],
  })
}

let current = $state<Lang>(initial())

export const i18n = {
  get lang(): Lang {
    return current
  },
  get t(): Messages {
    return MESSAGES[current]
  },
  /** Switches language, remembers it, and keeps an explicit `?lang=` in the URL in step. */
  set(lang: Lang): void {
    current = lang
    saveLang(lang, getStorage())
    if (typeof window === 'undefined') return
    document.documentElement.lang = lang
    const q = carryLang(location.search, location.search, lang)
    if (q !== location.search) history.replaceState(history.state, '', `${location.pathname}${q}${location.hash}`)
  },
}

/**
 * A/B options are stored with a key (`current`, `recommended`, `faster`,
 * `slower`) so the outcome reads right after a language switch.
 */
export function abOptionName(key: string): string {
  const names: Record<string, string> = i18n.t.ab.options
  return names[key] ?? key
}

if (typeof document !== 'undefined') document.documentElement.lang = current
