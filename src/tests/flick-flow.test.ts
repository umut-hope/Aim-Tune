import { describe, expect, it } from 'vitest'
import { angleBetween, targetDirection, type Vec3 } from '../core/angles'
import { seededRng } from '../core/testing/simulated-player'
import {
  click,
  createFlickFlow,
  hud,
  isOnHome,
  pause,
  proceed,
  restart,
  resume,
  tick,
  type FlickFlowState,
} from './flick-flow'

/** Home dot is straight ahead by default. */
const HOME: Vec3 = [0, 0, -1]
const OFF_HOME = targetDirection(HOME, 10, 0)

const flow = (seed = 1) =>
  createFlickFlow({
    rng: seededRng(seed),
    spawnDelayMs: [100, 100],
    search: { rounds: 2, shotsPerBlock: 3, warmupShots: 2 },
  })

/** Returns to the home dot, waits for the target and clicks where `aim` says. */
function shoot(
  s: FlickFlowState,
  now: number,
  aim: (s: FlickFlowState) => Vec3 = (x) => x.target!.direction,
): [FlickFlowState, number] {
  let t = now + 1
  s = tick(s, t, HOME) // arrive on the dot: delay starts
  t += 100
  s = tick(s, t, HOME) // delay over: target appears
  expect(s.phase).toBe('aiming')
  t += 500
  return [click(s, t, aim(s)), t]
}

describe('flick flow', () => {
  it('walks through warm-up, blocks, round summaries and finishes', () => {
    let s = flow()
    let now = 0
    const phases: string[] = []
    while (s.phase !== 'done') {
      if (s.phase === 'ready' || s.phase === 'round-summary') {
        phases.push(s.phase === 'ready' ? `ready:${s.block!.kind}:${s.block!.side ?? '-'}` : 'summary')
        s = proceed(s)
        continue
      }
      ;[s, now] = shoot(s, now)
    }
    // Sides alternate per round; the last round ends in "done" instead of a summary.
    expect(phases).toEqual([
      'ready:warmup:-',
      'ready:scored:low',
      'ready:scored:high',
      'summary',
      'ready:scored:high',
      'ready:scored:low',
    ])
    expect(s.result).not.toBeNull()
    expect(s.lastRound?.round).toBe(1)
    expect(s.block).toBeNull()
  })

  it('records perfect clicks as zero error and measures time from spawn', () => {
    let s = proceed(flow())
    s = tick(s, 0, HOME)
    expect(s.spawnAt).toBe(100)
    s = tick(s, 50, HOME)
    expect(s.phase).toBe('waiting') // delay not over yet
    s = tick(s, 100, HOME)
    const angle = s.target!.spec.angleDeg
    s = click(s, 420, s.target!.direction)
    expect(s.shots).toHaveLength(1)
    expect(s.shots[0]!.along).toBeCloseTo(0, 9)
    expect(s.shots[0]!.targetAngle).toBeCloseTo(angle, 9)
    expect(s.shots[0]!.timeMs).toBe(320)
    expect(s.phase).toBe('waiting')
    expect(s.spawnAt).toBeNull() // must return to the dot first
  })

  it('only spawns a target while the crosshair is on the home dot', () => {
    let s = proceed(flow())
    for (let t = 0; t < 1000; t += 50) s = tick(s, t, OFF_HOME)
    expect(s.phase).toBe('waiting')
    expect(s.spawnAt).toBeNull()

    s = tick(s, 1000, HOME)
    s = tick(s, 1100, HOME)
    expect(s.phase).toBe('aiming')
    // The flick starts from the dot, so it is measured from there.
    expect(angleBetween(s.target!.start, HOME)).toBeLessThan(1e-9)
  })

  it('restarts the delay when the player leaves the dot', () => {
    let s = proceed(flow())
    s = tick(s, 0, HOME)
    s = tick(s, 80, OFF_HOME)
    expect(s.spawnAt).toBeNull()
    s = tick(s, 120, HOME)
    expect(s.spawnAt).toBe(220)
    s = tick(s, 150, HOME)
    expect(s.phase).toBe('waiting')
  })

  it('accepts a crosshair slightly off the dot, within the tolerance', () => {
    const s = flow()
    expect(isOnHome(s, targetDirection(HOME, 1.5, 40))).toBe(true)
    expect(isOnHome(s, targetDirection(HOME, 2.5, 40))).toBe(false)
  })

  it('ignores clicks while no target is visible', () => {
    const s = proceed(flow())
    expect(click(s, 10, HOME)).toBe(s)
    expect(click(flow(), 10, HOME).phase).toBe('ready')
  })

  it('discards the shot in progress on pause and needs the dot again after resume', () => {
    let s = proceed(flow())
    s = tick(s, 0, HOME)
    s = tick(s, 100, HOME)
    expect(s.phase).toBe('aiming')
    s = pause(s)
    expect(s.phase).toBe('paused')
    expect(s.target).toBeNull()
    expect(click(s, 200, HOME)).toBe(s)
    s = resume(s)
    expect(s.phase).toBe('waiting')
    expect(s.spawnAt).toBeNull()
    expect(s.shots).toHaveLength(0)
  })

  it('returns to a panel phase after a pause there', () => {
    expect(resume(pause(flow())).phase).toBe('ready')
  })

  it('reports HUD info', () => {
    let s = flow()
    expect(hud(s)).toMatchObject({ warmup: true, round: null, rounds: 2, shot: 1, shots: 2 })
    let now = 0
    s = proceed(s)
    ;[s, now] = shoot(s, now)
    ;[s, now] = shoot(s, now)
    expect(hud(s)).toMatchObject({ warmup: false, round: 1, shot: 1, shots: 3 })
    expect(hud(s).cm360).toBeCloseTo(s.block!.cm360, 9)
  })

  it('restarts with the same settings', () => {
    let s = proceed(flow())
    s = restart(s)
    expect(s.phase).toBe('ready')
    expect(s.search.config.rounds).toBe(2)
  })

  it('rejects a bad home tolerance', () => {
    expect(() => createFlickFlow({ homeTolerance: 0 })).toThrow(RangeError)
  })

  it('converges for a player whose hand is tuned to 40 cm/360', () => {
    // Clicks land where the hand's distance would take them at the active cm/360.
    const preferred = 40
    let s = createFlickFlow({ rng: seededRng(5), spawnDelayMs: [0, 0] })
    let now = 0
    const aim = (x: FlickFlowState): Vec3 => {
      const t = x.target!
      const turned = (t.spec.angleDeg * preferred) / x.block!.cm360
      return targetDirection(t.start, turned, t.spec.directionDeg)
    }
    while (s.phase !== 'done') {
      if (s.phase === 'ready' || s.phase === 'round-summary') {
        s = proceed(s)
        continue
      }
      ;[s, now] = shoot(s, now, aim)
    }
    const r = s.result!
    expect(r.range.lo).toBeLessThanOrEqual(preferred)
    expect(r.range.hi).toBeGreaterThanOrEqual(preferred)
  })
})
