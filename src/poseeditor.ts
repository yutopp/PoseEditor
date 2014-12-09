/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="../typings/jquery/jquery.d.ts"/>
/// <reference path="../ext/TransformControls.d.ts"/>
/// <reference path="../ext/OrbitControls.d.ts"/>

module PoseEditor {
    export class Config {
        enableBackgroundAlpha: boolean = false;
        backgroundColorHex: number = 0x777777;
        backgroundAlpha: number = 1.0;
    }

    export class Editor {
        private plane: THREE.Mesh;

        constructor(
            parent_dom_id: string,
            mesh_path: string,
            texture_path: string,
            marker_path: string,
            config: Config = null,
            callback: () => void = null
        ) {
            //
            var parent_dom = document.getElementById(parent_dom_id);
            this.target_dom = parent_dom ? parent_dom : document.body;

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
            window.addEventListener('resize', () => this.onResize(), false);

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
            //this.controls.addEventListener('change', render);

            //
            this.setupModel(mesh_path, texture_path, marker_path, callback);

            this.plane = new THREE.Mesh(
				new THREE.PlaneBufferGeometry( 2000, 2000, 8, 8 ),
				new THREE.MeshBasicMaterial( { color: 0x0000ff, opacity: 1.00, transparent: true } )
			);
			this.plane.visible = false;
			this.scene.add(this.plane);

            //
            this.renderer.domElement.addEventListener('mousedown',  (e) => this.boneRay(e, false), false);
            this.renderer.domElement.addEventListener('touchstart', (e) => this.boneRay(e, true), false);

            this.renderer.domElement.addEventListener('mousemove', (e) => this.moving(e, false), false);
            this.renderer.domElement.addEventListener('touchmove', (e) => this.moving(e, true), false);

            this.renderer.domElement.addEventListener('mouseup', () => this.endDragging(), false);
            this.renderer.domElement.addEventListener('touchend', () => this.endDragging(), false);
            this.renderer.domElement.addEventListener('touchcancel', () => this.endDragging(), false);

            //
            this.renderLoop();
        }

        private endDragging() {
            this.dragging = false;

            this.controls.enabled = true;
        }

