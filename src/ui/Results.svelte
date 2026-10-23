<!--
  Results: the recommended range on the ruler next to the player's current
  distance, the range in the game's sens, a per-round chart, the limits of the
  test, and links onward (yawmatch, profile, retest, share).
-->
<script lang="ts" module>
  import type { AimStyle, SkillWeights } from '../core/combined'
  import type { Range, RoundResult, Side } from '../core/search'

  /** Full test: how the flick and tracking parts were combined. */
  export interface BlendInfo {
    style: AimStyle | null
    weights: SkillWeights | null
    flick: Range
    tracking: Range
    /** Tracking rounds; null when opened from a shared link. */
    trackingRounds: readonly RoundResult[] | null
  }

  export interface ResultData {
    range: Range
    current: number | null
    gameId: string | null
    dpi: number | null
    edge: Side | null
    /** Which test produced the result. */
    kind: 'flick' | 'tracking' | 'full'
    /** Full test only. */
    blend: BlendInfo | null
    /** Round details; null when opened from a shared link. */
    rounds: readonly RoundResult[] | null
  }
</script>

<script lang="ts">
  import { fromCm, sensFromCm360, type DistanceUnit } from '../core/units'
  import type { Game } from '../data/games'
  import type { AbOption, AbOutcome } from '../tests/ab-flow'
  import AbCard from './AbCard.svelte'
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
    /** Retest from the edge the result hit; null when there are no settings (shared link). */
    onRetestBeyond: ((edge: Side) => void) | null
    abOutcome: AbOutcome | null
    onAbTest: (first: AbOption, second: AbOption, blind: boolean) => void
  }

  let { result, games, unit, onRetest, onNewTest, onRetestBeyond, abOutcome, onAbTest }: Props = $props()

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

  const STYLE_NAMES: Record<AimStyle, string> = { flicks: 'Mostly flicks', both: 'Both', tracking: 'Mostly tracking' }
  const KIND_NAMES = { flick: 'flick', tracking: 'tracking', full: 'full test' } as const
  const centerOf = (r: Range) => Math.sqrt(r.lo * r.hi)
  /** Where tracking alone pointed compared with flicks (±7% counts as the same). */
  const lean = $derived.by(() => {
    if (!result.blend) return null
    const ratio = centerOf(result.blend.tracking) / centerOf(result.blend.flick)
    return ratio < 0.93 ? 'shorter' : ratio > 1.07 ? 'longer' : 'same'
  })
  const markers = $derived([
    ...(result.current !== null
      ? [{ cm: result.current, label: `you · ${dist(result.current)}`, tone: 'current' as const }]
      : []),
    ...(result.blend
      ? [
          { cm: centerOf(result.blend.flick), label: `flicks · ${dist(centerOf(result.blend.flick))}`, tone: 'muted' as const },
          { cm: centerOf(result.blend.tracking), label: `tracking · ${dist(centerOf(result.blend.tracking))}`, tone: 'muted' as const },
        ]
      : []),
  ])

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
      test: result.kind,
      ...(result.blend
        ? {
            ...(result.blend.style ? { style: result.blend.style } : {}),
            flick: result.blend.flick,
            tracking: result.blend.tracking,
          }
        : {}),
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
  <p class="eyebrow">
    {result.rounds ? 'Your' : 'Shared'} {KIND_NAMES[result.kind]} result
  </p>
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
      {markers}
    />

    {#if result.blend}
      {@const b = result.blend}
      <div class="card blend">
        <h2>How this was combined</h2>
        <dl class="parts">
          <div>
            <dt>Flick part</dt>
            <dd class="num">{dist(b.flick.lo)}–{dist(b.flick.hi)} {unitWord}</dd>
          </div>
          <div>
            <dt>Tracking part</dt>
            <dd class="num">{dist(b.tracking.lo)}–{dist(b.tracking.hi)} {unitWord}</dd>
          </div>
          <div>
            <dt>Weighting</dt>
            <dd>
              {#if b.weights}
                {b.style ? STYLE_NAMES[b.style] : ''}:
                <span class="num">{Math.round(b.weights.flick * 100)}% flick · {Math.round(b.weights.tracking * 100)}% tracking</span>
              {:else}
                by aim style
              {/if}
            </dd>
          </div>
        </dl>
        <p class="muted small">
          Each part found its own range; the result is their weighted average on a log scale. The tracking range is wider,
          so more tracking weight also widens the result.
        </p>
        {#if lean === 'shorter'}
          <p>
            On its own, tracking pointed to a <strong>shorter</strong> distance (a higher sens). If tracking matters more
            in your game than you picked, lean towards the low end.
          </p>
        {:else if lean === 'longer'}
          <p>
            On its own, tracking pointed to a <strong>longer</strong> distance (a lower sens). If tracking matters more in
            your game than you picked, lean towards the high end.
          </p>
        {:else}
          <p>Flicking and tracking pointed to about the same distance.</p>
        {/if}
      </div>
    {/if}

    {#if result.edge}
      <div class="tip" role="note">
        <p class="tip-title">Your best distance may lie {result.edge === 'high' ? 'above' : 'below'} the tested range</p>
        <p>
          The test kept pointing {result.edge === 'high' ? 'towards longer distances (lower sens)' : 'towards shorter distances (higher sens)'}.
          {#if onRetestBeyond}
            A second test centred on that end can look past it.
          {:else}
            Take the test yourself, starting from your own sens, to explore further.
          {/if}
        </p>
        {#if onRetestBeyond}
          {@const edge = result.edge}
          <button type="button" class="btn btn-primary edge-retest" onclick={() => onRetestBeyond(edge)}>
            Test {edge === 'high' ? 'longer distances (lower sens)' : 'shorter distances (higher sens)'}
          </button>
        {/if}
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

    <AbCard
      range={result.range}
      current={result.current}
      dpi={result.dpi}
      {unit}
      outcome={abOutcome}
      onStart={onAbTest}
    />

    {#if result.rounds && result.rounds.length > 0}
      <div class="card">
        <BiasChart rounds={result.rounds} {unit} kind={result.kind === 'tracking' ? 'tracking' : 'flick'} />
      </div>
    {/if}
    {#if result.blend?.trackingRounds && result.blend.trackingRounds.length > 0}
      <div class="card">
        <BiasChart rounds={result.blend.trackingRounds} {unit} kind="tracking" />
      </div>
    {/if}
  </div>

  <aside class="side">
    <div class="tip" role="note">
      <p class="tip-title">A short browser test, not the final word</p>
      <p>
        There is no single correct sensitivity. This range is where you were most consistent in a few minutes of
        {result.kind === 'tracking' ? 'tracking' : result.kind === 'full' ? 'flicks and tracking' : 'flicks'}, in a
        browser, at this frame rate. Try the middle of it in game for a few sessions before deciding.
        {#if result.kind === 'tracking'}
          Tracking preference is usually broader than flicking, so this range is wider; the flick test narrows it
          further.
        {/if}
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
        Saved as {game?.name} sens <span class="num">{sens ? sensText(sens.mid) : ''}</span>. yawmatch and the next test here will start from it.
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
  .blend {
    display: grid;
    gap: 0.75rem;
  }
  .blend h2 {
    font-size: 1.1rem;
  }
  .parts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
    margin: 0;
  }
  .parts div {
    padding: 0.5rem 0.6rem;
    background: var(--color-bg);
    border-radius: var(--radius-control);
  }
  .parts dt {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
  .parts dd {
    margin: 0;
    font-weight: var(--weight-medium);
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
  .edge-retest {
    margin-top: 0.75rem;
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
