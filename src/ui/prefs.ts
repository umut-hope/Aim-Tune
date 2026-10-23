/**
 * Small preferences kept in localStorage. aimtune and yawmatch share one
 * origin, so every key here is prefixed with `aimtune:`.
 */

export const PROMO_DISMISSED_KEY = 'aimtune:promo-dismissed-until'

const DAY_MS = 24 * 60 * 60 * 1000

/** localStorage, or undefined where it is blocked (private mode, sandboxed frames). */
export function getStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function isPromoDismissed(now = Date.now(), storage = getStorage()): boolean {
  try {
    const until = Number(storage?.getItem(PROMO_DISMISSED_KEY))
    return Number.isFinite(until) && until > now
  } catch {
    return false
  }
}

export function dismissPromo(days: number, now = Date.now(), storage = getStorage()): void {
  try {
    storage?.setItem(PROMO_DISMISSED_KEY, String(now + days * DAY_MS))
  } catch {
    // Hidden for this visit only.
  }
}
