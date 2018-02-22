const {app, BrowserWindow} = require('electron'); 
const url = require('url');
const path = require('path');  
const ipc = require('electron').ipcMain;

let mainWindow, serverWindow;  

// Serves as the bottom layer of the application. Every new render is connected to this one.
// The communication is organized as follows:
// Everyone talks to the server through
//      ipc.send('to-server', ****command**** );
// This process transmits all messages of such type to the server...

function createWindow() { 
    console.log('===== WELCOME TO CTR-SIMU =====');
    mainWindow = new BrowserWindow({
        width: 1400, 
        height: 600,
        webPreferences: {
            nativeWindowOpen: true
        }
    }) 
    mainWindow.loadURL('file://' + __dirname + '/index.html');
    mainWindow.toggleDevTools();

    mainWindow.on('close', (e) => { app.quit(); });

    serverWindow = new BrowserWindow({show: false}) ;
    serverWindow.loadURL('file://' + __dirname + '/server.html');
}  

ipc.on('to-server', function(event, arg) {
    console.log('Command to server received');
    serverWindow.webContents.send(arg[0],arg.slice(1));
});

ipc.on('cmd-received', function(event, arg) {
    mainWindow.webContents.send('command',arg);
    console.log(arg);
});

ipc.on('send-to-log', function(event, arg) {
    console.log('SERVER LOG: ' + arg);
});


app.on('ready', createWindow) 
