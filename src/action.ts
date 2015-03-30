module PoseEditor {
    export class Action {
        constructor(e: Editor) {
            this.editor = e;
        }

        onActive(before: Action): void {
            console.log("base::onActive");
        }

        onDestroy(): void {
            console.log("base::onDestroy");
        }

        onTapStart(e: any, isTouch: boolean): void {
        }

        onMoving(e: any, isTouch: boolean): void {
        }

        onTapEnd(e: any, isTouch: boolean): void {
        }

        onDoubleTap(e: any, isTouch: boolean): void {
        }

        update(model: Model): void {
        }

        editor: Editor;
    }
}