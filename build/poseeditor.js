/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="../ext/TransformControls.d.ts"/>
/// <reference path="../ext/OrbitControls.d.ts"/>
var Bonedit;
(function (Bonedit) {
    var Editor = (function () {
        function Editor(mesh_path, marker_path) {
            var _this = this;
            this.renderLoop = function () {
                requestAnimationFrame(_this.renderLoop);

                _this.scene.updateMatrixWorld(true);
                _this.scene2d.updateMatrixWorld(true);

                if (_this.model.isReady()) {
                    //
                    _this.model.mesh.skeleton.bones.forEach(function (bone, index) {
                        var b_pos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
                        var s_b_pos = _this.worldToScreen(b_pos);

                        _this.model.joint_markers[index].position.set(s_b_pos.x, s_b_pos.y, -1);

                        _this.model.joint_spheres[index].position.set(b_pos.x, b_pos.y, b_pos.z);
                    });
                }

                _this.renderer.clear();

                _this.renderer.render(_this.scene, _this.camera);
                _this.renderer.render(_this.scene2d, _this.camera2d);
            };
            //
            this.model = null;
            //
            this.isOnManipurator = false;
            this.selectedSphere = null;
            this.selectedBaseRot = null;
            this.width = 600;
            this.height = 400;
            this.fov = 60;
            this.aspect = this.width / this.height;
            this.near = 1;
            this.far = 1000;

            //
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(this.fov, this.aspect, this.near, this.far);
            this.camera.position.set(0, 0, 50);

            this.projector = new THREE.Projector();

            this.directionalLight = new THREE.DirectionalLight(0xffffff);
            this.directionalLight.position.set(0, 0.7, 0.7);
            this.scene.add(this.directionalLight);

            this.anbientLight = new THREE.AmbientLight(0xaaaaaa);
            this.scene.add(this.anbientLight);

            //
            this.scene2d = new THREE.Scene();
            this.camera2d = new THREE.OrthographicCamera(0, this.width, 0, this.height, 0.001, 10000);

            //
            this.renderer = new THREE.WebGLRenderer({
                preserveDrawingBuffer: true
            });
            this.renderer.setSize(this.width, this.height);
            this.renderer.setClearColor(0x000000, 1);
            this.renderer.autoClear = false;
            document.body.appendChild(this.renderer.domElement);

            //
            this.transformCtrl = new THREE.TransformControls(this.camera, this.renderer.domElement);
            this.transformCtrl.setMode("rotate");
            this.transformCtrl.setSpace("local");
            this.transformCtrl.detach();
            this.transformCtrl.addEventListener('change', function () {
                return _this.onTransformCtrl();
            });
            this.scene.add(this.transformCtrl);

            //
            this.controls = new THREE.OrbitControls(this.camera);
            this.controls.damping = 0.2;

            //this.controls.enabled = true;
            //this.controls.addEventListener('change', render);
            //
            this.setupModel(mesh_path, marker_path);

            //
            this.renderer.domElement.addEventListener('mousedown', function (e) {
                return _this.boneRay(e);
            }, false);

            //
            this.renderLoop();
        }
        Editor.prototype.toDataUrl = function (type) {
            if (typeof type === "undefined") { type = 'png'; }
            switch (type) {
                case "png":
                    return this.renderer.domElement.toDataURL("image/png");

                case "jpeg":
                    return this.renderer.domElement.toDataURL("image/jpeg");

                case "json":
                    if (this.model != null) {
                        var obj = this.model.jointData();
                        return "data: text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));
                    } else {
                        throw new Error("Model was not loaded");
                    }

                default:
                    throw new Error("File format '" + type + "' is not supported");
            }
        };

        Editor.prototype.loadJointDataFromString = function (data) {
            var joint_data = JSON.parse(data);
            this.model.loadJointData(joint_data);
        };

        Editor.prototype.setupModel = function (mesh_path, marker_path) {
            this.model = new Model(mesh_path, marker_path, this.scene, this.scene2d);
        };

        Editor.prototype.onTransformCtrl = function () {
            if (this.transformCtrl.axis != null) {
                this.isOnManipurator = true;

                if (this.selectedSphere != null) {
                    var bone = this.model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];

                    var toto = new THREE.Matrix4().getInverse(this.selectedBaseRot);

                    var to_qq = new THREE.Matrix4().extractRotation(this.selectedSphere.matrixWorld).clone();

                    var to_q = new THREE.Quaternion().setFromRotationMatrix(toto.multiply(to_qq)).normalize();

                    bone.quaternion.copy(to_q);
                }
            } else {
                this.isOnManipurator = false;
            }

            this.transformCtrl.update();
        };

        Editor.prototype.boneRay = function (e) {
            var _this = this;
            if (this.isOnManipurator) {
                return;
            }

            var dom_pos = this.renderer.domElement.getBoundingClientRect();

            var mouse_x = e.clientX - dom_pos.left;
            var mouse_y = e.clientY - dom_pos.top;
            var pos = this.screenToWorld(new THREE.Vector2(mouse_x, mouse_y));

            var ray = new THREE.Raycaster(this.camera.position, pos.sub(this.camera.position).normalize());

            var conf_objs = ray.intersectObjects(this.model.joint_spheres);

            // reset color of markers
            this.model.joint_markers.forEach(function (marker) {
                marker.material.color.setHex(_this.model.normalColor);
            });

            this.selectedSphere = null;
            if (conf_objs.length > 0) {
                var conf_obj = conf_objs[0];

                this.selectedSphere = conf_obj.object;

                //
                var index = this.selectedSphere.userData.jointIndex;
                this.model.joint_markers[index].material.color.setHex(this.model.selectedColor);
            }

            if (this.selectedSphere == null) {
                this.transformCtrl.detach();
                this.selectedBaseRot = null;
            } else {
                var bone = this.model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];

                //
                var mat = new THREE.Matrix4().extractRotation(bone.matrixWorld);
                var to_q = new THREE.Quaternion().setFromRotationMatrix(mat);
                this.selectedSphere.quaternion.copy(to_q);

                this.transformCtrl.attach(this.selectedSphere);
                this.transformCtrl.update();

                var t_r = bone.rotation.clone();
                bone.rotation.x = 0.0;
                bone.rotation.y = 0.0;
                bone.rotation.z = 0.0;

                bone.updateMatrixWorld(true);

                this.selectedBaseRot = new THREE.Matrix4().extractRotation(bone.matrixWorld);

                bone.rotation.x = t_r.x;
                bone.rotation.y = t_r.y;
                bone.rotation.z = t_r.z;
                bone.updateMatrixWorld(true);
            }
        };

        Editor.prototype.screenToWorld = function (screen_pos) {
            var window_half_x = this.width / 2.0;
            var window_half_y = this.height / 2.0;

            var world_pos = new THREE.Vector3();
            world_pos.x = screen_pos.x / window_half_x - 1;
            world_pos.y = -screen_pos.y / window_half_y + 1;
            this.projector.unprojectVector(world_pos, this.camera);

            return world_pos;
        };

        Editor.prototype.worldToScreen = function (world_pos) {
            var window_half_x = this.width / 2.0;
            var window_half_y = this.height / 2.0;

            var screen_pos = world_pos.clone();
            this.projector.projectVector(screen_pos, this.camera);
            screen_pos.x = (screen_pos.x + 1) * window_half_x;
            screen_pos.y = (-screen_pos.y + 1) * window_half_y;

            return new THREE.Vector2(screen_pos.x, screen_pos.y);
        };
        return Editor;
    })();
    Bonedit.Editor = Editor;

    //
    var Model = (function () {
        function Model(mesh_path, marker_path, main_scene, scene2d) {
            var _this = this;
            //
            this.ready = false;
            //
            this.selectedColor = 0xff0000;
            this.normalColor = 0x0000ff;
            //
            this.mesh = null;
            //
            this.joint_markers = [];
            this.joint_spheres = [];
            //
            var loader = new THREE.JSONLoader();
            loader.load(mesh_path, function (geometry, materials /*unused*/ ) {
                // TODO: change this
                var material = new THREE.MeshLambertMaterial({
                    color: 0xffffff,
                    skinning: true
                });

                //
                _this.mesh = new THREE.SkinnedMesh(geometry, material);
                _this.mesh.scale.set(4, 4, 4);
                main_scene.add(_this.mesh);

                //skinnedMesh.position.y = 50;
                //
                _this.mesh.skeleton.bones.forEach(function (bone) {
                    bone.matrixWorldNeedsUpdate = true;
                });

                // load textures
                var texture = THREE.ImageUtils.loadTexture(marker_path);
                _this.mesh.skeleton.bones.forEach(function (bone, index) {
                    var material = new THREE.SpriteMaterial({ map: texture, color: _this.normalColor });
                    var sprite = new THREE.Sprite(material);
                    sprite.scale.set(16.0, 16.0, 1);

                    _this.joint_markers.push(sprite);
                    _this.scene2d.add(sprite);
                });

                // make sphere objects
                _this.mesh.skeleton.bones.forEach(function (bone, index) {
                    var sphere_geo = new THREE.SphereGeometry(3, 20, 20);
                    var material = new THREE.MeshBasicMaterial({ wireframe: true });
                    var sphere = new THREE.Mesh(sphere_geo, material);
                    sphere.matrixWorldNeedsUpdate = true;
                    sphere.userData = {
                        jointIndex: index
                    };

                    sphere.visible = false;
                    _this.joint_spheres.push(sphere);
                    _this.scene.add(sphere);
                });

                _this.ready = true;
            });

            //
            this.scene = main_scene;
            this.scene2d = scene2d;
        }
        Model.prototype.destruct = function () {
            this.ready = false;
        };

        Model.prototype.isReady = function () {
            return this.ready;
        };

        Model.prototype.jointData = function () {
            var joint_data = {};
            this.mesh.skeleton.bones.forEach(function (bone, index) {
                joint_data[index] = { rotation: bone.quaternion };
            });

            return joint_data;
        };

        Model.prototype.loadJointData = function (joint_data) {
            for (var key in joint_data) {
                var raw_q = joint_data[key];
                var rot = raw_q['rotation'];
                var x = rot['_x'];
                var y = rot['_y'];
                var z = rot['_z'];
                var w = rot['_w'];

                this.mesh.skeleton.bones[key].quaternion.x = x;
                this.mesh.skeleton.bones[key].quaternion.y = y;
                this.mesh.skeleton.bones[key].quaternion.z = z;
                this.mesh.skeleton.bones[key].quaternion.w = w;
            }
        };
        return Model;
    })();
})(Bonedit || (Bonedit = {}));
