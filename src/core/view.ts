/**
 * The test camera's view, matched to the player's game.
 *
 * Resolution and aspect ratio do not change cm/360 at all. FOV does matter for
 * the test, though: aim is partly visual, so a target 40° away should appear
 * where it would in the player's game. The FOV conversion itself lives in
 * yawmatch; this module picks which FOV to use and keeps targets on screen.
 */
import { horizontalFromVertical, toVerticalFov, type FovType } from 'yawmatch/src/core/fov'

export { FOV_TYPES, convertFov, horizontalFromVertical, toVerticalFov, verticalFromHorizontal } from 'yawmatch/src/core/fov'
export type { FovType } from 'yawmatch/src/core/fov'

const DEG = Math.PI / 180

/** What the 3D camera needs. */
export interface View {
  /** Vertical FOV in degrees (three.js PerspectiveCamera.fov). */
  verticalFov: number
  /** Width / height of the rendered image. */
  aspect: number
}

/** FOV block of a game in yawmatch's data (structural, so core does not import data). */
export interface GameFov {
  default: number
  type: FovType
  adjustable: boolean
  min?: number | undefined
  max?: number | undefined
}

/**
 * Used when a game's FOV has not been researched yet: 70° vertical, about 102°
 * horizontal at 16:9, which is typical for current shooters.
 */
export const FALLBACK_VERTICAL_FOV = 70

export interface ResolveViewInput {
  /** The selected game's FOV data, or null if unknown. */
  gameFov: GameFov | null
  /** Aspect ratio the player plays at (screen width / height unless they use black bars). */
  aspect: number
  /** FOV value the player set in game, in the game's own definition. */
  playerFov?: number | null | undefined
  /** How `playerFov` is defined when the game's FOV type is unknown. Default 'horizontal'. */
  playerFovType?: FovType | undefined
}

export interface ResolvedView extends View {
  horizontalFov: number
  /** Where the FOV came from, so the UI can say so. */
  source: 'player' | 'game' | 'fallback'
}

/**
 * Picks the FOV for the test camera: the player's own value when the game lets
 * them change it, else the game's default, else a typical fallback.
 */
export function resolveView(input: ResolveViewInput): ResolvedView {
  const { gameFov, aspect, playerFov } = input
  if (!(Number.isFinite(aspect) && aspect > 0)) {
    throw new RangeError(`aspect must be a positive number, got ${aspect}`)
  }

  const build = (verticalFov: number, source: ResolvedView['source']): ResolvedView => ({
    verticalFov,
    aspect,
    horizontalFov: horizontalFromVertical(verticalFov, aspect),
    source,
  })

  if (playerFov != null) {
    if (gameFov) {
      if (gameFov.adjustable) {
        const { min, max } = gameFov
        if ((min !== undefined && playerFov < min) || (max !== undefined && playerFov > max)) {
          throw new RangeError(`FOV ${playerFov} is outside the game's range ${min ?? '?'}–${max ?? '?'}`)
        }
        return build(toVerticalFov(playerFov, gameFov.type, aspect), 'player')
      }
      // The game has a fixed FOV; a typed value cannot be what they see in game.
    } else {
      return build(toVerticalFov(playerFov, input.playerFovType ?? 'horizontal', aspect), 'player')
    }
  }

  if (gameFov) return build(toVerticalFov(gameFov.default, gameFov.type, aspect), 'game')
  return build(FALLBACK_VERTICAL_FOV, 'fallback')
}

/**
 * Screen position of a target `angleDeg` away from the crosshair along screen
 * direction `directionDeg` (0° = right, 90° = up), as a share of the half-screen:
 * x = ±1 is the left/right edge, y = ±1 the top/bottom edge.
 */
export function screenPosition(view: View, angleDeg: number, directionDeg: number): { x: number; y: number } {
  const t = Math.tan(angleDeg * DEG)
  const tanV = Math.tan((view.verticalFov * DEG) / 2)
  const tanH = tanV * view.aspect
  return { x: (t * Math.cos(directionDeg * DEG)) / tanH, y: (t * Math.sin(directionDeg * DEG)) / tanV }
}

export function isOnScreen(view: View, angleDeg: number, directionDeg: number, margin = 1): boolean {
  if (!(angleDeg >= 0 && angleDeg < 90)) return false
  const { x, y } = screenPosition(view, angleDeg, directionDeg)
  return Math.abs(x) <= margin && Math.abs(y) <= margin
}

/**
 * Largest flick angle along `directionDeg` that keeps the target on screen,
 * within `margin` of the half-screen (0.9 = stay out of the outer 10%).
 */
export function maxOnScreenAngle(view: View, directionDeg: number, margin = 0.9): number {
  if (!(margin > 0 && margin <= 1)) throw new RangeError(`margin must be in (0, 1], got ${margin}`)
  const tanV = Math.tan((view.verticalFov * DEG) / 2) * margin
  const tanH = tanV * view.aspect
  const c = Math.abs(Math.cos(directionDeg * DEG))
  const s = Math.abs(Math.sin(directionDeg * DEG))
  const limit = Math.min(c > 1e-12 ? tanH / c : Number.POSITIVE_INFINITY, s > 1e-12 ? tanV / s : Number.POSITIVE_INFINITY)
  return Math.atan(limit) / DEG
}
