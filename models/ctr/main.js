var sceneContainer = document.getElementById("container");
var scene, cameraExt, rendererExt;
var trackballControls;
var camera, renderer;
var robot;
var modelObj;

const dat   = require('dat.gui');
const THREE = require('three');
const TrackballControls = require('three-trackballcontrols');
const MTLLoader = require('three-mtl-loader');
const OBJLoader = require('three-obj-loader');
const TWEEN = require('tween.js');
const ConcentricTubeRobot = require('./rtc.js').ConcentricTubeRobot;

// Your existing code unmodified...
var externalViewCanvas = document.createElement('div');
externalViewCanvas.id = 'ext-view-canvas';
externalViewCanvas.style.position = 'absolute';
externalViewCanvas.style.margin = '0';
externalViewCanvas.style.left = '10px';
externalViewCanvas.style.bottom = '10px';
externalViewCanvas.style.width = '640px';
externalViewCanvas.style.height = '480px';
externalViewCanvas.style.background = 'lightblue';
sceneContainer.appendChild(externalViewCanvas);

// =============================================================================
// GUI SETUP
// =============================================================================

var gui = new dat.GUI({ autoPlace: false });
gui.domElement.style.position = 'absolute';
gui.domElement.style.top = '10px';
gui.domElement.style.right = '10px';
sceneContainer.appendChild(gui.domElement);

var FabricationParams = function () {
    this.length1 = 100;
    this.length2 = 160;
    this.length3 = 220;

    this.curvRadius1 = 0.0;
    this.curvRadius2 = 0.027;
    this.curvRadius3 = 0.0;
};

var DOFs = function () {
    this.translation1 = 0;
    this.translation2 = 0;
    this.translation3 = 0;

    this.rotation1 = 0;
    this.rotation2 = 0;
    this.rotation3 = 0;
}

var pars = new FabricationParams();
var dofs = new DOFs();

var f1 = gui.addFolder('Fabrication parameters');
f1.add(pars, 'length1', 50, 250);
f1.add(pars, 'length2', 50, 250);
f1.add(pars, 'length3', 50, 250);
f1.add(pars, 'curvRadius1', 0, 0.05);
f1.add(pars, 'curvRadius2', 0, 0.05);
f1.add(pars, 'curvRadius3', 0, 0.05);

var f2 = gui.addFolder('Joint values');
f2.add(dofs, 'rotation1', -180, 180);
f2.add(dofs, 'rotation2', -180, 180);
f2.add(dofs, 'rotation3', -180, 180);
f2.add(dofs, 'translation1', -200, 200).step(0.2);
f2.add(dofs, 'translation2', -200, 200).step(0.2);
f2.add(dofs, 'translation3', -200, 200).step(0.2);
f2.open();

//on changing parameters of the first folder f1
for (var i in f1.__controllers) {
    f1.__controllers[i].onChange(function(value) {
        updateScene('fabrication', this);
    });
}
//on changing parameters of the second folder f2
for (var i in f2.__controllers) {
    f2.__controllers[i].onChange(function(value) {
        updateScene('dofs', this);
    });
}

//button for a new window
var obj = { add:function(){ 
    $('#ext-view-canvas').toggle();
}};
gui.add(obj,'add').name("Show-hide camera");

function setGUIMinMax(idx, min, max) {
    var properties = gui.__folders['Joint values'].__controllers[idx];
    var keys = Object.keys(properties.object)
    var value = properties.object[keys[idx]]; 

    if (min == null) min = properties.__min;
    if (max == null) max = properties.__max;
    if (min > max){
        console.error("Min is greater than max in setGUIMinMax");
        return;
    }
    if (value > max) properties.object[keys[idx]] = max;
    if (value < min) properties.object[keys[idx]] = min;
    properties.__min = min;
    properties.__max = max;
    properties.updateDisplay();
}

function updateScene(type, pars) {
    // monitored code goes here  
    if (type == 'fabrication'){
        robot.tubes[0].setLength    (pars.object.length1);
        robot.tubes[0].setCurvature (pars.object.curvRadius1);
        robot.tubes[1].setLength    (pars.object.length2);
        robot.tubes[1].setCurvature (pars.object.curvRadius2);
        robot.tubes[2].setLength    (pars.object.length3);
        robot.tubes[2].setCurvature (pars.object.curvRadius3);
    } else {
        let q = new Array(6);
        let statusOK;
        q[0] = pars.object.rotation1 / 180.0 * Math.PI;
        q[1] = pars.object.rotation2 / 180.0 * Math.PI;
        q[2] = pars.object.rotation3 / 180.0 * Math.PI;
        q[3] = pars.object.translation1 / 1000; // to mm
        q[4] = pars.object.translation2 / 1000;
        q[5] = pars.object.translation3 / 1000;

        statusOK = robot.setJointPos(q);
        if (!statusOK) {
            q = robot.getJointPos();
            pars.object.translation1 = q[3] * 1000;
            pars.object.translation2 = q[4] * 1000;
            pars.object.translation3 = q[5] * 1000;
            gui.updateDisplay();
        }
    } 

    robot.updateAll();

    updateCameraOnRobot();
}

// =============================================================================
// MAIN PART
// =============================================================================

init();
animate();

function updateCameraOnRobot(){
    var mat = new THREE.Matrix4;
    mat.copy(robot.getToolTransform());
    var position = new THREE.Vector3;
    position.setFromMatrixPosition(mat);
    position.multiplyScalar(1000);
    mat.setPosition(position);
    var rot = new THREE.Matrix4;
    rot.makeRotationX(Math.PI);
    mat.multiply(rot);
    rot.makeRotationZ(Math.PI / 2);
    mat.multiply(rot);
    camera.matrix.copy(mat);
    camera.updateMatrixWorld( true );
}

