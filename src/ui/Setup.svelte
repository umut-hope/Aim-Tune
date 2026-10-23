<!--
  Setup screen: game, sens, DPI (prefilled from the URL or a saved profile),
  the current distance on the ruler, browser checks, and Start.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { STYLE_WEIGHTS, type AimStyle } from '../core/combined'
  import { DEFAULT_RANGE, initialRange } from '../core/search'
  import { fromCm, type DistanceUnit } from '../core/units'
  import { resolveView } from '../core/view'
  import type { Game } from '../data/games'
  import { probeRawInput, type RawInput } from '../scene/pointer-lock'
  import { fpsStatus, hasFinePointer, measureFps, pointerLockSupported } from './checks'
  import Calibration from './Calibration.svelte'
  import { clearCalibration, loadCalibration, saveCalibration } from './calibration'
  import HelpTip from './HelpTip.svelte'
  import { i18n } from './lang.svelte'
  import { getStorage } from './prefs'
  import { browserName, formatNumber, parsePositive } from './links'
  import Ruler from './Ruler.svelte'
  import { MANUAL_GAME, currentCm360, isPlausibleCm360, type SetupForm, type StartConfig, type TestKind } from './setup'

  interface Props {
    games: readonly Game[]
    gamesError: string | null
    form: SetupForm
    kind: TestKind
    style: AimStyle
    unit: DistanceUnit
    onUnitChange: (unit: DistanceUnit) => void
    onStart: (config: StartConfig) => void
    /** Called once the page is idle, to fetch the test code ahead of time. */
    preload?: () => void
  }

  let {
    games,
    gamesError,
    form = $bindable(),
    kind = $bindable(),
    style = $bindable(),
    unit,
    onUnitChange,
    onStart,
    preload,
  }: Props = $props()

  const t = $derived(i18n.t.setup)

  const KINDS: { id: TestKind; tag: 'recommended' | 'experimental' }[] = [
    { id: 'flick', tag: 'recommended' },
    { id: 'full', tag: 'experimental' },
    { id: 'tracking', tag: 'experimental' },
  ]
  const STYLES: AimStyle[] = ['flicks', 'both', 'tracking']
  const pct = (x: number) => Math.round(x * 100)

  const finePointer = hasFinePointer()
  const browser = typeof navigator === 'undefined' ? 'Other' : browserName(navigator.userAgent)
  /** Saved input correction for this browser (reported / expected counts), or null. */
  let calibration = $state<number | null>(loadCalibration(getStorage(), browser))

  function applyCalibration(ratio: number | null) {
    calibration = ratio
    if (ratio === null) clearCalibration(getStorage(), browser)
    else saveCalibration(getStorage(), browser, ratio)
  }
  const lockSupported = pointerLockSupported()
  let raw = $state<RawInput | null>(null)
  let fps = $state<number | null>(null)
  let startError = $state<string | null>(null)

  const game = $derived(games.find((g) => g.id === form.gameId) ?? null)
  const manual = $derived(form.gameId === MANUAL_GAME)
  const dpi = $derived(parsePositive(form.dpi))
  const current = $derived(currentCm360(form, game?.yaw ?? null, unit))
  const currentOk = $derived(current === null || isPlausibleCm360(current))
  const fovEditable = $derived(!game || game.fov === null || game.fov.adjustable)
  const unitLabel = $derived(unit === 'cm' ? 'cm/360' : 'in/360')
  const testRange = $derived(current !== null && currentOk ? initialRange(current) : DEFAULT_RANGE)
  const canStart = $derived(finePointer && lockSupported && dpi !== null && currentOk && (manual || game !== null || form.gameId === ''))

  onMount(() => {
    measureFps(1000).then((v) => (fps = v))
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500))
    idle(() => preload?.())
  })

  async function checkRaw() {
    raw = await probeRawInput(document.body)
  }

  function start(event: SubmitEvent) {
    event.preventDefault()
    startError = null
    if (!canStart || dpi === null) return
    try {
      const view = resolveView({
        gameFov: game?.fov ?? null,
        aspect: window.screen.width / window.screen.height,
        playerFov: fovEditable ? parsePositive(form.fov) : null,
      })
      onStart({ kind, style, dpi, inputDpi: dpi * (calibration ?? 1), view, initial: testRange, gameId: game?.id ?? null, current: currentOk ? current : null })
    } catch (e) {
      startError = e instanceof Error ? e.message : String(e)
    }
  }

  const dist = (cm: number) => formatNumber(fromCm(cm, unit), 1)
  const rangeText = $derived(`${dist(testRange.lo)}–${dist(testRange.hi)} ${unit}`)
</script>

<section class="hero">
  <h1>{t.heroTitle}</h1>
  <p class="hero-sub">{t.heroSub}</p>
</section>

