module PoseEditor {
    export module Screen {
        class EventDispatcher {
            public addCallback(type: string, f: any): void {
                if ( this.events[type] == null ) {
                    this.events[type] = [];
                }
                this.events[type].push(f);
            }

            public dispatchCallback(type: string, ...args: any[]): void {
                if ( this.events[type] != null ) {
                    this.events[type].forEach((f: any) => {
                        f.apply({}, args);
                    });
                }
            }

            //
            private events: {[key: string]: Array<any>} = {};
        }

        export enum Mode {
            Camera,
            Move,
            FK,
            IK,
        }

        interface ConfigForScreen {
            loadingImagePath: string;
        }

        interface DomAction {
            destruction: () => void;
            crawl: (table: {[key: string]: any}) => void;
        }

        class Dialog extends EventDispatcher {
            constructor(parentDom: HTMLElement) {
                super();

                this.parentDom = parentDom;

                // base element
                this.baseDom = document.createElement("div");
                this.baseDom.style.position = 'absolute';
                //this.baseDom.style.padding = "10px";
                this.baseDom.style.borderRadius = "5px";
                this.baseDom.style.backgroundColor = "#fff";
                this.baseDom.style.display = 'none';

                // container element
                this.containerDom = document.createElement("div");
                {
                    var d = this.containerDom;
                    // d.innerText = "elements";
                }
                this.baseDom.appendChild(this.containerDom);

                // selection element
                this.selectionDom = document.createElement("div");
                {
                    var d = this.selectionDom;
                    d.style.backgroundColor = "#00f";

                    {
                        var dom = document.createElement("input");
                        dom.type = "button";
                        dom.value = 'submit';
                        dom.addEventListener("click", () => {
                            var table: {[key: string]: any} = {};
                            this.getElementValues(table);
                            this.disposeAllElements();

                            this.dispatchCallback('onsubmit', table);
                            this.hide();
                        });

                        d.appendChild(dom);
                    }

                    {
                        var dom = document.createElement("input");
                        dom.type = "button";
                        dom.value = 'cancel';
                        dom.addEventListener("click", () => {
                            this.disposeAllElements();

                            this.dispatchCallback('oncancel');
                            this.hide();
                        });

                        d.appendChild(dom);
                    }
                }
                this.baseDom.appendChild(this.selectionDom);

                //
                this.updatePosisionAndSize();
            }

            private updatePosisionAndSize() {
                this.updateSize();
                this.updatePosision();
            }

            private updatePosision() {
                var offsetW = this.parentDom.offsetWidth;
                var offsetH = this.parentDom.offsetHeight;

                var px = Math.abs(offsetW - this.width) / 2;
                var py = Math.abs(offsetH - this.height) / 2;

                this.baseDom.style.marginLeft = <number>px + 'px';
                this.baseDom.style.marginTop = <number>py + 'px';
            }

            private updateSize() {
                var offsetW = this.parentDom.offsetWidth;
                var offsetH = this.parentDom.offsetHeight;

                this.width = Math.max(offsetW - 40, 40);
                this.height = Math.max(offsetH - 40, 40);

                this.baseDom.style.width = this.width + 'px';
                this.baseDom.style.height = this.height + 'px';
            }

            public show() {
                this.baseDom.style.display = 'inline';

                this.dispatchCallback('show');
            }

            public hide() {
                this.baseDom.style.display = 'none';

                this.dispatchCallback('hide');
            }

