'use strict'

var gulp = require('gulp');
var shell = require('gulp-shell');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var plumber = require('gulp-plumber');
var runSequence = require('run-sequence');


gulp.task('build-css', function() {
  gulp
  .src('./scss/*.scss')
  .pipe(sass({
    style : 'compressed'
  }).on('error', sass.logError))
  .pipe(gulp.dest('./styles/'));
});

gulp.task('build-ts', function() {
  runSequence('run-tsc', 'complete-js');
});

gulp.task('complete-js', function() {
  runSequence('combine', 'minify');
});

gulp.task('run-tsc', shell.task([
  'tsc -p .'
]));

gulp.task('combine', function() {
  return gulp.src(['./build/poseeditor.unit.js', './ext/OrbitControls.js', './ext/TransformControls.js', './ext/SkeletonHelper.js'])
         .pipe(concat('poseeditor.js'))
         .pipe(gulp.dest('./build/'));
});

gulp.task('minify', shell.task([
  'uglifyjs build/poseeditor.js -o build/poseeditor.min.js --in-source-map build/poseeditor.unit.js.map --source-map build/poseeditor.min.js.map'
]));


gulp.task('watch', function() {
  gulp.watch('./src/*.ts', ['build-ts']);
  gulp.watch('./ext/*.js', ['complete-js']);
  gulp.watch('./ext/*.d.ts', ['complete-js']);
  gulp.watch('./scss/*.scss', ['build-css']);
});

gulp.task('build', ['build-css', 'build-ts'], function() {});

gulp.task('default', ['watch', 'build-css', 'build-ts'], function() {});
