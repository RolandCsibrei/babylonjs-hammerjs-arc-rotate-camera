import { Camera, Color4, Engine, HemisphericLight, Scene, Sound, Vector3 } from '@babylonjs/core'

import '@babylonjs/loaders/glTF'

import '@babylonjs/core/Debug/debugLayer'
import '@babylonjs/inspector'
import * as GUI from '@babylonjs/gui'

export const MODEL_BASE = '/models/'
export const TEXTURE_BASE = '/textures/'
export const EARTH_MODEL_FILENAME = 'earth.glb'
export const SUN_MODEL_FILENAME = 'sun.glb'
export const STARS_TEXTURE_FILENAME = `${TEXTURE_BASE}stars.jpg`
export class BaseScene {
  private _introMusic?: Sound
  _camera: Camera | null = null
  _scene: Scene
  _engine: Engine
  _gui!: GUI.AdvancedDynamicTexture

  public getEngine() {
    return this._engine
  }

  constructor(public _canvas: HTMLCanvasElement) {
    this._engine = this.createEngine(_canvas)
    this._scene = this.createScene(this._engine)
    this._gui = this._createGui(this._scene)
  }

  private _createGui(scene: Scene) {
    const gui = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene)
    return gui
  }

  public async initScene() {
    this._scene.clearColor = new Color4(0, 0, 0, 1)

    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this._scene)
    light.intensity = 0.7

    //

    await this._scene.debugLayer.show({
      embedMode: true
    })
    // this._scene.debugLayer.select(nodeMaterial);
  }

  public startScene() {
    this.setupRenderLoop()
  }

  public toFullScreen() {
    this._engine.switchFullscreen(false)
  }

  createEngine(canvas: HTMLCanvasElement) {
    const engine = new Engine(canvas)
    return engine
  }

  createScene(engine: Engine) {
    const scene = new Scene(engine)
    return scene
  }

  protected setupRenderLoop() {
    this._engine.runRenderLoop(() => {
      this._scene.render()
    })
  }

  public async showDebug() {
    await this._scene.debugLayer.show({
      embedMode: false,
      overlay: true
    })
    // this._scene.debugLayer.select(nodeMaterial);
  }

  public loadIntroMusic(callback: () => void) {
    const introMusic = new Sound(
      'intro-music',
      'audio/intro-music.mp3',
      this._scene,
      () => {
        this._introMusic = introMusic
        callback()
      },
      { loop: false, autoplay: false }
    )
  }

  public playIntroMusic() {
    this._introMusic?.play()
  }

  public stopIntroMusic() {
    this._introMusic?.stop()
  }
}
