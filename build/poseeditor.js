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
    var SpritePaths = (function () {
        function SpritePaths() {
        }
        return SpritePaths;
    })();
    PoseEditor.SpritePaths = SpritePaths;
    var ModelInfo = (function () {
        function ModelInfo() {
        }
        return ModelInfo;
    })();
    PoseEditor.ModelInfo = ModelInfo;
    var Editor = (function () {
        function Editor(parent_dom_id, model_info_table, sprite_paths, config) {
            var _this = this;
            if (config === void 0) { config = null; }
            this.renderLoop = function () {
                requestAnimationFrame(_this.renderLoop);
                _this.scene.updateMatrixWorld(true);
                _this.scene2d.updateMatrixWorld(true);
                _this.models.forEach(function (model) {
                    if (model.isReady()) {
                        if (_this.dragging && model == _this.selectedSphere.userData.ownerModel) {
                            var joint_index = _this.selectedSphere.userData.jointIndex;
                            var bone = model.mesh.skeleton.bones[_this.selectedSphere.userData.jointIndex];
                            if (joint_index == 0) {
                                _this.moveCharactor(model, _this.ikTargetPosition);
                            }
                            else {
                                _this.ik(bone, _this.ikTargetPosition);
                            }
                        }
                        //
                        model.mesh.skeleton.bones.forEach(function (bone, index) {
                            var b_pos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
                            var s_b_pos = _this.worldToScreen(b_pos);
                            model.joint_markers[index].position.set(s_b_pos.x, s_b_pos.y, -1);
                            //
                            var sphere = model.joint_spheres[index];
                            sphere.position.set(b_pos.x, b_pos.y, b_pos.z);
                        });
                    }
                });
                _this.render();
            };
            //
            this.models = [];
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
            this.modelInfoTable = model_info_table;
            this.spritePaths = sprite_paths;
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
            this.transformCtrl.setSize(0.6);
            this.transformCtrl.detach();
            this.transformCtrl.addEventListener('change', this.onTransformCtrl.bind(this));
            this.scene.add(this.transformCtrl);
            //
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.damping = 0.2;
            //this.controls.enabled = true;
            this.controls.addEventListener('change', function () { return _this.onControlsChange(); });
            // plane model
            this.plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000, 8, 8), new THREE.MeshBasicMaterial({ color: 0x0000ff, opacity: 1.0, transparent: true }));
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
            this.renderer.domElement.addEventListener('dblclick', function () { return _this.toggleIKStopper(); }, false);
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
                    var model = this.selectedSphere.userData.ownerModel;
                    var bone = model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];
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
            this.models.forEach(function (model) {
                model.joint_markers.forEach(function (marker) {
                    marker.material.color.setHex(model.normalColor);
                });
            });
            // calc most nearest sphere
            var l = 9999999999;
            this.selectedSphere = null;
            var ab = pos.clone().sub(this.camera.position).normalize();
            var flattened = this.models.map(function (v) {
                return v.joint_spheres;
            }).reduce(function (a, b) {
                return a.concat(b);
            });
            flattened.forEach(function (s) {
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
                var model = this.selectedSphere.userData.ownerModel;
                var bone = model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];
                // console.log("index: ", this.selectedSphere.userData.jointIndex);
                //
                var index = this.selectedSphere.userData.jointIndex;
                model.joint_markers[index].material.color.setHex(model.selectedColor);
                //
                var to_q = bone.getWorldQuaternion(null);
                this.selectedSphere.quaternion.copy(to_q);
                this.transformCtrl.attach(this.selectedSphere);
                this.transformCtrl.update();
                // set ik target
                this.ikTargetPosition = this.selectedSphere.position.clone();
                this.ikTargetSphere.position.copy(this.ikTargetPosition);
                // set plane
                var c_to_p = this.controls.target.clone().sub(this.camera.position);
                var c_to_o = this.ikTargetPosition.clone().sub(this.camera.position);
                var n_c_to_p = c_to_p.clone().normalize();
                var n_c_to_o = c_to_o.clone().normalize();
                var l = c_to_o.length();
                var len = n_c_to_o.dot(n_c_to_p) * l;
                var tmp_pos = this.camera.position.clone();
                tmp_pos.add(c_to_p.normalize().multiplyScalar(len));
                this.plane.position.copy(tmp_pos);
                this.plane.lookAt(this.camera.position);
            }
            else {
                // not found
                this.resetCtrl();
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
            if (this.dragging) {
                // reset color of markers
                this.models.forEach(function (model) {
                    model.joint_markers.forEach(function (marker) {
                        marker.material.color.setHex(model.normalColor);
                    });
                });
            }
            this.dragStart = false;
            this.dragging = false;
            this.controls.enabled = true;
            // console.log("end");
        };
        Editor.prototype.toggleIKStopper = function () {
            if (this.selectedSphere) {
                var model = this.selectedSphere.userData.ownerModel;
                var i = this.selectedSphere.userData.jointIndex;
                model.toggleIKPropagation(i);
            }
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
        Editor.prototype.loadAndAppendModel = function (name, model_info, sprite_paths, callback) {
            var model = new Model(name, model_info, sprite_paths, this.scene, this.scene2d, function (m, e) {
                // default IK stopper node indexes
                var nx = model_info.ik_stop_joints;
                nx.forEach(function (i) {
                    model.toggleIKPropagation(i);
                });
                if (callback) {
                    callback(m, e);
                }
            });
            this.models.push(model);
        };
        Editor.prototype.resetCtrl = function () {
            this.endDragging();
            this.controls.enabled = true;
            this.transformCtrl.detach();
            this.controls.enabled = true;
            this.selectedSphere = null;
        };
        Editor.prototype.moveCharactor = function (model, target_pos) {
            var pos = target_pos.clone();
            pos.y -= model.offsetOrgToBone.y;
            model.mesh.position.copy(pos);
        };
        // CCD IK
        Editor.prototype.ik = function (selected_bone, target_pos) {
            var c_bone = selected_bone;
            var p_bone = c_bone.parent;
            while (p_bone != null && p_bone.type != "SkinnedMesh") {
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
                if (p_bone.userData.preventIKPropagation)
                    break;
                p_bone = p_bone.parent;
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
        // ==================================================
        // ==================================================
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
            return {
                'camera': {
                    'position': this.camera.position,
                    'quaternion': this.camera.quaternion
                },
                'models': {
                    'num': this.models.length,
                    'list': this.models.map(function (m) { return m.modelData(); })
                }
            };
        };
        Editor.prototype.loadSceneDataFromString = function (data) {
            var obj = JSON.parse(data);
            var camera = obj.camera;
            this.camera.position.copy(camera.position);
            this.camera.quaternion.copy(camera.quaternion);
            this.controls.update();
            this.removeAllModel();
            var models = obj.models;
            for (var i = 0; i < models.num; i++) {
                var l = models.list[i];
                var name = l.name;
                // TODO: error check
                this.appendModel(name, (function (i, ll) {
                    return function (m, error) {
                        if (error) {
                            console.log("Error occured: index[" + i + "], name[" + name + "]");
                        }
                        else {
                            m.loadModelData(ll);
                        }
                    };
                })(i, l));
            }
        };
        Editor.prototype.setClearColor = function (color_hex, alpha) {
            this.renderer.setClearColor(color_hex, alpha);
        };
        Editor.prototype.hideMarker = function () {
            this.models.forEach(function (model) {
                model.hideMarker();
            });
        };
        Editor.prototype.showMarker = function () {
            this.models.forEach(function (model) {
                model.showMarker();
            });
        };
        Editor.prototype.toggleMarker = function () {
            this.models.forEach(function (model) {
                model.toggleMarker();
            });
        };
        Editor.prototype.appendModel = function (name, callback) {
            if (callback === void 0) { callback = null; }
            if (name in this.modelInfoTable) {
                this.loadAndAppendModel(name, this.modelInfoTable[name], this.spritePaths, callback);
            }
            else {
                if (callback) {
                    callback(null, "model name[" + name + "] is not found");
                }
            }
        };
        Editor.prototype.removeAllModel = function () {
            while (this.models.length > 0) {
                this.removeModel(0);
            }
        };
        Editor.prototype.removeModel = function (index) {
            var model = this.models[index];
            model.destruct();
            this.models.splice(index);
            this.resetCtrl();
        };
        Editor.prototype.removeSelectedModel = function () {
            if (this.selectedSphere != null) {
                var model = this.selectedSphere.userData.ownerModel;
                var index = this.models.indexOf(model);
                if (index != -1) {
                    this.removeModel(index);
                }
            }
        };
        Editor.prototype.makeDataUrl = function (type) {
            /*
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
            if ( ss ) {
                this.transformCtrl.attach(ss);
            }

            return data;
            */
            return "";
        };
        return Editor;
    })();
    PoseEditor.Editor = Editor;
    //
    var Model = (function () {
        function Model(name, model_info, sprite_paths, scene, scene2d, callback) {
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
            this.name = name;
            //
            this.scene = scene;
            this.scene2d = scene2d;
            //
            var mesh_path = model_info.model_path;
            var texture_path = model_info.texture_dir;
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
                    _this.setupAppendixData(sprite_paths, callback);
                }
                else {
                    alert("" + data.metadata.type + " is not supported");
                }
            }).fail(function (a, b, c) {
                console.error("error", a, b, c);
            });
        }
        Model.prototype.setupAppendixData = function (sprite_paths, callback) {
            var _this = this;
            //
            this.mesh.skeleton.bones.forEach(function (bone) {
                bone.matrixWorldNeedsUpdate = true;
                bone.updateMatrixWorld(true);
                bone.userData = {
                    preventIKPropagation: false
                };
            });
            //
            this.offsetOrgToBone = this.mesh.skeleton.bones[0].getWorldPosition(null).sub(this.mesh.position);
            this.offsetOrgToBone.sub(this.mesh.skeleton.bones[0].position);
            // load textures(marker for bone)
            this.joint_markers = new Array(this.mesh.skeleton.bones.length);
            this.normalMarkerTex = THREE.ImageUtils.loadTexture(sprite_paths.normal);
            this.normalMarkerMat = new THREE.SpriteMaterial({
                map: this.normalMarkerTex,
                color: this.normalColor
            });
            this.specialMarkerTex = THREE.ImageUtils.loadTexture(sprite_paths.special);
            this.specialMarkerMat = new THREE.SpriteMaterial({
                map: this.specialMarkerTex,
                color: this.normalColor
            });
            this.mesh.skeleton.bones.forEach(function (bone, index) {
                var sprite = new THREE.Sprite(_this.normalMarkerMat.clone());
                sprite.scale.set(12.0, 12.0, 1);
                _this.joint_markers[index] = sprite;
                _this.scene2d.add(sprite);
            });
            // make sphere objects(attached by transform ctrl)
            this.mesh.skeleton.bones.forEach(function (bone, index) {
                var sphere_geo = new THREE.SphereGeometry(1, 14, 14);
                var material = new THREE.MeshBasicMaterial({ wireframe: true });
                var sphere = new THREE.Mesh(sphere_geo, material);
                sphere.matrixWorldNeedsUpdate = true;
                sphere.userData = {
                    jointIndex: index,
                    ownerModel: _this
                };
                sphere.visible = false;
                _this.joint_spheres.push(sphere);
                _this.scene.add(sphere);
            });
            this.ready = true;
            if (callback) {
                callback(this, null);
            }
        };
        Model.prototype.destruct = function () {
            var _this = this;
            this.ready = false;
            this.scene.remove(this.mesh);
            this.joint_markers.forEach(function (m) {
                _this.scene2d.remove(m);
            });
            this.joint_spheres.forEach(function (m) {
                _this.scene.remove(m);
            });
        };
        Model.prototype.isReady = function () {
            return this.ready;
        };
        Model.prototype.modelData = function () {
            var joints = this.mesh.skeleton.bones.map(function (bone) {
                return {
                    q: bone.quaternion
                };
            });
            return {
                name: this.name,
                position: this.mesh.position,
                q: this.mesh.quaternion,
                joints: joints
            };
        };
        Model.prototype.loadModelData = function (data) {
            if (!this.ready) {
                return;
            }
            var p = data.position;
            var q = data.q;
            var joints = data.joints;
            for (var key in joints) {
                var joint = joints[key];
                var t_q = joint.q;
                var s_q = this.mesh.skeleton.bones[key].quaternion;
                s_q.set(t_q._x, t_q._y, t_q._z, t_q._w);
            }
            this.mesh.position.set(p.x, p.y, p.z);
            this.mesh.quaternion.set(q._x, q._y, q._z, q._w);
        };
        Model.prototype.toggleIKPropagation = function (bone_index) {
            var bone = this.mesh.skeleton.bones[bone_index];
            bone.userData.preventIKPropagation = !bone.userData.preventIKPropagation;
            var old_sprite = this.joint_markers[bone_index];
            var sprite = null;
            if (bone.userData.preventIKPropagation) {
                sprite = new THREE.Sprite(this.specialMarkerMat.clone());
            }
            else {
                sprite = new THREE.Sprite(this.normalMarkerMat.clone());
            }
            sprite.scale.set(12.0, 12.0, 1);
            this.joint_markers[bone_index] = sprite;
            this.scene2d.add(sprite);
            this.scene2d.remove(old_sprite);
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
