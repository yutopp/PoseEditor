/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="../typings/jquery/jquery.d.ts"/>
/// <reference path="../ext/TransformControls.d.ts"/>
/// <reference path="../ext/OrbitControls.d.ts"/>

module PoseEditor {
    export class Config {
        enableBackgroundAlpha: boolean = false;
        backgroundColorHex: number = 0x777777;
        backgroundAlpha: number = 1.0;
        loadingImagePath: string = null;
        isDebugging: boolean = false;
    }

    export class SpritePaths {
        normal: string;
        special: string;
    }

    export class ModelInfo {
        model_path: string;
        texture_dir: string;
        ik_stop_joints: Array<number>;
        bone_limits: {[key: number]: Array<Array<number>>;}
    }

    export class RotationLimitation {
        x: boolean = false;
        y: boolean = false;
        z: boolean = false;
    }

    export class Editor {
        constructor(
            parent_dom_id: string,
            model_info_table: {[key: string]: ModelInfo;},
            sprite_paths: SpritePaths,
            config: Config = new Config()
        ) {
            //
            var parent_dom = document.getElementById(parent_dom_id);
            this.target_dom = parent_dom ? parent_dom : document.body;

            //
            this.modelInfoTable = model_info_table;
            this.spritePaths = sprite_paths;

            //
            this.width  = this.target_dom.offsetWidth;
            this.height = this.target_dom.offsetHeight;
            this.fov    = 60;
            this.aspect = this.width / this.height;
            this.near   = 1;
            this.far    = 1000;

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

            var prop_for_renderer: any = {
                preserveDrawingBuffer: true
            };
            prop_for_renderer.alpha = config.enableBackgroundAlpha;

            //
            this.renderer = new THREE.WebGLRenderer(prop_for_renderer);
            this.renderer.setSize(this.width, this.height);
            this.renderer.autoClear = false;
            this.renderer.setClearColor(config.backgroundColorHex, config.backgroundAlpha);

            //
            this.target_dom.appendChild(this.renderer.domElement);
            window.addEventListener('resize', () => this.onResize(), false);

            //
            if ( config.loadingImagePath ) {
                this.loadingDom = document.createElement("img");
                this.loadingDom.src = config.loadingImagePath;
                this.loadingDom.style.display = "none";

                this.target_dom.appendChild(this.loadingDom);
            }

            if ( config.isDebugging ) {
                // bone: debug information tag
                this.boneDebugDom = document.createElement("div");
                this.boneDebugDom.style.display = "none";
                this.target_dom.appendChild(this.boneDebugDom);

                // debug
                var gridHelper = new THREE.GridHelper(50.0, 5.0);
                this.scene.add(gridHelper);
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
            this.controls.damping = 0.2;
            //this.controls.enabled = true;
            this.controls.addEventListener('change', () => this.onControlsChange() );

            // plane model
            this.plane = new THREE.Mesh(
                new THREE.PlaneBufferGeometry( 2000, 2000, 8, 8 ),
                new THREE.MeshBasicMaterial( { color: 0x0000ff, opacity: 1.0, transparent: true } )
            );
            this.plane.visible = false;
            this.scene.add(this.plane);

            // ik target
            var sphere_geo = new THREE.SphereGeometry(1, 14, 14);
            var material = new THREE.MeshBasicMaterial({wireframe: true});
            this.ikTargetSphere = new THREE.Mesh(sphere_geo, material);
            this.ikTargetSphere.matrixWorldNeedsUpdate = true;
            this.ikTargetSphere.visible = false;
            this.scene.add(this.ikTargetSphere);
            if ( config.isDebugging ) {
                this.ikTargetSphere.visible = true;
            }

            // save Config
            this.config = config;

            //
            this.renderer.domElement.addEventListener('mousedown',  (e) => this.boneRay(e, false), false);
            this.renderer.domElement.addEventListener('touchstart', (e) => this.boneRay(e, true), false);

            this.renderer.domElement.addEventListener('mousemove', (e) => this.moving(e, false), false);
            this.renderer.domElement.addEventListener('touchmove', (e) => this.moving(e, true), false);

            this.renderer.domElement.addEventListener('mouseup', () => this.endDragging(), false);
            this.renderer.domElement.addEventListener('mouseleave', () => this.endDragging(), false);
            this.renderer.domElement.addEventListener('touchend', () => this.endDragging(), false);
            this.renderer.domElement.addEventListener('touchcancel', () => this.endDragging(), false);

            this.renderer.domElement.addEventListener('dblclick', () => this.toggleIKStopper(), false);

            //
            this.renderLoop();
        }


        private updateBoneDebugInfo(model: Model, index: number) {
            var bone = model.mesh.skeleton.bones[index];

            var sx = "<span style='color: red'>X</span>";
            var sy = "<span style='color: #00ff00'>Y</span>";
            var sz = "<span style='color: blue'>Z</span>";

            this.boneDebugDom.innerHTML  = "selected joint_id: " + index + "<br>";
            this.boneDebugDom.innerHTML += "rot " + sx + "   : " + bone.rotation.x + "<br>";
            this.boneDebugDom.innerHTML += "rot " + sy + "   : " + bone.rotation.y + "<br>";
            this.boneDebugDom.innerHTML += "rot " + sz + "   : " + bone.rotation.z + "<br>";

            var p_bone = <THREE.Bone>bone.parent;
            if ( p_bone ) {
                var p_index = p_bone.userData.index;
                this.boneDebugDom.innerHTML += "<br>";
                this.boneDebugDom.innerHTML += "parent joint_id: " + p_index + "<br>";
                this.boneDebugDom.innerHTML += "parent rot " + sx + " : " + p_bone.rotation.x + "<br>";
                this.boneDebugDom.innerHTML += "parent rot " + sy + " : " + p_bone.rotation.y + "<br>";
                this.boneDebugDom.innerHTML += "parent rot " + sz + " : " + p_bone.rotation.z + "<br>";
            }
        }


        private onControlsChange() {
            this.transformCtrl.update();
        }


        private onTransformCtrl() {
            if ( this.transformCtrl.axis != null ) {
                this.isOnManipurator = true;

                if ( this.selectedSphere != null ) {
                    var model = this.selectedSphere.userData.ownerModel;
                    var bone = model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];

                    // local rotation
                    var t_r = bone.quaternion.clone();
                    bone.rotation.set(0,0,0);
                    var w_to_l_comp_q = bone.getWorldQuaternion(null).inverse();

                    var sph_q = this.selectedSphere.getWorldQuaternion(null);

                    // update bone quaternion
                    var to_q = w_to_l_comp_q.multiply(sph_q).normalize();

                    // limitation
                    this.adjustRotation(bone, to_q);

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

        private boneRay(e: any, isTouch: boolean) {
            if ( this.isOnManipurator || this.dragging || this.models.length == 0 ) {
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
            this.models.forEach((model) => {
                model.joint_markers.forEach((marker) => {
                    marker.material.color.setHex(model.normalColor);
                })
            });

            // calc most nearest sphere
            var l = 9999999999;
            this.selectedSphere = null;

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
                        this.selectedSphere = s;
                    }
                }
            });
            //console.log(l);

            if ( this.selectedSphere != null ) {
                this.dragStart = true;
                this.controls.enabled = false;

                var model = this.selectedSphere.userData.ownerModel;
                var bone = model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];
                // console.log("index: ", this.selectedSphere.userData.jointIndex);

                //
                var index = this.selectedSphere.userData.jointIndex;
                model.joint_markers[index].material.color.setHex(model.selectedColor);

                //
                var to_q = bone.getWorldQuaternion(null)
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

                if ( this.config.isDebugging ) {
                    // set debug view
                    this.boneDebugDom.style.display = "inline";
                    this.boneDebugDom.style.position = 'absolute';
                    this.boneDebugDom.style.padding = "10px";
                    this.boneDebugDom.style.top = "10px";
                    this.boneDebugDom.style.left = "10px";

                    this.updateBoneDebugInfo(model, this.selectedSphere.userData.jointIndex);
                }

            } else {
                // not found
                this.resetCtrl();

                if ( this.config.isDebugging ) {
                    this.boneDebugDom.style.display = "none";
                }
            }
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

