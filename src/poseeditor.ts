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
            this.eventDispatcher = new EventDispatcher();
            this.history = new TimeMachine.Machine(this.screen);

            // setup screen
            this.screen.addCallback('resize', () => this.onResize());
            this.screen.addCallback('onmodeclick', (m: Screen.Mode) => {
                this.eventDispatcher.onModeSelect(m, this.screen);
            });
            this.screen.addCallback('onundo', () => this.history.undo());
            this.screen.addCallback('onredo', () => this.history.redo());

            this.screen.addCallback('showdownload', (f: (d: any) => void) => {
                this.setDownloadTypes(f);
            });
            this.screen.addCallback('ondownload', (data: any) => {
                this.onDownload(data);
            });

            this.screen.addCallback('showaddmodel', (f: (d: any) => void) => {
                this.setAddModelTypes(f);
            });
            this.screen.addCallback('onaddmodel', (data: any) => {
                this.onAddModel(data);
            });

            // setup
            this.eventDispatcher.onModeSelect(Screen.Mode.Camera, this.screen);

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
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.target.copy(defaultCamera.lookAt);
            this.controls.update();
            this.controls.enabled = false;

            //
            this.transformCtrl
                = new THREE.TransformControls(this.camera, this.renderer.domElement);
            this.scene.add(this.transformCtrl);

            // intersect helper
            this.cursorHelper = new CursorPositionHelper(
                this.scene,
                this.camera,
                this.controls
            );

            // save Config
            this.config = config;

            //
            this.eventDispatcher.setup(
                this,
                this.transformCtrl,
                this.controls,
                this.renderer.domElement
            );



            // jump into loop
            this.renderLoop();
        }

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




        //
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

            var modelPos = mesh.position.clone();
            var localConfPos = intersects[0].point.clone();

            return [mesh.userData.modelData, localConfPos];
        }

        //
        public selectJointMarker(e: any, isTouch: boolean): THREE.Object3D {
            e.preventDefault();

            var pos = this.cursorToWorld(e, isTouch);

            // calc most nearest sphere
            var l = 9999999999.9;
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

            return selectedMarker;
        }

        public cancelAllMarkerSprite() {
            // update marker sprite color (to not selected color)
            this.models.forEach((model) => {
                model.joint_markers.forEach((sprite) => {
                    if (sprite) {
                        sprite.material.color.setHex(model.normalColor);
                    }
                })
            });
        }

        public selectMarkerSprite(markerMesh: THREE.Object3D) {
            this.cancelAllMarkerSprite();

            var model = markerMesh.userData.ownerModel;
            var index = markerMesh.userData.jointIndex;
            var sprite = model.joint_markers[index];
            if (sprite) {
                sprite.material.color.setHex(model.selectedColor);
            }
        }

        public hideAllMarkerSprite() {
            this.models.forEach((model) => {
                model.joint_markers.forEach((marker) => {
                    marker.visible = false;
                })
            });
        }

        public showAllMarkerSprite() {
            this.models.forEach((model) => {
                model.joint_markers.forEach((marker) => {
                    marker.visible = true;
                })
            });
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
                var nx = model_info.ikInversePropagationJoints;
                nx.forEach((jointIndex) => {
                    model.toggleIKPropagation(jointIndex);
                });

                if (callback) {
                    callback(m, e);
                }
            });

            this.models.push(model);
        }


        private resetCtrl() {
            this.transformCtrl.detach();
        }






        private renderLoop = () => {
            requestAnimationFrame(this.renderLoop);

            this.update();
            this.render();
        }

        private update() {
            this.scene.updateMatrixWorld(true);
            this.scene2d.updateMatrixWorld(true);
            this.models.forEach((model) => {
                if ( model.isReady() ) {
                    this.eventDispatcher.execActions((act: Action) => act.update(model));

                    //
                    model.availableBones.forEach((bone) => {
                        var index = bone.userData.index;
                        var b_pos
                            = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
                        var s_b_pos = this.worldToScreen(b_pos);

                        //
                        var markerSprite = model.joint_markers[index];
                        markerSprite.position.set(s_b_pos.x, s_b_pos.y, -1);

                        //
                        var markerMesh = model.joint_spheres[index];
                        markerMesh.position.set(b_pos.x, b_pos.y, b_pos.z);
                    });
                }
            });
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
        private setDownloadTypes(f:(d: any) => void) {
            var order = [
                {
                    type: 'radio',
                    name: 'format',
                    value: ['png', 'jpeg', 'json'],
                    label: ['PNG', 'JPEG', 'JSON'],
                    checked: 0
                }
            ];

            f(order);
        }

        private onDownload(data: any) {
            var type = <string>data['format'];
            if ( type == null ) return; // TODO: notice error

            this.download(type);
        }

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

        public download(type: string = 'png') {
            var dataUrl = this.toDataUrl(type);

            // ???: :(
            var a = document.createElement("a");
            (<any>a).download = "poseeditor";   // workaround for typescript...
            a.title = "download snapshot";
            a.href = dataUrl;
            a.click();

            delete a;
        }


        private setAddModelTypes(f:(d: any) => void) {
            var value: Array<string> = [];
            var label: Array<string> = [];
            for( var key in this.modelInfoTable ) {
                value.push(key);
                label.push(key); // TODO: change
            }

            var order = [
                {
                    type: 'select',
                    name: 'modelName',
                    value: value,
                    label: label,
                    checked: 0
                }
            ];

            f(order);
        }

        private onAddModel(data: any) {
            var name = <string>data['modelName'];
            if ( name == null ) return; // TODO: notice error

            this.appendModel(name, (model: Model, error: string) => {
                if ( error ) {
                    console.log("error: ", error);
                }
            });
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
            // TODO: fix
            /*
            if ( this.selectedSphere != null ) {
                var model = this.selectedSphere.userData.ownerModel;
                var index = this.models.indexOf(model);
                if ( index != -1 ) {
                    this.removeModel(index);
                }
            }
            */
        }

        private makeDataUrl(type: string): string {
            //
            var vis = this.models.map((m) => m.getMarkerVisibility());
            this.models.forEach((m) => m.setMarkerVisibility(false));

            // var ss = this.selectedSphere;
            // this.transformCtrl.detach();

            //
            this.render();

            var data = this.renderer.domElement.toDataURL(type);

            //
            this.models.forEach((m, i) => {
                m.setMarkerVisibility(vis[i]);
            });
            // if ( ss ) {
            // this.transformCtrl.attach(ss);
            // }

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
        private eventDispatcher: EventDispatcher;
        public history: TimeMachine.Machine;

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
        public cursorHelper: CursorPositionHelper;

        //
        private scene2d: THREE.Scene;
        private camera2d: THREE.OrthographicCamera;

        //
        private gridHelper: THREE.GridHelper;

        //
        private loadingTasks = 0;

        private boneDebugDom: any = null;

        //
        private config: Config;
    }
}
