module PoseEditor {
    export module TimeMachine {
        export class Action {
            public undo() {}
            public redo() {}
        }

        export class ChangeModelStatusAction extends Action {
            constructor(m: Model, b: ModelStatus, a: ModelStatus) {
                super();

                this.model = m;
                this.beforeStatus = b;
                this.afterStatus = a;
            }

            public undo() {
                this.model.loadModelData(this.beforeStatus);
            }

            public redo() {
                this.model.loadModelData(this.afterStatus);
            }

            private model: Model;
            private beforeStatus: ModelStatus;
            private afterStatus: ModelStatus;
        }


        export class Machine {
            constructor(screen: Screen.ScreenController) {
                this.screen = screen; // TO data binding... (nullable)
            }

            public undo() {
                if (this.currentStep < 0 || this.history.length == 0) return;

                if (this.currentStep >= this.history.length) this.currentStep = this.history.length - 1;
                this.history[this.currentStep].undo();
                this.currentStep--;
                this.side = 0;

                this.updateUI();
            }

            public redo() {
                if (this.currentStep >= this.history.length) return;

                if (this.currentStep < 0) this.currentStep = 0;
                this.history[this.currentStep].redo();
                this.currentStep++;

                this.updateUI();
            }

            public didAction(act: Action) {
                if (this.currentStep >= 0 && this.currentStep + 1 < this.history.length) {
                    // remove all action to redo
                    var deleteFrom = this.currentStep + 1;
                    this.history.splice(deleteFrom, this.history.length-deleteFrom);
                }

                this.history.push(act);
                this.currentStep++;

                this.updateUI();
            }

            private updateUI() {
                if (this.screen) {
                    this.screen.changeUIStatus('undo', (dom: HTMLElement) => {
                        if ( this.currentStep >= 0 ) {
                            dom.disabled = false;
                        } else {
                            dom.disabled = true;
                        }
                    });

                    this.screen.changeUIStatus('redo', (dom: HTMLElement) => {
                        var isFirstTime
                            = this.currentStep == 0 && this.history.length == 1; // ;( FIX
                        console.log(this.currentStep);
                        console.log(this.history.length);
                        console.log(this.side);

                        if ( this.currentStep + this.side < this.history.length ) {
                            dom.disabled = false;
                        } else {
                            dom.disabled = true;
                        }
                    });
                }
            }

            private history: Array<Action> = [];
            private currentStep = -1;

            private screen: Screen.ScreenController;

            private side = 1;
        }

    }
}