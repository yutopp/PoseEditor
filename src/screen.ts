module PoseEditor {
    export module Screen {
        export enum Mode {
            Camera,
            Move,
            FK,
            IK,
        }

        interface ConfigForScreen {
            loadingImagePath: string;
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
                    s.opacity = "0.8";
                }
                this.screen.targetDom.appendChild(this.panelDom);

                //
                this.addButton((dom) => {
                    dom.value = 'camera';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onmodeclick", Mode.Camera);
                    });

                    this.toggleDom['camera'] = dom;
                });

                //
                this.addButton((dom) => {
                    dom.value = 'move';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onmodeclick", Mode.Move);
                    });

                    this.toggleDom['move'] = dom;
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
                this.addButton((dom) => {
                    dom.value = 'IK';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onmodeclick", Mode.IK);
                    });

                    this.toggleDom['ik'] = dom;
                });

                                //
                this.addButton((dom) => {
                    dom.value = 'Undo';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onundo");
                    });

                    dom.disabled = true;
                    this.Doms['undo'] = dom;
                });

                                //
                this.addButton((dom) => {
                    dom.value = 'Redo';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onredo");
                    });

                    dom.disabled = true;
                    this.Doms['redo'] = dom;
                });
            }

            private addButton(callback: (d: HTMLInputElement) => void): void {
                var dom = document.createElement("input");
                dom.type = "button";
                callback(dom);

                this.panelDom.appendChild(dom);
            }

            public selectModeUI(mode: string) {
                for( var key in this.toggleDom ) {
                    this.toggleDom[key].disabled = false;
                }

                this.toggleDom[mode].disabled = true;
            }

            public changeUIStatus(name: string, callback: (dom: HTMLElement) => any) {
                var dom = this.Doms[name];
                if (dom == null) return false;

                return callback(dom);
            }

            private screen: ScreenController;
            private panelDom: HTMLElement;

            private toggleDom: {[key: string]: HTMLElement} = {};
            private Doms: {[key: string]: HTMLElement} = {};
        }


        export class ScreenController {
            constructor(
                parentDomId: string,
                config: ConfigForScreen
            ) {
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
            public targetDom: HTMLElement;
            private controlPanel: ControlPanel;

            //
            private events: {[key: string]: Array<any>} = {};

            //
            public width: number;
            public height: number;
            public aspect: number;

            //
            private loadingDom: HTMLImageElement = null;
        }
    }
}