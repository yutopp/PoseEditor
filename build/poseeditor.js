var PoseEditor;
(function (PoseEditor) {
    var Action = (function () {
        function Action(e) {
            this.editor = e;
        }
        Action.prototype.name = function () {
            return "";
        };
        Action.prototype.onActive = function () {
            console.log("base::onActive");
        };
        Action.prototype.onDestroy = function () {
            console.log("base::onDestroy");
        };
        Action.prototype.onTapStart = function (e, isTouch, isActive) {
            return true;
        };
        Action.prototype.onMoving = function (e, isTouch, isActive) {
            return true;
        };
        Action.prototype.onTapEnd = function (e, isTouch, isActive) {
            return true;
        };
        Action.prototype.onDoubleTap = function (e, isTouch, isActive) {
            return true;
        };
        Action.prototype.update = function (model) {
            return true;
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
        CameraAction.prototype.name = function () {
            return "camera";
        };
        CameraAction.prototype.onActive = function () {
            this.controls.enabled = true;
        };
        CameraAction.prototype.onTapStart = function (e, isTouch, isActive) {
            this.controls.enabled = isActive;
            if (this.controls.enabled) {
                this.controls.beginControl(e); // ;(
            }
            return true;
        };
        CameraAction.prototype.onTapEnd = function (e, isTouch) {
            return true;
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
                opacity: 0.2,
                transparent: true
            }));
            this.plane.visible = false;
            this.scene.add(this.plane);
            //
            var sphereGeo = new THREE.SphereGeometry(1, 14, 14);
            var material = new THREE.MeshBasicMaterial({ wireframe: true });
            this.targetMesh = new THREE.Mesh(sphereGeo, material);
            this.targetMesh.matrixWorldNeedsUpdate = true;
            this.targetMesh.visible = false;
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
var PoseEditor;
(function (PoseEditor) {
    var EventDispatcher = (function () {
        function EventDispatcher() {
            /// ==================================================
            /// Stack of Actions (execute from top to bottom)
            /// �� top     | ...    | index: n
            ///           | ...    | index: 1
            /// �� bottom  | Camera | index: 0
            /// ==================================================
            this.currentActions = [];
        }
        EventDispatcher.prototype.setup = function (editor, trans, ctrls, dom) {
            var _this = this;
            this.editor = editor;
            this.transformCtrl = trans;
            this.controls = ctrls;
            // add camera
            /// | Camera |
            var camAction = new PoseEditor.CameraAction(this.editor, this.controls);
            this.currentActions.push(camAction);
            camAction.onActive();
            // setup events hooks
            //
            dom.addEventListener('mousedown', function (e) { return _this.onTapStart(e, false); }, false);
            dom.addEventListener('touchstart', function (e) { return _this.onTapStart(e, true); }, false);
            dom.addEventListener('mousemove', function (e) { return _this.onMoving(e, false); }, false);
            dom.addEventListener('touchmove', function (e) { return _this.onMoving(e, true); }, false);
            dom.addEventListener('mouseup', function (e) { return _this.onTapEnd(e, false); }, false);
            dom.addEventListener('mouseleave', function (e) { return _this.onTapEnd(e, true); }, false);
            dom.addEventListener('touchend', function (e) { return _this.onTapEnd(e, true); }, false);
            dom.addEventListener('touchcancel', function (e) { return _this.onTapEnd(e, true); }, false);
            dom.addEventListener('dblclick', function (e) { return _this.onDoubleTap(e, false); }, false);
        };
        EventDispatcher.prototype.onModeSelect = function (mode, screen) {
            var _this = this;
            switch (mode) {
                case 0 /* Camera */:
                    /// | Camera |
                    this.destroyActionFrom(1);
                    screen.selectModeUI('camera');
                    break;
                case 1 /* Move */:
                    /// | Move   |
                    /// | Camera |
                    this.makeStandardModeForm('move', function () { return new PoseEditor.MoveAction(_this.editor); });
                    screen.selectModeUI('move');
                    break;
                case 2 /* FK */:
                    /// | FK     |
                    /// | Camera |
                    this.makeStandardModeForm('fk_action', function () { return new PoseEditor.FKAction(_this.editor, _this.transformCtrl); });
                    screen.selectModeUI('fk');
                    break;
                case 3 /* IK */:
                    /// | IK     |
                    /// | Camera |
                    this.makeStandardModeForm('ik_action', function () { return new PoseEditor.IKAction(_this.editor); });
                    screen.selectModeUI('ik');
                    break;
                default:
                    console.error('unexpected mode');
            }
        };
        // make standard form likes below
        /// | EXPECTED |
        /// | Camera   |
        EventDispatcher.prototype.makeStandardModeForm = function (actionName, factory) {
            // stack has some actions except for Camera
            if (this.currentActions.length > 1) {
                if (this.currentActions[1].name() != actionName) {
                    this.destroyActionFrom(1);
                }
                else {
                    // if stack of actions is already expected form, so do nothing
                    if (this.currentActions.length == 2)
                        return;
                    // stack has extra actions, so delete them
                    this.destroyActionFrom(2);
                    return;
                }
            }
            // push new action
            var action = factory();
            this.currentActions.push(action);
            action.onActive();
        };
        EventDispatcher.prototype.execActions = function (func) {
            for (var i = this.currentActions.length - 1; i >= 0; --i) {
                func(this.currentActions[i]);
            }
        };
        EventDispatcher.prototype.dispatchActions = function (func) {
            var i;
            for (i = this.currentActions.length - 1; i >= 0; --i) {
                var doNextAction = func(this.currentActions[i], true);
                if (!doNextAction)
                    break;
            }
            for (; i >= 0; --i) {
                func(this.currentActions[i], false);
            }
        };
        EventDispatcher.prototype.destroyActionFrom = function (index) {
            var rest = this.currentActions.splice(index, this.currentActions.length - index);
            rest.forEach(function (act) { return act.onDestroy(); });
        };
        EventDispatcher.prototype.onTapStart = function (e, isTouch) {
            e.preventDefault();
            this.dispatchActions(function (act, a) { return act.onTapStart(e, isTouch, a); });
        };
        EventDispatcher.prototype.onMoving = function (e, isTouch) {
            e.preventDefault();
            this.dispatchActions(function (act, a) { return act.onMoving(e, isTouch, a); });
        };
        EventDispatcher.prototype.onTapEnd = function (e, isTouch) {
            e.preventDefault();
            this.dispatchActions(function (act, a) { return act.onTapEnd(e, isTouch, a); });
        };
        EventDispatcher.prototype.onDoubleTap = function (e, isTouch) {
            e.preventDefault();
            this.dispatchActions(function (act, a) { return act.onDoubleTap(e, isTouch, a); });
        };
        return EventDispatcher;
    })();
    PoseEditor.EventDispatcher = EventDispatcher;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="action.ts"/>
/// <reference path="../ext/TransformControls.d.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var FKAction = (function (_super) {
        __extends(FKAction, _super);
        function FKAction(e, ctrls) {
            _super.call(this, e);
            this.isOnManipurator = false;
            this.transformCtrl = ctrls;
        }
        FKAction.prototype.name = function () {
            return "fk_action";
        };
        FKAction.prototype.onActive = function () {
            var _this = this;
            this.transformCtrl.setMode("rotate");
            this.transformCtrl.setSpace("local");
            this.transformCtrl.setSize(0.6);
            this.transformCtrl.addEventListener('change', function () { return _this.onTransformCtrl(); });
            this.transformCtrl.detach();
            this.editor.showAllMarkerSprite();
        };
        FKAction.prototype.onDestroy = function () {
            this.releaseJoint();
            this.editor.hideAllMarkerSprite();
        };
        FKAction.prototype.onTapStart = function (e, isTouch) {
            if (this.isOnManipurator)
                return false;
            var m = this.editor.selectJointMarker(e, isTouch);
            if (m == null) {
                this.releaseJoint();
                return true;
            }
            this.catchJoint(m);
            return false;
        };
        /*
                public onMoving(e: any, isTouch: boolean): boolean {
                }
        
                public onTapEnd(e: any, isTouch: boolean): boolean {
                }
        */
        FKAction.prototype.catchJoint = function (m) {
            this.currentJointMarker = m;
            this.model = this.currentJointMarker.userData.ownerModel;
            this.bone = this.model.mesh.skeleton.bones[this.currentJointMarker.userData.jointIndex];
            this.editor.selectMarkerSprite(this.currentJointMarker);
            // set initial pose of the bone
            this.bone.updateMatrixWorld(true);
            var to_q = this.bone.getWorldQuaternion(null);
            this.currentJointMarker.quaternion.copy(to_q);
            this.transformCtrl.attach(this.currentJointMarker);
            this.transformCtrl.update();
        };
        FKAction.prototype.releaseJoint = function () {
            if (this.currentJointMarker == null)
                return;
            this.currentJointMarker = null;
            this.transformCtrl.detach();
            this.isOnManipurator = false;
            this.editor.cancelAllMarkerSprite();
        };
        FKAction.prototype.onTransformCtrl = function () {
            if (this.transformCtrl.axis != null) {
                this.isOnManipurator = true;
                if (this.currentJointMarker != null) {
                    // local rotation
                    var t_r = this.bone.quaternion.clone();
                    this.bone.quaternion.set(0, 0, 0, 0);
                    this.bone.updateMatrixWorld(true);
                    var w_to_l_comp_q = this.bone.getWorldQuaternion(null).inverse();
                    this.currentJointMarker.updateMatrixWorld(true);
                    //console.log(this.selectedSphere.rotation);
                    var sph_q = this.currentJointMarker.getWorldQuaternion(null);
                    // copy to the marker model
                    this.currentJointMarker.quaternion.copy(sph_q);
                    // update bone quaternion
                    var to_q = w_to_l_comp_q.multiply(sph_q).normalize();
                    this.bone.quaternion.copy(to_q);
                    this.bone.updateMatrixWorld(true);
                }
            }
            else {
                this.isOnManipurator = false;
            }
            this.transformCtrl.update();
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
            this.isMoving = false;
        }
        IKAction.prototype.name = function () {
            return "ik_action";
        };
        IKAction.prototype.onActive = function () {
            this.editor.showAllMarkerSprite();
        };
        IKAction.prototype.onDestroy = function () {
            this.releaseJoint();
            this.editor.hideAllMarkerSprite();
        };
        IKAction.prototype.onTapStart = function (e, isTouch) {
            this.catchJoint(this.editor.selectJointMarker(e, isTouch));
            if (this.currentJointMarker == null)
                return true; // pass events to other action
            this.isMoving = true;
            this.beforeModelStatus = this.model.modelData();
            return false;
        };
        IKAction.prototype.onMoving = function (e, isTouch) {
            return this.moving(e, isTouch);
        };
        IKAction.prototype.onTapEnd = function (e, isTouch) {
            if (this.currentJointMarker == null || !this.isMoving)
                return true;
            this.isMoving = false;
            // record action
            var currentModelStatus = this.model.modelData();
            this.editor.history.didAction(new PoseEditor.TimeMachine.ChangeModelStatusAction(this.model, this.beforeModelStatus, currentModelStatus));
            return false;
        };
        IKAction.prototype.onDoubleTap = function (e, isTouch) {
            if (this.currentJointMarker == null)
                return true;
            var model = this.currentJointMarker.userData.ownerModel;
            var index = this.currentJointMarker.userData.jointIndex;
            model.toggleIKPropagation(index);
            return false;
        };
        IKAction.prototype.update = function (model) {
            if (this.currentJointMarker == null || !this.isMoving)
                return true;
            if (model == this.currentJointMarker.userData.ownerModel) {
                if (this.curPos != null) {
                    this.ik(this.bone, this.curPos);
                }
            }
            return true;
        };
        IKAction.prototype.catchJoint = function (m) {
            this.currentJointMarker = m;
            if (this.currentJointMarker == null) {
                this.releaseJoint();
                return;
            }
            this.model = this.currentJointMarker.userData.ownerModel;
            this.bone = this.model.mesh.skeleton.bones[this.currentJointMarker.userData.jointIndex];
            this.editor.selectMarkerSprite(this.currentJointMarker);
            //
            var pos = this.currentJointMarker.position;
            this.curPos = pos;
            this.editor.cursorHelper.setBeginState(pos);
        };
        IKAction.prototype.moving = function (e, isTouch) {
            if (this.currentJointMarker == null || !this.isMoving)
                return true;
            var pos = this.editor.cursorToWorld(e, isTouch);
            this.curPos = this.editor.cursorHelper.move(pos);
            return false;
        };
        IKAction.prototype.releaseJoint = function () {
            this.currentJointMarker = null;
            this.isMoving = false;
            this.editor.cancelAllMarkerSprite();
        };
        // CCD IK
        IKAction.prototype.ik = function (selected_bone, target_pos) {
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
            this.availableBones = [];
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
                    _this.defaultMat = [];
                    material = new THREE.MeshFaceMaterial(materials);
                    material.materials.forEach(function (mat) {
                        mat.skinning = true;
                        _this.defaultMat.push({
                            opacity: mat.opacity,
                            transparent: mat.transparent
                        });
                    });
                }
                else {
                    material = new THREE.MeshLambertMaterial({
                        color: 0xffffff,
                        skinning: true
                    });
                    _this.defaultMat = {
                        opacity: material.opacity,
                        transparent: material.transparent
                    };
                }
                // create mesh data
                _this.mesh = new THREE.SkinnedMesh(geometry, material);
                if (init_pos) {
                    _this.mesh.position.set(init_pos[0], init_pos[1], init_pos[2]);
                }
                if (init_scale) {
                    _this.mesh.scale.set(init_scale[0], init_scale[1], init_scale[2]);
                }
                //
                _this.mesh.userData = {
                    modelData: _this
                };
                // add mesh to model
                _this.scene.add(_this.mesh);
                //
                _this.setupAppendixData(sprite_paths, model_info, callback);
            }, texture_path);
        }
        Model.prototype.selectionState = function (isActive) {
            var _this = this;
            if (this.defaultMat == null)
                return;
            var C = 0.7;
            if (this.mesh.material.type == 'MeshFaceMaterial') {
                this.mesh.material.materials.forEach(function (mat, i) {
                    var opacity = isActive ? C : _this.defaultMat[i].opacity;
                    var transparent = isActive ? true : _this.defaultMat[i].transparent;
                    mat.opacity = opacity;
                    mat.transparent = transparent;
                });
            }
            else {
                var opacity = isActive ? C : this.defaultMat.opacity;
                var transparent = isActive ? true : this.defaultMat.transparent;
                this.mesh.material.opacity = opacity;
                this.mesh.material.transparent = transparent;
            }
        };
        Model.prototype.setupAppendixData = function (sprite_paths, model_info, callback) {
            var _this = this;
            //
            var bone_limits = model_info.boneLimits;
            var base_joint_id = model_info.baseJointId;
            var ikDefaultPropagation = model_info.ikDefaultPropagation;
            var hiddenJoints = model_info.hiddenJoints;
            //
            var default_cross_origin = THREE.ImageUtils.crossOrigin;
            THREE.ImageUtils.crossOrigin = '*';
            //
            this.mesh.skeleton.bones.forEach(function (bone, index) {
                bone.matrixWorldNeedsUpdate = true;
                bone.updateMatrixWorld(true);
                bone.userData = {
                    index: index,
                    preventIKPropagation: !ikDefaultPropagation,
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
            //
            this.joint_markers = new Array(this.mesh.skeleton.bones.length);
            this.joint_spheres = new Array(this.mesh.skeleton.bones.length);
            // load textures(marker for bone)
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
            // make sphere objects(attached by transform ctrl)
            this.mesh.skeleton.bones.forEach(function (bone, index) {
                if (hiddenJoints.indexOf(index) != -1) {
                    // this bone is hidden
                    return;
                }
                _this.availableBones.push(bone);
                //
                // load textures(marker for bone)
                var sprite = _this.createMarkerSprite(bone);
                sprite.scale.set(_this.markerScale[0], _this.markerScale[1], 1);
                sprite.visible = false;
                _this.joint_markers[index] = sprite;
                _this.scene2d.add(sprite);
                //var sphere_geo = new THREE.SphereGeometry(1, 14, 14);
                //var material = new THREE.MeshBasicMaterial({wireframe: true});
                //var sphere = new THREE.Mesh(sphere_geo, material);
                var markerMesh = new THREE.AxisHelper(2.0);
                markerMesh.matrixWorldNeedsUpdate = true;
                markerMesh.userData = {
                    jointIndex: index,
                    ownerModel: _this
                };
                //markerMesh.visible = true;
                markerMesh.visible = false;
                _this.joint_spheres[index] = markerMesh; // TODO: rename
                _this.scene.add(markerMesh);
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
        /*
                public wireframe(e: boolean = null): boolean {
                    if ( e == null ) return this.mesh.material.wireframe;
        
                    this.mesh.wireframe = e;
                    return null;
                }
        */
        Model.prototype.modelData = function () {
            var joints = this.mesh.skeleton.bones.map(function (bone) {
                var q = bone.quaternion;
                return {
                    quaternion: [q.x, q.y, q.z, q.w]
                };
            });
            var p = this.mesh.position;
            var q = this.mesh.quaternion;
            return {
                name: this.name,
                position: [p.x, p.y, p.z],
                quaternion: [q.x, q.y, q.z, q.w],
                joints: joints
            };
        };
        Model.prototype.loadModelData = function (status) {
            var _this = this;
            if (!this.ready)
                return;
            var joints = status.joints;
            joints.forEach(function (joint, index) {
                var q = joint.quaternion;
                var target_q = _this.mesh.skeleton.bones[index].quaternion;
                target_q.set(q[0], q[1], q[2], q[3]);
            });
            var p = status.position;
            var q = status.quaternion;
            this.mesh.position.set(p[0], p[1], p[2]);
            this.mesh.quaternion.set(q[0], q[1], q[2], q[3]);
        };
        Model.prototype.toggleIKPropagation = function (bone_index) {
            var bone = this.mesh.skeleton.bones[bone_index];
            bone.userData.preventIKPropagation = !bone.userData.preventIKPropagation;
            var old_sprite = this.joint_markers[bone_index];
            var c = old_sprite.material.color.getHex();
            var sprite = this.createMarkerSprite(bone);
            sprite.material.color.setHex(c);
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
        Model.prototype.createMarkerSprite = function (bone) {
            if (bone.userData.preventIKPropagation) {
                return new THREE.Sprite(this.specialMarkerMat.clone());
            }
            else {
                return new THREE.Sprite(this.normalMarkerMat.clone());
            }
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
        MoveAction.prototype.name = function () {
            return "move";
        };
        MoveAction.prototype.onDestroy = function () {
            this.releaseModel();
            this.editor.setSelectedModel(null);
        };
        MoveAction.prototype.onTapStart = function (e, isTouch) {
            return this.catchModel(e, isTouch);
        };
        MoveAction.prototype.onMoving = function (e, isTouch) {
            return this.moveModel(e, isTouch);
        };
        MoveAction.prototype.onTapEnd = function (e, isTouch) {
            return this.releaseModel();
        };
        MoveAction.prototype.catchModel = function (e, isTouch) {
            var mp = this.editor.selectModel(e, isTouch);
            if (mp == null) {
                this.releaseModel();
                this.editor.setSelectedModel(null);
                return true;
            }
            this.currentModel = mp[0];
            var localConfPos = mp[1];
            this.offsetOrgToBone = localConfPos.clone().sub(this.currentModel.mesh.position);
            this.editor.setSelectedModel(this.currentModel);
            //
            this.editor.cursorHelper.setBeginState(localConfPos.clone());
            return false;
        };
        MoveAction.prototype.moveModel = function (e, isTouch) {
            if (this.currentModel == null)
                return true;
            var pos = this.editor.cursorToWorld(e, isTouch);
            var curPos = this.editor.cursorHelper.move(pos);
            curPos.sub(this.offsetOrgToBone);
            this.currentModel.mesh.position.copy(curPos);
            return false;
        };
        MoveAction.prototype.releaseModel = function () {
            if (this.currentModel == null)
                return true;
            this.currentModel = null;
            return false;
        };
        return MoveAction;
    })(PoseEditor.Action);
    PoseEditor.MoveAction = MoveAction;
})(PoseEditor || (PoseEditor = {}));
var PoseEditor;
(function (PoseEditor) {
    var Screen;
    (function (Screen) {
        var EventDispatcher = (function () {
            function EventDispatcher() {
                //
                this.events = {};
            }
            EventDispatcher.prototype.addCallback = function (type, f) {
                if (this.events[type] == null) {
                    this.events[type] = [];
                }
                this.events[type].push(f);
            };
            EventDispatcher.prototype.dispatchCallback = function (type) {
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
            return EventDispatcher;
        })();
        (function (Mode) {
            Mode[Mode["Camera"] = 0] = "Camera";
            Mode[Mode["Move"] = 1] = "Move";
            Mode[Mode["FK"] = 2] = "FK";
            Mode[Mode["IK"] = 3] = "IK";
        })(Screen.Mode || (Screen.Mode = {}));
        var Mode = Screen.Mode;
        var Dialog = (function (_super) {
            __extends(Dialog, _super);
            function Dialog(parentDom) {
                var _this = this;
                _super.call(this);
                this.actions = [];
                this.parentDom = parentDom;
                // base element
                this.baseDom = document.createElement("div");
                this.baseDom.style.position = 'absolute';
                //this.baseDom.style.padding = "10px";
                this.baseDom.style.borderRadius = "5px";
                this.baseDom.style.backgroundColor = "#fff";
                this.baseDom.style.display = 'none';
                // container element
                this.containerDom = document.createElement("div");
                {
                    var d = this.containerDom;
                }
                this.baseDom.appendChild(this.containerDom);
                // selection element
                this.selectionDom = document.createElement("div");
                {
                    var d = this.selectionDom;
                    d.style.backgroundColor = "#00f";
                    {
                        var dom = document.createElement("input");
                        dom.type = "button";
                        dom.value = 'submit';
                        dom.addEventListener("click", function () {
                            var table = {};
                            _this.getElementValues(table);
                            _this.disposeAllElements();
                            _this.dispatchCallback('onsubmit', table);
                            _this.hide();
                        });
                        d.appendChild(dom);
                    }
                    {
                        var dom = document.createElement("input");
                        dom.type = "button";
                        dom.value = 'cancel';
                        dom.addEventListener("click", function () {
                            _this.disposeAllElements();
                            _this.dispatchCallback('oncancel');
                            _this.hide();
                        });
                        d.appendChild(dom);
                    }
                }
                this.baseDom.appendChild(this.selectionDom);
                //
                this.updatePosisionAndSize();
            }
            Dialog.prototype.updatePosisionAndSize = function () {
                this.updateSize();
                this.updatePosision();
            };
            Dialog.prototype.updatePosision = function () {
                var offsetW = this.parentDom.offsetWidth;
                var offsetH = this.parentDom.offsetHeight;
                var px = Math.abs(offsetW - this.width) / 2;
                var py = Math.abs(offsetH - this.height) / 2;
                this.baseDom.style.marginLeft = px + 'px';
                this.baseDom.style.marginTop = py + 'px';
            };
            Dialog.prototype.updateSize = function () {
                var offsetW = this.parentDom.offsetWidth;
                var offsetH = this.parentDom.offsetHeight;
                this.width = Math.max(offsetW - 40, 40);
                this.height = Math.max(offsetH - 40, 40);
                this.baseDom.style.width = this.width + 'px';
                this.baseDom.style.height = this.height + 'px';
            };
            Dialog.prototype.show = function () {
                this.baseDom.style.display = 'inline';
                this.dispatchCallback('show');
            };
            Dialog.prototype.hide = function () {
                this.baseDom.style.display = 'none';
                this.dispatchCallback('hide');
            };
            Dialog.prototype.setValues = function (data) {
                var _this = this;
                if (data) {
                    data.forEach(function (v) {
                        var type = v.type;
                        var name = v.name;
                        switch (type) {
                            case 'radio':
                                _this.addElement(name, function (wrapperDom) {
                                    // construct radio boxes
                                    var num = v.value.length;
                                    for (var i = 0; i < num; ++i) {
                                        var value = v.value[i];
                                        var label = v.label[i];
                                        var labelDom = document.createElement("label");
                                        labelDom.innerText = label;
                                        var inputDom = document.createElement("input");
                                        inputDom.type = 'radio';
                                        inputDom.name = 'poseeditor-' + name;
                                        inputDom.value = value;
                                        if (v.selectedValue) {
                                            if (value == v.selectedValue) {
                                                inputDom.checked = true;
                                            }
                                        }
                                        labelDom.appendChild(inputDom);
                                        wrapperDom.appendChild(labelDom);
                                    }
                                }, function () {
                                    // result collector
                                    var domName = 'poseeditor-' + name;
                                    var radios = document.getElementsByName(domName);
                                    var format = "";
                                    for (var i = 0; i < radios.length; ++i) {
                                        var radio = radios[i];
                                        if (radio.checked) {
                                            format = radio.value;
                                            break;
                                        }
                                    }
                                    return format;
                                });
                                break;
                            case 'select':
                                _this.addElement(name, function (wrapperDom) {
                                    // construct radio boxes
                                    var num = v.value.length;
                                    var selectDom = document.createElement("select");
                                    selectDom.name = 'poseeditor-' + name;
                                    for (var i = 0; i < num; ++i) {
                                        var value = v.value[i];
                                        var label = v.label[i];
                                        var optionDom = document.createElement("option");
                                        optionDom.value = value;
                                        optionDom.innerText = label;
                                        if (v.selectedValue) {
                                            if (value == v.selectedValue) {
                                                optionDom.selected = true;
                                            }
                                        }
                                        selectDom.appendChild(optionDom);
                                    }
                                    wrapperDom.appendChild(selectDom);
                                }, function () {
                                    // result collector
                                    var domName = 'poseeditor-' + name;
                                    var selects = document.getElementsByName(domName);
                                    if (selects.length != 1) {
                                        // TODO: throw exception
                                        console.warn("");
                                    }
                                    var select = selects[0];
                                    var index = select.selectedIndex;
                                    return select.options[index].value;
                                });
                                break;
                            case 'input':
                                _this.addElement(name, function (wrapperDom) {
                                    // construct input box
                                    var labelDom = document.createElement("label");
                                    labelDom.innerText = v.label;
                                    var inputDom = document.createElement("input");
                                    inputDom.name = 'poseeditor-' + name;
                                    inputDom.value = v.value;
                                    labelDom.appendChild(inputDom);
                                    wrapperDom.appendChild(labelDom);
                                }, function () {
                                    // result collector
                                    var domName = 'poseeditor-' + name;
                                    var selects = document.getElementsByName(domName);
                                    if (selects.length != 1) {
                                        // TODO: throw exception
                                        console.warn("");
                                    }
                                    var input = selects[0];
                                    return input.value;
                                });
                                break;
                            default:
                                console.warn('unsupported: ' + type);
                                break;
                        }
                    });
                }
            };
            Dialog.prototype.addElement = function (name, createDom, clawlAction) {
                var _this = this;
                //
                var wrapperDom = document.createElement("div");
                createDom(wrapperDom);
                this.containerDom.appendChild(wrapperDom);
                //
                var action = {
                    destruction: function () {
                        _this.containerDom.removeChild(wrapperDom);
                    },
                    crawl: function (table) {
                        var result = clawlAction();
                        table[name] = result;
                    }
                };
                this.actions.push(action);
            };
            Dialog.prototype.disposeAllElements = function () {
                this.actions.forEach(function (a) { return a.destruction(); });
                this.actions = [];
            };
            Dialog.prototype.getElementValues = function (table) {
                this.actions.forEach(function (a) { return a.crawl(table); });
            };
            return Dialog;
        })(EventDispatcher);
        var ControlDialog = (function (_super) {
            __extends(ControlDialog, _super);
            function ControlDialog(parentDom) {
                _super.call(this, parentDom);
            }
            return ControlDialog;
        })(Dialog);
        var ControlPanel = (function () {
            function ControlPanel(screen) {
                var _this = this;
                this.toggleDom = {};
                this.doms = {};
                this.dialogs = {};
                this.screen = screen;
                //
                this.panelDom = document.createElement("div");
                {
                    var s = this.panelDom.style;
                    s.position = "absolute";
                    s.right = "0";
                    s.width = (this.screen.width / 10) + "px";
                    s.height = "100%";
                    s.backgroundColor = "#fff";
                }
                this.screen.targetDom.appendChild(this.panelDom);
                //
                this.toggleDom['camera'] = this.addButton(function (dom) {
                    dom.value = 'camera';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onmodeclick", 0 /* Camera */);
                    });
                });
                //
                this.toggleDom['move'] = this.addButton(function (dom) {
                    dom.value = 'move/select';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onmodeclick", 1 /* Move */);
                    });
                });
                //
                this.toggleDom['fk'] = this.addButton(function (dom) {
                    dom.value = 'FK';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onmodeclick", 2 /* FK */);
                    });
                });
                //
                this.toggleDom['ik'] = this.addButton(function (dom) {
                    dom.value = 'IK';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onmodeclick", 3 /* IK */);
                    });
                });
                //
                this.doms['undo'] = this.addButton(function (dom) {
                    dom.value = 'Undo';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onundo");
                    });
                    dom.disabled = true;
                });
                //
                this.doms['redo'] = this.addButton(function (dom) {
                    dom.value = 'Redo';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onredo");
                    });
                    dom.disabled = true;
                });
                ///
                this.dialogs['download'] = this.addDialog(function (c) {
                    c.addCallback('show', function () {
                        _this.screen.dispatchCallback('showdownload', function (data) {
                            c.setValues(data);
                        });
                    });
                    c.addCallback('onsubmit', function (data) {
                        _this.screen.dispatchCallback('ondownload', data);
                    });
                });
                this.doms['download'] = this.addButton(function (dom) {
                    dom.value = 'Download';
                    dom.addEventListener("click", function () {
                        _this.dialogs['download'].show();
                    });
                });
                ///
                ///
                this.dialogs['addmodel'] = this.addDialog(function (c) {
                    c.addCallback('show', function () {
                        _this.screen.dispatchCallback('showaddmodel', function (data) {
                            c.setValues(data);
                        });
                    });
                    c.addCallback('onsubmit', function (data) {
                        _this.screen.dispatchCallback('onaddmodel', data);
                    });
                });
                this.doms['addmodel'] = this.addButton(function (dom) {
                    dom.value = 'AddModel';
                    dom.addEventListener("click", function () {
                        _this.dialogs['addmodel'].show();
                    });
                });
                ///
                this.doms['deletemodel'] = this.addButton(function (dom) {
                    dom.value = 'DeleteModel';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("ondeletemodel");
                    });
                    dom.disabled = true;
                });
                ///
                this.dialogs['config'] = this.addDialog(function (c) {
                    c.addCallback('show', function () {
                        _this.screen.dispatchCallback('showconfig', function (data) {
                            c.setValues(data);
                        });
                    });
                    c.addCallback('onsubmit', function (data) {
                        _this.screen.dispatchCallback('onconfig', data);
                    });
                });
                this.doms['config'] = this.addButton(function (dom) {
                    dom.value = 'Config';
                    dom.addEventListener("click", function () {
                        // call onshowdownload
                        _this.dialogs['config'].show();
                    });
                });
                ///
                this.doms['restore'] = this.addButton(function (dom) {
                    dom.value = 'Restore';
                    // to open the file dialog
                    var fileInput = document.createElement("input");
                    fileInput.type = 'file';
                    fileInput.style.display = 'none';
                    fileInput.onchange = function (e) {
                        var files = fileInput.files;
                        if (files.length != 1) {
                            return false;
                        }
                        var file = files[0];
                        var reader = new FileReader();
                        reader.onload = function (e) {
                            var data = reader.result;
                            _this.screen.dispatchCallback('onrestore', data);
                        };
                        reader.readAsText(file);
                    };
                    dom.appendChild(fileInput);
                    dom.addEventListener("click", function () { return fileInput.click(); });
                });
            }
            ControlPanel.prototype.addButton = function (callback) {
                var dom = document.createElement("input");
                dom.type = "button";
                callback(dom);
                this.panelDom.appendChild(dom);
                return dom;
            };
            ControlPanel.prototype.addDialog = function (callback) {
                var ctrl = new ControlDialog(this.screen.targetDom);
                callback(ctrl);
                this.screen.targetDom.appendChild(ctrl.baseDom);
                return ctrl;
            };
            ControlPanel.prototype.selectModeUI = function (mode) {
                for (var key in this.toggleDom) {
                    this.toggleDom[key].disabled = false;
                }
                this.toggleDom[mode].disabled = true;
            };
            ControlPanel.prototype.changeUIStatus = function (name, callback) {
                var dom = this.doms[name];
                if (dom == null)
                    return false;
                return callback(dom);
            };
            return ControlPanel;
        })();
        var ScreenController = (function (_super) {
            __extends(ScreenController, _super);
            function ScreenController(parentDomId, config) {
                var _this = this;
                _super.call(this);
                //
                this.loadingDom = null;
                //
                var parentDom = document.getElementById(parentDomId);
                if (parentDom == null) {
                    console.log("parent dom was not found...");
                }
                this.targetDom = parentDom ? parentDom : document.body;
                //
                this.width = this.targetDom.offsetWidth;
                this.height = this.targetDom.offsetHeight;
                this.aspect = this.width / this.height;
                //
                if (config.loadingImagePath) {
                    this.loadingDom = document.createElement("img");
                    this.loadingDom.src = config.loadingImagePath;
                    this.loadingDom.style.position = 'absolute';
                    this.loadingDom.style.padding = "10px";
                    this.loadingDom.style.borderRadius = "5px";
                    this.loadingDom.style.backgroundColor = "#fff";
                    this.loadingDom.style.display = "none";
                    this.targetDom.appendChild(this.loadingDom);
                }
                //
                this.controlPanel = new ControlPanel(this);
                //
                window.addEventListener('resize', function () { return _this.onResize(); }, false);
            }
            ScreenController.prototype.selectModeUI = function (mode) {
                this.controlPanel.selectModeUI(mode);
            };
            ScreenController.prototype.changeUIStatus = function (name, callback) {
                return this.controlPanel.changeUIStatus(name, callback);
            };
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
            return ScreenController;
        })(EventDispatcher);
        Screen.ScreenController = ScreenController;
    })(Screen = PoseEditor.Screen || (PoseEditor.Screen = {}));
})(PoseEditor || (PoseEditor = {}));
var PoseEditor;
(function (PoseEditor) {
    var TimeMachine;
    (function (TimeMachine) {
        var Action = (function () {
            function Action() {
            }
            Action.prototype.undo = function () {
            };
            Action.prototype.redo = function () {
            };
            return Action;
        })();
        TimeMachine.Action = Action;
        var ChangeModelStatusAction = (function (_super) {
            __extends(ChangeModelStatusAction, _super);
            function ChangeModelStatusAction(m, b, a) {
                _super.call(this);
                this.model = m;
                this.beforeStatus = b;
                this.afterStatus = a;
            }
            ChangeModelStatusAction.prototype.undo = function () {
                this.model.loadModelData(this.beforeStatus);
            };
            ChangeModelStatusAction.prototype.redo = function () {
                this.model.loadModelData(this.afterStatus);
            };
            return ChangeModelStatusAction;
        })(Action);
        TimeMachine.ChangeModelStatusAction = ChangeModelStatusAction;
        var Machine = (function () {
            function Machine(screen) {
                this.history = [];
                this.currentStep = -1;
                this.screen = screen; // TO data binding... (nullable)
            }
            Machine.prototype.undo = function () {
                if (this.currentStep < 0 || this.history.length == 0)
                    return;
                if (this.currentStep >= this.history.length)
                    this.currentStep = this.history.length - 1;
                this.history[this.currentStep].undo();
                this.currentStep--;
                this.updateUI();
            };
            Machine.prototype.redo = function () {
                if (this.currentStep >= this.history.length)
                    return;
                if (this.currentStep < 0)
                    this.currentStep = 0;
                this.history[this.currentStep].redo();
                this.currentStep++;
                this.updateUI();
            };
            Machine.prototype.didAction = function (act) {
                if (this.currentStep >= 0 && this.currentStep + 1 < this.history.length) {
                    // remove all action to redo
                    var deleteFrom = this.currentStep + 1;
                    this.history.splice(deleteFrom, this.history.length - deleteFrom);
                }
                this.history.push(act);
                this.currentStep++;
                this.updateUI();
            };
            Machine.prototype.updateUI = function () {
                var _this = this;
                if (this.screen) {
                    this.screen.changeUIStatus('undo', function (dom) {
                        if (_this.currentStep >= 0) {
                            dom.disabled = false;
                        }
                        else {
                            dom.disabled = true;
                        }
                    });
                    this.screen.changeUIStatus('redo', function (dom) {
                        var isFirstTime = _this.currentStep == 0 && _this.history.length == 1; // ;( FIX
                        if (!isFirstTime && _this.currentStep < _this.history.length) {
                            dom.disabled = false;
                        }
                        else {
                            dom.disabled = true;
                        }
                    });
                }
            };
            return Machine;
        })();
        TimeMachine.Machine = Machine;
    })(TimeMachine = PoseEditor.TimeMachine || (PoseEditor.TimeMachine = {}));
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
/// <reference path="time_machine.ts"/>
/// <reference path="event_dispatcher.ts"/>
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
                _this.update();
                _this.render();
            };
            //
            this.models = [];
            //
            this.loadingTasks = 0;
            this.boneDebugDom = null;
            //
            this.currentValues = {};
            // setup screen
            this.screen = new PoseEditor.Screen.ScreenController(parentDomId, config);
            this.eventDispatcher = new PoseEditor.EventDispatcher();
            this.history = new PoseEditor.TimeMachine.Machine(this.screen);
            // setup screen
            this.screen.addCallback('resize', function () { return _this.onResize(); });
            this.screen.addCallback('onmodeclick', function (m) {
                _this.eventDispatcher.onModeSelect(m, _this.screen);
            });
            this.screen.addCallback('onundo', function () { return _this.history.undo(); });
            this.screen.addCallback('onredo', function () { return _this.history.redo(); });
            this.screen.addCallback('showdownload', function (f) {
                _this.setDownloadTypes(f);
            });
            this.screen.addCallback('ondownload', function (data) {
                _this.onDownload(data);
            });
            this.screen.addCallback('showaddmodel', function (f) {
                _this.setAddModelTypes(f);
            });
            this.screen.addCallback('onaddmodel', function (data) {
                _this.onAddModel(data);
            });
            this.screen.addCallback('ondeletemodel', function (data) {
                _this.onDeleteModel();
            });
            this.screen.addCallback('showconfig', function (f) {
                _this.setConfigTypes(f);
            });
            this.screen.addCallback('onconfig', function (data) {
                _this.onConfig(data);
            });
            this.screen.addCallback('onrestore', function (data) {
                _this.onRestore(data);
            });
            // setup
            this.eventDispatcher.onModeSelect(0 /* Camera */, this.screen);
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
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.target.copy(defaultCamera.lookAt);
            this.controls.update();
            this.controls.enabled = false;
            //
            this.transformCtrl = new THREE.TransformControls(this.camera, this.renderer.domElement);
            this.scene.add(this.transformCtrl);
            // intersect helper
            this.cursorHelper = new PoseEditor.CursorPositionHelper(this.scene, this.camera, this.controls);
            // save Config
            this.config = config;
            this.currentValues['bgColorHex'] = config.backgroundColorHex;
            this.currentValues['bgAlpha'] = config.backgroundAlpha;
            //
            this.eventDispatcher.setup(this, this.transformCtrl, this.controls, this.renderer.domElement);
            // jump into loop
            this.renderLoop();
        }
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
        //
        Editor.prototype.selectModel = function (e, isTouch) {
            e.preventDefault();
            var pos = this.cursorToWorld(e, isTouch);
            var raycaster = new THREE.Raycaster(this.camera.position, pos.sub(this.camera.position).normalize());
            var intersects = raycaster.intersectObjects(this.models.map(function (m) { return m.mesh; }));
            var mesh = intersects.length > 0 ? intersects[0].object : null;
            if (mesh == null)
                return null;
            var modelPos = mesh.position.clone();
            var localConfPos = intersects[0].point.clone();
            return [mesh.userData.modelData, localConfPos];
        };
        //
        Editor.prototype.selectJointMarker = function (e, isTouch) {
            var _this = this;
            e.preventDefault();
            var pos = this.cursorToWorld(e, isTouch);
            // calc most nearest sphere
            var l = 9999999999.9;
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
            return selectedMarker;
        };
        //
        Editor.prototype.setSelectedModel = function (m) {
            var _this = this;
            // cancel selection
            if (this.selectedModel) {
                this.selectedModel.selectionState(false);
            }
            this.selectedModel = m;
            if (this.selectedModel) {
                // select
                this.selectedModel.selectionState(true);
            }
            // UI operation
            this.screen.changeUIStatus('deletemodel', function (dom) {
                dom.disabled = _this.selectedModel == null;
            });
        };
        Editor.prototype.cancelAllMarkerSprite = function () {
            // update marker sprite color (to not selected color)
            this.models.forEach(function (model) {
                model.joint_markers.forEach(function (sprite) {
                    if (sprite) {
                        sprite.material.color.setHex(model.normalColor);
                    }
                });
            });
        };
        Editor.prototype.selectMarkerSprite = function (markerMesh) {
            this.cancelAllMarkerSprite();
            var model = markerMesh.userData.ownerModel;
            var index = markerMesh.userData.jointIndex;
            var sprite = model.joint_markers[index];
            if (sprite) {
                sprite.material.color.setHex(model.selectedColor);
            }
        };
        Editor.prototype.hideAllMarkerSprite = function () {
            this.models.forEach(function (model) {
                model.joint_markers.forEach(function (marker) {
                    marker.visible = false;
                });
            });
        };
        Editor.prototype.showAllMarkerSprite = function () {
            this.models.forEach(function (model) {
                model.joint_markers.forEach(function (marker) {
                    marker.visible = true;
                });
            });
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
                var nx = model_info.ikInversePropagationJoints;
                nx.forEach(function (jointIndex) {
                    model.toggleIKPropagation(jointIndex);
                });
                if (callback) {
                    callback(m, e);
                }
            });
            this.models.push(model);
        };
        Editor.prototype.resetCtrl = function () {
            this.transformCtrl.detach();
        };
        Editor.prototype.update = function () {
            var _this = this;
            this.scene.updateMatrixWorld(true);
            this.scene2d.updateMatrixWorld(true);
            this.models.forEach(function (model) {
                if (model.isReady()) {
                    _this.eventDispatcher.execActions(function (act) { return act.update(model); });
                    //
                    model.availableBones.forEach(function (bone) {
                        var index = bone.userData.index;
                        var b_pos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
                        var s_b_pos = _this.worldToScreen(b_pos);
                        //
                        var markerSprite = model.joint_markers[index];
                        markerSprite.position.set(s_b_pos.x, s_b_pos.y, -1);
                        //
                        var markerMesh = model.joint_spheres[index];
                        markerMesh.position.set(b_pos.x, b_pos.y, b_pos.z);
                    });
                }
            });
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
        Editor.prototype.setDownloadTypes = function (f) {
            var order = [
                {
                    type: 'radio',
                    name: 'format',
                    value: ['png', 'jpeg', 'json'],
                    label: ['PNG', 'JPEG', 'JSON'],
                    selectedValue: this.currentValues['format']
                }
            ];
            f(order);
        };
        Editor.prototype.onDownload = function (data) {
            var type = data['format'];
            if (type == null)
                return; // TODO: notice error
            this.currentValues['format'] = type;
            this.download(type);
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
        Editor.prototype.download = function (type) {
            if (type === void 0) { type = 'png'; }
            var dataUrl = this.toDataUrl(type);
            // ???: :(
            var a = document.createElement("a");
            a.download = "poseeditor"; // workaround for typescript...
            a.title = "download snapshot";
            a.href = dataUrl;
            a.click();
            delete a;
        };
        Editor.prototype.setAddModelTypes = function (f) {
            var value = [];
            var label = [];
            for (var key in this.modelInfoTable) {
                value.push(key);
                label.push(key); // TODO: change
            }
            var order = [
                {
                    type: 'select',
                    name: 'modelName',
                    value: value,
                    label: label,
                    selectedValue: this.currentValues['modelName']
                }
            ];
            f(order);
        };
        Editor.prototype.onAddModel = function (data) {
            var name = data['modelName'];
            if (name == null)
                return; // TODO: notice error
            this.currentValues['modelName'] = name;
            this.appendModel(name, function (model, error) {
                if (error) {
                    console.log("error: ", error);
                }
            });
        };
        Editor.prototype.onDeleteModel = function () {
            if (this.selectedModel) {
                this.removeModel(this.selectedModel);
            }
        };
        Editor.prototype.setConfigTypes = function (f) {
            var order = [
                {
                    type: 'input',
                    name: 'bgColorHex',
                    value: '0x' + this.currentValues['bgColorHex'].toString(16),
                    label: '色'
                },
                {
                    type: 'input',
                    name: 'bgAlpha',
                    value: this.currentValues['bgAlpha'].toFixed(6),
                    label: 'アルファ'
                }
            ];
            f(order);
        };
        Editor.prototype.onConfig = function (data) {
            ///
            // colors
            var bgColorHex = data['bgColorHex'];
            if (bgColorHex) {
                this.currentValues['bgColorHex'] = parseInt(bgColorHex, 16);
            }
            var bgAlpha = data['bgAlpha'];
            if (bgAlpha) {
                this.currentValues['bgAlpha'] = parseFloat(bgAlpha);
            }
            this.setClearColor(this.currentValues['bgColorHex'], this.currentValues['bgAlpha']);
            ///
        };
        Editor.prototype.onRestore = function (data) {
            var jsonString = data;
            if (jsonString == null)
                return;
            this.loadSceneDataFromString(jsonString);
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
        Editor.prototype.removeModelByIndex = function (index) {
            var model = this.models[index];
            model.destruct();
            this.models.splice(index, 1);
            this.resetCtrl();
            this.setSelectedModel(null);
        };
        Editor.prototype.removeModel = function (model) {
            var index = this.models.indexOf(model);
            if (index != -1) {
                this.removeModelByIndex(index);
            }
        };
        Editor.prototype.makeDataUrl = function (type) {
            //
            var vis = this.models.map(function (m) { return m.getMarkerVisibility(); });
            this.models.forEach(function (m) { return m.setMarkerVisibility(false); });
            // var ss = this.selectedSphere;
            // this.transformCtrl.detach();
            //
            this.render();
            var data = this.renderer.domElement.toDataURL(type);
            //
            this.models.forEach(function (m, i) {
                m.setMarkerVisibility(vis[i]);
            });
            // if ( ss ) {
            // this.transformCtrl.attach(ss);
            // }
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
