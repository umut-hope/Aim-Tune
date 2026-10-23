/**
 * Player profile shared with yawmatch (same origin, same localStorage).
 *
 * `shared:profile` = { dpi, mainGame, sens } is the common format; its schema
 * lives in yawmatch so both sites validate it the same way. yawmatch's own
 * `yawmatch:profile` is read as a fallback for players who used the converter
 * before it started writing the shared profile.
 */
import { z } from 'zod'
import {
  SHARED_PROFILE_KEY,
  SharedProfile,
  parseSharedProfile,
  serializeSharedProfile,
} from 'yawmatch/src/core/shared-profile'

export { SHARED_PROFILE_KEY, SharedProfile }

export const YAWMATCH_PROFILE_KEY = 'yawmatch:profile'

/** yawmatch stores what the player typed, as strings. */
const YawmatchProfile = z.object({
  from: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(32).optional(),
  sens: z.string().max(32).optional(),
  dpi: z.string().max(32).optional(),
})

export interface ProfileValues {
  game?: string
  sens?: number
  dpi?: number
}

function read(storage: Pick<Storage, 'getItem'> | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

const positive = (s: string | undefined): number | undefined => {
  if (s === undefined) return undefined
  const n = Number(s.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Saved values, from the shared profile first, then yawmatch's own. */
export function loadProfile(storage: Pick<Storage, 'getItem'> | undefined): ProfileValues {
  const shared = parseSharedProfile(read(storage, SHARED_PROFILE_KEY))
  if (shared) return { game: shared.mainGame, sens: shared.sens, dpi: shared.dpi }

  let parsed: unknown = null
  try {
    parsed = JSON.parse(read(storage, YAWMATCH_PROFILE_KEY) ?? 'null')
  } catch {
    return {}
  }
  const yawmatch = YawmatchProfile.safeParse(parsed)
  if (!yawmatch.success) return {}
  const out: ProfileValues = {}
  const sens = positive(yawmatch.data.sens)
  const dpi = positive(yawmatch.data.dpi)
  if (yawmatch.data.from) out.game = yawmatch.data.from
  if (sens !== undefined) out.sens = sens
  if (dpi !== undefined) out.dpi = dpi
  return out
}

/** Writes the shared profile. Returns false if it is invalid or could not be stored. */
export function saveProfile(storage: Pick<Storage, 'setItem'> | undefined, profile: SharedProfile): boolean {
  const value = serializeSharedProfile(profile)
  if (value === null || !storage) return false
  try {
    storage.setItem(SHARED_PROFILE_KEY, value)
    return true
  } catch {
    return false
  }
}
