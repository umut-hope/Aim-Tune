<!-- Site header: logo mark, wordmark, main nav and the yawmatch promo slot. -->
<script lang="ts">
  import Promo from './Promo.svelte'

  interface Props {
    route: 'test' | 'how'
  }

  let { route }: Props = $props()
</script>

<header class="site-header">
  <a class="brand" href="#/">
    <span class="brand-mark" aria-hidden="true"></span>
    <span class="brand-word">aimtune</span>
  </a>
  <nav class="site-nav" aria-label="Main">
    <a href="#/" aria-current={route === 'test' ? 'page' : undefined}>Test</a>
    <a href="#/how" aria-current={route === 'how' ? 'page' : undefined}>How it works</a>
  </nav>
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

  @media (max-width: 600px) {
    .site-header {
      gap: 0.5rem;
    }
    .brand-word {
      display: none;
    }
    .site-nav a {
      padding: 0 0.5rem;
    }
  }
</style>
