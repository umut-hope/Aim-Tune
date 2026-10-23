<!-- Site header: logo mark, wordmark, main nav, language switch and the yawmatch promo slot. -->
<script lang="ts">
  import { LANGS } from './i18n'
  import { i18n } from './lang.svelte'
  import Promo from './Promo.svelte'

  interface Props {
    route: 'test' | 'how'
  }

  let { route }: Props = $props()
  const t = $derived(i18n.t.header)
  /** Each language is named in itself, so it can be found whichever one is active. */
  const NAMES = { en: 'English', tr: 'Türkçe' } as const
</script>

<header class="site-header">
  <a class="brand" href="#/">
    <span class="brand-mark" aria-hidden="true"></span>
    <span class="brand-word">aimtune</span>
  </a>
  <nav class="site-nav" aria-label={t.nav}>
    <a href="#/" aria-current={route === 'test' ? 'page' : undefined}>{t.test}</a>
    <a href="#/how" aria-current={route === 'how' ? 'page' : undefined}>{t.how}</a>
  </nav>
  <div class="lang" role="group" aria-label={t.language}>
    {#each LANGS as l (l)}
      <button type="button" lang={l} aria-label={NAMES[l]} aria-pressed={i18n.lang === l} onclick={() => i18n.set(l)}>
        {l.toUpperCase()}
      </button>
    {/each}
  </div>
  <Promo />
</header>

<style>
  .site-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    max-width: 1160px;
    margin: 0 auto;
    padding: 1rem 16px;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    min-height: var(--touch-target);
    color: var(--color-text);
    text-decoration: none;
  }
  .brand:hover {
    color: var(--color-text);
  }
  .brand-mark {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    background: var(--color-accent);
  }
  .brand-word {
    font-size: 1.2rem;
    font-weight: var(--weight-black);
    letter-spacing: -0.01em;
  }
  .site-nav {
    display: flex;
    gap: 0.25rem;
  }
  .site-nav a {
    display: inline-flex;
    align-items: center;
    min-height: var(--touch-target);
    padding: 0 0.75rem;
    color: var(--color-text-muted);
    font-weight: var(--weight-medium);
    text-decoration: none;
    border-radius: var(--radius-control);
  }
  .site-nav a:hover {
    color: var(--color-text);
  }
  .site-nav a[aria-current='page'] {
    color: var(--color-text);
    box-shadow: inset 0 -2px 0 var(--color-accent);
    border-radius: 0;
  }

  .lang {
    display: flex;
    margin-left: auto;
    padding: 2px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-control);
  }
  .lang button {
    min-width: 40px;
    min-height: calc(var(--touch-target) - 6px);
    padding: 0 0.4rem;
    color: var(--color-text-muted);
    background: none;
    border: 0;
    border-radius: calc(var(--radius-control) - 3px);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: var(--weight-medium);
    cursor: pointer;
  }
  .lang button:hover {
    color: var(--color-text);
  }
  .lang button[aria-pressed='true'] {
    color: var(--color-on-accent);
    background: var(--color-accent);
  }

  @media (max-width: 600px) {
    .site-header {
      gap: 0.4rem;
    }
    .brand-word {
      display: none;
    }
    .site-nav a {
      padding: 0 0.4rem;
      white-space: nowrap;
    }
    .site-nav {
      gap: 0;
    }
    .lang button {
      min-width: 32px;
      padding: 0;
    }
  }
</style>
