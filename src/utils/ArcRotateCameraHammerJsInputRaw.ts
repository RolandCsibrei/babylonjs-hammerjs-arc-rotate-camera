/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ArcRotateCamera, CameraInputTypes, Color3, ICameraInput, MeshBuilder, PointerInfo, Scalar, StandardMaterial, Vector2, Vector3 } from '@babylonjs/core'

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
  center: Vector2
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

  /**
   * Defines the pointer angular sensibility  along the X and Y axis or how fast is the camera rotating.
   */

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
    public xPanningRatio = 2 / 30,
    public zPanningRatio = 4 / 30,
    public xPanningTreshold = 40,
    public yPanningTreshold = 40,
    public rotationTreshold = 10,
    public zoomLowerTreshold = 0.85,
    public zoomUpperTreshold = 1.2,
    public tiltTouchDistanceTresholdInPixels = 100
  ) {}

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
    // const pinch = new Hammer.Pinch()
    const pan = new Hammer.Pan()

    // rotate.recognizeWith([pan])
    // pinch.recognizeWith([rotate])

    // manager.add(pinch)
    manager.add(rotate)
    manager.add(pan)

    manager.get('pan').set({ enable: true, threshold: 60 })
    // manager.get('pinch').set({ enable: true, threshold: 0 })
    // manager.get('hammer.input').set({ enable: true, threshold: 10, pointers: 2 })
    // manager.get('rotate').set({ enable: true, threshold: 60 })

    const scene = this.camera.getScene()

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

    let startAngle = 0
    let startAlpha = 0
    // let startBeta = 0

    let startDistance = 0
    let startRadius = 0

    let isRotating = false
    manager.on('panstart', e => {
      startCenterX = e.center.x
      startCenterY = e.center.y

      startPosition = this.camera.position.clone()
      startTarget = this.camera.target.clone()
    })

    // let firstTouchLow = false

    // manager.on('pinchstart', e => {
    //   console.log('pinchstart')

    //   oldPointer0 = { clientX: e.pointers[0].clientX, clientY: e.pointers[0].clientY }
    //   oldPointer1 = { clientX: e.pointers[1].clientX, clientY: e.pointers[1].clientY }

    //   startPointer0 = { clientX: e.pointers[0].clientX, clientY: e.pointers[0].clientY }
    //   startPointer1 = { clientX: e.pointers[1].clientX, clientY: e.pointers[1].clientY }

    //   startBeta = this.camera.beta
    // })

    let oldInfo: DoubleTouchInfo = {
      center: new Vector2(),
      deltaCenter: new Vector2(),
      angle: 0,
      deltaAngle: 0,
      distance: 0,
      deltaDistance: 0
    }

    let startInfo: DoubleTouchInfo = {
      center: new Vector2(),
      deltaCenter: new Vector2(),
      angle: 0,
      deltaAngle: 0,
      distance: 0,
      deltaDistance: 0
    }

    manager.on('rotatestart', e => {
      console.log('rotatestart')

      oldPointer0 = { center: new Vector2(e.pointers[0].clientX, e.pointers[0].clientY), deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }
      oldPointer1 = { center: new Vector2(e.pointers[1].clientX, e.pointers[1].clientY), deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }

      startPointer0 = { center: new Vector2(e.pointers[0].clientX, e.pointers[0].clientY), deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }
      startPointer1 = { center: new Vector2(e.pointers[1].clientX, e.pointers[1].clientY), deltaCenter: new Vector2(), distance: 0, deltaDistance: 0 }

      startPosition = this.camera.position.clone()
      startTarget = this.camera.target.clone()

      const info = getCenterAngleDistance(startPointer0, startPointer1)

      startAngle = info.angle
      startDistance = info.distance

      oldInfo = { ...info }
      startInfo = { ...info }

      //

      isRotating = true

      switched = false

      // const sy1 = e.pointers[0].screenY
      // const sy2 = e.pointers[1].screenY
      // if (sy1 > sy2) {
      //   firstTouchLow = true
      // } else {
      //   firstTouchLow = false
      // }

      startAlpha = this.camera.alpha
      startRadius = this.camera.radius
    })

    let oldPointer0: TouchInfo
    let startPointer0: TouchInfo
    let oldPointer1: TouchInfo
    let startPointer1: TouchInfo

    const processPointer = (e: PointerEvent, oldPointer: TouchInfo, startPointer: TouchInfo) => {
      const dx = startPointer.center.x - e.clientX
      const dy = startPointer.center.y - e.clientY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const deltaDistance = startInfo.distance - distance
      const touchInfo: TouchInfo = {
        center: new Vector2(e.clientX, e.clientY),
        deltaCenter: new Vector2(dx, dy),
        distance,
        deltaDistance
      }

      // p.deltaX = oldPointer.clientX - p.clientX
      // p.deltaY = oldPointer.clientY - p.clientY
      // p.overallDeltaX = startPointer.clientX - p.clientX
      // p.overallDeltaY = startPointer.clientY - p.clientY
      // p.absDeltaX = Math.abs(p.deltaX)
      // p.absDeltaY = Math.abs(p.deltaY)
      // p.absOverallDeltaX = Math.abs(p.overallDeltaX)
      // p.absOverallDeltaY = Math.abs(p.overallDeltaY)
      // p.hasMoved = p.absOverallDeltaX > 0 || p.absOverallDeltaY > 0

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return touchInfo
    }

    const getCenterAngleDistance = (p0: TouchInfo, p1: TouchInfo): DoubleTouchInfo => {
      const center = new Vector2(0, 0)
      const deltaCenter = new Vector2(0, 0)

      const touchWidth = Math.abs(p0.center.x - p1.center.x)
      const touchHeight = Math.abs(p0.center.y - p1.center.y)
      center.x = touchWidth / 2 + p0.center.x
      center.y = touchHeight / 2 + p0.center.y

      deltaCenter.x = center.x - startInfo.center.x
      deltaCenter.y = startInfo.center.y - center.y

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

    //
    //   PROTOTYPE - THIS NEEDS TO BE REFACTORED
    //
    let switched = false //lastRotation >= 0 && e.rotation < 0 // && lastAngle <= 0 && e.angle > 0
    manager.on('rotate', e => {
      const direction = new Vector2()
      // let angle =/ 0
      // let distance = 0
      const touchCenter = new Vector2()
      const xTreshold = 4
      const yTreshold = 4

      // let isPan = false // when moving both fingers in the same direction it will be processed as pan

      const p0 = processPointer(e.pointers[0], oldPointer0, startPointer0)
      const p1 = processPointer(e.pointers[1], oldPointer1, startPointer1)

      const info = getCenterAngleDistance(p0, p1)

      const s = 0.04
      touch1Marker.position = new Vector3(p0.center.x, 1, p0.center.y).scale(s)
      touch2Marker.position = new Vector3(p1.center.x, 1, p1.center.y).scale(s)
      centerMarker.position = new Vector3(info.center.x, 1, info.center.y).scale(s)

      touch1Marker.position.x -= 40
      touch2Marker.position.x -= 40
      centerMarker.position.x -= 40
      touch1Marker.position.z -= 40
      touch2Marker.position.z -= 40
      centerMarker.position.z -= 40

      // const dx = Math.abs(oldInfo.center.x - info.center.x)
      // const dy = Math.abs(oldInfo.center.y - info.center.y)

      // const moveX = dx > 0
      // const moveY = dy > 0

      // if (moveX) {
      //   if (oldInfo.center.x < info.center.x) {
      //     console.log('move right', oldInfo.center.x - info.center.x)
      //   } else {
      //     console.log('move left', oldInfo.center.x - info.center.x)
      //   }
      // }

      // if (moveY) {
      //   if (oldInfo.center.y > info.center.y) {
      //     console.log('move down', oldInfo.center.y - info.center.y)
      //   } else {
      //     console.log('move up', oldInfo.center.y - info.center.y)
      //   }
      // }

      // oldInfo = { ...info }

      // panMove(info.deltaCenter.x / 20, info.deltaCenter.y / 20)

      // this.camera.position.x = startPosition.x + info.deltaCenter.x / 25
      // this.camera.position.z = startPosition.z + info.deltaCenter.y / 25

      // this.camera.target.x = startTarget.x + info.deltaCenter.x / 25
      // this.camera.target.z = startTarget.z + info.deltaCenter.y / 25

      // if (Math.abs(info.deltaDistance) > 10) {
      this.camera.radius = startRadius + info.deltaDistance / 10
      // }
      if (Math.abs(info.deltaAngle) > 0.01) {
        // this.camera.alpha = startAlpha + info.deltaAngle
      }

      // console.log('center', info.center.x, info.center.y, 'delta center', info.deltaCenter.x, info.deltaCenter.y)

      // console.log(p0.hasMoved, p1.hasMoved, bothTouchesMoved)
      console.log(info.angle, info.deltaAngle)
      // console.log(
      //   'radius',
      //   this.camera.radius,
      //   'center',
      //   info.center.x,
      //   info.center.y,
      //   'delta center',
      //   info.deltaCenter.x,
      //   info.deltaCenter.y,
      //   'angle',
      //   info.angle,
      //   info.deltaAngle,
      //   'distance',
      //   info.distance,
      //   info.deltaDistance
      // )
      oldPointer0.center = new Vector2(e.pointers[0].clientX, e.pointers[0].clientY)
      oldPointer1.center = new Vector2(e.pointers[0].clientX, e.pointers[0].clientY)

      // if (absDeltaX > 0 && absDeltaY > 0) {
      //   // both finger has moved
      //   console.log('isPan')
      //   isPan = true
      // } else {
      //   console.log('rotation or pinch', absDeltaX, absDeltaY)
      // }

      // if (absDeltaX > absDeltaY) {
      //   direction.x = Math.sign(p1.deltaX)
      //   direction.y = 0
      // } else if (absDeltaX === absDeltaY) {
      //   direction.x = 0
      //   direction.y = 0
      // } else if (absDeltaY > absDeltaX) {
      //   direction.x = 0
      //   direction.y = Math.sign(p1.deltaY)
      // }

      // console.log(
      //   pidx,
      //   'deltaX',
      //   p.deltaX,
      //   'deltaY',
      //   p.deltaY,
      //   'overallDeltaX',
      //   p.overallDeltaX,
      //   'overallDeltaY',
      //   p.overallDeltaY,
      //   'direction',
      //   direction.x,
      //   ',',
      //   direction.y,
      //   e.pointers[0],
      //   e.pointers[1]
      // )

      // if ((absDeltaX > 0 && absDeltaY === 0) || (absDeltaX === 0 && absDeltaY > 0)) {
      // one finger moved in two finger touch
      /*
      const clientX: number = e.pointers[0].clientX
      const clientY: number = e.pointers[0].clientY
      const touchWidth = Math.abs(e.pointers[0].clientX - e.pointers[1].clientX)
      const touchHeight = Math.abs(e.pointers[0].clientY - e.pointers[1].clientY)
      touchCenter.x = touchWidth / 2 + clientX
      touchCenter.y = touchHeight / 2 + clientY
      angle = Math.atan(touchWidth / touchHeight)

      const moveDirection = direction.multiply(touchCenter)
      // panMove(moveDirection.x, moveDirection.y)
      const alpha = this.camera.alpha - Math.PI / 2
      const c = Math.cos(alpha)
      const s = Math.sin(alpha)
      const x1 = touchCenter.x / 20
      const y1 = touchCenter.y / 20
      const x2 = c * x1 - s * y1
      const y2 = s * x1 + c * y1

      const v2 = new Vector3(x2, 0, y2)
      // centerMarker.position.x = v2.x / 60
      // centerMarker.position.y = 2
      // centerMarker.position.z = v2.z / 60

      const amount = 0.5
      this.camera.position.x = Scalar.Lerp(this.camera.position.x, startPosition.x + v2.x, amount)
      this.camera.position.z = -Scalar.Lerp(this.camera.position.z, startPosition.z + v2.z, amount)

      this.camera.target.x = Scalar.Lerp(this.camera.target.x, startTarget.x + v2.x, amount)
      this.camera.target.z = -Scalar.Lerp(this.camera.target.z, startTarget.z + v2.z, amount)

      // console.log('angle', angle, 'distance', distance)
      console.log(touchCenter)
      // }

      if (!isPan) {
        this.camera.radius = distance / 10
        this.camera.alpha = angle
      }
*/

      // if (!e.isFinal) {
      // const sx1 = e.pointers[0].screenX
      // const sx2 = e.pointers[1].screenX
      // const sy1 = e.pointers[0].screenY
      // const sy2 = e.pointers[1].screenY
      // const ds = Math.abs(sy1 - sy2)
      // let rot = e.rotation
      // let deltaRotation = 0
      // if (firstTouchLow) {
      //   if (sy1 < sy2 && sx1 < sx2) {
      //     // console.log('changed')
      //     rot = 360 + e.rotation
      //     switched = true
      //   } else if (sy2 < sy1) {
      //     // console.log('changed 2')
      //     switched = false
      //   }
      //   deltaRotation = startRotation - rot
      // } else {
      //   if (sy2 <= sy1 && sx1 < sx2) {
      //     if (!switched) {
      //       lastNonSwitchedRotation = e.rotation
      //       deltaRotation = e.rotation
      //     } else {
      //       // console.log('changed 3')
      //       rot = e.rotation
      //       if (lastNonSwitchedRotation !== null) {
      //         deltaRotation = 2 * lastNonSwitchedRotation - rot
      //       } else {
      //         deltaRotation = rot
      //       }
      //     }
      //     switched = true
      //   } else {
      //     deltaRotation = startRotation - rot
      //   }
      // }
      // console.log(
      //   'e.rotation',
      //   e.rotation,
      //   'e.angle',
      //   e.angle,
      //   'sy1',
      //   sy1,
      //   'sy2',
      //   sy2,
      //   'startRotation',
      //   startRotation,
      //   'deltaRotation',
      //   deltaRotation,
      //   'switched',
      //   switched,
      //   'lastNonSwitchedRotation',
      //   lastNonSwitchedRotation
      // )
      // const deltaScale = startScale - e.scale
      // this.camera.radius = startRadius - deltaScale * this.zoomSensibility
      // if (ds > this.tiltTouchDistanceTresholdInPixels || isRotating) {
      //   this.camera.alpha = startAlpha - deltaRotation / this.rotationSensibilityAlpha
      //   // console.log(e.rotation, deltaRotation)
      // }
      // } else {
      //   isRotating = false
      // }
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

      const amount = 0.5
      this.camera.position.x = Scalar.Lerp(this.camera.position.x, startPosition.x + x2, amount)
      this.camera.position.z = Scalar.Lerp(this.camera.position.z, startPosition.z + y2, amount)

      this.camera.target.x = Scalar.Lerp(this.camera.target.x, startTarget.x + x2, amount)
      this.camera.target.z = Scalar.Lerp(this.camera.target.z, startTarget.z + y2, amount)

      this.camera.rebuildAnglesAndRadius()
    }

    manager.on('pan', e => {
      if (!e.isFinal) {
        const dx = -(startCenterX - e.center.x) * this.xPanningRatio
        const dy = (startCenterY - e.center.y) * this.zPanningRatio
        panMove(dx, dy)
      }
    })
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
