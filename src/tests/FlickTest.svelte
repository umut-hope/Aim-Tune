<!--
  The running flick test: full-screen 3D room, HUD, and the small panels
  between blocks. Loaded on demand so three.js is not part of the first page.
-->
<script lang="ts" module>
  import type { Range } from '../core/search'
  import type { DistanceUnit } from '../core/units'
  import type { ResolvedView } from '../core/view'

  export interface FlickTestConfig {
    dpi: number
    view: ResolvedView
    initial: Range
    unit: DistanceUnit
  }
</script>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import type { SearchResult } from '../core/search'
  import { degreesPerCountAtCm360, fromCm } from '../core/units'
  import { FlickScene } from '../scene/flick-scene'
  import { PointerLockInput, type RawInput } from '../scene/pointer-lock'
  import { formatNumber } from '../ui/links'
  import RoundSummary from './RoundSummary.svelte'
  import './screen.css'
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
  } from './flick-flow'

  interface Props {
    config: FlickTestConfig
    onDone: (result: SearchResult) => void
    onQuit: () => void
  }

  let { config, onDone, onQuit }: Props = $props()

  // svelte-ignore state_referenced_locally
  let flow = $state.raw<FlickFlowState>(
    createFlickFlow({ search: { initial: config.initial }, targets: { view: config.view } }),
  )
  let raw = $state<RawInput>('unknown')
  let fps = $state(0)
  let onHome = $state(true)
  let locked = $state(false)
  let lockError = $state<string | null>(null)

  let stage: HTMLDivElement
  let canvas: HTMLCanvasElement
  let scene: FlickScene | null = null
  let input: PointerLockInput | null = null
  let frame = 0
  let lastFrame = 0
  let finished = false

  const info = $derived(hud(flow))
  const unitLabel = $derived(config.unit === 'cm' ? 'cm/360' : 'in/360')
  const dist = (cm: number) => formatNumber(fromCm(cm, config.unit), 1)

  onMount(() => {
    scene = new FlickScene(canvas)
    scene.setView(config.view)
    input = new PointerLockInput(stage, {
      onMove(dx, dy) {
        const cm = activeCm360(flow)
        if (cm === null || !scene) return
        const k = degreesPerCountAtCm360(cm, config.dpi)
        // Mouse right turns right (negative yaw), mouse down looks down.
        scene.rotate(-dx * k, -dy * k)
      },
      onClick() {
        if (!scene) return
        if (flow.phase === 'aiming') flow = click(flow, performance.now(), scene.direction())
        else if (flow.phase === 'ready' || flow.phase === 'round-summary') flow = proceed(flow)
        if (flow.phase === 'done') finish()
      },
      onLockChange(isLocked) {
        locked = isLocked
        if (!isLocked && flow.phase !== 'done') flow = pause(flow)
      },
    })
    const onResize = () => scene?.resize()
    window.addEventListener('resize', onResize)
    frame = requestAnimationFrame(loop)
    // Started from a click on the setup screen, so the lock is usually allowed.
    void lockMouse()
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
      const dir = scene.direction()
      flow = tick(flow, now, dir)
      const home = isOnHome(flow, dir)
      if (home !== onHome) onHome = home
      scene.showHome(flow.phase !== 'aiming' && flow.phase !== 'done' ? flow.config.home : null)
      scene.showTarget(flow.target?.direction ?? null)
      scene.render()
    }
    frame = requestAnimationFrame(loop)
  }

  function finish() {
    if (finished || !flow.result) return
    finished = true
    input?.unlock()
    onDone(flow.result)
  }

  /** Locks the pointer; must run inside a click (or right after one). */
  async function lockMouse() {
    lockError = null
    try {
      raw = (await input?.lock()) ?? raw
    } catch (e) {
      lockError = `Could not lock the mouse: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  async function resumeTest() {
    await lockMouse()
    // Read the document directly: the lock-change event may not have fired yet.
    if (input?.locked) flow = resume(flow)
  }

  async function restartTest() {
    flow = restart(flow)
    scene?.resetLook()
    await lockMouse()
  }

  function quit() {
    input?.unlock()
    onQuit()
  }
</script>

<div class="test-stage" bind:this={stage}>
  <canvas bind:this={canvas}></canvas>

  <div class="test-crosshair" aria-hidden="true"></div>
  {#if flow.phase === 'waiting' && !onHome}
    <p class="test-hint">Return to the white dot</p>
  {/if}
  <p class="test-hud num">
    {#if info.warmup}Warm-up{:else}Round {info.round}/{info.rounds}{/if}
    · Shot {info.shot}/{info.shots}
    {#if info.cm360 !== null}· {dist(info.cm360)} {unitLabel}{/if}
    · {fps.toFixed(0)} fps
  </p>

  {#if flow.phase === 'ready'}
    <div class="test-panel" role="status">
      <h2>{flow.block?.kind === 'warmup' ? 'Warm-up' : `Round ${info.round} of ${info.rounds}`}</h2>
      {#if flow.block?.kind === 'warmup'}
        <p>A few practice shots, not scored.</p>
      {/if}
      {#if flow.block?.attempt}
        <p>Repeating this block: too many shots were missed or too slow.</p>
      {/if}
      <p class="muted">
        Aim at the white dot. When a yellow target appears, flick to it and click once. Then come back to the dot.
      </p>
      {#if locked}
        <p class="test-go">Click to start</p>
      {:else}
        <button class="btn btn-primary" onclick={lockMouse}>Lock mouse and start</button>
      {/if}
      {#if lockError}<p class="form-error">{lockError}</p>{/if}
      <p class="muted small">
        View {formatNumber(config.view.horizontalFov, 1)}° horizontal · raw input:
        {raw === 'yes' ? 'on' : raw === 'no' ? 'off (OS settings may affect results)' : 'unknown'}
      </p>
    </div>
  {:else if flow.phase === 'round-summary' && flow.lastRound}
    <div class="test-panel wide" role="status">
      <RoundSummary round={flow.lastRound} unit={config.unit} kind="flick" />
      <p class="test-go">Click to continue</p>
    </div>
  {:else if flow.phase === 'paused'}
    <div class="test-panel" role="dialog" aria-label="Paused">
      <h2>Paused</h2>
      {#if lockError}<p class="form-error">{lockError}</p>{/if}
      <button class="btn btn-primary" onclick={resumeTest}>Resume</button>
      <button class="btn" onclick={restartTest}>Restart</button>
      <button class="btn" onclick={quit}>Quit</button>
    </div>
  {/if}
</div>
