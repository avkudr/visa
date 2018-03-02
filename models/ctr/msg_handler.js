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

    switch(cmd) {
        case 'SETJOINTPOS':{             
            if ( args.length != 6) return 'ERROR:' + cmd + ': wrong number of arguments';
            let qStart = this.robot.getJointPos();
            let qEnd = args; 
            
            this.animateRobotMotion(qStart,qEnd);
            return 'OK';
        }
        case 'ADDJOINTPOS':{
            if ( args.length != 6) return 'ERROR:' + cmd + ': wrong number of arguments';
            let qStart = this.robot.getJointPos();
            let qEnd = qStart.map(function (num, idx) { return num + args[idx]; }); 
            
            this.animateRobotMotion(qStart,qEnd);
            return 'OK';
        }
        case 'HOMING':{
            let qStart = this.robot.getJointPos();
            this.animateRobotMotion(qStart,[0,0,0,0,0,0]);
            return 'OK';
        }
        case 'SETJOINTVEL':{
            if ( args.length != 6) return 'ERROR:' + cmd + ': wrong number of arguments';
            this.moveWithVel(args);             
            return 'OK';
        }
        case 'GETIMAGE':{
            return this.getImage();
        }
        default: 
            return 'ERROR: unknown command';
    }
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

// =============================================================================
// ANIMATION PART
// =============================================================================

var samplingTime = 0.02; //s 
var jointSpeedT = 0.005; //m/s -> for translation joints
var jointSpeedR = 5.0 / 180.0 * Math.PI; //rad/s -> for rotation joints
var nbIter = 0;
var timer;
var qCurrent;
var qIterations;

MsgHandlerCTR.prototype.animate = function(){
    let q = qCurrent;
    for(let i=0;i<qCurrent.length;i++){
        if (qIterations[i] != 0){
            let speed;
            if (i < 3) speed = jointSpeedR;
            else       speed = jointSpeedT;

            q[i] += Math.sign(qIterations[i])*speed*samplingTime;
            qIterations[i] -= Math.sign(qIterations[i]);
        }
    }

    this.robot.setJointPos(q);
    qCurrent = q;
    nbIter--;
    if( nbIter == 0 ) clearInterval(timer);
}

MsgHandlerCTR.prototype.animateRobotMotion = function(qStart,qEnd){ 
    let qDiff = qStart.map(function (num, idx) { return qEnd[idx] - qStart[idx]; }); 
    qIterations = qDiff.map(function (num, idx) { return qDiff[idx]/samplingTime; }); 
    qIterations[0] = qIterations[0] / jointSpeedR;
    qIterations[1] = qIterations[1] / jointSpeedR;
    qIterations[2] = qIterations[2] / jointSpeedR;
    qIterations[3] = qIterations[3] / jointSpeedT;
    qIterations[4] = qIterations[4] / jointSpeedT;
    qIterations[5] = qIterations[5] / jointSpeedT;

    let tempArray = qIterations.map(function (num, idx) { return Math.abs(qIterations[idx]); }); 
    nbIter = Math.max.apply(Math, tempArray);
    nbIter = Math.round(nbIter); //very important
    qCurrent = qStart;
    var self = this;
    clearInterval(timer);
    timer = setInterval( function(){self.animate();}, samplingTime * 1000);
} 

MsgHandlerCTR.prototype.animateVel = function(velocitiesArray){
    let q = qCurrent;
    for(let i=0;i<qCurrent.length;i++){
        q[i] += velocitiesArray[i]*samplingTime;
    }

    if (!this.robot.setJointPos(q));
    qCurrent = q;
}

MsgHandlerCTR.prototype.moveWithVel = function(velocitiesArray){

    function isZero(currentValue) {
        return currentValue == 0;
    }

    qCurrent = this.robot.getJointPos();
    isAllZeroVelocities = velocitiesArray.every(isZero);
    
    clearInterval(timer);
    if (!isAllZeroVelocities){
        var self = this;
        timer = setInterval( function(){self.animateVel(velocitiesArray);}, samplingTime * 1000);
    }   
}