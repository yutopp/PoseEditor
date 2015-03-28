/// <reference path="action.ts"/>

module PoseEditor {
    export class FKAction extends Action {
        constructor(e: Editor) {
            super(e);
        }

        onTapStart(e: any, isTouch: boolean): void {
            this.selectedMarker = this.editor.boneRay(e, isTouch);
        }

        onMoving(e: any, isTouch: boolean): void {
        }

        onTapEnd(e: any, isTouch: boolean): void {
        }

        private selectedMarker: THREE.Object3D;
    }
}