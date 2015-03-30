/// <reference path="action.ts"/>

module PoseEditor {
    export class MoveAction extends Action {
        constructor(e: Editor) {
            super(e);
        }

        onDestroy(): void {
            this.releaseModel();
        }

        onTapStart(e: any, isTouch: boolean): void {
            this.catchModel(e, isTouch);
        }

        onMoving(e: any, isTouch: boolean): void {
            this.moveModel(e, isTouch);
        }

        onTapEnd(e: any, isTouch: boolean): void {
            this.releaseModel();
        }


        private catchModel(e: any, isTouch: boolean) {
            var mp = this.editor.selectModel(e, isTouch)
            if (mp == null) {
                this.releaseModel();
                return;
            }

            this.currentModel = mp[0];
            var localConfPos = mp[1];

            this.offsetOrgToBone = localConfPos.clone().sub(this.currentModel.mesh.position);

            //
            this.editor.cursorHelper.setBeginState(localConfPos.clone());
        }

        private moveModel(e: any, isTouch: boolean) {
            if (this.currentModel == null) return;

            var pos = this.editor.cursorToWorld(e, isTouch);
            var curPos = this.editor.cursorHelper.move(pos);

            curPos.sub(this.offsetOrgToBone);
            this.currentModel.mesh.position.copy(curPos);
        }

        private releaseModel() {
            if (this.currentModel == null) return;

            this.currentModel = null;
        }

        private currentModel: Model;
        private offsetOrgToBone: THREE.Vector3;
    }
}