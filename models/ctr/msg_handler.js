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

    console.log(cmd + ":" + args);
    let isGUINeedsUpdate   = false;
    let isRobotNeedsUpdate = false;
    let isWrongParNb       = false;

    switch(cmd) {
        case 'SETJOINTPOS':
        case 'SETJOINTPOSABS':{             
            if ( args.length != 6) return 'ERROR:' + cmd + ': wrong number of arguments';
            let qStart = this.robot.getJointPos();
            let qEnd = args; 
            
            this.robotMove(qStart,qEnd);
            return 'OK';
        }
        case 'SETJOINTPOSREL':{
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
        case 'STOP':{
            console.log('stop robot motion command received');
            this.robotMoveVel([0,0,0,0,0,0]);
            return 'OK';
        }
        case 'GETIMAGE':{
            return this.getImage();
        }
        case 'GETJOINTPOS':{
            return this.robot.getJointPos().toString();
        }
        case 'GETTOOLPOS':{ //returns matrix elements in a column-major order
            let T = this.robot.getToolTransform().toArray().toString();
            return T;
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
	    let img = this.cameraRenderer.domElement.toDataURL();
	    console.log('Image length: ' + img.length);
	    if ( img.length < Infinity){
            	return img;
	    }else{
		return 'Couldnt get image from canvas';    
	    }
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
var jointMaxSpeedT = 0.002; //m/s -> for translation joints
var jointMaxSpeedR = 10.0 / 180.0 * Math.PI; //rad/s -> for rotation joints
var nbIter;
var timer;
var qCurrent;

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
    let qIterations = new Array(6);
    qIterations[0] = qDiff[0] / jointMaxSpeedR / samplingTime ;
    qIterations[1] = qDiff[1] / jointMaxSpeedR / samplingTime ;
    qIterations[2] = qDiff[2] / jointMaxSpeedR / samplingTime ;
    qIterations[3] = qDiff[3] / jointMaxSpeedT / samplingTime ;
    qIterations[4] = qDiff[4] / jointMaxSpeedT / samplingTime ;
    qIterations[5] = qDiff[5] / jointMaxSpeedT / samplingTime ;

    let tempArray = qIterations.map(function (num, idx) { return Math.abs(qIterations[idx]); }); 
    let nbIterFloat = Math.max.apply(Math, tempArray);
    nbIter = Math.ceil(nbIterFloat); //nbIter must be integer

    // as nbIterFloat may not be interger, all values are multiplied by a factor to make in integer and
    // therefore, adapt the velocities for other joints
    let factor = nbIter / nbIterFloat;
    qIterations = qIterations.map(function (num, idx) { return qIterations[idx] * factor; });

    let jointVelMax = [jointMaxSpeedR,jointMaxSpeedR,jointMaxSpeedR,jointMaxSpeedT,jointMaxSpeedT,jointMaxSpeedT];
    jointVelMax = jointVelMax.map(function (num, idx) { return jointVelMax[idx] / factor; });
    
    //calculate velocities to synchronize all joints
    let jointVel = new Array(6);
    for (let i = 0; i < jointVel.length; i++){
        jointVel[i] = jointVelMax[i] / nbIter * qIterations[i];
    }

    // thus, all joint will move for nbIter iterations with jointVel velocities
    console.log("Iterations needed: " + nbIter);
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
MsgHandlerCTR.prototype.moveStep = function(velocitiesArray, nbIter){
    let q = qCurrent;
    for(let i=0;i<qCurrent.length;i++){
        q[i] += velocitiesArray[i]*samplingTime;
    }

    if (this.robot.setJointPos(q) == 'ERROR') { // ? refactor 
        console.warn("One of joints is in limit!");
        clearInterval(timer); // joint limit acheived -> stop all motion
        nbIter = 0;
    }
    else qCurrent = q; // robot configuration changed
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
    qCurrent = this.robot.getJointPos();
    isAllZeroVelocities = velocitiesArray.every(isZero);
    
    clearInterval(timer);
    if (!isAllZeroVelocities){
        var self = this;
        timer = setInterval( function(){
            if (nbIter > 0) {
                self.moveStep(velocitiesArray, nbIter);
                nbIter--;
            } else {
                clearInterval(timer);
            }
        }, samplingTime * 1000);
    }   
}
