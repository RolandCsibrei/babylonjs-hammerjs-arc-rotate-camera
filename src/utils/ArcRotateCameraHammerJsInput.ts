/**
 * Google Earth like touch camera controls
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ArcRotateCamera, CameraInputTypes, Color3, ICameraInput, MeshBuilder, StandardMaterial, Vector2, Vector3 } from '@babylonjs/core'

import 'hammerjs'

interface DoubleTouchInfo {
  center: Vector2
  deltaCenter: Vector2
  angle: number
  deltaAngle: number
  distance: number
  deltaDistance: number
}

interface TouchInfo {
  x: number
  y: number
  deltaCenter: Vector2
  distance: number
  deltaDistance: number
}

/**
 * Manage the mouse inputs to control the movement of a free camera.
 * @see https://doc.babylonjs.com/how_to/customizing_camera_inputs
 */
export class ArcRotateCameraHammerJsInput implements ICameraInput<ArcRotateCamera> {
  /**
   * Defines the camera the input is attached to.
   */
  public camera!: ArcRotateCamera

  //

  private _oldPointer0: TouchInfo
  private _startPointer0: TouchInfo
  private _oldPointer1: TouchInfo
  private _startPointer1: TouchInfo

  /**
   * Manage the mouse inputs to control the movement of a free camera.
   * @see https://doc.babylonjs.com/how_to/customizing_camera_inputs
   * @param touchEnabled Defines if touch is enabled or not
   */
  constructor(
    /**
     * Define if touch is enabled in the mouse input
     */
    public rotationSensibilityAlpha = 80,
    public rotationSensibilityBeta = 400,
    public panningSensibility = 400,
    public zoomSensibility = 80,
    public xPanningRatio = 2 / 60,
    public zPanningRatio = 4 / 60,
    public xPanningTreshold = 40,
    public yPanningTreshold = 40,
    public rotationTreshold = 10,
    public zoomLowerTreshold = 0.85,
    public zoomUpperTreshold = 1.2,
    public tiltTouchDistanceTresholdInPixelsX = 50,
    public tiltTouchDistanceTresholdInPixelsY = 50
  ) {
    this._oldPointer0 = { x: 0, y: 0, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }
    this._startPointer0 = { x: 0, y: 0, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }

    this._oldPointer1 = { x: 0, y: 0, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }
    this._startPointer1 = { x: 0, y: 0, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }
  }

