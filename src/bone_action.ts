/// <reference path="action.ts"/>

module PoseEditor {
    export class BoneAction extends Action {
        constructor(e: Editor, ctrls: THREE.TransformControls) {
            super(e);

            this.transformCtrl = ctrls;
        }

        public name(): string {
            return "bone_action";
        }

        public onActive(): void {
            this.transformCtrl.setMode("rotate");
            this.transformCtrl.setSpace("local");
            this.transformCtrl.setSize(0.8);
            this.transformCtrl.addEventListener('change', () => this.onTransformCtrl());
            this.transformCtrl.detach();

            this.editor.showAllMarkerSprite();
        }

        public onDestroy(): void {
            this.releaseJoint();
            this.editor.setSelectedBoneAndModel(null, null);

            this.editor.hideAllMarkerSprite();
        }

        public onTapStart(e: any, isTouch: boolean): boolean {
            if ( this.isOnManipurator ) return false;
            var isLeftClick = isTouch ? true : (e.button == 0);

            this.catchJoint(this.editor.selectJointMarker(e, isTouch));
            if (this.currentJointMarker == null) {
                return true; // pass events to other action
            }
            this.beforeModelStatus = this.model.modelData();

            if (isLeftClick) {
                this.isMoving = true;
                this.hideManipurator();

            } else {
                var index = this.currentJointMarker.userData.jointIndex;
                this.model.toggleIKPropagation(index);
            }

            return false;
        }

        public onMoving(e: any, isTouch: boolean): boolean {
            return this.moving(e, isTouch);
        }

        public onTapEnd(e: any, isTouch: boolean): boolean {
            if (this.currentJointMarker == null || !this.isMoving) return true;
            this.isMoving = false;

            // record action
            var currentModelStatus = this.model.modelData();
            if ( !isEqualModelStatus(this.beforeModelStatus, currentModelStatus) ) {
                this.editor.history.didAction(new TimeMachine.ChangeModelStatusAction(
                    this.model,
                    this.beforeModelStatus,
                    currentModelStatus
                ));
            }

            return false;
        }

        public onDoubleTap(e: any, isTouch: boolean): boolean {
            if (this.currentJointMarker == null) return true;

            this.transformCtrl.attach(this.currentJointMarker);
            this.transformCtrl.update();

            return false;
        }

        public update(model: Model): boolean {
            this.transformCtrl.update();
            if (this.currentJointMarker == null || !this.isMoving) return true;

            if (model == this.currentJointMarker.userData.ownerModel) {
                if (this.curPos != null) {
                    this.ik(this.bone, this.curPos);
                }
            }

            return true;
        }

        private catchJoint(m: THREE.Object3D) {
            this.currentJointMarker = m;
            if (this.currentJointMarker == null) {
                this.releaseJoint();
                this.editor.setSelectedBoneAndModel(null, null);
                return;
            }

            this.model = this.currentJointMarker.userData.ownerModel;
            this.bone = this.model.mesh.skeleton.bones[this.currentJointMarker.userData.jointIndex];
            this.editor.selectMarkerSprite(this.currentJointMarker);

            this.editor.setSelectedBoneAndModel(this.bone, this.model);

            //
            var pos = this.currentJointMarker.position;
            this.curPos = pos;

            this.editor.cursorHelper.setBeginState(pos);
        }

        private moving(e: any, isTouch: boolean) {
            if (this.currentJointMarker == null || !this.isMoving) return true;
            this.hideManipurator();

            var pos = this.editor.cursorToWorld(e, isTouch);
            this.curPos = this.editor.cursorHelper.move(pos);

            return false;
        }

        private releaseJoint() {
            this.currentJointMarker = null;
            this.isMoving = false;

            this.hideManipurator();

            this.editor.cancelAllMarkerSprite();
        }

        private hideManipurator() {
            this.transformCtrl.detach();
            this.isOnManipurator = false;
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

        private onTransformCtrl() {
            this.transformCtrl.update();

            if ( this.transformCtrl.axis != null ) {
                this.isOnManipurator = true;

                if ( this.currentJointMarker != null ) {
                    // local rotation
                    var t_r = this.bone.quaternion.clone();
                    this.bone.quaternion.set(0,0,0,0);
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

            } else {
                this.isOnManipurator = false;
            }
        }


        private transformCtrl: THREE.TransformControls;
        private isOnManipurator: boolean = false;

        private currentJointMarker: THREE.Object3D;
        private model: Model;
        private bone: THREE.Bone;

        private isMoving: boolean = false;
        private curPos: THREE.Vector3;

        private beforeModelStatus: ModelStatus;
    }
}