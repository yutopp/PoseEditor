var editor = null;

function downloadImage() {
  // basic example
  if ( editor != null ) {
    var a = document.createElement("a");
    a.download = name;
    a.title = "download snapshot";

    var radio = document.getElementsByName("format");
    var format = "";
    for(var i=0; i<radio.length; i++) {
      if (radio[i].checked) {
        format = radio[i].value
        break;
      }
    }

    a.href = editor.toDataUrl(format);
    a.click();

    delete a;
  }
}

function loadSceneDataFromEncodedData(json_string) {
  // basic example
  if ( editor != null ) {
    editor.loadSceneDataFromString(json_string);
  }
}

function toggleMarker() {
  // basic example
  if ( editor != null ) {
    editor.toggleMarker();
  }
}

function changeBGColorAndAlpha() {
  if ( editor != null ) {
    var color_dom = document.getElementById("bg_color");
    var alpha_dom = document.getElementById("bg_alpha");

    editor.setClearColor(parseInt(color_dom.value, 16), parseFloat(alpha_dom.value));
  }
}

function shareScene() {
  var address = 'http://yutopp.github.io/PoseEditor/';
  if ( editor != null ) {
    var target = address + '#' + encodeURIComponent(JSON.stringify(editor.getSceneInfo()));

    window.open("https://twitter.com/share?url=" + encodeURIComponent(target) + "&text=PoseEditor");
  }
}

function handleSceneFiles(files) {
  if ( files.length != 1 ) {
    return false;
  }
  var file = files[0];

  var reader = new FileReader();
  reader.onload = (function(e) {
                     loadSceneDataFromEncodedData(e.target.result);
                     console.log("Scene loaded.");
                   });
  reader.readAsText(file);

  return true;
}

$(function() {
  var config = new PoseEditor.Config();
  config.enableBackgroundAlpha = true;
  config.backgroundColorHex = 0x777777;
  config.backgroundAlpha = 1.0;

  editor = new PoseEditor.Editor(
    "for_pose",
    "bower_components/poseeditor/models/model/model.js",
    "bower_components/poseeditor/models/model/",
    "bower_components/poseeditor/images/marker.png",
    config,
    function() {
      if ( editor ) {
        if ( location.hash !== "" ) {
          try {
            var encoded = location.hash.slice(1);
            var json_string = decodeURIComponent(encoded);

            editor.loadSceneDataFromString(json_string);

          } catch(e) {
            console.warn(e);
          }
        }
      } else {
        console.warn("editor was not loaded...");
      }
    });
});
