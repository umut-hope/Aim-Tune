/**
 * Player profile shared with yawmatch (same origin, same localStorage).
 *
 * `shared:profile` = { dpi, mainGame, sens } is the common format. yawmatch's
 * own `yawmatch:profile` is read as a fallback so a player who used the
 * converter first does not have to type everything again. Both are validated
 * on read; anything malformed is ignored.
 */
import { z } from 'zod'

export const SHARED_PROFILE_KEY = 'shared:profile'
export const YAWMATCH_PROFILE_KEY = 'yawmatch:profile'

const GameId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(32)

export const SharedProfile = z.object({
  dpi: z.number().positive().max(100_000),
  mainGame: GameId,
  sens: z.number().positive().max(10_000),
})
export type SharedProfile = z.infer<typeof SharedProfile>

/** yawmatch stores what the player typed, as strings. */
const YawmatchProfile = z.object({
  from: GameId.optional(),
  sens: z.string().max(32).optional(),
  dpi: z.string().max(32).optional(),
})

export interface ProfileValues {
  game?: string
  sens?: number
  dpi?: number
}

function readJson(storage: Pick<Storage, 'getItem'> | undefined, key: string): unknown {
  try {
    const raw = storage?.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
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
  const shared = SharedProfile.safeParse(readJson(storage, SHARED_PROFILE_KEY))
  if (shared.success) {
    return { game: shared.data.mainGame, sens: shared.data.sens, dpi: shared.data.dpi }
  }

  const yawmatch = YawmatchProfile.safeParse(readJson(storage, YAWMATCH_PROFILE_KEY))
  if (!yawmatch.success) return {}
  const out: ProfileValues = {}
  const sens = positive(yawmatch.data.sens)
  const dpi = positive(yawmatch.data.dpi)
  if (yawmatch.data.from) out.game = yawmatch.data.from
  if (sens !== undefined) out.sens = sens
  if (dpi !== undefined) out.dpi = dpi
  return out
}

/** Writes the shared profile. Returns false if it could not be stored. */
export function saveProfile(storage: Pick<Storage, 'setItem'> | undefined, profile: SharedProfile): boolean {
  const parsed = SharedProfile.safeParse(profile)
  if (!parsed.success || !storage) return false
  try {
    storage.setItem(SHARED_PROFILE_KEY, JSON.stringify(parsed.data))
    return true
  } catch {
    return false
  }
}
