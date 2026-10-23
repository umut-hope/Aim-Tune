<!--
  Mean overshoot / undershoot per tested distance, as horizontal bars around a
  zero line. Overshoot goes right (yellow), undershoot left (blue); every bar
  also has its signed value in text, so colour is never the only cue.
-->
<script lang="ts">
  import type { RoundResult } from '../core/search'
  import { fromCm, type DistanceUnit } from '../core/units'
  import { formatNumber } from './links'

  interface Props {
    rounds: readonly RoundResult[]
    unit: DistanceUnit
  }

  let { rounds, unit }: Props = $props()

  const rows = $derived(
    rounds.flatMap((r) =>
      [r.low, r.high]
        .filter((b) => Number.isFinite(b.summary.bias))
        .map((b) => ({ round: r.round + 1, cm: b.cm360, bias: b.summary.bias, better: r.winner === b.side })),
    ),
  )
  /** Scale: at least ±10%, so small biases do not look dramatic. */
  const span = $derived(Math.max(0.1, ...rows.map((r) => Math.abs(r.bias))))
  const pct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`
</script>

<figure class="chart">
  <figcaption>
    <span class="title">Overshoot and undershoot per round</span>
    <span class="legend small">
      <span class="key under">← undershoot (sens too low)</span>
      <span class="key over">overshoot (sens too high) →</span>
    </span>
  </figcaption>
  <table>
    <thead class="sr-only">
      <tr><th>Round</th><th>Distance</th><th>Mean error</th></tr>
    </thead>
    <tbody>
      {#each rows as row, i (i)}
        <tr class:better={row.better}>
          <th scope="row" class="num">{row.round}</th>
          <td class="num dist">{formatNumber(fromCm(row.cm, unit), 1)} {unit}</td>
          <td class="bar-cell">
            <div class="axis">
              <div
                class="bar {row.bias >= 0 ? 'over' : 'under'}"
                style:width="{(Math.abs(row.bias) / span) * 50}%"
                style:left={row.bias >= 0 ? '50%' : `${50 - (Math.abs(row.bias) / span) * 50}%`}
              ></div>
            </div>
          </td>
          <td class="num value {row.bias >= 0 ? 'over' : 'under'}">{pct(row.bias)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <p class="muted small">Rows in bold scored better in their round. Values are the average miss along the flick, relative to its size.</p>
</figure>

<style>
  .chart {
    margin: 0;
  }
  figcaption {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.25rem 1rem;
    margin-bottom: 0.75rem;
  }
  .title {
    font-weight: var(--weight-bold);
  }
  .legend {
    display: flex;
    gap: 1rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  th,
  td {
    padding: 0.2rem 0.4rem;
    text-align: left;
    color: var(--color-text-muted);
  }
  tr.better th,
  tr.better td.dist {
    color: var(--color-text);
    font-weight: var(--weight-bold);
  }
  .dist {
    white-space: nowrap;
  }
  .bar-cell {
    width: 100%;
  }
  .axis {
    position: relative;
    height: 12px;
    background: linear-gradient(var(--color-border), var(--color-border)) center / 1px 100% no-repeat;
  }
  .bar {
    position: absolute;
    top: 2px;
    height: 8px;
    border-radius: 2px;
  }
  .bar.over {
    background: var(--color-overshoot);
  }
  .bar.under {
    background: var(--color-undershoot);
  }
  .value {
    text-align: right;
    white-space: nowrap;
  }
  .key.over,
  td.value.over {
    color: var(--color-overshoot);
  }
  .key.under,
  td.value.under {
    color: var(--color-undershoot);
  }
  .muted {
    margin-top: 0.5rem;
  }
</style>
