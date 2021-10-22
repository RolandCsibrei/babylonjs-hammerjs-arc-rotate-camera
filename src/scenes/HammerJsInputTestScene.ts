/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Dude Particle Shooter , Roland Csibrei, 2021

import {
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  Color4,
  CubeTexture,
  TransformNode,
  Mesh,
  Color3,
  MeshBuilder,
  StandardMaterial,
  Texture
} from '@babylonjs/core'
import '@babylonjs/loaders'

import { moveCameraTo } from '../utils/camera'
import { ArcRotateCameraHammerJsInput } from '../utils/ArcRotateCameraHammerJsInput'
import { BaseScene } from './BaseScene'
import { GridMaterial } from '@babylonjs/materials'

export class HammerJsInputTestScene extends BaseScene {
  private _cameraParent!: TransformNode

  private get _arcCamera() {
    return <ArcRotateCamera>this._camera
  }

  constructor(canvas: HTMLCanvasElement) {
    super(canvas)
  }

  public setupRenderLoop() {
    this._engine.runRenderLoop(() => {
      this._scene.render()
    })
  }

  private async _createDemo() {
    this._createObjects()
    await this._createSkyBox()
  }

  private async _createSkyBox(): Promise<void> {
    return new Promise((resolve, reject) => {
      const skybox = MeshBuilder.CreateBox('skyBox', { size: 10000.0 }, this._scene)
      const skyboxMaterial = new StandardMaterial('skyBox', this._scene)
      skyboxMaterial.backFaceCulling = false
      const files = [
        'textures/space_left.jpg',
        'textures/space_up.jpg',
        'textures/space_front.jpg',
        'textures/space_right.jpg',
        'textures/space_down.jpg',
        'textures/space_back.jpg'
      ]
      const reflectionTexture = CubeTexture.CreateFromImages(files, this._scene)
      // not working
      // const reflectionTexture = new CubeTexture('', this._scene, null, undefined, files, () => {

      reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE
      skyboxMaterial.reflectionTexture = reflectionTexture
      skyboxMaterial.disableLighting = true
      skyboxMaterial.diffuseColor = new Color3(0, 0, 0)
      skyboxMaterial.specularColor = new Color3(0, 0, 0)
      skybox.material = skyboxMaterial
      resolve()
      // })

      setTimeout(() => {
        reject()
      }, 60000)
    })
  }

  private _createObjects() {
    const parent = new TransformNode('objects-parent', this._scene)
    parent.position.y = 2

    const groundMaterial = new GridMaterial('groundMaterial', this._scene)

    const ground = MeshBuilder.CreateGround('ground', { height: 100, width: 100 }, this._scene)
    ground.material = groundMaterial

    //
    const boxMaterial = new StandardMaterial('boxMaterial', this._scene)
    boxMaterial.emissiveColor = Color3.Red().scale(0.4)

    const box = MeshBuilder.CreateBox('box', { size: 4 }, this._scene)
    box.parent = parent
    box.material = boxMaterial
    box.position.x = -8

    //

    const sphereMaterial = new StandardMaterial('sphereMaterial', this._scene)
    sphereMaterial.emissiveColor = Color3.Green().scale(0.4)

    const sphere = Mesh.CreateSphere('box', 32, 4, this._scene)
    sphere.parent = parent
    sphere.material = sphereMaterial

    //

    const kokkiMaterial = new StandardMaterial('kokkiMaterial', this._scene)
    kokkiMaterial.emissiveColor = Color3.Blue().scale(0.4)

    const kokki = MeshBuilder.CreateCylinder('kokki', { diameterTop: 0, diameterBottom: 4, height: 4 }, this._scene)
    kokki.parent = parent
    kokki.material = kokkiMaterial
    kokki.position.x = 8
  }

  createCamera() {
    const cameraParent = new TransformNode('cameraParent', this._scene)
    this._cameraParent = cameraParent

    const camera = new ArcRotateCamera('camera', 2, 1, 60, new Vector3(0, 0, 0), this._scene)
    camera.parent = cameraParent

    camera.inputs.clear()
    camera.inputs.add(new ArcRotateCameraHammerJsInput())

    camera.attachControl(this._canvas, true)

    // camera.lowerBetaLimit = 0.4
    // camera.upperBetaLimit = 1.55
    // camera.lowerRadiusLimit = 120
    // camera.upperRadiusLimit = 1200

    // camera.inertia = 0.8
    // camera.speed = 0.05
    // camera.angularSensibilityX = 2000
    // camera.angularSensibilityY = 2000
    // camera.panningSensibility = 3000
    // camera.pinchDeltaPercentage = 0.2
    // camera.wheelDeltaPercentage = 0.2
    // camera.speed = 0.05

    this._camera = camera
  }

  createLight() {
    const light = new HemisphericLight('light', new Vector3(-1, 0, -1), this._scene)
    light.intensity = 0.3
  }

  public async initScene() {
    this._scene.clearColor = new Color4(0, 0, 0, 1)

    this.createCamera()
    this.createLight()

    await this._createDemo()
  }

  private _animateCamera(alpha: number, beta: number, radius: number, target?: Vector3) {
    const arcCamera = <ArcRotateCamera>this._camera
    moveCameraTo(arcCamera, null, target, alpha, beta, radius)
  }
}
