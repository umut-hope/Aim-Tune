<!--
  The "mousepad ruler": distances per 360° drawn to scale, in cm or inches.
  Can show a filled bar from zero, a band (a recommended range) and labelled
  markers. All inputs are in cm; the ruler converts for display.
-->
<script lang="ts" module>
  export interface RulerMarker {
    cm: number
    label: string
    /** 'current' = white "you are here", 'accent' = yellow, 'muted' = grey. */
    tone: 'current' | 'accent' | 'muted'
  }
</script>

<script lang="ts">
  import { fromCm, type DistanceUnit } from '../core/units'
  import { formatNumber } from './links'

  interface Props {
    unit: DistanceUnit
    /** Accessible description of what the ruler shows. */
    summary: string
    /** Yellow bar from 0 to this distance. */
    bar?: number | null
    /** Yellow band between two distances. */
    band?: { lo: number; hi: number } | null
    markers?: RulerMarker[]
  }

  let { unit, summary, bar = null, band = null, markers = [] }: Props = $props()

  const SCALES = {
    cm: { base: 60, minor: 1, mid: 5, major: 10, max: 200 },
    in: { base: 24, minor: 0.5, mid: 2, major: 4, max: 80 },
  } as const
  const MIN_PX_PER_UNIT = { cm: 12, in: 28 } as const
  const SIDE = 18

  let viewport = $state<HTMLDivElement>()
  let viewportWidth = $state(0)

  const scale = $derived(SCALES[unit])
  const d = (cm: number) => fromCm(cm, unit)

  const largest = $derived(
    Math.max(bar ?? 0, band?.hi ?? 0, ...markers.map((m) => m.cm)) > 0
      ? d(Math.max(bar ?? 0, band?.hi ?? 0, ...markers.map((m) => m.cm)))
      : 0,
  )
  const scaleMax = $derived(
    Math.min(scale.max, Math.max(scale.base, Math.ceil((largest * 1.05) / scale.major) * scale.major)),
  )
  const px = $derived(Math.max(MIN_PX_PER_UNIT[unit], (viewportWidth - SIDE * 2) / scaleMax))
  const trackWidth = $derived(scaleMax * px)
  const at = (cm: number) => Math.min(d(cm), scaleMax) * px

  const ticks = $derived.by(() => {
    const out: { x: number; size: 'major' | 'mid' | 'minor'; label: string | null }[] = []
    const count = Math.round(scaleMax / scale.minor)
    for (let i = 0; i <= count; i++) {
      const v = i * scale.minor
      const isMajor = Math.abs(v / scale.major - Math.round(v / scale.major)) < 1e-9
      const isMid = Math.abs(v / scale.mid - Math.round(v / scale.mid)) < 1e-9
      out.push({
        x: v * px,
        size: isMajor ? 'major' : isMid ? 'mid' : 'minor',
        label: isMajor ? (i === count ? `${formatNumber(v, 1)} ${unit}` : formatNumber(v, 1)) : null,
      })
    }
    return out
  })

  const sortedMarkers = $derived([...markers].sort((a, b) => a.cm - b.cm))
  /** With two markers, labels point away from each other so they never overlap. */
  function anchor(index: number, x: number): 'start' | 'end' | 'middle' {
    if (sortedMarkers.length === 2) return index === 0 ? 'end' : 'start'
    if (x < 60) return 'start'
    if (x > trackWidth - 60) return 'end'
    return 'middle'
  }

  // Keep the interesting part in view when the ruler scrolls (phones).
  const focus = $derived(band ? at((band.lo + band.hi) / 2) : bar !== null ? at(bar) : null)
  $effect(() => {
    if (!viewport || viewportWidth === 0 || focus === null) return
    const target = focus + SIDE
    const { scrollLeft, clientWidth } = viewport
    if (target > scrollLeft + clientWidth - 40 || target < scrollLeft + 40) {
      viewport.scrollTo({ left: Math.max(0, target - clientWidth * 0.6) })
    }
  })
</script>

