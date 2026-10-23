<!-- Site header: logo mark, wordmark and the yawmatch promo slot. -->
<script lang="ts">
  import Promo from './Promo.svelte'
</script>

<header class="site-header">
  <a class="brand" href={import.meta.env.BASE_URL}>
    <span class="brand-mark" aria-hidden="true"></span>
    <span class="brand-word">aimtune</span>
  </a>
  <Promo />
</header>

<style>
  .site-header {
    display: flex;
    align-items: center;
    gap: 1rem;
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

  @media (max-width: 600px) {
    .site-header {
      gap: 0.5rem;
    }
  }
</style>
