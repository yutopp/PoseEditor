/// <reference path="action.ts"/>
/// <reference path="../ext/TransformControls.d.ts"/>

module PoseEditor {
    export class FKAction extends Action {
        constructor(e: Editor, ctrls: THREE.TransformControls) {
            super(e);

            this.transformCtrl = ctrls;
        }

        public name(): string {
            return "fk_action";
        }

        public onActive(): void {
            this.transformCtrl.setMode("rotate");
            this.transformCtrl.setSpace("local");
            this.transformCtrl.setSize(0.6);
            this.transformCtrl.addEventListener('change', () => this.onTransformCtrl());

            this.transformCtrl.detach();

            this.editor.showAllMarkerSprite();
        }

        public onDestroy(): void {
            this.releaseJoint();

            this.editor.hideAllMarkerSprite();
        }

        public onTapStart(e: any, isTouch: boolean): boolean {
            if ( this.isOnManipurator ) return false;

            var m = this.editor.selectJointMarker(e, isTouch);
            if ( m == null ) {
                this.releaseJoint();
                return true;
            }

            this.catchJoint(m);

            return false;
        }
/*
        public onMoving(e: any, isTouch: boolean): boolean {
        }

        public onTapEnd(e: any, isTouch: boolean): boolean {
        }
*/

        private catchJoint(m: THREE.Object3D) {
            this.currentJointMarker = m;
            this.model = this.currentJointMarker.userData.ownerModel;
            this.bone = this.model.mesh.skeleton.bones[this.currentJointMarker.userData.jointIndex];
            this.editor.selectMarkerSprite(this.currentJointMarker);

            // set initial pose of the bone
            this.bone.updateMatrixWorld(true);
            var to_q = this.bone.getWorldQuaternion(null)
            this.currentJointMarker.quaternion.copy(to_q);

            this.transformCtrl.attach(this.currentJointMarker);
            this.transformCtrl.update();
        }

        private releaseJoint() {
            if (this.currentJointMarker == null) return;

            this.currentJointMarker = null;
            this.transformCtrl.detach();
            this.isOnManipurator = false;

            this.editor.cancelAllMarkerSprite();
        }

        private onTransformCtrl() {
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

            this.transformCtrl.update();
        }

        private transformCtrl: THREE.TransformControls;
        private isOnManipurator: boolean = false;

        private currentJointMarker: THREE.Object3D;
        private model: Model;
        private bone: THREE.Bone;
    }
}