        private moving(e: any, isTouch: boolean) {
            if ( this.dragging == false ) {
                return;
            }

            console.log("moving");
            e.preventDefault();

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

			var intersects = raycaster.intersectObject(this.plane);


            this.ikTargetPosition.copy(intersects[0].point);
            this.model.ikTargetSphere.position.copy(this.ikTargetPosition);
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

        public getSceneInfo(): any {
            if ( this.model != null ) {
                var model_obj = this.model.jointData();

                var obj = {
                    'camera': {
                        'position': this.camera.position,
                        'quaternion': this.camera.quaternion
                    },
                    'model': model_obj
                };
                return obj;

            } else {
                throw new Error("Model was not loaded");
            }
        }

        public setClearColor(color_hex: number, alpha: number) {
            this.renderer.setClearColor(color_hex, alpha);
        }

        public loadSceneDataFromString(data: string) {
            var obj = JSON.parse(data);

            var camera_data = obj.camera;
            {
                var pos = camera_data.position;
                this.camera.position.x = <number>pos.x;
                this.camera.position.y = <number>pos.y;
                this.camera.position.z = <number>pos.z;
            }
            {
                var q = camera_data.quaternion;
                this.camera.quaternion.x = <number>q._x;
                this.camera.quaternion.y = <number>q._y;
                this.camera.quaternion.z = <number>q._z;
                this.camera.quaternion.w = <number>q._w;
            }
            this.controls.update();

            //threejs/three.d.ts
            this.model.loadJointData(<{ [key: number]: any; }>obj.model);
        }

        public hideMarker() {
            this.model.hideMarker();
        }

        public showMarker() {
            this.model.showMarker();
        }

        public toggleMarker() {
            this.model.toggleMarker();
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

        private makeDataUrl(type: string): string {
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
        }

        private setupModel(mesh_path: string, texture_path: string, marker_path: string, callback: () => void) {
            this.model = new Model(mesh_path, texture_path, marker_path, this.scene, this.scene2d, callback);
        }

        private onTransformCtrl() {
            if ( this.transformCtrl.axis != null ) {
                this.isOnManipurator = true;

                if ( this.selectedSphere != null ) {
                    var bone = this.model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];

                    var t_r = bone.quaternion.clone();
                    bone.rotation.set(0,0,0);
                    var toto_q = bone.getWorldQuaternion(null).inverse();

//                    bone.quaternion.copy(t_r);
//                    bone.updateMatrixWorld(true);


                    var to_qq = this.selectedSphere.getWorldQuaternion(null);

                    var to_q = toto_q.multiply(to_qq).normalize();
                    bone.quaternion.copy(to_q);
                    bone.updateMatrixWorld(true);
                }

	        } else {
                this.isOnManipurator = false;
            }

            this.transformCtrl.update();
        }

        private boneRay(e: any, isTouch: boolean) {
            if (this.isOnManipurator) {
                return;
            }

            if (this.dragging) {
                return;
            }

            e.preventDefault();

            var dom_pos = this.renderer.domElement.getBoundingClientRect();
            var client_x = isTouch ? e.changedTouches[0].pageX : e.clientX;
            var client_y = isTouch ? e.changedTouches[0].pageY : e.clientY;

            var mouse_x = client_x - dom_pos.left;
            var mouse_y = client_y - dom_pos.top;
            var pos = this.screenToWorld(new THREE.Vector2(mouse_x, mouse_y));

            var ray = new THREE.Raycaster(
                this.camera.position,
                pos.sub(this.camera.position).normalize()
            );

            var conf_objs = ray.intersectObjects(this.model.joint_spheres);

            // reset color of markers
            this.model.joint_markers.forEach((marker) => {
                marker.material.color.setHex(this.model.normalColor);
            });

            this.selectedSphere = null;
            if ( conf_objs.length > 0 ) {
                var conf_obj = conf_objs[0];

                this.selectedSphere = conf_obj.object;

                //
                var index = this.selectedSphere.userData.jointIndex;
                this.model.joint_markers[index].material.color.setHex(this.model.selectedColor);
            }

            if ( this.selectedSphere == null ) {
                this.dragging = false;
                this.controls.enabled = true;
                this.transformCtrl.detach();


            } else {
                this.dragging = true;
                this.controls.enabled = false;

                var bone = this.model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];
                console.log("index: ", this.selectedSphere.userData.jointIndex);

                //
                var mat = new THREE.Matrix4().extractRotation(bone.matrixWorld);
                var to_q = new THREE.Quaternion().setFromRotationMatrix(mat);
                this.selectedSphere.quaternion.copy(to_q);

                this.transformCtrl.attach(this.selectedSphere);
                this.transformCtrl.update();

                //
                this.ikTargetPosition = this.selectedSphere.position.clone();
                this.model.ikTargetSphere.position.copy(this.ikTargetPosition);

                this.plane.position.copy(this.model.ikTargetSphere.position);
				this.plane.lookAt(this.camera.position);
            }
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

        private ik(bone__Aaa: THREE.Bone, target_pos: THREE.Vector3) {
            var c_bone = bone__Aaa;
            var p_bone = <THREE.Bone>c_bone.parent;

            var i=0;
            while( p_bone != null ) {
                if (i == 2)
                    break;
                console.log("bone!");

                // local rotation
                var t_r = p_bone.quaternion.clone();
                p_bone.rotation.set(0,0,0);
                var toto_q = p_bone.getWorldQuaternion(null).inverse();
                p_bone.quaternion.copy(t_r);
                p_bone.updateMatrixWorld(true);

                //
                var c_b_pos = new THREE.Vector3().setFromMatrixPosition(c_bone.matrixWorld);
                var p_b_pos = new THREE.Vector3().setFromMatrixPosition(p_bone.matrixWorld);

                var p_to_c_vec = c_b_pos.clone().sub(p_b_pos);
                var p_to_t_vec = target_pos.clone().sub(p_b_pos);

                var q2 = new THREE.Quaternion().setFromUnitVectors(p_to_c_vec, p_to_t_vec);

                var to_qq = p_bone.getWorldQuaternion(null);

                var to_qq2 = q2.clone();
                to_qq2.multiply(to_qq);
                var qm = new THREE.Quaternion();
                THREE.Quaternion.slerp(to_qq, to_qq2, qm, 0.5);

                var to_q = toto_q.multiply(qm).normalize();
                p_bone.quaternion.copy(to_q);
                p_bone.updateMatrixWorld(true);

                p_bone = <THREE.Bone>p_bone.parent;
                ++i;
            }
        }

        private dragging = false;

        private renderLoop = () => {
            requestAnimationFrame(this.renderLoop);

	        this.scene.updateMatrixWorld(true);
            this.scene2d.updateMatrixWorld(true);

            if ( this.model.isReady() ) {
                if ( this.dragging ) {
                    var bone = this.model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];
                    this.ik(bone, this.ikTargetPosition);
                }

                //
                this.model.mesh.skeleton.bones.forEach((bone, index) => {
                    var b_pos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
                    var s_b_pos = this.worldToScreen(b_pos);

                    this.model.joint_markers[index].position.set(s_b_pos.x, s_b_pos.y, -1);

                    //
                    var sphere = this.model.joint_spheres[index];
                    sphere.position.set(b_pos.x, b_pos.y, b_pos.z);

                    var sphere_and_camera_dist = sphere.position.distanceTo(this.camera.position);
                    var raw_scale = sphere_and_camera_dist * sphere_and_camera_dist / 280.0;
                    var scale = Math.max(0.3, Math.min(4.0, raw_scale));    // [0.3, 4.0]

                    sphere.scale.set(scale, scale, scale);
                });
            }

            this.render();
        }

        private render() {
            this.renderer.clear();

            this.renderer.render(this.scene, this.camera);
            this.renderer.render(this.scene2d, this.camera2d);
        }

        //
        private target_dom: HTMLElement;

        //
        private width: number;
        private height: number;
        private fov: number;
        private aspect: number;
        private near: number;
        private far: number;