            public setValues(data: Array<any>) {
                if (data) {
                    data.forEach((v: any) => {
                        var type = <string>v.type;
                        var name = <string>v.name;

                        switch(type) {
                        case 'radio':
                            this.addElement(
                                name,
                                (wrapperDom: HTMLElement) => {
                                    // construct radio boxes
                                    var num = <number>v.value.length;
                                    var checkedIndex = <number>v.checked;

                                    for( var i=0; i<num; ++i ) {
                                        var value = v.value[i];
                                        var label = v.label[i];

                                        var labelDom
                                            = document.createElement("label");
                                        labelDom.innerText = label;

                                        var inputDom
                                            = document.createElement("input");
                                        inputDom.type = 'radio';
                                        inputDom.name = 'poseeditor-' + name;
                                        inputDom.value = value;
                                        if ( i == checkedIndex ) {
                                            inputDom.checked = true;
                                        }

                                        labelDom.appendChild(inputDom);
                                        wrapperDom.appendChild(labelDom);
                                    }
                                },
                                () => {
                                    // result collector
                                    var domName = 'poseeditor-' + name;
                                    var radios
                                        = document.getElementsByName(domName);

                                    var format = "";
                                    for( var i=0; i<radios.length; ++i ) {
                                        var radio = <HTMLInputElement>radios[i];
                                        if ( radio.checked ) {
                                            format = radio.value;
                                            break;
                                        }
                                    }

                                    return format;
                                }
                            );
                            break;

                        default:
                            console.warn('unsupported: ' + type);
                            break;
                        }
                    });
                }
            }

            private addElement(
                name: string,
                createDom: (wrapper: HTMLElement) => void,
                clawlAction: () => any
            ) {
                //
                var wrapperDom = document.createElement("div");
                createDom(wrapperDom);
                this.containerDom.appendChild(wrapperDom);

                //
                var action = {
                    destruction: () => {
                        this.containerDom.removeChild(wrapperDom);
                    },
                    crawl: (table: any) => {
                        var result = clawlAction();
                        table[name] = result;
                    }
                };
                this.actions.push(action);
            }

            private disposeAllElements() {
                this.actions.forEach((a) => a.destruction());
                this.actions = [];
            }

            private getElementValues(table: {[key: string]: any}) {
                this.actions.forEach((a) => a.crawl(table));
            }


            protected parentDom: HTMLElement;

            public baseDom: HTMLDivElement;
            protected width: number;
            protected height: number;

            private containerDom: HTMLElement;
            private selectionDom: HTMLElement;

            private actions: Array<DomAction> = [];
        }

        class ControlDialog extends Dialog {
            constructor(parentDom: HTMLElement) {
                super(parentDom);
            }
        }

        class ControlPanel {
            constructor( screen: ScreenController ) {
                this.screen = screen;

                //
                this.panelDom = document.createElement("div");
                {
                    var s = this.panelDom.style;
                    s.position = "absolute";
                    s.right = "0";
                    s.width = <number>(this.screen.width / 10) + "px";
                    s.height = "100%";
                    s.backgroundColor = "#fff";
                    // s.opacity = "0.8";
                }
                this.screen.targetDom.appendChild(this.panelDom);

                //
                this.toggleDom['camera'] = this.addButton((dom) => {
                    dom.value = 'camera';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onmodeclick", Mode.Camera);
                    });
                });

