/// <reference path="dialog.ts"/>

module PoseEditor {
    export module Screen {
        export class LoadingDialog extends Dialog<HTMLImageElement> {
            constructor(parentDom: HTMLElement, imagePath: string) {
                super(parentDom, 'div', 'poseeditor-loading');

                var imageDom = document.createElement('img')
                imageDom.src = imagePath;
                this.coreDom.appendChild(imageDom);

                var spanDom = document.createElement('span')
                spanDom.innerText = "Loading...";
                this.coreDom.appendChild(spanDom);
            }
        }
    }
}
