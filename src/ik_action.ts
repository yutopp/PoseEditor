/// <reference path="action.ts"/>

module PoseEditor {
    export class IKAction extends Action {
        constructor(e: Editor) {
            super(e);
        }

        onActive(before: Action): void {
            this.editor.showAllMarkerSprite();
        }

        onDestroy(): void {
            this.releaseJoint();
            this.editor.hideAllMarkerSprite();
        }

        onTapStart(e: any, isTouch: boolean): void {
            this.isMoving = true;

            var m = this.editor.selectJointMarker(e, isTouch)
            if (m == null) return;

            this.catchJoint(m);
        }

        onMoving(e: any, isTouch: boolean): void {
            this.moving(e, isTouch);
        }

        onTapEnd(e: any, isTouch: boolean): void {
            this.isMoving = false;
        }

        onDoubleTap(e: any, isTouch: boolean): void {
            if (this.currentJointMarker) {
                var model = this.currentJointMarker.userData.ownerModel;
                var index = this.currentJointMarker.userData.jointIndex;

                model.toggleIKPropagation(index);
            }
        }

        update(model: Model): void {
            if (this.currentJointMarker == null || !this.isMoving) return;

            if (model == this.currentJointMarker.userData.ownerModel) {
                if (this.curPos != null) {
                    this.ik(this.bone, this.curPos);
                }
            }
        }


        private catchJoint(m: THREE.Object3D) {
            this.currentJointMarker = m;
            this.model = this.currentJointMarker.userData.ownerModel;
            this.bone = this.model.mesh.skeleton.bones[this.currentJointMarker.userData.jointIndex];
            this.editor.selectMarkerSprite(this.currentJointMarker);

            //
            var pos = this.currentJointMarker.position;
            this.curPos = pos;

            this.editor.cursorHelper.setBeginState(pos);
        }

        private moving(e: any, isTouch: boolean) {
            if (this.currentJointMarker == null || !this.isMoving) return;

            var pos = this.editor.cursorToWorld(e, isTouch);
            this.curPos = this.editor.cursorHelper.move(pos);
        }

        private releaseJoint() {
            if (this.currentJointMarker == null) return;

            this.currentJointMarker = null;
            this.isMoving = false;

            this.editor.cancelAllMarkerSprite();
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


        private currentJointMarker: THREE.Object3D;
        private model: Model;
        private bone: THREE.Bone;

        private isMoving: boolean = false;
        private curPos: THREE.Vector3;
    }
}