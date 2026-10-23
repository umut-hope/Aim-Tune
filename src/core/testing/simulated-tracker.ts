/**
 * Synthetic tracking players with a known preferred cm/360. Test-only.
 *
 * Model: the player sees the target (and their crosshair) with a reaction
 * delay and moves the hand to match the target's speed plus a correction
 * towards it. The hand is calibrated to the preferred distance, so at another
 * test distance the camera moves `preferred / test` times as fast as intended:
 * too high a sens runs ahead, too low a sens lags behind. Hand noise comes as
 * a slowly varying speed error and a small tremor measured in cm.
 */
import { directionFromYawPitch } from '../angles'
import { pathAt, pathSpeed, randomPath, trackingError, type PathOptions, type TrackSample } from '../tracking'
import type { View } from '../view'
import { gaussian } from './simulated-player'

export interface TrackerProfile {
  preferredCm360: number
  reactionMs: number
  /** How hard the player corrects towards the target, per second. */
  correction: number
  /** Slowly varying relative speed error of the hand (1 sd). */
  speedNoise: number
  /** Hand tremor, cm per second (1 sd per frame). Bigger in degrees at high sens. */
  tremorCm: number
}

export const AVERAGE_TRACKER: Readonly<Omit<TrackerProfile, 'preferredCm360'>> = {
  reactionMs: 150,
  correction: 5,
  speedNoise: 0.12,
  tremorCm: 0.6,
}

export function makeTracker(
  preferredCm360: number,
  overrides: Partial<Omit<TrackerProfile, 'preferredCm360'>> = {},
): TrackerProfile {
  return { ...AVERAGE_TRACKER, ...overrides, preferredCm360 }
}

export interface TrialOptions {
  durationMs: number
  frameMs: number
  path?: Partial<PathOptions>
}

/** Simulates one tracking trial at `testCm360` along a fresh random path. */
export function simulateTrial(
  player: TrackerProfile,
  testCm360: number,
  view: View,
  rng: () => number,
  options: TrialOptions = { durationMs: 3000, frameMs: 1000 / 120 },
): TrackSample[] {
  const path = randomPath(rng, view, options.path)
  const dt = options.frameMs / 1000
  const delay = Math.max(1, Math.round(player.reactionMs / options.frameMs))
  const gain = player.preferredCm360 / testCm360
  const degPerCm = 360 / testCm360

  // History of what the player will see `delay` frames later.
  const camYaw: number[] = [0]
  const camPitch: number[] = [0]
  let noise = 0
  const samples: TrackSample[] = []
  const steps = Math.round(options.durationMs / options.frameMs)

  for (let i = 0; i < steps; i++) {
    const t = i * dt
    const seen = Math.max(0, i - delay)
    const tSeen = seen * dt
    const target = pathAt(path, tSeen)
    const ahead = pathAt(path, tSeen + 0.01)
    const rateYaw = (ahead.yaw - target.yaw) / 0.01
    const ratePitch = (ahead.pitch - target.pitch) / 0.01

    // Intended camera speed: follow the target and close the gap seen.
    const wantYaw = rateYaw + player.correction * (target.yaw - camYaw[seen]!)
    const wantPitch = ratePitch + player.correction * (target.pitch - camPitch[seen]!)

    // Slow speed error (Ornstein–Uhlenbeck, ~0.5 s memory) and tremor.
    noise += -noise * (dt / 0.5) + player.speedNoise * Math.sqrt(2 * (dt / 0.5)) * gaussian(rng)
    const scaleNow = gain * (1 + noise)
    const yaw = camYaw[i]! + (wantYaw * scaleNow + gaussian(rng) * player.tremorCm * degPerCm) * dt
    const pitch = camPitch[i]! + (wantPitch * scaleNow + gaussian(rng) * player.tremorCm * degPerCm) * dt
    camYaw.push(yaw)
    camPitch.push(pitch)

    samples.push({
      dtMs: options.frameMs,
      speed: pathSpeed(path, t),
      error: trackingError(directionFromYawPitch(yaw, pitch), path, t + dt),
    })
  }
  return samples
}
