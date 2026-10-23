<!--
  Results: the recommended range on the ruler next to the player's current
  distance, the range in the game's sens, a per-round chart, the limits of the
  test, and links onward (yawmatch, profile, retest, share).
-->
<script lang="ts" module>
  import type { Range, RoundResult, Side } from '../core/search'

  export interface ResultData {
    range: Range
    current: number | null
    gameId: string | null
    dpi: number | null
    edge: Side | null
    /** Round details; null when opened from a shared link. */
    rounds: readonly RoundResult[] | null
  }
</script>

<script lang="ts">
  import { fromCm, sensFromCm360, type DistanceUnit } from '../core/units'
  import type { Game } from '../data/games'
  import BiasChart from './BiasChart.svelte'
  import CopyButton from './CopyButton.svelte'
  import { formatNumber, resultQuery, yawmatchLink } from './links'
  import { getStorage } from './prefs'
  import { saveProfile } from './profile'
  import Ruler from './Ruler.svelte'

  interface Props {
    result: ResultData
    games: readonly Game[]
    unit: DistanceUnit
    /** Retest with the same settings; null when there are none (shared link). */
    onRetest: (() => void) | null
    onNewTest: () => void
  }

  let { result, games, unit, onRetest, onNewTest }: Props = $props()

  let saved = $state<'idle' | 'saved' | 'failed'>('idle')

  const game = $derived(games.find((g) => g.id === result.gameId) ?? null)
  const center = $derived(Math.sqrt(result.range.lo * result.range.hi))
  const unitWord = $derived(unit === 'cm' ? 'cm' : 'in')
  const dist = (cm: number) => formatNumber(fromCm(cm, unit), 1)

  /** In-game sens for the range. A longer distance means a lower sens. */
  const sens = $derived(
    game && result.dpi !== null
      ? {
          low: sensFromCm360(result.range.hi, result.dpi, game.yaw),
          high: sensFromCm360(result.range.lo, result.dpi, game.yaw),
          mid: sensFromCm360(center, result.dpi, game.yaw),
        }
      : null,
  )
  const sensText = (v: number) => formatNumber(v, v < 1 ? 3 : 2)

  /** Where the player's current distance sits relative to the range. */
  const relation = $derived.by(() => {
    const c = result.current
    if (c === null) return null
    if (c >= result.range.lo && c <= result.range.hi) return 'inside'
    return c < result.range.lo ? 'below' : 'above'
  })

  const shareUrl = $derived.by(() => {
    const q = resultQuery({
      lo: result.range.lo,
      hi: result.range.hi,
      ...(result.current !== null ? { current: result.current } : {}),
      ...(result.gameId !== null ? { game: result.gameId } : {}),
      ...(result.dpi !== null ? { dpi: result.dpi } : {}),
      ...(result.edge !== null ? { edge: result.edge } : {}),
    })
    return `${location.origin}${import.meta.env.BASE_URL}${q}`
  })

  const convertUrl = $derived(
    game && sens && result.dpi !== null
      ? yawmatchLink({ game: game.id, sens: sens.mid, dpi: result.dpi })
      : yawmatchLink(),
  )

  function save() {
    if (!game || !sens || result.dpi === null) return
    const ok = saveProfile(getStorage(), { dpi: result.dpi, mainGame: game.id, sens: Number(sensText(sens.mid)) })
    saved = ok ? 'saved' : 'failed'
  }
</script>

