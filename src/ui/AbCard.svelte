<!--
  Results-page card for the A/B feel test: offers a comparison (current vs
  recommended, or the two ends of the range) and shows the outcome afterwards.
-->
<script lang="ts">
  import type { Range } from '../core/search'
  import { fromCm, type DistanceUnit } from '../core/units'
  import { LABELS, type AbOption, type AbOutcome } from '../tests/ab-flow'
  import { hasFinePointer } from './checks'
  import { abOptionName, i18n } from './lang.svelte'
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
  const t = $derived(i18n.t.ab)
  const finePointer = hasFinePointer()

  const center = $derived(Math.sqrt(range.lo * range.hi))
  /** If the current distance is already in the middle, compare the range's ends instead. */
  const pair = $derived.by((): [AbOption, AbOption] => {
    if (current !== null && Math.abs(current / center - 1) > 0.02) {
      return [
        { cm360: current, name: 'current' },
        { cm360: center, name: 'recommended' },
      ]
    }
    return [
      { cm360: range.lo, name: 'faster' },
      { cm360: range.hi, name: 'slower' },
    ]
  })

  const unitLabel = $derived(unit === 'cm' ? 'cm/360' : 'in/360')
  const dist = (cm: number) => formatNumber(fromCm(cm, unit), 1)
  const accuracy = (hits: number, shots: number) => (shots === 0 ? '–' : `${Math.round((hits / shots) * 100)}%`)
</script>

<section class="card ab" aria-labelledby="ab-title">
  <h2 id="ab-title">{t.title}</h2>

  {#if outcome}
    <p class="verdict" role="status">
      {#if outcome.preferred}
        {@html t.preferredHtml(abOptionName(outcome.preferred.name), `${dist(outcome.preferred.cm360)} ${unitLabel}`, outcome.blind)}
      {:else}
        {t.noDifference}
      {/if}
    </p>
    <table class="num small">
      <thead>
        <tr>{#each t.headers as h (h)}<th scope="col">{h}</th>{/each}</tr>
      </thead>
      <tbody>
        {#each outcome.options as option, i (i)}
          <tr class:chosen={outcome.choice === i}>
            <th scope="row">{LABELS[i]} · {abOptionName(option.name)}</th>
            <td>{dist(option.cm360)}</td>
            <td>{Math.round(outcome.stats[i]!.timeMs / 1000)} s</td>
            <td>{outcome.stats[i]!.hits}/{outcome.stats[i]!.shots} ({accuracy(outcome.stats[i]!.hits, outcome.stats[i]!.shots)})</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="muted small">{t.contextNote}</p>
  {:else}
    <p class="muted">
      {@html t.introHtml(
        `${abOptionName(pair[0].name)} ${dist(pair[0].cm360)}`,
        `${abOptionName(pair[1].name)} ${dist(pair[1].cm360)} ${unitLabel}`,
      )}
    </p>
  {/if}

  {#if dpi === null}
    <p class="muted small">{t.needsDpi}</p>
  {:else if !finePointer}
    <p class="muted small">{t.needsMouse}</p>
  {:else}
    <div class="row">
      <label class="blind">
        <input type="checkbox" bind:checked={blind} />
        {t.blind}
      </label>
      <button type="button" class="btn btn-primary" onclick={() => onStart(pair[0], pair[1], blind)}>
        {outcome ? t.again : t.start}
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
  .verdict :global(strong) {
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
  .ab :global(kbd) {
    padding: 0 0.3rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    font-family: var(--font-mono);
    font-size: 0.85em;
  }
</style>
