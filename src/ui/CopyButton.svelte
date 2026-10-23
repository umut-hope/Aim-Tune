<!-- Copies a value to the clipboard and confirms with "Copied" for a moment. -->
<script lang="ts">
  interface Props {
    value: string
    /** Visible label, e.g. "Copy". */
    label?: string
    /** Accessible name, e.g. "Copy sens 1.16". */
    ariaLabel?: string
  }

  let { value, label = 'Copy', ariaLabel }: Props = $props()
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

<button type="button" class="btn copy" class:is-copied={state === 'copied'} onclick={copy} aria-label={ariaLabel ?? label}>
  {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
</button>
<span class="sr-only" aria-live="polite">{state === 'copied' ? 'Copied to clipboard' : ''}</span>

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
