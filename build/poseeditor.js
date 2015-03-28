var PoseEditor;
(function (PoseEditor) {
    var Action = (function () {
        function Action(e) {
            this.editor = e;
        }
        Action.prototype.onActive = function (before) {
            console.log("base::onActive");
        };
        Action.prototype.onDestroy = function () {
            console.log("base::onDestroy");
        };
        Action.prototype.onTapStart = function (e, isTouch) {
        };
        Action.prototype.onMoving = function (e, isTouch) {
        };
        Action.prototype.onTapEnd = function (e, isTouch) {
        };
        return Action;
    })();
    PoseEditor.Action = Action;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="action.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var PoseEditor;
(function (PoseEditor) {
    var CameraAction = (function (_super) {
        __extends(CameraAction, _super);
        function CameraAction(e, c) {
            _super.call(this, e);
            // copy ownership
            this.controls = c;
        }
        CameraAction.prototype.onActive = function (before) {
            this.controls.enabled = true;
        };
        CameraAction.prototype.onDestroy = function () {
            this.controls.enabled = false;
        };
        return CameraAction;
    })(PoseEditor.Action);
    PoseEditor.CameraAction = CameraAction;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="../typings/threejs/three.d.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var CursorPositionHelper = (function () {
        function CursorPositionHelper(scene, camera, targeter) {
            this.scene = scene;
            this.camera = camera;
            this.targeter = targeter;
            //
            this.plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000, 8, 8), new THREE.MeshBasicMaterial({
                color: 0x0000ff,
                opacity: 0.4,
                transparent: true
            }));
            this.plane.visible = true;
            this.scene.add(this.plane);
            //
            var sphereGeo = new THREE.SphereGeometry(1, 14, 14);
            var material = new THREE.MeshBasicMaterial({ wireframe: true });
            this.targetMesh = new THREE.Mesh(sphereGeo, material);
            this.targetMesh.matrixWorldNeedsUpdate = true;
            //this.targetSphere.visible = false;
            this.scene.add(this.targetMesh);
        }
        CursorPositionHelper.prototype.setBeginState = function (startPos) {
            //
            this.targetMesh.position.copy(startPos);
            // set plane
            var c_to_p = this.targeter.target.clone().sub(this.camera.position);
            var c_to_o = startPos.clone().sub(this.camera.position);
            var n_c_to_p = c_to_p.clone().normalize();
            var n_c_to_o = c_to_o.clone().normalize();
            var l = c_to_o.length();
            var len = n_c_to_o.dot(n_c_to_p) * l;
            var tmp_pos = this.camera.position.clone();
            tmp_pos.add(c_to_p.normalize().multiplyScalar(len));
            this.plane.position.copy(tmp_pos);
            this.plane.lookAt(this.camera.position);
        };
        CursorPositionHelper.prototype.move = function (worldCursorPos) {
            var raycaster = new THREE.Raycaster(this.camera.position, worldCursorPos.clone().sub(this.camera.position).normalize());
            // move ik target
            var intersects = raycaster.intersectObject(this.plane);
            if (intersects.length == 0)
                return;
            var pos = intersects[0].point;
            this.targetMesh.position.copy(pos);
            return pos;
        };
        return CursorPositionHelper;
    })();
    PoseEditor.CursorPositionHelper = CursorPositionHelper;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="../typings/threejs/three.d.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var Config = (function () {
        function Config() {
            this.enableBackgroundAlpha = false;
            this.backgroundColorHex = 0x777777;
            this.backgroundAlpha = 1.0;
            this.loadingImagePath = null;
            this.isDebugging = false;
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
    var CameraConfig = (function () {
        function CameraConfig() {
            this.position = new THREE.Vector3(0, 0, 0);
            this.lookAt = new THREE.Vector3(0, 0, 0);
        }
        return CameraConfig;
    })();
    PoseEditor.CameraConfig = CameraConfig;
    function degToRad(deg) {
        return deg * Math.PI / 180.0;
    }
    PoseEditor.degToRad = degToRad;
    function radToDeg(rad) {
        return rad / Math.PI * 180.0;
    }
    PoseEditor.radToDeg = radToDeg;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="action.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var FKAction = (function (_super) {
        __extends(FKAction, _super);
        function FKAction(e) {
            _super.call(this, e);
        }
        FKAction.prototype.onTapStart = function (e, isTouch) {
            this.selectedMarker = this.editor.boneRay(e, isTouch);
        };
        FKAction.prototype.onMoving = function (e, isTouch) {
        };
        FKAction.prototype.onTapEnd = function (e, isTouch) {
        };
        return FKAction;
    })(PoseEditor.Action);
    PoseEditor.FKAction = FKAction;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="action.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var IKAction = (function (_super) {
        __extends(IKAction, _super);
        function IKAction(e) {
            _super.call(this, e);
        }
        return IKAction;
    })(PoseEditor.Action);
    PoseEditor.IKAction = IKAction;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="etc.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var RotationLimitation = (function () {
        function RotationLimitation() {
            this.x = false;
            this.y = false;
            this.z = false;
        }
        return RotationLimitation;
    })();
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
            var mesh_path = model_info.modelPath;
            var texture_path = model_info.textureDir;
            var init_pos = model_info.initPos;
            var init_scale = model_info.initScale;
            if (model_info.markerScale) {
                this.markerScale = model_info.markerScale;
            }
            else {
                this.markerScale = [12.0, 12.0];
            }
            var loader = new THREE.JSONLoader();
            loader.crossOrigin = '*';
            // load mesh data from path
            loader.load(mesh_path, function (geometry, materials) {
                //console.log("finished to load");
                // ref. https://github.com/mrdoob/three.js/blob/master/editor/js/Loader.js
                var material;
                if (materials !== undefined) {
                    if (materials.length > 1) {
                        material = new THREE.MeshFaceMaterial(materials);
                        material.materials.forEach(function (mat) {
                            mat.skinning = true;
                        });
                    }
                    else {
                        material = materials[0];
                        material.setValues({ skinning: true });
                    }
                }
                else {
                    material = new THREE.MeshLambertMaterial({
                        color: 0xffffff,
                        skinning: true
                    });
                }
                // create mesh data
                _this.mesh = new THREE.SkinnedMesh(geometry, material, false);
                if (init_pos) {
                    _this.mesh.position.set(init_pos[0], init_pos[1], init_pos[2]);
                }
                if (init_scale) {
                    _this.mesh.scale.set(init_scale[0], init_scale[1], init_scale[2]);
                }
                // add mesh to model
                _this.scene.add(_this.mesh);
                // bind this model data to the mesh
                _this.mesh.userData = {
                    modelData: _this
                };
                //
                _this.setupAppendixData(sprite_paths, model_info, callback);
            }, texture_path);
        }
        Model.prototype.setupAppendixData = function (sprite_paths, model_info, callback) {
            var _this = this;
            //
            var bone_limits = model_info.boneLimits;
            var base_joint_id = model_info.baseJointId;
            //
            var default_cross_origin = THREE.ImageUtils.crossOrigin;
            THREE.ImageUtils.crossOrigin = '*';
            //
            this.mesh.skeleton.bones.forEach(function (bone, index) {
                bone.matrixWorldNeedsUpdate = true;
                bone.updateMatrixWorld(true);
                bone.userData = {
                    index: index,
                    preventIKPropagation: false,
                    rotLimit: new RotationLimitation(),
                    rotMin: null,
                    rotMax: null
                };
                if (index in bone_limits) {
                    bone.userData.rotMin = new THREE.Euler();
                    bone.userData.rotMax = new THREE.Euler();
                    var rots = bone_limits[index];
                    if (rots[0] != null) {
                        bone.userData.rotLimit.x = true;
                        bone.userData.rotMin.x = PoseEditor.degToRad(rots[0][0]);
                        bone.userData.rotMax.x = PoseEditor.degToRad(rots[0][1]);
                    }
                    if (rots[1] != null) {
                        bone.userData.rotLimit.y = true;
                        bone.userData.rotMin.y = PoseEditor.degToRad(rots[1][0]);
                        bone.userData.rotMax.y = PoseEditor.degToRad(rots[1][1]);
                    }
                    if (rots[2] != null) {
                        bone.userData.rotLimit.z = true;
                        bone.userData.rotMin.z = PoseEditor.degToRad(rots[2][0]);
                        bone.userData.rotMax.z = PoseEditor.degToRad(rots[2][1]);
                    }
                }
            });
            this.scene.updateMatrixWorld(true);
            //
            this.offsetOrgToBone = this.mesh.skeleton.bones[base_joint_id].getWorldPosition(null).sub(this.mesh.position);
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
                sprite.scale.set(_this.markerScale[0], _this.markerScale[1], 1);
                _this.joint_markers[index] = sprite;
                _this.scene2d.add(sprite);
            });
            // make sphere objects(attached by transform ctrl)
            this.mesh.skeleton.bones.forEach(function (bone, index) {
                //var sphere_geo = new THREE.SphereGeometry(1, 14, 14);
                //var material = new THREE.MeshBasicMaterial({wireframe: true});
                //var sphere = new THREE.Mesh(sphere_geo, material);
                var sphere = new THREE.AxisHelper(2.0);
                sphere.matrixWorldNeedsUpdate = true;
                sphere.userData = {
                    jointIndex: index,
                    ownerModel: _this
                };
                sphere.visible = true;
                _this.joint_spheres.push(sphere);
                _this.scene.add(sphere);
            });
            THREE.ImageUtils.crossOrigin = default_cross_origin;
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
            sprite.scale.set(this.markerScale[0], this.markerScale[1], 1);
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
    PoseEditor.Model = Model;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="action.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var MoveAction = (function (_super) {
        __extends(MoveAction, _super);
        function MoveAction(e) {
            _super.call(this, e);
        }
        MoveAction.prototype.onDestroy = function () {
            this.releaseModel();
        };
        MoveAction.prototype.onTapStart = function (e, isTouch) {
            this.catchModel(e, isTouch);
        };
        MoveAction.prototype.onMoving = function (e, isTouch) {
            this.moveModel(e, isTouch);
        };
        MoveAction.prototype.onTapEnd = function (e, isTouch) {
            this.releaseModel();
        };
        MoveAction.prototype.catchModel = function (e, isTouch) {
            var mp = this.editor.selectModel(e, isTouch);
            if (mp == null)
                return;
            this.currentModel = mp[0];
            var pos = mp[1];
            this.offsetOrgToBone = pos.sub(this.currentModel.mesh.position);
            //
            this.editor.cursorHelper.setBeginState(pos);
        };
        MoveAction.prototype.moveModel = function (e, isTouch) {
            if (this.currentModel == null)
                return;
            var pos = this.editor.cursorToWorld(e, isTouch);
            var curPos = this.editor.cursorHelper.move(pos);
            curPos.sub(this.offsetOrgToBone);
            this.currentModel.mesh.position.copy(curPos);
        };
        MoveAction.prototype.releaseModel = function () {
            if (this.currentModel == null)
                return;
            this.currentModel = null;
        };
        return MoveAction;
    })(PoseEditor.Action);
    PoseEditor.MoveAction = MoveAction;
})(PoseEditor || (PoseEditor = {}));
var PoseEditor;
(function (PoseEditor) {
    var Screen;
    (function (Screen) {
        (function (Mode) {
            Mode[Mode["Camera"] = 0] = "Camera";
            Mode[Mode["Move"] = 1] = "Move";
            Mode[Mode["FK"] = 2] = "FK";
            Mode[Mode["IK"] = 3] = "IK";
        })(Screen.Mode || (Screen.Mode = {}));
        var Mode = Screen.Mode;
        var ScreenController = (function () {
            function ScreenController(parentDomId, config) {
                var _this = this;
                this.modeChangerDom = [];
                //
                this.events = {};
                //
                this.loadingDom = null;
                //
                var parentDom = document.getElementById(parentDomId);
                this.targetDom = parentDom ? parentDom : document.body;
                //
                this.width = this.targetDom.offsetWidth;
                this.height = this.targetDom.offsetHeight;
                this.aspect = this.width / this.height;
                //
                if (config.loadingImagePath) {
                    this.loadingDom = document.createElement("img");
                    this.loadingDom.src = config.loadingImagePath;
                    this.loadingDom.style.display = "none";
                    this.targetDom.appendChild(this.loadingDom);
                }
                // tmp
                this.addButton('camera', 0 /* Camera */);
                this.addButton('move', 1 /* Move */);
                this.addButton('fk', 2 /* FK */);
                this.addButton('ik', 3 /* IK */);
                //
                window.addEventListener('resize', function () { return _this.onResize(); }, false);
            }
            ScreenController.prototype.appendChild = function (dom) {
                this.targetDom.appendChild(dom);
            };
            ScreenController.prototype.onResize = function () {
                var w = this.targetDom.offsetWidth;
                var h = this.targetDom.offsetHeight;
                if (this.width == w && this.height == h) {
                    return false;
                }
                // update size
                this.width = w;
                this.height = h;
                this.aspect = this.width / this.height;
                //
                this.dispatchCallback('resize');
                return false;
            };
            ScreenController.prototype.showLoadingDom = function () {
                if (this.loadingDom.style) {
                    this.loadingDom.style.display = "inline";
                    this.loadingDom.style.position = 'absolute';
                    this.loadingDom.style.padding = "10px";
                    this.loadingDom.style.borderRadius = "5px";
                    this.loadingDom.style.backgroundColor = "#fff";
                    var x = Math.abs(this.targetDom.offsetWidth - this.loadingDom.offsetWidth) / 2;
                    var y = Math.abs(this.targetDom.offsetHeight - this.loadingDom.offsetHeight) / 2;
                    this.loadingDom.style.left = x + 'px';
                    this.loadingDom.style.top = y + 'px';
                }
            };
            ScreenController.prototype.hideLoadingDom = function () {
                if (this.loadingDom.style) {
                    this.loadingDom.style.display = "none";
                }
            };
            ScreenController.prototype.addButton = function (title, m) {
                var _this = this;
                var dom = document.createElement("input");
                dom.type = "button";
                dom.value = title;
                dom.addEventListener("click", function () {
                    _this.dispatchCallback("onmodeclick", m);
                });
                this.targetDom.appendChild(dom);
                this.modeChangerDom.push(dom);
            };
            ScreenController.prototype.addCallback = function (type, f) {
                if (this.events[type] == null) {
                    this.events[type] = [];
                }
                this.events[type].push(f);
            };
            ScreenController.prototype.dispatchCallback = function (type) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                if (this.events[type] != null) {
                    this.events[type].forEach(function (f) {
                        f.apply({}, args);
                    });
                }
            };
            return ScreenController;
        })();
        Screen.ScreenController = ScreenController;
    })(Screen = PoseEditor.Screen || (PoseEditor.Screen = {}));
})(PoseEditor || (PoseEditor = {}));
/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="../typings/threejs/three-orbitcontrols.d.ts"/>
/// <reference path="../ext/TransformControls.d.ts"/>
/// <reference path="screen.ts"/>
/// <reference path="model.ts"/>
/// <reference path="camera_action.ts"/>
/// <reference path="move_action.ts"/>
/// <reference path="fk_action.ts"/>
/// <reference path="ik_action.ts"/>
/// <reference path="cursor_position_helper.ts"/>
/// <reference path="etc.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var Editor = (function () {
        function Editor(parentDomId, modelInfoTable, spritePaths, defaultCamera, config) {
            var _this = this;
            if (defaultCamera === void 0) { defaultCamera = new PoseEditor.CameraConfig(); }
            if (config === void 0) { config = new PoseEditor.Config(); }
            this.renderLoop = function () {
                requestAnimationFrame(_this.renderLoop);
                _this.scene.updateMatrixWorld(true);
                _this.scene2d.updateMatrixWorld(true);
                {
                    var model = _this.models[0];
                    if (model && model.isReady()) {
                        var bone = model.mesh.skeleton.bones[14];
                        //console.log(bone.rotation);
                        if (_this.selectedSphere != null) {
                            //bone.rotation.y += 0.01;
                            bone.updateMatrixWorld(true);
                            var bone_q = bone.getWorldQuaternion(null);
                            // local rotation
                            var t_r = bone.quaternion.clone();
                            bone.quaternion.set(0, 0, 0, 0);
                            bone.updateMatrixWorld(true);
                            var w_to_l_comp_q = bone.getWorldQuaternion(null).inverse();
                            bone.quaternion.copy(t_r);
                            bone.updateMatrixWorld(true);
                            // update bone quaternion
                            var to_q = w_to_l_comp_q.multiply(bone_q).normalize();
                        }
                    }
                }
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
            this.loadingTasks = 0;
            this.boneDebugDom = null;
            // setup screen
            this.screen = new PoseEditor.Screen.ScreenController(parentDomId, config);
            this.screen.addCallback('resize', function () { return _this.onResize(); });
            this.screen.addCallback('onmodeclick', function (m) { return _this.onModeClick(m); });
            //
            this.modelInfoTable = modelInfoTable;
            this.spritePaths = spritePaths;
            //
            this.fov = 60;
            this.near = 1;
            this.far = 1000;
            //
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(this.fov, this.screen.aspect, this.near, this.far);
            this.camera.position.copy(defaultCamera.position);
            this.directionalLight = new THREE.DirectionalLight(0xffffff);
            this.directionalLight.position.set(0, 0.7, 0.7);
            this.scene.add(this.directionalLight);
            this.ambientLight = new THREE.AmbientLight(0xaaaaaa);
            this.scene.add(this.ambientLight);
            //
            this.scene2d = new THREE.Scene();
            this.camera2d = new THREE.OrthographicCamera(0, this.screen.width, 0, this.screen.height, 0.001, 10000);
            var propForRenderer = {
                preserveDrawingBuffer: true
            };
            propForRenderer.alpha = config.enableBackgroundAlpha;
            //
            this.renderer = new THREE.WebGLRenderer(propForRenderer);
            this.renderer.setSize(this.screen.width, this.screen.height);
            this.renderer.autoClear = false;
            this.renderer.setClearColor(config.backgroundColorHex, config.backgroundAlpha);
            //
            this.screen.appendChild(this.renderer.domElement);
            //
            this.gridHelper = new THREE.GridHelper(50.0, 5.0);
            this.scene.add(this.gridHelper);
            if (config.isDebugging) {
                // bone: debug information tag
                this.boneDebugDom = document.createElement("div");
                this.boneDebugDom.style.display = "none";
                this.boneDebugDom.style.position = "absolute";
                this.boneDebugDom.style.padding = "0";
                this.boneDebugDom.style.backgroundColor = "#fff";
                this.boneDebugDom.style.opacity = "0.8";
                this.boneDebugDom.style.width = "300px";
                this.screen.targetDom.appendChild(this.boneDebugDom);
                // debug
                var axisHelper = new THREE.AxisHelper(50.0);
                this.scene.add(axisHelper);
            }
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
            this.controls.target.copy(defaultCamera.lookAt);
            this.controls.update();
            this.controls.enabled = false;
            this.controls.addEventListener('change', function () { return _this.onControlsChange(); });
            // plane model
            this.plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000, 8, 8), new THREE.MeshBasicMaterial({ color: 0x0000ff, opacity: 1.0, transparent: true }));
            this.plane.visible = false;
            this.scene.add(this.plane);
            // intersect helper
            this.cursorHelper = new PoseEditor.CursorPositionHelper(this.scene, this.camera, this.controls);
            // save Config
            this.config = config;
            {
                var rf = this.renderer.domElement.addEventListener;
                rf('mousedown', function (e) { return _this.onTapStart(e, false); }, false);
                rf('touchstart', function (e) { return _this.onTapStart(e, true); }, false);
                rf('mousemove', function (e) { return _this.onMoving(e, false); }, false);
                rf('touchmove', function (e) { return _this.onMoving(e, true); }, false);
                rf('mouseup', function (e) { return _this.onTapEnd(e, false); }, false);
                rf('mouseleave', function (e) { return _this.onTapEnd(e, true); }, false);
                rf('touchend', function (e) { return _this.onTapEnd(e, true); }, false);
                rf('touchcancel', function (e) { return _this.onTapEnd(e, true); }, false);
                rf('dblclick', function () { return _this.toggleIKStopper(); }, false);
            }
            // initialize mode
            this.currentMode = 1 /* Move */;
            this.onModeClick(this.currentMode);
            // jump into loop
            this.renderLoop();
        }
        /// ==================================================
        /// ==================================================
        Editor.prototype.onModeClick = function (mode) {
            console.log(mode, this.currentAction);
            var beforeAction = this.currentAction;
            if (beforeAction != null) {
                beforeAction.onDestroy();
            }
            this.currentMode = mode;
            switch (this.currentMode) {
                case 0 /* Camera */:
                    this.currentAction = new PoseEditor.CameraAction(this, this.controls);
                    break;
                case 1 /* Move */:
                    this.currentAction = new PoseEditor.MoveAction(this);
                    break;
                case 2 /* FK */:
                    this.currentAction = new PoseEditor.FKAction(this);
                    break;
                case 3 /* IK */:
                    this.currentAction = new PoseEditor.IKAction(this);
                    break;
                default:
                    console.error('unexpected mode');
            }
            console.log("->", this.currentAction);
            this.currentAction.onActive(beforeAction);
            console.log("->", this.currentAction);
        };
        Editor.prototype.onTapStart = function (e, isTouch) {
            this.currentAction.onTapStart(e, isTouch);
        };
        Editor.prototype.onMoving = function (e, isTouch) {
            this.currentAction.onMoving(e, isTouch);
        };
        Editor.prototype.onTapEnd = function (e, isTouch) {
            this.currentAction.onTapEnd(e, isTouch);
        };
        /// ==================================================
        /// ==================================================
        Editor.prototype.updateBoneDebugInfo = function (model, index) {
            var bone = model.mesh.skeleton.bones[index];
            // console.log(bone.position);
            var pos = new THREE.Vector3();
            pos.setFromMatrixPosition(bone.matrixWorld);
            var pos2d = this.worldToScreen(pos);
            this.boneDebugDom.style.left = "" + (pos2d.x + 40) + "px";
            this.boneDebugDom.style.top = "" + (pos2d.y + 80) + "px";
            var sx = "<span style='color: red'>X</span>";
            var sy = "<span style='color: #00ff00'>Y</span>";
            var sz = "<span style='color: blue'>Z</span>";
            // local rotation
            //var t_r = bone.quaternion.clone();
            //bone.rotation.set(0,0,0);
            //var w_to_l_comp_q = bone.getWorldQuaternion(null).inverse();
            this.boneDebugDom.innerHTML = "selected joint_id: " + index + "<br>";
            this.boneDebugDom.innerHTML += "rot " + sx + "   : " + PoseEditor.radToDeg(bone.rotation.x) + "<br>";
            this.boneDebugDom.innerHTML += "rot " + sy + "   : " + PoseEditor.radToDeg(bone.rotation.y) + "<br>";
            this.boneDebugDom.innerHTML += "rot " + sz + "   : " + PoseEditor.radToDeg(bone.rotation.z) + "<br>";
            var p_bone = bone.parent;
            if (p_bone) {
                var p_index = p_bone.userData.index;
                this.boneDebugDom.innerHTML += "<br>";
                this.boneDebugDom.innerHTML += "parent joint_id: " + p_index + "<br>";
                this.boneDebugDom.innerHTML += "parent rot " + sx + " : " + PoseEditor.radToDeg(p_bone.rotation.x) + "<br>";
                this.boneDebugDom.innerHTML += "parent rot " + sy + " : " + PoseEditor.radToDeg(p_bone.rotation.y) + "<br>";
                this.boneDebugDom.innerHTML += "parent rot " + sz + " : " + PoseEditor.radToDeg(p_bone.rotation.z) + "<br>";
            }
        };
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
                    bone.quaternion.set(0, 0, 0, 0);
                    bone.updateMatrixWorld(true);
                    var w_to_l_comp_q = bone.getWorldQuaternion(null).inverse();
                    this.selectedSphere.updateMatrixWorld(true);
                    //console.log(this.selectedSphere.rotation);
                    var sph_q = this.selectedSphere.getWorldQuaternion(null);
                    // copy to sphere
                    this.selectedSphere.quaternion.copy(sph_q);
                    // update bone quaternion
                    var to_q = w_to_l_comp_q.multiply(sph_q).normalize();
                    bone.quaternion.copy(to_q);
                    bone.updateMatrixWorld(true);
                    //
                    if (this.config.isDebugging) {
                        this.updateBoneDebugInfo(model, this.selectedSphere.userData.jointIndex);
                    }
                }
            }
            else {
                this.isOnManipurator = false;
            }
            this.transformCtrl.update();
        };
        Editor.prototype.selectModel = function (e, isTouch) {
            e.preventDefault();
            var pos = this.cursorToWorld(e, isTouch);
            var raycaster = new THREE.Raycaster(this.camera.position, pos.sub(this.camera.position).normalize());
            var intersects = raycaster.intersectObjects(this.models.map(function (m) { return m.mesh; }));
            var mesh = intersects.length > 0 ? intersects[0].object : null;
            if (mesh == null)
                return;
            return [mesh.userData.modelData, intersects[0].point];
        };
        Editor.prototype.boneRay = function (e, isTouch) {
            var _this = this;
            if (this.isOnManipurator || this.dragging || this.models.length == 0) {
                return;
            }
            e.preventDefault();
            var pos = this.cursorToWorld(e, isTouch);
            // calc most nearest sphere
            var l = 9999999999;
            var selectedMarker = null;
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
                        selectedMarker = s;
                    }
                }
            });
            //console.log(l);
            if (selectedMarker != null) {
                this.selectedSphere = selectedMarker;
            }
            //
            if (this.selectedSphere != null) {
                var model = this.selectedSphere.userData.ownerModel;
                var bone = model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];
                // console.log("index: ", this.selectedSphere.userData.jointIndex);
                // update marker sprite color
                this.models.forEach(function (model) {
                    model.joint_markers.forEach(function (marker) {
                        marker.material.color.setHex(model.normalColor);
                    });
                });
                var index = this.selectedSphere.userData.jointIndex;
                model.joint_markers[index].material.color.setHex(model.selectedColor);
                //
                this.transformCtrl.attach(this.selectedSphere);
                this.transformCtrl.update();
                //
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
                if (this.config.isDebugging) {
                    // set debug view
                    this.boneDebugDom.style.display = "block";
                    this.updateBoneDebugInfo(model, this.selectedSphere.userData.jointIndex);
                }
            }
            else {
                // not found
                this.resetCtrl();
                if (this.config.isDebugging) {
                    this.boneDebugDom.style.display = "none";
                }
            }
            return this.selectedSphere;
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
            //
            if (this.config.isDebugging) {
                if (this.selectedSphere != null) {
                    var model = this.selectedSphere.userData.ownerModel;
                    this.updateBoneDebugInfo(model, this.selectedSphere.userData.jointIndex);
                }
            }
        };
        Editor.prototype.endDragging = function () {
            if (this.dragStart) {
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
            }
        };
        Editor.prototype.toggleIKStopper = function () {
            if (this.selectedSphere) {
                var model = this.selectedSphere.userData.ownerModel;
                var i = this.selectedSphere.userData.jointIndex;
                model.toggleIKPropagation(i);
            }
        };
        Editor.prototype.onResize = function () {
            this.renderer.setSize(this.screen.width, this.screen.height);
            this.camera.aspect = this.screen.aspect;
            this.camera.updateProjectionMatrix();
            this.camera2d.right = this.screen.width;
            this.camera2d.bottom = this.screen.height;
            this.camera2d.updateProjectionMatrix();
        };
        Editor.prototype.loadAndAppendModel = function (name, model_info, sprite_paths, callback) {
            var _this = this;
            this.incTask();
            var model = new PoseEditor.Model(name, model_info, sprite_paths, this.scene, this.scene2d, function (m, e) {
                _this.decTask();
                // default IK stopper node indexes
                var nx = model_info.ikStopJoints;
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
            this.transformCtrl.detach();
            this.selectedSphere = null;
        };
        Editor.prototype.moveCharactor = function (model, target_pos) {
            var pos = target_pos.clone();
            pos.sub(model.offsetOrgToBone);
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
                p_bone.updateMatrixWorld(true);
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
                // set
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
            var window_half_x = this.screen.width / 2.0;
            var window_half_y = this.screen.height / 2.0;
            var world_pos = new THREE.Vector3();
            world_pos.x = screen_pos.x / window_half_x - 1;
            world_pos.y = -screen_pos.y / window_half_y + 1;
            world_pos.unproject(this.camera);
            return world_pos;
        };
        Editor.prototype.worldToScreen = function (world_pos) {
            var window_half_x = this.screen.width / 2.0;
            var window_half_y = this.screen.height / 2.0;
            var screen_pos = world_pos.clone();
            screen_pos.project(this.camera);
            screen_pos.x = (screen_pos.x + 1) * window_half_x;
            screen_pos.y = (-screen_pos.y + 1) * window_half_y;
            return new THREE.Vector2(screen_pos.x, screen_pos.y);
        };
        Editor.prototype.cursorToWorld = function (e, isTouch) {
            var dom_pos = this.renderer.domElement.getBoundingClientRect();
            var client_x = isTouch ? e.changedTouches[0].pageX : e.clientX;
            var client_y = isTouch ? e.changedTouches[0].pageY : e.clientY;
            var mouse_x = client_x - dom_pos.left;
            var mouse_y = client_y - dom_pos.top;
            return this.screenToWorld(new THREE.Vector2(mouse_x, mouse_y));
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
            this.models.forEach(function (m) {
                m.destruct();
            });
            this.models = [];
            this.resetCtrl();
        };
        Editor.prototype.removeModel = function (index) {
            var model = this.models[index];
            model.destruct();
            this.models.splice(index, 1);
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
            //
            var vis = this.models.map(function (m) { return m.getMarkerVisibility(); });
            this.models.forEach(function (m) { return m.setMarkerVisibility(false); });
            var ss = this.selectedSphere;
            this.transformCtrl.detach();
            //
            this.render();
            var data = this.renderer.domElement.toDataURL(type);
            //
            this.models.forEach(function (m, i) {
                m.setMarkerVisibility(vis[i]);
            });
            if (ss) {
                this.transformCtrl.attach(ss);
            }
            return data;
        };
        Editor.prototype.incTask = function () {
            if (this.loadingTasks == 0) {
                this.screen.showLoadingDom();
            }
            this.loadingTasks++;
        };
        Editor.prototype.decTask = function () {
            this.loadingTasks--;
            if (this.loadingTasks == 0) {
                this.screen.hideLoadingDom();
            }
        };
        return Editor;
    })();
    PoseEditor.Editor = Editor;
})(PoseEditor || (PoseEditor = {}));
