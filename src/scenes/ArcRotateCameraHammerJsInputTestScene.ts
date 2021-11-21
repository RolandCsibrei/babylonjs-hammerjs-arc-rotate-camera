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
  SceneLoader,
  NodeMaterial,
  PBRMaterial,
  MirrorTexture,
  Plane,
  AbstractMesh,
  MotionBlurPostProcess,
  DefaultRenderingPipeline,
  ShadowGenerator,
  PointLight,
  DirectionalLight
} from '@babylonjs/core'
import '@babylonjs/loaders'

import { moveCameraTo } from '../utils/camera'
import { ArcRotateCameraHammerJsInput } from '../utils/ArcRotateCameraHammerJsInput'
import { BaseScene } from './BaseScene'
import { GridMaterial } from '@babylonjs/materials'

export class HammerJsInputTestScene extends BaseScene {
  private _reflectionTexture!: MirrorTexture
  private _reflectionTextureRenderList!: AbstractMesh[]

  private _cameraParent!: TransformNode
  private _mb!: MotionBlurPostProcess
  private _shadowGenerator?: ShadowGenerator
  private _lightForShadows?: DirectionalLight

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

  private async _loadMeshes() {
    // const snippetId = 'KIUSWC#67'
    // const matDiamond = await NodeMaterial.ParseFromSnippetAsync(snippetId, this._scene)

    const loaded = await SceneLoader.ImportMeshAsync('', '3dmodels/', 'pokemons.glb', this._scene)
    // this._dudeMeshes = loaded.meshes
    loaded.meshes[0].name = 'pokemons'
    const radius = 90

    for (let i = 1; i < loaded.meshes.length; i++) {
      const mesh = loaded.meshes[i]
      mesh.name = `pokemon-${mesh.name}`
      const alpha = ((Math.PI * 2) / (loaded.meshes.length - 1)) * (i - 1)
      const c = Math.cos(alpha) * radius
      const s = Math.sin(alpha) * radius
      const x1 = 1
      const y1 = 1
      const x2 = c * x1 - s * y1
      const y2 = s * x1 + c * y1

      mesh.position.x = x2
      mesh.position.z = y2
      mesh.rotation = new Vector3(0, 0, 0)
      mesh.lookAt(new Vector3(0, 0, 0))
      mesh.rotation.x = 0
      // mesh.position.y = -10

      const material = new PBRMaterial(`material${i}`, this._scene)
      // material.ambientColor = Color3.Random()
      material.albedoColor = Color3.Random()
      material.metallic = 0.3
      material.roughness = 0.4
      mesh.material = material

      mesh.isPickable = true
      // mesh.alphaIndex = 2
      this._reflectionTextureRenderList.push(mesh)
      if (this._shadowGenerator) {
        this._shadowGenerator.addShadowCaster(mesh)
      }
    }

    this._scene.onPointerPick = (e, pick) => {
      if (pick.pickedMesh?.name.startsWith('pokemon')) {
        console.log(pick.pickedMesh.name)
        const mesh = pick.pickedMesh
        mesh.renderOutline = true
        mesh.outlineColor = new Color3(1, 1, 1)
        mesh.outlineWidth = 0.6
      }
    }

    return loaded.meshes
  }

  private async _createDemo() {
    this._createShadowGenerator()
    this._createGround()
    await this._loadMeshes()
    this._createObjects()
    await this._createSkyBox()

    await this._scene.debugLayer.show({
      embedMode: false,
      overlay: true
    })
  }

  private _createShadowGenerator() {
    if (!this._lightForShadows) {
      return
    }
    const shadowGenerator = new ShadowGenerator(2048, this._lightForShadows)
    shadowGenerator.usePoissonSampling = true
    shadowGenerator.useKernelBlur = true
    shadowGenerator.blurKernel = 64
    shadowGenerator.usePercentageCloserFiltering = true
    shadowGenerator.useContactHardeningShadow = true
    shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_HIGH
    shadowGenerator.contactHardeningLightSizeUVRatio = 0.3
    this._shadowGenerator = shadowGenerator
  }

