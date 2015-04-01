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
            public undo() {
                if (this.currentStep < 0) return;

                if (this.currentStep >= this.history.length) this.currentStep = this.history.length - 1;
                this.history[this.currentStep].undo();
                this.currentStep--;
            }

            public redo() {
                if (this.currentStep >= this.history.length) return;

                if (this.currentStep < 0) this.currentStep = 0;
                this.history[this.currentStep].redo();
                this.currentStep++;
            }

            public didAction(act: Action) {
                if (this.currentStep >= 0 && this.currentStep + 1 < this.history.length) {
                    // remove all action to redo
                    this.history.splice(
                        this.currentStep,
                        this.history.length-this.currentStep
                    );
                }

                this.history.push(act);
                this.currentStep++;
            }

            private history: Array<Action> = [];
            private currentStep = -1;
        }

    }
}