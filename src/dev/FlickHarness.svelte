<!--
  Temporary page for trying the flick test before the real setup and results
  screens exist. Plain on purpose; it will be replaced by src/ui.
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { resolveView, type ResolvedView } from '../core/view'
  import { initialRange } from '../core/search'
  import { degreesPerCountAtCm360, sensFromCm360 } from '../core/units'
  import { findGame, gamesLoader, type Game } from '../data/games'
  import { FlickScene } from '../scene/flick-scene'
  import { PointerLockInput, type RawInput } from '../scene/pointer-lock'
  import {
    activeCm360,
    click,
    createFlickFlow,
    hud,
    pause,
    proceed,
    restart,
    resume,
    tick,
    type FlickFlowState,
  } from '../tests/flick-flow'

  let dpi = $state(800)
  // Empty number inputs bind to undefined.
  let currentCm = $state<number | null | undefined>(undefined)
  let gameId = $state('')
  let playerFov = $state<number | null | undefined>(undefined)

  let games = $state.raw<Game[]>([])
  let gamesError = $state<string | null>(null)

  let flow = $state.raw<FlickFlowState | null>(null)
  let view = $state.raw<ResolvedView | null>(null)
  let raw = $state<RawInput>('unknown')
  let fps = $state(0)
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
        const now = performance.now()
        if (flow.phase === 'aiming') flow = click(flow, now, scene.direction())
        else if (flow.phase === 'ready' || flow.phase === 'round-summary') flow = proceed(flow, now)
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
      if (flow) flow = tick(flow, now, scene.direction())
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
    if (input?.locked) flow = resume(flow, performance.now())
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

  const pct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`
  const sensFor = (cm: number) => (game ? sensFromCm360(cm, dpi, game.yaw).toFixed(3) : null)
</script>

<div class="stage" bind:this={stage}>
  <canvas bind:this={canvas}></canvas>

  {#if flow && flow.phase !== 'done'}
    <div class="crosshair" aria-hidden="true"></div>
    {#if info}
      <p class="hud">
        {#if info.warmup}Warm-up{:else}Round {info.round}/{info.rounds}{/if}
        · Shot {info.shot}/{info.shots}
        {#if info.cm360 !== null}· {info.cm360.toFixed(1)} cm/360{/if}
        · {fps.toFixed(0)} fps
      </p>
    {/if}
  {/if}

  {#if !flow}
    <form class="panel" onsubmit={(e) => { e.preventDefault(); void start() }}>
      <h1>Flick test (dev)</h1>
      <label>DPI <input type="number" min="50" step="50" bind:value={dpi} required /></label>
      <label>
        Current cm/360 (optional)
        <input type="number" min="5" max="200" step="0.1" bind:value={currentCm} />
      </label>
      <label>
        Game (for FOV)
        <select bind:value={gameId}>
          <option value="">None (70° vertical)</option>
          {#each games as g (g.id)}
            <option value={g.id}>{g.name}{g.fov ? '' : ' (FOV unknown)'}</option>
          {/each}
        </select>
      </label>
      {#if gamesError}<p class="error">Game list unavailable: {gamesError}</p>{/if}
      <label>
        In-game FOV (optional)
        <input type="number" min="30" max="150" step="1" bind:value={playerFov} />
      </label>
      {#if setupError}<p class="error">{setupError}</p>{/if}
      <button type="submit">Start</button>
    </form>
  {:else if flow.phase === 'ready'}
    <div class="panel">
      <p>
        {flow.block?.kind === 'warmup' ? 'Warm-up, not scored.' : 'Next block.'}
        {#if flow.block?.attempt}Repeating: too many shots were invalid.{/if}
      </p>
      {#if locked}
        <p>Click to start.</p>
      {:else}
        <button onclick={lockMouse}>Lock mouse</button>
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
          {b.cm360.toFixed(1)} cm/360 · score {(b.summary.score * 100).toFixed(1)} · bias {pct(b.summary.bias)}
          ({b.summary.bias >= 0 ? 'overshoot' : 'undershoot'})
        </p>
      {/each}
      <p class="muted">Decided by {r.decidedBy}. Click to continue.</p>
    </div>
  {:else if flow.phase === 'paused'}
    <div class="panel">
      <h2>Paused</h2>
      {#if lockError}<p class="error">{lockError}</p>{/if}
      <button onclick={resumeTest}>Resume</button>
      <button onclick={restartTest}>Restart</button>
      <button onclick={quit}>Quit</button>
    </div>
  {:else if flow.phase === 'done' && flow.result}
    {@const res = flow.result}
    <div class="panel wide">
      <h2>Sweet spot: {res.range.lo.toFixed(1)}–{res.range.hi.toFixed(1)} cm/360</h2>
      {#if game}
        <p>{game.name}: {sensFor(res.range.hi)}–{sensFor(res.range.lo)} at {dpi} DPI</p>
      {/if}
      {#if res.edge}
        <p class="error">Your best distance may lie {res.edge === 'high' ? 'above' : 'below'} the tested range.</p>
      {/if}
      <table>
        <thead><tr><th>Round</th><th>Low</th><th>High</th><th>Winner</th><th>By</th></tr></thead>
        <tbody>
          {#each res.rounds as r (r.round)}
            <tr>
              <td>{r.round + 1}</td>
              <td>{r.low.cm360.toFixed(1)} ({pct(r.low.summary.bias)})</td>
              <td>{r.high.cm360.toFixed(1)} ({pct(r.high.summary.bias)})</td>
              <td>{r.winner ?? '–'}</td>
              <td>{r.decidedBy}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="muted">A short browser test. Confirm it in game.</p>
      <button onclick={restartTest}>Retest</button>
      <button onclick={quit}>Back</button>
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
    width: 14px;
    height: 14px;
    transform: translate(-50%, -50%);
    background:
      linear-gradient(var(--color-text), var(--color-text)) center / 2px 100% no-repeat,
      linear-gradient(var(--color-text), var(--color-text)) center / 100% 2px no-repeat;
    opacity: 0.85;
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
    gap: 12px;
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
  label {
    display: grid;
    gap: 4px;
    color: var(--color-text-muted);
  }
  input,
  select {
    min-height: var(--touch-target);
    padding: 0 12px;
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-control);
    font-family: var(--font-mono);
  }
  button {
    min-height: var(--touch-target);
    background: var(--color-accent);
    color: var(--color-on-accent);
    border: 0;
    border-radius: var(--radius-control);
    font-weight: var(--weight-bold);
    cursor: pointer;
  }
  button:hover {
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