function init() {

    // add main renderer window
    rendererExt = new THREE.WebGLRenderer({alpha: true });
    rendererExt.setPixelRatio(window.devicePixelRatio);
    rendererExt.setSize(window.innerWidth, window.innerHeight);
    rendererExt.autoClear = false;
    rendererExt.setClearColor(0x000000, 0.0);
    rendererExt.setViewport( 0, 0, sceneContainer.offsetWidth, sceneContainer.offsetHeight);
    sceneContainer.appendChild(rendererExt.domElement);

    // general configuration of the scene
    scene = new THREE.Scene();

    // add external camera
    cameraExt = new THREE.PerspectiveCamera(45, sceneContainer.offsetWidth / sceneContainer.offsetHeight, 1, 2000);
    cameraExt.position.set(400, -70, 241);
    cameraExt.rotation.set(0.718,0.780,0.436);

    cameraExt.up.set( 0, 0, 1 );

    trackballControls = new TrackballControls(cameraExt, rendererExt.domElement);
    trackballControls.minDistance = 200;
    trackballControls.maxDistance = 1000;

    scene.add(new THREE.AmbientLight(0xffffff));
    var light = new THREE.PointLight(0xffffff);
    light.position.copy(cameraExt.position);
    scene.add(light);

    // add robot 
    robot = new ConcentricTubeRobot();
    scene.add(robot.mesh);

    // background grid
    var helper = new THREE.GridHelper(120, 20);
    helper.rotation.x = Math.PI / 2;
    scene.add(helper);

    //eye-in-hand
    camera = new THREE.PerspectiveCamera(30, 640 / 480, 1, 250);
    camera.matrixAutoUpdate = false;
    cameraHelper = new THREE.CameraHelper( camera );
    cameraHelper.visible = false;
    scene.add( cameraHelper );

    // model
    
    /*
    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath( './models/ctr/models/' );
    console.log(mtlLoader.path);
    mtlLoader.load( 'tinker.mtl', function( materials ) {
        materials.preload();
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials( materials );
        objLoader.setPath( './models/ctr/models/' );
        objLoader.load( 'tinker.obj', function ( object ) {       
            modelObj = object.clone();
            modelObj.rotation.y = -Math.PI * 4 / 4; 
            modelObj.position.x = 80;
            modelObj.position.y = -10;
            modelObj.position.z = 70;
            modelObj.scale.set(70,70,70);
            modelObj.visible = false;
            scene.add( modelObj );
        });
    });
    */
    
    var geometry = new THREE.PlaneGeometry( 32, 32, 5 );
    var texture = new THREE.TextureLoader().load( './models/ctr/assets/calib_target2.png' );
    var material = new THREE.MeshBasicMaterial({
        color: 0xffffff, 
        side: THREE.DoubleSide, 
        map: texture
    });
    var calibTarget = new THREE.Mesh( geometry, material );
    calibTarget.rotation.y = Math.PI / 2;
    calibTarget.position.x = 200;
    calibTarget.position.y = 0;
    calibTarget.position.z = 175;
    scene.add( calibTarget );

    robot.updateAll();   
    updateCameraOnRobot();  

    renderer = new THREE.WebGLRenderer({
        preserveDrawingBuffer: true,
        antialias: true
    });
    renderer.domElement.id = 'camera-image';
    renderer.setPixelRatio(externalViewCanvas.devicePixelRatio);
    renderer.setSize(640,480);
    renderer.domElement.style.padding = '0px';
    renderer.domElement.style.margin = '0px';
    renderer.domElement.style.overflow = 'hidden';
    renderer.setClearColor( new THREE.Color(0x222222) );
    externalViewCanvas.appendChild(renderer.domElement);
}

function animate() {
    requestAnimationFrame( animate ); //loop animation
    trackballControls.update();
    rendererExt.render(scene, cameraExt); 
    
    TWEEN.update();
    gui.updateDisplay();
    robot.updateAll();
    updateCameraOnRobot();
    renderer.render(scene, camera);
}

// =============================================================================
// EMBEDDED CONTROLS
// =============================================================================

// keyboar controls
window.addEventListener("keyup", function(e){
    var imgData, imgNode;
    
    if(e.which === 80){ //Listen to 'P' key
        //sendImageUDP();
        saveImage('vst-screenshot');
    }else if (e.which === 65){ // 'a' key - show axis
        robot.toggleDisplayFrames();
    }else if (e.which === 67){ // 'c' key - show camera frustrum
        cameraHelper.visible = ! cameraHelper.visible;
    }else if (e.which === 84){ // 't' key - show 3D object
        modelObj.visible = ! modelObj.visible;
    }
});

// on resize event
window.addEventListener( 'resize', onWindowResize, false );
function onWindowResize(){
    cameraExt.aspect = sceneContainer.offsetWidth / sceneContainer.offsetHeight;
    cameraExt.updateProjectionMatrix();

    rendererExt.setSize( sceneContainer.offsetWidth, sceneContainer.offsetHeight );
}

function saveImage(filePrefix){
    try {
        imgData = renderer.domElement.toDataURL();      
    } 
    catch(e) {
        console.log("First, you have to ckick on camera view");
        //console.log("Browser does not support taking screenshot of 3d context");
        return;
    }
    console.log(imgData);

    var link = document.createElement("a");

    link.setAttribute("href", imgData);
    link.setAttribute("download", filePrefix + ".png" );
    link.click();
}

// =============================================================================
// SERVER COMMUNTICATION
// =============================================================================

const MsgHandlerCTR = require('./msg_handler.js').MsgHandlerCTR;
const msgHandler = new MsgHandlerCTR(robot, renderer);

var receiveMsg = function(arg){
    return msgHandler.handle(arg);
}

exports.receiveMsg = receiveMsg;