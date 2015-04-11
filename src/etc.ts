/// <reference path="../typings/threejs/three.d.ts"/>

module PoseEditor {
    export class Config {
        enableBackgroundAlpha: boolean = false;
        backgroundColorHex: number = 0x777777;
        backgroundAlpha: number = 1.0;
        loadingImagePath: string = null;
        isDebugging: boolean = false;
        theme: string = 'poseeditor-default'
    }

    export class SpritePaths {
        normal: string;
        special: string;
    }

    export class ModelInfo {
        modelPath: string;
        textureDir: string;
        ikDefaultPropagation: boolean;
        ikInversePropagationJoints: Array<number>;
        hiddenJoints: Array<number>;
        presets: {[key: string]: number/*TODO: fix*/}
        boneLimits: {[key: number]: Array<Array<number>>;};
        baseJointId: number;
        initPos: Array<number>;
        initScale: Array<number>;
        markerScale: Array<number>;
    }

    export class CameraConfig {
        position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
        lookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    }

    export function degToRad(deg: number) { return deg * Math.PI / 180.0; }
    export function radToDeg(rad: number) { return rad / Math.PI * 180.0; }
}