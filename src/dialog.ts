/// <reference path="event_dispatcher.ts"/>

module PoseEditor {
    export module Screen {
        export class Dialog<T extends HTMLElement> extends EventDispatcher {
            protected offsetLeft = 0;
            protected offsetTop = 0;

            constructor(parentDom: HTMLElement, tagName: string, className: string = 'dialog') {
                super();

                this.parentDom = parentDom;

                //
                this.padding = 10;

                var rect = this.parentDom.getClientRects()[0];
                this.offsetLeft = rect.left;
                this.offsetTop = rect.top;

                // base element(hide bg)
                this.baseDom = document.createElement('div');
                {
                    var s = this.baseDom.style;
                    s.display = 'none';
                    s.position = 'absolute';
                    s.width = '100%';
                    s.height = '100%';
                    s.margin = '0';
                    s.padding = '0';
                    s.backgroundColor = '#000';
                    s.opacity = '0.5';
                }
                this.parentDom.appendChild(this.baseDom);

                // core dom
                this.coreDom = <T>document.createElement(tagName);
                this.coreDom.className = className;
                {
                    var s = this.coreDom.style;
                    s.display = 'none';
                    s.position = 'absolute';
                    s.zIndex = '999';
                    s.padding = this.padding + 'px';
                }
                this.parentDom.appendChild(this.coreDom);
            }

            protected updatePosision() {
                var parentW = this.parentDom.clientWidth;
                var parentH = this.parentDom.clientHeight;

                var px = (parentW - this.width) / 2.0;
                var py = (parentH - this.height) / 2.0;

                this.coreDom.style.left = <number>px + 'px';
                this.coreDom.style.top = <number>py + 'px';
            }

            public update() {
                this.updatePosision();
            }

            public show() {
                this.update();
                this.baseDom.style.display = 'inline';
                this.coreDom.style.display = 'inline';

                this.dispatchCallback('show');
            }

            public hide() {
                this.baseDom.style.display = 'none';
                this.coreDom.style.display = 'none';

                this.dispatchCallback('hide');
            }


            protected parentDom: HTMLElement;

            private baseDom: HTMLDivElement;
            protected coreDom: T;

            protected width: number;
            protected height: number;

            protected padding: number;
        }
    }
}