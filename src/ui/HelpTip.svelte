<!--
  A small "?" button next to a field. Hovering or focusing it (keyboard, tap)
  shows a short explanation. The text is linked with aria-describedby so
  screen readers announce it too.
-->
<script lang="ts">
  interface Props {
    /** What the tip explains, for the button's accessible name, e.g. "DPI". */
    label: string
    text: string
  }

  let { label, text }: Props = $props()
  const id = `help-${Math.random().toString(36).slice(2, 10)}`
</script>

<span class="help">
  <button type="button" class="trigger" aria-label={`What is ${label}?`} aria-describedby={id}>?</button>
  <span class="tip" role="tooltip" {id}>{text}</span>
</span>

<style>
  .help {
    position: relative;
    display: inline-flex;
    vertical-align: middle;
  }
  .trigger {
    /* Visual circle is small; the hit area is padded up to the touch target. */
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    min-height: 0;
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
    background: var(--color-surface-raised);
  }
  .tip {
    position: absolute;
    z-index: 10;
    /* Opens to the right: the button usually sits near the left edge of a form. */
    left: -12px;
    bottom: calc(100% + 10px);
    width: max-content;
    max-width: min(280px, 80vw);
    padding: 10px 12px;
    background: var(--color-tip-bg);
    border: 1px solid var(--color-tip-border);
    border-radius: var(--radius-control);
    color: var(--color-tip-text);
    font-size: 14px;
    font-weight: var(--weight-regular);
    line-height: 1.4;
    text-align: left;
    visibility: hidden;
    opacity: 0;
    transition: opacity 120ms ease-out;
    pointer-events: none;
  }
  .help:hover .tip,
  .help:focus-within .tip {
    visibility: visible;
    opacity: 1;
  }
</style>
