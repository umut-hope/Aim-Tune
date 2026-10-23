import { describe, expect, it } from 'vitest'
import { REPO_URL, browserName, feedbackUrl } from './links'

describe('feedbackUrl', () => {
  it('opens the result form prefilled with the numbers', () => {
    const url = new URL(
      feedbackUrl({
        test: 'flick',
        range: { lo: 39.7, hi: 43.7 },
        current: 42.9,
        game: 'Counter-Strike 2',
        sens: { lo: 2.38, hi: 2.62 },
        dpi: 400,
        browser: 'Chrome',
        link: 'https://umut-hope.github.io/Aim-Tune/?lo=39.7&hi=43.7',
      }),
    )
    expect(`${url.origin}${url.pathname}`).toBe(`${REPO_URL}/issues/new`)
    expect(url.searchParams.get('template')).toBe('result-feedback.yml')
    expect(url.searchParams.get('title')).toBe('[result] flick: 39.7–43.7 cm/360')
    const result = url.searchParams.get('result')!
    expect(result).toContain('Current: 42.9 cm/360')
    expect(result).toContain('In-game sens: 2.38–2.62')
    expect(result).toContain('DPI: 400')
    expect(result).toContain('Browser: Chrome')
  })

  it('leaves out what is unknown', () => {
    const result = new URL(feedbackUrl({ test: 'tracking', range: { lo: 30, hi: 40 } })).searchParams.get('result')!
    expect(result.split('\n')).toEqual(['Test: tracking', 'Recommended: 30–40 cm/360'])
  })
})

describe('browserName', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 'Chrome'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 'Edge'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0', 'Firefox'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15', 'Safari'],
  ])('recognises %s', (ua, name) => {
    expect(browserName(ua)).toBe(name)
  })
})
