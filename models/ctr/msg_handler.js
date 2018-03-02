const TWEEN = require('tween.js');

/**
 * 
 * @param {A robot you want to control} robot 
 * @param {Object of type THREE.WebGLRenderer} cameraRenderer 
 */
var MsgHandlerCTR = function(robot,cameraRenderer){
    this.robot = robot;
    this.cameraRenderer = cameraRenderer;
}

MsgHandlerCTR.prototype.handle = function(arg){
    const cmd  = arg[0];
    const args = arg[1];

    let isGUINeedsUpdate   = false;
    let isRobotNeedsUpdate = false;
    let isWrongParNb       = false;

    console.log(this.robot);

    if (cmd == 'SETPOS'){ 
        if ( args.length != 6){
            alert('Error -> ' + cmd + ': wrong number of arguments = ' + args.length + ', 6 expected.');
        }
        
        q = this.robot.getJointPos(args);
        var tween = new TWEEN.Tween(q).to(args, 500);
        console.log('START')
        tween.onUpdate(function(){
            console.log('INPROGRESS')
            this.robot.setJointPos(q);
        });
        tween.start();
    }
    if (cmd == 'ADDPOS'){
        if ( args.length != 6){
            alert('Error -> ' + cmd + ': wrong number of arguments = ' + args.length + ', 6 expected.');
        }
        let q = this.robot.getJointPos();
        let sum = q.map(function (num, idx) { return num + args[idx]; }); 
        
        this.robot.setJointPos(sum);
        // This line creates an animation for robot movement
        // Basically, every joint should move with its own speed which can't be done
        // with current TWEEN implementation.
        // So, everything moves with a mean speed of 0.1 mm/s and 0.1 deg/s
        // let temp = 0;
        // for( var i = 0; i < args.length; i++ ) temp += args[i];
        // let avg = temp/args.length;
        
        // let tween = new TWEEN.Tween(q).to(sum, 1000*avg);

        // console.log('START')
        // tween.onUpdate(function(){
        //     console.log('INPROGRESS' + this.robot);
        //     this.robot.setJointPos(q);
        // });
        // tween.start();

        // statusOK = robot.setJointPos(sum);
        // if (statusOK) {
        //     gui.updateDisplay();
        //     robot.updateAll();
        //     updateCameraOnRobot();
        // }
    }
    if (cmd == 'GETIMAGE') return this.getImage();
}

MsgHandlerCTR.prototype.getImage = function () {
    try {
        if (this.cameraRenderer === undefined){ 
            return 'NO IMAGE TO SEND';    
        }else{
            return 'IMAGE:'+this.cameraRenderer.domElement.toDataURL();
        }
    } 
    catch(e) {
        return 'ERROR';    
    }
};

exports.MsgHandlerCTR = MsgHandlerCTR;