<!--
  Temporary page for trying the flick test before the real setup and results
  screens exist. Plain on purpose; it will be replaced by src/ui.
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { resolveView, type ResolvedView } from '../core/view'
  import { initialRange } from '../core/search'
  import { degreesPerCountAtCm360, fromCm, sensFromCm360, toCm, type DistanceUnit } from '../core/units'
  import { findGame, gamesLoader, type Game } from '../data/games'
  import { FlickScene } from '../scene/flick-scene'
  import { PointerLockInput, type RawInput } from '../scene/pointer-lock'
  import {
    activeCm360,
    click,
    createFlickFlow,
    hud,
    isOnHome,
    pause,
    proceed,
    restart,
    resume,
    tick,
    type FlickFlowState,
  } from '../tests/flick-flow'
  import HelpTip from '../ui/HelpTip.svelte'

  const HELP = {
    dpi: 'Counts per inch of your mouse, set in its own software (often 400, 800 or 1600). Not the in-game sensitivity.',
    distance:
      'How far you move the mouse for one full 360° turn in your game. The test starts around it. Leave empty to test 20–60 cm. yawmatch can work it out from your in-game sens.',
    game: "Sets the field of view, so targets appear where they would in your game, and converts the result to that game's sens.",
    fov: "The FOV value in your game's video settings, in the game's own units. Leave empty to use the game's default. Ignored for games where the FOV cannot be changed.",
  }

  interface Props {
    /** True while a test is in progress (not on the setup form or results). */
    running?: boolean
  }

  let { running = $bindable(false) }: Props = $props()

  let dpi = $state(800)
  let unit = $state<DistanceUnit>('cm')
  // Empty number inputs bind to undefined.
  let currentDistance = $state<number | null | undefined>(undefined)
  let gameId = $state('')
  let playerFov = $state<number | null | undefined>(undefined)

  let games = $state.raw<Game[]>([])
  let gamesError = $state<string | null>(null)

  let flow = $state.raw<FlickFlowState | null>(null)
  let view = $state.raw<ResolvedView | null>(null)
  let raw = $state<RawInput>('unknown')
  let fps = $state(0)
  let onHome = $state(true)
  let setupError = $state<string | null>(null)
  let locked = $state(false)
  let lockError = $state<string | null>(null)

  let stage: HTMLDivElement
  let canvas: HTMLCanvasElement
  let scene: FlickScene | null = null
  let input: PointerLockInput | null = null
  let frame = 0
  let lastFrame = 0

  const game = $derived(findGame(games, gameId))
  const info = $derived(flow ? hud(flow) : null)
  const unitLabel = $derived(unit === 'cm' ? 'cm/360' : 'in/360')

  $effect(() => {
    running = flow !== null && flow.phase !== 'done'
  })

  onMount(() => {
    gamesLoader.load().then((r) => {
      if (r.ok) games = r.games
      else gamesError = r.error.message
    })
    scene = new FlickScene(canvas)
    input = new PointerLockInput(stage, {
      onMove(dx, dy) {
        if (!flow || !scene) return
        const cm = activeCm360(flow)
        if (cm === null) return
        const k = degreesPerCountAtCm360(cm, dpi)
        // Mouse right turns right (negative yaw), mouse down looks down.
        scene.rotate(-dx * k, -dy * k)
      },
      onClick() {
        if (!flow || !scene) return
        if (flow.phase === 'aiming') flow = click(flow, performance.now(), scene.direction())
        else if (flow.phase === 'ready' || flow.phase === 'round-summary') flow = proceed(flow)
        if (flow.phase === 'done') input?.unlock()
      },
      onLockChange(isLocked) {
        locked = isLocked
        if (!isLocked && flow && flow.phase !== 'done') flow = pause(flow)
      },
    })
    const onResize = () => scene?.resize()
    window.addEventListener('resize', onResize)
    frame = requestAnimationFrame(loop)
    return () => window.removeEventListener('resize', onResize)
  })

  onDestroy(() => {
    cancelAnimationFrame(frame)
    input?.dispose()
    scene?.dispose()
  })

  function loop(now: number) {
    if (lastFrame) {
      const dt = now - lastFrame
      fps = fps === 0 ? 1000 / dt : fps * 0.95 + (1000 / dt) * 0.05
    }
    lastFrame = now
    if (scene) {
      if (flow) {
        const dir = scene.direction()
        flow = tick(flow, now, dir)
        const home = isOnHome(flow, dir)
        if (home !== onHome) onHome = home
      }
      const showDot = flow !== null && flow.phase !== 'aiming' && flow.phase !== 'done'
      scene.showHome(showDot ? flow!.config.home : null)
      scene.showTarget(flow?.target?.direction ?? null)
      scene.render()
    }
    frame = requestAnimationFrame(loop)
  }

  async function start() {
    setupError = null
    try {
      const resolved = resolveView({
        gameFov: game?.fov ?? null,
        aspect: window.screen.width / window.screen.height,
        playerFov,
      })
      view = resolved
      scene?.setView(resolved)
      scene?.resetLook()
      const currentCm = currentDistance == null ? null : toCm(currentDistance, unit)
      flow = createFlickFlow({
        search: { initial: initialRange(currentCm) },
        targets: { view: resolved },
      })
    } catch (e) {
      setupError = e instanceof Error ? e.message : String(e)
      return
    }
    await lockMouse()
  }

  /** Locks the pointer; must run inside a click handler. */
  async function lockMouse() {
    lockError = null
    try {
      raw = (await input?.lock()) ?? raw
    } catch (e) {
      lockError = `Could not lock the mouse: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  async function resumeTest() {
    if (!flow) return
    await lockMouse()
    // Read the document directly: the lock-change event may not have fired yet.
    if (input?.locked) flow = resume(flow)
  }

  async function restartTest() {
    if (!flow) return
    flow = restart(flow)
    scene?.resetLook()
    await lockMouse()
  }

  function quit() {
    input?.unlock()
    flow = null
  }

  const dist = (cm: number) => fromCm(cm, unit).toFixed(1)
  const pct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`
  const sensFor = (cm: number) => (game ? sensFromCm360(cm, dpi, game.yaw).toFixed(3) : null)
</script>

<div class="stage" bind:this={stage}>
  <canvas bind:this={canvas}></canvas>

  {#if flow && flow.phase !== 'done'}
    <div class="crosshair" aria-hidden="true"></div>
    {#if flow.phase === 'waiting' && !onHome}
      <p class="hint">Return to the white dot</p>
    {/if}
    {#if info}
      <p class="hud">
        {#if info.warmup}Warm-up{:else}Round {info.round}/{info.rounds}{/if}
        · Shot {info.shot}/{info.shots}
        {#if info.cm360 !== null}· {dist(info.cm360)} {unitLabel}{/if}
        · {fps.toFixed(0)} fps
      </p>
    {/if}
  {/if}

  {#if !flow}
    <form class="panel" onsubmit={(e) => { e.preventDefault(); void start() }}>
      <h1>Flick test</h1>

      <div class="field">
        <div class="field-head">
          <label for="dpi">DPI</label>
          <HelpTip label="DPI" text={HELP.dpi} />
        </div>
        <input id="dpi" type="number" min="50" step="50" bind:value={dpi} required />
      </div>

      <div class="field">
        <div class="field-head">
          <label for="distance">Current {unitLabel} (optional)</label>
          <HelpTip label={unitLabel} text={HELP.distance} />
        </div>
        <div class="row">
          <input id="distance" type="number" min="1" max="200" step="0.1" bind:value={currentDistance} />
          <div class="units" role="group" aria-label="Distance unit">
            <button type="button" aria-pressed={unit === 'cm'} onclick={() => (unit = 'cm')}>cm</button>
            <button type="button" aria-pressed={unit === 'in'} onclick={() => (unit = 'in')}>in</button>
          </div>
        </div>
      </div>

      <div class="field">
        <div class="field-head">
          <label for="game">Game</label>
          <HelpTip label="the game setting" text={HELP.game} />
        </div>
        <select id="game" bind:value={gameId}>
          <option value="">None (70° vertical)</option>
          {#each games as g (g.id)}
            <option value={g.id}>{g.name}{g.fov ? '' : ' (FOV unknown)'}</option>
          {/each}
        </select>
        {#if gamesError}<p class="error">Game list unavailable: {gamesError}</p>{/if}
      </div>

      <div class="field">
        <div class="field-head">
          <label for="fov">In-game FOV (optional)</label>
          <HelpTip label="in-game FOV" text={HELP.fov} />
        </div>
        <input id="fov" type="number" min="30" max="150" step="1" bind:value={playerFov} />
      </div>

      {#if setupError}<p class="error">{setupError}</p>{/if}
      <button type="submit" class="primary">Start</button>
    </form>
  {:else if flow.phase === 'ready'}
    <div class="panel">
      <p>
        {flow.block?.kind === 'warmup' ? 'Warm-up, not scored.' : 'Next block.'}
        {#if flow.block?.attempt}Repeating: too many shots were invalid.{/if}
      </p>
      <p class="muted">Aim at the white dot. A target appears; flick to it and click. Then come back to the dot.</p>
      {#if locked}
        <p>Click to start.</p>
      {:else}
        <button class="primary" onclick={lockMouse}>Lock mouse</button>
      {/if}
      {#if lockError}<p class="error">{lockError}</p>{/if}
      {#if view}
        <p class="muted">
          View: {view.horizontalFov.toFixed(1)}° horizontal ({view.source}) · raw input: {raw}
        </p>
      {/if}
    </div>
  {:else if flow.phase === 'round-summary' && flow.lastRound}
    {@const r = flow.lastRound}
    <div class="panel">
      <h2>Round {r.round + 1}</h2>
      {#each [r.low, r.high] as b (b.side)}
        <p class:win={r.winner === b.side}>
          {dist(b.cm360)} {unitLabel} · score {(b.summary.score * 100).toFixed(1)} · bias {pct(b.summary.bias)}
          ({b.summary.bias >= 0 ? 'overshoot' : 'undershoot'})
        </p>
      {/each}
      <p class="muted">Decided by {r.decidedBy}. Click to continue.</p>
    </div>
  {:else if flow.phase === 'paused'}
    <div class="panel">
      <h2>Paused</h2>
      {#if lockError}<p class="error">{lockError}</p>{/if}
      <button class="primary" onclick={resumeTest}>Resume</button>
      <button class="primary" onclick={restartTest}>Restart</button>
      <button class="primary" onclick={quit}>Quit</button>
    </div>
  {:else if flow.phase === 'done' && flow.result}
    {@const res = flow.result}
    <div class="panel wide">
      <h2>Sweet spot: {dist(res.range.lo)}–{dist(res.range.hi)} {unitLabel}</h2>
      {#if game}
        <p>{game.name}: {sensFor(res.range.hi)}–{sensFor(res.range.lo)} at {dpi} DPI</p>
      {/if}
      {#if res.edge}
        <p class="error">Your best distance may lie {res.edge === 'high' ? 'above' : 'below'} the tested range.</p>
      {/if}
      <div class="table-wrap">
        <table>
          <thead><tr><th>Round</th><th>Low</th><th>High</th><th>Winner</th><th>By</th></tr></thead>
          <tbody>
            {#each res.rounds as r (r.round)}
              <tr>
                <td>{r.round + 1}</td>
                <td>{dist(r.low.cm360)} ({pct(r.low.summary.bias)})</td>
                <td>{dist(r.high.cm360)} ({pct(r.high.summary.bias)})</td>
                <td>{r.winner ?? '–'}</td>
                <td>{r.decidedBy}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="muted">A short browser test. Confirm it in game.</p>
      <button class="primary" onclick={restartTest}>Retest</button>
      <button class="primary" onclick={quit}>Back</button>
    </div>
  {/if}
</div>

<style>
  .stage {
    position: fixed;
    inset: 0;
    background: var(--color-bg);
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .crosshair {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 20px;
    height: 20px;
    transform: translate(-50%, -50%);
    /* Open centre so the home dot stays visible under the crosshair. */
    background:
      linear-gradient(var(--color-text) 35%, transparent 35% 65%, var(--color-text) 65%) center / 2px 100% no-repeat,
      linear-gradient(to right, var(--color-text) 35%, transparent 35% 65%, var(--color-text) 65%) center / 100% 2px
        no-repeat;
    opacity: 0.85;
    pointer-events: none;
  }
  .hint {
    position: absolute;
    left: 50%;
    top: calc(50% + 28px);
    transform: translateX(-50%);
    margin: 0;
    color: var(--color-text-muted);
    font-size: 14px;
    pointer-events: none;
  }
  .hud {
    position: absolute;
    top: 12px;
    left: 16px;
    margin: 0;
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--color-text);
    pointer-events: none;
  }
  .panel {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: grid;
    /* minmax(0, 1fr): long option text must not widen the panel. */
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
    width: min(420px, calc(100% - 32px));
    padding: 20px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
  }
  .panel.wide {
    width: min(720px, calc(100% - 32px));
  }
  h1,
  h2,
  p {
    margin: 0;
  }
  .field {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .field-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  label {
    color: var(--color-text-muted);
  }
  .row {
    display: flex;
    gap: 8px;
    min-width: 0;
  }
  .row input {
    flex: 1;
  }
  input,
  select {
    width: 100%;
    min-width: 0;
    min-height: var(--touch-target);
    padding: 0 12px;
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-control);
    font-family: var(--font-mono);
  }
  select {
    text-overflow: ellipsis;
  }
  .units {
    display: flex;
    flex: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-control);
    overflow: hidden;
  }
  .units button {
    min-width: var(--touch-target);
    min-height: var(--touch-target);
    padding: 0 10px;
    border: 0;
    background: var(--color-bg);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    cursor: pointer;
  }
  .units button[aria-pressed='true'] {
    background: var(--color-accent);
    color: var(--color-on-accent);
    font-weight: var(--weight-bold);
  }
  .primary {
    min-height: var(--touch-target);
    background: var(--color-accent);
    color: var(--color-on-accent);
    border: 0;
    border-radius: var(--radius-control);
    font-weight: var(--weight-bold);
    cursor: pointer;
  }
  .primary:hover {
    background: var(--color-accent-hover);
  }
  .muted {
    color: var(--color-text-muted);
    font-size: 14px;
  }
  .error {
    color: var(--color-danger);
  }
  .win {
    color: var(--color-accent);
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    font-family: var(--font-mono);
    font-size: 14px;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 4px 8px;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }
</style>
