const net = require('net');
const ipc  = require('electron').ipcRenderer; 

let server;
var client = [];
var socket = [];
let serverStarted = false;
let serverHost;

let port;

// Received command 'start-server' from one of the renderer processes
ipc.on('start-server', function(event, arg) {

    server = net.createServer();

    server.on('connection', function(sock) {   
        logToMain('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
        // other stuff is the same from here
        client.port = sock.remotePort;
        client.host = sock.remoteAddress; 
        socket = sock;
        // Add a 'data' event handler to this instance of socket
        sock.on('data', function(msg) {
            receiveMessage(msg);
        });
    });
           
    // Add a 'close' event handler to this instance of socket
    server.on('close', function(data) {
        console.log('CLOSED: ' + server.remoteAddress +' '+ server.remotePort);
    });       

    server.listen(arg[0], arg[1]);
});

ipc.on('send-message', function(event, arg) {
    logToMain('Trying to send a message to ' + client.host + ':' + client.port);
    sendMessage(client.port, client.host, arg);
});

function isImage(message){
    let imgPrefix = 'data:image';
    return message.toString().startsWith(imgPrefix);
}

function sendMessage(port,host,message){
    if ( isImage(message) ){
        var prefix = "PACKAGE_LENGTH:" + message.toString().length;    
        var complete = new Array(500 - prefix.length).join( '_' );
        prefix += complete;
        socket.write(prefix + "\n");    
    }else{
        if (message.toString().length < 500){
            var complete = new Array(500 - message.toString().length).join( '_' );
            message = message + '' + complete;
        }
    }    
    socket.write(message + "\n");
}

function startServer(port,host){
    if (!serverStarted){
        server.listen(port, host);
        server.on('listening', function () { 
            console.log("Server started");
            serverStarted = true;
        });
        server.on('data', receiveMessage);
        server.on('error', (err) => {
            alert('Server error:\n${err.stack}\nTry to restart the server');
            server.close();
        });
        serverHost = host;
    }else{
        serverStarted = false;
        server.close();
    }
}

function logToMain(message){
    ipc.send('send-to-log',message);
}

function receiveMessage (message) {
    // remote - who sended the message
    
    let temp = 222;
    
    message = message.toString('utf8');
    message = message.replace(/(\r\n|\n|\r)/gm,"");   
    logToMain('Message received from ' + client.host + ':' + client.port + ' (' + message + ')');
    
    var msgArray = message.toString('utf8').split(",");
    var cmd = msgArray[0];

    let q = new Array( msgArray.length - 1 );
    for(var i = 0; i < q.length; i++){
        q[i] = parseFloat(msgArray[i+1],10);
    }

    ipc.send('cmd-received',[cmd,q]);

    // if (isCmdLegal(cmd))  ipc.send('cmd-received',[cmd,q]);
    // else sendMessage(client.port,client.host,"Unknown command");
    //else                  do something;
}

//
// ─── MESSAGE HANDLING ───────────────────────────────────────────────────────────
// 

// const knownCmds = [
//     'TYPEJOG', //choose movement type: 10-joint,11-current_tool,12-current_frame
//     'SETPOS',
//     'ADDPOS',
// ]

// function isCmdLegal(cmd,q = []){
//     //check if the command is known
//     return knownCmds.includes(cmd);
// }
