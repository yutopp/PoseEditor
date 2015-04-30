# Pose Editor

(under construction...)

## How to use
```
bower install poseeditor
```

Please include these files.
```
#{bower_components}/poseeditor/build/poseeditor.js
#{bower_components}/poseeditor/ext/OrbitControls.js
#{bower_components}/poseeditor/ext/TransformControls.js
#{bower_components}/poseeditor/styles/poseeditor.css
```
For detail to `index.html`.

## Development

### Requirement
+ bower
+ tsd (TypeScript Definition manager)
+ tsc >= 1.4(TypeScript Compiler)

### Setup
```
bower install
tsd update
./b.sh  # build sources
./s.sh  # start server
./t.sh  # build scss to css with Sass(optional)
```
Then, access `http://localhost:30000/`!


## Todo
prepare build tool...


## License
Pose Editor is licensed under the MIT License.

--

Files under `ext` directory(TransformControls.js, OrbitControls.js) are copied from examples of [Three.js](https://github.com/mrdoob/three.js).

These files are licensed under the [MIT license](https://raw.githubusercontent.com/mrdoob/three.js/master/LICENSE).
