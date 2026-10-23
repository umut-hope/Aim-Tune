<!--
  Between-rounds panel content, shared by the flick and tracking tests: the two
  distances on a ruler inside the range searched so far, which one scored
  better, and each one's bias in the test's own words.
-->
<script lang="ts">
  import type { RoundResult } from '../core/search'
  import { fromCm, type DistanceUnit } from '../core/units'
  import { formatNumber } from '../ui/links'
  import Ruler from '../ui/Ruler.svelte'

  interface Props {
    round: RoundResult
    unit: DistanceUnit
    kind: 'flick' | 'tracking'
  }

  let { round: r, unit, kind }: Props = $props()

  const words = $derived(
    kind === 'flick'
      ? { plus: 'overshoot', minus: 'undershoot', both: 'over/undershoot' }
      : { plus: 'ahead', minus: 'behind', both: 'lead/lag' },
  )
  const unitLabel = $derived(unit === 'cm' ? 'cm/360' : 'in/360')
  const dist = (cm: number) => formatNumber(fromCm(cm, unit), 1)
  const pct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`
  const better = $derived(r.winner ? r[r.winner] : null)
</script>

<h2>Round {r.round + 1} done</h2>
<Ruler
  {unit}
  summary="The two distances tested this round, inside the range searched so far"
  fit
  band={r.range}
  bandTone="soft"
  markers={[r.low, r.high].map((b) => ({
    cm: b.cm360,
    label: `${dist(b.cm360)}${r.winner === b.side ? ' · better' : ''}`,
    tone: r.winner === b.side ? 'accent' : 'muted',
  }))}
/>
{#if better}
  <p>
    <span class="num">{dist(better.cm360)} {unitLabel}</span> scored better{r.decidedBy === 'bias'
      ? ` (scores were close, so your ${words.both} decided)`
      : ''}.
  </p>
{:else if kind === 'tracking'}
  <p>Both distances scored about the same, so the range stays as it is for now.</p>
{:else}
  <p>Both distances scored about the same.</p>
{/if}
<ul class="bias-list">
  {#each [r.low, r.high] as b (b.side)}
    <li class="num">
      {dist(b.cm360)}:
      <span class={b.summary.bias >= 0 ? 'over' : 'under'}>
        {pct(b.summary.bias)} {b.summary.bias >= 0 ? words.plus : words.minus}
      </span>
    </li>
  {/each}
</ul>

<style>
  h2 {
    font-size: 1.35rem;
  }
  .bias-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.9rem;
  }
  .over {
    color: var(--color-overshoot);
  }
  .under {
    color: var(--color-undershoot);
  }
</style>
