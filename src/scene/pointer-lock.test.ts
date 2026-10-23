import { describe, expect, it } from 'vitest'
import { supportsUnadjustedMovement } from './pointer-lock'

describe('supportsUnadjustedMovement', () => {
  it('is true for Chromium browsers', () => {
    expect(supportsUnadjustedMovement('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36')).toBe(true)
    expect(supportsUnadjustedMovement('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0')).toBe(true)
  })

  it('is false for Firefox and Safari, which ignore the option', () => {
    expect(supportsUnadjustedMovement('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0')).toBe(false)
    expect(supportsUnadjustedMovement('Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15')).toBe(false)
  })
})
