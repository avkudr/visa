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

function isImage(message){
    let imgPrefix = 'data:image';
    return message.toString().startsWith(imgPrefix);
}

function sendMessage(port,host,message){
    if (typeof message != "string") {
        var prefix = "PACKAGE_LENGTH:" + message.length;    
        var complete = new Array(500 - prefix.length).join( '_' );
        prefix += complete;
        server.send(prefix + "\n",port,host,function(error){sendMessageErrorCallback(error)});
        server.send(message,port,host,function(error){sendMessageErrorCallback(error)});
        server.send("\n",port,host,function(error){sendMessageErrorCallback(error)}); 
    }
    else if ( isImage(message) ){
        var prefix = "PACKAGE_LENGTH:" + message.toString().length;    
        var complete = new Array(500 - prefix.length).join( '_' );
        prefix += complete;
        server.send(prefix + "\n",port,host,function(error){sendMessageErrorCallback(error)});
        server.send(message + "\n",port,host,function(error){sendMessageErrorCallback(error)});
    }else if (message.toString().length < 500){
        var complete = new Array(500 - message.toString().length).join( '_' );
        message = message + '' + complete;
        server.send(message + "\n",port,host,function(error){sendMessageErrorCallback(error)});
    }    
    
}

/*
function sendMessage(port,host,message){
    let msgLength = message.toString().length;
    logToMain('msgLength: ' + msgLength);
    if (msgLength > 60000){
        logToMain('Trying to split the message into smaller packets');
        msgArray = message.toString().match(/.{1,60000}/g);
        logToMain('Sending big image: ' + msgArray.length + ' packets');
        server.send("PACKAGE_LENGTH:"+ msgArray.length.toString() + "   ",port,host,function(error){sendMessageErrorCallback(error)});
        server.send(msgLength.toString(),port,host,function(error){sendMessageErrorCallback(error)});
        for (let i = 0; i < msgArray.length; i++){
            server.send(msgArray[i],port,host,function(error){sendMessageErrorCallback(error)});
        }
    }else{
        server.send(message,port,host,function(error){sendMessageErrorCallback(error)});
    }
}
*/

function sendMessageErrorCallback(error){
    if(error){
        logToMain('cant send data');
    }else{
        logToMain('data sent');
    }
}


function sendMessageErrorCallback(error){
    if(error){
        logToMain('cant send data');
    }else{
        logToMain('data sent');
    }
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
    message = message.replace(/(\r\n|\n|\r)/gm,"");   
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