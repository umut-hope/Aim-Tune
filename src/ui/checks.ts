/** Browser checks shown before the test: mouse, pointer lock, frame rate. */

/** True when the main pointer is a mouse or trackpad, not a touch screen. */
export function hasFinePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
}

export function pointerLockSupported(): boolean {
  return typeof document !== 'undefined' && 'requestPointerLock' in document.documentElement
}

export type CheckStatus = 'pass' | 'warn'

/**
 * Frame rate verdict. The browser draws at the screen's refresh rate, so 60 is
 * normal on a 60 Hz screen; below ~55 the flicks get choppy.
 */
export function fpsStatus(fps: number): CheckStatus {
  return fps >= 55 ? 'pass' : 'warn'
}

/** Measures the animation frame rate over `durationMs`. */
export function measureFps(durationMs = 1000): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0
    let start = 0
    const step = (now: number) => {
      if (start === 0) start = now
      else frames++
      if (now - start >= durationMs) resolve((frames * 1000) / (now - start))
      else requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}