<form class="workspace" onsubmit={start}>
  <div class="card form-card">
    <div class="field">
      <div class="field-head">
        <span class="kind-label" id="kind-label">{t.kindLabel}</span>
        <HelpTip label={t.kindHelp} text={t.help.kind} />
      </div>
      <div class="kinds" role="group" aria-labelledby="kind-label">
        {#each KINDS as k (k.id)}
          <button type="button" aria-pressed={kind === k.id} onclick={() => (kind = k.id)}>
            <span class="kind-name">{t.kinds[k.id].name} <span class="kind-tag" class:experimental={k.tag === 'experimental'}>{t.tags[k.tag]}</span></span>
            <span class="kind-desc">{t.kinds[k.id].desc}</span>
          </button>
        {/each}
      </div>
    </div>

    {#if kind === 'full'}
      <div class="field">
        <div class="field-head">
          <span class="kind-label" id="style-label">{t.styleLabel}</span>
          <HelpTip label={t.styleHelp} text={t.help.style} />
        </div>
        <div class="styles" role="group" aria-labelledby="style-label">
          {#each STYLES as st (st)}
            <button type="button" aria-pressed={style === st} onclick={() => (style = st)}>
              <span class="style-top">
                <span class="kind-name">{t.styles[st].name}</span>
                <span class="num weights">
                  {t.weights(pct(STYLE_WEIGHTS[st].flick), pct(STYLE_WEIGHTS[st].tracking))}
                </span>
              </span>
              <span class="kind-desc">{t.styles[st].examples}</span>
            </button>
          {/each}
        </div>
        <p class="muted small">{t.styleNote}</p>
      </div>
    {/if}

    <div class="field">
      <div class="field-head">
        <label for="game">{t.gameLabel}</label>
        <HelpTip label={t.gameHelp} text={t.help.game} />
      </div>
      <select id="game" bind:value={form.gameId}>
        <option value="">{t.chooseGame}</option>
        {#each games as g (g.id)}
          <option value={g.id}>{g.name}</option>
        {/each}
        <option value={MANUAL_GAME}>{t.otherGame(unitLabel)}</option>
      </select>
      {#if gamesError}
        <p class="form-error">{t.gamesError(gamesError, unitLabel)}</p>
      {/if}
    </div>

    <div class="field-row">
      {#if manual}
        <div class="field">
          <div class="field-head">
            <label for="distance">{t.currentDistance(unitLabel)}</label>
            <HelpTip label={unitLabel} text={t.help.distance} />
          </div>
          <input id="distance" class="num-input" type="text" inputmode="decimal" autocomplete="off" bind:value={form.distance} aria-invalid={!currentOk} />
        </div>
      {:else}
        <div class="field">
          <div class="field-head">
            <label for="sens">{t.sensLabel}</label>
            <HelpTip label={t.sensHelp} text={t.help.sens} />
          </div>
          <input id="sens" class="num-input" type="text" inputmode="decimal" autocomplete="off" bind:value={form.sens} aria-invalid={!currentOk} />
        </div>
      {/if}
      <div class="field">
        <div class="field-head">
          <label for="dpi">{t.dpiLabel}</label>
          <HelpTip label={t.dpiHelp} text={t.help.dpi} />
        </div>
        <input id="dpi" class="num-input" type="text" inputmode="numeric" autocomplete="off" bind:value={form.dpi} aria-invalid={form.dpi !== '' && dpi === null} />
      </div>
    </div>

    <div class="field">
      <div class="field-head">
        <label for="fov">{t.fovLabel}</label>
        <HelpTip label={t.fovHelp} text={t.help.fov} />
      </div>
      {#if fovEditable}
        <input id="fov" class="num-input" type="text" inputmode="decimal" autocomplete="off" bind:value={form.fov} placeholder={t.fovDefault(game?.fov ? game.fov.default : null)} />
        {#if !game || game.fov === null}
          <p class="muted small">{t.fovUnknown}</p>
        {/if}
      {:else if game?.fov}
        <p id="fov" class="muted small">
          {@html t.fovFixedHtml(game.name, game.fov.default, game.fov.type === 'horizontal-4:3')}
        </p>
      {/if}
    </div>

    <div class="field">
      <span class="field-head"><span class="unit-label">{t.unitsLabel}</span></span>
      <div class="units" role="group" aria-label={t.unitsAria}>
        <button type="button" aria-pressed={unit === 'cm'} onclick={() => onUnitChange('cm')}>cm</button>
        <button type="button" aria-pressed={unit === 'in'} onclick={() => onUnitChange('in')}>in</button>
      </div>
    </div>

    {#if !currentOk}
      <p class="form-error">{t.typo(current !== null ? dist(current) : '?', unitLabel)}</p>
    {/if}
  </div>

  <div class="side">
    <Ruler
      {unit}
      summary={current !== null ? t.rulerCurrent(dist(current), unitLabel) : t.rulerUnset}
      bar={current !== null && currentOk ? current : null}
    />
    <p class="muted small">
      {#if current !== null && currentOk}
        {@html t.startsAroundHtml(rangeText)}
      {:else}
        {@html t.coversHtml(rangeText)}
      {/if}
    </p>

    <ul class="checks card" aria-label={t.checks.aria}>
      <li class={finePointer ? 'pass' : 'warn'}>
        <span class="mark" aria-hidden="true">{finePointer ? '✓' : '!'}</span>
        <span>{finePointer ? t.checks.mouseOk : t.checks.mouseMissing}</span>
      </li>
      <li class={lockSupported ? 'pass' : 'warn'}>
        <span class="mark" aria-hidden="true">{lockSupported ? '✓' : '!'}</span>
        <span>{lockSupported ? t.checks.lockOk : t.checks.lockMissing}</span>
      </li>
      <li class={raw === 'yes' ? 'pass' : raw === null ? 'idle' : 'warn'}>
        <span class="mark" aria-hidden="true">{raw === 'yes' ? '✓' : raw === null ? '?' : '!'}</span>
        <span>
          {#if raw === null}
            {t.checks.rawUnchecked}
            <button type="button" class="link-button" onclick={checkRaw} disabled={!lockSupported}>{t.checks.rawCheck}</button>
          {:else if raw === 'yes'}
            {t.checks.rawYes}
          {:else if raw === 'no'}
            {t.checks.rawNo}
          {:else}
            {t.checks.rawUnknown}
          {/if}
        </span>
      </li>
      <li class={fps === null ? 'idle' : fpsStatus(fps)}>
        <span class="mark" aria-hidden="true">{fps === null ? '…' : fpsStatus(fps) === 'pass' ? '✓' : '!'}</span>
        <span>
          {#if fps === null}
            {t.checks.fpsMeasuring}
          {:else if fpsStatus(fps) === 'pass'}
            {@html t.checks.fpsOkHtml(fps.toFixed(0))}
          {:else}
            {@html t.checks.fpsLowHtml(fps.toFixed(0))}
          {/if}
        </span>
      </li>
    </ul>

    {#if finePointer && lockSupported}
      <Calibration {dpi} applied={calibration} onApply={applyCalibration} />
    {/if}

    {#if !finePointer}
      <div class="tip" role="note">
        <p class="tip-title">{t.phoneTitle}</p>
        <p>{t.phoneText}</p>
      </div>
    {:else}
      <button type="submit" class="btn btn-primary btn-large" disabled={!canStart}>{t.start}</button>
      {#if form.gameId === ''}
        <p class="muted small">{t.chooseTip}</p>
      {/if}
      {#if startError}<p class="form-error">{startError}</p>{/if}
    {/if}
  </div>
</form>

<style>
  .hero {
    padding: 1.5rem 0 1.25rem;
  }
  .hero h1 {
    max-width: 22ch;
    font-size: clamp(1.9rem, 5.2vw, 3.25rem);
    letter-spacing: -0.02em;
  }
  .hero-sub {
    max-width: 60ch;
    margin-top: 0.75rem;
    color: var(--color-text-muted);
    font-size: 1.05rem;
  }
  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
    gap: 1.5rem;
    align-items: start;
  }
  .form-card {
    display: grid;
    gap: 1rem;
  }
  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .kind-label,
  .unit-label {
    font-size: 0.875rem;
    font-weight: var(--weight-medium);
    color: var(--color-text-muted);
  }
  .units {
    width: max-content;
  }
  .kinds {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  .styles {
    display: grid;
    gap: 0.4rem;
  }
  .style-top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.25rem 0.75rem;
  }
  .weights {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }
  .styles button[aria-pressed='true'] .weights {
    color: var(--color-accent);
  }
  .kinds button,
  .styles button {
    display: grid;
    gap: 0.1rem;
    min-height: 48px;
    padding: 0.5rem 0.75rem;
    text-align: left;
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-control);
    cursor: pointer;
  }
  .kinds button:hover,
  .styles button:hover {
    border-color: var(--color-text-muted);
  }
  .kinds button[aria-pressed='true'],
  .styles button[aria-pressed='true'] {
    border-color: var(--color-accent);
    box-shadow: inset 0 0 0 1px var(--color-accent);
  }
  .kind-name {
    font-weight: var(--weight-bold);
  }
  .kinds button[aria-pressed='true'] .kind-name,
  .styles button[aria-pressed='true'] .kind-name {
    color: var(--color-accent);
  }
  .kind-tag {
    margin-left: 0.25rem;
    padding: 0 0.4rem;
    border-radius: 999px;
    background: var(--color-accent);
    color: var(--color-on-accent);
    font-size: 0.7rem;
    font-weight: var(--weight-bold);
    vertical-align: 0.1em;
  }
  .kind-tag.experimental {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
  }
  .kind-desc {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }
  .side {
    display: grid;
    gap: 1rem;
  }
  .checks {
    display: grid;
    gap: 0.6rem;
    margin: 0;
    padding: 1rem 1.25rem;
    list-style: none;
    font-size: 0.925rem;
  }
  .checks li {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
  }
  .checks .link-button {
    min-height: 0;
    padding: 0;
  }
  .mark {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 50%;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: var(--weight-bold);
    transform: translateY(0.15rem);
  }
  .pass .mark {
    background: var(--color-accent);
    color: var(--color-on-accent);
  }
  .warn .mark {
    background: var(--color-tip-bg);
    border: 1px solid var(--color-tip-border);
    color: var(--color-accent);
  }
  .warn {
    color: var(--color-tip-text);
  }
  .idle .mark {
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
  }
  .btn-large {
    width: 100%;
  }

  @media (max-width: 860px) {
    .workspace {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
