<!--
  Promo slot for the developer's other project, clearly labelled. Never a
  popup or overlay: a small dismissible pill in the header, hidden for
  `dismissDays` after closing. Icon-only on phones.
-->
<script lang="ts">
  import promo from '../promo.json'
  import { dismissPromo, isPromoDismissed } from './prefs'

  let visible = $state(!isPromoDismissed())

  function close() {
    dismissPromo(promo.dismissDays)
    visible = false
  }
</script>

{#if visible}
  <div class="promo">
    <a
      class="promo-link"
      href={promo.href}
      target="_blank"
      rel="noopener"
      aria-label="{promo.label}: {promo.text} (opens in a new tab)"
    >
      <svg class="promo-icon" viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M3 7h11M10.5 3.5 14 7l-3.5 3.5M17 13H6M9.5 16.5 6 13l3.5-3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="promo-text">
        <span class="promo-label">{promo.label} ·</span>
        {promo.text}
        <span aria-hidden="true">→</span>
      </span>
    </a>
    <button type="button" class="promo-close" onclick={close} aria-label="Hide this for {promo.dismissDays} days">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    </button>
  </div>
{/if}

<style>
  .promo {
    display: flex;
    align-items: center;
    margin-left: auto;
    background: var(--color-bg);
    border: 1px dashed var(--color-border);
    border-radius: 999px;
  }
  .promo-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: var(--touch-target);
    padding: 0 0.25rem 0 0.9rem;
    color: var(--color-text);
    font-size: 0.875rem;
    text-decoration: none;
  }
  .promo-link:hover {
    color: var(--color-accent-hover);
  }
  .promo-icon {
    width: 18px;
    height: 18px;
    flex: none;
    color: var(--color-accent);
  }
  .promo-label {
    color: var(--color-text-muted);
  }
  .promo-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--touch-target);
    height: var(--touch-target);
    color: var(--color-text-muted);
    background: none;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
  }
  .promo-close:hover {
    color: var(--color-text);
  }
  .promo-close svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 600px) {
    .promo-text {
      display: none;
    }
    .promo-link {
      width: var(--touch-target);
      justify-content: center;
      padding: 0;
    }
    .promo-close {
      width: 36px;
    }
  }
</style>
