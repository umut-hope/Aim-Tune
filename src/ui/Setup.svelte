<!--
  Setup screen: game, sens, DPI (prefilled from the URL or a saved profile),
  the current distance on the ruler, browser checks, and Start.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { DEFAULT_RANGE, initialRange } from '../core/search'
  import { fromCm, type DistanceUnit } from '../core/units'
  import { resolveView } from '../core/view'
  import type { Game } from '../data/games'
  import { probeRawInput, type RawInput } from '../scene/pointer-lock'
  import { fpsStatus, hasFinePointer, measureFps, pointerLockSupported } from './checks'
  import HelpTip from './HelpTip.svelte'
  import { formatNumber, parsePositive } from './links'
  import Ruler from './Ruler.svelte'
  import { MANUAL_GAME, currentCm360, isPlausibleCm360, type SetupForm, type StartConfig } from './setup'

  interface Props {
    games: readonly Game[]
    gamesError: string | null
    form: SetupForm
    unit: DistanceUnit
    onUnitChange: (unit: DistanceUnit) => void
    onStart: (config: StartConfig) => void
    /** Called once the page is idle, to fetch the test code ahead of time. */
    preload?: () => void
  }

  let { games, gamesError, form = $bindable(), unit, onUnitChange, onStart, preload }: Props = $props()

  const HELP = {
    game: "Your main game. Sets the field of view so targets appear where they would in that game, and converts the result to its sens.",
    sens: 'The mouse sensitivity in your game settings, as the game shows it.',
    dpi: 'Counts per inch of your mouse, set in its own software (often 400, 800 or 1600). Not the in-game sensitivity.',
    distance:
      'How far you move the mouse for a full 360° turn. yawmatch can work it out from your in-game sens.',
    fov: "The FOV value in your game's video settings, in the game's own units. Leave empty for the game's default.",
  }

  const finePointer = hasFinePointer()
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
      onStart({ dpi, view, initial: testRange, gameId: game?.id ?? null, current: currentOk ? current : null })
    } catch (e) {
      startError = e instanceof Error ? e.message : String(e)
    }
  }

  const dist = (cm: number) => formatNumber(fromCm(cm, unit), 1)
</script>

<section class="hero">
  <h1>Find the sens your hand actually likes.</h1>
  <p class="hero-sub">
    A short flick test in your browser, about 2–3 minutes. It measures how you aim and suggests a range, not a single
    magic number. You need a mouse.
  </p>
</section>

