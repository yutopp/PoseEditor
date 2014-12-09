declare module THREE {
    // incomplete...
    export class OrbitControls extends THREE.Object3D {
        constructor(camera: THREE.Camera, dom: HTMLCanvasElement);
        update(): void;
        reset(): void;

        damping: number;
        enabled: boolean;
    }
}