<!--
  Results-page card for the A/B feel test: offers a comparison (current vs
  recommended, or the two ends of the range) and shows the outcome afterwards.
-->
<script lang="ts">
  import type { Range } from '../core/search'
  import { fromCm, type DistanceUnit } from '../core/units'
  import { LABELS, type AbOption, type AbOutcome } from '../tests/ab-flow'
  import { hasFinePointer } from './checks'
  import { formatNumber } from './links'

  interface Props {
    range: Range
    current: number | null
    dpi: number | null
    unit: DistanceUnit
    outcome: AbOutcome | null
    onStart: (first: AbOption, second: AbOption, blind: boolean) => void
  }

  let { range, current, dpi, unit, outcome, onStart }: Props = $props()

  let blind = $state(true)
  const finePointer = hasFinePointer()

  const center = $derived(Math.sqrt(range.lo * range.hi))
  /** If the current distance is already in the middle, compare the range's ends instead. */
  const pair = $derived.by((): [AbOption, AbOption] => {
    if (current !== null && Math.abs(current / center - 1) > 0.02) {
      return [
        { cm360: current, name: 'Current' },
        { cm360: center, name: 'Recommended' },
      ]
    }
    return [
      { cm360: range.lo, name: 'Faster end' },
      { cm360: range.hi, name: 'Slower end' },
    ]
  })

  const unitLabel = $derived(unit === 'cm' ? 'cm/360' : 'in/360')
  const dist = (cm: number) => formatNumber(fromCm(cm, unit), 1)
  const accuracy = (hits: number, shots: number) => (shots === 0 ? '–' : `${Math.round((hits / shots) * 100)}%`)
</script>

<section class="card ab" aria-labelledby="ab-title">
  <h2 id="ab-title">Compare by feel</h2>

  {#if outcome}
    <p class="verdict" role="status">
      {#if outcome.preferred}
        You preferred <strong>{outcome.preferred.name}</strong>
        (<span class="num">{dist(outcome.preferred.cm360)} {unitLabel}</span>){outcome.blind ? ', without knowing which was which' : ''}.
      {:else}
        You felt no clear difference, so either works. Pick the one closer to your habits.
      {/if}
    </p>
    <table class="num small">
      <thead>
        <tr><th scope="col">Option</th><th scope="col">Distance</th><th scope="col">Time</th><th scope="col">Hits</th></tr>
      </thead>
      <tbody>
        {#each outcome.options as option, i (i)}
          <tr class:chosen={outcome.choice === i}>
            <th scope="row">{LABELS[i]} · {option.name}</th>
            <td>{dist(option.cm360)}</td>
            <td>{Math.round(outcome.stats[i]!.timeMs / 1000)} s</td>
            <td>{outcome.stats[i]!.hits}/{outcome.stats[i]!.shots} ({accuracy(outcome.stats[i]!.hits, outcome.stats[i]!.shots)})</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="muted small">Hit counts are context only: how it felt is the answer here.</p>
  {:else}
    <p class="muted">
      Aim freely at still and moving targets and switch between two settings with <kbd>Space</kbd>:
      <span class="num">{pair[0].name} {dist(pair[0].cm360)}</span> and
      <span class="num">{pair[1].name} {dist(pair[1].cm360)} {unitLabel}</span>. Then pick the one that feels better.
    </p>
  {/if}

  {#if dpi === null}
    <p class="muted small">Needs your DPI: take the test yourself to compare.</p>
  {:else if !finePointer}
    <p class="muted small">Needs a computer with a mouse.</p>
  {:else}
    <div class="row">
      <label class="blind">
        <input type="checkbox" bind:checked={blind} />
        Blind: hide which is which until I choose
      </label>
      <button type="button" class="btn btn-primary" onclick={() => onStart(pair[0], pair[1], blind)}>
        {outcome ? 'Compare again' : 'Start A/B test'}
      </button>
    </div>
  {/if}
</section>

<style>
  .ab {
    display: grid;
    gap: 0.75rem;
  }
  h2 {
    font-size: 1.1rem;
  }
  .verdict strong {
    color: var(--color-accent);
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 0.3rem 0.4rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-weight: var(--weight-regular);
  }
  tr.chosen th,
  tr.chosen td {
    color: var(--color-text);
    font-weight: var(--weight-bold);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem 1rem;
  }
  .blind {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: var(--touch-target);
    font-size: 0.925rem;
    cursor: pointer;
  }
  .blind input {
    width: 18px;
    min-height: 0;
    height: 18px;
    accent-color: var(--color-accent);
  }
  kbd {
    padding: 0 0.3rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    font-family: var(--font-mono);
    font-size: 0.85em;
  }
</style>