                this.controls.enabled = true;
                this.controls.cancel(); // ...

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


        private onResize(): boolean {
            var w = this.target_dom.offsetWidth;
            var h = this.target_dom.offsetHeight;
            if ( this.width == w && this.height == h ) {
                return false;
            }

            // update size
            this.width  = w;
            this.height = h;
            this.aspect = this.width / this.height;

            this.renderer.setSize(this.width, this.height);

            this.camera.aspect = this.aspect;
            this.camera.updateProjectionMatrix();

            this.camera2d.right = this.width;
            this.camera2d.bottom = this.height;
            this.camera2d.updateProjectionMatrix();

            return false;
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
                var nx = model_info.ik_stop_joints;
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

            this.controls.enabled = true;
            this.transformCtrl.detach();

            this.controls.enabled = true;

            this.selectedSphere = null;
        }


        private moveCharactor(model: Model, target_pos: THREE.Vector3) {
            var pos = target_pos.clone();
            pos.y -= model.offsetOrgToBone.y;
            model.mesh.position.copy(pos);
        }


        private adjustRotation(bone: THREE.Bone, q: THREE.Quaternion) {
            // TODO: fix Gimbal lock
            var e = new THREE.Euler().setFromQuaternion(q);

            if ( bone.userData.rotLimit.x ) {
                e.x = Math.max( bone.userData.rotMin.x, Math.min( e.x, bone.userData.rotMax.x ) );
            }
            if ( bone.userData.rotLimit.y ) {
                e.y = Math.max( bone.userData.rotMin.y, Math.min( e.y, bone.userData.rotMax.y ) );
            }
            if ( bone.userData.rotLimit.z ) {
                e.z = Math.max( bone.userData.rotMin.z, Math.min( e.z, bone.userData.rotMax.z ) );
            }
            q.setFromEuler(e);

            // console.log(e)
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

                // limitation
                this.adjustRotation(p_bone, to_q);

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


        private screenToWorld(screen_pos: THREE.Vector2): THREE.Vector3 {
            var window_half_x = this.width / 2.0;
            var window_half_y = this.height / 2.0;

            var world_pos = new THREE.Vector3();
            world_pos.x = screen_pos.x / window_half_x - 1;
            world_pos.y = -screen_pos.y / window_half_y + 1;
            world_pos.unproject(this.camera);

            return world_pos;
        }

        private worldToScreen(world_pos: THREE.Vector3): THREE.Vector2 {
            var window_half_x = this.width / 2.0;
            var window_half_y = this.height / 2.0;

            var screen_pos = world_pos.clone();
            screen_pos.project(this.camera);
            screen_pos.x = ( screen_pos.x + 1 ) * window_half_x;
            screen_pos.y = ( -screen_pos.y + 1) * window_half_y;

            return new THREE.Vector2(screen_pos.x, screen_pos.y);
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
                if ( this.loadingDom.style ) {
                    this.loadingDom.style.display = "inline";
                    this.loadingDom.style.position = 'absolute';
                    this.loadingDom.style.padding = "10px";
                    this.loadingDom.style.borderRadius = "5px";
                    this.loadingDom.style.backgroundColor = "#fff";

                    var x = Math.abs( this.target_dom.offsetWidth - this.loadingDom.offsetWidth ) / 2;
                    var y = Math.abs( this.target_dom.offsetHeight - this.loadingDom.offsetHeight ) / 2;

                    this.loadingDom.style.left = x + 'px';
                    this.loadingDom.style.top = y + 'px';
                }
            }

            this.loadingTasks++;
        }

