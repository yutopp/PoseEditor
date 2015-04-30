module PoseEditor {
    export class Action {
        constructor(e: Editor) {
            this.editor = e;
        }

        public name(): string {
            return "";
        }

        public onActive(): void {
        }

        public onDestroy(): void {
        }

        public onTapStart(e: any, isTouch: boolean, isActive: boolean): boolean {
            return true;
        }

        public onMoving(e: any, isTouch: boolean, isActive: boolean): boolean {
            return true;
        }

        public onTapEnd(e: any, isTouch: boolean, isActive: boolean): boolean {
            return true;
        }

        public onDoubleTap(e: any, isTouch: boolean, isActive: boolean): boolean {
            return true;
        }

        public update(model: Model): boolean {
            return true;
        }

        protected editor: Editor;
    }
}