<section class="result-hero">
  <p class="eyebrow">{result.rounds ? 'Your result' : 'Shared result'}</p>
  <h1>
    Your sweet spot:
    <span class="value">{dist(result.range.lo)}–{dist(result.range.hi)} {unitWord}</span>
    <span class="per">/ 360°</span>
  </h1>
  {#if relation}
    <p class="sub">
      {#if relation === 'inside'}
        Your current <span class="num">{dist(result.current!)} {unitWord}</span> is already inside this range.
      {:else}
        Your current <span class="num">{dist(result.current!)} {unitWord}</span> is
        {relation === 'below' ? 'shorter' : 'longer'} than this range, so a
        {relation === 'below' ? 'slightly lower' : 'slightly higher'} sens may suit you.
      {/if}
    </p>
  {/if}
</section>

<div class="layout">
  <div class="main">
    <Ruler
      {unit}
      summary={`Recommended ${dist(result.range.lo)} to ${dist(result.range.hi)} ${unitWord} per 360°${result.current !== null ? `, current ${dist(result.current)}` : ''}`}
      band={result.range}
      markers={result.current !== null ? [{ cm: result.current, label: `you · ${dist(result.current)}`, tone: 'current' }] : []}
    />

    {#if result.edge}
      <div class="tip" role="note">
        <p class="tip-title">Your best distance may lie {result.edge === 'high' ? 'above' : 'below'} the tested range</p>
        <p>
          The test kept pointing {result.edge === 'high' ? 'towards longer distances (lower sens)' : 'towards shorter distances (higher sens)'}.
          Retest starting from the edge of this range to explore further.
        </p>
      </div>
    {/if}

    {#if sens && game}
      <div class="card sens-card">
        <p class="muted small">In {game.name} at <span class="num">{formatNumber(result.dpi!, 0)}</span> DPI</p>
        <p class="sens num">{sensText(sens.low)}–{sensText(sens.high)}</p>
        <div class="sens-mid">
          <span>Middle of the range: <span class="num">{sensText(sens.mid)}</span></span>
          <CopyButton value={sensText(sens.mid)} ariaLabel={`Copy sens ${sensText(sens.mid)}`} />
        </div>
      </div>
    {:else if !game && result.gameId === null}
      <p class="muted">Pick your game on the setup screen next time to see this as an in-game sens.</p>
    {/if}

    {#if result.rounds && result.rounds.length > 0}
      <div class="card">
        <BiasChart rounds={result.rounds} {unit} />
      </div>
    {/if}
  </div>

  <aside class="side">
    <div class="tip" role="note">
      <p class="tip-title">A short browser test, not the final word</p>
      <p>
        There is no single correct sensitivity. This range is where you were most consistent in a few minutes of flicks,
        in a browser, at this frame rate. Try the middle of it in game for a few sessions before deciding.
      </p>
    </div>

    <div class="actions">
      <a class="btn btn-primary" href={convertUrl} target="_blank" rel="noopener">
        Convert to other games <span aria-hidden="true">→</span>
      </a>
      {#if game && sens}
        <button type="button" class="btn" onclick={save} disabled={saved === 'saved'}>
          {saved === 'saved' ? 'Saved to profile' : 'Save to profile'}
        </button>
      {/if}
      {#if onRetest}
        <button type="button" class="btn" onclick={onRetest}>Retest</button>
      {/if}
      <button type="button" class="btn" onclick={onNewTest}>{onRetest ? 'Change settings' : 'Take the test yourself'}</button>
      <CopyButton value={shareUrl} label="Copy result link" />
    </div>
    {#if saved === 'saved'}
      <p class="muted small" role="status">
        Saved as {game?.name} sens <span class="num">{sens ? sensText(sens.mid) : ''}</span>. yawmatch and this site will prefill it.
      </p>
    {:else if saved === 'failed'}
      <p class="form-error" role="status">Could not save: your browser blocks local storage.</p>
    {/if}
  </aside>
</div>

<style>
  .result-hero {
    padding: 1.5rem 0 1.25rem;
  }
  .eyebrow {
    margin-bottom: 0.4rem;
    color: var(--color-text-muted);
    font-size: 0.875rem;
    font-weight: var(--weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  h1 {
    font-size: clamp(1.8rem, 4.8vw, 3rem);
    letter-spacing: -0.02em;
  }
  .value {
    font-family: var(--font-mono);
    font-weight: var(--weight-bold);
    color: var(--color-accent);
    white-space: nowrap;
  }
  .per {
    color: var(--color-text-muted);
    font-weight: var(--weight-bold);
    white-space: nowrap;
  }
  .sub {
    margin-top: 0.75rem;
    max-width: 60ch;
    color: var(--color-text-muted);
    font-size: 1.05rem;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
    gap: 1.5rem;
    align-items: start;
  }
  .main,
  .side {
    display: grid;
    gap: 1rem;
  }
  .sens-card {
    display: grid;
    gap: 0.4rem;
  }
  .sens {
    font-size: clamp(2rem, 6vw, 3rem);
    font-weight: var(--weight-bold);
    color: var(--color-accent);
    line-height: 1.1;
  }
  .sens-mid {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem 1rem;
    padding-top: 0.6rem;
    border-top: 1px solid var(--color-border);
  }
  .actions {
    display: grid;
    gap: 0.6rem;
  }

  @media (max-width: 860px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
