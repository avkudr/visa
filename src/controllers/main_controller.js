const dat = require(global.appLibsDir() + '/dat.gui.min.js');

const RobotController  = require('./robot_controller.js').RobotController;
const CameraController = require('./camera_controller.js').CameraController;

var MainController = function(){
    this.handlers = {};
    this.robotIdx = 0;
    this.cameraIdx = 0;

    this.scene3d = {}
    this.gui = {};
}

// MainController.prototype.setRobots = function(robotsArray){
//     this.robots = robotsArray;
//     this.handlers.robots.setRobot(robotsArray[this.robotIdx]);
// }

MainController.prototype.init = function(scene3d){
    this.handlers = {};
    this.scene3d = scene3d;

    this.handlers.robots  = new Array(scene3d.robots.length);
    for (let i = 0; i < scene3d.robots.length; i++){
        this.handlers.robots[i] = new RobotController(scene3d.robots[i]);
    }
    this.handlers.cameras = new Array(scene3d.cameras.length);
    for (let i = 0; i < scene3d.cameras.length; i++){
        this.handlers.cameras[i] = new CameraController(scene3d.cameras[i]);
    }

    this.robotIdx = 0;
    this.cameraIdx = 0;
    
    this.createGUI();
}

MainController.prototype.handleMsg = function(msg){
    let response;

    const cmd  = msg[0];
    const args = msg[1];
    //check if message is destinated to the main handler
    // like SETROBOTIDX
    // like SETCAMERAIDX

    response = this.handlers.robots[this.robotIdx].handle(msg);
    if (response != 'unknown_command') return response;

    response = this.handlers.cameras[this.cameraIdx].handle(msg);
    if (response != 'unknown_command') return response;

    return 'unknown_command';
}

MainController.prototype.createGUI = function(){
    this.gui = new dat.GUI({ autoPlace: false, width: 300 });
    this.gui.domElement.id = 'gui';
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '2px';
    this.gui.domElement.style.right = '2px';

    let nbRobots = this.scene3d.robots.length;
    for (let i = 0; i < nbRobots; i++){
        let f = this.gui.addFolder(i + '. ' + this.scene3d.robots[i].constructor.name);
        let limits = this.scene3d.robots[i].getJointLimits();
        let nbDOFs = this.scene3d.robots[i].getNbDOFs();

        for (let j = 0; j < nbDOFs; j++){
            f.add(this.scene3d.robots[i], 'q'+j)
            .min(limits[j][0])
            .max(limits[j][1])
            .name((this.scene3d.robots[i].jointNames == undefined) ? ('q' + j) : this.scene3d.robots[i].jointNames[j])
            .step(Math.abs(limits[j][1]-limits[j][0])/800.0)
            .onChange(
                function(value){
                    let q = this.scene3d.robots[i].getJointPos();
                    q[j] = value;
                    this.scene3d.robots[i].setJointPos(q);
                }.bind(this).bind(j)
            )
            .listen();
        }

        let self = this;
        let stopBtn = {add:function(){
            self.handlers.robots[i].stop();
        }.bind(i)};
        f.add(stopBtn,'add').name("Stop");
        f.add(this.scene3d.robots[i],'axesVisible').name('Axes visible');

        f.open();
    }

    //cameras
    let nbCams = this.scene3d.cameras.length;
    for (let i = 0; i < nbCams; i++){
        let f = this.gui.addFolder('Camera ' + i);

        let self = this;
        let showHideBtn = {add:function(){
            self.handlers.cameras[i].camera.toggleImageVisibility();
        }.bind(i)};
        let showFrustrumBtn = {add:function(){
            self.handlers.cameras[i].camera.cameraHelper.visible = 
                !self.handlers.cameras[i].camera.cameraHelper.visible;
        }.bind(i)};

        f.add(showHideBtn,'add').name('Show-hide image view');
        f.add(showFrustrumBtn,'add').name('Show-hide frustrum');
        f.open();
    }
}

exports.MainController = MainController;