/**
 * Google Earth like touch camera controls
 */

// TODO: remove camera dependecy & make observable
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
  Engine,
  FreeCamera,
  ICameraInput,
  LinesMesh,
  MeshBuilder,
  Nullable,
  Observer,
  Scalar,
  Scene,
  Space,
  StandardMaterial,
  TransformNode,
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
  quadrant: number
}

interface TouchInfo {
  x: number
  y: number
  deltaCenter: Vector2
  distance: number
  deltaDistance: number
}

export interface HammerJsInputInfo {
  targetPosition: Vector3
  targetTarget: Vector3
  targetAlpha: number
  targetBeta: number
  targetRadius: number
  startInfo: DoubleTouchInfo
  oldInfo: DoubleTouchInfo
  info?: DoubleTouchInfo
  startAlpha: number
  p0?: TouchInfo
  p1?: TouchInfo
  firstTouchLow: boolean
  targetTransform: TransformNode
  positionTransform: TransformNode
}

export class HammerJsInput {
  private _manager?: HammerManager

  //
  private _p0?: TouchInfo
  private _p1?: TouchInfo
  private _info?: DoubleTouchInfo

  private _shiftAngle = 0

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

  private _targetAlpha = 0
  private _targetBeta = 0
  private _targetRadius = 0
  private _targetPosition = new Vector3()
  private _targetTarget = new Vector3()

  private _firstTouchLow = false

  private _debugToConsole = false
  private _debugCamera?: ArcRotateCamera
  private _debugScene?: Scene
  private _debugObserver: Nullable<Observer<Scene>> = null
  private _gui?: AdvancedDynamicTexture

  private _targetTransform: TransformNode
  private _positionTransform: TransformNode

  private _panRequired = false
  private _zoomRequired = false
  private _tiltRequired = false
  private _rotationRequired = false

