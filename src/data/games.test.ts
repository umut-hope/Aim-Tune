import { describe, expect, it, vi } from 'vitest'
import { createGamesLoader, findGame, GAMES_URL } from './games'

const game = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Game ${id}`,
  yaw: 0.022,
  sensCurve: 'linear',
  fov: null,
  ads: null,
  configFiles: [],
  consoleCommand: null,
  sources: [{ url: 'https://example.com/yaw' }],
  verifiedBy: 'community',
  ...overrides,
})

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const mockFetch = (impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) =>
  vi.fn(impl) as unknown as typeof fetch & ReturnType<typeof vi.fn>

describe('games loader', () => {
  it('fetches the yawmatch URL by default and returns validated games', async () => {
    const fetch = mockFetch(async () => jsonResponse([game('cs2'), game('valorant', { yaw: 0.07 })]))
    const result = await createGamesLoader({ fetch }).load()
    expect(fetch).toHaveBeenCalledWith(GAMES_URL, expect.anything())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.games.map((g) => g.id)).toEqual(['cs2', 'valorant'])
      expect(findGame(result.games, 'valorant')?.yaw).toBe(0.07)
      expect(findGame(result.games, 'nope')).toBeUndefined()
    }
  })

  it('caches a successful result', async () => {
    const fetch = mockFetch(async () => jsonResponse([game('cs2')]))
    const loader = createGamesLoader({ fetch })
    const [a, b] = await Promise.all([loader.load(), loader.load()])
    await loader.load()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
    loader.reset()
    await loader.load()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('reports network failures and retries on the next call', async () => {
    let calls = 0
    const fetch = mockFetch(async () => {
      calls++
      if (calls === 1) throw new TypeError('Failed to fetch')
      return jsonResponse([game('cs2')])
    })
    const loader = createGamesLoader({ fetch })
    const first = await loader.load()
    expect(first).toMatchObject({ ok: false, error: { kind: 'network' } })
    expect((await loader.load()).ok).toBe(true)
  })

  it('reports HTTP errors with the status', async () => {
    const fetch = mockFetch(async () => new Response('not found', { status: 404 }))
    expect(await createGamesLoader({ fetch }).load()).toMatchObject({
      ok: false,
      error: { kind: 'http', status: 404 },
    })
  })

  it('reports a body that is not JSON', async () => {
    const fetch = mockFetch(async () => new Response('<html>oops</html>', { status: 200 }))
    expect(await createGamesLoader({ fetch }).load()).toMatchObject({ ok: false, error: { kind: 'parse' } })
  })

  it.each([
    ['a non-array', { games: [] }],
    ['an empty list', []],
    ['a negative yaw', [game('cs2', { yaw: -1 })]],
    ['an unknown field', [game('cs2', { extra: true })]],
    ['duplicate ids', [game('cs2'), game('cs2')]],
  ])('rejects %s against the schema', async (_label, body) => {
    const fetch = mockFetch(async () => jsonResponse(body))
    const result = await createGamesLoader({ fetch }).load()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid')
      expect(result.error.issues?.length).toBeGreaterThan(0)
      expect(result.error.message.length).toBeGreaterThan(0)
    }
  })

  it('times out a request that never answers', async () => {
    const fetch = mockFetch(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    const result = await createGamesLoader({ fetch, timeoutMs: 20 }).load()
    expect(result).toMatchObject({ ok: false, error: { kind: 'timeout' } })
  })
})
