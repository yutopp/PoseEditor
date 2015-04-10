/// <reference path="event_dispatcher.ts"/>

module PoseEditor {
    export module Screen {
        export class Dialog<T extends HTMLElement> extends EventDispatcher {
            constructor(parentDom: HTMLElement, tagName: string) {
                super();

                this.parentDom = parentDom;

                //
                this.padding = 10;

                // base element
                this.baseDom = <T>document.createElement(tagName);
                this.baseDom.style.position = 'absolute';
                this.baseDom.style.padding = this.padding + 'px';
                this.baseDom.style.borderRadius = '5px';
                this.baseDom.style.backgroundColor = '#fff';
                this.baseDom.style.display = 'none';
            }

            protected updatePosision() {
                var offsetW = this.parentDom.offsetWidth;
                var offsetH = this.parentDom.offsetHeight;

                var px = Math.abs(offsetW - (this.width + this.padding * 2)) / 2;
                var py = Math.abs(offsetH - (this.height + this.padding * 2)) / 2;

                this.baseDom.style.marginLeft = <number>px + 'px';
                this.baseDom.style.marginTop = <number>py + 'px';
            }

            public update() {
                this.updatePosision();
            }

            public show() {
                this.update();
                this.baseDom.style.display = 'inline';

                this.dispatchCallback('show');
            }

            public hide() {
                this.baseDom.style.display = 'none';

                this.dispatchCallback('hide');
            }


            protected parentDom: HTMLElement;

            public baseDom: T;

            protected width: number;
            protected height: number;

            protected padding: number;
        }
    }
}