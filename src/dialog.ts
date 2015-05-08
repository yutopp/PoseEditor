/// <reference path="event_dispatcher.ts"/>

module PoseEditor {
    export module Screen {
        export class Dialog<T extends HTMLElement> extends EventDispatcher {
            constructor(parentDom: HTMLElement, tagName: string, className: string = 'dialog') {
                super();

                this.parentDom = parentDom;

                // shadowing element(hide background)
                this.shadowingDom = document.createElement('div');
                this.shadowingDom.className = 'poseeditor-shadowing';
                this.parentDom.appendChild(this.shadowingDom);

                // base element
                this.baseDom = document.createElement('div');
                this.baseDom.className = 'poseeditor-base-element';
                this.parentDom.appendChild(this.baseDom);

                // core dom
                this.coreDom = <T>document.createElement(tagName);
                this.coreDom.className = className;
                {
                    var s = this.coreDom.style;
                    s.display = 'none';
                    s.zIndex = '999';
                }
                this.baseDom.appendChild(this.coreDom);
            }

            public show() {
                this.shadowingDom.style.display = 'inline-block';

                this.baseDom.style.display = 'inline-block';
                this.coreDom.style.display = 'inline-block';

                this.dispatchCallback('show');
            }

            public hide() {
                this.shadowingDom.style.display = 'none';

                this.baseDom.style.display = 'none';
                this.coreDom.style.display = 'none';

                this.dispatchCallback('hide');
            }


            protected parentDom: HTMLElement;

            private shadowingDom: HTMLDivElement;

            private baseDom: HTMLDivElement;
            protected coreDom: T;
        }
    }
}