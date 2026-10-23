<!--
  The running tracking test: rest the crosshair on the target, then follow it
  while it moves. Loaded on demand like the flick test.
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import type { SearchResult } from '../core/search'
  import { degreesPerCountAtCm360, fromCm } from '../core/units'
  import { FlickScene } from '../scene/flick-scene'
  import { PointerLockInput, type RawInput } from '../scene/pointer-lock'
  import { formatNumber } from '../ui/links'
  import type { FlickTestConfig } from './FlickTest.svelte'
  import RoundSummary from './RoundSummary.svelte'
  import './screen.css'
  import {
    activeCm360,
    createTrackingFlow,
    hud,
    pause,
    proceed,
    restart,
    resume,
    targetDirection,
    tick,
    type TrackingFlowState,
  } from './tracking-flow'

  interface Props {
    config: FlickTestConfig
    onDone: (result: SearchResult) => void
    onQuit: () => void
  }

  let { config, onDone, onQuit }: Props = $props()

  // svelte-ignore state_referenced_locally
  let flow = $state.raw<TrackingFlowState>(createTrackingFlow({ view: config.view, search: { initial: config.initial } }))
  let now = $state(0)
  let raw = $state<RawInput>('unknown')
  let fps = $state(0)
  let locked = $state(false)
  let lockError = $state<string | null>(null)

  let stage: HTMLDivElement
  let canvas: HTMLCanvasElement
  let scene: FlickScene | null = null
  let input: PointerLockInput | null = null
  let frame = 0
  let lastFrame = 0
  let finished = false

  const info = $derived(hud(flow, now))
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
        scene.rotate(-dx * k, -dy * k)
      },
      onClick() {
        if (flow.phase === 'ready' || flow.phase === 'round-summary') flow = proceed(flow)
      },
      onLockChange(isLocked) {
        locked = isLocked
        if (!isLocked && flow.phase !== 'done') flow = pause(flow)
      },
    })
    const onResize = () => scene?.resize()
    window.addEventListener('resize', onResize)
    frame = requestAnimationFrame(loop)
    void lockMouse()
    return () => window.removeEventListener('resize', onResize)
  })

  onDestroy(() => {
    cancelAnimationFrame(frame)
    input?.dispose()
    scene?.dispose()
  })

  function loop(t: number) {
    if (lastFrame) {
      const dt = t - lastFrame
      fps = fps === 0 ? 1000 / dt : fps * 0.95 + (1000 / dt) * 0.05
    }
    lastFrame = t
    now = t
    if (scene) {
      flow = tick(flow, t, scene.direction())
      scene.showHome(null)
      scene.showTarget(targetDirection(flow, t))
      scene.render()
      if (flow.phase === 'done') finish()
    }
    frame = requestAnimationFrame(loop)
  }

  function finish() {
    if (finished || !flow.result) return
    finished = true
    input?.unlock()
    onDone(flow.result)
  }

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
  {#if flow.phase === 'waiting'}
    <p class="test-hint">Rest your crosshair on the target</p>
  {/if}
  <div class="test-hud">
    <p class="num">
      {#if info.warmup}Warm-up{:else}Round {info.round}/{info.rounds}{/if}
      · Trial {info.trial}/{info.trials}
      {#if info.cm360 !== null}· {dist(info.cm360)} {unitLabel}{/if}
      · {fps.toFixed(0)} fps
    </p>
    <div class="progress" aria-hidden="true">
      <div class="progress-bar" style:width="{info.progress * 100}%"></div>
    </div>
  </div>

  {#if flow.phase === 'ready'}
    <div class="test-panel" role="status">
      <h2>{flow.block?.kind === 'warmup' ? 'Warm-up' : `Round ${info.round} of ${info.rounds}`}</h2>
      {#if flow.block?.kind === 'warmup'}
        <p>A couple of practice runs, not scored.</p>
      {/if}
      {#if flow.block?.attempt}
        <p>Repeating this block: the target was lost too often.</p>
      {/if}
      <ol class="steps">
        <li>Rest your crosshair on the yellow target in the middle.</li>
        <li>After a moment it starts moving. Keep the crosshair on it for 3 seconds.</li>
        <li>No clicking needed. Then it returns to the middle for the next run.</li>
      </ol>
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
      <RoundSummary round={flow.lastRound} unit={config.unit} kind="tracking" />
      <p class="test-go">Click to continue</p>
    </div>
  {:else if flow.phase === 'paused'}
    <div class="test-panel" role="dialog" aria-label="Paused">
      <h2>Paused</h2>
      <p class="muted small">The run in progress was discarded; it starts again from the middle.</p>
      {#if lockError}<p class="form-error">{lockError}</p>{/if}
      <button class="btn btn-primary" onclick={resumeTest}>Resume</button>
      <button class="btn" onclick={restartTest}>Restart</button>
      <button class="btn" onclick={quit}>Quit</button>
    </div>
  {/if}
</div>

<style>
  .progress {
    width: 180px;
    height: 4px;
    margin-top: 0.4rem;
    background: var(--color-surface-raised);
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-bar {
    height: 100%;
    background: var(--color-accent);
  }
  .steps {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding-left: 1.25rem;
  }
</style>
