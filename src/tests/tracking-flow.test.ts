import { describe, expect, it } from 'vitest'
import { directionFromYawPitch, type Vec3 } from '../core/angles'
import { seededRng } from '../core/testing/simulated-player'
import { resolveView } from '../core/view'
import {
  createTrackingFlow,
  hud,
  pause,
  proceed,
  restart,
  resume,
  targetDirection,
  tick,
  type TrackingFlowState,
} from './tracking-flow'

const view = resolveView({ gameFov: { default: 90, type: 'horizontal-4:3', adjustable: false }, aspect: 16 / 9 })
const HOME: Vec3 = [0, 0, -1]
const OFF = directionFromYawPitch(8, 0)
const FRAME = 1000 / 60

const flow = (warmupShots = 1) =>
  createTrackingFlow({
    view,
    rng: seededRng(1),
    trialMs: 600,
    holdMs: 100,
    search: { rounds: 2, shotsPerBlock: 2, warmupShots },
  })

/** Holds the dot, then follows the target perfectly (or with `aim`) for one trial. */
function runTrial(
  s: TrackingFlowState,
  now: number,
  aim: (s: TrackingFlowState, now: number) => Vec3 = (x, t) => targetDirection(x, t)!,
): [TrackingFlowState, number] {
  expect(s.phase).toBe('waiting')
  while (s.phase === 'waiting') {
    s = tick(s, now, HOME)
    now += FRAME
  }
  expect(s.phase).toBe('tracking')
  while (s.phase === 'tracking') {
    s = tick(s, now, aim(s, now))
    now += FRAME
  }
  return [s, now]
}

describe('tracking flow', () => {
  it('walks through warm-up, blocks and round summaries to a result', () => {
    let s = flow()
    let now = 0
    const seen: string[] = []
    while (s.phase !== 'done') {
      if (s.phase === 'ready' || s.phase === 'round-summary') {
        seen.push(s.phase === 'ready' ? `ready:${s.block!.kind}` : 'summary')
        s = proceed(s)
        continue
      }
      ;[s, now] = runTrial(s, now)
    }
    expect(seen).toEqual(['ready:warmup', 'ready:scored', 'ready:scored', 'summary', 'ready:scored', 'ready:scored'])
    expect(s.result).not.toBeNull()
  })

  it('shows the target on the dot until the player rests on it', () => {
    let s = proceed(flow())
    expect(targetDirection(s, 0)).toEqual(HOME)
    for (let t = 0; t < 1000; t += FRAME) s = tick(s, t, OFF)
    expect(s.phase).toBe('waiting')
    s = tick(s, 1000, HOME)
    s = tick(s, 1050, HOME)
    expect(s.phase).toBe('waiting') // not held long enough
    s = tick(s, 1101, HOME)
    expect(s.phase).toBe('tracking')
  })

  it('restarts the hold when the crosshair slips off', () => {
    let s = proceed(flow())
    s = tick(s, 0, HOME)
    s = tick(s, 80, OFF)
    s = tick(s, 90, HOME)
    s = tick(s, 150, HOME)
    expect(s.phase).toBe('waiting')
  })

  it('scores perfect tracking near the top and records the trial', () => {
    let s = proceed(flow(0))
    ;[s] = runTrial(s, 0)
    expect(s.trials).toHaveLength(1)
    expect(s.trials[0]!.score).toBeGreaterThan(0.95)
    expect(s.trials[0]!.onTarget).toBeGreaterThan(0.95)
  })

  it('reads lagging behind as negative bias', () => {
    let s = proceed(flow(0))
    // Aim where the target was 150 ms ago.
    ;[s] = runTrial(s, 0, (x, t) => targetDirection(x, t - 150) ?? HOME)
    expect(s.trials[0]!.meanAlong).toBeLessThan(0)
  })

  it('discards the trial in progress on pause and starts a fresh one after', () => {
    let s = proceed(flow())
    s = tick(s, 0, HOME)
    s = tick(s, 200, HOME)
    s = tick(s, 300, targetDirection(s, 300)!)
    expect(s.phase).toBe('tracking')
    const oldPath = s.path
    s = pause(s)
    expect(targetDirection(s, 400)).toBeNull()
    s = resume(s)
    expect(s.phase).toBe('waiting')
    expect(s.samples).toHaveLength(0)
    expect(s.path).not.toBe(oldPath)
    expect(resume(pause(flow())).phase).toBe('ready')
  })

  it('reports HUD progress', () => {
    let s = proceed(flow())
    s = tick(s, 0, HOME)
    s = tick(s, 150, HOME)
    expect(s.phase).toBe('tracking')
    expect(hud(s, 450).progress).toBeCloseTo(0.5, 9)
    expect(hud(s, 450)).toMatchObject({ warmup: true, trial: 1, trials: 1 })
  })

  it('restarts with the same settings', () => {
    const s = restart(proceed(flow()))
    expect(s.phase).toBe('ready')
    expect(s.search.config.rounds).toBe(2)
  })
})
