module PoseEditor {
    export class Action {
        constructor(e: Editor) {
            this.editor = e;
        }

        public name(): string {
            return "";
        }

        public onActive(before: Action): void {
            console.log("base::onActive");
        }

        public onDestroy(): void {
            console.log("base::onDestroy");
        }

        public onTapStart(e: any, isTouch: boolean): void {
        }

        public onMoving(e: any, isTouch: boolean): void {
        }

        public onTapEnd(e: any, isTouch: boolean): void {
        }

        public onDoubleTap(e: any, isTouch: boolean): void {
        }

        public update(model: Model): void {
        }

        protected editor: Editor;
    }
}