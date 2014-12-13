(function(d, s) {
  if ( window.poseEditorE ) {
    return;
  }

  var load_scene = function( id, json, model_table, sprite_paths, config ) {
    console.log("load", id);
    if ( !model_table ) {
      model_table = {
        "sport_man": {
          model_path: "http://poseeditor.levelop.org/bower_components/poseeditor/models/model/model.js",
          texture_dir: "http://poseeditor.levelop.org/bower_components/poseeditor/models/model/",
          ik_stop_joints: [32, 13, 1, 5, 9, 50, 12, 31, 22, 28, 25, 16, 19, 47, 41, 44, 38, 35]
        }
      };
    }

    if ( !sprite_paths ) {
      sprite_paths = {
        normal: "http://poseeditor.levelop.org/bower_components/poseeditor/images/marker.png",
        special: "http://poseeditor.levelop.org/bower_components/poseeditor/images/square.png"
      };
    }

    if ( !config ) {
      config = new PoseEditor.Config();
      config.enableBackgroundAlpha = true;
      config.backgroundColorHex = 0x777777;
      config.backgroundAlpha = 1.0;
      config.loadingImagePath = "http://poseeditor.levelop.org/bower_components/poseeditor/images/loading.gif";
    }

    //
    var editor = new PoseEditor.Editor(
      id,
      model_table,
      sprite_paths,
      config
    );
    editor.loadSceneDataFromString(json);
  };

  var load_all = function() {
    while( window.poseEditorE.queue.length > 0 ) {
      console.log("while")
      var obj = window.poseEditorE.queue.shift();

      var id = obj.id;
      var json = obj.json;
      var model_table = obj.model_table;
      var sprite_paths = obj.sprite_paths;
      var config = obj.config;

      load_scene( id, json, model_table, sprite_paths, config );
    }
  };

  var queue_scene = function( id, json, model_table, sprite_paths, config ) {
    console.log("queue", id);
    window.poseEditorE.queue.push({
      id: id,
      json: json,
      model_table: model_table,
      sprite_paths: sprite_paths,
      config: config
    });

    if ( window.poseEditorE.isLoaded ) {
      load_all();
    }
  };

  console.log("po");

  // global var
  window.poseEditorE = {
    isLoaded: false,
    queueScene: queue_scene,
    queue: []
  };

  // load libraries
  var script = d.getElementsByTagName(s)[0];

  var load_poseeditor = (function() {
                           var js = d.createElement(s);
                           js.src= "http://poseeditor.levelop.org/bower_components/poseeditor/build/poseeditor.js";
                           js.onload = function() {
                             window.poseEditorE.isLoaded = true;
                             load_all();
                           };
                           script.parentNode.insertBefore(js, script);
                         });

  var load_oc = (function() {
                   var js = d.createElement(s);
                   js.src= "http://poseeditor.levelop.org/bower_components/poseeditor/ext/OrbitControls.js";
                   js.onload = load_poseeditor;
                   script.parentNode.insertBefore(js, script);
                 });

  var load_tfc = (function() {
                    var js = d.createElement(s);
                    js.src= "http://poseeditor.levelop.org/bower_components/poseeditor/ext/TransformControls.js";
                    js.onload = load_oc;
                    script.parentNode.insertBefore(js, script);
                  });

  var three_js = d.createElement(s);
  three_js.src = "http://poseeditor.levelop.org/bower_components/three.js/three.min.js";
  three_js.onload = load_tfc;
  script.parentNode.insertBefore(three_js, script);

})(document, "script");