        private decTask() {
            this.loadingTasks--;

            if ( this.loadingTasks == 0 ) {
                if ( this.loadingDom.style ) {
                    this.loadingDom.style.display = "none";
                }
            }
        }


        //
        private target_dom: HTMLElement;

        //
        private modelInfoTable: {[key: string]: ModelInfo;};
        private spritePaths: SpritePaths;

        //
        private width: number;
        private height: number;
        private fov: number;
        private aspect: number;
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
        private dragging = false;
        private dragStart = false;

        //
        private isOnManipurator: boolean = false;
        private selectedSphere: THREE.Object3D = null;
        private ikTargetPosition: THREE.Vector3;

        //
        private loadingTasks = 0;
        private loadingDom: any = null;
        private boneDebugDom: any = null;

        //
        private config: Config;
    }


    //
    class Model
    {
        constructor(
            name: string,
            model_info: ModelInfo,
            sprite_paths: SpritePaths,
            scene: THREE.Scene,
            scene2d: THREE.Scene,
            callback: (m: Model, error: string) => void
        ) {
            //
            this.name = name;

            //
            this.scene = scene;
            this.scene2d = scene2d;

            //
            var mesh_path = model_info.model_path;
            var texture_path = model_info.texture_dir;
            var bone_limits = model_info.bone_limits;

            var loader = new THREE.JSONLoader();
            loader.crossOrigin = '*';

            // load mesh data from path
            loader.load(mesh_path, (geometry, materials) => {
                //console.log("finished to load");
                // ref. https://github.com/mrdoob/three.js/blob/master/editor/js/Loader.js
                var material: any;
                if ( materials !== undefined ) {
                    if ( materials.length > 1 ) {
                        material = new THREE.MeshFaceMaterial(materials);
                        material.materials.forEach((mat: any) => {
                            mat.skinning = true;
                        });

                    } else {
                        material = materials[0];
                        material.setValues({skinning: true});
                    }

                } else {
                    material = new THREE.MeshLambertMaterial({
                        color: 0xffffff,
                        skinning: true
                    });
                }

                // create mesh data
                this.mesh = new THREE.SkinnedMesh(geometry, material, false);
                this.mesh.scale.set(3, 3, 3);
                this.mesh.position.y = -18;

                this.scene.add(this.mesh);

                //
                this.setupAppendixData(sprite_paths, bone_limits, callback);

            }, texture_path);
        }

