/// <reference path="time_machine_action.ts"/>

module PoseEditor {
    export module TimeMachine {
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
                        var dels =
                            this.history.splice(deleteFrom, this.history.length-deleteFrom);
                        this.currentStep++;

                        dels.forEach((d) => d.dispose());

                    } else {
                        var deleteFrom = this.currentStep;
                        var dels =
                            this.history.splice(deleteFrom, this.history.length-deleteFrom);
                        dels.forEach((d) => d.dispose());
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