/// <reference path="screen.ts"/>
/// <reference path="configuration_dialog.ts"/>

module PoseEditor {
    export module Screen {
        export class ControlPanel {
            constructor(screen: ScreenController) {
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
                    dom.value = 'move/select';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onmodeclick", Mode.Move);
                    });
                });

                //
                this.toggleDom['bone'] = this.addButton((dom) => {
                    dom.value = 'Bone';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onmodeclick", Mode.Bone);
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

                ///
                this.dialogs['download'] = this.addDialog((c) => {
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
                        this.dialogs['download'].show();
                    });
                });
                ///

                ///
                this.dialogs['addmodel'] = this.addDialog((c) => {
                    c.addCallback('show', () => {
                        this.screen.dispatchCallback('showaddmodel', (data: any) => {
                            c.setValues(data);
                        });
                    });

                    c.addCallback('onsubmit', (data: any) => {
                        this.screen.dispatchCallback('onaddmodel', data);
                    });
                });

                this.doms['addmodel'] = this.addButton((dom) => {
                    dom.value = 'AddModel';
                    dom.addEventListener("click", () => {
                        this.dialogs['addmodel'].show();
                    });
                });
                ///

                this.doms['deletemodel'] = this.addButton((dom) => {
                    dom.value = 'DeleteModel';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("ondeletemodel");
                    });

                    dom.disabled = true;
                });

                ///
                this.dialogs['config'] = this.addDialog((c) => {
                    c.addCallback('show', () => {
                        this.screen.dispatchCallback('showconfig', (data: any) => {
                            c.setValues(data);
                        });
                    });

                    c.addCallback('onsubmit', (data: any) => {
                        this.screen.dispatchCallback('onconfig', data);
                    });
                });

                this.doms['config'] = this.addButton((dom) => {
                    dom.value = 'Config';
                    dom.addEventListener("click", () => {
                        // call onshowdownload
                        this.dialogs['config'].show();
                    });
                });
                ///

                this.doms['restore'] = this.addButton((dom) => {
                    dom.value = 'Restore';

                    // to open the file dialog
                    var fileInput = document.createElement("input");
                    fileInput.type = 'file';
                    fileInput.style.display = 'none';
                    fileInput.onchange = (e: Event) => {
                        var files = fileInput.files;
                        if ( files.length != 1 ) {
                            return false;
                        }
                        var file = files[0];

                        var reader = new FileReader();
                        reader.onload = (e: Event) => {
                            var data = reader.result;
                            this.screen.dispatchCallback('onrestore', data);
                        };
                        reader.readAsText(file);
                    };
                    dom.appendChild(fileInput);

                    dom.addEventListener("click", () => fileInput.click());
                });
            }

            private addButton(callback: (d: HTMLInputElement) => void) {
                var dom = document.createElement("input");
                dom.type = "button";
                callback(dom);

                this.panelDom.appendChild(dom);

                return dom;
            }

            private addDialog(callback: (c: ConfigurationDialog) => void) {
                var ctrl = new ConfigurationDialog(this.screen.targetDom);
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
            private dialogs: {[key: string]: ConfigurationDialog} = {};
        }
    }
}