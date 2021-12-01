import {
  ArcRotateCamera,
  Color3,
  Color4,
  FreeCamera,
  LinesMesh,
  MeshBuilder,
  Nullable,
  Observer,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3
} from '@babylonjs/core'
import { AdvancedDynamicTexture, Button, Image } from '@babylonjs/gui'
import { ArcRotateCameraHammerJsInput } from './ArcRotateCameraHammerJsInput'

const mapValue = (value: number, x1: number, y1: number, x2: number, y2: number) => ((value - x1) * (y2 - x2)) / (y1 - x1) + x2

export class TouchInputDebug {
  private _debugToConsole = false
  private _debugObserver: Nullable<Observer<Scene>> = null
  private _debugCamera?: ArcRotateCamera
  private _existingGui = false

  public enableTargetAxis = false
  public enableDebugValues = false
  public enableHelperIcons = false
  public enableLine = false

  constructor(
    public input: ArcRotateCameraHammerJsInput,
    private _scene: Scene,
    private _camera: ArcRotateCamera,
    public debugToConsole = false,
    private _gui?: AdvancedDynamicTexture
  ) {}

  public create() {
    const scene = this._scene
    const engine = scene.getEngine()

    if (!this._gui) {
      this._existingGui = false
      this._gui = AdvancedDynamicTexture.CreateFullscreenUI('debug', true, scene)
    } else {
      this._existingGui = true
    }

    this._setupTouchHelp()

    if (scene.activeCameras) {
      if (scene.activeCameras?.length === 0 && scene.activeCamera) {
        scene.activeCameras.push(scene.activeCamera)
      }

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
      const centerButton = this._addDebugButton(0, this._gui, 5)

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
      const touch1Button = this._addDebugButton(1, this._gui, 2)

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
      const touch2Button = this._addDebugButton(2, this._gui, 2)

      const startTouch1Marker = MeshBuilder.CreateSphere('startTouch1marker', { diameter: diameter * 1.5 }, scene)
      startTouch1Marker.material = touch1MarkerMaterial
      startTouch1Marker.visibility = 0.4
      startTouch1Marker.layerMask = 0x20000000

      const startTouch2Marker = MeshBuilder.CreateSphere('startTouch2marker', { diameter: diameter * 1.5 }, scene)
      startTouch2Marker.material = touch2MarkerMaterial
      startTouch2Marker.visibility = 0.4
      startTouch2Marker.layerMask = 0x20000000

      //

      const axisParent = new TransformNode('axisParent', scene)
      const mx = MeshBuilder.CreateBox('axisX', { width: 100 }, scene)
      mx.position.x = 50
      const my = MeshBuilder.CreateBox('axisY', { height: 100 }, scene)
      my.position.y = 50
      const mz = MeshBuilder.CreateBox('axisZ', { depth: 100 }, scene)
      mz.position.z = 50
      const matx = new StandardMaterial('axisXmat', scene)
      matx.emissiveColor = Color3.Red()
      mx.material = matx
      const maty = new StandardMaterial('axisYmat', scene)
      maty.emissiveColor = Color3.Blue()
      my.material = maty
      const matz = new StandardMaterial('axisZmat', scene)
      matz.emissiveColor = Color3.Green()
      mz.material = matz

      mx.parent = axisParent
      my.parent = axisParent
      mz.parent = axisParent

      //

      const renderWidth = engine.getRenderWidth()
      const renderHeight = engine.getRenderHeight()

      this._debugObserver = scene.onBeforeRenderObservable.add(() => {
        axisParent.setEnabled(this.enableTargetAxis)
        lines.setEnabled(this.enableLine)

        const info = this.input.getInfo()

        if (this.debugToConsole) {
          console.log(
            info.doubleTouchInfo
            /*
            choose what to log from the touchInfo object

          */
          )
        }

        axisParent.position = info.targetTarget

        //

        if (this._gui && this.enableHelperIcons) {
          const pan = this._gui.getControlByName('touchHelperPanImage')
          const zoom = this._gui.getControlByName('touchHelperZoomImage')
          const rotate = this._gui.getControlByName('touchHelperRotateImage')
          const tilt = this._gui.getControlByName('touchHelperTiltImage')

          if (!(pan && zoom && rotate && tilt)) {
            return
          }

          pan.isEnabled = this.enableHelperIcons
          zoom.isEnabled = this.enableHelperIcons
          rotate.isEnabled = this.enableHelperIcons
          tilt.isEnabled = this.enableHelperIcons

          const iconSize = 48

          const sw = renderWidth / 2
          const sh = renderHeight / 2

          let x = 0
          let y = 0
          if (info.touchInfo0) {
            if (info.isPanning) {
              x = info.touchInfo0.x //- iconSize / 2
              y = info.touchInfo0.y - iconSize
            } else if (info.touchInfo1) {
              const bx = Math.min(info.touchInfo0.x, info.touchInfo1.x)
              const by = Math.min(info.touchInfo0.y, info.touchInfo1.y)
              const dx = Math.abs(info.touchInfo0.x - info.touchInfo1.x)
              const dy = Math.abs(info.touchInfo0.y - info.touchInfo1.y)
              x = bx + dx / 2
              y = by + dy / 2 - (info.isTilting ? iconSize / 2 : iconSize / 1.5)
            }

            x -= sw
            y -= sh + iconSize * 3 + 20
          }
          pan.isVisible = false
          zoom.isVisible = false
          rotate.isVisible = false
          tilt.isVisible = false

          if (!info.isFinal) {
            //

            if (info.isPanning) {
              pan.isVisible = true

              pan.leftInPixels = x
              pan.topInPixels = y
            } else if (info.isTilting) {
              tilt.isVisible = true

              tilt.leftInPixels = x
              tilt.topInPixels = y
            } else if (info.isRotating) {
              pan.isVisible = true
              zoom.isVisible = true
              rotate.isVisible = true

              pan.leftInPixels = x
              pan.topInPixels = y - iconSize

              zoom.leftInPixels = x
              zoom.topInPixels = y

              rotate.leftInPixels = x
              rotate.topInPixels = y + iconSize
            }
          }
        }

        //

        if (this._debugCamera) {
          if (!this.enableDebugValues) {
            touch1Button.isVisible = false
            touch2Button.isVisible = false
            centerButton.isVisible = false
            touch1Marker.setEnabled(false)
            touch2Marker.setEnabled(false)
            centerMarker.setEnabled(false)
            startTouch1Marker.setEnabled(false)
            startTouch2Marker.setEnabled(false)
          } else {
            touch1Button.isVisible = true
            touch2Button.isVisible = true
            centerButton.isVisible = true
            touch1Marker.setEnabled(true)
            touch2Marker.setEnabled(true)
            centerMarker.setEnabled(true)
            startTouch1Marker.setEnabled(true)
            startTouch2Marker.setEnabled(true)

            const rw = 22
            const rh = 12

            if (touch1Button.textBlock) {
              touch1Button.textBlock.text = `${info.previousTouchInfo0.x}, ${info.previousTouchInfo0.y}\nΔ ${info.previousTouchInfo0.deltaCenter.x}, ${
                info.previousTouchInfo0.deltaCenter.y
              }
          sbeta ${info.startBeta.toPrecision(3)}\ntbeta ${info.targetBeta.toPrecision(3)}\ncbeta ${this._camera.beta.toPrecision(3)}`
            }
            touch1Button.leftInPixels = info.previousTouchInfo0.x - renderWidth / 2
            touch1Button.topInPixels = info.previousTouchInfo0.y - renderHeight / 2 - 50

            if (touch2Button.textBlock) {
              touch2Button.textBlock.text = `${info.previousTouchInfo1.x}, ${info.previousTouchInfo1.y}\nΔ ${info.previousTouchInfo1.deltaCenter.x}, ${info.previousTouchInfo1.deltaCenter.y}`
            }
            touch2Button.leftInPixels = info.previousTouchInfo1.x - renderWidth / 2
            touch2Button.topInPixels = info.previousTouchInfo1.y - renderHeight / 2 - 60

            if (centerButton.textBlock && info.doubleTouchInfo) {
              // ${touchInfo.previousInfo.center.x}, ${touchInfo.previousInfo.center.y}\n
              centerButton.textBlock.text = `srad ${info.doubleTouchInfo.angle.toPrecision(3)}\nshift ${info.shiftAngle.toPrecision(
                3
              )}\nΔ rad ${info.previousDoubleTouchInfo.deltaAngle.toPrecision(3)}\nrad ${info.previousDoubleTouchInfo.angle.toPrecision(
                3
              )}\nalpha ${this._camera.alpha.toPrecision(3)}\nq ${info.previousDoubleTouchInfo.quadrant}`
              // centerButton.textBlock.text = `sbeta ${touchInfo.Beta.toPrecision(3)}\ntbeta ${touchInfo.targetBeta.toPrecision(
              //   3
              // )}\ncbeta ${this.camera.beta.toPrecision(3)}`
            }

            centerButton.leftInPixels = info.previousDoubleTouchInfo.center.x - renderWidth / 2
            centerButton.topInPixels = info.previousDoubleTouchInfo.center.y - renderHeight / 2 - 60

            let x = mapValue(info.previousTouchInfo0.x, 0, renderWidth, -rw, rw)
            let y = mapValue(info.previousTouchInfo0.y, 0, renderHeight, rh, -rh)
            touch1Marker.position.x = x
            touch1Marker.position.y = y
            touch1Marker.position.z = 0

            x = mapValue(info.previousTouchInfo1.x, 0, renderWidth, -rw, rw)
            y = mapValue(info.previousTouchInfo1.y, 0, renderHeight, rh, -rh)
            touch2Marker.position.x = x
            touch2Marker.position.y = y
            touch2Marker.position.z = 0

            if (info.touchInfo0) {
              x = mapValue(info.touchInfo0.x, 0, renderWidth, -rw, rw)
              y = mapValue(info.touchInfo0.y, 0, renderHeight, rh, -rh)
              startTouch1Marker.position.x = x
              startTouch1Marker.position.y = y
              startTouch1Marker.position.z = 0
            }

            if (info.touchInfo1) {
              x = mapValue(info.touchInfo1.x, 0, renderWidth, -rw, rw)
              y = mapValue(info.touchInfo1.y, 0, renderHeight, rh, -rh)
              startTouch2Marker.position.x = x
              startTouch2Marker.position.y = y
              startTouch2Marker.position.z = 0
            }

            if (info.previousDoubleTouchInfo.distance < 1) {
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
            x = mapValue(info.previousDoubleTouchInfo.center.x, 0, renderWidth, -rw, rw)
            y = mapValue(info.previousDoubleTouchInfo.center.y, 0, renderHeight, rh, -rh)
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
        }
      })
    }
  }

  public dispose() {
    const scene = this._scene
    const debugCamera = scene.getCameraByName('debugCamera')
    debugCamera?.dispose()

    if (!this._existingGui) {
      this._gui?.dispose()
    }

    scene.getMeshByName('debugLines')?.dispose()
    scene.getMeshByName('touch1marker')?.dispose()
    scene.getMeshByName('touch2marker')?.dispose()
    scene.getMeshByName('startTouch1marker')?.dispose()
    scene.getMeshByName('startTouch2marker')?.dispose()
    scene.getMeshByName('debugLines')?.dispose()

    scene.getMaterialByName('touch1MarkerMaterial')?.dispose()
    scene.getMaterialByName('touch2MarkerMaterial')?.dispose()

    scene.getMaterialByName('axisXmat')?.dispose()
    scene.getMaterialByName('axisYmat')?.dispose()
    scene.getMaterialByName('axisZmat')?.dispose()

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

    btn.isEnabled = false
    return btn
  }

  private _setupTouchHelp() {
    const pan = new Image('touchHelperPanImage', 'images/control_camera-white.png')
    const zoom = new Image('touchHelperZoomImage', 'images/zoom_out_map-white.png')
    const rotate = new Image('touchHelperRotateImage', 'images/loop-white.png')
    const tilt = new Image('touchHelperTiltImage', 'images/height-white.png')
    ;[pan, zoom, rotate, tilt].forEach(image => {
      image.cellHeight = 48
      image.cellWidth = 48
      image.width = '48px'
      image.height = '48px'
      image.zIndex = 99999
      image.alpha = 1
      image.color = '#fff'

      if (this._gui) {
        this._gui.addControl(image)
      }

      image.isVisible = false
    })
  }
}
