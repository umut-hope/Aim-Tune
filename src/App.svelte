<script lang="ts">
  import type { Component } from 'svelte'
  import {
    FULL_FLICK_SEARCH,
    FULL_TRACKING_SEARCH,
    STYLE_WEIGHTS,
    blendResults,
    type AimStyle,
  } from './core/combined'
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
  import { DEFAULT_FORM, prefillForm, type SetupForm, type StartConfig, type TestKind } from './ui/setup'

  type Route = 'test' | 'how'
  type Screen = 'setup' | 'test' | 'results' | 'ab'

  // Hash routing keeps GitHub Pages happy: every page is served from index.html.
  const readRoute = (): Route => (location.hash.startsWith('#/how') ? 'how' : 'test')

  let route = $state<Route>(readRoute())
  let unit = $state<DistanceUnit>(loadUnit())

  let games = $state.raw<Game[]>([])
  let gamesError = $state<string | null>(null)
  let form = $state<SetupForm>({ ...DEFAULT_FORM })
  let kind = $state<TestKind>('full')
  let style = $state<AimStyle>('both')

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
          kind: shared.test ?? 'flick',
          rounds: null,
          blend:
            shared.test === 'full' && shared.flick && shared.tracking
              ? {
                  style: shared.style ?? null,
                  weights: shared.style ? STYLE_WEIGHTS[shared.style] : null,
                  flick: shared.flick,
                  tracking: shared.tracking,
                  trackingRounds: null,
                }
              : null,
        }
      : null,
  )

  let startConfig = $state.raw<StartConfig | null>(null)
  let testRun = $state(0)
  type TestComponent = Component<{
    config: FlickTestConfig
    onDone: (r: SearchResult) => void
    onQuit: () => void
  }>
  /** A test screen; the full test runs the flick part, then the tracking part. */
  type Part = 'flick' | 'tracking'
  let tests = $state.raw<Partial<Record<Part, TestComponent>>>({})
  let part = $state<Part>('flick')
  /** Full test: the flick part's result while the tracking part runs. */
  let flickPart = $state.raw<SearchResult | null>(null)
  let loadError = $state<string | null>(null)

  /**
   * The tests (with three.js) are separate chunks, fetched ahead of time from
   * the setup screen. Both share the three.js chunk, so the second is small.
   */
  const testModules: Partial<Record<Part, Promise<void>>> = {}
  function loadTest(which: Part): Promise<void> {
    testModules[which] ??= (which === 'flick' ? import('./tests/FlickTest.svelte') : import('./tests/TrackingTest.svelte'))
      .then((m) => {
        tests = { ...tests, [which]: m.default as TestComponent }
      })
      .catch((e: unknown) => {
        delete testModules[which]
        loadError = e instanceof Error ? e.message : String(e)
      })
    return testModules[which]
  }
  const preloadTests = () => {
    void loadTest('flick')
    void loadTest('tracking')
  }
  const ActiveTest = $derived(startConfig ? (tests[part] ?? null) : null)

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

  /** Starts the test described by startConfig from its first part. */
  async function run() {
    if (!startConfig) return
    loadError = null
    part = startConfig.kind === 'tracking' ? 'tracking' : 'flick'
    flickPart = null
    if (startConfig.kind === 'full') void loadTest('tracking')
    await loadTest(part)
    if (tests[part]) {
      testRun++
      screen = 'test'
    }
  }

  function start(config: StartConfig) {
    startConfig = config
    void run()
  }

  async function done(r: SearchResult) {
    const config = startConfig
    if (!config) return
    if (config.kind === 'full' && part === 'flick') {
      // Part 1 done: keep it and go straight on to tracking.
      flickPart = r
      // Switch only once the tracking screen is loaded, so it mounts exactly once.
      await loadTest('tracking')
      part = 'tracking'
      testRun++
      return
    }

    abOutcome = null
    if (config.kind === 'full' && flickPart) {
      const blended = blendResults(flickPart, r, STYLE_WEIGHTS[config.style])
      result = {
        range: blended.range,
        current: config.current,
        gameId: config.gameId,
        dpi: config.dpi,
        edge: flickPart.edge,
        kind: 'full',
        rounds: flickPart.rounds,
        blend: {
          style: config.style,
          weights: blended.weights,
          flick: flickPart.range,
          tracking: r.range,
          trackingRounds: r.rounds,
        },
      }
    } else {
      result = {
        range: r.range,
        current: config.current,
        gameId: config.gameId,
        dpi: config.dpi,
        edge: r.edge,
        kind: config.kind,
        rounds: r.rounds,
        blend: null,
      }
    }
    screen = 'results'
    // Reloading the page keeps the result (without round details).
    const res = result
    const q = resultQuery({
      lo: res.range.lo,
      hi: res.range.hi,
      ...(config.current != null ? { current: config.current } : {}),
      ...(config.gameId ? { game: config.gameId } : {}),
      dpi: config.dpi,
      ...(res.edge ? { edge: res.edge } : {}),
      test: config.kind,
      ...(res.blend
        ? { style: config.style, flick: res.blend.flick, tracking: res.blend.tracking }
        : {}),
    })
    history.replaceState(null, '', `${import.meta.env.BASE_URL}${q}#/`)
    window.scrollTo(0, 0)
  }

  function retest() {
    void run()
  }

  /** Follow-up test when the result hit an edge: centred on that end of the last starting range. */
  function retestBeyond(edge: Side) {
    if (!startConfig) return
    startConfig = { ...startConfig, initial: rangeBeyond(startConfig.initial, edge) }
    void run()
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

  const testConfig = $derived.by<FlickTestConfig | null>(() => {
    if (!startConfig) return null
    const base = { dpi: startConfig.dpi, view: startConfig.view, initial: startConfig.initial, unit }
    if (startConfig.kind !== 'full') return base
    return part === 'flick'
      ? { ...base, search: FULL_FLICK_SEARCH, part: 'Part 1 of 2 · Flicks' }
      : { ...base, search: FULL_TRACKING_SEARCH, part: 'Part 2 of 2 · Tracking' }
  })
</script>

{#if screen === 'test' && route === 'test' && ActiveTest && testConfig}
  <!-- Header, promo and footer are hidden while a test runs. -->
  {#key testRun}
    <ActiveTest config={testConfig} onDone={done} onQuit={newTest} />
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
      <Setup {games} {gamesError} bind:form bind:kind bind:style {unit} onUnitChange={setUnit} onStart={start} preload={preloadTests} />
      {#if loadError}
        <p class="form-error" role="alert">Could not load the test: {loadError}. Check your connection and try again.</p>
      {/if}
    {/if}
  </main>
  <Footer />
{/if}
