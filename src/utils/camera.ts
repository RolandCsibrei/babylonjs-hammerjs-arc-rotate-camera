import { Animation, ArcRotateCamera, CubicEase, EasingFunction, Matrix, Mesh, Scene, Vector3 } from '@babylonjs/core'

export const forceRebuild = function(eventData: Scene) {
  const camera = eventData.activeCamera
  if (camera instanceof ArcRotateCamera) {
    camera.rebuildAnglesAndRadius()
  }
}

export const moveCameraTo = function(
  camera: ArcRotateCamera,
  position: Vector3 | null = null,
  target: Vector3 | null = null,
  alpha: number | null = null,
  beta: number | null = null,
  radius: number | null = null,
  speed: number | null = 60,
  frameCount: number | null = 60,
  callBack?: (() => void) | undefined
) {
  const animNames: string[] = []

  // TODO: check for all arguments and return immediatelly if all null
  if (speed === null) speed = 60
  if (frameCount === null) frameCount = 60

  const scene = camera.getScene()

  const endPosition = position
  const endTarget = target || camera.target

  if (endPosition !== null && endTarget !== null) {
    if (Vector3.Distance(camera.position, endPosition) < 1 && Vector3.Distance(camera.target, endTarget) < 1) {
      return
    }
  }
  if (alpha === null && beta === null && radius == null) {
    scene.onBeforeRenderObservable.add(forceRebuild)
  }

  const ease = new CubicEase()
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT)

  if (target && alpha === null && beta === null && radius === null) {
    // console.log('animating target', camera.target, target)
    animNames.push('target')
    target = target.clone()
    Animation.CreateAndStartAnimation('cameraAnimTarget', camera, 'target', speed, frameCount, camera.target.clone(), target, 0, ease, () => {
      animFinished('target', animNames, callBack, scene)
    })
  }

  if (position !== null) {
    animNames.push('position')

    Animation.CreateAndStartAnimation('cameraAnim', camera, 'position', speed, frameCount, camera.position.clone(), position, 0, ease, () => {
      animFinished('position', animNames, callBack, scene)
    })
  }

  if (alpha !== null) {
    animNames.push('alpha')

    Animation.CreateAndStartAnimation('cameraAnim', camera, 'alpha', speed, frameCount, camera.alpha, alpha, 0, ease, () => {
      animFinished('alpha', animNames, callBack, scene)
    })
  }

  if (beta !== null) {
    animNames.push('beta')

    Animation.CreateAndStartAnimation('cameraAnim', camera, 'beta', speed, frameCount, camera.beta, beta, 0, ease, () => {
      animFinished('beta', animNames, callBack, scene)
    })
  }

  if (radius !== null) {
    animNames.push('radius')

    Animation.CreateAndStartAnimation('cameraAnim', camera, 'radius', speed, frameCount, camera.radius, radius, 0, ease, () => {
      animFinished('radius', animNames, callBack, scene)
    })
  }
}

const animFinished = (name: string, animNames: string[], callback: (() => void) | undefined, scene: Scene) => {
  animNames.splice(animNames.indexOf(name), 1)
  const allFinished = animNames.length === 0
  if (allFinished) {
    if (callback) callback()
    scene.onBeforeRenderObservable.removeCallback(forceRebuild)
  }
}

export const getFixedPosition = (fromLeft: number, fromTop: number, meshWidthInPixels: number, camera: ArcRotateCamera, scene: Scene) => {
  const invertCameraViewProj = Matrix.Invert(camera.getTransformationMatrix())
  const screenWidth = scene.getEngine().getRenderWidth(true)
  camera.getViewMatrix()

  const h = meshWidthInPixels / screenWidth

  const depth = 1.8
  const p = new Vector3(-1, -1, -1 + depth)
  const q = new Vector3(-1 + 2 * h, -1, -1 + depth)

  const pt = Vector3.TransformCoordinates(p, invertCameraViewProj)
  const qt = Vector3.TransformCoordinates(q, invertCameraViewProj)

  // const sizes = this._getBounding(mesh);

  const d = qt.subtract(pt).length() * 0.4

  p.x = -1 + h * fromLeft + h
  p.y = 1 - h * fromTop - h

  return {
    scaling: new Vector3(d, d, d),
    position: Vector3.TransformCoordinates(p, invertCameraViewProj),
    rotation: camera.rotation
  }
}

export const setFixedPosition = (mesh: Mesh, fromLeft: number, fromTop: number, meshWidthInPixels: number, camera: ArcRotateCamera, scene: Scene) => {
  const info = getFixedPosition(fromLeft, fromTop, meshWidthInPixels, camera, scene)
  mesh.scaling = info.scaling
  mesh.rotation = info.rotation
  mesh.position = info.position
}
