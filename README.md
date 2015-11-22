# Pose Editor

(under construction...)

## How to use
```
bower install poseeditor
```

Please include this file.
```
#{bower_components}/poseeditor/build/poseeditor.js
```
or
```
#{bower_components}/poseeditor/build/poseeditor.min.js
```
For detail to `index.html`.

## Development

### Requirement
+ bower
+ gulp
+ tsd (TypeScript Definition manager)
+ tsc >= 1.6 (TypeScript Compiler)

### Setup
```
bower install
tsd update
npm install
gulp watch
./s.sh  # start server
```
Then, access `http://localhost:30000/`!


## License
Pose Editor is licensed under the MIT License.

--

Files under `ext` directory(TransformControls.js, OrbitControls.js) are copied from examples of [Three.js](https://github.com/mrdoob/three.js).

These files are licensed under the [MIT license](https://raw.githubusercontent.com/mrdoob/three.js/master/LICENSE).
