import { AbstractMesh, Camera, Color3, Engine, Matrix, Mesh, Scalar, Scene, Vector2, Vector3, VertexBuffer } from '@babylonjs/core'

export const screenToWorld = function(x: number, y: number, z: number, engine: Engine, scene: Scene): Vector3 {
  const screenPosition = new Vector3(x, y, z)
  const viewMatrix = scene.getViewMatrix()
  const projectionMatrix = scene.getProjectionMatrix()
  if (!viewMatrix || !projectionMatrix) {
    return Vector3.Zero()
  }
  const vector = Vector3.Unproject(screenPosition, engine.getRenderWidth(), engine.getRenderHeight(), Matrix.Identity(), viewMatrix, projectionMatrix)
  return vector
}

export const worldToScreen = function(mesh: AbstractMesh, engine: Engine, scene: Scene, camera: Camera): Vector2 {
  const worldPosition = mesh.getAbsolutePosition()
  const vector3 = Vector3.Project(
    worldPosition,
    Matrix.Identity(),
    scene.getTransformMatrix(),
    camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
  )

  const vector2 = new Vector2(vector3.x, vector3.y)
  return vector2
}

export const createSurfacePoints = function(mesh: Mesh, nbPoints: number) {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)
  if (!positions) {
    console.warn('No vertices data')
    return
  }
  const uvs = mesh.getVerticesData(VertexBuffer.UVKind)
  if (!uvs) {
    console.warn('No UVs')
    return
  }

  const indices = mesh.getIndices()
  if (!indices) {
    console.warn('No indices')
    return
  }
  const point = Vector3.Zero()
  const points = []
  const uvdata = []

  const randX = 0
  const randY = 0
  const randZ = 0

  const index = 0
  let id0 = 0
  let id1 = 0
  let id2 = 0
  let v0X = 0
  let v0Y = 0
  let v0Z = 0
  let v1X = 0
  let v1Y = 0
  let v1Z = 0
  let v2X = 0
  let v2Y = 0
  let v2Z = 0
  const vertex0 = Vector3.Zero()
  const vertex1 = Vector3.Zero()
  const vertex2 = Vector3.Zero()
  const vec0 = Vector3.Zero()
  const vec1 = Vector3.Zero()
  const vec2 = Vector3.Zero()

  let uv0X = 0
  let uv0Y = 0
  let uv1X = 0
  let uv1Y = 0
  let uv2X = 0
  let uv2Y = 0
  const uv0 = Vector2.Zero()
  const uv1 = Vector2.Zero()
  const uv2 = Vector2.Zero()
  const uvec0 = Vector2.Zero()
  const uvec1 = Vector2.Zero()

  let a = 0 //length of side of triangle
  let b = 0 //length of side of triangle
  let c = 0 //length of side of triangle
  let p = 0 //perimeter of triangle
  let area = 0
  //let nbPoints = 0; //nbPoints per triangle

  let lamda = 0
  let mu = 0

  let surfaceArea = 0
  const areas = []
  let density = []

  let facetPoint = Vector3.Zero()
  let colorPoint = Vector2.Zero()
  const pointcolors = {}

  const nbFacets = indices.length / 3

  //surface area
  for (let index = 0; index < nbFacets; index++) {
    id0 = indices[3 * index]
    id1 = indices[3 * index + 1]
    id2 = indices[3 * index + 2]
    v0X = positions[3 * id0]
    v0Y = positions[3 * id0 + 1]
    v0Z = positions[3 * id0 + 2]
    v1X = positions[3 * id1]
    v1Y = positions[3 * id1 + 1]
    v1Z = positions[3 * id1 + 2]
    v2X = positions[3 * id2]
    v2Y = positions[3 * id2 + 1]
    v2Z = positions[3 * id2 + 2]
    vertex0.set(v0X, v0Y, v0Z)
    vertex1.set(v1X, v1Y, v1Z)
    vertex2.set(v2X, v2Y, v2Z)
    vertex1.subtractToRef(vertex0, vec0)
    vertex2.subtractToRef(vertex1, vec1)
    vertex2.subtractToRef(vertex0, vec2)
    a = vec0.length()
    b = vec1.length()
    c = vec2.length()
    p = (a + b + c) / 2
    area = Math.sqrt(p * (p - a) * (p - b) * (p - c))
    surfaceArea += area
    areas[index] = area
  }
  let pointCount = 0
  for (let index = 0; index < nbFacets; index++) {
    density[index] = Math.floor((nbPoints * areas[index]) / surfaceArea)
    pointCount += density[index]
  }

  const diff = nbPoints - pointCount
  const pointsPerFacet = Math.floor(diff / nbFacets)
  const addPoints = diff % nbFacets

  if (pointsPerFacet > 0) {
    density = density.map(x => x + pointsPerFacet)
  }

  for (let index = 0; index < addPoints; index++) {
    density[index] += 1
  }

  for (let index = 0; index < indices.length / 3; index++) {
    id0 = indices[3 * index]
    id1 = indices[3 * index + 1]
    id2 = indices[3 * index + 2]
    v0X = positions[3 * id0]
    v0Y = positions[3 * id0 + 1]
    v0Z = positions[3 * id0 + 2]
    v1X = positions[3 * id1]
    v1Y = positions[3 * id1 + 1]
    v1Z = positions[3 * id1 + 2]
    v2X = positions[3 * id2]
    v2Y = positions[3 * id2 + 1]
    v2Z = positions[3 * id2 + 2]
    vertex0.set(v0X, v0Y, v0Z)
    vertex1.set(v1X, v1Y, v1Z)
    vertex2.set(v2X, v2Y, v2Z)
    vertex1.subtractToRef(vertex0, vec0)
    vertex2.subtractToRef(vertex1, vec1)
    a = vec0.length()
    b = vec1.length()

    uv0X = uvs[2 * id0]
    uv0Y = uvs[2 * id0 + 1]
    uv1X = uvs[2 * id1]
    uv1Y = uvs[2 * id1 + 1]
    uv2X = uvs[2 * id2]
    uv2Y = uvs[2 * id2 + 1]
    uv0.set(uv0X, uv0Y)
    uv1.set(uv1X, uv1Y)
    uv2.set(uv2X, uv2Y)
    uv1.subtractToRef(uv0, uvec0)
    uv2.subtractToRef(uv1, uvec1)
    for (let i = 0; i < density[index]; i++) {
      //form a point inside the facet v0, v1, v2;
      lamda = Scalar.RandomRange(0, 1)
      mu = Scalar.RandomRange(0, 1)
      facetPoint = vertex0.add(vec0.scale(lamda)).add(vec1.scale(lamda * mu))
      points.push(facetPoint.x, facetPoint.y, facetPoint.z)
      colorPoint = uv0.add(uvec0.scale(lamda)).add(uvec1.scale(lamda * mu))
      uvdata.push(colorPoint.x, colorPoint.y)
    }
  }

  return { points: points, uvs: uvdata }
}

export const colorGradient = (fadeFraction: number, rgbColor1: Color3, rgbColor2: Color3, rgbColor3?: Color3) => {
  let color1 = rgbColor1
  let color2 = rgbColor2
  let fade = fadeFraction

  // Do we have 3 colors for the gradient? Need to adjust the params.
  if (rgbColor3) {
    fade = fade * 2

    // Find which interval to use and adjust the fade percentage
    if (fade >= 1) {
      fade -= 1
      color1 = rgbColor2
      color2 = rgbColor3
    }
  }

  const diffRed = color2.r - color1.r
  const diffGreen = color2.g - color1.g
  const diffBlue = color2.b - color1.b

  const gradient = {
    r: color1.r + diffRed * fade,
    g: color1.g + diffGreen * fade,
    b: color1.b + diffBlue * fade
  }

  return gradient
}
