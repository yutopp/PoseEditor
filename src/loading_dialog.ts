/// <reference path="dialog.ts"/>

module PoseEditor {
    export module Screen {
        export class LoadingDialog extends Dialog<HTMLImageElement> {
            constructor(parentDom: HTMLElement, imagePath: string) {
                super(parentDom, "img");

                this.baseDom.src = imagePath;

                this.width = this.baseDom.offsetWidth;
                this.height = this.baseDom.offsetHeight;
            }
        }
    }
}
