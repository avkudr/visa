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
            
            this.robotMove(qStart,qEnd);
            return 'OK';
        }
        case 'ADDJOINTPOS':{
            if ( args.length != 6) return 'ERROR:' + cmd + ': wrong number of arguments';
            let qStart = this.robot.getJointPos();
            let qEnd = qStart.map(function (num, idx) { return num + args[idx]; }); 
            
            this.robotMove(qStart,qEnd);
            return 'OK';
        }
        case 'HOMING':{
            let qStart = this.robot.getJointPos();
            this.robotMove(qStart,[0,0,0,0,0,0]);
            return 'OK';
        }
        case 'SETJOINTVEL':{
            if ( args.length != 6) return 'ERROR:' + cmd + ': wrong number of arguments';
            this.robotMoveVel(args);             
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
var jointMaxSpeedT = 0.005; //m/s -> for translation joints
var jointMaxSpeedR = 5.0 / 180.0 * Math.PI; //rad/s -> for rotation joints
var nbIter;
var timer;
var qCurrent;
var qIterations;

/**
 * This function moves the robot from `qStart` to `qEnd`. 
 * It uses velocity control for `n` iterations to achieve desired position.
 * All joints are synchronized
 * ? currently, only square profile is implemented -> may be trapezoidal ?
 * @param {number[]} qStart - starting joint values
 * @param {number[]} qEnd   - joint values after the motion
 */
MsgHandlerCTR.prototype.robotMove = function(qStart,qEnd){ 
    let qDiff = qStart.map(function (num, idx) { return qEnd[idx] - qStart[idx]; }); 

    // how much iterations is needed to achieve qEnd with given samlpling time and maximal velocity
    qIterations = qDiff.map(function (num, idx) { return qDiff[idx]/samplingTime; }); 
    qIterations[0] = qIterations[0] / jointMaxSpeedR;
    qIterations[1] = qIterations[1] / jointMaxSpeedR;
    qIterations[2] = qIterations[2] / jointMaxSpeedR;
    qIterations[3] = qIterations[3] / jointMaxSpeedT;
    qIterations[4] = qIterations[4] / jointMaxSpeedT;
    qIterations[5] = qIterations[5] / jointMaxSpeedT;

    let tempArray = qIterations.map(function (num, idx) { return Math.abs(qIterations[idx]); }); 
    let nbIterFloat = Math.max.apply(Math, tempArray);
    nbIter = Math.floor(nbIterFloat); //nbIter must be integer

    // as nbIterFloat may not be interger, all values are multiplied by a factor to make in integer and
    // therefore, adapt the velocities for other joints
    let factor = nbIter / nbIterFloat;
    qIterations = qIterations.map(function (num, idx) { return qIterations[idx] * factor; });

    let jointVelMax = [jointMaxSpeedR,jointMaxSpeedR,jointMaxSpeedR,jointMaxSpeedT,jointMaxSpeedT,jointMaxSpeedT];
    jointVelMax = jointVelMax.map(function (num, idx) { return jointVelMax[idx] * factor; });
    
    //calculate velocities to synchronize all joints
    let jointVel = new Array(6);
    for (let i = 0; i < jointVel.length; i++){
        if ( qIterations[i] == 0) jointVel[i] = 0;
        else{
            if ( Math.round(qIterations[i]) == nbIter) jointVel[i] = jointVelMax[i];
            else{
                jointVel[i] = jointVelMax[i] / nbIter * Math.round(qIterations[i]);
            }
        }
    }

    // thus, all joint will move for nbIter iterations with jointVel velocities
    this.robotMoveVel(jointVel,nbIter);
} 

/**
 * This function actually moves the robot with velocity vector `velocitiesArray`. 
 * It is called at a `samplingTime` frequency if the motion was requested.
 * The number of calls is equal to
 * - `Infinity` in velocity control,
 * - or `n` in position control; `n` is calculated automatically
 * @param {number[]} velocitiesArray - joint velocities
 */
MsgHandlerCTR.prototype.moveStep = function(velocitiesArray){
    let q = qCurrent;
    for(let i=0;i<qCurrent.length;i++){
        q[i] += velocitiesArray[i]*samplingTime;
    }

    if (this.robot.setJointPos(q) == 'ERROR') { // ? refactor 
        clearInterval(timer); // joint limit acheived -> stop all motion
        nbIter = 0;
    }
    else qCurrent = q; // robot configuration changed

    if (nbIter == undefined) nbIter = 0;
    nbIter--;
    if (nbIter <= 0) clearInterval(timer);
}

/**
 * Move the robot with velocity vector `velocitiesArray` for `nbIter` iterations
 * @param {number[]} velocitiesArray - joint velocities
 * @param {number} nbIter - number of iterations
 */
MsgHandlerCTR.prototype.robotMoveVel = function(velocitiesArray, nbIter){

    function isZero(currentValue) {
        return currentValue == 0;
    }

    if (nbIter == undefined) nbIter = Infinity;
    console.log(nbIter);
    qCurrent = this.robot.getJointPos();
    isAllZeroVelocities = velocitiesArray.every(isZero);
    
    clearInterval(timer);
    if (!isAllZeroVelocities){
        var self = this;
        timer = setInterval( function(){self.moveStep(velocitiesArray);}, samplingTime * 1000);
    }   
}