        private setupAppendixData(
            sprite_paths: SpritePaths,
            bone_limits: {[key: number]: Array<Array<number>>;},
            callback: (m: Model, error: string) => void
        ) {
            var default_cross_origin = THREE.ImageUtils.crossOrigin;
            THREE.ImageUtils.crossOrigin = '*';

            //
            this.mesh.skeleton.bones.forEach((bone, index) => {
                bone.matrixWorldNeedsUpdate = true;
                bone.updateMatrixWorld(true);
                bone.userData = {
                    index: index,
                    preventIKPropagation: false,
                    rotLimit: new RotationLimitation(),
                    rotMin: null,
                    rotMax: null,
                };

                if ( index in bone_limits ) {
                    bone.userData.rotMin = new THREE.Euler();
                    bone.userData.rotMax = new THREE.Euler();

                    var rots = bone_limits[index];

                    if ( rots[0] != null ) {
                        bone.userData.rotLimit.x = true;
                        bone.userData.rotMin.x = rots[0][0];
                        bone.userData.rotMax.x = rots[0][1];
                    }

                    if ( rots[1] != null ) {
                        bone.userData.rotLimit.y = true;
                        bone.userData.rotMin.y = rots[1][0];
                        bone.userData.rotMax.y = rots[1][1];
                    }

                    if ( rots[2] != null ) {
                        bone.userData.rotLimit.z = true;
                        bone.userData.rotMin.z = rots[2][0];
                        bone.userData.rotMax.z = rots[2][1];
                    }
                }
            });

            //
            this.offsetOrgToBone
                = this.mesh.skeleton.bones[0].getWorldPosition(null).sub(this.mesh.position);
            this.offsetOrgToBone.sub(this.mesh.skeleton.bones[0].position);

            // load textures(marker for bone)
            this.joint_markers = new Array<THREE.Sprite>(this.mesh.skeleton.bones.length);

            this.normalMarkerTex = THREE.ImageUtils.loadTexture(sprite_paths.normal);
            this.normalMarkerMat = new THREE.SpriteMaterial({
                map: this.normalMarkerTex, color: this.normalColor
            });

            this.specialMarkerTex = THREE.ImageUtils.loadTexture(sprite_paths.special);
            this.specialMarkerMat = new THREE.SpriteMaterial({
                map: this.specialMarkerTex, color: this.normalColor
            });

            this.mesh.skeleton.bones.forEach((bone, index) => {
                var sprite = new THREE.Sprite(this.normalMarkerMat.clone());
                sprite.scale.set(12.0, 12.0, 1);

                this.joint_markers[index] = sprite;
                this.scene2d.add(sprite);
            });

            // make sphere objects(attached by transform ctrl)
            this.mesh.skeleton.bones.forEach((bone, index) => {
                var sphere_geo = new THREE.SphereGeometry(1, 14, 14);
                var material = new THREE.MeshBasicMaterial({wireframe: true});
                var sphere = new THREE.Mesh(sphere_geo, material);
                sphere.matrixWorldNeedsUpdate = true;
                sphere.userData = {
                    jointIndex: index,
                    ownerModel: this,
                };

                sphere.visible = false;
                this.joint_spheres.push(sphere);
                this.scene.add(sphere);
            });

            THREE.ImageUtils.crossOrigin = default_cross_origin;

            this.ready = true;
            if ( callback ) {
                callback(this, null);
            }
        }

