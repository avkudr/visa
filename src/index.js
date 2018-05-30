const ipc    = require('electron').ipcRenderer; 
const remote = require('electron').remote;
const fs     = require('fs');

const Scene3D = require('./scene3d.js').Scene3D;
var scene3D = new Scene3D(document.getElementById('container'));

const MainController = require('./controllers/main_controller.js').MainController;
var mainController = new MainController();

// =============================================================================
// 
// =============================================================================

function appRootDir() { return remote.getGlobal("appRootDir"); }
function appLibsDir() { return remote.getGlobal("appLibsDir"); }
function appModelsDir() { return remote.getGlobal("appModelsDir"); }

var model;
var modelFileName = 'default_model.js';

function btnStartServerClicked() {
    var port = parseInt(document.getElementById("port").value,10);
    var host = document.getElementById("host").value;
    ipc.send('to-server', ['start-server',port,host]);
}

function btnLoadModelClicked() {
    loadModelFileDialog();
}

function btnReloadModelClicked() {
    loadModelFile(modelFileName);
    //viewer3D.clearScene();
}

// Received command 'start-server' from one of the renderer processes
ipc.on('command', function(event, arg) {
    //console.log(model);
    var response = mainController.handleMsg(arg);
    ipc.send('to-server', ['send-message',response]);
});

function loadModelFileDialog(){
    remote.dialog.showOpenDialog(
        {
            title: 'Load simulator model...',
            defaultPath: './models/',
            filters: [
              {name: 'Simulator model', extensions: ['json']}
            //   {name: 'All Files', extensions: ['*']}
            ]
        },(fileNames) => {
        // fileNames is an array that contains all the selected
        if(fileNames === undefined){
            console.log("No file selected");
            return;
        }
    
        loadModelFile(fileNames[0]);
    });
}

function loadModelFile(filename){
    
    document.getElementById('loading').style.visibility = 'visible';

    modelFileName = filename;
    //console.log('Loading the model: ' + modelFileName);
    scene3D.loadModel(filename);
    
    //wait until the model is fully loaded.
    mainController.init(scene3D);

    // add gui
    while ( document.getElementById('gui') != undefined){ //in case if there are more than one
        document.getElementById('gui').remove();
    }
    document.getElementById('container').appendChild(mainController.gui.domElement);

    // add camera views
    let cameraViewsDivs = document.getElementsByClassName('camera-div');
    for (let div of cameraViewsDivs){
        div.remove();
    }

    if (scene3D.cameras.length > 1) console.warn('TODO: You cannot have more than one external camera... yet');
    for (let camera of scene3D.cameras){
        var elem = document.createElement('div');
        elem.classList.add('camera-div');

        document.getElementById('container').appendChild(elem);
        elem.style.width = camera.width;
        elem.style.height = camera.height;
        elem.style.position = 'absolute';
        elem.style.bottom = '5px';
        elem.style.left = '5px';
        elem.appendChild(camera.renderer.domElement);

        camera.renderer.setPixelRatio(elem.devicePixelRatio);
    }
    document.getElementById('loading').style.visibility = 'hidden';

    console.warn('TODO: Global params in JSON');
    console.warn('TODO: Parse relative-TO field...');
}

btnStartServerClicked();
loadModelFile(appRootDir() + '/models/test_kukaiiwa.json');