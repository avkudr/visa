const {app, BrowserWindow} = require('electron'); 
const url = require('url');
const path = require('path');  
const ipc = require('electron').ipcMain;

let mainWindow, serverWindow; 

global.devMode = (process.argv.indexOf("--dev") > -1);    
global.appRootDir = path.resolve(__dirname);
global.appLibsDir = path.resolve(__dirname + '/3rdparty');
global.appModelsDir = path.resolve(__dirname + '/models');

 

// Serves as the bottom layer of the application. Every new render is connected to this one.
// The communication is organized as follows:
// Everyone talks to the server through
//      ipc.send('to-server', ****command**** );
// This process transmits all messages of such type to the server...

function createWindow() { 
    console.log('===== WELCOME TO VISA: ViSP Simulation App =====');
    mainWindow = new BrowserWindow({
        width: 1400, 
        height: 600,
        webPreferences: {
            nativeWindowOpen: true
        },
        icon: path.join(__dirname, 'icons/png/64x64.png')
    }) 
    mainWindow.maximize();
    mainWindow.loadURL('file://' + __dirname + '/src/index.html');
    if (global.devMode) mainWindow.toggleDevTools();

    mainWindow.on('close', (e) => { app.quit(); });

    serverWindow = new BrowserWindow({show: false}) ;
    serverWindow.loadURL('file://' + __dirname + '/src/server.html');
}  

ipc.on('to-server', function(event, arg) {
    //console.log('Command to server received');
    //console.log(typeof arg.data);
    serverWindow.webContents.send(arg.cmd,arg.data);
});

ipc.on('cmd-received', function(event, arg) {
    mainWindow.webContents.send('command',arg);
});

ipc.on('send-to-log', function(event, arg) {
    //console.log('SERVER LOG: ' + arg);
});


app.on('ready', createWindow) 
