/**
 * 
 * @param {A robot you want to control} robot 
 */
var RobotController = function(robot){
    this.robot = robot;
}

RobotController.prototype.setRobot = function(robot){
    this.robot = robot;
} 

RobotController.prototype.handle = function(arg){
    const cmd  = arg[0];
    const args = arg[1];

    console.log(cmd + ":" + args);
    let isGUINeedsUpdate   = false;
    let isRobotNeedsUpdate = false;
    let isWrongParNb       = false;

    switch(cmd) {
        case 'SETJOINTPOS':
        case 'SETJOINTPOSABS':{             
            if ( args.length != this.robot.getNbDOFs()) return 'ERROR:' + cmd + ': wrong number of arguments';
            let qStart = this.robot.getJointPos();
            let qEnd = args; 
            
            this.robotMove(qStart,qEnd);
            return 'OK';
        }
        case 'SETJOINTPOSREL':{
            if ( args.length != this.robot.getNbDOFs()) return 'ERROR:' + cmd + ': wrong number of arguments';
            let qStart = this.robot.getJointPos();
            let qEnd = qStart.map(function (num, idx) { return num + args[idx]; }); 
            
            this.robotMove(qStart,qEnd);
            return 'OK';
        }
        case 'HOMING':{
            let qStart = this.robot.getJointPos();
            let jointPosZeros = Array.apply(null, Array(robot.getNbDOFs())).map(Number.prototype.valueOf,0);
            this.robotMove(qStart,jointPosZeros);
            return 'OK';
        }
        case 'SETJOINTVEL':{
            if ( args.length != this.robot.getNbDOFs()) return 'ERROR:' + cmd + ': wrong number of arguments';
            this.robotMoveVel(args);             
            return 'OK';
        }
        case 'STOP':{
            console.log('stop robot motion command received');
            let jointVelZeros = Array.apply(null, Array(this.robot.getNbDOFs())).map(Number.prototype.valueOf,0);
            this.robotMoveVel(jointVelZeros);
            return 'OK';
        }
        case 'GETJOINTPOS':{
            return this.robot.getJointPos().toString();
        }
        case 'GETTOOLPOS':{ //returns matrix elements in a column-major order
            let T = this.robot.getToolTransform().toArray().toString();
            return T;
        }
        default: 
            return 'unknown_command';
    }
}

RobotController.prototype.stop = function(){
    let jointVelZeros = Array.apply(null, Array(this.robot.getNbDOFs())).map(Number.prototype.valueOf,0);
    this.robotMoveVel(jointVelZeros);
}

RobotController.prototype.showAxes = function(show){
    //show hide robot axes...
}

exports.RobotController = RobotController;

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
RobotController.prototype.robotMove = function(qStart,qEnd){ 
    let qDiff = qStart.map(function (num, idx) { return qEnd[idx] - qStart[idx]; }); 

    // how much iterations is needed to achieve qEnd with given samlpling time and maximal velocity
    let qIterations = new Array(this.robot.getNbDOFs());
    for (let i = 0; i < this.robot.getNbDOFs(); i++){
        let jointMaxSpeed = (this.robot.jointTypes[i] == 'P') ? jointMaxSpeedT : jointMaxSpeedR;
        qIterations[i] = qDiff[i] / jointMaxSpeed / samplingTime ;
    }        
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
    let jointVel = new Array(this.robot.getNbDOFs());
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
RobotController.prototype.moveStep = function(velocitiesArray, nbIter){
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
RobotController.prototype.robotMoveVel = function(velocitiesArray, nbIter){

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
