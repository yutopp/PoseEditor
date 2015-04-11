/// <reference path="camera_action.ts"/>
/// <reference path="move_action.ts"/>
/// <reference path="bone_action.ts"/>

module PoseEditor {
    export class ActionController {
        public setup(
            editor: Editor,
            trans: THREE.TransformControls,
            ctrls: THREE.OrbitControls,
            dom: HTMLElement
        ) {
            this.editor = editor;
            this.transformCtrl = trans;
            this.controls = ctrls;

            // add camera
            /// | Camera |
            var camAction = new CameraAction(this.editor, this.controls);
            this.currentActions.push(camAction);
            camAction.onActive();

            // setup events hooks
            //
            dom.addEventListener('mousedown', (e) => this.onTapStart(e, false), false);
            dom.addEventListener('touchstart', (e) => this.onTapStart(e, true), false);

            dom.addEventListener('mousemove', (e) => this.onMoving(e, false), false);
            dom.addEventListener('touchmove', (e) => this.onMoving(e, true), false);

            dom.addEventListener('mouseup', (e) => this.onTapEnd(e, false), false);
            dom.addEventListener('mouseleave', (e) => this.onTapEnd(e, true), false);
            dom.addEventListener('touchend', (e) => this.onTapEnd(e, true), false);
            dom.addEventListener('touchcancel', (e) => this.onTapEnd(e, true), false);

            dom.addEventListener('dblclick', (e) => this.onDoubleTap(e, false), false);
        }

        public onModeSelect(mode: Screen.Mode, screen: Screen.ScreenController): void {
            switch(mode) {
            case Screen.Mode.Camera:
                /// | Camera |
                this.destroyActionFrom(1);
                screen.selectModeUI('camera')
                break;

            case Screen.Mode.Move:
                /// | Move   |
                /// | Camera |
                this.makeStandardModeForm(
                    'move',
                    () => new MoveAction(this.editor)
                );
                screen.selectModeUI('move')
                break;

            case Screen.Mode.Bone:
                /// | Bone   |
                /// | Camera |
                this.makeStandardModeForm(
                    'bone_action',
                    () => new BoneAction(this.editor, this.transformCtrl)
                );
                screen.selectModeUI('bone')
                break;

            default:
                console.error('unexpected mode');
            }
        }

        // make standard form likes below
        /// | EXPECTED |
        /// | Camera   |
        private makeStandardModeForm<T extends Action>(actionName: string, factory: () => T) {
            // stack has some actions except for Camera
            if ( this.currentActions.length > 1 ) {
                if ( this.currentActions[1].name() != actionName ) {
                    this.destroyActionFrom(1);

                } else {
                    // if stack of actions is already expected form, so do nothing
                    if ( this.currentActions.length == 2 ) return;

                    // stack has extra actions, so delete them
                    this.destroyActionFrom(2);
                    return;
                }
            }

            // push new action
            var action = factory();
            this.currentActions.push(action);

            action.onActive();
        }

        public execActions(func: <T extends Action>(act: T) => any) {
            for( var i=this.currentActions.length-1; i>=0; --i ) {
                func(this.currentActions[i]);
            }
        }

        private dispatchActions(func: <T extends Action>(act: T, isActive: boolean) => boolean) {
            var i = this.currentActions.length-1;
            for( ; i>=0; --i ) {
                var doNextAction = func(this.currentActions[i], true);
                if (!doNextAction) break;
            }

            --i;
            for( ; i>=0; --i ) {
                func(this.currentActions[i], false);
            }
        }

        private destroyActionFrom(index: number) {
            var rest = this.currentActions.splice(index, this.currentActions.length - index);
            rest.forEach((act: Action) => act.onDestroy());
        }


        private onTapStart(e: any, isTouch: boolean): void {
            e.preventDefault();
            this.dispatchActions(
                (act: Action, a: boolean) => act.onTapStart(e, isTouch, a)
            );
        }

        private onMoving(e: any, isTouch: boolean): void {
            e.preventDefault();
            this.dispatchActions(
                (act: Action, a: boolean) => act.onMoving(e, isTouch, a)
            );
        }

        private onTapEnd(e: any, isTouch: boolean): void {
            e.preventDefault();
            this.dispatchActions(
                (act: Action, a: boolean) => act.onTapEnd(e, isTouch, a)
            );
        }

        private onDoubleTap(e: any, isTouch: boolean): void {
            e.preventDefault();
            this.dispatchActions(
                (act: Action, a: boolean) => act.onDoubleTap(e, isTouch, a)
            );
        }


        /// ==================================================
        /// Stack of Actions (execute from top to bottom)
        /// ↑ top     | ...    | index: n
        ///           | ...    | index: 1
        /// ↓ bottom  | Camera | index: 0
        /// ==================================================
        private currentActions: Array<Action> = [];

        private editor: Editor;
        private transformCtrl: THREE.TransformControls;
        private controls: THREE.OrbitControls;
    }
}