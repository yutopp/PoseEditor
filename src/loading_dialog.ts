/// <reference path="dialog.ts"/>

module PoseEditor {
    export module Screen {
        export class LoadingDialog extends Dialog<HTMLImageElement> {
            constructor(parentDom: HTMLElement, imagePath: string) {
                super(parentDom, 'img', 'loading');

                this.coreDom.src = imagePath;

                this.width = this.coreDom.offsetWidth;
                this.height = this.coreDom.offsetHeight;
            }

            protected updatePosision() {
                var offsetW = this.parentDom.offsetWidth;
                var offsetH = this.parentDom.offsetHeight;

                var x = Math.abs(offsetW - this.coreDom.offsetWidth) / 2 - this.padding;
                var y = Math.abs(offsetH - this.coreDom.offsetHeight) / 2 - this.padding;

                this.coreDom.style.left = x + 'px';
                this.coreDom.style.top = y + 'px';
            }
        }
    }
}
