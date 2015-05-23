/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="etc.ts"/>

module PoseEditor {
    class RotationLimitation {
        x: boolean = false;
        y: boolean = false;
        z: boolean = false;
    }

    export interface JointStatus {
        quaternion: Array<number>
    }

    export interface ModelStatus {
        name: string;
        position: Array<number>;
        quaternion: Array<number>;
        joints: Array<JointStatus>;
    }

    export function isEqualModelStatus(lhs: ModelStatus, rhs: ModelStatus) {
        return JSON.stringify(lhs) == JSON.stringify(rhs);
    }

    export class Model
    {
        constructor(
            name: string,
            modelInfo: ModelInfo,
            spritePaths: SpritePaths,
            scene: THREE.Scene,
            scene2d: THREE.Scene,
            id: number,
            sceneForPicking: THREE.Scene,
            callback: (m: Model, error: string) => void
        ) {
            //
            this.name = name;

            //
            this.scene = scene;
            this.scene2d = scene2d;
            this.sceneForPicking = sceneForPicking;

            //
            if ( modelInfo.markerScale ) {
                this.markerScale = modelInfo.markerScale;
            } else {
                this.markerScale = [12.0, 12.0];    // default
            }

            var loader = new THREE.JSONLoader();
            loader.crossOrigin = '*';

            // load mesh data from path
            loader.load(modelInfo.modelPath, (geometry, materials) => {
                //console.log("finished to load");
                // ref. https://github.com/mrdoob/three.js/blob/master/editor/js/Loader.js
                var material: any;
                if ( materials !== undefined ) {
                    this.defaultMat = []

                    material = new THREE.MeshFaceMaterial(materials);
                    material.materials.forEach((mat: any) => {
                        mat.skinning = true;

                        this.defaultMat.push({
                            opacity: mat.opacity,
                            transparent: mat.transparent
                        });
                    });

                } else {
                    material = new THREE.MeshLambertMaterial({
                        color: 0xffffff,
                        skinning: true
                    });

                    this.defaultMat = {
                        opacity: material.opacity,
                        transparent: material.transparent
                    };
                }

                var initPos = modelInfo.initPos;
                var initScale = modelInfo.initScale;

                // create mesh data
                this.mesh = new THREE.SkinnedMesh(geometry, material);
                if (initPos) {
                    this.mesh.position.set(initPos[0], initPos[1], initPos[2]);
                }
                if ( initScale ) {
                    this.mesh.scale.set(initScale[0], initScale[1], initScale[2]);
                }

                //
                this.mesh.userData = {
                    modelData: this
                };

                // add mesh to model
                this.scene.add(this.mesh);


                // create mesh data
                var color = new THREE.Color();
                var pickingMaterial = new THREE.MeshBasicMaterial({
                    shading: THREE.NoShading,
                    vertexColors: THREE.NoColors,
                    color: id,
                    skinning: true
                });

                this.meshForPicking = new THREE.SkinnedMesh(geometry, pickingMaterial);
                if ( initPos ) {
                    this.meshForPicking.position.set(initPos[0], initPos[1], initPos[2]);
                }
                if ( initScale ) {
                    this.meshForPicking.scale.set(initScale[0], initScale[1], initScale[2]);
                }
                this.meshForPicking.bind(this.mesh.skeleton);     // important!!
                this.sceneForPicking.add(this.meshForPicking);

                //
                this.skeletonHelper = new THREE.SkeletonHelper(this.mesh);
				(<THREE.LineBasicMaterial>this.skeletonHelper.material).linewidth = 2;
                this.skeletonHelper.visible = false;
				this.scene.add(this.skeletonHelper);

                //
                this.setupAppendixData(
                    spritePaths,
                    modelInfo,
                    callback
                );

            }, modelInfo.textureDir);
        }

