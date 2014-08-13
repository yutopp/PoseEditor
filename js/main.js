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

  //
  var controls = new THREE.OrbitControls( camera );
  controls.damping = 0.2;
  //controls.addEventListener('change', render);

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

  //
  var human_model = null;
  var joint_markers = [];
  var joint_spheres = [];

  //
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


    human_model = skinnedMesh

    //
    for(var bone in skinnedMesh.skeleton.bones) {
      var texture = THREE.ImageUtils.loadTexture("images/marker.png");
      var material = new THREE.SpriteMaterial({map: texture, color: 0xFFFFFF});
      var sprite = new THREE.Sprite(material);
      sprite.scale.set(32.0, 32.0, 1);

      joint_markers.push(sprite);
      scene2d.add(sprite);
    }

    //
    var i = 0;
    for(var bone in skinnedMesh.skeleton.bones) {
      var sphere_geo = new THREE.SphereGeometry(4, 4, 4);
      var material = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
      var sphere = new THREE.Mesh(sphere_geo, material);
      sphere.userData = {
        joint_index: i
      };

      sphere.visible = false;
      joint_spheres.push(sphere);
      scene.add(sphere);

      i = i + 1;
    }


    //animate(skinnedMesh);
  });


  //
  var bone_ray = function(e) {
    var mouse_x = e.clientX - $(renderer.domElement).position().left;
    var mouse_y = e.clientY - $(renderer.domElement).position().top;

    var pos = screenToWorld(new THREE.Vector3(mouse_x, mouse_y, 0));
    console.log(pos);

    var ray = new THREE.Raycaster(camera.position, pos.sub(camera.position).normalize());

    var objs = ray.intersectObjects(joint_spheres);

    // reset
    for(var index in joint_spheres) {
      joint_markers[index].material.color.setRGB(1, 1, 1);
    }

    // select
    for(var index in objs) {
      var obj = objs[index].object;
      console.log(obj);

      var joint_index = obj.userData.joint_index;
      console.log(joint_index)
      joint_markers[joint_index].material.color.setRGB(1, 0, 0);
      break;
    }
  };

  renderer.domElement.addEventListener('mousedown', bone_ray, false);


  (function render_loop() {
    requestAnimationFrame(render_loop);

    if (human_model) {
      //var m = aaa.skeleton.bones[1];
      //m.rotation.set(m.rotation.x+0.1, m.rotation.y, m.rotation.z, m.rotation.order);

      var i = 0;
      for(var bone in human_model.skeleton.bones) {
        var b = human_model.skeleton.bones[i];
        var b_pos = new THREE.Vector3();
        b_pos.setFromMatrixPosition(b.matrixWorld);

        var screen_b_pos = worldToScreen(b_pos);
        joint_markers[i].position.set(screen_b_pos.x, screen_b_pos.y, -1);

        i = i + 1;
      }


      i = 0;
      for(var bone in human_model.skeleton.bones) {
        var b = human_model.skeleton.bones[i];
        var b_pos = new THREE.Vector3();
        b_pos.setFromMatrixPosition(b.matrixWorld);

        joint_spheres[i].position.set(b_pos.x, b_pos.y, b_pos.z);

        i = i + 1;
      }
    }

    //
    renderer.clear();

    //
    renderer.render(scene, camera);
    renderer.render(scene2d, camera2d);
  })();
}; // function main

// dispatch main function
$(main);
