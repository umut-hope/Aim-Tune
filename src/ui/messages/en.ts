/**
 * English messages. The Turkish dictionary has the same shape (see
 * `Messages`); a unit test checks that no key is missing on either side.
 * Keys ending in `Html` contain markup and are rendered with {@html}.
 */
import { esc, num } from './html'

type Kind = 'flick' | 'tracking' | 'full'

const kindNames = { flick: 'flick', tracking: 'tracking', full: 'full test' }

export const en = {
  meta: {
    title: 'aimtune · mouse sensitivity finder',
    howTitle: 'How it works · aimtune',
  },

  common: {
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    copiedLive: 'Copied to clipboard',
    lockError: (message: string) => `Could not lock the mouse: ${message}`,
    loadError: (message: string) => `Could not load the test: ${message}. Check your connection and try again.`,
    helpAbout: (label: string) => `What is ${label}?`,
    /** A percentage, already rounded: "12" → "12%". */
    percent: (value: string | number) => `${value}%`,
  },

  header: {
    nav: 'Main',
    test: 'Test',
    how: 'How it works',
    language: 'Language',
  },

  promo: {
    aria: (label: string, text: string) => `${label}: ${text} (opens in a new tab)`,
    hide: (days: number) => `Hide this for ${days} days`,
  },

  footer: {
    local: 'Nothing leaves your browser.',
    notAffiliated: 'Not affiliated with any game publisher. Game names belong to their respective owners.',
  },

  setup: {
    heroTitle: 'Find the sens your hand actually likes.',
    heroSub:
      'A short flick test in your browser, about 2 minutes. It measures how you aim and suggests a range, not a single magic number; two runs combined give a steadier answer. You need a mouse.',
    kindLabel: 'Test',
    kindHelp: 'the test types',
    tags: { recommended: 'recommended', experimental: 'experimental' },
    kinds: {
      flick: { name: 'Flick test', desc: 'Snap to targets · ~2 min' },
      full: { name: 'Full test', desc: 'Flicks, then tracking · ~4.5 min' },
      tracking: { name: 'Tracking only', desc: 'Follow a moving target · ~3 min' },
    },
    styleLabel: 'What does your game ask for more?',
    styleHelp: 'how the parts are weighted',
    styles: {
      flicks: { name: 'Mostly flicks', examples: 'e.g. Valorant, CS2, Rainbow Six Siege' },
      both: { name: 'Both', examples: 'e.g. Fortnite, Call of Duty, Deadlock' },
      tracking: { name: 'Mostly tracking', examples: 'e.g. Apex Legends, Overwatch 2' },
    },
    weights: (flick: number, tracking: number) => `${flick}% flick · ${tracking}% tracking`,
    styleNote:
      'Usually: tactical shooters reward flicks, fast hero and battle royale games reward tracking. It is your call: go by how you actually play.',
    help: {
      kind: 'Flick test: snap to targets that appear, one click each; the clearest measurement, and two runs combined are better than one long test. Full test and tracking add a moving target; in testing, tracking often cannot tell sens settings apart (reaction time hides small differences), so they are marked experimental.',
      style:
        'Each part finds its own best range; the result is their weighted average (on a log scale, since sens feels proportional). Flicks keep at least 35% because tracking alone measures sens less precisely, and tracking counts only as much as it could tell distances apart. Your game is a guess at the mix: pick what matches how you actually play.',
      game: 'Your main game. Sets the field of view so targets appear where they would in that game, and converts the result to its sens.',
      sens: 'The mouse sensitivity you actually play with now, as the game shows it. Keep using it here after a test until you have tried a new value in game: the test should start from what your hand knows.',
      dpi: 'Counts per inch of your mouse, set in its own software (often 400, 800 or 1600). Not the in-game sensitivity.',
      distance: 'How far you move the mouse for a full 360° turn. yawmatch can work it out from your in-game sens.',
      fov: "The FOV value in your game's video settings, in the game's own units. Leave empty for the game's default.",
    },
    gameLabel: 'Game',
    gameHelp: 'the game setting',
    chooseGame: 'Choose your game',
    otherGame: (unit: string) => `Other: I know my ${unit}`,
    gamesError: (error: string, unit: string) =>
      `Could not load the game list (${error}). You can still enter your ${unit} with "Other".`,
    currentDistance: (unit: string) => `Current ${unit}`,
    sensLabel: 'In-game sens',
    sensHelp: 'in-game sens',
    dpiLabel: 'DPI',
    dpiHelp: 'DPI',
    fovLabel: 'In-game FOV (optional)',
    fovHelp: 'in-game FOV',
    fovDefault: (value: number | null) => (value === null ? 'default' : `default ${value}`),
    fovUnknown: 'FOV not known for this game: a typical 70° vertical is used unless you enter yours.',
    fovFixedHtml: (game: string, value: number, horizontal43: boolean) =>
      `Fixed in ${esc(game)}: ${num(value)}${horizontal43 ? ' (4:3 horizontal)' : ''}.`,
    unitsLabel: 'Show distances in',
    unitsAria: 'Distance unit',
    typo: (distance: string, unit: string) => `That works out to ${distance} ${unit}, which looks like a typo.`,
    rulerCurrent: (distance: string, unit: string) => `Your current distance: ${distance} ${unit}`,
    rulerUnset: 'Your current distance is not set',
    startsAroundHtml: (range: string) => `The test starts around your current distance: ${num(range)}.`,
    coversHtml: (range: string) => `Without your current sens the test covers ${num(range)}.`,
    checks: {
      aria: 'Browser checks',
      mouseOk: 'Mouse detected',
      mouseMissing: 'No mouse detected. The test needs a mouse.',
      lockOk: 'Pointer lock supported',
      lockMissing: 'This browser cannot lock the mouse. Try Chrome, Edge or Firefox.',
      rawUnchecked: 'Raw input not checked yet.',
      rawCheck: 'Check',
      rawYes: 'Raw input on: OS mouse acceleration is bypassed.',
      rawNo: 'No raw input in this browser. Turn off "Enhance pointer precision" (Windows) or mouse acceleration, or results may drift.',
      rawUnknown:
        'This browser cannot confirm raw input (Firefox and Safari ignore the request), so Windows mouse settings may change your results. For the most accurate test use Chrome or Edge, or turn off "Enhance pointer precision" and keep the Windows pointer speed at 6/11.',
      fpsMeasuring: 'Measuring frame rate…',
      fpsOkHtml: (fps: string) => `${num(fps)} fps`,
      fpsLowHtml: (fps: string) =>
        `Only ${num(fps)} fps. Close other tabs or plug in a laptop for smoother flicks.`,
    },
    phoneTitle: 'Use a computer with a mouse',
    phoneText: 'The flick test needs a mouse and a keyboard. Open this page on your computer to take it.',
    start: 'Start test',
    chooseTip: 'Tip: choose your game to get the result in its sens.',
  },

  calibration: {
    title: 'Mouse calibration',
    optional: '(optional, 30 s)',
    correctionOnHtml: (pct: number, fewer: boolean) =>
      `Correction on: this browser reports ${num(`${pct}%`)} ${fewer ? 'fewer' : 'more'} counts than your DPI; the test makes up for it.`,
    checked: 'Checked: this browser reads your mouse at the DPI you entered.',
    intro:
      'Checks that the browser reads your mouse at the DPI you entered. Worth it in Firefox or Safari, or if you are not sure of your DPI.',
    redo: 'Redo',
    calibrate: 'Calibrate',
    stepsHtml: [
      'Lay a sheet of A4 paper on your pad, long side from left to right (or anything whose length you know).',
      'Line up the left side of your mouse with the left edge of the sheet.',
      'Click <strong>Start</strong>, slide the mouse slowly to the right until its left side reaches the right edge, then click.',
    ],
    distance: 'Distance (cm)',
    counts: (n: number) => `${n} counts`,
    slideHint: 'slide right, then click',
    start: 'Start',
    matchHtml: (measured: string, dpi: number) =>
      `Measured ${num(measured)} counts per inch: matches your ${num(dpi)} DPI. No correction needed.`,
    offHtml: (measured: string, pct: number, fewer: boolean, dpi: number) =>
      `Measured ${num(measured)} counts per inch, about ${num(`${pct}%`)} ${fewer ? 'fewer' : 'more'} than ${num(dpi)} DPI would give. Likely causes: display scaling, Windows pointer speed or a different DPI than you entered. Measure twice before using it.`,
    useCorrection: 'Use the correction',
    measureAgain: 'Measure again',
    bad: 'That does not look right (the mouse may have been lifted). Try again, sliding slowly.',
    remove: 'Remove calibration',
    close: 'Close',
  },

  /** Words for the two directions of a miss, per test. */
  bias: {
    flick: { plus: 'overshoot', minus: 'undershoot', both: 'over/undershoot' },
    tracking: { plus: 'ahead', minus: 'behind', both: 'lead/lag' },
  },

  results: {
    eyebrow: (own: boolean, kind: Kind) => `${own ? 'Your' : 'Shared'} ${kindNames[kind]} result`,
    sweetSpot: 'Your sweet spot:',
    insideHtml: (current: string) => `Your current ${num(current)} is already inside this range.`,
    outsideHtml: (current: string, below: boolean) =>
      `Your current ${num(current)} is ${below ? 'shorter' : 'longer'} than this range, so a ${below ? 'slightly lower' : 'slightly higher'} sens may suit you.`,
    rulerSummary: (lo: string, hi: string, unit: string, current: string | null) =>
      `Recommended ${lo} to ${hi} ${unit} per 360°${current !== null ? `, current ${current}` : ''}`,
    markerYou: (d: string) => `you · ${d}`,
    markerFlicks: (d: string) => `flicks · ${d}`,
    markerTracking: (d: string) => `tracking · ${d}`,
    blendTitle: 'How this was combined',
    flickPart: 'Flick part',
    trackingPart: 'Tracking part',
    weighting: 'Weighting',
    byStyle: 'by aim style',
    applied: 'applied',
    blendNote: (decidedPct: number | null) =>
      `Each part found its own range; the result is their weighted average on a log scale. Tracking counts only as much as it could tell distances apart${decidedPct !== null ? `: this time it decided ${decidedPct}% of its rounds` : ''}.`,
    leanUnknown:
      'The tracking part could not tell the distances apart this time: reaction time hides small sens differences when following a target. The result is based on your flicks.',
    leanShorterHtml:
      'On its own, tracking pointed to a <strong>shorter</strong> distance (a higher sens). If tracking matters more in your game than you picked, lean towards the low end.',
    leanLongerHtml:
      'On its own, tracking pointed to a <strong>longer</strong> distance (a lower sens). If tracking matters more in your game than you picked, lean towards the high end.',
    leanSame: 'Flicking and tracking pointed to about the same distance.',
    edgeTitle: (high: boolean) => `Your best distance may lie ${high ? 'above' : 'below'} the tested range`,
    edgeText: (high: boolean) =>
      `The test kept pointing ${high ? 'towards longer distances (lower sens)' : 'towards shorter distances (higher sens)'}.`,
    edgeRetest: 'A second test centred on that end can look past it.',
    edgeShared: 'Take the test yourself, starting from your own sens, to explore further.',
    edgeButton: (high: boolean) =>
      `Test ${high ? 'longer distances (lower sens)' : 'shorter distances (higher sens)'}`,
    sensInHtml: (game: string, dpi: string) => `In ${esc(game)} at ${num(dpi)} DPI`,
    middleHtml: (sens: string) => `Middle of the range: ${num(sens)}`,
    copySens: (sens: string) => `Copy sens ${sens}`,
    pickGame: 'Pick your game on the setup screen next time to see this as an in-game sens.',
    honestyTitle: 'A short browser test, not the final word',
    honestyText: (kind: Kind) =>
      `There is no single correct sensitivity. This range is where you were most consistent in a few minutes of ${kind === 'tracking' ? 'tracking' : kind === 'full' ? 'flicks and tracking' : 'flicks'}, in a browser, at this frame rate. Try the middle of it in game for a few sessions before deciding.`,
    honestyTracking:
      'Tracking preference is usually broader than flicking, so this range is wider; the flick test narrows it further.',
    convert: 'Convert to other games',
    save: 'Save to profile',
    saved: 'Saved to profile',
    retest: 'Retest',
    changeSettings: 'Change settings',
    takeYourself: 'Take the test yourself',
    copyLink: 'Copy result link',
    feedbackAsk: 'Tried it in game?',
    feedbackLink: 'Tell us if it was right',
    feedbackNote: '(opens a prefilled form on GitHub; nothing is sent until you submit it)',
    savedAsHtml: (game: string, sens: string) =>
      `Saved as ${esc(game)} sens ${num(sens)}. yawmatch and the next test here will start from it.`,
    saveFailed: 'Could not save: your browser blocks local storage.',
  },

  chart: {
    flickTitle: 'Overshoot and undershoot per round',
    trackingTitle: 'Ahead of and behind the target per round',
    tooLow: (word: string) => `${word} (sens too low)`,
    tooHigh: (word: string) => `${word} (sens too high)`,
    headers: ['Round', 'Distance', 'Mean error'],
    flickWhat: 'the average miss along the flick, relative to its size',
    trackingWhat: "the average lead or lag along the target's motion, relative to its speed",
    note: (what: string) => `Rows in bold scored better in their round. Values are ${what}.`,
  },

  round: {
    done: (n: number) => `Round ${n} done`,
    summary: 'The two distances tested this round, inside the range searched so far',
    better: 'better',
    scoredBetterHtml: (distance: string, byBias: string | null) =>
      `${num(distance)} scored better${byBias !== null ? ` (scores were close, so your ${esc(byBias)} decided)` : ''}.`,
    sameTracking: 'Both distances scored about the same, so the range stays as it is for now.',
    same: 'Both distances scored about the same.',
  },

  ab: {
    title: 'Compare by feel',
    options: { current: 'Current', recommended: 'Recommended', faster: 'Faster end', slower: 'Slower end' },
    preferredHtml: (name: string, distance: string, blind: boolean) =>
      `You preferred <strong>${esc(name)}</strong> (${num(distance)})${blind ? ', without knowing which was which' : ''}.`,
    noDifference: 'You felt no clear difference, so either works. Pick the one closer to your habits.',
    headers: ['Option', 'Distance', 'Time', 'Hits'],
    contextNote: 'Hit counts are context only: how it felt is the answer here.',
    introHtml: (a: string, b: string) =>
      `Aim freely at still and moving targets and switch between two settings with <kbd>Space</kbd>: ${num(a)} and ${num(b)}. Then pick the one that feels better.`,
    needsDpi: 'Needs your DPI: take the test yourself to compare.',
    needsMouse: 'Needs a computer with a mouse.',
    blind: 'Blind: hide which is which until I choose',
    again: 'Compare again',
    start: 'Start A/B test',
  },

  history: {
    title: 'Your recent results',
    thisRun: 'This run',
    kinds: { flick: 'Flick', full: 'Full', tracking: 'Tracking' },
    yesterday: 'yesterday',
    daysAgo: (days: number) => `${days} days ago`,
    combined: (runs: number) => `Combined (${runs} runs)`,
    middle: (distance: string) => `middle ${distance}`,
    agreeHtml: (pct: number) =>
      `These runs agree within ${num(`${pct}%`)}, so the combined range is the steadier answer. Use it rather than any single run.`,
    differHtml: (pct: number) =>
      `Your runs differ by ${num(`${pct}%`)}. A short test moves from run to run; one more run will show which way it settles. The combined range is wider to reflect that.`,
    kept: 'Kept only in this browser; runs older than two weeks are not combined.',
    clear: 'Clear history',
  },

  test: {
    partFlick: 'Part 1 of 2 · Flicks',
    partTracking: 'Part 2 of 2 · Tracking',
    returnToDot: 'Return to the white dot',
    restOnTarget: 'Rest your crosshair on the target',
    warmup: 'Warm-up',
    hudRound: (round: number, rounds: number) => `Round ${round}/${rounds}`,
    hudShot: (shot: number, shots: number) => `Shot ${shot}/${shots}`,
    hudTrial: (trial: number, trials: number) => `Trial ${trial}/${trials}`,
    roundOf: (round: number, rounds: number) => `Round ${round} of ${rounds}`,
    warmupFlick: 'A few practice shots, not scored.',
    warmupTracking: 'A couple of practice runs, not scored.',
    repeatFlick: 'Repeating this block: too many shots were missed or too slow.',
    repeatTracking: 'Repeating this block: the target was lost too often.',
    flickHowTo: 'Aim at the white dot. When a yellow target appears, flick to it and click once. Then come back to the dot.',
    trackingSteps: [
      'Rest your crosshair on the yellow target in the middle.',
      'After a moment it starts moving. Keep the crosshair on it for 3 seconds.',
      'No clicking needed. Then it returns to the middle for the next run.',
    ],
    clickToStart: 'Click to start',
    lockAndStart: 'Lock mouse and start',
    viewLine: (fov: string, raw: 'yes' | 'no' | 'unknown') =>
      `View ${fov}° horizontal · raw input: ${raw === 'yes' ? 'on' : raw === 'no' ? 'off (OS settings may affect results)' : 'unknown'}`,
    clickToContinue: 'Click to continue',
    paused: 'Paused',
    trackingPaused: 'The run in progress was discarded; it starts again from the middle.',
    resume: 'Resume',
    restart: 'Restart',
    quit: 'Quit',
  },

  abTest: {
    option: (label: string) => `Option ${label}`,
    keysHtml: '<kbd>Space</kbd> switch A / B · <kbd>Esc</kbd> choose',
    bothTried: 'Both tried: press Esc whenever you are ready to choose',
    tryEach: (seconds: number) => `Try each for ${seconds} s`,
    stepsHtml: (seconds: number) => [
      'Aim at the yellow targets, some still and some moving. Click to shoot.',
      'Press <kbd>Space</kbd> to switch between <strong>A</strong> and <strong>B</strong>, as often as you like.',
      `Once you have tried each for at least ${seconds} seconds, press <kbd>Esc</kbd> and choose the one that felt better. There is no time limit.`,
    ],
    blindNote: 'Blind mode: you will see which is which after you choose.',
    whichBetter: 'Which felt better?',
    tryFirst: (seconds: number, a: string, b: string) =>
      `Try each for at least ${seconds} seconds first. So far: A ${a}, B ${b}.`,
    noDifference: 'No difference',
    keepComparing: 'Keep comparing',
  },

  how: {
    title: 'How it works',
    lead: 'aimtune measures how you flick at different sensitivities and shows the range where you were most consistent. It does not know the perfect sens for you; nobody does.',
    distance: {
      title: 'Distance, not a number',
      /** Text before and after the yawmatch link. */
      text: [
        "Every game uses its own sens scale, so the test works with the distance your mouse travels for a full 360° turn (cm/360). The same distance feels the same in every game. The result is converted to your game's sens only at the end, using the same math as ",
        '.',
      ],
    },
    flick: {
      title: 'The flick test',
      steps: [
        'You aim at a white dot. After a short random pause a yellow target appears somewhere on screen.',
        'You flick to it and click once. The test records how far you went past the target (overshoot) or stopped short (undershoot), how far you were off to the side, and how long it took.',
        'You return to the dot, and the next target appears.',
      ],
      paras: [
        "About a third of the targets are small corrections, 4–15° away: in most shooters many fights start with the crosshair already close to the enemy. A small miss on a small correction is judged fairly, since nobody's hand is more precise than about a degree.",
        "The camera uses your game's field of view, so targets show up where they would in game.",
      ],
    },
    narrowing: {
      title: 'Narrowing down',
      paras: [
        'After a few unscored warm-up shots, each round tests two distances inside the current range with eight flicks each. The next round centres on the better one and keeps about two thirds of the range, including a bit of the losing side, so one unlucky round can still be undone later. Six rounds take the range from about 3× wide to a few percent.',
        'Shots are scored mostly on accuracy relative to the flick size, with speed as a smaller factor. When two distances score about the same, your over/undershoot decides: systematic overshoot means the sens is too high, undershoot means too low.',
        'The final range is never narrower than ±5%, and it widens if your flicks were inconsistent, so the result does not look more precise than it is.',
      ],
    },
    tracking: {
      title: 'The tracking test',
      paras: [
        'Some aim is not a flick but a chase. In the tracking test a target sits in the middle; rest your crosshair on it and it eases into motion along a smooth, changing path for five seconds. Every frame the test measures how far you are from it, and whether you are ahead of it (the sens carries you too far) or behind it (too slow). The first half second of each run is not scored: it mostly measures reaction time, not sens.',
        'Tracking is more forgiving of sens than flicking: close distances score almost the same, and reaction time makes everyone trail a little. So rounds are decided by score alone, and a round that cannot tell two distances apart leaves the range as it is. Expect a wider range than from the flick test; many players settle between the two.',
      ],
    },
    history: {
      title: 'One run is not the whole story',
      paras: [
        'A few minutes in a browser moves by several percent from run to run: warm-up, a distracted block, a lucky round. The site remembers your recent results in this browser and combines up to three from the last two weeks into one range. When they disagree by more than 15% it says so and suggests one more run. Two flick runs combined are worth more than any single longer test.',
      ],
    },
    full: {
      title: 'The full test (experimental)',
      paras: [
        'The full test adds tracking: a flick part, then a tracking part, about four and a half minutes in all. Each part finds its own range, and the result is their weighted average. You choose the weights by how your game plays: mostly flicks (85% flick, 15% tracking), both (60/40) or mostly tracking (35/65).',
        'Why not one combined score? A sens that is a quarter off ruins flicks but only costs tracking a few percent, so flicks would decide every time, whatever you picked. Averaging the two results lets your choice count. Flicks keep at least 35% because tracking alone measures sens less precisely.',
        'Tracking also counts only as much as it could actually tell distances apart. Reaction time makes everyone trail a moving target, which hides small sens differences, so a tracking round often ends undecided. If half its rounds were undecided, tracking gets half its weight; if none were decided, the result rests on your flicks. The results page shows the weights that were applied and says so plainly. In real runs so far the tracking part rarely decided much, which is why the flick test is the recommended one.',
      ],
    },
    ab: {
      title: 'Compare by feel',
      textHtml:
        'Numbers are not everything. From the results you can start an A/B test: aim freely at still and moving targets and press <kbd>Space</kbd> to switch between two settings, usually your current one and the middle of the recommended range. In blind mode they are only called A and B until you choose, so expectations do not decide for you. Hits are counted for context, but your choice is the result.',
    },
    limits: {
      title: 'What it cannot tell you',
      items: [
        'A few minutes in a browser is not a match. Tiredness, warm-up and the game itself all change how you aim.',
        'Browsers may apply your OS mouse acceleration if raw input is not available. Turn it off for the test.',
        'Low frame rates make flicks choppy and less accurate.',
        'Flicking is one skill. Tracking a moving target can favour a different sens.',
      ],
      outro: 'Treat the result as a starting point: play the middle of the range for a few sessions, then decide.',
    },
    privacy: {
      title: 'Privacy',
      text: 'Everything runs in your browser and nothing is uploaded. Your browser\'s local storage keeps your unit and language choice, your last ten results (so runs can be combined), a mouse calibration if you made one, and the profile if you save it. A result link carries the numbers in the address itself, and the feedback form on GitHub only shares what you submit there.',
    },
    cta: 'Take the test',
  },
}

export type Messages = typeof en
