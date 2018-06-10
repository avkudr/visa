const path = require("path");
const {SerialRobot} = require(path.resolve(__dirname,"./../SerialRobot.js"));

class _ExampleSerialRobot extends SerialRobot{
    constructor(){
        super();
    }
}

exports._ExampleSerialRobot = _ExampleSerialRobot;