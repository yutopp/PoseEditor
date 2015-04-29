module PoseEditor {
    export module TimeMachine {
        export class Action {
            public undo() {}
            public redo() {}
        }

        //
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

        //
        export class ChangeModelRemoveAction extends Action {
            constructor(m: Model, b: Array<Model>, real: Array<Model>) {
                super();

                this.model = m;
                this.refModels = real;
                this.beforeModels = b;
                this.afterModels = real.concat();   // clone
            }

            public undo() {
                this.refModels.splice(0, this.refModels.length);
                this.beforeModels.forEach((e) => this.refModels.push(e));  // X(

                console.log("reactivete");
                this.model.reactivate();
            }

            public redo() {
                this.refModels.splice(0, this.refModels.length);
                this.afterModels.forEach((e) => this.refModels.push(e));  // X(

                this.model.deactivate();
            }

            private model: Model;
            private refModels: Array<Model>;
            private beforeModels: Array<Model>;
            private afterModels: Array<Model>;
        }


        //
        export class Machine {
            constructor(screen: Screen.ScreenController) {
                this.screen = screen; // TO data binding... (nullable)
            }

            public undo() {
                if (this.currentStep < 0 || this.history.length == 0) return;

                this.history[this.currentStep].undo();
                this.currentStep--;

                this.side = 0;
                this.clamp();

                this.updateUI();
            }

            public redo() {
                if (this.currentStep >= this.history.length) return;

                this.history[this.currentStep].redo();
                this.currentStep++;

                this.side = 1;  // redo side
                this.clamp();

                this.updateUI();
            }

            public didAction(act: Action) {
                if ( !this.reachedTop ) {
                    if ( this.side == 0 ) {
                        var a = this.currentStep == 0 ? 0 : 1;

                        var deleteFrom = this.currentStep + a;
                        this.history.splice(deleteFrom, this.history.length-deleteFrom);

                        this.currentStep++;

                    } else {
                        var deleteFrom = this.currentStep;
                        this.history.splice(deleteFrom, this.history.length-deleteFrom);
                    }

                } else {
                    this.currentStep++;
                }
                this.history.push(act);

                this.clamp();
                this.reachedBottom = false;
                this.reachedTop = true;
                this.side = 1;  // redo side

                this.updateUI();
            }

            private updateUI() {
                if (this.screen) {
                    this.screen.changeUIStatus('undo', (dom: HTMLElement) => {
                        dom.disabled = this.reachedBottom;
                    });

                    this.screen.changeUIStatus('redo', (dom: HTMLElement) => {
                        dom.disabled = this.reachedTop;
                    });
                }
            }

            private clamp() {
                this.reachedBottom = false;
                this.reachedTop = false;

                if (this.currentStep < 0) {
                    this.currentStep = 0;
                    this.reachedBottom = true;

                } else if (this.currentStep >= this.history.length) {
                    this.currentStep = this.history.length - 1;
                    this.reachedTop = true;
                }
            }


            private history: Array<Action> = [];
            private currentStep = -1;

            private screen: Screen.ScreenController;

            private side = 1;
            private reachedBottom = true;
            private reachedTop = true;
        }

    }
}