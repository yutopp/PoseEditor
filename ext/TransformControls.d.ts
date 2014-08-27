declare module THREE {
    // incomplete...
    export class TransformControls extends THREE.Object3D {
        constructor(camera: THREE.Camera, dom: HTMLCanvasElement);

        setMode(mode: string): void;
        setSpace(space: string): void;

        update(): void;

        attach(object: THREE.Object3D): void;
        detach(): void;

        space: string;
        axis: string;
    }
}