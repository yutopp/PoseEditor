# Pose Editor

## Requirement
+ bower
+ tsd (TypeScript Definition manager)
+ tsc (TypeScript Compiler)
+ ruby(optional)


## Testing

```
bower install
tsd update
tsc --noImplicitAny --out build/poseeditor.js src/*
./s.sh
```
Then, access `http://localhost:30000/`!


## Todo
prepare build tool...


## License
Pose Editor is licensed under the MIT License.

--

Files under `ext` directory(TransformControls.js, OrbitControls.js) are copied from examples of [Three.js](https://github.com/mrdoob/three.js).

These files are licensed under the [MIT license](https://raw.githubusercontent.com/mrdoob/three.js/master/LICENSE).

--

The file `models/body_try2.js` is based on the model that is hosted on [Blenderでモデリング（人）](http://cg.xyamu.net/Blender/entry189.html).

It was converted to Three.js model data by using a Blender Plugin.
