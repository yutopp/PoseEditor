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

        export class ScreenController {
            constructor(
                parentDomId: string,
                config: ConfigForScreen
            ) {
                //
                var parentDom = document.getElementById(parentDomId);
                if (parentDom == null) {
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
                    this.loadingDom.style.display = "none";

                    this.targetDom.appendChild(this.loadingDom);
                }

                // tmp
                this.addButton('camera', Mode.Camera);
                this.addButton('move', Mode.Move);
                //this.addButton('fk', Mode.FK);
                this.addButton('ik', Mode.IK);

                this.addUndoButton();
                this.addRedoButton();

                //
                window.addEventListener('resize', () => this.onResize(), false);
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
                    this.loadingDom.style.position = 'absolute';
                    this.loadingDom.style.padding = "10px";
                    this.loadingDom.style.borderRadius = "5px";
                    this.loadingDom.style.backgroundColor = "#fff";

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

            private addButton(title: string, m: Mode): void {
                var dom = document.createElement("input");
                dom.type = "button";
                dom.value = title;
                dom.addEventListener("click", () => {
                    this.dispatchCallback("onmodeclick", m);
                });

                this.targetDom.appendChild(dom);

                this.modeChangerDom.push(dom);
            }

            private addUndoButton() {
                var dom = document.createElement("input");
                dom.type = "button";
                dom.value = "Undo";
                dom.addEventListener("click", () => {
                    this.dispatchCallback("onundo");
                });

                this.targetDom.appendChild(dom);

                this.modeChangerDom.push(dom);
            }

            private addRedoButton() {
                var dom = document.createElement("input");
                dom.type = "button";
                dom.value = "Redo";
                dom.addEventListener("click", () => {
                    this.dispatchCallback("onredo");
                });

                this.targetDom.appendChild(dom);

                this.modeChangerDom.push(dom);
            }

            public addCallback(type: string, f: any): void {
                if ( this.events[type] == null ) {
                    this.events[type] = [];
                }
                this.events[type].push(f);
            }

            private dispatchCallback(type: string, ...args: any[]): void {
                if ( this.events[type] != null ) {
                    this.events[type].forEach((f: any) => {
                        f.apply({}, args);
                    });
                }
            }

            //
            public targetDom: HTMLElement;
            private modeChangerDom: Array<HTMLElement> = [];
            private systemDom: Array<HTMLElement> = [];

            //
            private events: {[key: string]: Array<any>} = {};

            //
            public width: number;
            public height: number;
            public aspect: number;

            //
            private loadingDom: any = null;
        }
    }
}