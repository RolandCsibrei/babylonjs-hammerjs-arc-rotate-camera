/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ArcRotateCamera, CameraInputTypes, ICameraInput, Scalar, Vector3 } from '@babylonjs/core'

import 'hammerjs'

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
    const pinch = new Hammer.Pinch()
    const pan = new Hammer.Pan()

    manager.add([pinch, pan, rotate])
    manager.get('pan').set({ enable: true, threshold: 60 })
    manager.get('pinch').set({ enable: true, threshold: 0 })
    manager.get('rotate').set({ enable: true, threshold: 60 })

    // rotate.recognizeWith([Pan])
    // pinch.recognizeWith([rotate])

    manager.add(pan)
    manager.add(rotate)
    manager.add(pinch)

    let startPosition = Vector3.Zero()
    let startTarget = Vector3.Zero()

    let startCenterX = 0
    let startCenterY = 0

    let startRotation = 0
    let startAlpha = 0
    let startBeta = 0

    let startScale = 0
    let startRadius = 0

    let isRotating = false
    manager.on('panstart', e => {
      startCenterX = e.center.x
      startCenterY = e.center.y

      startPosition = this.camera.position.clone()
      startTarget = this.camera.target.clone()
    })

    let firstTouchLow = false

    manager.on('pinchstart', e => {
      startBeta = this.camera.beta
    })

    manager.on('rotatestart', e => {
      isRotating = true

      startRotation = e.rotation
      startAlpha = this.camera.alpha

      switched = false

      const sy1 = e.pointers[0].screenY
      const sy2 = e.pointers[1].screenY
      if (sy1 > sy2) {
        firstTouchLow = true
      } else {
        firstTouchLow = false
      }

      startScale = e.scale
      startRadius = this.camera.radius
    })

    manager.on('pinch', e => {
      const sy1 = e.pointers[0].screenY
      const sy2 = e.pointers[1].screenY
      const ds = Math.abs(sy1 - sy2)
      if (ds < this.tiltTouchDistanceTresholdInPixels) {
        this.camera.beta = startBeta + e.deltaY / this.rotationSensibilityBeta
      }
    })

    manager.on('pan', e => {
      if (!e.isFinal) {
        const dx = -(startCenterX - e.center.x) * this.xPanningRatio
        const dy = (startCenterY - e.center.y) * this.zPanningRatio

        // rotate the position according to camera.alpha
        const alpha = this.camera.alpha - Math.PI / 2
        const c = Math.cos(alpha)
        const s = Math.sin(alpha)
        const x1 = dx
        const y1 = dy
        const x2 = c * x1 - s * y1
        const y2 = s * x1 + c * y1

        const v2 = new Vector3(x2, 0, y2)
        const amount = 0.5
        this.camera.position.x = Scalar.Lerp(this.camera.position.x, startPosition.x + v2.x, amount)
        this.camera.position.z = Scalar.Lerp(this.camera.position.z, startPosition.z + v2.z, amount)

        this.camera.target.x = Scalar.Lerp(this.camera.target.x, startTarget.x + v2.x, amount)
        this.camera.target.z = Scalar.Lerp(this.camera.target.z, startTarget.z + v2.z, amount)

        this.camera.rebuildAnglesAndRadius()
      }
    })

    //
    //   PROTOTYPE - THIS NEEDS TO BE REFACTORED
    //
    let lastNonSwitchedRotation: number | null = null
    let switched = false //lastRotation >= 0 && e.rotation < 0 // && lastAngle <= 0 && e.angle > 0
    manager.on('rotate', e => {
      console.log('rotate')
      if (!e.isFinal) {
        const sx1 = e.pointers[0].screenX
        const sx2 = e.pointers[1].screenX
        const sy1 = e.pointers[0].screenY
        const sy2 = e.pointers[1].screenY
        const ds = Math.abs(sy1 - sy2)
        let rot = e.rotation

        let deltaRotation = 0
        if (firstTouchLow) {
          if (sy1 < sy2 && sx1 < sx2) {
            // console.log('changed')
            rot = 360 + e.rotation
            switched = true
          } else if (sy2 < sy1) {
            // console.log('changed 2')
            switched = false
          }
          deltaRotation = startRotation - rot
        } else {
          if (sy2 <= sy1 && sx1 < sx2) {
            if (!switched) {
              lastNonSwitchedRotation = e.rotation
              deltaRotation = e.rotation
            } else {
              // console.log('changed 3')
              rot = e.rotation
              if (lastNonSwitchedRotation !== null) {
                deltaRotation = 2 * lastNonSwitchedRotation - rot
              } else {
                deltaRotation = rot
              }
            }
            switched = true
          } else {
            deltaRotation = startRotation - rot
          }
        }
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

        if (ds > this.tiltTouchDistanceTresholdInPixels || isRotating) {
          this.camera.alpha = startAlpha - deltaRotation / this.rotationSensibilityAlpha
          // console.log(e.rotation, deltaRotation)

          const deltaScale = startScale - e.scale
          this.camera.radius = startRadius - deltaScale * this.zoomSensibility
        }
      } else {
        isRotating = false
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
