const $      = require('jquery');
const ipc    = require('electron').ipcRenderer; 
const remote = require('electron').remote;
const fs     = require('fs');

var model;
var modelFileName = 'default_model.js';

$("#btn-start-server").click(function() {
    var port = parseInt($("#port").val(),10);
    var host = $("#host").val();

    ipc.send('to-server', ['start-server',port,host]);
});

$("#btn-load-model").click(function() {
    loadModelFileDialog();
});

// Received command 'start-server' from one of the renderer processes
ipc.on('command', function(event, arg) {
    //console.log(model);
    model.updateModel(arg);
});

function loadModelFileDialog(){
    remote.dialog.showOpenDialog(
        {
            title: 'Load simulator model...',
            defaultPath: './models/',
            filters: [
              {name: 'Simulator model', extensions: ['js','json']},
              {name: 'All Files', extensions: ['*']}
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
    $("#container").html("");
    try{
        delete require.cache[require.resolve(modelFileName)];
    } catch(err){}
    
    modelFileName = filename;
    model = require(filename);
    console.log(require.cache);
}


$("#btn-start-server").click();
loadModelFile('./models/ctr/main.js');
//loadModelFile('./models/demo_model.js');