var main = function () {
  var scene = new THREE.Scene();

  var width  = 600;
  var height = 400;
  var fov    = 60;
  var aspect = width / height;
  var near   = 1;
  var far    = 1000;
  var camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
  camera.position.set( 0, 0, 50 );

  var camera2d = new THREE.OrthographicCamera(0, width, 0, height, 0.001, 10000);
  var scene2d = new THREE.Scene();

  //
  var projector = new THREE.Projector();

  function screenToWorld(_screenPos) {
    var worldPos = _screenPos.clone();
    var windowHalfX = width / 2.0;
    var windowHalfY = height / 2.0;
    worldPos.x = worldPos.x / windowHalfX - 1;
    worldPos.y = - worldPos.y / windowHalfY + 1;
    projector.unprojectVector( worldPos, camera );
    return worldPos;
  }

  function worldToScreen(_worldPos) {
    var screenPos = _worldPos.clone();
    var windowHalfX = width / 2.0;
    var windowHalfY = height / 2.0;
    projector.projectVector( screenPos, camera );
    screenPos.x = ( screenPos.x + 1 ) * windowHalfX;
    screenPos.y = ( - screenPos.y + 1) * windowHalfY;
    return screenPos;
  }


  //
  var renderer = new THREE.WebGLRenderer();
  renderer.setSize( width, height );
  renderer.setClearColor(0x000000, 1);
  renderer.autoClear = false;
  document.body.appendChild( renderer.domElement );

  var directionalLight = new THREE.DirectionalLight( 0xffffff );
  directionalLight.position.set( 0, 0.7, 0.7 );
  scene.add( directionalLight );


  var aaa = null;


  var bone_markers = []

  var loader = new THREE.JSONLoader();
  loader.load('models/body_try2.js', function (geometry, materials) {
    console.log("geometory", geometry);

    var material = new THREE.MeshLambertMaterial({color: 0xF0C8C9, skinning: true});

    var skinnedMesh = new THREE.SkinnedMesh(geometry, material);

    console.log("skinnedMesh", skinnedMesh);
    console.log("skinnedMesh.bones", skinnedMesh.skeleton.bones);
    //skinnedMesh.position.y = 50;
    skinnedMesh.scale.set(4, 4, 4);
    //skinnedMesh.geometry.dynamic = true;


    scene.add(skinnedMesh);


    aaa = skinnedMesh




    //
    var texture = THREE.ImageUtils.loadTexture("images/marker.png");
    for(var bone in skinnedMesh.skeleton.bones) {
      var material = new THREE.SpriteMaterial({map: texture, color: 0xFFFFFF});
      var sprite = new THREE.Sprite(material);
      sprite.scale.set(32.0, 32.0, 1);

      bone_markers.push(sprite);
      scene2d.add(sprite);
    }




    //animate(skinnedMesh);
  });






  ( function renderLoop () {
    requestAnimationFrame( renderLoop );

    if (aaa) {
      var m = aaa.skeleton.bones[1];
      m.rotation.set(m.rotation.x+0.1, m.rotation.y, m.rotation.z, m.rotation.order);

      var i = 0;
      for(var bone in aaa.skeleton.bones) {
        var b = aaa.skeleton.bones[i];
        var b_pos = new THREE.Vector3();
        b_pos.setFromMatrixPosition(b.matrixWorld);

        var screen_b_pos = worldToScreen(b_pos);
        bone_markers[i].position.set(screen_b_pos.x, screen_b_pos.y, -1);

        i = i + 1;
      }
    }

    //
    renderer.clear();
    //

    renderer.render( scene, camera );
    renderer.render( scene2d, camera2d );
  } )();

}; // function main

window.addEventListener('DOMContentLoaded', main, false);