/// <reference path="action.ts"/>

module PoseEditor {
    export class CameraAction extends Action {
        constructor(e: Editor, c: THREE.OrbitControls) {
            super(e);

            // copy ownership
            this.controls = c;
        }

        onActive(before: Action) {
            this.controls.enabled = true;
        }

        onDestroy() {
            this.controls.enabled = false;
        }

        private controls: THREE.OrbitControls;
    }
}