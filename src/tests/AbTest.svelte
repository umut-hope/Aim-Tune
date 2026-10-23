<!--
  A/B feel test screen: free aiming at still and moving targets, Space to
  switch between two sensitivities, Esc to pick the one that felt better.
  Loaded on demand, like the flick test.
-->
<script lang="ts" module>
  import type { DistanceUnit } from '../core/units'
  import type { ResolvedView } from '../core/view'
  import type { AbOption } from './ab-flow'

  export interface AbTestConfig {
    dpi: number
    view: ResolvedView
    first: AbOption
    second: AbOption
    blind: boolean
    unit: DistanceUnit
  }
</script>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { degreesPerCountAtCm360, fromCm } from '../core/units'
  import { FlickScene } from '../scene/flick-scene'
  import { PointerLockInput } from '../scene/pointer-lock'
  import { abOptionName, i18n } from '../ui/lang.svelte'
  import { formatNumber } from '../ui/links'
  import { createField, directionAt, hitIndex, respawn, type FieldTarget } from './ab-field'
  import {
    LABELS,
    MIN_TRY_MS,
    activeCm360,
    canChoose,
    choose,
    createAbTest,
    outcome,
    pause,
    resume,
    shoot,
    start,
    tick,
    toggle,
    type AbChoice,
    type AbOutcome,
    type AbState,
  } from './ab-flow'

  interface Props {
    config: AbTestConfig
    onDone: (outcome: AbOutcome) => void
    onQuit: () => void
  }

  let { config, onDone, onQuit }: Props = $props()

  // svelte-ignore state_referenced_locally
  let ab = $state.raw<AbState>(createAbTest({ first: config.first, second: config.second, blind: config.blind }))
  // svelte-ignore state_referenced_locally
  let field: FieldTarget[] = createField(Math.random, config.view)
  let locked = $state(false)
  let lockError = $state<string | null>(null)
  let flash = $state(false)

  let stage: HTMLDivElement
  let canvas: HTMLCanvasElement
  let scene: FlickScene | null = null
  let input: PointerLockInput | null = null
  let frame = 0
  let lastFrame = 0
  /** Target clock in seconds; stands still while paused. */
  let clock = 0
  let flashTimer: number | undefined
  let finished = false

  const unitLabel = $derived(config.unit === 'cm' ? 'cm/360' : 'in/360')
  const dist = (cm: number) => formatNumber(fromCm(cm, config.unit), 1)
  const t = $derived(i18n.t.abTest)
  const tt = $derived(i18n.t.test)
  const seconds = (ms: number) => `${Math.floor(ms / 1000)} s`
  const optionText = (i: 0 | 1) =>
    config.blind
      ? t.option(LABELS[i])
      : `${LABELS[i]} · ${abOptionName(ab.options[i].name)} · ${dist(ab.options[i].cm360)} ${unitLabel}`

  onMount(() => {
    scene = new FlickScene(canvas)
    scene.setView(config.view)
    input = new PointerLockInput(stage, {
      onMove(dx, dy) {
        if (!scene) return
        const k = degreesPerCountAtCm360(activeCm360(ab), config.dpi)
        scene.rotate(-dx * k, -dy * k)
      },
      onClick() {
        if (!scene) return
        if (ab.phase === 'ready') {
          ab = start(ab)
          return
        }
        if (ab.phase !== 'playing') return
        const hit = hitIndex(field, clock, scene.direction())
        ab = shoot(ab, hit >= 0)
        if (hit >= 0) field = respawn(field, hit, Math.random, config.view, clock)
      },
      onLockChange(isLocked) {
        locked = isLocked
        if (!isLocked) ab = pause(ab)
      },
    })
    const onResize = () => scene?.resize()
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)
    frame = requestAnimationFrame(loop)
    void lockMouse()
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
    }
  })

  onDestroy(() => {
    cancelAnimationFrame(frame)
    window.clearTimeout(flashTimer)
    input?.dispose()
    scene?.dispose()
  })

  function onKey(e: KeyboardEvent) {
    if (e.code !== 'Space' || !locked || ab.phase !== 'playing') return
    e.preventDefault()
    ab = toggle(ab)
    flash = true
    window.clearTimeout(flashTimer)
    flashTimer = window.setTimeout(() => (flash = false), 700)
  }

  function loop(now: number) {
    const dt = lastFrame ? now - lastFrame : 0
    lastFrame = now
    // Only time spent actually aiming (mouse locked) counts towards an option.
    if (ab.phase === 'playing' && locked) {
      ab = tick(ab, dt)
      clock += Math.min(dt, 250) / 1000
    }
    if (scene) {
      scene.showTargets(field.map((t) => directionAt(t, clock)))
      scene.render()
    }
    frame = requestAnimationFrame(loop)
  }

  async function lockMouse() {
    lockError = null
    try {
      await input?.lock()
    } catch (e) {
      lockError = i18n.t.common.lockError(e instanceof Error ? e.message : String(e))
    }
  }

  async function resumeTest() {
    await lockMouse()
    if (input?.locked) ab = resume(ab)
  }

  function pick(choice: AbChoice) {
    ab = choose(ab, choice)
    const o = outcome(ab)
    if (o && !finished) {
      finished = true
      input?.unlock()
      onDone(o)
    }
  }

  function quit() {
    input?.unlock()
    onQuit()
  }
