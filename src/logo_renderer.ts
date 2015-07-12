/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="etc.ts"/>

module PoseEditor {
    export class LogoRenderer {
        constructor(private screen: Screen.ScreenController, private logoConfig: LogoConfig) {
            this.scene = new THREE.Scene();
            // X: left -> right
            // Y: Bottom -> Top
            this.camera = new THREE.OrthographicCamera(-screen.width/2, screen.width/2, screen.height/2, -screen.height/2, 1, 100);
            this.camera.position.set(0, 0, 10);

            var texture = THREE.ImageUtils.loadTexture(logoConfig.path);
            var material = new THREE.SpriteMaterial({
                map: texture,
                color: 0xffffff,
            });

            this.sprite = new THREE.Sprite(material);

            this.setSpriteSize();
            this.setSpritePosition();

            this.scene.add(this.sprite);
        }

        private setSpriteSize() {
            this.width = ((): number => {
                if (typeof this.logoConfig.width === 'string') {
                    return this.toPercent(<string>this.logoConfig.width) * this.screen.width;

                } else if (typeof this.logoConfig.width === 'number') {
                    return <number>this.logoConfig.width;

                } else {
                    console.error("");
                    return null;
                }
            })();
            this.widthRatio = this.logoConfig.rawWidth / this.screen.width;
            this.width *= this.widthRatio;

            this.height = ((): number => {
                if (typeof this.logoConfig.height === 'string') {
                    return this.toPercent(<string>this.logoConfig.height) * this.screen.height;

                } else if (typeof this.logoConfig.height === 'number') {
                    return <number>this.logoConfig.height;

                } else {
                    console.error("");
                    return null;
                }
            })();
            this.heightRatio = this.logoConfig.rawHeight / this.screen.height;
            this.height *= this.heightRatio;

            this.offsetX = ( this.screen.width - this.width ) / 2.0;
            this.offsetY = ( this.screen.height - this.height ) / 2.0;

            this.sprite.scale.set(this.width, this.height, 1);
        }

        private setSpritePosition() {
            switch(this.logoConfig.position) {
            case LogoPosition.LeftBottom:
                var lpos = this.getLeftPosition(this.logoConfig.left);
                var bpos = this.getBottomPosition(this.logoConfig.bottom);

                this.sprite.position.set(lpos, bpos, 1);

                break;

            default:
                break;
            }
        }

        private getLeftPosition(s: string|number) {
            if (typeof s === 'string') {
                return (this.toPercent(s) * this.width) - this.offsetX;

            } else if (typeof s === 'number') {
                return s - this.offsetX;

            } else {
                console.error("");
                return null;
            }
        }

        // NOTE: direction of Y asix is inversed
        private getBottomPosition(s: string|number) {
            if (typeof s === 'string') {
                return (this.toPercent(s) * this.height) - this.offsetY;

            } else if (typeof s === 'number') {
                return s - this.offsetY;

            } else {
                console.error("");
                return null;
            }
        }

        private toPercent(s: string) {
            return parseFloat(s) / 100.0;
        }

        public onResize() {
            this.camera.left = -this.screen.width/2;
            this.camera.right = this.screen.width/2;
            this.camera.top = this.screen.height/2;
            this.camera.bottom = -this.screen.height/2;
            this.camera.updateProjectionMatrix();

            this.setSpriteSize();
            this.setSpritePosition();
        }

        public render(renderer: THREE.WebGLRenderer) {
            if (this.visible) {
                renderer.render(this.scene, this.camera);
            }
        }

        //
        private scene: THREE.Scene;
        private camera: THREE.OrthographicCamera;

        //
        private width: number;
        private height: number;

        private widthRatio: number;
        private heightRatio: number;

        private offsetX: number;
        private offsetY: number;

        //
        private sprite: THREE.Sprite;

        public visible = true;//false;
    }
}