  private _createGround() {
    const ground = MeshBuilder.CreateGround('ground', { width: 400, height: 400 }, this._scene)
    ground.receiveShadows = true

    // ground.position.y = 10
    ground.alphaIndex = 0

    const mirrorMaterial = new StandardMaterial('mirror', this._scene)
    const groundTexture = new Texture('textures/HexagonGrid-inverted.png', this._scene)
    mirrorMaterial.emissiveTexture = groundTexture
    groundTexture.uScale = 4
    groundTexture.vScale = 4
    groundTexture.level = 0.6

    ground.computeWorldMatrix(true)
    const groundWorldMatrix = ground.getWorldMatrix()

    const groundVertexData = ground.getVerticesData('normal')
    mirrorMaterial.emissiveColor = new Color3(0, 0, 0.43)
    mirrorMaterial.backFaceCulling = false

    const reflectionTexture = new MirrorTexture('mirror', 1024, this._scene, true)
    this._reflectionTexture = reflectionTexture
    const reflectionTextureRenderList = reflectionTexture.renderList ?? []
    this._reflectionTextureRenderList = reflectionTextureRenderList
    if (groundVertexData) {
      const groundNormal = Vector3.TransformNormal(new Vector3(groundVertexData[0], groundVertexData[1], groundVertexData[2]), groundWorldMatrix)

      const reflector = Plane.FromPositionAndNormal(ground.position, groundNormal.scale(-1))
      mirrorMaterial.reflectionTexture = reflectionTexture
      reflectionTexture.adaptiveBlurKernel = 16
      reflectionTexture.mirrorPlane = reflector

      mirrorMaterial.reflectionTexture.level = 0.24
      mirrorMaterial.disableLighting = true
      mirrorMaterial.alpha = 0.12
      ground.material = mirrorMaterial
    }
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

    // const groundMaterial = new GridMaterial('groundMaterial', this._scene)
    // groundMaterial.gridRatio = 10
    // const ground = MeshBuilder.CreateGround('ground', { height: 1000, width: 1000 }, this._scene)
    // ground.position.y = -0.3
    // ground.material = groundMaterial

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

    const camera = new ArcRotateCamera('camera', 0, 1, 260, new Vector3(0, 0, 0), this._scene)
    camera.minZ = 0.01
    camera.parent = cameraParent

    // remove mouse input
    camera.inputs.removeByType('ArcRotateCameraPointersInput')
    // add hammer js input
    const hammerJsInput = new ArcRotateCameraHammerJsInput()
    camera.inputs.add(hammerJsInput)
    hammerJsInput.setDebugMode(false, false)

    camera.attachControl(this._canvas, true)

    // camera.mapPanning = true
    // camera.panningInertia = 0.85
    // camera.panningSensibility = 400
    // camera.angularSensibilityX = 4000

    camera.lowerBetaLimit = 0.4
    camera.upperBetaLimit = 1.55
    camera.lowerRadiusLimit = 2
    camera.upperRadiusLimit = 1200

    // camera.inertia = 0.8
    // camera.speed = 0.05
    // camera.angularSensibilityX = 2000
    // camera.angularSensibilityY = 2000
    // camera.panningSensibility = 3000
    // camera.pinchDeltaPercentage = 0.2
    // camera.wheelDeltaPercentage = 0.2
    // camera.speed = 0.05

    this._camera = camera

    let oldAlpha = this._arcCamera.alpha
    this._scene.onBeforeRenderObservable.add(() => {
      const diffAlpha = Math.abs(this._arcCamera.alpha - oldAlpha)
      if (this._mb) {
        this._mb.motionStrength = 1 + diffAlpha * 70
      }
      oldAlpha = this._arcCamera.alpha
    })
  }

  createLight() {
    const light = new HemisphericLight('light', new Vector3(-1, 0, -1), this._scene)
    light.intensity = 0.3

    // const dirLight = new DirectionalLight('directionalLight', new Vector3(1, -1, -1), this._scene)
    // dirLight.intensity = 2
    // dirLight.position = new Vector3(-260, 260, 260)
    // this._lightForShadows = dirLight

    const hdrTexture = CubeTexture.CreateFromPrefilteredData('env/decor-shop.env', this._scene)
    this._scene.environmentTexture = hdrTexture
  }

  public async initScene() {
    this._scene.clearColor = new Color4(0, 0, 0, 1)

    this.createCamera()
    this.createLight()

    await this._createDemo()

    const pipeline = new DefaultRenderingPipeline(
      'defaultPipeline', // The name of the pipeline
      false, // Do you want the pipeline to use HDR texture?
      this._scene, // The scene instance
      [this._arcCamera] // The list of cameras to be attached to
    )
    pipeline.fxaaEnabled = true
    pipeline.samples = 4

    this._mb = new MotionBlurPostProcess('motionBlur', this._scene, 1, this._camera)
  }

  private _animateCamera(alpha: number, beta: number, radius: number, target?: Vector3) {
    const arcCamera = <ArcRotateCamera>this._camera
    moveCameraTo(arcCamera, null, target, alpha, beta, radius)
  }
}
