import { describe, expect, it } from 'vitest'
import { fpsStatus } from './checks'

describe('fpsStatus', () => {
  it('passes common refresh rates and warns on choppy ones', () => {
    expect(fpsStatus(144)).toBe('pass')
    expect(fpsStatus(59.8)).toBe('pass')
    expect(fpsStatus(40)).toBe('warn')
  })
})
