// You have to create a function called createScene. This function must return a BABYLON.Scene object
// You can reference the following variables: scene, canvas
// You must at least define a camera

var createScene = function() {
  //Scene

  var scene = new BABYLON.Scene(engine)
  scene.ambientColor = new BABYLON.Color3(1, 1, 1)
  scene.gravity = new BABYLON.Vector3(0, -0.75, 0)
  scene.collisionsEnabled = true
  scene.enablePhysics()

  //Camera

  // Parameters : name, position, scene
  var camera = new BABYLON.UniversalCamera('UniversalCamera', new BABYLON.Vector3(0, 2, -25), scene)

  // Targets the camera to a particular position. In this case the scene origin
  camera.setTarget(BABYLON.Vector3.Zero())

  // Attach the camera to the canvas
  camera.applyGravity = true
  camera.ellipsoid = new BABYLON.Vector3(0.4, 0.8, 0.4)
  camera.checkCollisions = true
  camera.attachControl(canvas, true)

  //Hero

  var hero = BABYLON.Mesh.CreateBox('hero', 2.0, scene, false, BABYLON.Mesh.FRONTSIDE)
  hero.position.x = 0.0
  hero.position.y = 1.0
  hero.position.z = 0.0
  hero.physicsImpostor = new BABYLON.PhysicsImpostor(hero, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, restitution: 0.0, friction: 0.1 }, scene)
  // hero.physicsImpostor.physicsBody.fixedRotation = true;
  // hero.physicsImpostor.physicsBody.updateMassProperties();

  // pointer
  var pointer = BABYLON.Mesh.CreateSphere('Sphere', 16.0, 0.01, scene, false, BABYLON.Mesh.DOUBLESIDE)
  // move the sphere upward 1/2 of its height
  pointer.position.x = 0.0
  pointer.position.y = 0.0
  pointer.position.z = 0.0
  pointer.isPickable = false

  var moveForward = false
  var moveBackward = false
  var moveRight = false
  var moveLeft = false

  var onKeyDown = function(event) {
    switch (event.keyCode) {
      case 38: // up
      case 87: // w
        moveForward = true
        break

      case 37: // left
      case 65: // a
        moveLeft = true
        break

      case 40: // down
      case 83: // s
        moveBackward = true
        break

      case 39: // right
      case 68: // d
        moveRight = true
        break

      case 32: // space
        break
    }
  }

  var onKeyUp = function(event) {
    switch (event.keyCode) {
      case 38: // up
      case 87: // w
        moveForward = false
        break

      case 37: // left
      case 65: // a
        moveLeft = false
        break

      case 40: // down
      case 83: // a
        moveBackward = false
        break

      case 39: // right
      case 68: // d
        moveRight = false
        break
    }
  }

  document.addEventListener('keydown', onKeyDown, false)
  document.addEventListener('keyup', onKeyUp, false)

  scene.registerBeforeRender(function() {
    //Your code here
    //Step
    //let stats = document.getElementById("stats");
    //stats.innerHTML = "";

    camera.position.x = hero.position.x
    camera.position.y = hero.position.y + 1.0
    camera.position.z = hero.position.z
    pointer.position = camera.getTarget()

    var forward = camera
      .getTarget()
      .subtract(camera.position)
      .normalize()
    forward.y = 0
    var right = BABYLON.Vector3.Cross(forward, camera.upVector).normalize()
    right.y = 0

    var SPEED = 20
    let f_speed = 0
    var s_speed = 0
    var u_speed = 0

    if (moveForward) {
      f_speed = SPEED
    }
    if (moveBackward) {
      f_speed = -SPEED
    }

    if (moveRight) {
      s_speed = SPEED
    }

    if (moveLeft) {
      s_speed = -SPEED
    }

    var move = forward
      .scale(f_speed)
      .subtract(right.scale(s_speed))
      .subtract(camera.upVector.scale(u_speed))

    hero.physicsImpostor.physicsBody.velocity.x = move.x
    hero.physicsImpostor.physicsBody.velocity.z = move.z
    hero.physicsImpostor.physicsBody.velocity.y = move.y
  })

  /*//WASD
      camera.keysUp.push(87); 
      camera.keysDown.push(83);            
      camera.keysRight.push(68);
      camera.keysLeft.push(65);
      */

  //Jump
  /* function jump(){
        hero.physicsImpostor.applyImpulse(new BABYLON.Vector3(1, 20, -1), hero.getAbsolutePosition());
      }
  
      document.body.onkeyup = function(e){
        if(e.keyCode == 32){
          //your code
          console.log("jump");
          setTimeout(jump(), 10000); 
  
        }
      }*/

  //Mouse
  //We start without being locked.
  var isLocked = false

  // On click event, request pointer lock
  scene.onPointerDown = function(evt) {
    //true/false check if we're locked, faster than checking pointerlock on each single click.
    if (!isLocked) {
      canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock
      if (canvas.requestPointerLock) {
        canvas.requestPointerLock()
      }
    }

    //continue with shooting requests or whatever :P
    //evt === 1 (mouse wheel click (not scrolling))
    //evt === 2 (right mouse click)
  }

  // Event listener when the pointerlock is updated (or removed by pressing ESC for example).
  var pointerlockchange = function() {
    var controlEnabled =
      document.mozPointerLockElement || document.webkitPointerLockElement || document.msPointerLockElement || document.pointerLockElement || null

    // If the user is already locked
    if (!controlEnabled) {
      //camera.detachControl(canvas);
      isLocked = false
    } else {
      //camera.attachControl(canvas);
      isLocked = true
    }
  }

  // Attach events to the document
  document.addEventListener('pointerlockchange', pointerlockchange, false)
  document.addEventListener('mspointerlockchange', pointerlockchange, false)
  document.addEventListener('mozpointerlockchange', pointerlockchange, false)
  document.addEventListener('webkitpointerlockchange', pointerlockchange, false)

  //Geometry
  //Material
  var myMaterial = new BABYLON.StandardMaterial('myMaterial', scene)
  myMaterial.diffuseColor = new BABYLON.Color3(0, 0, 1)
  myMaterial.specularColor = new BABYLON.Color3(0.5, 0.6, 0.87)
  myMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0)
  myMaterial.ambientColor = new BABYLON.Color3(0.23, 0.98, 0.53)

  //Ground
  var myGround = BABYLON.MeshBuilder.CreateGround('myGround', { width: 200, height: 200, subdivsions: 4 }, scene)
  var groundMaterial = new BABYLON.StandardMaterial('ground', scene)
  myGround.position.y = -1
  myGround.checkCollisions = true
  myGround.physicsImpostor = new BABYLON.PhysicsImpostor(myGround, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.5, friction: 0.1 }, scene)

  //Sphere
  var ball = BABYLON.Mesh.CreateSphere('ball', 30, 2, scene)
  ball.material = myMaterial
  ball.isPickable = true

  ball.position.x = camera.position.x
  ball.position.y = camera.position.y
  ball.position.z = camera.position.z

  // Spheres
  var y = 200
  for (var index = 0; index < 50; index++) {
    var sphere = BABYLON.Mesh.CreateSphere('Sphere0', 16, 3, scene)
    sphere.material = myMaterial

    sphere.position = new BABYLON.Vector3(Math.random() * 20 - 10, y, Math.random() * 10 - 5)

    sphere.physicsImpostor = new BABYLON.PhysicsImpostor(sphere, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1 }, scene)

    sphere.checkCollisions = true

    y += 2
  }

  //Sphere Physics
  sphere.checkCollisions = true
  sphere.physicsImpostor = new BABYLON.PhysicsImpostor(sphere, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 10, restitution: 0.7 }, scene)
  sphere.physicsImpostor.applyImpulse(new BABYLON.Vector3(10, 10, 10), sphere.getAbsolutePosition())

  sphere.physicsImpostor.registerOnPhysicsCollide(myGround.physicsImpostor, function(main, collided) {
    main.object.material.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random())
    main.object.material.specularColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random())
    main.object.material.ambientColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random())
  })

  //Sphere Interaction

  //Shoot
  // Radial explosion impulse/force
  /* var origins = [
          new BABYLON.Vector3(-8, 6, 0),
          new BABYLON.Vector3(0, 0, 0),
          new BABYLON.Vector3(8, 2, 4),
          new BABYLON.Vector3(-4, 0, -4),
      ];
      var radius = 8;
      var strength = 20;
  
      for (var i = 0; i < origins.length; i++) {
          var origin = origins[i];
  
          setTimeout(function (origin) {
              var event = physicsHelper.applyRadialExplosionImpulse( // or .applyRadialExplosionForce
                  origin,
                  radius,
                  strength,
                  BABYLON.PhysicsRadialImpulseFalloff.Linear // or BABYLON.PhysicsRadialImpulseFalloff.Constant
              );
  
              // Debug
              var eventData = event.getData();
              var debugData = showExplosionDebug(eventData);
              setTimeout(function (debugData) {
                  hideExplosionDebug(debugData);
                  event.dispose(); // we need to cleanup/dispose, after we don't use the data anymore
              }, 1500, debugData);
              // Debug - END
          }, i * 2000 + 1000, origin);
      }
      */

  //Bounding box Geometry (Re-code this to update when the ground updates)

  var border0 = BABYLON.Mesh.CreateBox('border0', 1, scene)
  border0.scaling = new BABYLON.Vector3(5, 100, 200)
  border0.position.x = -100.0
  border0.checkCollisions = true
  border0.isVisible = false

  var border1 = BABYLON.Mesh.CreateBox('border1', 1, scene)
  border1.scaling = new BABYLON.Vector3(5, 100, 200)
  border1.position.x = 100.0
  border1.checkCollisions = true
  border1.isVisible = false

  var border2 = BABYLON.Mesh.CreateBox('border2', 1, scene)
  border2.scaling = new BABYLON.Vector3(200, 100, 5)
  border2.position.z = 100.0
  border2.checkCollisions = true
  border2.isVisible = false

  var border3 = BABYLON.Mesh.CreateBox('border3', 1, scene)
  border3.scaling = new BABYLON.Vector3(200, 100, 5)
  border3.position.z = -100.0
  border3.checkCollisions = true
  border3.isVisible = false

  border0.physicsImpostor = new BABYLON.PhysicsImpostor(border0, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene)
  border1.physicsImpostor = new BABYLON.PhysicsImpostor(border1, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene)
  border2.physicsImpostor = new BABYLON.PhysicsImpostor(border2, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene)
  border3.physicsImpostor = new BABYLON.PhysicsImpostor(border3, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene)

  //Atmosphere

  //Light
  var light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0), scene)
  var light2 = new BABYLON.PointLight('light2', new BABYLON.Vector3(60, 60, 0), scene)
  var gl = new BABYLON.GlowLayer('sphere', scene)
  light1.intensity = 0.5
  light2.intensity = 0.5

  //Ball punch
  window.addEventListener('click', function() {
    var pickResult = scene.pick(scene.pointerX, scene.pointerY)

    if (pickResult.hit) {
      var dir = pickResult.pickedPoint.subtract(scene.activeCamera.position)
      dir.normalize()
      pickResult.pickedMesh.applyImpulse(dir.scale(150), pickResult.pickedPoint)
    }
  })

  //fog
  //skybox

  return scene
}
