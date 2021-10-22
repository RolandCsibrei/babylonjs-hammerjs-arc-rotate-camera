/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ArcRotateCamera, CameraInputTypes, ICameraInput, Observable } from '@babylonjs/core'

import 'hammerjs'

/**
 * Manage the mouse inputs to control the movement of a free camera.
 * @see https://doc.babylonjs.com/how_to/customizing_camera_inputs
 */
export class ArcRotateCameraHammerJsInput implements ICameraInput<ArcRotateCamera> {
  /**
   * Defines the camera the input is attached to.
   */
  /**
   * Defines the camera the input is attached to.
   */
  public camera!: ArcRotateCamera

  /**
   * Defines the pointer angular sensibility  along the X and Y axis or how fast is the camera rotating.
   */
  public angularSensibility = 2000

  public panningSensibility = 1000

  public zoomSensibility = 600

  /**
   * Observable for when a pointer move event occurs containing the move offset
   */
  public onPointerMovedObservable = new Observable<{ offsetX: number; offsetY: number }>()
  /**
   * @hidden
   * If the camera should be rotated automatically based on pointer movement
   */
  public _allowCameraRotation = true

  /**
   * Manage the mouse inputs to control the movement of a free camera.
   * @see https://doc.babylonjs.com/how_to/customizing_camera_inputs
   * @param touchEnabled Defines if touch is enabled or not
   */
  constructor(
    /**
     * Define if touch is enabled in the mouse input
     */
    public touchEnabled = true
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

    const Pan = new Hammer.Pan()
    const Rotate = new Hammer.Rotate()
    const Pinch = new Hammer.Pinch()

    Rotate.recognizeWith([Pan])
    Pinch.recognizeWith([Rotate])

    manager.add(Pan)
    manager.add(Pinch)

    manager.on('panmove', e => {
      const dx = e.deltaX
      const dy = e.deltaY

      this.camera.inertialPanningX = -dx / this.panningSensibility
      this.camera.inertialPanningY = dy / this.panningSensibility
    })
    manager.on('panend', e => {
      //
    })

    manager.on('pinchmove', e => {
      this.camera.inertialAlphaOffset = -e.deltaX / this.angularSensibility
      this.camera.inertialRadiusOffset = 300 / (e.scale < 1 ? -this.zoomSensibility : this.zoomSensibility)
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
