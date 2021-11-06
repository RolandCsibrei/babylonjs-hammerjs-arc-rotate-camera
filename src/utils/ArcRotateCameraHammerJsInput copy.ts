/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ArcRotateCamera, CameraInputTypes, ICameraInput, Scalar, Tools, Vector3 } from '@babylonjs/core'

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
   * Manage the HammerJS inputs to control the movement of an arc rotate camera
   */
  constructor(
    /**
     * Define the rotation sensitiviy
     */
    public rotationSensitiviy = 4000,

    /**
     * Define the zoom sensitiviy
     */
    public zoomSensitivity = 1,

    /**
     * Define the x-panning sensitiviy
     */
    public xPanningSensitivity = 2 / 30,

    /**
     * Define the z-panning sensitiviy
     */
    public zPanningSensitivity = 4 / 30,

    /**
     * Define the x-panning treshold
     */
    public xPanningTreshold = 40,

    /**
     * Define the z-panning treshold
     */
    public zPanningTreshold = 40,

    /**
     * Define the rotation treshold
     */
    public rotationTreshold = 30,

    /**
     * Define the zoom lower treshold
     */
    public zoomLowerTreshold = 0.85,

    /**
     * Define the zoom upper treshold
     */
    public zoomUpperTreshold = 1.2,

    /**
     * Define the panning lerp amount
     */
    public panningLerpAmount = 0.5,

    /**
     * Define whether to use inertia when panning or instantly pan (like Google Earth)
     */
    public useInertialPanning = false
  ) {}

  /**
   * Attach the input controls to a specific dom element to get the input from.
   * @param noPreventDefault Defines whether event caught by the controls should call preventdefault() (https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault)
   */
  public attachControl(noPreventDefault?: boolean): void {
    // eslint-disable-next-line prefer-rest-params
    noPreventDefault = Tools.BackCompatCameraNoPreventDefault(arguments)

    const engine = this.camera.getEngine()
    const element = <EventTarget>engine.getInputElement()
    const manager = new Hammer.Manager(element)

    // no context menu
    element && element.addEventListener('contextmenu', <EventListener>this.onContextMenu.bind(this), false)

    const Pan = new Hammer.Pan() // { threshold: 20 }
    const Rotate = new Hammer.Rotate()
    const Pinch = new Hammer.Pinch()

    Pinch.recognizeWith([Rotate])

    manager.add(Pan)
    manager.add(Rotate)
    manager.add(Pinch)

    let startPosition = Vector3.Zero()
    let startTarget = Vector3.Zero()

    let startCenterX = 0
    let startCenterY = 0

    // store the start positions when panning starts
    manager.on('panstart', e => {
      startCenterX = e.center.x
      startCenterY = e.center.y

      startPosition = this.camera.position.clone()
      startTarget = this.camera.target.clone()

      if (!noPreventDefault) {
        e.preventDefault()
      }
    })

    manager.on('panmove', e => {
      if (this.useInertialPanning === true) {
        const dx = e.deltaX
        const dy = e.deltaY

        if (Math.abs(dx) > this.xPanningTreshold) {
          this.camera.inertialPanningX = (startCenterX - e.center.x) / this.camera.radius
        } else {
          this.camera.inertialPanningX = 0
        }

        if (Math.abs(dy) > this.zPanningTreshold) {
          this.camera.inertialPanningY = -(startCenterY - e.center.y) / this.camera.radius
        } else {
          this.camera.inertialPanningY = 0
        }
      } else {
        // maybe we can use e.deltaX and e. deltaY
        const dx = -(startCenterX - e.center.x) * this.xPanningSensitivity
        const dz = (startCenterY - e.center.y) * this.zPanningSensitivity

        // rotate the position around the Y axis by camer.alpha
        const alpha = this.camera.alpha - Math.PI / 2
        const c = Math.cos(alpha)
        const s = Math.sin(alpha)
        const x1 = Math.abs(dx) < this.xPanningSensitivity ? 0 : dx
        const z1 = Math.abs(dz) < this.zPanningSensitivity ? 0 : dz
        const x2 = c * x1 - s * z1
        const z2 = s * x1 + c * z1

        // final position
        const v2 = new Vector3(x2, 0, z2)

        // lerp the position and the target X and Z
        this.camera.position.x = Scalar.Lerp(this.camera.position.x, startPosition.x + v2.x, this.panningLerpAmount)
        this.camera.position.z = Scalar.Lerp(this.camera.position.z, startPosition.z + v2.z, this.panningLerpAmount)

        this.camera.target.x = Scalar.Lerp(this.camera.target.x, startTarget.x + v2.x, this.panningLerpAmount)
        this.camera.target.z = Scalar.Lerp(this.camera.target.z, startTarget.z + v2.z, this.panningLerpAmount)
      }
      if (!noPreventDefault) {
        e.preventDefault()
      }
    })

    manager.on('rotate', e => {
      if (Math.abs(e.deltaX) > this.rotationTreshold) {
        // pointer finger first or seconds?
        const mul = e.rotation > 0 ? 1 : -1
        this.camera.inertialAlphaOffset = (mul * e.deltaX) / this.rotationSensitiviy
      } else {
        this.camera.inertialAlphaOffset = 0
      }

      if (!noPreventDefault) {
        e.preventDefault()
      }
    })

    manager.on('pinch', e => {
      if (e.scale < this.zoomLowerTreshold || e.scale > this.zoomUpperTreshold) {
        this.camera.inertialRadiusOffset = e.scale < 1 ? -this.zoomSensitivity : this.zoomSensitivity
      } else {
        this.camera.inertialRadiusOffset = 0
      }

      if (!noPreventDefault) {
        e.preventDefault()
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
   * @param ignored defines an ignored parameter kept for backward compatibility. If you want to define the source input element, you can set engine.inputElement before calling camera.attachControl
   */
  public detachControl(ignored?: any): void {
    if (this.onContextMenu) {
      const inputElement = this.camera
        .getScene()
        .getEngine()
        .getInputElement()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      inputElement && inputElement.removeEventListener('contextmenu', <EventListener>this.onContextMenu)
    }
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
    return 'HammerJS'
  }

  public checkInputs() {
    // this.camera.inertialRadiusOffset = -0.1
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
;(<any>CameraInputTypes)['ArcRotateCameraHammerJsInput'] = ArcRotateCameraHammerJsInput
