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

        public onActive() {
            this.controls.enabled = true;
        }

        public onTapStart(e: any, isTouch: boolean, isActive: boolean): boolean {
            this.controls.enabled = isActive;
            if ( this.controls.enabled ) {
                (<any>this.controls).beginControl(e);   // ;(
            }

            return true;
        }

        public onTapEnd(e: any, isTouch: boolean): boolean {
            return true;
        }

        private controls: THREE.OrbitControls;
    }
}