<form class="workspace" onsubmit={start}>
  <div class="card form-card">
    <div class="field">
      <div class="field-head">
        <label for="game">Game</label>
        <HelpTip label="the game setting" text={HELP.game} />
      </div>
      <select id="game" bind:value={form.gameId}>
        <option value="">Choose your game</option>
        {#each games as g (g.id)}
          <option value={g.id}>{g.name}</option>
        {/each}
        <option value={MANUAL_GAME}>Other: I know my {unitLabel}</option>
      </select>
      {#if gamesError}
        <p class="form-error">
          Could not load the game list ({gamesError}). You can still enter your {unitLabel} with "Other".
        </p>
      {/if}
    </div>

    <div class="field-row">
      {#if manual}
        <div class="field">
          <div class="field-head">
            <label for="distance">Current {unitLabel}</label>
            <HelpTip label={unitLabel} text={HELP.distance} />
          </div>
          <input id="distance" class="num-input" type="text" inputmode="decimal" autocomplete="off" bind:value={form.distance} aria-invalid={!currentOk} />
        </div>
      {:else}
        <div class="field">
          <div class="field-head">
            <label for="sens">In-game sens</label>
            <HelpTip label="in-game sens" text={HELP.sens} />
          </div>
          <input id="sens" class="num-input" type="text" inputmode="decimal" autocomplete="off" bind:value={form.sens} aria-invalid={!currentOk} />
        </div>
      {/if}
      <div class="field">
        <div class="field-head">
          <label for="dpi">DPI</label>
          <HelpTip label="DPI" text={HELP.dpi} />
        </div>
        <input id="dpi" class="num-input" type="text" inputmode="numeric" autocomplete="off" bind:value={form.dpi} aria-invalid={form.dpi !== '' && dpi === null} />
      </div>
    </div>

    <div class="field">
      <div class="field-head">
        <label for="fov">In-game FOV (optional)</label>
        <HelpTip label="in-game FOV" text={HELP.fov} />
      </div>
      {#if fovEditable}
        <input id="fov" class="num-input" type="text" inputmode="decimal" autocomplete="off" bind:value={form.fov} placeholder={game?.fov ? `default ${game.fov.default}` : 'default'} />
        {#if !game || game.fov === null}
          <p class="muted small">FOV not known for this game: a typical 70° vertical is used unless you enter yours.</p>
        {/if}
      {:else if game?.fov}
        <p id="fov" class="muted small">
          Fixed in {game.name}: <span class="num">{game.fov.default}</span>{game.fov.type === 'horizontal-4:3' ? ' (4:3 horizontal)' : ''}.
        </p>
      {/if}
    </div>

    <div class="field">
      <span class="field-head"><span class="unit-label">Show distances in</span></span>
      <div class="units" role="group" aria-label="Distance unit">
        <button type="button" aria-pressed={unit === 'cm'} onclick={() => onUnitChange('cm')}>cm</button>
        <button type="button" aria-pressed={unit === 'in'} onclick={() => onUnitChange('in')}>in</button>
      </div>
    </div>

    {#if !currentOk}
      <p class="form-error">That works out to {current !== null ? dist(current) : '?'} {unitLabel}, which looks like a typo.</p>
    {/if}
  </div>

  <div class="side">
    <Ruler
      {unit}
      summary={current !== null ? `Your current distance: ${dist(current)} ${unitLabel}` : 'Your current distance is not set'}
      bar={current !== null && currentOk ? current : null}
    />
    <p class="muted small">
      {#if current !== null && currentOk}
        The test starts around your current distance: <span class="num">{dist(testRange.lo)}–{dist(testRange.hi)} {unit}</span>.
      {:else}
        Without your current sens the test covers <span class="num">{dist(testRange.lo)}–{dist(testRange.hi)} {unit}</span>.
      {/if}
    </p>

    <ul class="checks card" aria-label="Browser checks">
      <li class={finePointer ? 'pass' : 'warn'}>
        <span class="mark" aria-hidden="true">{finePointer ? '✓' : '!'}</span>
        <span>{finePointer ? 'Mouse detected' : 'No mouse detected. The test needs a mouse.'}</span>
      </li>
      <li class={lockSupported ? 'pass' : 'warn'}>
        <span class="mark" aria-hidden="true">{lockSupported ? '✓' : '!'}</span>
        <span>{lockSupported ? 'Pointer lock supported' : 'This browser cannot lock the mouse. Try Chrome, Edge or Firefox.'}</span>
      </li>
      <li class={raw === 'yes' ? 'pass' : raw === null ? 'idle' : 'warn'}>
        <span class="mark" aria-hidden="true">{raw === 'yes' ? '✓' : raw === null ? '?' : '!'}</span>
        <span>
          {#if raw === null}
            Raw input not checked yet.
            <button type="button" class="link-button" onclick={checkRaw} disabled={!lockSupported}>Check</button>
          {:else if raw === 'yes'}
            Raw input on: OS mouse acceleration is bypassed.
          {:else if raw === 'no'}
            No raw input in this browser. Turn off "Enhance pointer precision" (Windows) or mouse acceleration, or results may drift.
          {:else}
            Could not tell if raw input works. Turning off OS mouse acceleration is safest.
          {/if}
        </span>
      </li>
      <li class={fps === null ? 'idle' : fpsStatus(fps)}>
        <span class="mark" aria-hidden="true">{fps === null ? '…' : fpsStatus(fps) === 'pass' ? '✓' : '!'}</span>
        <span>
          {#if fps === null}
            Measuring frame rate…
          {:else if fpsStatus(fps) === 'pass'}
            <span class="num">{fps.toFixed(0)}</span> fps
          {:else}
            Only <span class="num">{fps.toFixed(0)}</span> fps. Close other tabs or plug in a laptop for smoother flicks.
          {/if}
        </span>
      </li>
    </ul>

    {#if !finePointer}
      <div class="tip" role="note">
        <p class="tip-title">Use a computer with a mouse</p>
        <p>The flick test needs a mouse and a keyboard. Open this page on your computer to take it.</p>
      </div>
    {:else}
      <button type="submit" class="btn btn-primary btn-large" disabled={!canStart}>Start test</button>
      {#if form.gameId === ''}
        <p class="muted small">Tip: choose your game to get the result in its sens.</p>
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
  .unit-label {
    font-size: 0.875rem;
    font-weight: var(--weight-medium);
    color: var(--color-text-muted);
  }
  .units {
    width: max-content;
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