        //
        private model: Model = null;

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
        private isOnManipurator: boolean = false;
        private selectedSphere: THREE.Object3D = null;

        //
        private ikTargetPosition: THREE.Vector3;
    }


    //
    class Model
    {
        constructor(mesh_path: string, texture_path: string, marker_path: string, main_scene: THREE.Scene, scene2d: THREE.Scene, callback: () => void) {
            $.ajax({
                dataType: 'JSON',
                type: "GET",
                url: mesh_path
            }).done((data: any) => {
                console.log("finished to load");

                // ref. https://github.com/mrdoob/three.js/blob/master/editor/js/Loader.js

                if ( data.metadata.type === undefined ) { // 3.0
			        data.metadata.type = 'Geometry';
		        }

                if ( data.metadata.type.toLowerCase() === 'geometry' ) {
			        var loader = new THREE.JSONLoader();
			        var result: any = loader.parse(data, texture_path);

			        var geometry = result.geometry;
			        var material: any;
			        if ( result.materials !== undefined ) {
				        if ( result.materials.length > 1 ) {
                            material = new THREE.MeshFaceMaterial(result.materials);
                            material.materials.forEach((mat: any) => {
                                mat.skinning = true;
                            });

				        } else {
					        material = result.materials[0];
                            material.setValues({skinning: true});
				        }

			        } else {
                        material = new THREE.MeshLambertMaterial({
                            color: 0xffffff,
                            skinning: true
                        });
			        }

			        geometry.sourceType = "ascii";
			        //geometry.sourceFile = file.name;

			        var mesh = new THREE.SkinnedMesh( geometry, material, false );

			        this.setupMesh(mesh, marker_path, main_scene, scene2d, callback);

		        } else {
                    alert("" + data.metadata.type + " is not supported");
		        }

            }).fail((a, b, c) => {
                console.error( "error", a, b, c );
            });

            //
            this.scene = main_scene;
            this.scene2d = scene2d;
        }

        private setupMesh(
            mesh: THREE.SkinnedMesh,
            marker_path: string,
            main_scene: THREE.Scene,
            scene2d: THREE.Scene,
            callback: () => void
        ) {
            //
            this.mesh = mesh;
            this.mesh.scale.set(3, 3, 3);
            this.mesh.position.y = -18;

            main_scene.add(this.mesh);

            //
            this.mesh.skeleton.bones.forEach((bone) => {
                bone.matrixWorldNeedsUpdate = true;
            });

            // load textures(marker)
            var texture = THREE.ImageUtils.loadTexture(marker_path);
            this.mesh.skeleton.bones.forEach((bone, index) => {
                var material = new THREE.SpriteMaterial({map: texture, color: this.normalColor});
                var sprite = new THREE.Sprite(material);
                sprite.scale.set(12.0, 12.0, 1);

                this.joint_markers.push(sprite);
                this.scene2d.add(sprite);
            });

            // debugging
            var sphere_geo = new THREE.SphereGeometry(1, 14, 14);
            var material = new THREE.MeshBasicMaterial({wireframe: true});
            this.ikTargetSphere = new THREE.Mesh(sphere_geo, material);
            this.ikTargetSphere.matrixWorldNeedsUpdate = true;
            this.ikTargetSphere.position.set(10, 5, 10);
            this.scene.add(this.ikTargetSphere);

            // make sphere objects
            this.mesh.skeleton.bones.forEach((bone, index) => {
                var sphere_geo = new THREE.SphereGeometry(1, 14, 14);
                var material = new THREE.MeshBasicMaterial({wireframe: true});
                var sphere = new THREE.Mesh(sphere_geo, material);
                sphere.matrixWorldNeedsUpdate = true;
                sphere.userData = {
                    jointIndex: index
                };

                sphere.visible = false;
                this.joint_spheres.push(sphere);
                this.scene.add(sphere);

                if ( callback !== null ) {
                    callback();
                }
            });

            this.ready = true;
        }

        destruct(): void {
            this.ready = false;
        }

        isReady(): boolean {
            return this.ready;
        }

        jointData(): { [key: number]: any; } {
            return this.mesh.skeleton.bones.map((bone) => {
                return {rotation: bone.quaternion};
            });
        }

        loadJointData(joint_data: { [key: number]: any; }) {
            for( var key in  joint_data ) {
                var raw_q = joint_data[key];
                var rot = raw_q.rotation;

                this.mesh.skeleton.bones[key].quaternion.x = <number>rot._x;
                this.mesh.skeleton.bones[key].quaternion.y = <number>rot._y;
                this.mesh.skeleton.bones[key].quaternion.z = <number>rot._z;
                this.mesh.skeleton.bones[key].quaternion.w = <number>rot._w;
            }
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
        selectedColor = 0xff0000;
        normalColor = 0x0000ff;

        //
        scene: THREE.Scene;
        scene2d: THREE.Scene;

        //
        mesh: THREE.SkinnedMesh = null;

        //
        joint_markers: Array<THREE.Sprite> = [];
        joint_spheres: Array<THREE.Mesh> = [];

        //
        ikTargetSphere: THREE.Mesh; // for debugging
    }
}