  /**
   * Attach the input controls to a specific dom element to get the input from.
   * @param noPreventDefault Defines whether event caught by the controls should call preventdefault() (https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault)
   */
  public attachControl(noPreventDefault?: boolean): void {
    // noPreventDefault = Tools.BackCompatCameraNoPreventDefault(arguments)
    const engine = this.camera.getEngine()
    const element = <EventTarget>engine.getInputElement()
    const manager = new Hammer.Manager(element)

    const rotate = new Hammer.Rotate()
    const pan = new Hammer.Pan({ threshold: 0 })

    manager.add(rotate)
    manager.add(pan)

    const scene = this.camera.getScene()

    // DEBUG markers
    const size = 1
    const centerMarker = MeshBuilder.CreateBox('centerMarker', { size: 0.5 }, scene)
    const centerMarkerMaterial = new StandardMaterial('centerMarkerMaterial', scene)
    centerMarkerMaterial.emissiveColor = Color3.Green()
    centerMarker.material = centerMarkerMaterial

    const touch1Marker = MeshBuilder.CreateBox('touch1marker', { size }, scene)
    const touch1MarkerMaterial = new StandardMaterial('touch1MarkerMaterial', scene)
    touch1MarkerMaterial.emissiveColor = Color3.Red()
    touch1Marker.material = touch1MarkerMaterial

    const touch2Marker = MeshBuilder.CreateBox('touch2marker', { size }, scene)
    const touch2MarkerMaterial = new StandardMaterial('touch2MarkerMaterial', scene)
    touch2MarkerMaterial.emissiveColor = Color3.Blue()
    touch2Marker.material = touch2MarkerMaterial

    let startPosition = Vector3.Zero()
    let startTarget = Vector3.Zero()

    let startCenterX = 0
    let startCenterY = 0

    let startAlpha = 0
    let startBeta = 0

    let startRadius = 0

    let isBetaPanning = false
    let isPanning = false
    let isRotating = false

    let firstTouchLow = false

    //

    // let oldInfo: DoubleTouchInfo = {
    //   center: new Vector2(),
    //   deltaCenter: new Vector2(),
    //   angle: 0,
    //   deltaAngle: 0,
    //   distance: 0,
    //   deltaDistance: 0
    // }

    let startInfo: DoubleTouchInfo = {
      center: new Vector2(),
      deltaCenter: new Vector2(),
      angle: 0,
      deltaAngle: 0,
      distance: 0,
      deltaDistance: 0
    }

    manager.on('panstart', e => {
      if (!isRotating || !isBetaPanning) {
        // console.log('panstart')
        this._oldPointer0 = { x: e.pointers[0].clientX, y: e.pointers[0].clientY, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }
        this._startPointer0 = { x: e.pointers[0].clientX, y: e.pointers[0].clientY, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }

        isPanning = true
        startCenterX = e.pointers[0].clientX
        startCenterY = e.pointers[0].clientY

        startPosition = this.camera.position.clone()
        startTarget = this.camera.target.clone()
      }
    })

    manager.on('pan', e => {
      if (!isRotating || !isBetaPanning) {
        const dx = -(startCenterX - e.pointers[0].clientX) * this.xPanningRatio
        const dy = (startCenterY - e.pointers[0].clientY) * this.zPanningRatio
        panMove(dx, dy)
      }
    })

    manager.on('panend', e => {
      if (!isRotating || !isBetaPanning) {
        // console.log('panend')
        isPanning = false
      }
    })

    manager.on('rotateend', e => {
      // console.log('rotateend')
      setTimeout(() => {
        isRotating = false
        isBetaPanning = false
      }, 300)
    })

    manager.on('rotatestart', e => {
      // console.log('rotatestart')

      isRotating = true

      const sx0 = e.pointers[0].clientX
      const sx1 = e.pointers[1].clientX
      const sy0 = e.pointers[0].clientY
      const sy1 = e.pointers[1].clientY
      if (sy0 > sy1) {
        firstTouchLow = true
      } else {
        firstTouchLow = false
      }
      this._oldPointer0 = { x: e.pointers[0].clientX, y: e.pointers[0].clientY, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }
      this._oldPointer1 = { x: e.pointers[1].clientX, y: e.pointers[1].clientY, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }

      this._startPointer0 = { x: e.pointers[0].clientX, y: e.pointers[0].clientY, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }
      this._startPointer1 = { x: e.pointers[1].clientX, y: e.pointers[1].clientY, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }

      //

      //

      if (
        Math.abs(this._startPointer0.y - this._startPointer1.y) < this.tiltTouchDistanceTresholdInPixelsY &&
        Math.abs(this._startPointer0.x - this._startPointer1.x) > this.tiltTouchDistanceTresholdInPixelsX
      ) {
        isBetaPanning = true
      } else {
        isBetaPanning = false
      }
      startPosition = this.camera.position.clone()
      startTarget = this.camera.target.clone()

      const info = getCenterAngleDistance(this._startPointer0, this._startPointer1)

      startInfo = { ...info }

      //

      startAlpha = this.camera.alpha
      startBeta = this.camera.beta
      startRadius = this.camera.radius
    })

    manager.on('rotate', e => {
      const p0 = processPointer(e.pointers[0], this._oldPointer0, this._startPointer0)
      const p1 = processPointer(e.pointers[1], this._oldPointer1, this._startPointer1)
      const info = getCenterAngleDistance(p0, p1)

      let addAngle = 0
      if (firstTouchLow) {
        //   if (p0.y === p1.y && p0.x < p1.x) {
        //     addAngle = Math.PI
        //   }
        //   if (p0.y === p1.y && p0.x > p1.x) {
        //     addAngle = Math.PI
        //   }

        if (p0.y < p1.y && p0.x < p1.x) {
          addAngle = Math.PI
        }
        if (p0.y < p1.y && p0.x > p1.x) {
          addAngle = -Math.PI
        }
      } else {
        if (p0.y > p1.y && p0.x < p1.x) {
          addAngle = -Math.PI
        }
        if (p0.y > p1.y && p0.x > p1.x) {
          addAngle = Math.PI
        }
      }

      // DEBUG MARKERS
      // const s = 0.04
      // touch1Marker.position = new Vector3(p0.x, 1, p0.y).scale(s)
      // touch2Marker.position = new Vector3(p1.x, 1, p1.y).scale(s)
      // centerMarker.position = new Vector3(info.center.x, 1, info.center.y).scale(s)

      // touch1Marker.position.x -= 40
      // touch2Marker.position.x -= 40
      // centerMarker.position.x -= 40
      // touch1Marker.position.z -= 40
      // touch2Marker.position.z -= 40
      // centerMarker.position.z -= 40
      //

      const deltaAngle = info.deltaAngle + addAngle

      if (!isBetaPanning) {
        this.camera.alpha = startAlpha + deltaAngle / 2
        panMove(info.deltaCenter.x / 20, info.deltaCenter.y / 20)

        this.camera.radius = startRadius + info.deltaDistance / 10

        // console.log(
        //   'startAlpha',
        //   (startAlpha * 180) / Math.PI,
        //   'startInfo.angle',
        //   (startInfo.angle * 180) / Math.PI,
        //   'angle',
        //   (info.angle * 180) / Math.PI,
        //   'addAngle',
        //   (addAngle * 180) / Math.PI,
        //   'deltaAngle',
        //   (deltaAngle * 180) / Math.PI,
        //   'info.deltaCenter.x',
        //   info.deltaCenter.x,
        //   'info.deltaCenter.y',
        //   info.deltaCenter.y,
        //   'p0',
        //   p0.x,
        //   p0.y,
        //   'p1',
        //   p1.x,
        //   p1.y,
        //   'firstTouchLow',
        //   firstTouchLow
        // )
      } else {
        this.camera.beta = startBeta + info.deltaCenter.y / 400
      }

      this._oldPointer0.x = e.pointers[0].clientX
      this._oldPointer0.y = e.pointers[0].clientY

      this._oldPointer1.x = e.pointers[1].clientX
      this._oldPointer1.y = e.pointers[1].clientY
    })

    const panMove = (dx: number, dy: number) => {
      // console.log('panMove', dx, dy)
      // rotate the position according to camera.alpha
      const alpha = this.camera.alpha - Math.PI / 2
      const c = Math.cos(alpha)
      const s = Math.sin(alpha)
      const x1 = dx
      const y1 = dy
      const x2 = c * x1 - s * y1
      const y2 = s * x1 + c * y1

      this.camera.position.x = startPosition.x + x2
      this.camera.position.z = startPosition.z + y2

      this.camera.target.x = startTarget.x + x2
      this.camera.target.z = startTarget.z + y2
    }

    const processPointer = (e: PointerEvent, oldPointer: TouchInfo, startPointer: TouchInfo) => {
      const dx = startPointer.x - e.clientX
      const dy = startPointer.y - e.clientY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const deltaDistance = startInfo.distance - distance
      const touchInfo: TouchInfo = {
        x: e.clientX,
        y: e.clientY,
        deltaCenter: new Vector2(dx, dy),
        distance,
        deltaDistance
      }

      return touchInfo
    }

    const getCenterAngleDistance = (p0: TouchInfo, p1: TouchInfo): DoubleTouchInfo => {
      const maxX = Math.max(p0.x, p1.x)
      const maxY = Math.max(p0.y, p1.y)
      const minX = Math.min(p0.x, p1.x)
      const minY = Math.min(p0.y, p1.y)

      const touchWidth = p0.x - p1.x
      const touchHeight = p0.y - p1.y

      const center = new Vector2((maxX - minX) / 2 + minX, (maxY - minY) / 2 + minY)
      const deltaCenter = new Vector2(center.x - startInfo.center.x, startInfo.center.y - center.y)

      const angle = Math.atan(touchWidth / touchHeight)

      const deltaAngle = startInfo.angle - angle
      const distance = Math.sqrt(touchWidth * touchWidth + touchHeight * touchHeight)
      const deltaDistance = startInfo.distance - distance

      return {
        center,
        deltaCenter,
        angle,
        deltaAngle,
        distance,
        deltaDistance
      }
    }
  }

  /**
   * Called on JS contextmenu event.
   * Override this method to provide functionality.
   */
  protected onContextMenu(evt: PointerEvent): void {
    evt.preventDefault()
  }

  /**
   * Detach the current controls from the specified dom element.
   */
  public detachControl(): void

  /**
   * Detach the current controls from the specified dom element.
   * @param ignored defines an ignored parameter kept for backward compatibility. If you want to define the source input element, you can set engine.inputElement before calling camera.attachControl
   */
  public detachControl(ignored?: any): void {
    //
  }

  /**
   * Gets the class name of the current input.
   * @returns the class name
   */
  public getClassName(): string {
    return 'ArcrotateCameraHammerJsInput'
  }

  /**
   * Get the friendly name associated with the input class.
   * @returns the input friendly name
   */
  public getSimpleName(): string {
    return 'HammerJS'
  }

  public checkInputs() {
    // this.camera.inertialRadiusOffset = -0.1
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
;(<any>CameraInputTypes)['ArcrotateCameraHammerJsInput'] = ArcRotateCameraHammerJsInput
