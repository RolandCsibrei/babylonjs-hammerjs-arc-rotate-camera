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

import { BaseScene } from './BaseScene'
import { GridMaterial } from '@babylonjs/materials'
import { ArcRotateCameraHammerJsInput } from 'src/utils/ArcRotateCameraHammerJsInput'

export class HammerJsInputTestScene extends BaseScene {
  private _cameraParent!: TransformNode

  private _target: Vector3 = new Vector3(0, 0, 0)
  private _position: Vector3 = new Vector3(0, 0, 0)

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

    const radius = 80
    const count = loaded.meshes.length
    for (let i = 1; i < count; i++) {
      const mesh = loaded.meshes[i]

      const alpha = ((Math.PI * 2) / (count - 1)) * (i - 1)
      mesh.isPickable = true
      const c = Math.cos(alpha) * radius
      const s = Math.sin(alpha) * radius
      const x1 = 1
      const y1 = 1
      const x2 = c * x1 - s * y1
      const y2 = s * x1 + c * y1

      mesh.rotation = new Vector3(0, 0, 0)
      mesh.rotation.x = 0

      mesh.position = new Vector3(x2, 0, y2)
      mesh.lookAt(new Vector3(0, 0, 0))
      mesh.rotation.x = 0
      mesh.position.y = 0

      const material = new StandardMaterial('material', this._scene)
      material.emissiveColor = Color3.Random()
      mesh.material = material
    }

    return loaded.meshes
  }

  private async _createDemo() {
    await this._loadMeshes()
    this._createObjects()
    await this._createSkyBox()

    // await this._scene.debugLayer.show({
    //   embedMode: false,
    //   overlay: true
    // })
  }

  private async _createSkyBox(): Promise<void> {
    return new Promise((resolve, reject) => {
      const skybox = MeshBuilder.CreateBox('skyBox', { size: 2000.0 }, this._scene)
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

    const ground = MeshBuilder.CreateGround('ground', { height: 1000, width: 1000 }, this._scene)
    ground.material = groundMaterial
    ground.visibility = 0.5
    ground.position.y = -40

    //

    new AxesViewer(this._scene, 10)
  }

  async createCamera() {
    const camera = new ArcRotateCamera('camera', 0, 1.2, 200, new Vector3(15, 5, 0), this._scene)

    camera.minZ = 0.1
    camera.maxZ = 2200
    camera.lowerBetaLimit = 0.4
    camera.upperBetaLimit = 1.55
    camera.lowerRadiusLimit = 2
    camera.upperRadiusLimit = 1200

    camera.attachControl(true, true, 0)

    const input = new ArcRotateCameraHammerJsInput()
    camera.inputs.removeByType('ArcRotateCameraPointersInput')
    camera.inputs.add(input)

    await input.setDebugMode(true)

    this._camera = camera
  }

  createLight() {
    const light = new HemisphericLight('light', new Vector3(-1, 0, -1), this._scene)
    light.intensity = 0.3
  }

  public async initScene() {
    this._scene.clearColor = new Color4(0, 0, 0, 1)

    await this.createCamera()
    this.createLight()

    await this._createDemo()
  }
}
