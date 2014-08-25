var main = function () {
  var scene = new THREE.Scene();
  var helper_scene = new THREE.Scene();

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


var text2 = document.createElement('div');
text2.style.position = 'absolute';
//text2.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
text2.style.width = 100;
text2.style.height = 100;
text2.style.backgroundColor = "blue";
text2.style.top = 300 + 'px';
text2.style.left = 200 + 'px';
document.body.appendChild(text2);









  var directionalLight = new THREE.DirectionalLight( 0xffffff );
  directionalLight.position.set( 0, 0.7, 0.7 );
  scene.add( directionalLight );

  //
  var human_model = null;
  var bone_helper = null;
  var joint_markers = [];   // sprites
  var joint_spheres = [];   // objects

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

    bone_helper = new THREE.SkeletonHelper(skinnedMesh);
    bone_helper.material.linewidth = 3;
    helper_scene.add(bone_helper);



    human_model = skinnedMesh

    //
    for(var bone_index in skinnedMesh.skeleton.bones) {
      var texture = THREE.ImageUtils.loadTexture("images/marker.png");
      var material = new THREE.SpriteMaterial({map: texture, color: 0xFFFFFF});
      var sprite = new THREE.Sprite(material);
      sprite.scale.set(32.0, 32.0, 1);

      joint_markers.push(sprite);
      scene2d.add(sprite);
    }

    //
    var i = 0;
    for(var bone_index in skinnedMesh.skeleton.bones) {
      var bone = skinnedMesh.skeleton.bones[i];
      bone.matrixWorldNeedsUpdate = true;

      //
      bone.userData = {
        init_rotation: bone.rotation.clone()
      };




      console.log(bone.localToWorld(new THREE.Vector3(1, 0, 0)));

      var sphere_geo = new THREE.SphereGeometry(3, 20, 20);
      var material = new THREE.MeshBasicMaterial({color: 0xFFFFFF, wireframe: true});
      var sphere = new THREE.Mesh(sphere_geo, material);
      sphere.matrixWorldNeedsUpdate = true;


      //sphere.quaternion.copy(q);

      //
      var mat = new THREE.Matrix4().extractRotation(bone.matrixWorld);
      var to_q = new THREE.Quaternion().setFromRotationMatrix(mat).normalize();

      //1
      sphere.userData = {
        joint_index: i,
        init_q: to_q,
        init_r: bone.rotation.clone()
      };
      //console.log(bone.rotation.clone());



      //sphere.visible = false;
      joint_spheres.push(sphere);
      scene.add(sphere);

      i = i + 1;
    }


    //animate(skinnedMesh);
  });







  //1
  var transform_ctrl = new THREE.TransformControls(camera, renderer.domElement);
  transform_ctrl.setMode("rotate");
  transform_ctrl.setSpace("local");
  transform_ctrl.detach();
  helper_scene.add(transform_ctrl);


  var is_on_manipurator = false;

  // select
  var selected_sphere = null;


  //
  var temp = null;

  //
  var bone_ray = function(e) {
    if (is_on_manipurator)
      return;

    console.log("bone_ray");


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

    selected_sphere = null;
    for(var index in objs) {
      selected_sphere = objs[index].object;
      console.log(selected_sphere);

      transform_ctrl.attach(selected_sphere);


      var joint_index = selected_sphere.userData.joint_index;
      console.log(joint_index)
      joint_markers[joint_index].material.color.setRGB(1, 0, 0);

      break;    //
    }
    if ( selected_sphere == null ) {
      transform_ctrl.detach();
      temp = null;

    } else {
      var bone = human_model.skeleton.bones[selected_sphere.userData.joint_index];
                //
          var mat = new THREE.Matrix4().extractRotation(bone.matrixWorld);
          var to_q = new THREE.Quaternion().setFromRotationMatrix(mat);
          selected_sphere.quaternion.copy(to_q);
      transform_ctrl.update();

          var t_r = bone.rotation.clone();

          bone.rotation.x = 0.0;//selected_sphere.userData.init_r.x;
          bone.rotation.y = 0.0;//selected_sphere.userData.init_r.y;
          bone.rotation.z = 0.0;//selected_sphere.userData.init_r.z;

          bone.updateMatrixWorld(true);

          temp = new THREE.Matrix4().extractRotation(bone.matrixWorld);

          bone.rotation.x = t_r.x;
          bone.rotation.y = t_r.y;
          bone.rotation.z = t_r.z;
          bone.updateMatrixWorld(true);

          console.log("ababa: ", mat, temp);
    }
  };








  transform_ctrl.addEventListener('change', function() {
	if ( transform_ctrl.axis !== null ) {
      console.log("axis", transform_ctrl.axis)
      is_on_manipurator = true;

      console.log(transform_ctrl);

      if (selected_sphere != null) {
        var bone = human_model.skeleton.bones[selected_sphere.userData.joint_index];

        if (temp == null) {

        }



/*
        if (transform_ctrl.axis == 'X') {
          //var axis = new THREE.Vector3(selected_sphere.quaternion.x, selected_sphere.quaternion.y, selected_sphere.quaternion.z)
          var axis = new THREE.Vector3(1, 0, 0);
          console.log(axis);

          var bone = human_model.skeleton.bones[10];
          rotateAroundWorldAxis(bone, axis, Math.PI / 2.0);




          //console.log(selected_sphere.rotation.x);
          //bone.rotation.set(selected_sphere.rotation.x, bone.rotation.y, bone.rotation.z, bone.rotation.order);
        }
/*/

        //var a = new THREE.Euler();
        //a.setFromQuaternion(selected_sphere.quaternion, 'XYZ');
        //var tmp_x = a.x;
        //a.x = a.z;
        //a.z = -tmp_x;

        //
        //var to_q = selected_sphere.userData.init_q.clone();
        //to_q.multiply(selected_sphere.quaternion);

//        var to_q = selected_sphere.quaternion.clone();
//        to_q.multiply(selected_sphere.userData.init_q.inverse());


        var tempMatrix = new THREE.Matrix4();


        var toto = new THREE.Matrix4().getInverse(temp);
        console.log(toto);
        //var to_qq = new THREE.Matrix4().makeRotationFromQuaternion(selected_sphere.quaternion);
        var to_qq = tempMatrix.extractRotation(selected_sphere.matrixWorld).clone();

        var to_q = new THREE.Quaternion().setFromRotationMatrix(toto.multiply(to_qq)).normalize();



        //to_q.setFromEuler(a);
        //var q = selected_sphere.quaternion;
        //var world_axis = new THREE.Vector3(q.x, q.y, q.z);
        //var local_axis = bone.worldToLocal(world_axis);

        //var to_q = new THREE.Quaternion().setFromAxisAngle(local_axis, q.w).normalize();

        //var world_axis = new THREE.Vector3(q.x, q.y, q.z);
        //var local_axis = bone.worldToLocal(world_axis);

        //var to_q = new THREE.Quaternion().setFromAxisAngle(local_axis, q.w).normalize();



        bone.quaternion.copy(to_q);
/**/
      }

	} else {
      is_on_manipurator = false;
      //temp = null
    }

    transform_ctrl.update();
  });



  //
  renderer.domElement.addEventListener('mousedown', bone_ray, false);




  //
  var controls = new THREE.OrbitControls( camera );
  controls.damping = 0.2;
  //controls.enabled = true;
  //controls.addEventListener('change', render);


  (function render_loop() {
    requestAnimationFrame(render_loop);

    helper_scene.updateMatrixWorld(true);
    scene2d.updateMatrixWorld(true);
	scene.updateMatrixWorld(true);


    if (selected_sphere != null) {
      var bone = human_model.skeleton.bones[selected_sphere.userData.joint_index];

      //console.log(bone.quaternion);
      var a = new THREE.Euler().setFromQuaternion(bone.quaternion, 'XYZ');
      text2.innerHTML = "id: "  + selected_sphere.userData.joint_index + " x: " + a.x + " y: " + a.y + " z: " + a.z + "  is_on_manipurator: " + is_on_manipurator;
    }



    if (bone_helper) {
      bone_helper.update();
    }







    if (human_model) {
        //var to_q = new THREE.Quaternion().setFromAxisAngle(local_axis, q.w).normalize();

/*
      //var m = human_model.skeleton.bones[10];
      var m = human_model.skeleton.bones[10];
      //m.rotation.set(m.rotation.x+0.1, m.rotation.y, m.rotation.z, m.rotation.order);
      var axis = new THREE.Vector3(1, 0, 0);
      rotateAroundWorldAxis(m, axis, Math.PI / 180.0 * 2)



      m = human_model.skeleton.bones[2];
      rotateAroundWorldAxis(m, axis, Math.PI / 180.0 * 2)

      axis_helper.quaternion.copy(m.quaternion);
      //rotateAroundWorldAxis(m, axis, Math.PI / 180.0 * 2);
      //console.log(m.matrix);
*/

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
    renderer.render(helper_scene, camera);
  })();
}; // function main

// dispatch main function
$(main);