                //
                this.toggleDom['move'] = this.addButton((dom) => {
                    dom.value = 'move';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onmodeclick", Mode.Move);
                    });
                });

                /*
                //
                this.addButton((dom) => {
                    dom.value = 'FK';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onmodeclick", Mode.FK);
                    });

                    this.toggleDom['fk'] = dom;
                });
                */

                //
                this.toggleDom['ik'] = this.addButton((dom) => {
                    dom.value = 'IK';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onmodeclick", Mode.IK);
                    });
                });

                //
                this.doms['undo'] = this.addButton((dom) => {
                    dom.value = 'Undo';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onundo");
                    });

                    dom.disabled = true;
                });

                //
                this.doms['redo'] = this.addButton((dom) => {
                    dom.value = 'Redo';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onredo");
                    });

                    dom.disabled = true;
                });

                this.dialogs['download'] = this.addDialog((c) => {
                    // onshowdownload event
                    c.addCallback('show', () => {
                        this.screen.dispatchCallback('showdownload', (data: any) => {
                            c.setValues(data);
                        });
                    });

                    c.addCallback('onsubmit', (data: any) => {
                        this.screen.dispatchCallback('ondownload', data);
                    });
                });

                this.doms['download'] = this.addButton((dom) => {
                    dom.value = 'Download';
                    dom.addEventListener("click", () => {
                        // call onshowdownload
                        this.dialogs['download'].show();
                    });
                });
            }

            private addButton(callback: (d: HTMLInputElement) => void) {
                var dom = document.createElement("input");
                dom.type = "button";
                callback(dom);

                this.panelDom.appendChild(dom);

                return dom;
            }

            private addDialog(callback: (c: ControlDialog) => void) {
                var ctrl = new ControlDialog(this.screen.targetDom);
                callback(ctrl);

                this.screen.targetDom.appendChild(ctrl.baseDom);

                return ctrl;
            }

            public selectModeUI(mode: string) {
                for( var key in this.toggleDom ) {
                    this.toggleDom[key].disabled = false;
                }

                this.toggleDom[mode].disabled = true;
            }

            public changeUIStatus(name: string, callback: (dom: HTMLElement) => any) {
                var dom = this.doms[name];
                if (dom == null) return false;

                return callback(dom);
            }


            private screen: ScreenController;
            private panelDom: HTMLElement;

            private toggleDom: {[key: string]: HTMLElement} = {};
            private doms: {[key: string]: HTMLElement} = {};
            private dialogs: {[key: string]: Dialog} = {};
        }


        export class ScreenController extends EventDispatcher {
            constructor(
                parentDomId: string,
                config: ConfigForScreen
            ) {
                super();

                //
                var parentDom = document.getElementById(parentDomId);
                if ( parentDom == null ) {
                    console.log("parent dom was not found...");
                }
                this.targetDom = parentDom ? parentDom : document.body;

                //
                this.width  = this.targetDom.offsetWidth;
                this.height = this.targetDom.offsetHeight;
                this.aspect = this.width / this.height;

                //
                if ( config.loadingImagePath ) {
                    this.loadingDom = document.createElement("img");
                    this.loadingDom.src = config.loadingImagePath;
                    this.loadingDom.style.position = 'absolute';
                    this.loadingDom.style.padding = "10px";
                    this.loadingDom.style.borderRadius = "5px";
                    this.loadingDom.style.backgroundColor = "#fff";

                    this.loadingDom.style.display = "none";

                    this.targetDom.appendChild(this.loadingDom);
                }

                //
                this.controlPanel = new ControlPanel(this);

                //
                window.addEventListener('resize', () => this.onResize(), false);
            }

            public selectModeUI(mode: string) {
                this.controlPanel.selectModeUI(mode);
            }

            public changeUIStatus(name: string, callback: (dom: HTMLElement) => any) {
                return this.controlPanel.changeUIStatus(name, callback);
            }

            public appendChild(dom: any): void {
                this.targetDom.appendChild(dom);
            }

            private onResize(): boolean {
                var w = this.targetDom.offsetWidth;
                var h = this.targetDom.offsetHeight;
                if ( this.width == w && this.height == h ) {
                    return false;
                }

                // update size
                this.width  = w;
                this.height = h;
                this.aspect = this.width / this.height;

                //
                this.dispatchCallback('resize');

                return false;
            }

            public showLoadingDom() {
                if ( this.loadingDom.style ) {
                    this.loadingDom.style.display = "inline";

                    var x = Math.abs(this.targetDom.offsetWidth - this.loadingDom.offsetWidth) / 2;
                    var y = Math.abs(this.targetDom.offsetHeight - this.loadingDom.offsetHeight) / 2;

                    this.loadingDom.style.left = x + 'px';
                    this.loadingDom.style.top = y + 'px';
                }
            }

            public hideLoadingDom() {
                if ( this.loadingDom.style ) {
                    this.loadingDom.style.display = "none";
                }
            }

            //
            public targetDom: HTMLElement;
            private controlPanel: ControlPanel;

            //
            public width: number;
            public height: number;
            public aspect: number;

            //
            private loadingDom: HTMLImageElement = null;
        }
    }
}