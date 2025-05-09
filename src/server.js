const dgram = require('dgram');
const net   = require('net');
const ipc   = require('electron').ipcRenderer; 


let server;
let serverStarted = false;
let serverHost;

var socketType;
var client = [];
var socket = [];

let port;

// Received command 'start-server' from one of the renderer processes
ipc.on('start-server', function(event, arg) {

    socketType = arg[0];
    port = arg[1];
    host = arg[2];

    logToMain('Starting a ' + socketType + ' server on ' + host + ':' + port);
    alertToMain({
        title: "Good job!",
        text: "Starting a " + socketType + ' server on ' + host + ':' + port,
        icon: "success",
        timer: 3000
    });


    if (server){
        if (server.close  ) server.close();
        if (server.destroy) server.destroy();
    }

    switch(socketType){
        case "UDP": startServerUDP(port,host); break;
        case "TCP": startServerTCP(port,host); break;
        default: break;
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
        if ( socketType == "UDP"){
            server.send(prefix + "\n",port,host,function(error){sendMessageErrorCallback(error)});
            server.send(message,port,host,function(error){sendMessageErrorCallback(error)});
            server.send("\n",port,host,function(error){sendMessageErrorCallback(error)}); 
        }else{
            socket.write(prefix + "\n");
            socket.write(message);
            socket.write("\n"); 
        }
    }
    else if ( isImage(message) ){
        var prefix = "PACKAGE_LENGTH:" + message.toString().length;    
        var complete = new Array(500 - prefix.length).join( '_' );
        prefix += complete;
        if ( socketType == "UDP"){
            server.send(prefix + "\n",port,host,function(error){sendMessageErrorCallback(error)});
            server.send(message + "\n",port,host,function(error){sendMessageErrorCallback(error)});
        } else {
            socket.write(prefix + "\n");
            socket.write(message + "\n");
        }
    }else if (message.toString().length < 500){
        var complete = new Array(500 - message.toString().length).join( '_' );
        message = message + '' + complete;
        if ( socketType == "UDP"){
            server.send(message + "\n",port,host,function(error){sendMessageErrorCallback(error)});
        }else{
            socket.write(message + "\n");
        }
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

function startServerUDP(port,host){
    if (!serverStarted){
        server = dgram.createSocket('udp4');
        server.on('listening', function () { 
            console.log("Server started");
            serverStarted = true;
        });
        server.on('message', receiveMessage);
        server.on('error', () => {
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

function startServerTCP(port,host){

    server = net.createServer();

    server.on('connection', function(sock) {   
        logToMain('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
        // other stuff is the same from here
        client.port = sock.remotePort;
        client.host = sock.remoteAddress; 
        socket = sock;
        // Add a 'data' event handler to this instance of socket
        sock.on('data', function(data) {
            receiveMessage(data);
        });
    });
           
    // Add a 'close' event handler to this instance of socket
    server.on('close', function(data) {
        console.log('CLOSED: ' + server.remoteAddress +' '+ server.remotePort);
    });       

    server.listen(port, host);
}

function logToMain(message){
    ipc.send('send-to-log',message);
}

function alertToMain(message){
    ipc.send('alert',message);
}

function receiveMessage (message, remote) {
    
    message = message.toString('utf8');
    message = message.replace(/(\r\n|\n|\r)/gm,"");   
    //logToMain('Message received from ' + serverHost + ':' + remote.port + ' (' + message + ')');
    //alert('Message received from ' + serverHost + ':' + remote.port + ' (' + message + ')');
    
    if (socketType == "UDP"){
        client.port = remote.port;
        client.host = serverHost;   
    }

    var msgArray = message.toString('utf8').split(",");

    logToMain(msgArray);

    var cmd = msgArray[0];
 
    let q = new Array( msgArray.length - 1 );
    for(var i = 0; i < q.length; i++){
        q[i] = parseFloat(msgArray[i+1],10);
    }

    ipc.send('cmd-received',[cmd,q]);
}