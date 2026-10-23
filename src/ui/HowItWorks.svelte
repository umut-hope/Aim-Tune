<!-- How the test works and what it cannot tell you. -->
<script lang="ts">
  import { i18n } from './lang.svelte'
  import { YAWMATCH_URL } from './links'

  const t = $derived(i18n.t.how)
  /** Plain sections, in page order, after the flick test. */
  const sections = $derived([t.narrowing, t.tracking, t.history, t.full])
</script>

<article class="how">
  <h1>{t.title}</h1>
  <p class="lead">{t.lead}</p>

  <section>
    <h2>{t.distance.title}</h2>
    <p>
      {t.distance.text[0]}<a href={YAWMATCH_URL} target="_blank" rel="noopener">yawmatch</a>{t.distance.text[1]}
    </p>
  </section>

  <section>
    <h2>{t.flick.title}</h2>
    <ol>
      {#each t.flick.steps as step, i (i)}
        <li>{step}</li>
      {/each}
    </ol>
    {#each t.flick.paras as para, i (i)}
      <p>{para}</p>
    {/each}
  </section>

  {#each sections as section (section.title)}
    <section>
      <h2>{section.title}</h2>
      {#each section.paras as para, i (i)}
        <p>{para}</p>
      {/each}
    </section>
  {/each}

  <section>
    <h2>{t.ab.title}</h2>
    <p>{@html t.ab.textHtml}</p>
  </section>

  <section class="tip">
    <p class="tip-title">{t.limits.title}</p>
    <ul>
      {#each t.limits.items as item, i (i)}
        <li>{item}</li>
      {/each}
    </ul>
    <p>{t.limits.outro}</p>
  </section>

  <section>
    <h2>{t.privacy.title}</h2>
    <p>{t.privacy.text}</p>
  </section>

  <p><a class="btn btn-primary" href="#/">{t.cta}</a></p>
</article>

<style>
  .how {
    display: grid;
    gap: 1.5rem;
    max-width: 68ch;
    padding: 1.5rem 0;
  }
  h1 {
    font-size: clamp(1.9rem, 5vw, 3rem);
    letter-spacing: -0.02em;
  }
  h2 {
    margin-bottom: 0.5rem;
    font-size: 1.25rem;
  }
  .lead {
    color: var(--color-text-muted);
    font-size: 1.1rem;
  }
  section {
    display: grid;
    gap: 0.6rem;
  }
  .how :global(kbd) {
    padding: 0 0.3rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    font-family: var(--font-mono);
    font-size: 0.85em;
  }
  ol,
  ul {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding-left: 1.25rem;
  }
</style>
