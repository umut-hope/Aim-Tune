/**
 * Synthetic players with a known preferred cm/360, used to check that the
 * scoring and search procedure find the right range. Test-only: nothing in
 * the app imports this.
 *
 * Model: the player's hand "knows" a distance for each angle, learned at their
 * preferred cm/360. At a different test distance the same hand movement turns
 * the camera by `angle × preferred / test`, so a too-high sens (small cm/360)
 * overshoots and a too-low sens undershoots. On top of that come motor noise,
 * gradual adaptation within a block and occasional lapses.
 */
import { randomTargetSpec, type TargetSpecOptions } from '../angles'
import type { Shot } from '../scoring'
import type { BlockRequest } from '../search'

/** Small seeded PRNG (mulberry32). Returns values in [0, 1). */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal sample (Box–Muller). */
export function gaussian(rng: () => number): number {
  const u = 1 - rng()
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export interface PlayerProfile {
  /** cm/360 the player's muscle memory is tuned to. Ground truth for tests. */
  preferredCm360: number
  /** Log-normal spread of the hand movement length (0.1 ≈ ±10%). */
  distanceNoise: number
  /** Perpendicular error as a share of the flick angle (1 sd). */
  perpendicularNoise: number
  /**
   * Fixed hand error in cm (1 sd), independent of flick size. Turns into more
   * degrees at high sens, so very fast settings get punished.
   */
  handJitterCm: number
  /** Per-shot share by which the player's internal model moves towards the test distance. */
  adaptRate: number
  /** Probability of a wild shot (distracted, misclick). */
  lapseRate: number
  /** Mean reaction + movement time model, ms. */
  baseTimeMs: number
  timePerDegMs: number
  timeNoiseMs: number
  /**
   * Human effects (all 0 for the idealised player). Learning: extra noise at
   * the start of a session (+learningExtra, fading over ~learningShots shots).
   */
  learningExtra: number
  learningShots: number
  /** Block-to-block swing in form: log-normal spread of the noise per block. */
  formSwing: number
  /** Chance a block is clearly bad (distracted, tired): noise doubled. */
  badBlockRate: number
}

export const AVERAGE_PLAYER: Readonly<Omit<PlayerProfile, 'preferredCm360'>> = {
  distanceNoise: 0.1,
  perpendicularNoise: 0.04,
  handJitterCm: 0,
  adaptRate: 0,
  lapseRate: 0,
  baseTimeMs: 300,
  timePerDegMs: 4,
  timeNoiseMs: 60,
  learningExtra: 0,
  learningShots: 25,
  formSwing: 0,
  badBlockRate: 0,
}

/**
 * A player who behaves more like a person than the average player: adapts to
 * each distance, warms up over the session, has better and worse blocks, and
 * now and then a bad one. Used to check that one run is not thrown off by an
 * unlucky early round.
 */
export const HUMAN_EFFECTS: Readonly<Partial<Omit<PlayerProfile, 'preferredCm360'>>> = {
  adaptRate: 0.08,
  handJitterCm: 0.1,
  lapseRate: 0.03,
  learningExtra: 0.8,
  learningShots: 25,
  formSwing: 0.3,
  badBlockRate: 0.1,
}

/** Shots taken so far in one simulated session, for the learning effect. */
export interface SimSession {
  shots: number
}

export function makePlayer(
  preferredCm360: number,
  overrides: Partial<Omit<PlayerProfile, 'preferredCm360'>> = {},
): PlayerProfile {
  return { ...AVERAGE_PLAYER, ...overrides, preferredCm360 }
}

/**
 * Simulates one block of flicks at the requested cm/360. The player's internal
 * model starts each block at their preferred distance and adapts within it.
 */
export function simulateBlock(
  player: PlayerProfile,
  request: BlockRequest,
  rng: () => number,
  targets: TargetSpecOptions = {},
  session: SimSession = { shots: 0 },
): Shot[] {
  const shots: Shot[] = []
  let model = player.preferredCm360
  // Only draw extra random numbers when human effects are on, so seeded runs
  // of the idealised players stay unchanged.
  let blockNoise = 1
  if (player.formSwing > 0) blockNoise *= Math.exp(gaussian(rng) * player.formSwing)
  if (player.badBlockRate > 0 && rng() < player.badBlockRate) blockNoise *= 2
  for (let i = 0; i < request.shots; i++) {
    const learning = 1 + player.learningExtra * Math.exp(-session.shots / player.learningShots)
    const noise = blockNoise * learning
    session.shots++
    const { angleDeg } = randomTargetSpec(rng, targets)
    const timeMs = Math.max(
      120,
      player.baseTimeMs + player.timePerDegMs * angleDeg + gaussian(rng) * player.timeNoiseMs,
    )

    if (rng() < player.lapseRate) {
      shots.push({ targetAngle: angleDeg, along: (rng() * 2 - 1) * angleDeg * 1.5, perpendicular: (rng() * 2 - 1) * angleDeg, timeMs })
      continue
    }

    const plannedCm = (angleDeg / 360) * model
    const handCm =
      plannedCm * Math.exp(gaussian(rng) * player.distanceNoise * noise) + gaussian(rng) * player.handJitterCm * noise
    const turned = (handCm / request.cm360) * 360
    shots.push({
      targetAngle: angleDeg,
      along: turned - angleDeg,
      perpendicular: gaussian(rng) * player.perpendicularNoise * noise * angleDeg,
      timeMs,
    })
    model += player.adaptRate * (request.cm360 - model)
  }
  return shots
}
