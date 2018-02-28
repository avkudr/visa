const dgram = require('dgram');
const ipc   = require('electron').ipcRenderer; 

let server;
let serverStarted = false;
let serverHost;

// default client
let client = {};

// Received command 'start-server' from one of the renderer processes
ipc.on('start-server', function(event, arg) {
    if (!serverStarted){
        startServer(arg[0],arg[1]);
        let myNotification = new Notification('CTR-SIMU', {
            body: 'Server started on ' + arg[1] + ':' + arg[0]
        })
    }else{
        let myNotification = new Notification('CTR-SIMU', {
            body: 'Server is already active'
        })
    }
});

ipc.on('send-message', function(event, arg) {
    logToMain('Trying to send a message to ' + client.host + ':' + client.port);
    sendMessage(client.port, client.host, arg);
});

function sendMessage(port,host,message){
    server.send(message,port,host,function(error){
        if(error){
            logToMain('cant send data');
        }else{
            logToMain('data sent');
        }
    });
}

function startServer(port,host){
    if (!serverStarted){
        server = dgram.createSocket('udp4');
        server.on('listening', function () { 
            console.log("Server started");
            serverStarted = true;
        });
        server.on('message', receiveMessage);
        server.on('error', (err) => {
            alert('Server error:\n${err.stack}\nTry to restart the server');
            server.close();
        });
        serverHost = host;
        server.bind(port, host);
    }else{
        serverStarted = false;
        server.close();
    }
}

function logToMain(message){
    ipc.send('send-to-log',message);
}

function receiveMessage (message, remote) {
    // remote - who sended the message
    
    let temp = 222;
    
    message = message.toString('utf8');
    logToMain('Message received from ' + serverHost + ':' + remote.port + ' (' + message + ')');
    
    client.port = remote.port;
    client.host = serverHost;   

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