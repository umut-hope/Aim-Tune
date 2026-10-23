/**
 * Pointer Lock input. Asks for `unadjustedMovement` (raw counts, no OS
 * acceleration) and falls back to normal pointer lock where it is not supported.
 */

/** Whether mouse deltas bypass OS acceleration. 'unknown' when the browser gives no answer. */
export type RawInput = 'yes' | 'no' | 'unknown'

export interface PointerLockHandlers {
  /** Raw mouse delta in counts (or CSS pixels when raw input is unavailable). */
  onMove(dx: number, dy: number): void
  onClick(): void
  onLockChange(locked: boolean): void
}

type LockOptions = { unadjustedMovement?: boolean }
type LockableElement = HTMLElement & {
  requestPointerLock(options?: LockOptions): Promise<void> | undefined
}

export class PointerLockInput {
  private raw: RawInput = 'unknown'

  constructor(
    private readonly element: HTMLElement,
    private readonly handlers: PointerLockHandlers,
  ) {
    document.addEventListener('pointerlockchange', this.onLockChange)
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mousedown', this.onMouseDown)
  }

  get locked(): boolean {
    return document.pointerLockElement === this.element
  }

  get rawInput(): RawInput {
    return this.raw
  }

  /** Must be called from a user gesture (click or key press). */
  async lock(): Promise<RawInput> {
    const el = this.element as LockableElement
    try {
      const result = el.requestPointerLock({ unadjustedMovement: true })
      if (result === undefined) {
        // Older API: no promise, so no way to tell if the option was honoured.
        this.raw = 'unknown'
      } else {
        await result
        this.raw = 'yes'
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotSupportedError') {
        await el.requestPointerLock()
        this.raw = 'no'
      } else {
        throw e
      }
    }
    return this.raw
  }

  unlock(): void {
    if (this.locked) document.exitPointerLock()
  }

  private onLockChange = (): void => {
    this.handlers.onLockChange(this.locked)
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (this.locked) this.handlers.onMove(e.movementX, e.movementY)
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (this.locked && e.button === 0) this.handlers.onClick()
  }

  dispose(): void {
    this.unlock()
    document.removeEventListener('pointerlockchange', this.onLockChange)
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mousedown', this.onMouseDown)
  }
}

/**
 * Checks raw input support by briefly locking the pointer, then releasing it.
 * Must be called from a click. Returns 'unknown' if the lock was refused.
 */
export async function probeRawInput(element: HTMLElement): Promise<RawInput> {
  const el = element as LockableElement
  try {
    const result = el.requestPointerLock({ unadjustedMovement: true })
    if (result === undefined) {
      // Older API: the lock may arrive after we return, so release it then.
      document.addEventListener('pointerlockchange', () => document.exitPointerLock(), { once: true })
      return 'unknown'
    }
    await result
    return 'yes'
  } catch (e) {
    return e instanceof DOMException && e.name === 'NotSupportedError' ? 'no' : 'unknown'
  } finally {
    if (document.pointerLockElement === element) document.exitPointerLock()
  }
}
