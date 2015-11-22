/// <reference path="screen.ts"/>
/// <reference path="configuration_dialog.ts"/>

module PoseEditor {
    export module Screen {
        export class ControlPanel {
            constructor(screen: ScreenController) {
                this.screen = screen;

                //
                this.panelDom = document.createElement("div");
                this.panelDom.className = 'control-panel';
                {
                    var s = this.panelDom.style;
                    s.position = 'absolute';
                    s.right = '0';
                    //s.width = <number>(this.screen.width / 10) + 'px';
                    s.width = '100px';
                    s.height = <number>this.screen.height + 'px';
                }
                this.screen.targetDom.appendChild(this.panelDom);

                //
                this.toggleDom['camera'] = this.addButton((dom) => {
                    dom.value = 'Camera';
                    dom.className = 'modes';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onmodeclick", Mode.Camera);
                    });
                });

                //
                this.toggleDom['move'] = this.addButton((dom) => {
                    dom.value = 'Move/Select';
                    dom.className = 'modes';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onmodeclick", Mode.Move);
                    });
                });

                //
                this.toggleDom['bone'] = this.addButton((dom) => {
                    dom.value = 'Bone';
                    dom.className = 'modes';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onmodeclick", Mode.Bone);
                    });
                });

                this.addHR();

                //
                this.doms['undo'] = this.addButton((dom) => {
                    dom.value = 'Undo';
                    dom.className = 'undo half';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onundo");
                    });

                    dom.disabled = true;
                });

                //
                this.doms['redo'] = this.addButton((dom) => {
                    dom.value = 'Redo';
                    dom.className = 'redo half';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onredo");
                    });

                    dom.disabled = true;
                });

                this.addClearDom();
                this.addHR();

                //
                this.doms['initial_bone'] = this.addButton((dom) => {
                    dom.value = 'Init Bone';
                    dom.className = 'init-bone half';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onboneinitialize");
                    });

                    dom.disabled = true;
                });

                this.doms['initial_pose'] = this.addButton((dom) => {
                    dom.value = 'Init Pose';
                    dom.className = 'init-pose half';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("onposeinitialize");
                    });

                    dom.disabled = true;
                });

                this.addClearDom();
                this.addHR();

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
                    dom.className = 'add-model';
                    dom.addEventListener("click", () => {
                        this.dialogs['addmodel'].show();
                    });
                });
                ///

                this.doms['deletemodel'] = this.addButton((dom) => {
                    dom.value = 'DeleteModel';
                    dom.className = 'remove-model';
                    dom.addEventListener("click", () => {
                        this.screen.dispatchCallback("ondeletemodel");
                    });

                    dom.disabled = true;
                });

                this.addHR();

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
                    dom.className = 'saving';
                    dom.addEventListener("click", () => {
                        this.dialogs['download'].show();
                    });
                });
                ///

                ///
                this.doms['restore'] = this.addButton((dom) => {
                    dom.value = 'Restore';
                    dom.className = 'saving';

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
                ///

                this.addHR();

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
                    dom.className = 'config';
                    dom.addEventListener("click", () => {
                        // call onshowdownload
                        this.dialogs['config'].show();
                    });
                });
                ///

                // dialogs for error...
                this.dialogs['error'] = this.addDialog((c) => {
                    c.addCallback('show', () => {
                        c.setValues([{
                            type: 'message',
                            text: 'エラーが発生しました．'
                        }]);
                    });

                    c.addCallback('onsubmit', (data: any) => {
                    });
                }, false);
            }

            private addButton(callback: (d: HTMLInputElement) => void) {
                var dom = document.createElement("input");
                dom.type = "button";
                callback(dom);

                this.panelDom.appendChild(dom);

                return dom;
            }

            private addDialog(
                callback: (c: ConfigurationDialog) => void,
                hasCancel: boolean = true
            ) {
                var ctrl = new ConfigurationDialog(this.screen.targetDom, hasCancel);
                callback(ctrl);

                return ctrl;
            }

            public getDialog(name: string) {
                return this.dialogs[name];
            }

            private addClearDom() {
                var dom = document.createElement("div");
                dom.style.clear = 'both';
                this.panelDom.appendChild(dom);
            }

            private addHR() {
                var dom = document.createElement("hr");
                this.panelDom.appendChild(dom);
            }

            public selectModeUI(mode: string) {
                for( var key in this.toggleDom ) {
                    this.toggleDom[key].disabled = false;
                }

                this.toggleDom[mode].disabled = true;
            }

            public changeUIStatus(name: string, callback: (dom: HTMLInputElement) => any) {
                var dom = this.doms[name];
                if (dom == null) return false;

                return callback(dom);
            }

            public onResize(width: number, height: number) {
                // DO nothing...
            }


            private screen: ScreenController;
            private panelDom: HTMLElement;

            private toggleDom: {[key: string]: HTMLInputElement} = {};
            private doms: {[key: string]: HTMLInputElement} = {};
            private dialogs: {[key: string]: ConfigurationDialog} = {};
        }
    }
}
