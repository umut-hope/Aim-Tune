<!--
  A small "?" button next to a field. Hovering or focusing it (keyboard, tap)
  shows a short explanation. The text is linked with aria-describedby so
  screen readers announce it too. The tip is placed against the viewport and
  kept inside it, so it never widens the page on phones.
-->
<script lang="ts">
  interface Props {
    /** What the tip explains, for the button's accessible name, e.g. "DPI". */
    label: string
    text: string
  }

  let { label, text }: Props = $props()
  const id = `help-${Math.random().toString(36).slice(2, 10)}`

  const GAP = 10
  const EDGE = 12
  const MAX_WIDTH = 280

  let trigger: HTMLButtonElement
  let open = $state(false)
  let pos = $state({ left: 0, bottom: 0, width: MAX_WIDTH })

  function show() {
    const r = trigger.getBoundingClientRect()
    const width = Math.min(MAX_WIDTH, window.innerWidth - EDGE * 2)
    const left = Math.min(Math.max(EDGE, r.left - EDGE), window.innerWidth - EDGE - width)
    pos = { left, bottom: window.innerHeight - r.top + GAP, width }
    open = true
  }

  function hide() {
    open = false
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') hide()
  }
</script>

<svelte:window onscroll={hide} onresize={hide} />

<span
  class="help"
  role="presentation"
  onpointerenter={show}
  onpointerleave={hide}
  onfocusin={show}
  onfocusout={hide}
  onkeydown={onKeydown}
>
  <button bind:this={trigger} type="button" class="trigger" aria-label={`What is ${label}?`} aria-describedby={id}>?</button>
  <span
    class="tip"
    class:open
    role="tooltip"
    {id}
    style:left="{pos.left}px"
    style:bottom="{pos.bottom}px"
    style:max-width="{pos.width}px"
  >
    {text}
  </span>
</span>

<style>
  .help {
    display: inline-flex;
    vertical-align: middle;
  }
  .trigger {
    /* Visual circle is small; the hit area is padded up to the touch target. */
    position: relative;
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    margin: -11px 0;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    background: var(--color-surface-raised);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: var(--weight-medium);
    line-height: 1;
    cursor: help;
  }
  .trigger::before {
    content: '';
    position: absolute;
    inset: -11px;
  }
  .trigger:hover,
  .trigger:focus-visible {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .tip {
    /* Hidden tips take no space at all (display: none), so they cannot widen the page. */
    display: none;
    position: fixed;
    z-index: 30;
    width: max-content;
    padding: 10px 12px;
    background: var(--color-tip-bg);
    border: 1px solid var(--color-tip-border);
    border-radius: var(--radius-control);
    color: var(--color-tip-text);
    font-size: 14px;
    font-weight: var(--weight-regular);
    line-height: 1.4;
    text-align: left;
    pointer-events: none;
  }
  .tip.open {
    display: block;
  }
</style>
