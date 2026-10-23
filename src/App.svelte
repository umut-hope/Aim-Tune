<!-- Temporary: shows the dev flick test until the setup and results screens exist. -->
<script lang="ts">
  import FlickHarness from './dev/FlickHarness.svelte'
  import Header from './ui/Header.svelte'

  // Header and promo are hidden while a test runs, so nothing distracts from aiming.
  let running = $state(false)
</script>

{#if !running}
  <div class="header-layer">
    <Header />
  </div>
{/if}

<FlickHarness bind:running />

<style>
  .header-layer {
    position: fixed;
    inset: 0 0 auto;
    z-index: 5;
    background: linear-gradient(var(--color-bg) 40%, transparent);
  }
</style>
