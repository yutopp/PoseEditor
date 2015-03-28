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

module PoseEditor {
    export class Editor {
        constructor(
            parentDomId: string,
            modelInfoTable: {[key: string]: ModelInfo;},
            spritePaths: SpritePaths,
            defaultCamera: CameraConfig = new CameraConfig(),
            config: Config = new Config()
        ) {
            // setup screen
            this.screen = new Screen.ScreenController(parentDomId, config);
            this.screen.addCallback('resize', () => this.onResize());
            this.screen.addCallback('onmodeclick', (m: Screen.Mode) => this.onModeClick(m));

            //
            this.modelInfoTable = modelInfoTable;
            this.spritePaths = spritePaths;

            //
            this.fov    = 60;
            this.near   = 1;
            this.far    = 1000;

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

            var propForRenderer: any = {
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

            if ( config.isDebugging ) {
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
            this.controls.addEventListener('change', () => this.onControlsChange() );

            // plane model
            this.plane = new THREE.Mesh(
                new THREE.PlaneBufferGeometry( 2000, 2000, 8, 8 ),
                new THREE.MeshBasicMaterial({ color: 0x0000ff, opacity: 1.0, transparent: true })
            );
            this.plane.visible = false;
            this.scene.add(this.plane);

            // intersect helper
            this.cursorHelper = new CursorPositionHelper(
                this.scene,
                this.camera,
                this.controls
            );

            // save Config
            this.config = config;

            //
            {
                var rf = this.renderer.domElement.addEventListener;
                rf('mousedown',  (e) => this.onTapStart(e, false), false);
                rf('touchstart',  (e) => this.onTapStart(e, true), false);

                rf('mousemove',  (e) => this.onMoving(e, false), false);
                rf('touchmove',  (e) => this.onMoving(e, true), false);

                rf('mouseup',  (e) => this.onTapEnd(e, false), false);
                rf('mouseleave',  (e) => this.onTapEnd(e, true), false);
                rf('touchend',  (e) => this.onTapEnd(e, true), false);
                rf('touchcancel',  (e) => this.onTapEnd(e, true), false);

                rf('dblclick', () => this.toggleIKStopper(), false);
            }

            // initialize mode
            this.currentMode = Screen.Mode.Move;
            this.onModeClick(this.currentMode);

            // jump into loop
            this.renderLoop();
        }

        /// ==================================================
        /// ==================================================
        private onModeClick(mode: Screen.Mode): void {
            console.log(mode, this.currentAction);
            var beforeAction = this.currentAction;
            if ( beforeAction != null ) {
                beforeAction.onDestroy();
            }

            this.currentMode = mode;
            switch(this.currentMode) {
            case Screen.Mode.Camera:
                this.currentAction = new CameraAction(this, this.controls);
                break;
            case Screen.Mode.Move:
                this.currentAction = new MoveAction(this);
                break;
            case Screen.Mode.FK:
                this.currentAction = new FKAction(this);
                break;
            case Screen.Mode.IK:
                this.currentAction = new IKAction(this);
                break;
            default:
                console.error('unexpected mode');
            }
            console.log("->", this.currentAction);
            this.currentAction.onActive(beforeAction);
            console.log("->", this.currentAction);
        }

        private onTapStart(e: any, isTouch: boolean): void {
            this.currentAction.onTapStart(e, isTouch);
        }

        private onMoving(e: any, isTouch: boolean): void {
            this.currentAction.onMoving(e, isTouch);
        }

        private onTapEnd(e: any, isTouch: boolean): void {
            this.currentAction.onTapEnd(e, isTouch);
        }
        /// ==================================================
        /// ==================================================


        private updateBoneDebugInfo(model: Model, index: number) {
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


            this.boneDebugDom.innerHTML  = "selected joint_id: " + index + "<br>";
            this.boneDebugDom.innerHTML += "rot " + sx + "   : " + radToDeg(bone.rotation.x) + "<br>";
            this.boneDebugDom.innerHTML += "rot " + sy + "   : " + radToDeg(bone.rotation.y) + "<br>";
            this.boneDebugDom.innerHTML += "rot " + sz + "   : " + radToDeg(bone.rotation.z) + "<br>";

            var p_bone = <THREE.Bone>bone.parent;
            if ( p_bone ) {
                var p_index = p_bone.userData.index;
                this.boneDebugDom.innerHTML += "<br>";
                this.boneDebugDom.innerHTML += "parent joint_id: " + p_index + "<br>";
                this.boneDebugDom.innerHTML += "parent rot " + sx + " : " + radToDeg(p_bone.rotation.x) + "<br>";
                this.boneDebugDom.innerHTML += "parent rot " + sy + " : " + radToDeg(p_bone.rotation.y) + "<br>";
                this.boneDebugDom.innerHTML += "parent rot " + sz + " : " + radToDeg(p_bone.rotation.z) + "<br>";
            }
        }


        private onControlsChange() {
            this.transformCtrl.update();
        }

        private hoge: THREE.Quaternion;

        private onTransformCtrl() {
            if ( this.transformCtrl.axis != null ) {
                this.isOnManipurator = true;

                if ( this.selectedSphere != null ) {
                    var model = this.selectedSphere.userData.ownerModel;
                    var bone = model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];

                    // local rotation
                    var t_r = bone.quaternion.clone();
                    bone.quaternion.set(0,0,0,0);
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
                    if ( this.config.isDebugging ) {
                        this.updateBoneDebugInfo(model, this.selectedSphere.userData.jointIndex);
                    }
                }

            } else {
                this.isOnManipurator = false;
            }

            this.transformCtrl.update();
        }

        public selectModel(e: any, isTouch: boolean): [Model, THREE.Vector3] {
            e.preventDefault();

            var pos = this.cursorToWorld(e, isTouch);
            var raycaster = new THREE.Raycaster(
                this.camera.position,
                pos.sub(this.camera.position).normalize()
            );
            var intersects = raycaster.intersectObjects(
                this.models.map((m) => m.mesh)
            );
            var mesh = intersects.length > 0 ? intersects[0].object : null;
            if ( mesh == null ) return

            return [mesh.userData.modelData, intersects[0].point];
        }



        public boneRay(e: any, isTouch: boolean) {
            if ( this.isOnManipurator || this.dragging || this.models.length == 0 ) {
                return;
            }
            e.preventDefault();

            var pos = this.cursorToWorld(e, isTouch);

            // calc most nearest sphere
            var l = 9999999999;
            var selectedMarker: THREE.Object3D = null;

            var ab = pos.clone().sub(this.camera.position).normalize();
            var flattened = this.models.map((v) => {
                return v.joint_spheres;
            }).reduce((a, b) => {
                return a.concat(b);
            });
            flattened.forEach((s) => {
                var ap = s.position.clone().sub(this.camera.position);
                var len = ap.length();

                var diff_c = len * len / 200.0;
                var margin = Math.max(0.001, Math.min(1.4, diff_c));    // [0.001, 1.4]
                //console.log("len: ", len, " / m: ", margin);

                var d = ab.clone().cross(ap).length();
                var h = d /* / 1.0 */;
                if ( h < margin ) {
                    if ( h < l ) {
                        l = h;
                        selectedMarker = s;
                    }
                }
            });
            //console.log(l);
            if ( selectedMarker != null ) {
                this.selectedSphere = selectedMarker;
            }

            //
            if ( this.selectedSphere != null ) {
                var model = this.selectedSphere.userData.ownerModel;
                var bone = model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];
                // console.log("index: ", this.selectedSphere.userData.jointIndex);

                // update marker sprite color
                this.models.forEach((model) => {
                    model.joint_markers.forEach((marker) => {
                        marker.material.color.setHex(model.normalColor);
                    })
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

                if ( this.config.isDebugging ) {
                    // set debug view
                    this.boneDebugDom.style.display = "block";

                    this.updateBoneDebugInfo(model, this.selectedSphere.userData.jointIndex);
                }

            } else {
                // not found
                this.resetCtrl();

                if ( this.config.isDebugging ) {
                    this.boneDebugDom.style.display = "none";
                }
            }

            return this.selectedSphere;
        }


        private moving(e: any, isTouch: boolean) {
            if ( this.dragStart == false ) {
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
            var raycaster = new THREE.Raycaster(
                this.camera.position,
                pos.sub(this.camera.position).normalize()
            );

            // move ik target
            var intersects = raycaster.intersectObject(this.plane);
            this.ikTargetPosition.copy(intersects[0].point);
            this.ikTargetSphere.position.copy(this.ikTargetPosition);

            //
            if ( this.config.isDebugging ) {
                if ( this.selectedSphere != null ) {
                    var model = this.selectedSphere.userData.ownerModel;
                    this.updateBoneDebugInfo(model, this.selectedSphere.userData.jointIndex);
                }
            }
        }


        private endDragging() {
            if ( this.dragStart ) {
                if ( this.dragging ) {
                    // reset color of markers
                    this.models.forEach((model) => {
                        model.joint_markers.forEach((marker) => {
                            marker.material.color.setHex(model.normalColor);
                        })
                    });
                }

                this.dragStart = false;
                this.dragging = false;

                //this.controls.cancel(); // ...

                //console.log("end");
            }
        }


        private toggleIKStopper() {
            if ( this.selectedSphere ) {
                var model = this.selectedSphere.userData.ownerModel;
                var i = this.selectedSphere.userData.jointIndex;
                model.toggleIKPropagation(i);
            }
        }


        private onResize(): void {
            this.renderer.setSize(this.screen.width, this.screen.height);

            this.camera.aspect = this.screen.aspect;
            this.camera.updateProjectionMatrix();

            this.camera2d.right = this.screen.width;
            this.camera2d.bottom = this.screen.height;
            this.camera2d.updateProjectionMatrix();
        }





        private loadAndAppendModel(
            name: string,
            model_info: ModelInfo,
            sprite_paths: SpritePaths,
            callback: (m: Model, error: string) => void
        ) {
            this.incTask();

            var model = new Model(name, model_info, sprite_paths, this.scene, this.scene2d, (m, e) => {
                this.decTask();

                // default IK stopper node indexes
                var nx = model_info.ikStopJoints;
                nx.forEach((i) => {
                    model.toggleIKPropagation(i);
                });

                if ( callback ) {
                    callback(m, e);
                }
            });

            this.models.push(model);
        }


        private resetCtrl() {
            this.endDragging();

            this.transformCtrl.detach();


            this.selectedSphere = null;
        }


        private moveCharactor(model: Model, target_pos: THREE.Vector3) {
            var pos = target_pos.clone();
            pos.sub(model.offsetOrgToBone);

            model.mesh.position.copy(pos);
        }


        // CCD IK
        private ik(selected_bone: THREE.Bone, target_pos: THREE.Vector3) {
            var c_bone = selected_bone;
            var p_bone = <THREE.Bone>c_bone.parent;

            while( p_bone != null && p_bone.type != "SkinnedMesh" ) {
                // console.log("bone!", c_bone.parent);

                // local rotation
                var t_r = p_bone.quaternion.clone();
                p_bone.rotation.set(0,0,0);
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

                if ( p_bone.userData.preventIKPropagation )
                    break;

                p_bone = <THREE.Bone>p_bone.parent;
            }
        }


        private renderLoop = () => {
            requestAnimationFrame(this.renderLoop);

            this.scene.updateMatrixWorld(true);
            this.scene2d.updateMatrixWorld(true);

            {
                var model = this.models[0];
                if ( model && model.isReady() ) {
                    var bone = model.mesh.skeleton.bones[14];
                    //console.log(bone.rotation);

                    if ( this.selectedSphere != null ) {
                        //bone.rotation.y += 0.01;

                        bone.updateMatrixWorld(true);
                        var bone_q = bone.getWorldQuaternion(null);

                        // local rotation
                        var t_r = bone.quaternion.clone();
                        bone.quaternion.set(0,0,0,0);
                        bone.updateMatrixWorld(true);
                        var w_to_l_comp_q = bone.getWorldQuaternion(null).inverse();
                        bone.quaternion.copy(t_r);
                        bone.updateMatrixWorld(true);


                        // update bone quaternion
                        var to_q = w_to_l_comp_q.multiply(bone_q).normalize();

                        //var e = new THREE.Euler().setFromQuaternion(to_q);
                        //console.log(new THREE.Euler().setFromQuaternion(to_q));
                        //console.log(this.selectedSphere.rotation);
/**/
                    }
                }
            }

            this.models.forEach((model) => {
                if ( model.isReady() ) {
                    if ( this.dragging && model == this.selectedSphere.userData.ownerModel ) {
                        var joint_index = this.selectedSphere.userData.jointIndex;
                        var bone = model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];

                        if ( joint_index == 0 ) {
                            this.moveCharactor(model, this.ikTargetPosition);

                        } else {
                            this.ik(bone, this.ikTargetPosition);
                        }
                    }

                    //
                    model.mesh.skeleton.bones.forEach((bone, index) => {
                        var b_pos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
                        var s_b_pos = this.worldToScreen(b_pos);

                        model.joint_markers[index].position.set(s_b_pos.x, s_b_pos.y, -1);

                        //
                        var sphere = model.joint_spheres[index];
                        sphere.position.set(b_pos.x, b_pos.y, b_pos.z);
                    });
                }
            });

            this.render();
        }

        private render() {
            this.renderer.clear();

            this.renderer.render(this.scene, this.camera);
            this.renderer.render(this.scene2d, this.camera2d);
        }


        public screenToWorld(screen_pos: THREE.Vector2): THREE.Vector3 {
            var window_half_x = this.screen.width / 2.0;
            var window_half_y = this.screen.height / 2.0;

            var world_pos = new THREE.Vector3();
            world_pos.x = screen_pos.x / window_half_x - 1;
            world_pos.y = -screen_pos.y / window_half_y + 1;
            world_pos.unproject(this.camera);

            return world_pos;
        }

        public worldToScreen(world_pos: THREE.Vector3): THREE.Vector2 {
            var window_half_x = this.screen.width / 2.0;
            var window_half_y = this.screen.height / 2.0;

            var screen_pos = world_pos.clone();
            screen_pos.project(this.camera);
            screen_pos.x = ( screen_pos.x + 1 ) * window_half_x;
            screen_pos.y = ( -screen_pos.y + 1) * window_half_y;

            return new THREE.Vector2(screen_pos.x, screen_pos.y);
        }

        public cursorToWorld(e: any, isTouch: boolean): THREE.Vector3 {
            var dom_pos = this.renderer.domElement.getBoundingClientRect();
            var client_x = isTouch ? e.changedTouches[0].pageX : e.clientX;
            var client_y = isTouch ? e.changedTouches[0].pageY : e.clientY;

            var mouse_x = client_x - dom_pos.left;
            var mouse_y = client_y - dom_pos.top;
            return this.screenToWorld(new THREE.Vector2(mouse_x, mouse_y));
        }

        // ==================================================
        // ==================================================

        public toDataUrl(type: string = 'png') {
            switch(type) {
            case "png":
                return this.makeDataUrl("image/png");

            case "jpeg":
                return this.makeDataUrl("image/jpeg");

            case "json":
                return "data: text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.getSceneInfo()));

            default:

                throw new Error("File format '" + type + "' is not supported");
            }
        }

        public getSceneInfo(): any {
            return {
                'camera' : {
                    'position': this.camera.position,
                    'quaternion': this.camera.quaternion,
                },
                'models': {
                    'num': this.models.length,
                    'list': this.models.map((m) => m.modelData())
                }
            };
        }

        public loadSceneDataFromString(data: string) {
            var obj = JSON.parse(data);

            var camera = obj.camera;
            this.camera.position.copy(<THREE.Vector3>camera.position);
            this.camera.quaternion.copy(<THREE.Quaternion>camera.quaternion);
            this.controls.update();

            this.removeAllModel();

            var models = obj.models;
            for( var i=0; i<models.num; i++ ) {
                var l = models.list[i];
                var name = l.name;

                // TODO: error check
                this.appendModel(name, ((i: number, ll: any) => {
                    return (m: Model, error: string) => {
                        if ( error ) {
                            console.log("Error occured: index[" + i + "], name[" + name + "]");

                        } else {
                            m.loadModelData(ll);
                        }
                    };
                })(i, l));
            }
        }

        public setClearColor(color_hex: number, alpha: number) {
            this.renderer.setClearColor(color_hex, alpha);
        }

        public hideMarker() {
            this.models.forEach((model) => {
                model.hideMarker();
            });
        }

        public showMarker() {
            this.models.forEach((model) => {
                model.showMarker();
            });
        }

        public toggleMarker() {
            this.models.forEach((model) => {
                model.toggleMarker();
            });
        }

        public appendModel(
            name: string,
            callback: (m: Model, error: string) => void = null
        ) {
            if ( name in this.modelInfoTable ) {
                this.loadAndAppendModel(name, this.modelInfoTable[name], this.spritePaths, callback);

            } else {
                if ( callback ) {
                    callback(null, "model name[" + name + "] is not found");
                }
            }
        }

        public removeAllModel() {
            this.models.forEach((m) => {
                m.destruct();
            });

            this.models = [];
            this.resetCtrl();
        }

        public removeModel(index: number) {
            var model = this.models[index];
            model.destruct();

            this.models.splice(index, 1);
            this.resetCtrl();
        }

        public removeSelectedModel() {
            if ( this.selectedSphere != null ) {
                var model = this.selectedSphere.userData.ownerModel;
                var index = this.models.indexOf(model);
                if ( index != -1 ) {
                    this.removeModel(index);
                }
            }
        }

        private makeDataUrl(type: string): string {
            //
            var vis = this.models.map((m) => m.getMarkerVisibility());
            this.models.forEach((m) => m.setMarkerVisibility(false));

            var ss = this.selectedSphere;
            this.transformCtrl.detach();

            //
            this.render();

            var data = this.renderer.domElement.toDataURL(type);

            //
            this.models.forEach((m, i) => {
                m.setMarkerVisibility(vis[i]);
            });
            if ( ss ) {
                this.transformCtrl.attach(ss);
            }

            return data;
        }


        private incTask() {
            if ( this.loadingTasks == 0 ) {
                this.screen.showLoadingDom();
            }

            this.loadingTasks++;
        }

        private decTask() {
            this.loadingTasks--;

            if ( this.loadingTasks == 0 ) {
                this.screen.hideLoadingDom();
            }
        }

        //
        private modelInfoTable: {[key: string]: ModelInfo;};
        private spritePaths: SpritePaths;

        //
        private screen: Screen.ScreenController;
        private currentMode: Screen.Mode;
        private currentAction: Action;

        //
        private fov: number;
        private near: number;
        private far: number;

        //
        private models: Array<Model> = [];

        //
        private renderer: THREE.WebGLRenderer;

        //
        private scene: THREE.Scene;
        private camera: THREE.PerspectiveCamera;
        private directionalLight: THREE.DirectionalLight;
        private ambientLight: THREE.AmbientLight;
        private transformCtrl: THREE.TransformControls;
        private controls: THREE.OrbitControls;

        //
        private scene2d: THREE.Scene;
        private camera2d: THREE.OrthographicCamera;

        //
        private plane: THREE.Mesh;
        private ikTargetSphere: THREE.Mesh; // for debugging

        //
        private gridHelper: THREE.GridHelper;

        //
        private dragging = false;
        private dragStart = false;

        //
        private isOnManipurator: boolean = false;
        private selectedSphere: THREE.Object3D = null;
        private ikTargetPosition: THREE.Vector3;

        //
        private loadingTasks = 0;

        private boneDebugDom: any = null;

        //
        private config: Config;

        cursorHelper: CursorPositionHelper;
    }
}
