/// <reference path="event_dispatcher.ts"/>

module PoseEditor {
    export module Screen {
        export class Dialog<T extends HTMLElement> extends EventDispatcher {
            constructor(parentDom: HTMLElement, tagName: string, className: string = 'dialog') {
                super();

                this.parentDom = parentDom;

                //
                this.padding = 10;

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
                var offsetW = this.parentDom.offsetWidth;
                var offsetH = this.parentDom.offsetHeight;

                var px = Math.abs(offsetW - (this.width + this.padding * 2)) / 2;
                var py = Math.abs(offsetH - (this.height + this.padding * 2)) / 2;

                this.coreDom.style.marginLeft = <number>px + 'px';
                this.coreDom.style.marginTop = <number>py + 'px';
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