import { describe, expect, it } from 'vitest'
import { seededRng } from '../core/testing/simulated-player'
import {
  MIN_TRY_MS,
  activeCm360,
  canChoose,
  choose,
  createAbTest,
  outcome,
  pause,
  resume,
  shoot,
  tick,
  toggle,
  type AbState,
} from './ab-flow'

const current = { cm360: 42.9, name: 'Current' }
const recommended = { cm360: 39.6, name: 'Recommended' }

/** Plays `ms` of time in 100 ms frames on the active option. */
function play(s: AbState, ms: number): AbState {
  for (let t = 0; t < ms; t += 100) s = tick(s, 100)
  return s
}

describe('A/B test', () => {
  it('keeps the given order when not blind', () => {
    const s = createAbTest({ first: current, second: recommended, blind: false })
    expect(s.options).toEqual([current, recommended])
    expect(activeCm360(s)).toBe(42.9)
  })

  it('shuffles labels in blind mode, both ways over many runs', () => {
    const rng = seededRng(1)
    const firsts = new Set<string>()
    for (let i = 0; i < 20; i++) {
      firsts.add(createAbTest({ first: current, second: recommended, blind: true, rng }).options[0].name)
    }
    expect(firsts).toEqual(new Set(['Current', 'Recommended']))
  })

  it('switches the active option and counts switches', () => {
    let s = createAbTest({ first: current, second: recommended, blind: false })
    s = toggle(s)
    expect(s.active).toBe(1)
    expect(activeCm360(s)).toBe(39.6)
    s = toggle(s)
    expect(s.active).toBe(0)
    expect(s.switches).toBe(2)
  })

  it('records time, shots and hits per option', () => {
    let s = createAbTest({ first: current, second: recommended, blind: false })
    s = play(s, 1000)
    s = shoot(shoot(s, true), false)
    s = toggle(s)
    s = play(s, 500)
    s = shoot(s, true)
    expect(s.stats[0]).toEqual({ timeMs: 1000, shots: 2, hits: 1 })
    expect(s.stats[1]).toEqual({ timeMs: 500, shots: 1, hits: 1 })
  })

  it('does not count long frames or paused time', () => {
    let s = createAbTest({ first: current, second: recommended, blind: false })
    s = tick(s, 5000)
    expect(s.stats[0].timeMs).toBe(250)
    s = pause(s)
    s = tick(s, 100)
    s = shoot(s, true)
    s = toggle(s)
    expect(s.stats[0]).toEqual({ timeMs: 250, shots: 0, hits: 0 })
    expect(s.active).toBe(0)
    expect(resume(s).phase).toBe('playing')
  })

  it('needs both options tried before a choice counts', () => {
    let s = createAbTest({ first: current, second: recommended, blind: false })
    s = play(s, MIN_TRY_MS)
    expect(canChoose(s)).toBe(false)
    expect(choose(pause(s), 1).phase).toBe('paused')
    s = play(toggle(s), MIN_TRY_MS)
    expect(canChoose(s)).toBe(true)
    s = choose(pause(s), 1)
    expect(s.phase).toBe('done')
    expect(outcome(s)?.preferred).toEqual(recommended)
  })

  it('reveals the real option behind a blind label', () => {
    let s = createAbTest({ first: current, second: recommended, blind: true, rng: () => 0.1 })
    expect(s.options[0]).toEqual(recommended) // swapped
    s = play(toggle(play(s, MIN_TRY_MS)), MIN_TRY_MS)
    const o = outcome(choose(s, 0))!
    expect(o.preferred).toEqual(recommended)
    expect(o.blind).toBe(true)
  })

  it('accepts "no difference"', () => {
    let s = createAbTest({ first: current, second: recommended, blind: false })
    s = play(toggle(play(s, MIN_TRY_MS)), MIN_TRY_MS)
    const o = outcome(choose(s, 'same'))!
    expect(o.choice).toBe('same')
    expect(o.preferred).toBeNull()
  })

  it('has no outcome before a choice', () => {
    expect(outcome(createAbTest({ first: current, second: recommended, blind: false }))).toBeNull()
  })

  it('rejects invalid distances', () => {
    expect(() => createAbTest({ first: { cm360: 0, name: 'x' }, second: recommended, blind: false })).toThrow(RangeError)
  })
})
