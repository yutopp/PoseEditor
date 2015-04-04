module PoseEditor {
    export class Action {
        constructor(e: Editor) {
            this.editor = e;
        }

        public name(): string {
            return "";
        }

        public onActive(): void {
            console.log("base::onActive");
        }

        public onDestroy(): void {
            console.log("base::onDestroy");
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