  private _quadrantCrossingCounter = 0
  constructor(
    public positionPosition: Vector3,
    public targetPosition: Vector3,
    public rotation: Vector3,
    public inputDistance = 0,
    public onEvent: (info: HammerJsInputInfo) => void,

    public panTresholdInPixels = 10,
    public rotateTresholdInPixels = 0,
    public xPanningRatioSingleTouch = 0.06,
    public zPanningRatioSingleTouch = 0.06,
    public xPanningRatio = 0.06,
    public zPanningRatio = 0.06,
    public zoomRatio = 0.14,
    public rotationRatio = 0.6,
    public tiltRatio = 0.002,

    public rotateLerpFactor = 0.05,
    public tiltLerpFactor = 0.05,
    public zoomLerpFactor = 0.1,
    public panLerpFactor = 0.07,

    public distancePanInfluence = 1.0,
    public distanceRotationInfluence = 1.0,
    public distanceZoomInfluence = 1.0,

    public singleTouchDisabledPeriodAfterDoubleTouch = 300, // ms

    public tiltTouchDistanceTresholdInPixelsX = 50,
    public tiltTouchDistanceTresholdInPixelsY = 70,
    public disablePan = false,
    public disableTilt = false,
    public disableZoom = false,
    public disableRotation = false
  ) {
    this._targetTransform = new TransformNode('targetTransform')
    this._targetTransform.position = targetPosition
    this._targetTransform.rotation.y = rotation.y
    this._targetTransform.rotation.x = rotation.x

    this._positionTransform = new TransformNode('positionTransform')
    this._positionTransform.parent = this._targetTransform
    this._positionTransform.position = positionPosition

    this._oldPointer0 = HammerJsInput._InitPointerInfo()
    this._startPointer0 = HammerJsInput._InitPointerInfo()

    this._oldPointer1 = HammerJsInput._InitPointerInfo()
    this._startPointer1 = HammerJsInput._InitPointerInfo()

    this._oldInfo = {
      center: new Vector2(),
      deltaCenter: new Vector2(),
      angle: 0,
      deltaAngle: 0,
      distance: 0,
      deltaDistance: 0,
      quadrant: 0
    }

    this._startInfo = {
      center: new Vector2(),
      deltaCenter: new Vector2(),
      angle: 0,
      deltaAngle: 0,
      distance: 0,
      deltaDistance: 0,
      quadrant: 0
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
    this._oldPointer0 = HammerJsInput._InitPointerInfo(pointer0.clientX, pointer0.clientY)
    this._oldPointer1 = HammerJsInput._InitPointerInfo(pointer1.clientX, pointer1.clientY)
  }
  private _setStartPointersInfo(pointer0: any, pointer1: any) {
    this._startPointer0 = HammerJsInput._InitPointerInfo(pointer0.clientX, pointer0.clientY)
    this._startPointer1 = HammerJsInput._InitPointerInfo(pointer1.clientX, pointer1.clientY)
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

  public attachControl(attachTo: HTMLCanvasElement | Engine | Scene): void {
    let canvas: HTMLCanvasElement | null
    if (attachTo instanceof Scene) {
      canvas = attachTo.getEngine().getRenderingCanvas()
    } else if (attachTo instanceof Engine) {
      canvas = attachTo.getRenderingCanvas()
    } else {
      canvas = attachTo
    }

    if (!canvas) {
      console.warn('Unable to attach controls. No canvas found.')
      return
    }

    const manager = new Hammer.Manager(canvas)

    const rotate = new Hammer.Rotate({ threshold: this.rotateTresholdInPixels })
    const pan = new Hammer.Pan({ threshold: this.panTresholdInPixels })

    manager.add(pan)
    manager.add(rotate)

    let oldPointersLength = 0
    manager.on('hammer.input', (e: HammerInput) => {
      // console.log(e.pointers.length)
      if (e.pointers.length === 2) {
        manager.get('pan').set({ enable: false })
        this._isRotating = true
      }
      if (e.pointers.length === 0 && oldPointersLength === 2) {
        setTimeout(() => {
          manager.get('pan').set({ enable: true })
          this._isRotating = false
          this._isTilting = false
        }, this.singleTouchDisabledPeriodAfterDoubleTouch)
      }
      if (e.pointers.length === 1 && e.isFinal) {
        setTimeout(() => {
          manager.get('pan').set({ enable: true })
          this._isRotating = false
          this._isTilting = false
        }, this.singleTouchDisabledPeriodAfterDoubleTouch)
      }
      oldPointersLength = e.pointers.length
    })

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
    this._targetAlpha = this.rotation.y
    this._targetBeta = this.rotation.x
    this._targetRadius = this.inputDistance
    this._targetPosition = this.positionPosition.clone()
    this._targetTarget = this.targetPosition.clone()
    //

    manager.on('panstart', e => this._panStart(e))
    manager.on('pan', e => this._pan(e))
    manager.on('panend', e => this._panEnd(e))

    manager.on('rotatestart', e => this._rotateStart(e))
    manager.on('rotate', e => this._rotate(e))
    manager.on('rotateend', e => this._rotateEnd(e))
  }

  private _panMove(dx: number, dy: number) {
    // rotate the position according to inputRotationAlpha
    const alpha = this._targetTransform.rotation.y
    const c = Math.cos(alpha)
    const s = Math.sin(alpha)
    const x1 = dx
    const y1 = dy
    const x2 = c * x1 - s * y1
    const y2 = s * x1 + c * y1

    // this._targetTransform.position.x = this._startTarget.x + x2
    // this._targetTransform.position.z = this._startTarget.y + y2

    // this._positionTransform.position.x = this._startPosition.x + x2
    // this._positionTransform.position.z = this._startPosition.y + y2

    this._targetTarget.x = this._startTarget.x + x2
    this._targetTarget.z = this._startTarget.y + y2

    this._targetPosition.x = this._startPosition.x + x2
    this._targetPosition.z = this._startPosition.y + y2
  }

  private _processPointer(e: PointerEvent, oldPointer: TouchInfo, startPointer: TouchInfo) {
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

  private _getCenterAngleDistance(p0: TouchInfo, p1: TouchInfo): DoubleTouchInfo {
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

    // TODO: calc this
    const quadrant =
      angle >= 0 && angle < Math.PI / 2
        ? 1
        : angle >= Math.PI / 2 && angle < Math.PI
        ? 2
        : angle >= Math.PI && angle < Math.PI * 1.5
        ? 3
        : angle >= Math.PI * 1.5 && angle < Math.PI * 2
        ? 4
        : 0

    if (this._oldInfo.quadrant !== quadrant) {
      const diff = quadrant - this._oldInfo.quadrant
      this._quadrantCrossingCounter += diff

      console.log(this._oldInfo.quadrant, '=>', quadrant)
    }
    if (this._firstTouchLow) {
      if ((this._oldInfo.quadrant === 0 || this._oldInfo.quadrant === 1) && quadrant === 4) {
        if (this._startInfo.quadrant === 1) {
          this._shiftAngle = Math.PI * 2
        }
        if (this._startInfo.quadrant === 4) {
          this._shiftAngle = 0
        }
      }
      if ((this._oldInfo.quadrant === 0 || this._oldInfo.quadrant === 4) && quadrant === 1) {
        if (this._startInfo.quadrant === 1) {
          this._shiftAngle = 0
        }
        if (this._startInfo.quadrant === 4) {
          this._shiftAngle = -Math.PI * 2
        }
      }
    } else {
      if ((this._oldInfo.quadrant === 0 || this._oldInfo.quadrant === 1) && quadrant === 4) {
        this._shiftAngle = Math.PI * 2
      }
      if ((this._oldInfo.quadrant === 0 || this._oldInfo.quadrant === 4) && quadrant === 1) {
        this._shiftAngle = 0
      }
    }

    const deltaAngle = this._startInfo.angle - angle + this._shiftAngle
    const distance = Math.sqrt(touchWidth * touchWidth + touchHeight * touchHeight)
    const deltaDistance = this._startInfo.distance - distance

    return {
      center,
      deltaCenter,
      angle,
      deltaAngle,
      distance,
      deltaDistance,
      quadrant
    }
  }

  private _getDistanceInfluenceRatio(influence: number) {
    const ratio = (this._startRadius - this._targetRadius) * influence
    return ratio
  }

  private _panStart(e: HammerInput) {
    if (this.disablePan) {
      return
    }

    console.log('panstart')
    if (this._isRotating || this._isTilting) {
      return
    }

    this._setPointersInfo(e.pointers[0], e.pointers[0])

    const info = this._getCenterAngleDistance(this._startPointer0, this._startPointer1)
    this._oldInfo = { ...info }
    this._startInfo = { ...info }

    this._isPanning = true
    this._startCenterX = e.pointers[0].clientX
    this._startCenterY = e.pointers[0].clientY

    this._startAlpha = this._targetTransform.rotation.x
    this._startBeta = this._targetTransform.rotation.y
    this._startRadius = this._positionTransform.position.subtract(this._targetTransform.position).length()

    this._startPosition = this._positionTransform.position.clone()
    this._startTarget = this._targetTransform.position.clone()
  }

  private _pan(e: HammerInput) {
    if (this.disablePan) {
      return
    }

    console.log('pan')
    if (this._isRotating || this._isTilting) {
      return
    }

    const dx = -(this._startCenterX - e.pointers[0].clientX)
    const dy = this._startCenterY - e.pointers[0].clientY
    this._panMove(dx * this.xPanningRatioSingleTouch, dy * this.zPanningRatioSingleTouch)
    this._panRequired = true
    this._rotationRequired = false

    this.onEvent(this.getInfo())

    this._oldPointer0.x = e.pointers[0].clientX
    this._oldPointer0.y = e.pointers[0].clientY
    this._oldPointer0.deltaCenter.copyFromFloats(dx, dy)

    this._oldPointer1.x = e.pointers[0].clientX
    this._oldPointer1.y = e.pointers[0].clientY
    this._oldPointer0.deltaCenter.copyFromFloats(dx, dy)
  }

  private _panEnd(e: HammerInput) {
    if (this.disablePan) {
      return
    }

    console.log('panend')
    this._isPanning = false
    this._isRotating = false
  }

  private _rotateStart(e: HammerInput) {
    // if (isRotating || isBetaPanning || isPanning) {
    //   return
    // }
    console.log('rotatestart')

    // this._isRotating = true

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
      deltaDistance: 0,
      quadrant: 0
    }

    this._startInfo = {
      center: new Vector2(),
      deltaCenter: new Vector2(),
      angle: 0,
      deltaAngle: 0,
      distance: 0,
      deltaDistance: 0,
      quadrant: 0
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
    this._startPosition = this.positionPosition.clone()
    this._startTarget = this.targetPosition.clone()

    this._info = this._getCenterAngleDistance(this._startPointer0, this._startPointer1)

    this._startInfo = { ...this._info }

    //

    // this._targetTransform.rotation.y = this._info.angle
    // this._targetTransform.position.z = this._startTarget.y + y2

    this._startAlpha = this._targetTransform.rotation.x
    this._startBeta = this._targetTransform.rotation.y
    this._startRadius = this._positionTransform.position.subtract(this._targetTransform.position).length()
  }

  private _rotate(e: HammerInput) {
    this._panRequired = false
    this._rotationRequired = true

    this._p0 = this._processPointer(e.pointers[0], this._oldPointer0, this._startPointer0)
    this._p1 = this._processPointer(e.pointers[1], this._oldPointer1, this._startPointer1)
    const info = this._getCenterAngleDistance(this._p0, this._p1)

    if (this._debugToConsole) {
      this._logInfoToConsole()
    }

    if (!this._isTilting) {
      if (!this.disableZoom) {
        this._targetRadius = this._startRadius + info.deltaDistance * this.zoomRatio
      }
      if (Math.abs(this._targetAlpha - (this._startAlpha - info.deltaAngle)) > Math.PI) {
        // debugger
      }
      if (!this.disableRotation) {
        this._targetAlpha = this.rotation.x - info.deltaAngle

        this._targetTransform.rotation.x = this._targetAlpha
      }

      if (!this.disablePan) {
        this._panMove(info.deltaCenter.x * this.xPanningRatio, info.deltaCenter.y * this.zPanningRatio)
      }
    } else {
      if (!this.disableTilt) {
        this._targetBeta = this._startBeta + info.deltaCenter.y * this.tiltRatio
        this._targetTransform.rotation.x = this._targetBeta
      }
    }

    this.onEvent(this.getInfo())

    this._oldPointer0.x = e.pointers[0].clientX
    this._oldPointer0.y = e.pointers[0].clientY
    this._oldPointer0.deltaCenter.copyFromFloats(this._oldPointer0.x - this._startPointer0.x, this._oldPointer0.y - this._startPointer0.y)

    this._oldPointer1.x = e.pointers[1].clientX
    this._oldPointer1.y = e.pointers[1].clientY
    this._oldPointer1.deltaCenter.copyFromFloats(this._oldPointer1.x - this._startPointer1.x, this._oldPointer1.y - this._startPointer1.y)

    this._oldInfo = { ...info }
  }
  private _rotateEnd(e: HammerInput) {
    console.log('rotateend')
    this._shiftAngle = 0
  }

  protected onContextMenu(evt: PointerEvent): void {
    evt.preventDefault()
  }

  public detachControl(): void {
    if (this._debugScene) {
      this._disposeDebug(this._debugScene)
    }
  }

  public getInfo() {
    const info: HammerJsInputInfo = {
      targetPosition: this._targetPosition,
      targetTarget: this._targetTarget,
      targetAlpha: this._targetAlpha,
      targetBeta: this._targetBeta,
      targetRadius: this._targetRadius,
      startInfo: this._startInfo,
      oldInfo: this._oldInfo,
      info: this._info,
      startAlpha: this._startAlpha,
      p0: this._p0,
      p1: this._p1,
      firstTouchLow: this._firstTouchLow,
      targetTransform: this._targetTransform,
      positionTransform: this._positionTransform
    }
    return info
  }

  // DEBUG STUFF - can be left out

  public setDebugMode(scene: Scene, enableGadgets: boolean, debugToConsole = true) {
    if (enableGadgets) {
      this._createDebug(scene)
    } else {
      this._disposeDebug(scene)
    }

    this._debugToConsole = debugToConsole
  }

  private _createDebug(scene: Scene) {
    this._debugScene = scene

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
      const centerButton = this._addDebugButton(0, adt, 5)

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

      this._debugObserver = scene.onBeforeRenderObservable.add(() => {
        if (this._debugCamera) {
          const rw = 22
          const rh = 12

          if (touch1Button.textBlock) {
            touch1Button.textBlock.text = `${this._oldPointer0.x}, ${this._oldPointer0.y}\nΔ ${this._oldPointer0.deltaCenter.x}, ${this._oldPointer0.deltaCenter.y}`
            // sbeta ${this._startBeta.toPrecision(3)}\ntbeta ${this._targetBeta.toPrecision(3)}\ncbeta ${this.inputRo.toPrecision(3)}`
          }
          touch1Button.leftInPixels = this._oldPointer0.x - renderWidth / 2
          touch1Button.topInPixels = this._oldPointer0.y - renderHeight / 2 - 50

          if (touch2Button.textBlock) {
            touch2Button.textBlock.text = `${this._oldPointer1.x}, ${this._oldPointer1.y}\nΔ ${this._oldPointer1.deltaCenter.x}, ${this._oldPointer1.deltaCenter.y}`
          }
          touch2Button.leftInPixels = this._oldPointer1.x - renderWidth / 2
          touch2Button.topInPixels = this._oldPointer1.y - renderHeight / 2 - 60

          if (centerButton.textBlock) {
            // ${this._oldInfo.center.x}, ${this._oldInfo.center.y}\n
            centerButton.textBlock.text = `srad ${this._startInfo.angle.toPrecision(3)}\nshift ${this._shiftAngle.toPrecision(
              3
            )}\nΔ rad ${this._oldInfo.deltaAngle.toPrecision(3)}\nrad ${this._oldInfo.angle.toPrecision(3)}\nalpha ${this.rotation.y.toPrecision(3)}\nq ${
              this._oldInfo.quadrant
            }`
            // centerButton.textBlock.text = `sbeta ${this._startBeta.toPrecision(3)}\ntbeta ${this._targetBeta.toPrecision(
            //   3
            // )}\ncbeta ${this.inputRo.toPrecision(3)}`
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

  private _disposeDebug(scene: Scene) {
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

  private _logInfoToConsole() {
    if (this._info) {
      // console.table([
      //   [
      //     'sAlpha',
      //     this._startAlpha,
      //     (this._startAlpha * 180) / Math.PI,
      //     'si.angle',
      //     this._startInfo.angle,
      //     (this._startInfo.angle * 180) / Math.PI,
      //     'i.angle',
      //     (this._info.angle * 180) / Math.PI,
      //     'i.deltaAngle',
      //     (this._info.deltaAngle * 180) / Math.PI,
      //     'c.alpha',
      //     (this.inputRotationAlpha * 180) / Math.PI,
      //     'i.dc.x',
      //     this._info.deltaCenter.x,
      //     'i.dc.y',
      //     this._info.deltaCenter.y,
      //     'p0',
      //     this._p0.x,
      //     this._p0.y,
      //     'p1',
      //     this._p1.x,
      //     this._p1.y,
      //     'firstTouchLow',
      //     this._firstTouchLow,
      //     'dist',
      //     this._info.distance
      //   ]
      // ])
      // console.table(debugData)

      console.log(
        'startAlpha',
        this._startAlpha,
        (this._startAlpha * 180) / Math.PI,
        'startInfo.angle',
        this._startInfo.angle,
        (this._startInfo.angle * 180) / Math.PI,
        'info.angle',
        this._info.angle,
        (this._info.angle * 180) / Math.PI,
        'info.deltaAngle',
        this._info.deltaAngle,
        (this._info.deltaAngle * 180) / Math.PI,
        'targetAlpha',
        this._targetAlpha,
        (this._targetAlpha * 180) / Math.PI,
        'inputRotationAlpha',
        this.rotation.y,
        (this.rotation.y * 180) / Math.PI,
        'info.deltaCenter.x',
        this._info.deltaCenter.x,
        'info.deltaCenter.y',
        this._info.deltaCenter.y,
        'p0',
        this._p0?.x,
        this._p0?.y,
        'p1',
        this._p1?.x,
        this._p1?.y,
        'firstTouchLow',
        this._firstTouchLow,
        'distance',
        this._info.distance
      )
    }
  }
}
