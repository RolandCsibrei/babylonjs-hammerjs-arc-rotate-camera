/**
 * Google Earth like touch camera controls
 */

// TODO: remove camera dependecy & make observable
// TODO: make configurable
// TODO: tide up properties
// TODO: remove hammerjs dependency

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ArcRotateCamera, CameraInputTypes, ICameraInput, Scalar, Vector2, Vector3 } from '@babylonjs/core'
import 'hammerjs'
import { TouchInputDebug } from './TouchInputDebug'

export interface TouchCameraInputInfo {
  targetPosition: Vector3
  targetTarget: Vector3
  targetAlpha: number
  targetBeta: number
  targetRadius: number
  startAlpha: number
  startBeta: number
  startRadius: number
  startPosition: Vector3
  startTarget: Vector3
  shiftAngle: number
  startDoubleTouchInfo: DoubleTouchInfo
  previousDoubleTouchInfo: DoubleTouchInfo
  doubleTouchInfo?: DoubleTouchInfo
  startTouchInfo0: TouchInfo
  startTocuhInfo1: TouchInfo
  previousTouchInfo0: TouchInfo
  previousTouchInfo1: TouchInfo
  touchInfo0?: TouchInfo
  touchInfo1?: TouchInfo
  firstTouchLow: boolean

  isTilting: boolean
  isPanning: boolean
  isRotating: boolean
  isZooming: boolean

  isFirst: boolean
  isFinal: boolean
}

interface DoubleTouchInfo {
  center: Vector2
  deltaCenter: Vector2
  angle: number
  deltaAngle: number
  distance: number
  deltaDistance: number
  quadrant: number
  shiftAngle: number
}

interface TouchInfo {
  x: number
  y: number
  deltaCenter: Vector2
  distance: number
  deltaDistance: number

  isFirst: boolean
  isFinal: boolean
}

export class ArcRotateCameraHammerJsInput implements ICameraInput<ArcRotateCamera> {
  public camera!: ArcRotateCamera
  private _manager?: HammerManager

  //
  private _p0?: TouchInfo
  private _p1?: TouchInfo
  private _info?: DoubleTouchInfo

  private _shiftAngle = 0

  private _startTouchInfo0: TouchInfo
  private _previousTouchInfo0: TouchInfo

  private _startTouchInfo1: TouchInfo
  private _previousTouchInfo1: TouchInfo

  private _startDoubleTouchInfo: DoubleTouchInfo
  private _previousDoubleTouchInfo: DoubleTouchInfo

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

  private _panRequired = false
  private _zoomRequired = false
  private _tiltRequired = false
  private _rotationRequired = false

  public panTresholdInPixels = 40
  public rotateTresholdInPixels = 0

  public xPanningRatioSingleTouch = 0.14
  public zPanningRatioSingleTouch = 0.18
  public xPanningRatio = 0.14 // double touch
  public zPanningRatio = 0.18 // double touch
  public zoomRatio = 0.14
  public rotationRatio = 0.06
  public tiltRatio = 0.002

  public singleTouchDisabledPeriodAfterDoubleTouch = 300 // ms

  public tiltTouchDistanceTresholdInPixelsX = 50
  public tiltTouchDistanceTresholdInPixelsY = 70
  public disablePan = false
  public disableTilt = false
  public disableZoom = false
  public disableRotation = false

  // in dev
  public rotateLerpFactor = 0.08
  public tiltLerpFactor = 0.08
  public zoomLerpFactor = 0.1
  public panLerpFactor = 0.03

  public distancePanInfluence = 1.0
  public distanceRotationInfluence = 1.0
  public distanceZoomInfluence = 1.0
  //

  private _touchInputDebug?: TouchInputDebug

  private _callback?: (info: TouchCameraInputInfo) => void

