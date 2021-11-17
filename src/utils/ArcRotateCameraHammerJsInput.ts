/**
 * Google Earth like touch camera controls
 */

// TODO: make configurable
// TODO: tide up properties
// TODO: DRY
// TODO: angle debug indicator
// TODO: remove hammerjs dependency

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
  MeshBuilder,
  Nullable,
  Observer,
  Scene,
  StandardMaterial,
  Vector2,
  Vector3
} from '@babylonjs/core'
import { AdvancedDynamicTexture, Button } from '@babylonjs/gui'
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
  private _manager?: HammerManager

  //
  private _p0?: TouchInfo
  private _p1?: TouchInfo
  private _info?: DoubleTouchInfo

  private _startPointer0: TouchInfo
  private _oldPointer0: TouchInfo

  private _startPointer1: TouchInfo
  private _oldPointer1: TouchInfo

  private _startInfo: DoubleTouchInfo
  private _oldInfo: DoubleTouchInfo

  private _startPosition = Vector3.Zero()
  private _startTarget = Vector3.Zero()

  private _startCenterX = 0
  private _startCenterY = 0

  private _startAlpha = 0
  private _startBeta = 0

  private _startRadius = 0

  private _isTilting = false
  private _isPanning = false
  private _isRotating = false

  private _firstTouchLow = false

  private _debugCamera?: ArcRotateCamera
  private _debugObserver: Nullable<Observer<Scene>> = null
  private _gui?: AdvancedDynamicTexture

  /**
   * Manage the mouse inputs to control the movement of a free camera.
   * @see https://doc.babylonjs.com/how_to/customizing_camera_inputs
   * @param touchEnabled Defines if touch is enabled or not
   */
  constructor(
    /**
     * Define if touch is enabled in the mouse input
     */
    public panTresholdInPixels = 40,
    public rotateTresholdInPixels = 0,
    public xPanningRatioSingleTouch = 0.03,
    public zPanningRatioSingleTouch = 0.06,
    public xPanningRatio = 0.06,
    public zPanningRatio = 0.06,
    public zoomRatio = 0.14,
    public alphaRotationRation = 0.06,
    public betaRotationRation = 0.002,

    public singleTouchDisabledPeriodAfterDoubleTouch = 300, // ms

    public tiltTouchDistanceTresholdInPixelsX = 50,
    public tiltTouchDistanceTresholdInPixelsY = 70
  ) {
    this._oldPointer0 = ArcRotateCameraHammerJsInput._InitPointerInfo()
    this._startPointer0 = ArcRotateCameraHammerJsInput._InitPointerInfo()

    this._oldPointer1 = ArcRotateCameraHammerJsInput._InitPointerInfo()
    this._startPointer1 = ArcRotateCameraHammerJsInput._InitPointerInfo()

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

  private static _InitPointerInfo(x = 0, y = 0) {
    return {
      x,
      y,
      deltaCenter: new Vector2(),
      distance: 0,
      deltaDistance: 0
    }
  }

  private _setOldPointersInfo(pointer0: any, pointer1: any) {
    this._oldPointer0 = ArcRotateCameraHammerJsInput._InitPointerInfo(pointer0.clientX, pointer0.clientY)
    this._oldPointer1 = ArcRotateCameraHammerJsInput._InitPointerInfo(pointer1.clientX, pointer1.clientY)
  }
  private _setStartPointersInfo(pointer0: any, pointer1: any) {
    this._startPointer0 = ArcRotateCameraHammerJsInput._InitPointerInfo(pointer0.clientX, pointer0.clientY)
    this._startPointer1 = ArcRotateCameraHammerJsInput._InitPointerInfo(pointer1.clientX, pointer1.clientY)
  }
  private _setPointersInfo(pointer0: any, pointer1: any) {
    this._setOldPointersInfo(pointer0, pointer1)
    this._setStartPointersInfo(pointer0, pointer1)
  }

  public enableInputs() {
    if (this._manager) {
      this._manager.get('pan').set({ enable: true })
      this._manager.get('rotate').set({ enable: true })
    }
  }

  public disableInputs() {
    if (this._manager) {
      this._manager.get('pan').set({ enable: false })
      this._manager.get('rotate').set({ enable: false })
    }
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

    const rotate = new Hammer.Rotate({ threshold: this.rotateTresholdInPixels })
    const pan = new Hammer.Pan({ threshold: this.panTresholdInPixels })

    manager.add(rotate)
    manager.add(pan)

    this._startPosition = Vector3.Zero()
    this._startTarget = Vector3.Zero()

    this._startCenterX = 0
    this._startCenterY = 0

    this._startAlpha = 0
    this._startBeta = 0

    this._startRadius = 0

    this._isTilting = false
    this._isPanning = false
    this._isRotating = false

    this._firstTouchLow = false

    //

    manager.on('panstart', e => {
      if (this._isRotating || this._isTilting) {
        return
      }

      console.log('panstart')
      this._setPointersInfo(e.pointers[0], e.pointers[0])

      const info = getCenterAngleDistance(this._startPointer0, this._startPointer1)
      this._oldInfo = { ...info }
      this._startInfo = { ...info }

      this._isPanning = true
      this._startCenterX = e.pointers[0].clientX
      this._startCenterY = e.pointers[0].clientY

      this._startPosition = this.camera.position.clone()
      this._startTarget = this.camera.target.clone()
    })

    manager.on('pan', e => {
      if (this._isRotating || this._isTilting) {
        return
      }

      const dx = -(this._startCenterX - e.pointers[0].clientX)
      const dy = this._startCenterY - e.pointers[0].clientY
      panMove(dx * this.xPanningRatioSingleTouch, dy * this.zPanningRatioSingleTouch)

      this._oldPointer0.x = e.pointers[0].clientX
      this._oldPointer0.y = e.pointers[0].clientY
      this._oldPointer0.deltaCenter.copyFromFloats(dx, dy)

      this._oldPointer1.x = e.pointers[0].clientX
      this._oldPointer1.y = e.pointers[0].clientY
      this._oldPointer0.deltaCenter.copyFromFloats(dx, dy)
    })

    manager.on('panend', e => {
      console.log('panend')
      this._isPanning = false
    })

    manager.on('rotateend', e => {
      console.log('rotateend')

      // manager.get('pan').set({ enable: true })
      setTimeout(() => {
        this._isRotating = false
        this._isTilting = false
      }, this.singleTouchDisabledPeriodAfterDoubleTouch)
    })

    manager.on('rotatestart', e => {
      // manager.get('pan').set({ enable: false })
      // if (isRotating || isBetaPanning || isPanning) {
      //   return
      // }
      console.log('rotatestart')

      this._isRotating = true

      const sy0 = e.pointers[0].clientY
      const sy1 = e.pointers[1].clientY
      if (sy0 > sy1) {
        this._firstTouchLow = true
      } else {
        this._firstTouchLow = false
      }

      this._setPointersInfo(e.pointers[0], e.pointers[1])

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

      if (
        Math.abs(this._startPointer0.y - this._startPointer1.y) < this.tiltTouchDistanceTresholdInPixelsY &&
        Math.abs(this._startPointer0.x - this._startPointer1.x) > this.tiltTouchDistanceTresholdInPixelsX
      ) {
        this._isTilting = true
      } else {
        this._isTilting = false
      }
      this._startPosition = this.camera.position.clone()
      this._startTarget = this.camera.target.clone()

      this._info = getCenterAngleDistance(this._startPointer0, this._startPointer1)

      this._startInfo = { ...this._info }

      //

      this._startAlpha = this.camera.alpha
      this._startBeta = this.camera.beta
      this._startRadius = this.camera.radius
    })

    manager.on('rotate', e => {
      this._p0 = processPointer(e.pointers[0], this._oldPointer0, this._startPointer0)
      this._p1 = processPointer(e.pointers[1], this._oldPointer1, this._startPointer1)
      const info = getCenterAngleDistance(this._p0, this._p1)

      if (!this._isTilting) {
        panMove(info.deltaCenter.x * this.xPanningRatio, info.deltaCenter.y * this.zPanningRatio)
        this.camera.radius = this._startRadius + info.deltaDistance * this.zoomRatio
        this.camera.alpha = this._startAlpha + info.deltaAngle
      } else {
        this.camera.beta = this._startBeta + info.deltaCenter.y * this.betaRotationRation
      }

      this._oldPointer0.x = e.pointers[0].clientX
      this._oldPointer0.y = e.pointers[0].clientY
      this._oldPointer0.deltaCenter.copyFromFloats(this._oldPointer0.x - this._startPointer0.x, this._oldPointer0.y - this._startPointer0.y)

      this._oldPointer1.x = e.pointers[1].clientX
      this._oldPointer1.y = e.pointers[1].clientY
      this._oldPointer1.deltaCenter.copyFromFloats(this._oldPointer1.x - this._startPointer1.x, this._oldPointer1.y - this._startPointer1.y)

      this._oldInfo = { ...info }
    })

    const panMove = (dx: number, dy: number) => {
      // rotate the position according to camera.alpha
      const alpha = this.camera.alpha - Math.PI / 2
      const c = Math.cos(alpha)
      const s = Math.sin(alpha)
      const x1 = dx
      const y1 = dy
      const x2 = c * x1 - s * y1
      const y2 = s * x1 + c * y1

      this.camera.position.x = this._startPosition.x + x2
      this.camera.position.z = this._startPosition.z + y2

      this.camera.target.x = this._startTarget.x + x2
      this.camera.target.z = this._startTarget.z + y2
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

      let angle = Math.atan2(touchHeight, touchWidth) // range (-PI, PI]
      if (angle < 0) {
        angle = Math.PI * 2 + angle // range [0, 2PI)
      }
      angle -= Math.PI / 2 //shift by 90deg
      if (angle < 0) angle += 2 * Math.PI
      if (angle < 0) angle += 2 * Math.PI
      angle = Math.abs(Math.PI * 2 - angle) //invert rotation

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
    this._disposeDebug()
    //
  }

  /**
   * Gets the class name of the current input.
   * @returns the class name
   */
  public getClassName(): string {
    return 'ArcRotateCameraHammerJsInput'
  }

  /**
   * Get the friendly name associated with the input class.
   * @returns the input friendly name
   */
  public getSimpleName(): string {
    return 'ArcRotateCameraHammerJsInput'
  }

  public checkInputs() {
    //
  }

  // DEBUG STUFF - can be left out

  public setDebugMode(enable: boolean) {
    if (enable) {
      this._createDebug()
    } else {
      this._disposeDebug()
    }
  }

  private _createDebug() {
    const scene = this.camera.getScene()
    const engine = scene.getEngine()

    if (scene.activeCameras) {
      if (scene.activeCameras?.length === 0 && scene.activeCamera) {
        scene.activeCameras.push(scene.activeCamera)
      }

      const adt = AdvancedDynamicTexture.CreateFullscreenUI('debug', true, scene)
      this._gui = adt

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
      const centerButton = this._addDebugButton(0, adt, 3)

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
      const touch1Button = this._addDebugButton(1, adt, 2)

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
      const touch2Button = this._addDebugButton(2, adt, 2)

      const startTouch1Marker = MeshBuilder.CreateSphere('startTouch1marker', { diameter: diameter * 1.5 }, scene)
      startTouch1Marker.material = touch1MarkerMaterial
      startTouch1Marker.visibility = 0.4
      startTouch1Marker.layerMask = 0x20000000

      const startTouch2Marker = MeshBuilder.CreateSphere('startTouch2marker', { diameter: diameter * 1.5 }, scene)
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

      this._debugObserver = scene.onBeforeRenderObservable.add(() => {
        if (this._debugCamera) {
          if (this._info && this._p0 && this._p1) {
            console.log(
              'startAlpha',
              (this._startAlpha * 180) / Math.PI,
              'startInfo.angle',
              (this._startInfo.angle * 180) / Math.PI,
              'info.angle',
              (this._info.angle * 180) / Math.PI,
              'info.deltaAngle',
              (this._info.deltaAngle * 180) / Math.PI,
              'camera.alpha',
              (this.camera.alpha * 180) / Math.PI,
              'info.deltaCenter.x',
              this._info.deltaCenter.x,
              'info.deltaCenter.y',
              this._info.deltaCenter.y,
              'p0',
              this._p0.x,
              this._p0.y,
              'p1',
              this._p1.x,
              this._p1.y,
              'firstTouchLow',
              this._firstTouchLow,
              'distance',
              this._info.distance
            )
          }

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
            touch1Button.textBlock.text = `${this._oldPointer0.x}, ${this._oldPointer0.y}\nΔ ${this._oldPointer0.deltaCenter.x}, ${this._oldPointer0.deltaCenter.y}`
          }
          touch1Button.leftInPixels = this._oldPointer0.x - renderWidth / 2
          touch1Button.topInPixels = this._oldPointer0.y - renderHeight / 2 - 50

          if (touch2Button.textBlock) {
            touch2Button.textBlock.text = `${this._oldPointer1.x}, ${this._oldPointer1.y}\nΔ ${this._oldPointer1.deltaCenter.x}, ${this._oldPointer1.deltaCenter.y}`
          }
          touch2Button.leftInPixels = this._oldPointer1.x - renderWidth / 2
          touch2Button.topInPixels = this._oldPointer1.y - renderHeight / 2 - 60

          if (centerButton.textBlock) {
            centerButton.textBlock.text = `${this._oldInfo.center.x}, ${this._oldInfo.center.y}\nΔ rad ${this._oldInfo.deltaAngle.toPrecision(
              4
            )}\nrad ${this._oldInfo.angle.toPrecision(4)}`
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
            startTouch2Marker.isVisible = false

            touch2Marker.isVisible = false
            touch2Button.isVisible = false

            centerMarker.isVisible = false
            centerButton.isVisible = false
          } else {
            startTouch2Marker.isVisible = true

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
  }

  private _disposeDebug() {
    const scene = this.camera.getScene()
    const debugCamera = scene.getCameraByName('debugCamera')
    debugCamera?.dispose()

    this._gui?.dispose()

    scene.getMeshByName('debugLines')?.dispose()
    scene.getMeshByName('touch1marker')?.dispose()
    scene.getMeshByName('touch2marker')?.dispose()
    scene.getMeshByName('startTouch1marker')?.dispose()
    scene.getMeshByName('startTouch2marker')?.dispose()
    scene.getMeshByName('debugLines')?.dispose()

    scene.getMaterialByName('touch1MarkerMaterial')?.dispose()
    scene.getMaterialByName('touch2MarkerMaterial')?.dispose()

    if (this._debugObserver) {
      scene.onBeforeRenderObservable.remove(this._debugObserver)
    }
  }

  private _addDebugButton(i: number, adt: AdvancedDynamicTexture, lineCount = 1) {
    const btn = Button.CreateSimpleButton(`btn${i}`, `button-${i}`)
    btn.widthInPixels = 100
    btn.heightInPixels = 32 + (lineCount - 1) * 20

    btn.color = '#fff'
    btn.fontWeight = '300'
    btn.fontSizeInPixels = 11
    btn.background = '#000'
    btn.alpha = 0.9
    btn.cornerRadius = 4
    btn.thickness = 0
    btn.alpha = 0.7
    if (btn.textBlock) {
      btn.textBlock.textWrapping = false
    }

    adt.addControl(btn)

    return btn
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
;(<any>CameraInputTypes)['ArcRotateCameraHammerJsInput'] = ArcRotateCameraHammerJsInput
