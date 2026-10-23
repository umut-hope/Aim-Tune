import { describe, expect, it } from 'vitest'
import { FALLBACK_VERTICAL_FOV, isOnScreen, maxOnScreenAngle, resolveView, screenPosition, type GameFov, type View } from './view'

const WIDE = 16 / 9
const fixed43: GameFov = { default: 90, type: 'horizontal-4:3', adjustable: false }
const adjustable: GameFov = { default: 103, type: 'horizontal', adjustable: true, min: 80, max: 120 }

describe('resolveView', () => {
  it("uses the game's default FOV", () => {
    const v = resolveView({ gameFov: fixed43, aspect: WIDE })
    expect(v.source).toBe('game')
    expect(v.verticalFov).toBeCloseTo(73.7398, 3)
    expect(v.horizontalFov).toBeCloseTo(106.2602, 3)
    expect(v.aspect).toBe(WIDE)
  })

  it("uses the player's FOV when the game allows changing it", () => {
    const v = resolveView({ gameFov: adjustable, aspect: WIDE, playerFov: 90 })
    expect(v.source).toBe('player')
    expect(v.horizontalFov).toBeCloseTo(90, 9)
  })

  it('ignores a player FOV for a game with a fixed FOV', () => {
    expect(resolveView({ gameFov: fixed43, aspect: WIDE, playerFov: 110 }).source).toBe('game')
  })

  it("rejects a player FOV outside the game's range", () => {
    expect(() => resolveView({ gameFov: adjustable, aspect: WIDE, playerFov: 130 })).toThrow(RangeError)
  })

  it('accepts a player FOV for a game whose FOV is unknown', () => {
    const v = resolveView({ gameFov: null, aspect: WIDE, playerFov: 70, playerFovType: 'vertical' })
    expect(v).toMatchObject({ source: 'player', verticalFov: 70 })
  })

  it('falls back to a typical FOV when nothing is known', () => {
    const v = resolveView({ gameFov: null, aspect: WIDE })
    expect(v).toMatchObject({ source: 'fallback', verticalFov: FALLBACK_VERTICAL_FOV })
    expect(v.horizontalFov).toBeGreaterThan(100)
  })

  it('keeps the same horizontal FOV across aspect ratios for horizontal games', () => {
    for (const aspect of [4 / 3, WIDE, 21 / 9]) {
      expect(resolveView({ gameFov: adjustable, aspect }).horizontalFov).toBeCloseTo(103, 9)
    }
  })

  it('rejects a bad aspect ratio', () => {
    expect(() => resolveView({ gameFov: null, aspect: 0 })).toThrow(RangeError)
  })
})

describe('screen limits', () => {
  const view: View = { verticalFov: 2 * (Math.atan(Math.tan(Math.PI / 4) / WIDE) * 180) / Math.PI, aspect: WIDE } // 90° horizontal

  it('puts a target at half the horizontal FOV exactly on the side edge', () => {
    expect(screenPosition(view, 45, 0).x).toBeCloseTo(1, 9)
    expect(screenPosition(view, 45, 180).x).toBeCloseTo(-1, 9)
    expect(screenPosition(view, view.verticalFov / 2, 90).y).toBeCloseTo(1, 9)
  })

  it('caps flicks at whichever screen edge the direction hits first', () => {
    expect(maxOnScreenAngle(view, 0, 1)).toBeCloseTo(45, 9)
    expect(maxOnScreenAngle(view, 180, 1)).toBeCloseTo(45, 9)
    expect(maxOnScreenAngle(view, 0, 0.9)).toBeLessThan(45)
    expect(maxOnScreenAngle(view, 90, 1)).toBeCloseTo(view.verticalFov / 2, 9)
    // Tilted 30°: the path hits the top edge first, but further out than the
    // side edge, since the screen's diagonal reaches further.
    const tanTop = Math.tan(((view.verticalFov / 2) * Math.PI) / 180)
    const expected = (Math.atan(tanTop / Math.sin(Math.PI / 6)) * 180) / Math.PI
    expect(maxOnScreenAngle(view, 30, 1)).toBeCloseTo(expected, 9)
    expect(expected).toBeGreaterThan(45)
  })

  it('agrees with isOnScreen', () => {
    for (const dir of [0, 15, 30, 150, 200, 330]) {
      const cap = maxOnScreenAngle(view, dir, 0.9)
      expect(isOnScreen(view, cap - 0.01, dir, 0.9)).toBe(true)
      expect(isOnScreen(view, cap + 0.01, dir, 0.9)).toBe(false)
    }
    expect(isOnScreen(view, 95, 0)).toBe(false)
  })

  it('rejects a bad margin', () => {
    expect(() => maxOnScreenAngle(view, 0, 0)).toThrow(RangeError)
    expect(() => maxOnScreenAngle(view, 0, 1.5)).toThrow(RangeError)
  })
})
