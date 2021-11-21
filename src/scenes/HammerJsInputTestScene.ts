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
  Texture,
  FreeCamera,
  AxesViewer,
  Scalar,
  SceneLoader
} from '@babylonjs/core'
import '@babylonjs/loaders'

import { moveCameraTo } from '../utils/camera'
import { HammerJsInput, HammerJsInputInfo } from '../utils/HammerJsInput'
import { BaseScene } from './BaseScene'
import { GridMaterial } from '@babylonjs/materials'

export class HammerJsInputTestScene extends BaseScene {
  private _cameraParent!: TransformNode

  private _target: Vector3 = new Vector3(0, 0, 0)
  private _position: Vector3 = new Vector3(0, 0, 0)

  private get _freeCamera() {
    return <FreeCamera>this._camera
  }

  constructor(canvas: HTMLCanvasElement) {
    super(canvas)
  }

  public setupRenderLoop() {
    this._engine.runRenderLoop(() => {
      this._scene.render()
    })
  }

  private async _loadMeshes() {
    const loaded = await SceneLoader.ImportMeshAsync('', '3dmodels/', 'pokemons.glb', this._scene)
    // this._dudeMeshes = loaded.meshes
    return loaded.meshes
  }

  private async _createDemo() {
    await this._loadMeshes()
    this._createObjects()
    await this._createSkyBox()

    await this._scene.debugLayer.show({
      embedMode: false,
      overlay: true
    })
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
    ground.visibility = 0.5

    //
    const boxMaterial = new StandardMaterial('boxMaterial', this._scene)
    boxMaterial.emissiveColor = Color3.Red().scale(0.4)

    const box = MeshBuilder.CreateBox('box', { size: 8 }, this._scene)
    // box.parent = parent
    box.position.x = -12
    box.material = boxMaterial

    const markerPosition = MeshBuilder.CreateCylinder('markerPosition', { diameterTop: 0, diameterBottom: 4, height: 20 }, this._scene)
    markerPosition.rotation.x = Math.PI / 2
    markerPosition.bakeCurrentTransformIntoVertices()
    markerPosition.position = this._freeCamera.getFrontPosition(100)
    markerPosition.lookAt(this._freeCamera.target)
    markerPosition.position.y = 10
    const markerTarget = MeshBuilder.CreateCylinder('markerTarget', { diameterTop: 0, diameterBottom: 4, height: 12 }, this._scene)
    markerTarget.position = this._freeCamera.target.clone()
    // box.parent = parent

    //

    const sphereMaterial = new StandardMaterial('sphereMaterial', this._scene)
    sphereMaterial.emissiveColor = Color3.Green().scale(0.4)

    markerPosition.material = boxMaterial
    markerTarget.material = sphereMaterial

    const sphere = Mesh.CreateSphere('sphere', 32, 6, this._scene)
    sphere.parent = parent
    sphere.material = sphereMaterial

    //

    const kokkiMaterial = new StandardMaterial('kokkiMaterial', this._scene)
    kokkiMaterial.emissiveColor = Color3.Blue().scale(0.4)

    const kokki = MeshBuilder.CreateCylinder('kokki', { diameterTop: 0, diameterBottom: 4, height: 4 }, this._scene)
    kokki.parent = parent
    kokki.material = kokkiMaterial
    kokki.position.x = 10

    //

    new AxesViewer(this._scene, 10)
  }

  private _processInput(info: HammerJsInputInfo) {
    console.log(info)
    const markerPosition = this._scene.getMeshByName('markerPosition')
    if (markerPosition) {
      markerPosition.parent = info.positionTransform
    }
    const markerTarget = this._scene.getMeshByName('markerTarget')
    if (markerTarget) {
      markerTarget.parent = info.targetTransform
      markerTarget.position.y = 10
    }

    const panLerpFactor = 0.0005
    // this._freeCamera.parent = info.targetTransform
    this._scene.onBeforeRenderObservable.add(() => {
      // this._freeCamera.position = Vector3.Lerp(this._freeCamera.position, info.positionTransform.position, panLerpFactor)

      this._freeCamera.position = info.positionTransform.position.clone()
      this._freeCamera.lockedTarget = info.targetTransform.position.clone()

      // if (this._panRequired) {
      // this._freeCamera.target.x = info.targetTransform.position.x
      // this._freeCamera.target.z = info.targetTransform.position.z
      // this._freeCamera.position.x = info.viewerTranform.position.x
      // this._freeCamera.position.z = info.viewerTranform.position.z
      // box.scalingDeterminant = info.targetRadius / 50
      // box.position.x = info.viewerTranform.position.x
      // box.position.z = info.viewerTranform.position.z
    })

    //
  }

  createCamera() {
    const camera = new FreeCamera('camera', new Vector3(0, 140, 0), this._scene)
    camera.target = new Vector3(0, 0, 0.1)

    // add hammer js input
    console.log(camera.inputs)
    camera.inputs.removeByType('FreeCameraMouseInput')
    camera.attachControl(this._canvas, true)

    const r = camera.position.subtract(camera.target)

    const alpha = Math.atan2(r.y, r.x)
    const beta = 0
    const distance = 144

    const rotation = new Vector3(alpha, beta, 0)
    console.log('rotation', rotation)
    const hammerJsInput = new HammerJsInput(this._position, this._target, rotation, distance, info => {
      this._processInput(info)
    })
    hammerJsInput.setDebugMode(this._scene, true, false)
    hammerJsInput.attachControl(this._canvas)

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
