import { describe, expect, it } from 'vitest'
import { DEFAULT_FORM, MANUAL_GAME, currentCm360, isPlausibleCm360, prefillForm } from './setup'

const known = (id: string) => ['cs2', 'valorant'].includes(id)

describe('prefillForm', () => {
  it('uses the URL before the saved profile', () => {
    const form = prefillForm(
      [
        { game: 'valorant', sens: 0.4 },
        { game: 'cs2', sens: 1.2, dpi: 400 },
      ],
      known,
    )
    expect(form).toMatchObject({ gameId: 'valorant', sens: '0.4', dpi: '400' })
  })

  it('skips unknown games and their sens', () => {
    const form = prefillForm([{ game: 'nope', sens: 9 }, { game: 'cs2', sens: 1.2 }], known)
    expect(form).toMatchObject({ gameId: 'cs2', sens: '1.2' })
  })

  it('keeps defaults when nothing is known', () => {
    expect(prefillForm([], known)).toEqual(DEFAULT_FORM)
    expect(prefillForm([{ sens: 2 }], known).sens).toBe('')
  })
})

describe('currentCm360', () => {
  const form = { ...DEFAULT_FORM, gameId: 'cs2', sens: '1.2', dpi: '400' }

  it('converts game sens with the game yaw', () => {
    // 360 / (1.2 × 0.022) counts / 400 DPI × 2.54
    expect(currentCm360(form, 0.022, 'cm')).toBeCloseTo((360 / (1.2 * 0.022) / 400) * 2.54, 9)
  })

  it('uses a typed distance for the manual option, in either unit', () => {
    const manual = { ...form, gameId: MANUAL_GAME, distance: '16,9' }
    expect(currentCm360(manual, null, 'in')).toBeCloseTo(16.9 * 2.54, 9)
    expect(currentCm360({ ...manual, distance: '43' }, null, 'cm')).toBe(43)
  })

  it('returns null while the input is incomplete', () => {
    expect(currentCm360({ ...form, sens: '' }, 0.022, 'cm')).toBeNull()
    expect(currentCm360(form, null, 'cm')).toBeNull()
    expect(currentCm360({ ...form, gameId: MANUAL_GAME }, null, 'cm')).toBeNull()
  })
})

describe('isPlausibleCm360', () => {
  it('flags typos', () => {
    expect(isPlausibleCm360(40)).toBe(true)
    expect(isPlausibleCm360(2)).toBe(false)
    expect(isPlausibleCm360(900)).toBe(false)
  })
})
