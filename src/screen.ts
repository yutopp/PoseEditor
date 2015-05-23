/// <reference path="event_dispatcher.ts"/>
/// <reference path="control_panel.ts"/>
/// <reference path="loading_dialog.ts"/>

module PoseEditor {
    export module Screen {
        export enum Mode {
            Camera,
            Move,
            Bone,
        }

        interface ConfigForScreen {
            loadingImagePath: string;
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
                    this.loadingDom = new LoadingDialog(this.targetDom, config.loadingImagePath);
                    this.showLoadingDom();

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

                //
                this.controlPanel.onResize(this.width, this.height);

                return false;
            }

            public showLoadingDom() {
                if ( this.loadingDom ) {
                    this.loadingDom.show();
                }
            }

            public hideLoadingDom() {
                if ( this.loadingDom ) {
                    this.loadingDom.hide();
                }
            }

            public getDialog(name: string) {
                return this.controlPanel.getDialog(name);
            }

            //
            public targetDom: HTMLElement;
            private controlPanel: ControlPanel;

            //
            public width: number;
            public height: number;
            public aspect: number;

            //
            private loadingDom: LoadingDialog = null;
        }
    }
}