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
    /** Weights actually applied (tracking scaled by how much it decided). */
    applied: SkillWeights | null
    /** Share of tracking rounds that picked a winner; null when unknown (shared link). */
    trackingDecided: number | null
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
  import HistoryCard from './HistoryCard.svelte'
  import { combineRecent, type HistoryEntry } from './history'
  import { i18n } from './lang.svelte'
  import CopyButton from './CopyButton.svelte'
  import { browserName, feedbackUrl, formatNumber, resultQuery, yawmatchLink } from './links'
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
    /** This browser's recent runs, newest first (empty for someone else's shared link). */
    history: readonly HistoryEntry[]
    onClearHistory: () => void
    onAbTest: (first: AbOption, second: AbOption, blind: boolean) => void
  }

  let { result, games, unit, onRetest, onNewTest, onRetestBeyond, abOutcome, onAbTest, history, onClearHistory }: Props =
    $props()

  const combined = $derived(combineRecent(history))
  const t = $derived(i18n.t.results)
  const pct = (x: number) => i18n.t.common.percent(Math.round(x * 100))

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

  /** Test names for the feedback form, which stays in English. */
  const KIND_NAMES = { flick: 'flick', tracking: 'tracking', full: 'full test' } as const
  const centerOf = (r: Range) => Math.sqrt(r.lo * r.hi)
  /** Where tracking alone pointed compared with flicks (±7% counts as the same). */
  const lean = $derived.by(() => {
    if (!result.blend) return null
    if (result.blend.applied?.tracking === 0) return 'unknown'
    const ratio = centerOf(result.blend.tracking) / centerOf(result.blend.flick)
    return ratio < 0.93 ? 'shorter' : ratio > 1.07 ? 'longer' : 'same'
  })
  const markers = $derived([
    ...(result.current !== null
      ? [{ cm: result.current, label: t.markerYou(dist(result.current)), tone: 'current' as const }]
      : []),
    ...(result.blend
      ? [{ cm: centerOf(result.blend.flick), label: t.markerFlicks(dist(centerOf(result.blend.flick))), tone: 'muted' as const }]
      : []),
    // A tracking part that decided nothing has no centre worth showing.
    ...(result.blend && result.blend.applied?.tracking !== 0
      ? [{ cm: centerOf(result.blend.tracking), label: t.markerTracking(dist(centerOf(result.blend.tracking))), tone: 'muted' as const }]
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
            ...(result.blend.applied ? { appliedTracking: result.blend.applied.tracking } : {}),
          }
        : {}),
    })
    return `${location.origin}${import.meta.env.BASE_URL}${q}`
  })

  const reportUrl = $derived(
    feedbackUrl({
      test: KIND_NAMES[result.kind],
      range: result.range,
      ...(result.current !== null ? { current: result.current } : {}),
      ...(game ? { game: game.name } : {}),
      ...(sens ? { sens: { lo: sens.low, hi: sens.high } } : {}),
      ...(result.dpi !== null ? { dpi: result.dpi } : {}),
      browser: browserName(navigator.userAgent),
      link: shareUrl,
    }),
  )

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
  <p class="eyebrow">{t.eyebrow(result.rounds !== null, result.kind)}</p>
  <h1>
    {t.sweetSpot}
    <span class="value">{dist(result.range.lo)}–{dist(result.range.hi)} {unitWord}</span>
    <span class="per">/ 360°</span>
  </h1>
  {#if relation}
    <p class="sub">
      {#if relation === 'inside'}
        {@html t.insideHtml(`${dist(result.current!)} ${unitWord}`)}
      {:else}
        {@html t.outsideHtml(`${dist(result.current!)} ${unitWord}`, relation === 'below')}
      {/if}
    </p>
  {/if}
</section>

<div class="layout">
  <div class="main">
    <Ruler
      {unit}
      summary={t.rulerSummary(dist(result.range.lo), dist(result.range.hi), unitWord, result.current !== null ? dist(result.current) : null)}
      band={result.range}
      {markers}
    />

    {#if combined}
      <HistoryCard {combined} {unit} {game} dpi={result.dpi} onClear={onClearHistory} />
    {/if}

    {#if result.blend}
      {@const b = result.blend}
      <div class="card blend">
        <h2>{t.blendTitle}</h2>
        <dl class="parts">
          <div>
            <dt>{t.flickPart}</dt>
            <dd class="num">{dist(b.flick.lo)}–{dist(b.flick.hi)} {unitWord}</dd>
          </div>
          <div>
            <dt>{t.trackingPart}</dt>
            <dd class="num">{dist(b.tracking.lo)}–{dist(b.tracking.hi)} {unitWord}</dd>
          </div>
          <div>
            <dt>{t.weighting}</dt>
            <dd>
              {#if b.weights}
                {b.style ? i18n.t.setup.styles[b.style].name : ''}:
                <span class="num">{i18n.t.setup.weights(Math.round(b.weights.flick * 100), Math.round(b.weights.tracking * 100))}</span>
              {:else}
                {t.byStyle}
              {/if}
              {#if b.applied && (!b.weights || Math.abs(b.applied.tracking - b.weights.tracking) > 0.005)}
                <span class="applied">
                  {t.applied} <span class="num">{pct(b.applied.flick)} · {pct(b.applied.tracking)}</span>
                </span>
              {/if}
            </dd>
          </div>
        </dl>
        <p class="muted small">
          {t.blendNote(b.trackingDecided !== null ? Math.round(b.trackingDecided * 100) : null)}
        </p>
        {#if lean === 'unknown'}
          <p>{t.leanUnknown}</p>
        {:else if lean === 'shorter'}
          <p>{@html t.leanShorterHtml}</p>
        {:else if lean === 'longer'}
          <p>{@html t.leanLongerHtml}</p>
        {:else}
          <p>{t.leanSame}</p>
        {/if}
      </div>
    {/if}

    {#if result.edge}
      <div class="tip" role="note">
        <p class="tip-title">{t.edgeTitle(result.edge === 'high')}</p>
        <p>
          {t.edgeText(result.edge === 'high')}
          {onRetestBeyond ? t.edgeRetest : t.edgeShared}
        </p>
        {#if onRetestBeyond}
          {@const edge = result.edge}
          <button type="button" class="btn btn-primary edge-retest" onclick={() => onRetestBeyond(edge)}>
            {t.edgeButton(edge === 'high')}
          </button>
        {/if}
      </div>
    {/if}

    {#if sens && game}
      <div class="card sens-card">
        <p class="muted small">{@html t.sensInHtml(game.name, formatNumber(result.dpi!, 0))}</p>
        <p class="sens num">{sensText(sens.low)}–{sensText(sens.high)}</p>
        <div class="sens-mid">
          <span>{@html t.middleHtml(sensText(sens.mid))}</span>
          <CopyButton value={sensText(sens.mid)} ariaLabel={t.copySens(sensText(sens.mid))} />
        </div>
      </div>
    {:else if !game && result.gameId === null}
      <p class="muted">{t.pickGame}</p>
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
      <p class="tip-title">{t.honestyTitle}</p>
      <p>
        {t.honestyText(result.kind)}
        {#if result.kind === 'tracking'}
          {t.honestyTracking}
        {/if}
      </p>
    </div>

    <div class="actions">
      <a class="btn btn-primary" href={convertUrl} target="_blank" rel="noopener">
        {t.convert} <span aria-hidden="true">→</span>
      </a>
      {#if game && sens}
        <button type="button" class="btn" onclick={save} disabled={saved === 'saved'}>
          {saved === 'saved' ? t.saved : t.save}
        </button>
      {/if}
      {#if onRetest}
        <button type="button" class="btn" onclick={onRetest}>{t.retest}</button>
      {/if}
      <button type="button" class="btn" onclick={onNewTest}>{onRetest ? t.changeSettings : t.takeYourself}</button>
      <CopyButton value={shareUrl} label={t.copyLink} />
    </div>
    <p class="feedback small">
      {t.feedbackAsk}
      <a href={reportUrl} target="_blank" rel="noopener">{t.feedbackLink}</a>
      <span class="muted">{t.feedbackNote}</span>
    </p>
    {#if saved === 'saved'}
      <p class="muted small" role="status">
        {@html t.savedAsHtml(game?.name ?? '', sens ? sensText(sens.mid) : '')}
      </p>
    {:else if saved === 'failed'}
      <p class="form-error" role="status">{t.saveFailed}</p>
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
  .applied {
    display: block;
    font-size: 0.8rem;
    color: var(--color-text-muted);
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
  .feedback {
    color: var(--color-text-muted);
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
