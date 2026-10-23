<!-- How the test works and what it cannot tell you. -->
<script lang="ts">
  import { YAWMATCH_URL } from './links'
</script>

<article class="how">
  <h1>How it works</h1>
  <p class="lead">
    aimtune measures how you flick at different sensitivities and shows the range where you were most consistent. It
    does not know the perfect sens for you; nobody does.
  </p>

  <section>
    <h2>Distance, not a number</h2>
    <p>
      Every game uses its own sens scale, so the test works with the distance your mouse travels for a full 360° turn
      (cm/360). The same distance feels the same in every game. The result is converted to your game's sens only at the
      end, using the same math as <a href={YAWMATCH_URL} target="_blank" rel="noopener">yawmatch</a>.
    </p>
  </section>

  <section>
    <h2>The flick test</h2>
    <ol>
      <li>You aim at a white dot. After a short random pause a yellow target appears somewhere on screen.</li>
      <li>You flick to it and click once. The test records how far you went past the target (overshoot) or stopped short (undershoot), how far you were off to the side, and how long it took.</li>
      <li>You return to the dot, and the next target appears.</li>
    </ol>
    <p>The camera uses your game's field of view, so targets show up where they would in game.</p>
  </section>

  <section>
    <h2>Narrowing down</h2>
    <p>
      After a few unscored warm-up shots, each round tests two distances inside the current range with ten flicks
      each. The better one keeps its half of the range, and the next round looks closer. Five rounds take the range
      from about 3× wide to a few percent.
    </p>
    <p>
      Shots are scored mostly on accuracy relative to the flick size, with speed as a smaller factor. When two
      distances score about the same, your over/undershoot decides: systematic overshoot means the sens is too high,
      undershoot means too low.
    </p>
    <p>
      The final range is never narrower than ±4%, and it widens if your flicks were inconsistent, so the result does not
      look more precise than it is.
    </p>
  </section>

  <section>
    <h2>The tracking test</h2>
    <p>
      Some aim is not a flick but a chase. In the tracking test a target sits in the middle; rest your crosshair on it and
      it starts moving along a smooth, changing path for three seconds. Every frame the test measures how far you are from
      it, and whether you are ahead of it (the sens carries you too far) or behind it (too slow).
    </p>
    <p>
      Tracking is more forgiving of sens than flicking: close distances score almost the same, and reaction time makes
      everyone trail a little. So rounds are decided by score alone, and a round that cannot tell two distances apart
      leaves the range as it is. Expect a wider range than from the flick test; many players settle between the two.
    </p>
  </section>

  <section>
    <h2>Compare by feel</h2>
    <p>
      Numbers are not everything. From the results you can start an A/B test: aim freely at still and moving targets
      and press <kbd>Space</kbd> to switch between two settings, usually your current one and the middle of the
      recommended range. In blind mode they are only called A and B until you choose, so expectations do not decide
      for you. Hits are counted for context, but your choice is the result.
    </p>
  </section>

  <section class="tip">
    <p class="tip-title">What it cannot tell you</p>
    <ul>
      <li>A few minutes in a browser is not a match. Tiredness, warm-up and the game itself all change how you aim.</li>
      <li>Browsers may apply your OS mouse acceleration if raw input is not available. Turn it off for the test.</li>
      <li>Low frame rates make flicks choppy and less accurate.</li>
      <li>Flicking is one skill. Tracking a moving target can favour a different sens.</li>
    </ul>
    <p>Treat the result as a starting point: play the middle of the range for a few sessions, then decide.</p>
  </section>

  <section>
    <h2>Privacy</h2>
    <p>
      Everything runs in your browser. Nothing is uploaded; the only thing stored is what you choose to save, in your
      browser's local storage. A result link carries the numbers in the address itself.
    </p>
  </section>

  <p><a class="btn btn-primary" href="#/">Take the test</a></p>
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
  kbd {
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
