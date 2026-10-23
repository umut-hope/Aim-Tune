<!--
  Recent runs from this browser, combined. One short test moves by several
  percent from run to run; a few runs together give the steadier answer.
-->
<script lang="ts">
  import { fromCm, sensFromCm360, type DistanceUnit } from '../core/units'
  import type { Game } from '../data/games'
  import type { CombinedRuns } from './history'
  import { formatNumber } from './links'

  interface Props {
    combined: CombinedRuns
    unit: DistanceUnit
    game: Game | null
    dpi: number | null
    onClear: () => void
  }

  let { combined, unit, game, dpi, onClear }: Props = $props()

  const unitWord = $derived(unit === 'cm' ? 'cm' : 'in')
  const dist = (cm: number) => formatNumber(fromCm(cm, unit), 1)
  const sens = (cm: number) => {
    if (!game || dpi === null) return null
    const v = sensFromCm360(cm, dpi, game.yaw)
    return formatNumber(v, v < 1 ? 3 : 2)
  }
  const KIND = { flick: 'Flick', full: 'Full', tracking: 'Tracking' } as const

  function when(iso: string): string {
    const days = Math.floor((Date.now() - Date.parse(iso)) / (24 * 60 * 60 * 1000))
    if (days <= 0) return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return days === 1 ? 'yesterday' : `${days} days ago`
  }

  const gapPct = $derived(Math.round((combined.spread - 1) * 100))
</script>

<section class="card history" aria-labelledby="history-title">
  <h2 id="history-title">Your recent results</h2>
  <ul class="runs">
    {#each combined.runs as run, i (run.at)}
      <li class:latest={i === 0}>
        <span class="muted small">{i === 0 ? 'This run' : when(run.at)} · {KIND[run.kind]}</span>
        <span class="num">
          {dist(run.center)} {unitWord}{#if sens(run.center)}&nbsp;<span class="muted">· {sens(run.center)}</span>{/if}
        </span>
      </li>
    {/each}
  </ul>

  <div class="combined">
    <span class="muted small">Combined ({combined.runs.length} runs)</span>
    <span class="num value">{dist(combined.range.lo)}–{dist(combined.range.hi)} {unitWord}</span>
    {#if sens(combined.center)}
      <span class="num">middle {dist(combined.center)} {unitWord} · {game?.name} {sens(combined.center)}</span>
    {:else}
      <span class="num">middle {dist(combined.center)} {unitWord}</span>
    {/if}
  </div>

  {#if combined.agreement === 'agree'}
    <p>
      These runs agree within <span class="num">{gapPct}%</span>, so the combined range is the steadier answer. Use it
      rather than any single run.
    </p>
  {:else}
    <p>
      Your runs differ by <span class="num">{gapPct}%</span>. A short test moves from run to run; one more run will show
      which way it settles. The combined range is wider to reflect that.
    </p>
  {/if}
  <p class="muted small">
    Kept only in this browser; runs older than two weeks are not combined.
    <button type="button" class="link-button" onclick={onClear}>Clear history</button>
  </p>
</section>

<style>
  .history {
    display: grid;
    gap: 0.75rem;
  }
  h2 {
    font-size: 1.1rem;
  }
  .runs {
    display: grid;
    gap: 0.35rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .runs li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.25rem 1rem;
    padding: 0.4rem 0.6rem;
    background: var(--color-bg);
    border-radius: var(--radius-control);
  }
  .runs li.latest {
    box-shadow: inset 2px 0 0 var(--color-accent);
  }
  .combined {
    display: grid;
    gap: 0.15rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }
  .value {
    font-size: 1.5rem;
    font-weight: var(--weight-bold);
    color: var(--color-accent);
  }
  .link-button {
    min-height: 0;
    padding: 0 0.25rem;
  }
</style>
