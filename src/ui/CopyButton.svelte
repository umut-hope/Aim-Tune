<!-- Copies a value to the clipboard and confirms with "Copied" for a moment. -->
<script lang="ts">
  import { i18n } from './lang.svelte'

  interface Props {
    value: string
    /** Visible label, e.g. "Copy". */
    label?: string
    /** Accessible name, e.g. "Copy sens 1.16". */
    ariaLabel?: string
  }

  let { value, label, ariaLabel }: Props = $props()
  const t = $derived(i18n.t.common)
  const text = $derived(label ?? t.copy)
  let state = $state<'idle' | 'copied' | 'failed'>('idle')
  let timer: number | undefined

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      state = 'copied'
    } catch {
      state = 'failed'
    }
    window.clearTimeout(timer)
    timer = window.setTimeout(() => (state = 'idle'), 1600)
  }
</script>

<button type="button" class="btn copy" class:is-copied={state === 'copied'} onclick={copy} aria-label={ariaLabel ?? text}>
  {state === 'copied' ? t.copied : state === 'failed' ? t.copyFailed : text}
</button>
<span class="sr-only" aria-live="polite">{state === 'copied' ? t.copiedLive : ''}</span>

<style>
  .copy {
    flex: none;
    font-size: 0.9rem;
  }
  .copy.is-copied {
    color: var(--color-on-accent);
    background: var(--color-accent);
    border-color: var(--color-accent);
  }
</style>