        destruct(): void {
            this.ready = false;

            this.scene.remove(this.mesh);

            this.joint_markers.forEach((m) => {
                this.scene2d.remove(m);
            });

            this.joint_spheres.forEach((m) => {
                this.scene.remove(m);
            });
        }

        isReady(): boolean {
            return this.ready;
        }

        modelData(): any {
            var joints = this.mesh.skeleton.bones.map((bone) => {
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
        }

        loadModelData(data: any) {
            if ( !this.ready ) {
                return;
            }

            var p = data.position;
            var q = data.q;
            var joints = data.joints;

            for( var key in joints ) {
                var joint = joints[key];
                var t_q = joint.q;

                var s_q = this.mesh.skeleton.bones[key].quaternion;
                s_q.set(t_q._x, t_q._y, t_q._z, t_q._w);
            }

            this.mesh.position.set(p.x, p.y, p.z);
            this.mesh.quaternion.set(q._x, q._y, q._z, q._w);
        }

        toggleIKPropagation(bone_index: number) {
            var bone = this.mesh.skeleton.bones[bone_index];
            bone.userData.preventIKPropagation = !bone.userData.preventIKPropagation;

            var old_sprite = this.joint_markers[bone_index];
            var sprite: THREE.Sprite = null;

            if ( bone.userData.preventIKPropagation ) {
                sprite = new THREE.Sprite(this.specialMarkerMat.clone());
            } else {
                sprite = new THREE.Sprite(this.normalMarkerMat.clone());
            }

            sprite.scale.set(12.0, 12.0, 1);
            this.joint_markers[bone_index] = sprite;
            this.scene2d.add(sprite);

            this.scene2d.remove(old_sprite);
        }

        hideMarker() {
            this.showingMarker = false;
            this.setMarkerVisibility(this.showingMarker);
        }

        showMarker() {
            this.showingMarker = true;
            this.setMarkerVisibility(this.showingMarker);
        }

        toggleMarker() {
            this.showingMarker = !this.showingMarker;
            this.setMarkerVisibility(this.showingMarker);
        }

        setMarkerVisibility(showing: boolean) {
            this.joint_markers.forEach((marker) => {
                marker.visible = showing;
            });
        }

        getMarkerVisibility(): boolean {
            return this.showingMarker;
        }

        //
        private ready: boolean = false;

        //
        private showingMarker: boolean = true;

        //
        private normalMarkerTex: THREE.Texture;
        private normalMarkerMat: THREE.SpriteMaterial;
        private specialMarkerTex: THREE.Texture;
        private specialMarkerMat: THREE.SpriteMaterial;

        //
        offsetOrgToBone: THREE.Vector3;

        //
        selectedColor = 0xff0000;
        normalColor = 0x0000ff;

        //
        name: string;

        //
        scene: THREE.Scene;
        scene2d: THREE.Scene;

        //
        mesh: THREE.SkinnedMesh = null;

        //
        joint_markers: Array<THREE.Sprite> = [];
        joint_spheres: Array<THREE.Mesh> = [];
    }
}
