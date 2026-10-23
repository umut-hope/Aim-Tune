/**
 * The 3D room for the flick test: flat-shaded walls, a 1 m floor grid and one
 * flat yellow sphere target. No textures or assets.
 *
 * The camera sits in the middle of the room and only rotates. Rendering keeps
 * the aspect ratio of the player's game (letterboxed if the window differs),
 * so the field of view matches what they see in game.
 */
import {
  BackSide,
  BoxGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { Vec3 } from '../core/angles'
import type { View } from '../core/view'
import { SCENE_COLORS } from './palette'

const EYE_HEIGHT = 1.6
const ROOM_SIZE = 30
const ROOM_HEIGHT = 12
/**
 * Preferred distance of targets from the camera. Closer when a wall, the floor
 * or the ceiling is in the way; objects are scaled with distance so their size
 * on screen never changes.
 */
const TARGET_DISTANCE = 10
/** 0.25 m at 10 m ≈ 1.4° angular radius. */
const TARGET_RADIUS = 0.25
/** 0.06 m at 10 m ≈ 0.34° angular radius. */
const HOME_RADIUS = 0.06
const MAX_PITCH = 89

/** Distance along `dir` from the eye to the first room surface. */
export function distanceToRoomSurface(dir: Vec3): number {
  const origin = [0, EYE_HEIGHT, 0] as const
  const min = [-ROOM_SIZE / 2, 0, -ROOM_SIZE / 2] as const
  const max = [ROOM_SIZE / 2, ROOM_HEIGHT, ROOM_SIZE / 2] as const
  let t = Number.POSITIVE_INFINITY
  for (let i = 0; i < 3; i++) {
    const d = dir[i]!
    if (d > 1e-9) t = Math.min(t, (max[i]! - origin[i]!) / d)
    else if (d < -1e-9) t = Math.min(t, (min[i]! - origin[i]!) / d)
  }
  return t
}

export class FlickScene {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(70, 16 / 9, 0.05, 100)
  private readonly target: Mesh
  private readonly home: Mesh
  private readonly disposables: { dispose(): void }[] = []
  private view: View = { verticalFov: 70, aspect: 16 / 9 }
  private yaw = 0
  private pitch = 0

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setScissorTest(true)
    this.scene.background = new Color(SCENE_COLORS.background)

    this.camera.position.set(0, EYE_HEIGHT, 0)
    this.camera.rotation.order = 'YXZ'

    this.buildRoom()

    const targetGeometry = new SphereGeometry(TARGET_RADIUS, 32, 16)
    const targetMaterial = new MeshBasicMaterial({ color: SCENE_COLORS.accent })
    this.disposables.push(targetGeometry, targetMaterial)
    this.target = new Mesh(targetGeometry, targetMaterial)
    this.target.visible = false
    this.scene.add(this.target)

    const homeGeometry = new SphereGeometry(HOME_RADIUS, 16, 8)
    const homeMaterial = new MeshBasicMaterial({ color: SCENE_COLORS.text })
    this.disposables.push(homeGeometry, homeMaterial)
    this.home = new Mesh(homeGeometry, homeMaterial)
    this.home.visible = false
    this.scene.add(this.home)
  }

  /** Puts a mesh in `direction`, inside the room, at a constant size on screen. */
  private place(mesh: Mesh, direction: Vec3): void {
    const distance = Math.min(TARGET_DISTANCE, 0.9 * distanceToRoomSurface(direction))
    mesh.position.set(direction[0] * distance, EYE_HEIGHT + direction[1] * distance, direction[2] * distance)
    mesh.scale.setScalar(distance / TARGET_DISTANCE)
  }

  private buildRoom(): void {
    const walls = new BoxGeometry(ROOM_SIZE, ROOM_HEIGHT, ROOM_SIZE)
    const wallMaterial = new MeshLambertMaterial({ color: SCENE_COLORS.surface, side: BackSide, flatShading: true })
    const room = new Mesh(walls, wallMaterial)
    room.position.y = ROOM_HEIGHT / 2
    this.scene.add(room)

    const grid = new GridHelper(ROOM_SIZE, ROOM_SIZE, SCENE_COLORS.border, SCENE_COLORS.border)
    grid.position.y = 0.001
    this.scene.add(grid)

    const hemi = new HemisphereLight(0xffffff, SCENE_COLORS.background, 1.6)
    const sun = new DirectionalLight(0xffffff, 0.8)
    sun.position.set(4, 10, 2)
    this.scene.add(hemi, sun)

    this.disposables.push(walls, wallMaterial, grid)
  }

  setView(view: View): void {
    this.view = view
    this.camera.fov = view.verticalFov
    this.camera.aspect = view.aspect
    this.camera.updateProjectionMatrix()
    this.resize()
  }

  /** Matches the drawing buffer to the canvas size and letterboxes to the view's aspect. */
  resize(): void {
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    if (width === 0 || height === 0) return
    this.renderer.setSize(width, height, false)

    let w = width
    let h = width / this.view.aspect
    if (h > height) {
      h = height
      w = height * this.view.aspect
    }
    const x = (width - w) / 2
    const y = (height - h) / 2
    this.renderer.setViewport(x, y, w, h)
    this.renderer.setScissor(x, y, w, h)
  }

  /** Turns the camera by a mouse delta already converted to degrees. Positive yaw turns left. */
  rotate(deltaYawDeg: number, deltaPitchDeg: number): void {
    this.yaw = (this.yaw + deltaYawDeg) % 360
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + deltaPitchDeg))
  }

  resetLook(): void {
    this.yaw = 0
    this.pitch = 0
  }

  /** Current view direction (unit vector, three.js frame). */
  direction(): Vec3 {
    this.applyLook()
    const v = this.camera.getWorldDirection(new Vector3())
    return [v.x, v.y, v.z]
  }

  /** Shows the target in a direction from the camera, or hides it with `null`. */
  showTarget(direction: Vec3 | null): void {
    if (!direction) {
      this.target.visible = false
      return
    }
    this.target.visible = true
    this.place(this.target, direction)
  }

  /** Shows the white home dot the player returns to between shots, or hides it. */
  showHome(direction: Vec3 | null): void {
    if (!direction) {
      this.home.visible = false
      return
    }
    this.home.visible = true
    this.place(this.home, direction)
  }

  render(): void {
    this.applyLook()
    this.renderer.render(this.scene, this.camera)
  }

  private applyLook(): void {
    this.camera.rotation.set((this.pitch * Math.PI) / 180, (this.yaw * Math.PI) / 180, 0)
    this.camera.updateMatrixWorld()
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose()
    this.renderer.dispose()
  }
}
