/// <reference path="action.ts"/>

module PoseEditor {
    export class CameraAction extends Action {
        constructor(e: Editor, c: THREE.OrbitControls) {
            super(e);

            // copy ownership
            this.controls = c;
        }

        public name(): string {
            return "camera";
        }

        public onActive(before: Action) {
            this.controls.enabled = true;
        }

        public onDestroy() {
            this.controls.enabled = false;
        }

        private controls: THREE.OrbitControls;
    }
}