declare module PoseEditor {
    // incomplete...
    export class SkeletonHelper extends THREE.Line {
        constructor(mesh: THREE.Mesh);

        update(): void;
    }
}