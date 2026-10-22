/**
 * Game data comes from yawmatch at runtime; nothing is copied into this repo.
 * Validated with yawmatch's own Zod schema so both sites agree on the format.
 */
import { z } from 'zod'
import { Game } from 'yawmatch/data/schema'

export { Game }

/** Published by yawmatch's build. Expected shape: a JSON array of games. */
export const GAMES_URL = 'https://umut-hope.github.io/Yaw-Match/data/games.json'

export const GamesFile = z
  .array(Game)
  .min(1, 'games.json contains no games')
  .refine((games) => new Set(games.map((g) => g.id)).size === games.length, {
    message: 'games.json contains duplicate game ids',
  })

export type GamesErrorKind =
  /** Request failed: offline, DNS, CORS, or aborted. */
  | 'network'
  /** Request took longer than the timeout. */
  | 'timeout'
  /** Server answered with a non-2xx status. */
  | 'http'
  /** Body was not valid JSON. */
  | 'parse'
  /** JSON did not match the schema. */
  | 'invalid'

export interface GamesError {
  kind: GamesErrorKind
  message: string
  /** HTTP status, for `http` errors. */
  status?: number
  /** Schema problems, for `invalid` errors. */
  issues?: z.core.$ZodIssue[]
}

export type GamesResult = { ok: true; games: Game[] } | { ok: false; error: GamesError }

export interface GamesLoaderOptions {
  url?: string
  fetch?: typeof fetch
  timeoutMs?: number
}

export interface GamesLoader {
  /**
   * Fetches and validates the game list. A successful result is cached in
   * memory; failures are not, so calling again retries.
   */
  load(): Promise<GamesResult>
  /** Drops the cached result. */
  reset(): void
}

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e))

export function createGamesLoader(options: GamesLoaderOptions = {}): GamesLoader {
  const url = options.url ?? GAMES_URL
  const timeoutMs = options.timeoutMs ?? 10_000
  let cached: Promise<GamesResult> | null = null

  async function fetchOnce(): Promise<GamesResult> {
    const doFetch = options.fetch ?? globalThis.fetch
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)

    try {
      let response: Response
      try {
        response = await doFetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
      } catch (e) {
        return timedOut
          ? { ok: false, error: { kind: 'timeout', message: `No response from ${url} within ${timeoutMs} ms` } }
          : { ok: false, error: { kind: 'network', message: `Could not reach ${url}: ${errorText(e)}` } }
      }

      if (!response.ok) {
        return {
          ok: false,
          error: { kind: 'http', status: response.status, message: `${url} answered ${response.status}` },
        }
      }

      let body: unknown
      try {
        body = await response.json()
      } catch (e) {
        return timedOut
          ? { ok: false, error: { kind: 'timeout', message: `${url} did not finish within ${timeoutMs} ms` } }
          : { ok: false, error: { kind: 'parse', message: `${url} is not valid JSON: ${errorText(e)}` } }
      }

      const parsed = GamesFile.safeParse(body)
      if (!parsed.success) {
        return {
          ok: false,
          error: { kind: 'invalid', message: z.prettifyError(parsed.error), issues: parsed.error.issues },
        }
      }
      return { ok: true, games: parsed.data }
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    load() {
      if (!cached) {
        cached = fetchOnce().then((result) => {
          if (!result.ok) cached = null
          return result
        })
      }
      return cached
    },
    reset() {
      cached = null
    },
  }
}

/** App-wide loader for the published game list. */
export const gamesLoader = createGamesLoader()

export function findGame(games: readonly Game[], id: string): Game | undefined {
  return games.find((g) => g.id === id)
}
