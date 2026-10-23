<script lang="ts">
  import type { Component } from 'svelte'
  import { rangeBeyond, type SearchResult, type Side } from './core/search'
  import type { DistanceUnit } from './core/units'
  import { resolveView } from './core/view'
  import { gamesLoader, type Game } from './data/games'
  import type { AbOption, AbOutcome } from './tests/ab-flow'
  import type { AbTestConfig } from './tests/AbTest.svelte'
  import type { FlickTestConfig } from './tests/FlickTest.svelte'
  import Footer from './ui/Footer.svelte'
  import Header from './ui/Header.svelte'
  import HowItWorks from './ui/HowItWorks.svelte'
  import { parseResultParams, parseSetupParams, resultQuery } from './ui/links'
  import { getStorage, loadUnit, saveUnit } from './ui/prefs'
  import { loadProfile } from './ui/profile'
  import Results, { type ResultData } from './ui/Results.svelte'
  import Setup from './ui/Setup.svelte'
  import { DEFAULT_FORM, prefillForm, type SetupForm, type StartConfig } from './ui/setup'

  type Route = 'test' | 'how'
  type Screen = 'setup' | 'test' | 'results' | 'ab'

  // Hash routing keeps GitHub Pages happy: every page is served from index.html.
  const readRoute = (): Route => (location.hash.startsWith('#/how') ? 'how' : 'test')

  let route = $state<Route>(readRoute())
  let unit = $state<DistanceUnit>(loadUnit())

  let games = $state.raw<Game[]>([])
  let gamesError = $state<string | null>(null)
  let form = $state<SetupForm>({ ...DEFAULT_FORM })

  // A shared result link opens straight on the results screen.
  const shared = parseResultParams(location.search)
  let screen = $state<Screen>(shared ? 'results' : 'setup')
  let result = $state.raw<ResultData | null>(
    shared
      ? {
          range: { lo: shared.lo, hi: shared.hi },
          current: shared.current ?? null,
          gameId: shared.game ?? null,
          dpi: shared.dpi ?? null,
          edge: shared.edge ?? null,
          rounds: null,
        }
      : null,
  )

  let startConfig = $state.raw<StartConfig | null>(null)
  let testRun = $state(0)
  let FlickTest = $state.raw<Component<{
    config: FlickTestConfig
    onDone: (r: SearchResult) => void
    onQuit: () => void
  }> | null>(null)
  let loadError = $state<string | null>(null)

  /** The test (with three.js) is a separate chunk, fetched ahead of time from the setup screen. */
  let testModule: Promise<void> | null = null
  function loadTest(): Promise<void> {
    testModule ??= import('./tests/FlickTest.svelte')
      .then((m) => {
        FlickTest = m.default
      })
      .catch((e: unknown) => {
        testModule = null
        loadError = e instanceof Error ? e.message : String(e)
      })
    return testModule
  }

  // A/B feel test, also a separate chunk; fetched while the results are on screen.
  let AbTest = $state.raw<Component<{
    config: AbTestConfig
    onDone: (o: AbOutcome) => void
    onQuit: () => void
  }> | null>(null)
  let abConfig = $state.raw<AbTestConfig | null>(null)
  let abOutcome = $state.raw<AbOutcome | null>(null)
  let abRun = $state(0)
  let abModule: Promise<void> | null = null
  function loadAb(): Promise<void> {
    abModule ??= import('./tests/AbTest.svelte')
      .then((m) => {
        AbTest = m.default
      })
      .catch((e: unknown) => {
        abModule = null
        loadError = e instanceof Error ? e.message : String(e)
      })
    return abModule
  }

  $effect(() => {
    if (screen !== 'results') return
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500))
    idle(() => void loadAb())
  })

  $effect(() => {
    const onHashChange = () => {
      route = readRoute()
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  })

  $effect(() => {
    document.title = route === 'how' ? 'How it works · aimtune' : 'aimtune · mouse sensitivity finder'
  })

  // Prefill: URL first, then the saved profile.
  gamesLoader.load().then((r) => {
    if (r.ok) {
      games = r.games
      const known = (id: string) => r.games.some((g) => g.id === id)
      form = prefillForm([parseSetupParams(location.search), loadProfile(getStorage())], known)
    } else {
      gamesError = r.error.message
    }
  })

  function setUnit(u: DistanceUnit) {
    unit = u
    saveUnit(u)
  }

  async function start(config: StartConfig) {
    startConfig = config
    loadError = null
    await loadTest()
    if (FlickTest) {
      testRun++
      screen = 'test'
    }
  }

  function done(r: SearchResult) {
    const config = startConfig
    abOutcome = null
    result = {
      range: r.range,
      current: config?.current ?? null,
      gameId: config?.gameId ?? null,
      dpi: config?.dpi ?? null,
      edge: r.edge,
      rounds: r.rounds,
    }
    screen = 'results'
    // Reloading the page keeps the result (without round details).
    const q = resultQuery({
      lo: r.range.lo,
      hi: r.range.hi,
      ...(config?.current != null ? { current: config.current } : {}),
      ...(config?.gameId ? { game: config.gameId } : {}),
      ...(config ? { dpi: config.dpi } : {}),
      ...(r.edge ? { edge: r.edge } : {}),
    })
    history.replaceState(null, '', `${import.meta.env.BASE_URL}${q}#/`)
    window.scrollTo(0, 0)
  }

  function retest() {
    if (!startConfig) return
    testRun++
    screen = 'test'
  }

  /** Follow-up test when the result hit an edge: centred on that end of the last starting range. */
  function retestBeyond(edge: Side) {
    if (!startConfig) return
    startConfig = { ...startConfig, initial: rangeBeyond(startConfig.initial, edge) }
    testRun++
    screen = 'test'
  }

  function newTest() {
    screen = 'setup'
    history.replaceState(null, '', `${import.meta.env.BASE_URL}#/`)
    window.scrollTo(0, 0)
  }

  async function startAb(first: AbOption, second: AbOption, blind: boolean) {
    if (!result || result.dpi === null) return
    const game = games.find((g) => g.id === result?.gameId)
    const view =
      startConfig?.view ??
      resolveView({ gameFov: game?.fov ?? null, aspect: window.screen.width / window.screen.height })
    abConfig = { dpi: result.dpi, view, first, second, blind, unit }
    loadError = null
    await loadAb()
    if (AbTest) {
      abRun++
      screen = 'ab'
    }
  }

  function abDone(o: AbOutcome) {
    abOutcome = o
    screen = 'results'
    window.scrollTo(0, 0)
  }

  function abQuit() {
    screen = 'results'
  }

  const testConfig = $derived<FlickTestConfig | null>(
    startConfig ? { dpi: startConfig.dpi, view: startConfig.view, initial: startConfig.initial, unit } : null,
  )
</script>

{#if screen === 'test' && route === 'test' && FlickTest && testConfig}
  <!-- Header, promo and footer are hidden while a test runs. -->
  {#key testRun}
    <FlickTest config={testConfig} onDone={done} onQuit={newTest} />
  {/key}
{:else if screen === 'ab' && route === 'test' && AbTest && abConfig}
  {#key abRun}
    <AbTest config={abConfig} onDone={abDone} onQuit={abQuit} />
  {/key}
{:else}
  <Header {route} />
  <main class="page">
    {#if route === 'how'}
      <HowItWorks />
    {:else if screen === 'results' && result}
      <Results
        {result}
        {games}
        {unit}
        onRetest={startConfig ? retest : null}
        onNewTest={newTest}
        onRetestBeyond={startConfig ? retestBeyond : null}
        {abOutcome}
        onAbTest={startAb}
      />
      {#if loadError}
        <p class="form-error" role="alert">Could not load the test: {loadError}. Check your connection and try again.</p>
      {/if}
    {:else}
      <Setup {games} {gamesError} bind:form {unit} onUnitChange={setUnit} onStart={start} preload={loadTest} />
      {#if loadError}
        <p class="form-error" role="alert">Could not load the test: {loadError}. Check your connection and try again.</p>
      {/if}
    {/if}
  </main>
  <Footer />
{/if}