</script>

<div class="stage" bind:this={stage}>
  <canvas bind:this={canvas}></canvas>
  <div class="crosshair" aria-hidden="true"></div>

  {#if ab.phase === 'playing'}
    <div class="hud">
      <p class="active num" class:flash>{optionText(ab.active)}</p>
      <p class="keys">{@html t.keysHtml}</p>
      <p class="progress num" class:ready={canChoose(ab)}>
        A {seconds(ab.stats[0].timeMs)} · B {seconds(ab.stats[1].timeMs)} ·
        {canChoose(ab) ? t.bothTried : t.tryEach(MIN_TRY_MS / 1000)}
      </p>
    </div>
  {/if}

  {#if ab.phase === 'ready'}
    <div class="panel" role="status">
      <h2>{i18n.t.ab.title}</h2>
      <ol class="steps">
        {#each t.stepsHtml(MIN_TRY_MS / 1000) as step, i (i)}
          <li>{@html step}</li>
        {/each}
      </ol>
      {#if config.blind}
        <p class="muted small">{t.blindNote}</p>
      {/if}
      {#if locked}
        <p class="go">{tt.clickToStart}</p>
      {:else}
        <button class="btn btn-primary" onclick={lockMouse}>{tt.lockAndStart}</button>
      {/if}
      {#if lockError}<p class="form-error">{lockError}</p>{/if}
    </div>
  {:else if ab.phase === 'paused'}
    <div class="panel" role="dialog" aria-label={t.whichBetter}>
      <h2>{t.whichBetter}</h2>
      {#if !canChoose(ab)}
        <p class="muted">{t.tryFirst(MIN_TRY_MS / 1000, seconds(ab.stats[0].timeMs), seconds(ab.stats[1].timeMs))}</p>
      {/if}
      <div class="choices">
        <button class="btn btn-primary" onclick={() => pick(0)} disabled={!canChoose(ab)}>A</button>
        <button class="btn btn-primary" onclick={() => pick(1)} disabled={!canChoose(ab)}>B</button>
        <button class="btn" onclick={() => pick('same')} disabled={!canChoose(ab)}>{t.noDifference}</button>
      </div>
      {#if lockError}<p class="form-error">{lockError}</p>{/if}
      <div class="choices">
        <button class="btn" onclick={resumeTest}>{t.keepComparing}</button>
        <button class="btn" onclick={quit}>{tt.quit}</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .stage {
    position: fixed;
    inset: 0;
    z-index: 20;
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
    pointer-events: none;
  }
  .active {
    font-size: 2rem;
    font-weight: var(--weight-bold);
    color: var(--color-accent);
    transition: transform 150ms var(--ease-out);
  }
  .active.flash {
    transform: scale(1.15);
    transform-origin: left center;
  }
  .keys {
    margin-top: 0.25rem;
    font-size: 1.05rem;
    color: var(--color-text);
  }
  .progress {
    margin-top: 0.15rem;
    font-size: 0.925rem;
    color: var(--color-text-muted);
  }
  .progress.ready {
    color: var(--color-accent);
  }
  .steps {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding-left: 1.25rem;
  }
  .go {
    color: var(--color-accent);
    font-weight: var(--weight-bold);
  }
  .panel {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.75rem;
    width: min(460px, calc(100% - 32px));
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
  }
  .panel h2 {
    font-size: 1.35rem;
  }
  .choices {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 0.5rem;
  }
  .stage :global(kbd) {
    padding: 0 0.3rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    font-family: var(--font-mono);
    font-size: 0.85em;
  }
</style>