        public selectionState(isActive: boolean) {
            if ( this.defaultMat == null ) return;
            var C = 0.7;

            if ( this.mesh.material.type == 'MeshFaceMaterial' ) {
                (<THREE.MeshFaceMaterial>this.mesh.material).materials.forEach(
                    (mat: any, i: number) => {
                        var opacity = isActive ? C : this.defaultMat[i].opacity;
                        var transparent = isActive ? true : this.defaultMat[i].transparent;

                        mat.opacity = opacity;
                        mat.transparent = transparent;
                    }
                );

            } else {
                var opacity = isActive ? C : this.defaultMat.opacity;
                var transparent = isActive ? true : this.defaultMat.transparent;

                this.mesh.material.opacity = opacity;
                this.mesh.material.transparent = transparent;
            }
        }

        private setupAppendixData(
            sprite_paths: SpritePaths,
            model_info: ModelInfo,
            callback: (m: Model, error: string) => void
        ) {
            //
            var bone_limits = model_info.boneLimits;
            var base_joint_id = model_info.baseJointId;
            var ikDefaultPropagation = model_info.ikDefaultPropagation;
            var hiddenJoints = model_info.hiddenJoints;

            //
            var default_cross_origin = THREE.ImageUtils.crossOrigin;
            THREE.ImageUtils.crossOrigin = '*';

            //
            this.mesh.skeleton.bones.forEach((bone, index) => {
                bone.matrixWorldNeedsUpdate = true;
                bone.updateMatrixWorld(true);
                bone.userData = {
                    index: index,
                    preventIKPropagation: !ikDefaultPropagation,
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

            //
            this.jointMarkerSprites = new Array<THREE.Sprite>(this.mesh.skeleton.bones.length);
            this.jointMarkerMeshes = new Array<THREE.Object3D>(this.mesh.skeleton.bones.length);

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
            this.mesh.skeleton.bones.forEach((bone, index) => {
                if (hiddenJoints.indexOf(index) != -1) {
                    // this bone is hidden
                    return;
                }

                this.availableBones.push(bone);

                //
                // load textures(marker for bone)
                var sprite = this.createMarkerSprite(bone);
                sprite.scale.set(this.markerScale[0], this.markerScale[1], 1);
                sprite.visible = false;

                this.jointMarkerSprites[index] = sprite;
                this.scene2d.add(sprite);

                //var sphere_geo = new THREE.SphereGeometry(1, 14, 14);
                //var material = new THREE.MeshBasicMaterial({wireframe: true});
                //var sphere = new THREE.Mesh(sphere_geo, material);
                var markerMesh = new THREE.AxisHelper(2.0);
                markerMesh.matrixWorldNeedsUpdate = true;
                markerMesh.userData = {
                    jointIndex: index,
                    ownerModel: this,
                };

                markerMesh.visible = false;
                this.jointMarkerMeshes[index] = markerMesh;    // TODO: rename
                this.scene.add(markerMesh);
            });

            THREE.ImageUtils.crossOrigin = default_cross_origin;

            this.ready = true;
            if ( callback ) {
                callback(this, null);
            }
        }

        public deactivate(): void {
            if ( !this.ready || this.disposed ) {
                return;
            }

            this.scene.remove(this.mesh);
            this.scene.remove(this.skeletonHelper);

            this.jointMarkerSprites.forEach((m) => {
                this.scene2d.remove(m);
            });

            this.jointMarkerMeshes.forEach((m) => {
                this.scene.remove(m);
            });

            this.sceneForPicking.remove(this.meshForPicking);

            this.ready = false;
        }

        public reactivate(): void {
            if ( this.ready || this.disposed ) {
                return;
            }

            this.scene.add(this.mesh);
            this.scene.add(this.skeletonHelper);

            this.jointMarkerSprites.forEach((m) => {
                this.scene2d.add(m);
            });

            this.jointMarkerMeshes.forEach((m) => {
                this.scene.add(m);
            });

            this.sceneForPicking.add(this.meshForPicking);

            this.ready = true;
        }

        public dispose() {
            if ( this.disposed ) {
                return;
            }
            this.deactivate();

            this.mesh.geometry.dispose();

            this.disposed = true;
        }

        public isReady(): boolean {
            return this.ready;
        }

        public isDisposed(): boolean {
            return this.disposed;
        }


        public update() {
            //
            this.availableBones.forEach((bone) => {
                var index = bone.userData.index;
                var b_pos
                    = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);

                //
                var markerSprite = this.jointMarkerSprites[index];
                markerSprite.position.set(b_pos.x, b_pos.y, b_pos.z);

                //
                var markerMesh = this.jointMarkerMeshes[index];
                markerMesh.position.set(b_pos.x, b_pos.y, b_pos.z);

                //
                bone.updateMatrixWorld(true);
                var to_q = bone.getWorldQuaternion(null)
                markerMesh.quaternion.copy(to_q);

                //
                this.skeletonHelper.update();
            });
        }


        public modelData(): ModelStatus {
            var joints = this.mesh.skeleton.bones.map((bone) => {
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
        }

        public loadModelData(status: ModelStatus) {
            if (!this.ready) return;

            var joints = status.joints;
            joints.forEach((joint: JointStatus, index: number) => {
                var q = joint.quaternion;

                var target_q = this.mesh.skeleton.bones[index].quaternion;
                target_q.set(q[0], q[1], q[2], q[3]);
            });

            var p = status.position;
            var q = status.quaternion;
            this.mesh.position.set(p[0], p[1], p[2]);
            this.mesh.quaternion.set(q[0], q[1], q[2], q[3]);
        }


        public toggleIKPropagation(bone_index: number) {
            var bone = this.mesh.skeleton.bones[bone_index];
            bone.userData.preventIKPropagation = !bone.userData.preventIKPropagation;

            var old_sprite = this.jointMarkerSprites[bone_index];
            var c = old_sprite.material.color.getHex()

            var sprite = this.createMarkerSprite(bone);
            sprite.material.color.setHex(c);

            sprite.scale.set(this.markerScale[0], this.markerScale[1], 1);
            this.jointMarkerSprites[bone_index] = sprite;
            this.scene2d.add(sprite);

            this.scene2d.remove(old_sprite);
        }

        public cancelMarkerSelection() {
            this.jointMarkerSprites.forEach((sprite) => {
                if (sprite) {
                    sprite.material.color.setHex(this.normalColor);
                }
            })
        }

        public selectMarker(index: number) {
            var sprite = this.jointMarkerSprites[index];
            if (sprite) {
                sprite.material.color.setHex(this.selectedColor);
            }
        }

        public hideMarker() {
            this.setMarkerVisibility(false);
        }

        public showMarker() {
            this.setMarkerVisibility(true);
        }

        public toggleMarker() {
            this.setMarkerVisibility(!this.showingMarker);
        }

        public setMarkerVisibility(showing: boolean) {
            this.jointMarkerSprites.forEach((marker) => {
                marker.visible = showing;
            });

            this.skeletonHelper.visible = showing;
            this.showingMarker = showing;
        }

        public getMarkerVisibility(): boolean {
            return this.showingMarker;
        }


        private createMarkerSprite(bone: THREE.Bone): THREE.Sprite {
            if ( bone.userData.preventIKPropagation ) {
                return new THREE.Sprite(this.specialMarkerMat.clone());
            } else {
                return new THREE.Sprite(this.normalMarkerMat.clone());
            }
        }

        //
        private ready: boolean = false;
        private disposed: boolean = false;

        //
        private showingMarker: boolean = false;

        //
        private selectedColor = 0xff0000;
        private normalColor = 0x0000ff;

        private normalMarkerTex: THREE.Texture;
        private normalMarkerMat: THREE.SpriteMaterial;
        private specialMarkerTex: THREE.Texture;
        private specialMarkerMat: THREE.SpriteMaterial;

        //
        private offsetOrgToBone: THREE.Vector3;

        //
        private name: string;

        //
        private scene: THREE.Scene;
        private scene2d: THREE.Scene;
        private sceneForPicking: THREE.Scene;

        //
        public mesh: THREE.SkinnedMesh = null;
        public availableBones: Array<THREE.Bone> = [];

        //
        public meshForPicking: THREE.SkinnedMesh = null;

        //
        private jointMarkerSprites: Array<THREE.Sprite> = [];
        public jointMarkerMeshes: Array<THREE.Object3D> = [];

        //
        private markerScale: Array<number>;
        private defaultMat: any;

        //
        private skeletonHelper: THREE.SkeletonHelper;
    }
}
