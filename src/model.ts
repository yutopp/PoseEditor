/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="etc.ts"/>

module PoseEditor {
    class RotationLimitation {
        x: boolean = false;
        y: boolean = false;
        z: boolean = false;
    }

    export class Model
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
            var mesh_path = model_info.modelPath;
            var texture_path = model_info.textureDir;
            var init_pos = model_info.initPos;
            var init_scale = model_info.initScale;
            if ( model_info.markerScale ) {
                this.markerScale = model_info.markerScale;
            } else {
                this.markerScale = [12.0, 12.0];
            }

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
                if ( init_pos ) {
                    this.mesh.position.set(init_pos[0], init_pos[1], init_pos[2]);
                }
                if ( init_scale ) {
                    this.mesh.scale.set(init_scale[0], init_scale[1], init_scale[2]);
                }

                // add mesh to model
                this.scene.add(this.mesh);

                // bind this model data to the mesh
                this.mesh.userData = {
                    modelData: this
                }

                //
                this.setupAppendixData(sprite_paths, model_info, callback);

            }, texture_path);
        }

        private setupAppendixData(
            sprite_paths: SpritePaths,
            model_info: ModelInfo,
            callback: (m: Model, error: string) => void
        ) {
            //
            var bone_limits = model_info.boneLimits;
            var base_joint_id = model_info.baseJointId;

            //
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
                        bone.userData.rotMin.x = degToRad(rots[0][0]);
                        bone.userData.rotMax.x = degToRad(rots[0][1]);
                    }

                    if ( rots[1] != null ) {
                        bone.userData.rotLimit.y = true;
                        bone.userData.rotMin.y = degToRad(rots[1][0]);
                        bone.userData.rotMax.y = degToRad(rots[1][1]);
                    }

                    if ( rots[2] != null ) {
                        bone.userData.rotLimit.z = true;
                        bone.userData.rotMin.z = degToRad(rots[2][0]);
                        bone.userData.rotMax.z = degToRad(rots[2][1]);
                    }
                }
            });

            this.scene.updateMatrixWorld(true);

            //
            this.offsetOrgToBone
                = this.mesh.skeleton.bones[base_joint_id].getWorldPosition(null).sub(this.mesh.position);

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
                sprite.scale.set(this.markerScale[0], this.markerScale[1], 1);

                this.joint_markers[index] = sprite;
                this.scene2d.add(sprite);
            });

            // make sphere objects(attached by transform ctrl)
            this.mesh.skeleton.bones.forEach((bone, index) => {
                //var sphere_geo = new THREE.SphereGeometry(1, 14, 14);
                //var material = new THREE.MeshBasicMaterial({wireframe: true});
                //var sphere = new THREE.Mesh(sphere_geo, material);
                var sphere = new THREE.AxisHelper(2.0);
                sphere.matrixWorldNeedsUpdate = true;
                sphere.userData = {
                    jointIndex: index,
                    ownerModel: this,
                };

                sphere.visible = true;
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

            sprite.scale.set(this.markerScale[0], this.markerScale[1], 1);
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
        joint_spheres: Array<any> = [];

        //
        private markerScale: Array<number>;
    }
}
