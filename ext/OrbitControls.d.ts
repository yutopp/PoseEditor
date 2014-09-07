declare module THREE {
    // incomplete...
    export class OrbitControls extends THREE.Object3D {
        constructor(camera: THREE.Camera, dom: HTMLCanvasElement);

        damping: number;
    }
}