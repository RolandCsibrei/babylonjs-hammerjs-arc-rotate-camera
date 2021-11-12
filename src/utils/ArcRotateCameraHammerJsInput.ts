/**
 * Google Earth like touch camera controls
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ArcRotateCamera,
  CameraInputTypes,
  Color3,
  Color4,
  FreeCamera,
  ICameraInput,
  LinesMesh,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Vector2,
  Vector3
} from '@babylonjs/core'
import { AdvancedDynamicTexture, Button } from '@babylonjs/gui'
import * as GUI from '@babylonjs/gui'
import 'hammerjs'
import { worldToScreen } from './babylonjs'

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

  public showDebug = true

  //

  private _startPointer0: TouchInfo
  private _oldPointer0: TouchInfo

  private _startPointer1: TouchInfo
  private _oldPointer1: TouchInfo

  private _startInfo: DoubleTouchInfo
  private _oldInfo: DoubleTouchInfo

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

    this._oldInfo = {
      center: new Vector2(),
      deltaCenter: new Vector2(),
      angle: 0,
      deltaAngle: 0,
      distance: 0,
      deltaDistance: 0
    }

    this._startInfo = {
      center: new Vector2(),
      deltaCenter: new Vector2(),
      angle: 0,
      deltaAngle: 0,
      distance: 0,
      deltaDistance: 0
    }
  }

  private _debugCamera?: ArcRotateCamera

  /**
   * Attach the input controls to a specific dom element to get the input from.
   * @param noPreventDefault Defines whether event caught by the controls should call preventdefault() (https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault)
   */
  public attachControl(noPreventDefault?: boolean): void {
    // noPreventDefault = Tools.BackCompatCameraNoPreventDefault(arguments)
    const engine = this.camera.getEngine()
    const element = <EventTarget>engine.getInputElement()
    const manager = new Hammer.Manager(element)

    const rotate = new Hammer.Rotate({ threshold: 60, posThreshold: 60 })
    const pan = new Hammer.Pan({ threshold: 60, posThreshold: 60 })

    manager.add(rotate)
    manager.add(pan)

    const scene = this.camera.getScene()

    if (this.showDebug && scene.activeCameras) {
      if (scene.activeCameras?.length === 0 && scene.activeCamera) {
        scene.activeCameras.push(scene.activeCamera)
      }

      const adt = AdvancedDynamicTexture.CreateFullscreenUI('debug', true, scene)

      const debugLinePoints = [new Vector3(0, 0, 0), new Vector3(40, 10, 0)]
      const debugLinePointsColors = [new Color4(1, 0, 0, 1), new Color4(0, 0, 1, 1)]

      const debugLineOptions: {
        points: Vector3[]
        colors: Color4[]
        updatable?: boolean
        instance?: LinesMesh
      } = {
        points: debugLinePoints,
        updatable: true,
        colors: debugLinePointsColors
      }

      const secondCamera = new FreeCamera('debugCamera', new Vector3(0, 0, -30), scene)
      secondCamera.layerMask = 0x20000000
      scene.activeCameras.push(secondCamera)

      let lines = MeshBuilder.CreateLines('debugLines', debugLineOptions, scene)
      lines.layerMask = 0x20000000

      this._debugCamera = new ArcRotateCamera('debugCamera', 0, 0, 10, Vector3.Zero(), scene)
      this._debugCamera.layerMask = 0x20000000

      const diameter = 1

      const centerMarker = MeshBuilder.CreateSphere('centerMarker', { diameter: 0.5 }, scene)
      const centerMarkerMaterial = new StandardMaterial('centerMarkerMaterial', scene)
      centerMarkerMaterial.emissiveColor = Color3.Gray()
      centerMarkerMaterial.disableLighting = true
      centerMarker.material = centerMarkerMaterial
      centerMarker.layerMask = 0x20000000
      centerMarker.visibility = 0.4
      const centerButton = this._addDebugButton(0, adt)

      const touch1Marker = MeshBuilder.CreateSphere('touch1marker', { diameter }, scene)
      const touch1MarkerMaterial = new StandardMaterial('touch1MarkerMaterial', scene)
      touch1MarkerMaterial.emissiveColor = Color3.Red()
      touch1MarkerMaterial.disableLighting = true
      touch1Marker.material = touch1MarkerMaterial
      touch1Marker.layerMask = 0x20000000
      touch1Marker.visibility = 0.6
      touch1Marker.outlineColor = Color3.Gray()
      touch1Marker.outlineWidth = 0.1
      touch1Marker.renderOutline = true
      const touch1Button = this._addDebugButton(1, adt)

      const touch2Marker = MeshBuilder.CreateSphere('touch2marker', { diameter }, scene)
      const touch2MarkerMaterial = new StandardMaterial('touch2MarkerMaterial', scene)
      touch2MarkerMaterial.emissiveColor = Color3.Blue()
      touch2MarkerMaterial.disableLighting = true
      touch2Marker.material = touch2MarkerMaterial
      touch2Marker.layerMask = 0x20000000
      touch2Marker.visibility = 0.6
      touch2Marker.outlineColor = Color3.Gray()
      touch2Marker.outlineWidth = 0.1
      touch2Marker.renderOutline = true
      const touch2Button = this._addDebugButton(2, adt)

      const startTouch1Marker = MeshBuilder.CreateSphere('startTouch1marker', { diameter }, scene)
      startTouch1Marker.material = touch1MarkerMaterial
      startTouch1Marker.visibility = 0.4
      startTouch1Marker.layerMask = 0x20000000

      const startTouch2Marker = MeshBuilder.CreateSphere('startTouch2marker', { diameter }, scene)
      startTouch2Marker.material = touch2MarkerMaterial
      startTouch2Marker.visibility = 0.4
      startTouch2Marker.layerMask = 0x20000000

      const mapValue = (value: number, x1: number, y1: number, x2: number, y2: number) => ((value - x1) * (y2 - x2)) / (y1 - x1) + x2
      const renderWidth = engine.getRenderWidth()
      const renderHeight = engine.getRenderHeight()
      // let angleMarker: Mesh | null = null

      // const angleMarkerMaterial = new StandardMaterial('angleMarkerMaterial', scene)
      // angleMarkerMaterial.emissiveColor = Color3.Yellow()
      // angleMarkerMaterial.alpha = 0.1

      scene.onBeforeRenderObservable.add(() => {
        if (this._debugCamera) {
          // DEBUG MARKERS
          const rw = 22
          const rh = 12

          // if (angleMarker) {
          //   angleMarker.dispose()
          // }
          // angleMarker = MeshBuilder.CreateDisc(
          //   'angleMarker',
          //   { radius: this._oldInfo.distance / 100, tessellation: 180, arc: (Math.PI * 2) / this._oldInfo.angle },
          //   scene
          // )
          // angleMarker.position = centerMarker.position
          // angleMarker.material = angleMarkerMaterial
          // angleMarker.layerMask = 0x20000000

          if (touch1Button.textBlock) {
            touch1Button.textBlock.text = `[${this._oldPointer0.x}, ${this._oldPointer0.y}]`
          }
          touch1Button.leftInPixels = this._oldPointer0.x - renderWidth / 2
          touch1Button.topInPixels = this._oldPointer0.y - renderHeight / 2 - 50

          if (touch2Button.textBlock) {
            touch2Button.textBlock.text = `[${this._oldPointer1.x}, ${this._oldPointer1.y}]`
          }
          touch2Button.leftInPixels = this._oldPointer1.x - renderWidth / 2
          touch2Button.topInPixels = this._oldPointer1.y - renderHeight / 2 - 60

          if (centerButton.textBlock) {
            centerButton.textBlock.text = `[${this._oldInfo.center.x}, ${this._oldInfo.center.y}] (${this._oldInfo.deltaAngle.toPrecision(4)} rad)`
          }
          centerButton.leftInPixels = this._oldInfo.center.x - renderWidth / 2
          centerButton.topInPixels = this._oldInfo.center.y - renderHeight / 2 - 60

          let x = mapValue(this._oldPointer0.x, 0, renderWidth, -rw, rw)
          let y = mapValue(this._oldPointer0.y, 0, renderHeight, rh, -rh)
          touch1Marker.position.x = x
          touch1Marker.position.y = y
          touch1Marker.position.z = 0

          x = mapValue(this._oldPointer1.x, 0, renderWidth, -rw, rw)
          y = mapValue(this._oldPointer1.y, 0, renderHeight, rh, -rh)
          touch2Marker.position.x = x
          touch2Marker.position.y = y
          touch2Marker.position.z = 0

          x = mapValue(this._startPointer0.x, 0, renderWidth, -rw, rw)
          y = mapValue(this._startPointer0.y, 0, renderHeight, rh, -rh)
          startTouch1Marker.position.x = x
          startTouch1Marker.position.y = y
          startTouch1Marker.position.z = 0

          x = mapValue(this._startPointer1.x, 0, renderWidth, -rw, rw)
          y = mapValue(this._startPointer1.y, 0, renderHeight, rh, -rh)
          startTouch2Marker.position.x = x
          startTouch2Marker.position.y = y
          startTouch2Marker.position.z = 0

          if (this._oldInfo.distance < 1) {
            touch2Marker.isVisible = false
            touch2Button.isVisible = false

            centerMarker.isVisible = false
            centerButton.isVisible = false
          } else {
            touch2Marker.isVisible = true
            touch2Button.isVisible = true

            centerMarker.isVisible = true
            centerButton.isVisible = true
          }
          x = mapValue(this._oldInfo.center.x, 0, renderWidth, -rw, rw)
          y = mapValue(this._oldInfo.center.y, 0, renderHeight, rh, -rh)
          centerMarker.position.x = x
          centerMarker.position.y = y
          centerMarker.position.z = 0

          debugLineOptions.points[0].x = touch1Marker.position.x
          debugLineOptions.points[0].y = touch1Marker.position.y
          debugLineOptions.points[1].x = touch2Marker.position.x
          debugLineOptions.points[1].y = touch2Marker.position.y

          debugLineOptions.instance = lines

          lines = MeshBuilder.CreateLines('debugLines', debugLineOptions)
          lines.layerMask = 0x20000000
        }
      })
    }

    // DEBUG markers

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

    manager.on('panstart', e => {
      if (isRotating || isBetaPanning) {
        return
      }

      // console.log('panstart')
      this._oldPointer0 = { x: e.pointers[0].clientX, y: e.pointers[0].clientY, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }
      this._oldPointer1 = { x: e.pointers[0].clientX, y: e.pointers[0].clientY, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }
      this._startPointer0 = { x: e.pointers[0].clientX, y: e.pointers[0].clientY, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }
      this._startPointer1 = { x: e.pointers[0].clientX, y: e.pointers[0].clientY, deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }
      const info = getCenterAngleDistance(this._startPointer0, this._startPointer1)
      this._oldInfo = { ...info }
      this._startInfo = { ...info }

      isPanning = true
      startCenterX = e.pointers[0].clientX
      startCenterY = e.pointers[0].clientY

      startPosition = this.camera.position.clone()
      startTarget = this.camera.target.clone()
    })

    manager.on('pan', e => {
      if (isRotating || isBetaPanning) {
        return
      }
      const dx = -(startCenterX - e.pointers[0].clientX) * this.xPanningRatio
      const dy = (startCenterY - e.pointers[0].clientY) * this.zPanningRatio
      panMove(dx, dy)

      this._oldPointer0.x = e.pointers[0].clientX
      this._oldPointer0.y = e.pointers[0].clientY

      this._oldPointer1.x = e.pointers[0].clientX
      this._oldPointer1.y = e.pointers[0].clientY
    })

    manager.on('panend', e => {
      // console.log('panend')
      isPanning = false
    })

    manager.on('rotateend', e => {
      // console.log('rotateend')

      setTimeout(() => {
        isRotating = false
        isBetaPanning = false
      }, 1000)
    })

    manager.on('rotatestart', e => {
      manager.get('pan').set({ enable: false })
      if (isRotating || isBetaPanning || isPanning) {
        return
      }
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

      this._oldInfo = {
        center: new Vector2(),
        deltaCenter: new Vector2(),
        angle: 0,
        deltaAngle: 0,
        distance: 0,
        deltaDistance: 0
      }

      this._startInfo = {
        center: new Vector2(),
        deltaCenter: new Vector2(),
        angle: 0,
        deltaAngle: 0,
        distance: 0,
        deltaDistance: 0
      }

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

      this._startInfo = { ...info }

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
        if (p0.y === p1.y && p0.x > p1.x) {
          addAngle = -Math.PI
        }
        if (p0.y === p1.y && p0.x < p1.x) {
          addAngle = Math.PI
        }

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

      const deltaAngle = info.deltaAngle + addAngle

      if (!isBetaPanning) {
        this.camera.alpha = startAlpha + deltaAngle / 2
        panMove(info.deltaCenter.x / 20, info.deltaCenter.y / 20)

        this.camera.radius = startRadius + info.deltaDistance / 10
      } else {
        this.camera.beta = startBeta + info.deltaCenter.y / 400
      }

      // console.log(
      //   'startAlpha',
      //   (startAlpha * 180) / Math.PI,
      //   'startInfo.angle',
      //   (this._startInfo.angle * 180) / Math.PI,
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
      //   firstTouchLow,
      //   'distance',
      //   info.distance
      // )

      this._oldPointer0.x = e.pointers[0].clientX
      this._oldPointer0.y = e.pointers[0].clientY

      this._oldPointer1.x = e.pointers[1].clientX
      this._oldPointer1.y = e.pointers[1].clientY

      this._oldInfo = { ...info }
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
      const deltaDistance = this._startInfo.distance - distance
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
      const deltaCenter = new Vector2(center.x - this._startInfo.center.x, this._startInfo.center.y - center.y)

      const angle = Math.atan(touchWidth / touchHeight)

      const deltaAngle = this._startInfo.angle - angle
      const distance = Math.sqrt(touchWidth * touchWidth + touchHeight * touchHeight)
      const deltaDistance = this._startInfo.distance - distance

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
  public getSimpleName(): string {}

  public checkInputs() {
    // this.camera.inertialRadiusOffset = -0.1
  }

  private _addDebugButton(i: number, adt: AdvancedDynamicTexture) {
    const btn = Button.CreateSimpleButton(`btn${i}`, `button-${i}`)
    btn.widthInPixels = 80
    btn.heightInPixels = 32

    btn.color = '#fff'
    btn.fontWeight = '300'
    btn.fontSizeInPixels = 10
    btn.background = '#000'
    btn.alpha = 0.9
    btn.cornerRadius = 4
    btn.thickness = 0
    btn.alpha = 0.7

    // this._buttons.push(btn)

    // const line = new GUI.Line()
    // line.name = `line_${i}`
    // line.lineWidth = 4
    // line.color = '#444'
    // line.connectedControl = btn
    // adt.addControl(line)

    // line.y2 = 0
    // line.linkOffsetY = 0
    // line.linkOffsetX = 0
    // line.dash = [3, 3]

    adt.addControl(btn)

    return btn
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
;(<any>CameraInputTypes)['ArcrotateCameraHammerJsInput'] = ArcRotateCameraHammerJsInput
