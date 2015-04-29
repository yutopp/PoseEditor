module PoseEditor {
    export module TimeMachine {
        export class Action {
            public undo() {}
            public redo() {}

            public dispose() {}
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

                this.model.reactivate();
            }

            public redo() {
                this.refModels.splice(0, this.refModels.length);
                this.afterModels.forEach((e) => this.refModels.push(e));  // X(

                this.model.deactivate();
            }

            /*
            public dispose() {
                this.model.deactivate();
            }
            */


            private model: Model;
            private refModels: Array<Model>;
            private beforeModels: Array<Model>;
            private afterModels: Array<Model>;
        }

        //
        export class ChangeModelAppendAction extends Action {
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

                this.model.deactivate();
            }

            public redo() {
                this.refModels.splice(0, this.refModels.length);
                this.afterModels.forEach((e) => this.refModels.push(e));  // X(

                this.model.reactivate();
            }


            private model: Model;
            private refModels: Array<Model>;
            private beforeModels: Array<Model>;
            private afterModels: Array<Model>;
        }

    }
}