<section class="ruler-panel" aria-label={summary}>
  <div class="ruler-viewport" bind:this={viewport} bind:clientWidth={viewportWidth}>
    <div class="ruler" style:width="{trackWidth + SIDE * 2}px" style:--side="{SIDE}px" aria-hidden="true">
      <div class="labels">
        {#each sortedMarkers as m, i (m.label)}
          <span class="marker-label tone-{m.tone} anchor-{anchor(i, at(m.cm))}" style:left="{SIDE + at(m.cm)}px">
            {m.label}
          </span>
        {/each}
      </div>
      <div class="labels">
        <span class="zero">0°</span>
        {#if band}
          <span class="band-label" style:left="{SIDE + (at(band.lo) + at(band.hi)) / 2}px">
            {formatNumber(d(band.lo), 1)}–{formatNumber(d(band.hi), 1)}
          </span>
        {:else if bar !== null}
          <span class="bar-label" class:flip={at(bar) < 140} style:left="{SIDE + at(bar)}px">
            360° · {formatNumber(d(bar), 1)} {unit}
          </span>
        {/if}
      </div>

      <div class="track">
        {#if bar !== null}
          <div class="bar" style:width="{at(bar)}px"></div>
        {/if}
        {#if band}
          <div class="band" style:left="{at(band.lo)}px" style:width="{Math.max(3, at(band.hi) - at(band.lo))}px"></div>
        {/if}
        {#each sortedMarkers as m (m.label)}
          <div class="marker tone-{m.tone}" style:left="{at(m.cm)}px"></div>
        {/each}
      </div>

      <svg class="scale" width={trackWidth + SIDE * 2} height="44">
        <g transform="translate({SIDE} 0)">
          {#each ticks as tick (tick.x)}
            <line
              x1={tick.x}
              x2={tick.x}
              y1="0"
              y2={tick.size === 'major' ? 18 : tick.size === 'mid' ? 12 : 7}
              class="tick tick-{tick.size}"
            />
            {#if tick.label}
              <text x={tick.x} y="34" text-anchor={tick.x === 0 ? 'start' : 'middle'}>{tick.label}</text>
            {/if}
          {/each}
        </g>
      </svg>
    </div>
  </div>
</section>

<style>
  .ruler-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-panel);
    padding: 1rem 0 0.25rem;
    overflow: hidden;
  }
  .ruler-viewport {
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }
  .ruler {
    position: relative;
    padding: 0 var(--side);
  }
  .labels {
    position: relative;
    height: 1.5rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: var(--weight-medium);
  }
  .labels span {
    position: absolute;
    bottom: 0.25rem;
    white-space: nowrap;
    transition: left var(--duration-bar) var(--ease-out);
  }
  .zero {
    left: var(--side);
    color: var(--color-text-muted);
  }
  .bar-label {
    transform: translateX(-100%);
    padding-right: 0.4rem;
    color: var(--color-accent);
  }
  .bar-label.flip {
    transform: none;
    padding: 0 0 0 0.4rem;
  }
  .band-label {
    transform: translateX(-50%);
    color: var(--color-accent);
  }
  .marker-label.anchor-middle {
    transform: translateX(-50%);
  }
  .marker-label.anchor-end {
    transform: translateX(-100%);
    padding-right: 0.35rem;
  }
  .marker-label.anchor-start {
    padding-left: 0.35rem;
  }
  .track {
    position: relative;
    height: 16px;
    background: var(--color-surface-raised);
    border-radius: 4px;
  }
  .bar {
    height: 100%;
    background: var(--color-accent);
    border-radius: 4px 0 0 4px;
    transition: width var(--duration-bar) var(--ease-out);
  }
  .band {
    position: absolute;
    top: 0;
    height: 100%;
    background: var(--color-accent);
    border-radius: 3px;
    transition:
      left var(--duration-bar) var(--ease-out),
      width var(--duration-bar) var(--ease-out);
  }
  .marker {
    position: absolute;
    top: -8px;
    width: 3px;
    height: 32px;
    margin-left: -1.5px;
    border-radius: 2px;
    transition: left var(--duration-bar) var(--ease-out);
  }
  .tone-current {
    color: var(--color-text);
  }
  .marker.tone-current {
    background: var(--color-text);
  }
  .tone-accent {
    color: var(--color-accent);
  }
  .marker.tone-accent {
    background: var(--color-accent-hover);
  }
  .tone-muted {
    color: var(--color-text-muted);
  }
  .marker.tone-muted {
    background: var(--color-text-muted);
  }
  .scale {
    display: block;
    margin: 2px calc(var(--side) * -1) 0;
  }
  .scale .tick {
    stroke: var(--color-text-muted);
    stroke-width: 1;
  }
  .scale .tick-minor {
    stroke: var(--color-border);
  }
  .scale text {
    fill: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: 11px;
  }
</style>
