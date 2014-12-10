/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="../typings/jquery/jquery.d.ts"/>
/// <reference path="../ext/TransformControls.d.ts"/>
/// <reference path="../ext/OrbitControls.d.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var Config = (function () {
        function Config() {
            this.enableBackgroundAlpha = false;
            this.backgroundColorHex = 0x777777;
            this.backgroundAlpha = 1.0;
        }
        return Config;
    })();
    PoseEditor.Config = Config;
    var Editor = (function () {
        function Editor(parent_dom_id, mesh_path, texture_path, marker_path, config, callback) {
            var _this = this;
            if (config === void 0) { config = null; }
            if (callback === void 0) { callback = null; }
            this.renderLoop = function () {
                requestAnimationFrame(_this.renderLoop);
                _this.scene.updateMatrixWorld(true);
                _this.scene2d.updateMatrixWorld(true);
                if (_this.model.isReady()) {
                    if (_this.dragging) {
                        var bone = _this.model.mesh.skeleton.bones[_this.selectedSphere.userData.jointIndex];
                        _this.ik(bone, _this.ikTargetPosition);
                    }
                    //
                    _this.model.mesh.skeleton.bones.forEach(function (bone, index) {
                        var b_pos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
                        var s_b_pos = _this.worldToScreen(b_pos);
                        _this.model.joint_markers[index].position.set(s_b_pos.x, s_b_pos.y, -1);
                        //
                        var sphere = _this.model.joint_spheres[index];
                        sphere.position.set(b_pos.x, b_pos.y, b_pos.z);
                    });
                }
                _this.render();
            };
            //
            this.model = null;
            //
            this.dragging = false;
            this.dragStart = false;
            //
            this.isOnManipurator = false;
            this.selectedSphere = null;
            //
            var parent_dom = document.getElementById(parent_dom_id);
            this.target_dom = parent_dom ? parent_dom : document.body;
            //
            this.width = this.target_dom.offsetWidth;
            this.height = this.target_dom.offsetHeight;
            this.fov = 60;
            this.aspect = this.width / this.height;
            this.near = 1;
            this.far = 1000;
            //
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(this.fov, this.aspect, this.near, this.far);
            this.camera.position.set(0, 9, 32);
            this.directionalLight = new THREE.DirectionalLight(0xffffff);
            this.directionalLight.position.set(0, 0.7, 0.7);
            this.scene.add(this.directionalLight);
            this.ambientLight = new THREE.AmbientLight(0xaaaaaa);
            this.scene.add(this.ambientLight);
            //
            this.scene2d = new THREE.Scene();
            this.camera2d = new THREE.OrthographicCamera(0, this.width, 0, this.height, 0.001, 10000);
            var prop_for_renderer = {
                preserveDrawingBuffer: true
            };
            if (config) {
                prop_for_renderer.alpha = config.enableBackgroundAlpha;
            }
            //
            this.renderer = new THREE.WebGLRenderer(prop_for_renderer);
            this.renderer.setSize(this.width, this.height);
            this.renderer.autoClear = false;
            if (config) {
                this.renderer.setClearColor(config.backgroundColorHex, config.backgroundAlpha);
            }
            //
            this.target_dom.appendChild(this.renderer.domElement);
            window.addEventListener('resize', function () { return _this.onResize(); }, false);
            //
            this.transformCtrl = new THREE.TransformControls(this.camera, this.renderer.domElement);
            this.transformCtrl.setMode("rotate");
            this.transformCtrl.setSpace("local");
            this.transformCtrl.detach();
            this.transformCtrl.addEventListener('change', this.onTransformCtrl.bind(this));
            this.scene.add(this.transformCtrl);
            //
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.damping = 0.2;
            //this.controls.enabled = true;
            this.controls.addEventListener('change', function () { return _this.onControlsChange(); });
            //
            this.setupModel(mesh_path, texture_path, marker_path, callback);
            // plane model
            this.plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000, 8, 8), new THREE.MeshBasicMaterial({ color: 0x0000ff, opacity: 1.00, transparent: true }));
            this.plane.visible = false;
            this.scene.add(this.plane);
            // debugging
            var sphere_geo = new THREE.SphereGeometry(1, 14, 14);
            var material = new THREE.MeshBasicMaterial({ wireframe: true });
            this.ikTargetSphere = new THREE.Mesh(sphere_geo, material);
            this.ikTargetSphere.matrixWorldNeedsUpdate = true;
            this.ikTargetSphere.visible = false;
            this.scene.add(this.ikTargetSphere);
            //
            this.renderer.domElement.addEventListener('mousedown', function (e) { return _this.boneRay(e, false); }, false);
            this.renderer.domElement.addEventListener('touchstart', function (e) { return _this.boneRay(e, true); }, false);
            this.renderer.domElement.addEventListener('mousemove', function (e) { return _this.moving(e, false); }, false);
            this.renderer.domElement.addEventListener('touchmove', function (e) { return _this.moving(e, true); }, false);
            this.renderer.domElement.addEventListener('mouseup', function () { return _this.endDragging(); }, false);
            this.renderer.domElement.addEventListener('touchend', function () { return _this.endDragging(); }, false);
            this.renderer.domElement.addEventListener('touchcancel', function () { return _this.endDragging(); }, false);
            //
            this.renderLoop();
        }
        Editor.prototype.onControlsChange = function () {
            this.transformCtrl.update();
        };
        Editor.prototype.onTransformCtrl = function () {
            if (this.transformCtrl.axis != null) {
                this.isOnManipurator = true;
                if (this.selectedSphere != null) {
                    var bone = this.model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];
                    // local rotation
                    var t_r = bone.quaternion.clone();
                    bone.rotation.set(0, 0, 0);
                    var w_to_l_comp_q = bone.getWorldQuaternion(null).inverse();
                    //p_bone.quaternion.copy(t_r);
                    //p_bone.updateMatrixWorld(true);
                    var sph_q = this.selectedSphere.getWorldQuaternion(null);
                    // update bone quaternion
                    var to_q = w_to_l_comp_q.multiply(sph_q).normalize();
                    bone.quaternion.copy(to_q);
                    bone.updateMatrixWorld(true);
                }
            }
            else {
                this.isOnManipurator = false;
            }
            this.transformCtrl.update();
        };
        Editor.prototype.boneRay = function (e, isTouch) {
            var _this = this;
            if (this.isOnManipurator || this.dragging) {
                return;
            }
            e.preventDefault();
            var dom_pos = this.renderer.domElement.getBoundingClientRect();
            var client_x = isTouch ? e.changedTouches[0].pageX : e.clientX;
            var client_y = isTouch ? e.changedTouches[0].pageY : e.clientY;
            var mouse_x = client_x - dom_pos.left;
            var mouse_y = client_y - dom_pos.top;
            var pos = this.screenToWorld(new THREE.Vector2(mouse_x, mouse_y));
            // reset color of markers
            this.model.joint_markers.forEach(function (marker) {
                marker.material.color.setHex(_this.model.normalColor);
            });
            // calc most nearest sphere
            var l = 9999999999;
            this.selectedSphere = null;
            var ab = pos.clone().sub(this.camera.position).normalize();
            this.model.joint_spheres.forEach(function (s) {
                var ap = s.position.clone().sub(_this.camera.position);
                var len = ap.length();
                var diff_c = len * len / 200.0;
                var margin = Math.max(0.001, Math.min(1.4, diff_c)); // [0.001, 1.4]
                //console.log("len: ", len, " / m: ", margin);
                var d = ab.clone().cross(ap).length();
                var h = d /* / 1.0 */;
                if (h < margin) {
                    if (h < l) {
                        l = h;
                        _this.selectedSphere = s;
                    }
                }
            });
            //console.log(l);
            if (this.selectedSphere != null) {
                this.dragStart = true;
                this.controls.enabled = false;
                var bone = this.model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];
                //console.log("index: ", this.selectedSphere.userData.jointIndex);
                //
                var index = this.selectedSphere.userData.jointIndex;
                this.model.joint_markers[index].material.color.setHex(this.model.selectedColor);
                //
                var to_q = bone.getWorldQuaternion(null);
                this.selectedSphere.quaternion.copy(to_q);
                this.transformCtrl.attach(this.selectedSphere);
                this.transformCtrl.update();
                // set ik target
                this.ikTargetPosition = this.selectedSphere.position.clone();
                this.ikTargetSphere.position.copy(this.ikTargetPosition);
                // set plane
                this.plane.position.copy(this.ikTargetSphere.position);
                this.plane.lookAt(this.camera.position);
            }
            else {
                // not found
                this.dragStart = false;
                this.controls.enabled = true;
                this.transformCtrl.detach();
            }
        };
        Editor.prototype.moving = function (e, isTouch) {
            if (this.dragStart == false) {
                return;
            }
            // console.log("moving");
            e.preventDefault();
            this.dragging = true;
            this.isOnManipurator = false;
            this.transformCtrl.detach();
            var dom_pos = this.renderer.domElement.getBoundingClientRect();
            var client_x = isTouch ? e.changedTouches[0].pageX : e.clientX;
            var client_y = isTouch ? e.changedTouches[0].pageY : e.clientY;
            var mouse_x = client_x - dom_pos.left;
            var mouse_y = client_y - dom_pos.top;
            var pos = this.screenToWorld(new THREE.Vector2(mouse_x, mouse_y));
            var raycaster = new THREE.Raycaster(this.camera.position, pos.sub(this.camera.position).normalize());
            // move ik target
            var intersects = raycaster.intersectObject(this.plane);
            this.ikTargetPosition.copy(intersects[0].point);
            this.ikTargetSphere.position.copy(this.ikTargetPosition);
        };
        Editor.prototype.endDragging = function () {
            var _this = this;
            if (this.dragging) {
                // reset color of markers
                this.model.joint_markers.forEach(function (marker) {
                    marker.material.color.setHex(_this.model.normalColor);
                });
            }
            this.dragStart = false;
            this.dragging = false;
            this.controls.enabled = true;
            // console.log("end");
        };
        Editor.prototype.onResize = function () {
            var w = this.target_dom.offsetWidth;
            var h = this.target_dom.offsetHeight;
            if (this.width == w && this.height == h) {
                return false;
            }
            // update size
            this.width = w;
            this.height = h;
            this.aspect = this.width / this.height;
            this.renderer.setSize(this.width, this.height);
            this.camera.aspect = this.aspect;
            this.camera.updateProjectionMatrix();
            this.camera2d.right = this.width;
            this.camera2d.bottom = this.height;
            this.camera2d.updateProjectionMatrix();
            return false;
        };
        Editor.prototype.setupModel = function (mesh_path, texture_path, marker_path, callback) {
            this.model = new Model(mesh_path, texture_path, marker_path, this.scene, this.scene2d, callback);
        };
        // CCD IK
        Editor.prototype.ik = function (bone__Aaa, target_pos) {
            var c_bone = bone__Aaa;
            var p_bone = c_bone.parent;
            var i = 0;
            while (p_bone != null && p_bone.type != "SkinnedMesh") {
                if (i == 2)
                    break;
                // console.log("bone!", c_bone.parent);
                // local rotation
                var t_r = p_bone.quaternion.clone();
                p_bone.rotation.set(0, 0, 0);
                var w_to_l_comp_q = p_bone.getWorldQuaternion(null).inverse();
                p_bone.quaternion.copy(t_r);
                p_bone.updateMatrixWorld(true);
                //
                var c_b_pos = c_bone.getWorldPosition(null);
                var p_b_pos = p_bone.getWorldPosition(null);
                var p_to_c_vec = c_b_pos.clone().sub(p_b_pos);
                var p_to_t_vec = target_pos.clone().sub(p_b_pos);
                var base_bone_q = p_bone.getWorldQuaternion(null);
                var bone_diff_q = new THREE.Quaternion().setFromUnitVectors(p_to_c_vec, p_to_t_vec);
                bone_diff_q.multiply(base_bone_q);
                var qm = new THREE.Quaternion();
                THREE.Quaternion.slerp(base_bone_q, bone_diff_q, qm, 0.5);
                // update bone quaternion
                var to_q = w_to_l_comp_q.multiply(qm).normalize();
                p_bone.quaternion.copy(to_q);
                p_bone.updateMatrixWorld(true);
                p_bone = p_bone.parent;
                ++i;
            }
        };
        Editor.prototype.render = function () {
            this.renderer.clear();
            this.renderer.render(this.scene, this.camera);
            this.renderer.render(this.scene2d, this.camera2d);
        };
        Editor.prototype.screenToWorld = function (screen_pos) {
            var window_half_x = this.width / 2.0;
            var window_half_y = this.height / 2.0;
            var world_pos = new THREE.Vector3();
            world_pos.x = screen_pos.x / window_half_x - 1;
            world_pos.y = -screen_pos.y / window_half_y + 1;
            world_pos.unproject(this.camera);
            return world_pos;
        };
        Editor.prototype.worldToScreen = function (world_pos) {
            var window_half_x = this.width / 2.0;
            var window_half_y = this.height / 2.0;
            var screen_pos = world_pos.clone();
            screen_pos.project(this.camera);
            screen_pos.x = (screen_pos.x + 1) * window_half_x;
            screen_pos.y = (-screen_pos.y + 1) * window_half_y;
            return new THREE.Vector2(screen_pos.x, screen_pos.y);
        };
        Editor.prototype.toDataUrl = function (type) {
            if (type === void 0) { type = 'png'; }
            switch (type) {
                case "png":
                    return this.makeDataUrl("image/png");
                case "jpeg":
                    return this.makeDataUrl("image/jpeg");
                case "json":
                    return "data: text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.getSceneInfo()));
                default:
                    throw new Error("File format '" + type + "' is not supported");
            }
        };
        Editor.prototype.getSceneInfo = function () {
            if (this.model != null) {
                var model_obj = this.model.jointData();
                var obj = {
                    'camera': {
                        'position': this.camera.position,
                        'quaternion': this.camera.quaternion
                    },
                    'model': model_obj
                };
                return obj;
            }
            else {
                throw new Error("Model was not loaded");
            }
        };
        Editor.prototype.setClearColor = function (color_hex, alpha) {
            this.renderer.setClearColor(color_hex, alpha);
        };
        Editor.prototype.loadSceneDataFromString = function (data) {
            var obj = JSON.parse(data);
            var camera_data = obj.camera;
            {
                var pos = camera_data.position;
                this.camera.position.x = pos.x;
                this.camera.position.y = pos.y;
                this.camera.position.z = pos.z;
            }
            {
                var q = camera_data.quaternion;
                this.camera.quaternion.x = q._x;
                this.camera.quaternion.y = q._y;
                this.camera.quaternion.z = q._z;
                this.camera.quaternion.w = q._w;
            }
            this.controls.update();
            //threejs/three.d.ts
            this.model.loadJointData(obj.model);
        };
        Editor.prototype.hideMarker = function () {
            this.model.hideMarker();
        };
        Editor.prototype.showMarker = function () {
            this.model.showMarker();
        };
        Editor.prototype.toggleMarker = function () {
            this.model.toggleMarker();
        };
        Editor.prototype.makeDataUrl = function (type) {
            //
            var vis = this.model.getMarkerVisibility();
            this.model.setMarkerVisibility(false);
            var ss = this.selectedSphere;
            this.transformCtrl.detach();
            //
            this.render();
            var data = this.renderer.domElement.toDataURL(type);
            //
            this.model.setMarkerVisibility(vis);
            if (ss) {
                this.transformCtrl.attach(ss);
            }
            return data;
        };
        return Editor;
    })();
    PoseEditor.Editor = Editor;
    //
    var Model = (function () {
        function Model(mesh_path, texture_path, marker_path, scene, scene2d, callback) {
            var _this = this;
            //
            this.ready = false;
            //
            this.showingMarker = true;
            //
            this.selectedColor = 0xff0000;
            this.normalColor = 0x0000ff;
            //
            this.mesh = null;
            //
            this.joint_markers = [];
            this.joint_spheres = [];
            //
            this.scene = scene;
            this.scene2d = scene2d;
            // load mesh data from path
            $.ajax({
                dataType: 'JSON',
                type: "GET",
                url: mesh_path
            }).done(function (data) {
                console.log("finished to load");
                // ref. https://github.com/mrdoob/three.js/blob/master/editor/js/Loader.js
                if (data.metadata.type === undefined) {
                    data.metadata.type = 'Geometry';
                }
                if (data.metadata.type.toLowerCase() === 'geometry') {
                    var loader = new THREE.JSONLoader();
                    var result = loader.parse(data, texture_path);
                    var geometry = result.geometry;
                    var material;
                    if (result.materials !== undefined) {
                        if (result.materials.length > 1) {
                            material = new THREE.MeshFaceMaterial(result.materials);
                            material.materials.forEach(function (mat) {
                                mat.skinning = true;
                            });
                        }
                        else {
                            material = result.materials[0];
                            material.setValues({ skinning: true });
                        }
                    }
                    else {
                        material = new THREE.MeshLambertMaterial({
                            color: 0xffffff,
                            skinning: true
                        });
                    }
                    geometry.sourceType = "ascii";
                    //geometry.sourceFile = file.name;
                    // create mesh data
                    _this.mesh = new THREE.SkinnedMesh(geometry, material, false);
                    _this.mesh.scale.set(3, 3, 3);
                    _this.mesh.position.y = -18;
                    _this.scene.add(_this.mesh);
                    //
                    _this.setupAppendixData(marker_path, callback);
                }
                else {
                    alert("" + data.metadata.type + " is not supported");
                }
            }).fail(function (a, b, c) {
                console.error("error", a, b, c);
            });
        }
        Model.prototype.setupAppendixData = function (marker_path, callback) {
            var _this = this;
            //
            this.mesh.skeleton.bones.forEach(function (bone) {
                bone.matrixWorldNeedsUpdate = true;
            });
            // load textures(marker for bone)
            var texture = THREE.ImageUtils.loadTexture(marker_path);
            this.mesh.skeleton.bones.forEach(function (bone, index) {
                var material = new THREE.SpriteMaterial({ map: texture, color: _this.normalColor });
                var sprite = new THREE.Sprite(material);
                sprite.scale.set(12.0, 12.0, 1);
                _this.joint_markers.push(sprite);
                _this.scene2d.add(sprite);
            });
            // make sphere objects(attached by transform ctrl)
            this.mesh.skeleton.bones.forEach(function (bone, index) {
                var sphere_geo = new THREE.SphereGeometry(1, 14, 14);
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
            this.ready = true;
            if (callback !== null) {
                callback();
            }
        };
        Model.prototype.destruct = function () {
            this.ready = false;
        };
        Model.prototype.isReady = function () {
            return this.ready;
        };
        Model.prototype.jointData = function () {
            return this.mesh.skeleton.bones.map(function (bone) {
                return { rotation: bone.quaternion };
            });
        };
        Model.prototype.loadJointData = function (joint_data) {
            for (var key in joint_data) {
                var raw_q = joint_data[key];
                var rot = raw_q.rotation;
                this.mesh.skeleton.bones[key].quaternion.x = rot._x;
                this.mesh.skeleton.bones[key].quaternion.y = rot._y;
                this.mesh.skeleton.bones[key].quaternion.z = rot._z;
                this.mesh.skeleton.bones[key].quaternion.w = rot._w;
            }
        };
        Model.prototype.hideMarker = function () {
            this.showingMarker = false;
            this.setMarkerVisibility(this.showingMarker);
        };
        Model.prototype.showMarker = function () {
            this.showingMarker = true;
            this.setMarkerVisibility(this.showingMarker);
        };
        Model.prototype.toggleMarker = function () {
            this.showingMarker = !this.showingMarker;
            this.setMarkerVisibility(this.showingMarker);
        };
        Model.prototype.setMarkerVisibility = function (showing) {
            this.joint_markers.forEach(function (marker) {
                marker.visible = showing;
            });
        };
        Model.prototype.getMarkerVisibility = function () {
            return this.showingMarker;
        };
        return Model;
    })();
})(PoseEditor || (PoseEditor = {}));
