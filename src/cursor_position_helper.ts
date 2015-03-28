/// <reference path="../typings/threejs/three.d.ts"/>

module PoseEditor {
    interface HasTarget {
        target: THREE.Vector3;
    }

    export class CursorPositionHelper {
        constructor(scene: THREE.Scene, camera: THREE.Camera, targeter: HasTarget) {
            this.scene = scene;
            this.camera = camera;
            this.targeter = targeter;

            //
            this.plane = new THREE.Mesh(
                new THREE.PlaneBufferGeometry(2000, 2000, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: 0x0000ff,
                    opacity: 0.4,
                    transparent: true
                })
            );
            this.plane.visible = true;
            this.scene.add(this.plane);

            //
            var sphereGeo = new THREE.SphereGeometry(1, 14, 14);
            var material = new THREE.MeshBasicMaterial({wireframe: true});
            this.targetMesh = new THREE.Mesh(sphereGeo, material);
            this.targetMesh.matrixWorldNeedsUpdate = true;
            //this.targetSphere.visible = false;
            this.scene.add(this.targetMesh);
        }

        public setBeginState(
            startPos: THREE.Vector3
        ) {
            //
            this.targetMesh.position.copy(startPos);

            // set plane
            var c_to_p = this.targeter.target.clone().sub(this.camera.position);
            var c_to_o = startPos.clone().sub(this.camera.position);

            var n_c_to_p = c_to_p.clone().normalize();
            var n_c_to_o = c_to_o.clone().normalize();

            var l = c_to_o.length();
            var len = n_c_to_o.dot(n_c_to_p) * l;

            var tmp_pos = this.camera.position.clone();
            tmp_pos.add(c_to_p.normalize().multiplyScalar(len));
            this.plane.position.copy(tmp_pos);

            this.plane.lookAt(this.camera.position);
        }

        public move(
            worldCursorPos: THREE.Vector3
        ): THREE. Vector3 {
            var raycaster = new THREE.Raycaster(
                this.camera.position,
                worldCursorPos.clone().sub(this.camera.position).normalize()
            );

            // move ik target
            var intersects = raycaster.intersectObject(this.plane);
            if ( intersects.length == 0 ) return;

            var pos = intersects[0].point;
            this.targetMesh.position.copy(pos);

            return pos;
        }

        private scene: THREE.Scene;
        private camera: THREE.Camera;
        private targeter: HasTarget;

        private plane: THREE.Mesh;
        private targetMesh: THREE.Mesh;
    }
}
