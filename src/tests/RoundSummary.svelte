<!--
  Between-rounds panel content, shared by the flick and tracking tests: the two
  distances on a ruler inside the range searched so far, which one scored
  better, and each one's bias in the test's own words.
-->
<script lang="ts">
  import type { RoundResult } from '../core/search'
  import { fromCm, type DistanceUnit } from '../core/units'
  import { i18n } from '../ui/lang.svelte'
  import { formatNumber } from '../ui/links'
  import Ruler from '../ui/Ruler.svelte'

  interface Props {
    round: RoundResult
    unit: DistanceUnit
    kind: 'flick' | 'tracking'
  }

  let { round: r, unit, kind }: Props = $props()

  const t = $derived(i18n.t.round)
  const words = $derived(i18n.t.bias[kind])
  const unitLabel = $derived(unit === 'cm' ? 'cm/360' : 'in/360')
  const dist = (cm: number) => formatNumber(fromCm(cm, unit), 1)
  const pct = (x: number) => `${x >= 0 ? '+' : '−'}${i18n.t.common.percent(Math.abs(x * 100).toFixed(1))}`
  const better = $derived(r.winner ? r[r.winner] : null)
</script>

<h2>{t.done(r.round + 1)}</h2>
<Ruler
  {unit}
  summary={t.summary}
  fit
  band={r.range}
  bandTone="soft"
  markers={[r.low, r.high].map((b) => ({
    cm: b.cm360,
    label: `${dist(b.cm360)}${r.winner === b.side ? ` · ${t.better}` : ''}`,
    tone: r.winner === b.side ? 'accent' : 'muted',
  }))}
/>
{#if better}
  <p>{@html t.scoredBetterHtml(`${dist(better.cm360)} ${unitLabel}`, r.decidedBy === 'bias' ? words.both : null)}</p>
{:else if kind === 'tracking'}
  <p>{t.sameTracking}</p>
{:else}
  <p>{t.same}</p>
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
