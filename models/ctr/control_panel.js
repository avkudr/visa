// =============================================================================
// GUI CONTROL PANEL
// =============================================================================

const dat   = require('dat.gui');

var DOFs = function () {
    this.rotation1 = 0;
    this.rotation2 = 0;
    this.rotation3 = 0;
    this.translation1 = 0;
    this.translation2 = 0;
    this.translation3 = 0;
}

/**
 * 
 * @param {DOM element inside of which the control panel will be placed} sceneContainer 
 * @param {Id of DOM element corresponding to camera view} externalViewCanvasId 
 * @param {Function called if user changes smth} onControlPanelChange 
 */
var ControlPanel = function(sceneContainer,externalViewCanvasId,onControlPanelChange){
    //create control panel and place it in top rigth corner
    this.canvas = new dat.GUI({ autoPlace: false });
    this.canvas.domElement.style.position = 'absolute';
    this.canvas.domElement.style.top = '10px';
    this.canvas.domElement.style.right = '10px';
    sceneContainer.appendChild(this.canvas.domElement);

    // FOLDER
    //add controlable elements
    // ! Units of control panel differs from units of robot joint values
    this.q = new DOFs();
    this.folderJointValues = this.canvas.addFolder('Joint values');
    this.folderJointValues.add(this.q, 'rotation1', -180, 180).listen(); // in mm
    this.folderJointValues.add(this.q, 'rotation2', -180, 180).listen();
    this.folderJointValues.add(this.q, 'rotation3', -180, 180).listen();
    this.folderJointValues.add(this.q, 'translation1', -200, 200).step(0.2).listen(); //in deg
    this.folderJointValues.add(this.q, 'translation2', -200, 200).step(0.2).listen();
    this.folderJointValues.add(this.q, 'translation3', -200, 200).step(0.2).listen();
    this.folderJointValues.open();

    //on changing parameters of each parameter in folder call ...
    for (var i in this.folderJointValues.__controllers) {
        this.folderJointValues.__controllers[i].onChange(function(value) {
            onControlPanelChange(this);
        });
    }

    //BUTTON
    //show/hide camera view
    var obj = { add:function(){ 
        $(externalViewCanvasId).toggle();
    }};
    this.canvas.add(obj,'add').name("Show-hide camera");
}

/**
 * Setting min and max values for JointValues in control panel
 * @param {Index of the parameter in the folder 'Joint values'} idx 
 * @param {Minimal value} min 
 * @param {Maximal value} max 
 */
ControlPanel.prototype.setMinMax = function(idx, min, max) {
    var properties = this.canvas.__folders['Joint values'].__controllers[idx];
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

ControlPanel.prototype.getJointValues = function(){
    var qOut = new Array(6);
    qOut[0] = this.q.rotation1 / 180.0 * Math.PI; //to radians
    qOut[1] = this.q.rotation2 / 180.0 * Math.PI;
    qOut[2] = this.q.rotation3 / 180.0 * Math.PI;
    qOut[3] = this.q.translation1 / 1000; // to meters
    qOut[4] = this.q.translation2 / 1000;
    qOut[5] = this.q.translation3 / 1000;
    return qOut;
}

ControlPanel.prototype.setJointValues = function(q){
    this.q.rotation1 = q[0] / Math.PI * 180.0; // to degrees
    this.q.rotation2 = q[1] / Math.PI * 180.0;
    this.q.rotation3 = q[2] / Math.PI * 180.0;
    this.q.translation1 = q[3] * 1000; // to mm
    this.q.translation2 = q[4] * 1000;
    this.q.translation3 = q[5] * 1000;
}

ControlPanel.prototype.updateDisplay = function(){
    this.canvas.updateDisplay();
}

exports.ControlPanel = ControlPanel;