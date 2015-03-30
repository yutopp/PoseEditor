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
                if (this.currentStep == 0) return;

                this.currentStep--;
                this.history[this.currentStep].undo();
            }

            public redo() {
                if (this.currentStep >= this.maxStep) return;

                this.history[this.currentStep].redo();
                this.currentStep++;
            }

            public didAction(act: Action) {
                if (this.currentStep < this.maxStep) {
                    // remove all action to redo
                    this.history.splice(
                        this.currentStep,
                        this.history.length-this.currentStep
                    );

                    this.maxStep = this.currentStep;
                }

                this.history.push(act);
                this.maxStep++;
                this.currentStep++;
            }

            private history: Array<Action> = [];
            private currentStep = 0;
            private maxStep = 0;
        }

    }
}