  constructor() {
    this._previousTouchInfo0 = ArcRotateCameraHammerJsInput._InitPointerInfo()
    this._previousTouchInfo1 = ArcRotateCameraHammerJsInput._InitPointerInfo()
    this._previousDoubleTouchInfo = ArcRotateCameraHammerJsInput._InitDoubleTouchInfo()

    this._startTouchInfo0 = ArcRotateCameraHammerJsInput._InitPointerInfo()
    this._startTouchInfo1 = ArcRotateCameraHammerJsInput._InitPointerInfo()
    this._startDoubleTouchInfo = ArcRotateCameraHammerJsInput._InitDoubleTouchInfo()
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
    const engine = this.camera.getEngine()
    const element = <EventTarget>engine.getInputElement()
    const manager = new Hammer.Manager(element)

    const rotate = new Hammer.Rotate({ threshold: this.rotateTresholdInPixels })
    const pan = new Hammer.Pan({ threshold: this.panTresholdInPixels })

    manager.add(pan)
    manager.add(rotate)

    // to prevent accidental touches after double touch
    let oldPointersLength = 0
    manager.on('hammer.input', (e: HammerInput) => {
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

    // init the start values
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

    // get the starting values for the camera and set as target
    this._targetAlpha = this.camera.alpha
    this._targetBeta = this.camera.beta
    this._targetRadius = this.camera.radius
    this._targetPosition = this.camera.position.clone()
    this._targetTarget = this.camera.target.clone()
    //

    const isLerping = false // for smooth movement, in dev

    const frames = 40
    this.camera.getScene().onBeforeRenderObservable.add(() => {
      if (isLerping) {
        const length = this._targetTarget.subtract(this.camera.target).length()
        const panLerpFactor = (length / frames) * this.panLerpFactor
        const alphaLerpFactor = (Math.abs(this._targetAlpha - this.camera.alpha) / frames) * this.rotateLerpFactor
        // const betaLerpFactor = (Math.abs(this._targetBeta - this.camera.beta) / frames) * this.tiltLerpFactor
        const lerpFactor = Math.max(panLerpFactor, alphaLerpFactor)

        const alpha = this._targetAlpha
        const beta = this._targetBeta
        const radius = this._targetRadius

        this.camera.target = Vector3.Lerp(this.camera.target, this._targetTarget, lerpFactor)
        this.camera.position = Vector3.Lerp(this.camera.position, this._targetPosition, lerpFactor)
        this.camera.alpha = Scalar.Lerp(this.camera.alpha, alpha, lerpFactor)
        this.camera.beta = Scalar.Lerp(this.camera.beta, beta, this.tiltLerpFactor)
        this.camera.radius = Scalar.Lerp(this.camera.radius, radius, this.zoomLerpFactor)
      } else {
        if (this._rotationRequired || this._zoomRequired || this._panRequired || this._tiltRequired) {
          this.camera.target = this._targetTarget
          this.camera.position = this._targetPosition
          this.camera.alpha = this._targetAlpha
          this.camera.beta = this._targetBeta
          this.camera.radius = this._targetRadius
        }
      }
    })

    // register hammerjs evenets
    manager.on('panstart', e => this._panStart(e))
    manager.on('pan', e => this._pan(e))
    manager.on('panend', e => this._panEnd(e))

    manager.on('rotatestart', e => this._rotateStart(e))
    manager.on('rotate', e => this._rotate(e))
    manager.on('rotateend', e => this._rotateEnd(e))
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
    if (this._touchInputDebug) {
      this._touchInputDebug.dispose()
    }
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

  public setCallback(callback: (info: TouchCameraInputInfo) => void) {
    this._callback = callback
  }

  public getInfo(isFirst?: boolean, isFinal?: boolean) {
    const info: TouchCameraInputInfo = {
      targetPosition: this._targetPosition,
      targetTarget: this._targetTarget,
      targetAlpha: this._targetAlpha,
      targetBeta: this._targetBeta,
      targetRadius: this._targetRadius,

      startAlpha: this._startAlpha,
      startBeta: this._startBeta,
      startRadius: this._startRadius,
      startPosition: this._startPosition,
      startTarget: this._startTarget,

      shiftAngle: this._shiftAngle,

      startDoubleTouchInfo: this._startDoubleTouchInfo,
      previousDoubleTouchInfo: this._previousDoubleTouchInfo,
      doubleTouchInfo: this._info,

      startTouchInfo0: this._startTouchInfo0,
      startTocuhInfo1: this._startTouchInfo1,
      previousTouchInfo0: this._previousTouchInfo0,
      previousTouchInfo1: this._previousTouchInfo1,
      touchInfo0: this._p0,
      touchInfo1: this._p1,

      firstTouchLow: this._firstTouchLow,

      isPanning: this._isPanning,
      isRotating: this._isRotating,
      isTilting: this._isTilting,
      isZooming: this._isRotating,

      isFirst: isFirst || this._p0?.isFirst || this._p1?.isFirst || false,
      isFinal: isFinal || this._p0?.isFinal || this._p1?.isFinal || false
    }
    return info
  }

  private _panStart(e: HammerInput) {
    if (this.disablePan) {
      return
    }

    if (this._isRotating || this._isTilting) {
      return
    }

    this._setPointersInfo(e.pointers[0], e.pointers[0])

    const info = this._getCenterAngleDistance(this._startTouchInfo0, this._startTouchInfo1)
    this._previousDoubleTouchInfo = { ...info }
    this._startDoubleTouchInfo = { ...info }

    this._isPanning = true
    this._startCenterX = e.pointers[0].clientX
    this._startCenterY = e.pointers[0].clientY

    this._startPosition = this.camera.position.clone()
    this._startTarget = this.camera.target.clone()
    this._startAlpha = this.camera.alpha
    this._startBeta = this.camera.beta
    this._startRadius = this.camera.radius
  }

  private _pan(e: HammerInput) {
    if (this.disablePan) {
      return
    }

    if (this._isRotating || this._isTilting) {
      return
    }

    const panDistanceInfluence = 1 // todo: this._getDistanceInfluenceRatio(0.03)

    const dx = -(this._startCenterX - e.pointers[0].clientX)
    const dy = this._startCenterY - e.pointers[0].clientY
    this._panMove(dx * this.xPanningRatioSingleTouch * panDistanceInfluence, dy * this.zPanningRatioSingleTouch * panDistanceInfluence)

    this._panRequired = true
    this._rotationRequired = false

    this._previousTouchInfo0.x = e.pointers[0].clientX
    this._previousTouchInfo0.y = e.pointers[0].clientY
    this._previousTouchInfo0.deltaCenter.copyFromFloats(dx, dy)

    this._previousTouchInfo1.x = e.pointers[0].clientX
    this._previousTouchInfo1.y = e.pointers[0].clientY
    this._previousTouchInfo1.deltaCenter.copyFromFloats(dx, dy)
  }

  private _panEnd(e: HammerInput) {
    if (this.disablePan) {
      return
    }

    this._isPanning = false
    this._isRotating = false

    this._rotateEnd(e)
  }

  private _rotateStart(e: HammerInput) {
    this._isRotating = true

    const sy0 = e.pointers[0].clientY
    const sy1 = e.pointers[1].clientY
    if (sy0 > sy1) {
      this._firstTouchLow = true
    } else {
      this._firstTouchLow = false
    }

    this._setPointersInfo(e.pointers[0], e.pointers[1])

    //

    if (
      Math.abs(this._startTouchInfo0.y - this._startTouchInfo1.y) < this.tiltTouchDistanceTresholdInPixelsY &&
      Math.abs(this._startTouchInfo0.x - this._startTouchInfo1.x) > this.tiltTouchDistanceTresholdInPixelsX
    ) {
      this._isTilting = true
    } else {
      this._isTilting = false
    }

    this._info = this._getCenterAngleDistance(this._startTouchInfo0, this._startTouchInfo1)

    this._startDoubleTouchInfo = { ...this._info }
    this._previousDoubleTouchInfo = { ...this._info }

    //

    this._startPosition = this.camera.position.clone()
    this._startTarget = this.camera.target.clone()
    this._startAlpha = this.camera.alpha
    this._startBeta = this.camera.beta
    this._startRadius = this.camera.radius

    //

    if (this._callback) {
      this._callback(this.getInfo(true, false))
    }
  }

  private _rotate(e: HammerInput) {
    this._rotationRequired = true

    this._p0 = this._processPointer(e.pointers[0], this._previousTouchInfo0, this._startTouchInfo0, e)
    this._p1 = this._processPointer(e.pointers[1], this._previousTouchInfo1, this._startTouchInfo1, e)
    const info = this._getCenterAngleDistance(this._p0, this._p1)

    if (!this._isTilting) {
      if (!this.disablePan) {
        this._panMove(info.deltaCenter.x * this.xPanningRatio, info.deltaCenter.y * this.zPanningRatio)
      }
      if (!this.disableZoom) {
        const distance = info.deltaDistance // this._getDistanceInfluenceRatio(0.02)
        this._targetRadius = this._startRadius + distance * this.zoomRatio
        this._targetRadius = Math.max(this._targetRadius, this.camera.lowerRadiusLimit ?? 0)
        this._targetRadius = Math.min(this._targetRadius, this.camera.upperRadiusLimit ?? 0)
      }
      if (Math.abs(this._targetAlpha - (this._startAlpha - info.deltaAngle)) > Math.PI) {
        info.deltaAngle = -Math.PI * 2
      }
      if (!this.disableRotation) {
        this._targetAlpha = this._startAlpha - info.deltaAngle
      }
    } else {
      if (!this.disableTilt) {
        this._targetBeta = this._startBeta + info.deltaCenter.y * this.tiltRatio
        this._targetBeta = Math.max(this._targetBeta, this.camera.lowerBetaLimit)
        this._targetBeta = Math.min(this._targetBeta, this.camera.upperBetaLimit)
      }
    }

    if (this._callback) {
      this._callback(this.getInfo(false, false))
    }

    this._previousTouchInfo0.x = e.pointers[0].clientX
    this._previousTouchInfo0.y = e.pointers[0].clientY
    this._previousTouchInfo0.deltaCenter.copyFromFloats(
      this._previousTouchInfo0.x - this._startTouchInfo0.x,
      this._previousTouchInfo0.y - this._startTouchInfo0.y
    )

    this._previousTouchInfo1.x = e.pointers[1].clientX
    this._previousTouchInfo1.y = e.pointers[1].clientY
    this._previousTouchInfo1.deltaCenter.copyFromFloats(
      this._previousTouchInfo1.x - this._startTouchInfo1.x,
      this._previousTouchInfo1.y - this._startTouchInfo1.y
    )

    this._previousDoubleTouchInfo = { ...info }
  }
  private _rotateEnd(e: HammerInput) {
    this._panRequired = false
    this._rotationRequired = false

    this._shiftAngle = 0

    if (this._callback) {
      this._callback(this.getInfo(false, true))
    }
  }

  private _panMove(dx: number, dy: number) {
    // rotate the position according to camera.alpha
    const alpha = this.camera.alpha - Math.PI / 2
    const c = Math.cos(alpha)
    const s = Math.sin(alpha)
    const x1 = dx
    const y1 = dy
    const x2 = c * x1 - s * y1
    const y2 = s * x1 + c * y1

    this._targetTarget.x = this._startTarget.x + x2
    this._targetTarget.z = this._startTarget.z + y2

    this._targetPosition.x = this._startPosition.x + x2
    this._targetPosition.z = this._startPosition.z + y2
  }

  private _processPointer(e: PointerEvent, oldPointer: TouchInfo, startPointer: TouchInfo, eh: HammerInput) {
    const dx = startPointer.x - e.clientX
    const dy = startPointer.y - e.clientY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const deltaDistance = this._startDoubleTouchInfo.distance - distance
    const touchInfo: TouchInfo = {
      x: e.clientX,
      y: e.clientY,
      deltaCenter: new Vector2(dx, dy),
      distance,
      deltaDistance,
      isFinal: eh.isFinal,
      isFirst: eh.isFirst
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
    const deltaCenter = new Vector2(center.x - this._startDoubleTouchInfo.center.x, this._startDoubleTouchInfo.center.y - center.y)

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

    // TODO: calc this
    // // Calculate the number of revolutions between the new and old alpha values.
    // const angleCorrectionTurns = Math.round(this._previousInfo.angle / (2.0 * Math.PI))
    // // Adjust alpha so that its numerical representation is the closest one to the old value.
    // angle += angleCorrectionTurns * 2.0 * Math.PI
    // // const quadrant = 1
    if (this._firstTouchLow) {
      if ((this._previousDoubleTouchInfo.quadrant === 0 || this._previousDoubleTouchInfo.quadrant === 1) && quadrant === 4) {
        if (this._startDoubleTouchInfo.quadrant === 1) {
          this._shiftAngle = Math.PI * 2
        }
        if (this._startDoubleTouchInfo.quadrant === 4) {
          this._shiftAngle = 0
        }
      }
      if ((this._previousDoubleTouchInfo.quadrant === 0 || this._previousDoubleTouchInfo.quadrant === 4) && quadrant === 1) {
        if (this._startDoubleTouchInfo.quadrant === 1) {
          this._shiftAngle = 0
        }
        if (this._startDoubleTouchInfo.quadrant === 4) {
          this._shiftAngle = -Math.PI * 2
        }
      }
    } else {
      if ((this._previousDoubleTouchInfo.quadrant === 0 || this._previousDoubleTouchInfo.quadrant === 1) && quadrant === 4) {
        if (this._startDoubleTouchInfo.quadrant === 3) {
          this._shiftAngle = 0
        }
        if (this._startDoubleTouchInfo.quadrant === 2) {
          this._shiftAngle = Math.PI * 2
        }
      }
      if ((this._previousDoubleTouchInfo.quadrant === 0 || this._previousDoubleTouchInfo.quadrant === 4) && quadrant === 1) {
        if (this._startDoubleTouchInfo.quadrant === 3) {
          this._shiftAngle = -Math.PI * 2
        }
        if (this._startDoubleTouchInfo.quadrant === 2) {
          this._shiftAngle = 0
        }
      }
    }

    const deltaAngle = this._startDoubleTouchInfo.angle - angle + this._shiftAngle
    const distance = Math.sqrt(touchWidth * touchWidth + touchHeight * touchHeight)
    const deltaDistance = this._startDoubleTouchInfo.distance - distance

    return {
      center,
      deltaCenter,
      angle,
      deltaAngle,
      distance,
      deltaDistance,
      quadrant,
      shiftAngle: this._shiftAngle
    }
  }

  // TODO: calc this
  private _getDistanceInfluenceRatio(influence: number) {
    return Math.pow(this.camera.radius / 10, 2) * influence
  }

  private static _InitPointerInfo(x = 0, y = 0): TouchInfo {
    return {
      x,
      y,
      deltaCenter: new Vector2(),
      distance: 0,
      deltaDistance: 0,
      isFirst: true,
      isFinal: false
    }
  }

  private static _InitDoubleTouchInfo(x = 0, y = 0): DoubleTouchInfo {
    return {
      center: new Vector2(x, y),
      deltaCenter: new Vector2(),
      angle: 0,
      deltaAngle: 0,
      distance: 0,
      deltaDistance: 0,
      quadrant: 0,
      shiftAngle: 0
    }
  }

  private _setPointersInfo(pointer0: any, pointer1: any) {
    this._setPreviousPointersInfo(pointer0, pointer1)
    this._setStartPointersInfo(pointer0, pointer1)
  }

  private _setStartPointersInfo(pointer0: any, pointer1: any) {
    this._startTouchInfo0 = ArcRotateCameraHammerJsInput._InitPointerInfo(pointer0.clientX, pointer0.clientY)
    this._startTouchInfo1 = ArcRotateCameraHammerJsInput._InitPointerInfo(pointer1.clientX, pointer1.clientY)
  }

  private _setPreviousPointersInfo(pointer0: any, pointer1: any) {
    this._previousTouchInfo0 = ArcRotateCameraHammerJsInput._InitPointerInfo(pointer0.clientX, pointer0.clientY)
    this._previousTouchInfo1 = ArcRotateCameraHammerJsInput._InitPointerInfo(pointer1.clientX, pointer1.clientY)
  }

  // DEBUG STUFF - can be left out

  public async setDebugMode(enableGadgets: boolean) {
    if (!this._touchInputDebug) {
      const TouchInfoDebug = await import('./TouchInputDebug')
      this._touchInputDebug = new TouchInfoDebug.TouchInputDebug(this, this.camera.getScene(), this.camera, false)
    }
    if (enableGadgets) {
      this._touchInputDebug.create()
    } else {
      this._touchInputDebug.dispose()
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
;(<any>CameraInputTypes)['ArcRotateCameraHammerJsInput'] = ArcRotateCameraHammerJsInput
