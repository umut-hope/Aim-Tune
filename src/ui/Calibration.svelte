<!--
  Optional mouse calibration on the setup screen: slide the mouse along an A4
  sheet and compare the counts the browser reports with the entered DPI.
-->
<script lang="ts">
  import { onDestroy } from 'svelte'
  import { PointerLockInput } from '../scene/pointer-lock'
  import { DEFAULT_REFERENCE_CM, judgeRatio, measuredDpi, type CalibrationVerdict } from './calibration'
  import { i18n } from './lang.svelte'
  import { formatNumber, parsePositive } from './links'

  interface Props {
    dpi: number | null
    /** Correction in use (reported / expected counts), or null for none. */
    applied: number | null
    onApply: (ratio: number | null) => void
  }

  let { dpi, applied, onApply }: Props = $props()

  let open = $state(false)
  let distance = $state(String(DEFAULT_REFERENCE_CM))
  let phase = $state<'idle' | 'measuring' | 'result'>('idle')
  let counts = $state(0)
  let result = $state<{ ratio: number; verdict: CalibrationVerdict; measured: number } | null>(null)
  let error = $state<string | null>(null)

  // Inside the open panel only, so the reference has to be reactive.
  let pad = $state<HTMLDivElement>()
  let input: PointerLockInput | null = null

  const distanceCm = $derived(parsePositive(distance))
  const pct = (ratio: number) => Math.round(Math.abs(ratio - 1) * 100)
  const t = $derived(i18n.t.calibration)

  onDestroy(() => input?.dispose())

  async function start() {
    error = null
    if (dpi === null || distanceCm === null || !pad) return
    counts = 0
    input?.dispose()
    input = new PointerLockInput(pad, {
      onMove(dx) {
        counts += dx
      },
      onClick() {
        finish()
      },
      onLockChange(locked) {
        if (!locked && phase === 'measuring') phase = 'idle'
      },
    })
    try {
      await input.lock()
      phase = 'measuring'
    } catch (e) {
      error = i18n.t.common.lockError(e instanceof Error ? e.message : String(e))
    }
  }

  function finish() {
    if (phase !== 'measuring' || dpi === null || distanceCm === null) return
    phase = 'result'
    input?.unlock()
    const measured = measuredDpi(counts, distanceCm)
    const ratio = measured / dpi
    result = { ratio, verdict: judgeRatio(ratio), measured }
    if (result.verdict === 'match') onApply(1)
  }
</script>

<div class="card calibration">
  <div class="head">
    <div>
      <p class="title">{t.title} <span class="muted small">{t.optional}</span></p>
      {#if applied !== null && Math.abs(applied - 1) > 0.005}
        <p class="small">{@html t.correctionOnHtml(pct(applied), applied < 1)}</p>
      {:else if applied !== null}
        <p class="small">{t.checked}</p>
      {:else}
        <p class="small muted">{t.intro}</p>
      {/if}
    </div>
    {#if !open}
      <button type="button" class="btn" onclick={() => (open = true)} disabled={dpi === null}>
        {applied !== null ? t.redo : t.calibrate}
      </button>
    {/if}
  </div>

  {#if open}
    <ol class="steps small">
      {#each t.stepsHtml as step, i (i)}
        <li>{@html step}</li>
      {/each}
    </ol>
    <div class="row">
      <label class="dist">
        <span class="small muted">{t.distance}</span>
        <input class="num-input" type="text" inputmode="decimal" bind:value={distance} aria-invalid={distanceCm === null} />
      </label>
      <!-- The pointer is locked to this box while measuring. -->
      <div class="pad" class:active={phase === 'measuring'} bind:this={pad}>
        {#if phase === 'measuring'}
          <span class="num">{t.counts(Math.round(counts))}</span>
          <span class="small">{t.slideHint}</span>
        {:else}
          <button type="button" class="btn btn-primary" onclick={start} disabled={distanceCm === null}>{t.start}</button>
        {/if}
      </div>
    </div>

    {#if error}<p class="form-error">{error}</p>{/if}

    {#if phase === 'result' && result}
      {#if result.verdict === 'match'}
        <p class="ok">{@html t.matchHtml(formatNumber(result.measured, 0), dpi ?? 0)}</p>
      {:else if result.verdict === 'off'}
        <p>{@html t.offHtml(formatNumber(result.measured, 0), pct(result.ratio), result.ratio < 1, dpi ?? 0)}</p>
        <div class="row">
          <button type="button" class="btn btn-primary" onclick={() => onApply(result!.ratio)}>{t.useCorrection}</button>
          <button type="button" class="btn" onclick={() => (phase = 'idle')}>{t.measureAgain}</button>
        </div>
      {:else}
        <p class="form-error">{t.bad}</p>
      {/if}
    {/if}

    <div class="row end">
      {#if applied !== null}
        <button type="button" class="link-button" onclick={() => onApply(null)}>{t.remove}</button>
      {/if}
      <button type="button" class="link-button" onclick={() => (open = false)}>{t.close}</button>
    </div>
  {/if}
</div>

<style>
  .calibration {
    display: grid;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  .head .btn {
    flex: none;
    white-space: nowrap;
  }
  .title {
    font-weight: var(--weight-bold);
  }
  .steps {
    display: grid;
    gap: 0.3rem;
    margin: 0;
    padding-left: 1.2rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem;
  }
  .row.end {
    justify-content: flex-end;
  }
  .dist {
    display: grid;
    gap: 0.25rem;
    width: 8rem;
  }
  .pad {
    flex: 1;
    min-width: 12rem;
    min-height: var(--touch-target);
    display: grid;
    place-items: center;
    gap: 0.1rem;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-control);
  }
  .pad.active {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .ok {
    color: var(--color-text);
  }
  .link-button {
    min-height: 0;
  }
</style>
