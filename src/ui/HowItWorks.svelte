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
    <p>
      About a third of the targets are small corrections, 4–15° away: in most shooters many fights start with the
      crosshair already close to the enemy. A small miss on a small correction is judged fairly, since nobody's hand is
      more precise than about a degree.
    </p>
    <p>The camera uses your game's field of view, so targets show up where they would in game.</p>
  </section>

  <section>
    <h2>Narrowing down</h2>
    <p>
      After a few unscored warm-up shots, each round tests two distances inside the current range with eight flicks
      each. The next round centres on the better one and keeps about two thirds of the range, including a bit of the
      losing side, so one unlucky round can still be undone later. Six rounds take the range from about 3× wide to a few
      percent.
    </p>
    <p>
      Shots are scored mostly on accuracy relative to the flick size, with speed as a smaller factor. When two
      distances score about the same, your over/undershoot decides: systematic overshoot means the sens is too high,
      undershoot means too low.
    </p>
    <p>
      The final range is never narrower than ±5%, and it widens if your flicks were inconsistent, so the result does not
      look more precise than it is.
    </p>
  </section>

  <section>
    <h2>The tracking test</h2>
    <p>
      Some aim is not a flick but a chase. In the tracking test a target sits in the middle; rest your crosshair on it and
      it eases into motion along a smooth, changing path for five seconds. Every frame the test measures how far you are
      from it, and whether you are ahead of it (the sens carries you too far) or behind it (too slow). The first half second
      of each run is not scored: it mostly measures reaction time, not sens.
    </p>
    <p>
      Tracking is more forgiving of sens than flicking: close distances score almost the same, and reaction time makes
      everyone trail a little. So rounds are decided by score alone, and a round that cannot tell two distances apart
      leaves the range as it is. Expect a wider range than from the flick test; many players settle between the two.
    </p>
  </section>

  <section>
    <h2>One run is not the whole story</h2>
    <p>
      A few minutes in a browser moves by several percent from run to run: warm-up, a distracted block, a lucky round. The
      site remembers your recent results in this browser and combines up to three from the last two weeks into one range.
      When they disagree by more than 15% it says so and suggests one more run. Two flick runs combined are worth more than
      any single longer test.
    </p>
  </section>

  <section>
    <h2>The full test (experimental)</h2>
    <p>
      The full test adds tracking: a flick part, then a tracking part, about four and a half minutes in all. Each part finds its own range, and the result is their weighted average. You choose the weights by how your
      game plays: mostly flicks (85% flick, 15% tracking), both (60/40) or mostly tracking (35/65).
    </p>
    <p>
      Why not one combined score? A sens that is a quarter off ruins flicks but only costs tracking a few percent, so
      flicks would decide every time, whatever you picked. Averaging the two results lets your choice count. Flicks keep
      at least 35% because tracking alone measures sens less precisely.
    </p>
    <p>
      Tracking also counts only as much as it could actually tell distances apart. Reaction time makes everyone trail a
      moving target, which hides small sens differences, so a tracking round often ends undecided. If half its rounds were
      undecided, tracking gets half its weight; if none were decided, the result rests on your flicks. The results page
      shows the weights that were applied and says so plainly. In real runs so far the tracking part rarely decided much,
      which is why the flick test is the recommended one.
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
      Everything runs in your browser and nothing is uploaded. Your browser's local storage keeps your unit choice, your
      last ten results (so runs can be combined), a mouse calibration if you made one, and the profile if you save it.
      A result link carries the numbers in the address itself, and the feedback form on GitHub only shares what you
      submit there.
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
