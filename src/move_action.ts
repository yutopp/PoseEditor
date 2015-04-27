/// <reference path="action.ts"/>

module PoseEditor {
    export class MoveAction extends Action {
        constructor(e: Editor) {
            super(e);
        }

        public name(): string {
            return "move";
        }

        public onDestroy(): void {
            this.releaseModel();
            this.editor.setSelectedModel(null);
        }

        public onTapStart(e: any, isTouch: boolean): boolean {
            return this.catchModel(e, isTouch);
        }

        public onMoving(e: any, isTouch: boolean): boolean {
            return this.moveModel(e, isTouch);
        }

        public onTapEnd(e: any, isTouch: boolean): boolean {
            return this.releaseModel();
        }


        private catchModel(e: any, isTouch: boolean) {
            var mp = this.editor.selectModel(e, isTouch)
            if (mp == null) {
                this.releaseModel();
                this.editor.setSelectedModel(null);
                return true;
            }

            this.currentModel = mp[0];
            var localConfPos = mp[1];

            this.offsetOrgToBone = localConfPos.clone().sub(this.currentModel.mesh.position);
            this.editor.setSelectedModel(this.currentModel);

            //
            this.editor.cursorHelper.setBeginState(localConfPos.clone());

            //
            this.beforeModelStatus = this.currentModel.modelData();

            return false;
        }

        private moveModel(e: any, isTouch: boolean) {
            if (this.currentModel == null) return true;

            var pos = this.editor.cursorToWorld(e, isTouch);
            var curPos = this.editor.cursorHelper.move(pos);

            curPos.sub(this.offsetOrgToBone);
            this.currentModel.mesh.position.copy(curPos);

            return false;
        }

        private releaseModel() {
            if (this.currentModel == null) return true;

            // record action
            var currentModelStatus = this.currentModel.modelData();
            // TODO:
            // if ( !this.beforeModelStatus.equals(currentModelStatus) ) {
            this.editor.history.didAction( new TimeMachine.ChangeModelStatusAction(
                this.currentModel,
                this.beforeModelStatus,
                currentModelStatus
            ));

            this.currentModel = null;

            return false;
        }

        private currentModel: Model;
        private offsetOrgToBone: THREE.Vector3;

        private beforeModelStatus: ModelStatus;
    }
}