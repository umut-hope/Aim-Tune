import { describe, expect, it } from 'vitest'
import { directionFromYawPitch } from '../core/angles'
import { distanceToRoomSurface } from './flick-scene'

describe('distanceToRoomSurface', () => {
  it('reaches the far wall straight ahead', () => {
    expect(distanceToRoomSurface(directionFromYawPitch(0, 0))).toBeCloseTo(15, 9)
  })

  it('hits the floor when looking down', () => {
    // Eye height 1.6 m: a target 20° below the horizon would sit under the floor at 10 m.
    expect(distanceToRoomSurface(directionFromYawPitch(0, -20))).toBeCloseTo(1.6 / Math.sin((20 * Math.PI) / 180), 9)
    expect(distanceToRoomSurface(directionFromYawPitch(0, -90))).toBeCloseTo(1.6, 9)
  })

  it('hits a side wall at an angle', () => {
    expect(distanceToRoomSurface(directionFromYawPitch(45, 0))).toBeCloseTo(15 * Math.SQRT2, 9)
  })
})
