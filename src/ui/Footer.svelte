<script lang="ts">
  import { i18n } from './lang.svelte'

  const t = $derived(i18n.t.footer)
</script>

<footer class="site-footer">
  <p>{t.local}</p>
  <p>{t.notAffiliated}</p>
</footer>

<style>
  .site-footer {
    max-width: 1160px;
    margin: 0 auto;
    padding: 1.5rem 16px 2rem;
    border-top: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }
  .site-footer p {
    margin: 0.2rem 0;
  }
</style>
