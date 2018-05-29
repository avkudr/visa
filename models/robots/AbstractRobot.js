/*
base class for all robots

- change the name of the file to MyRobotClass

*/

const THREE = require('three');

var AbstractRobot = class {
    constructor() {
        //any robot must have this attributes
        
        this.nbDOFs = 7;
        this.jointTypes = ['R','R','R','R','R','R','R']; // Rotoidal/Prismatic

		this.q1 = 0;
		this.q2 = 0;
		this.q3 = 0;
		this.q4 = 0;
		this.q5 = 0;
		this.q6 = 0;
		this.q7 = 0;

        this.scale = 1;
        this.position = [0,0,0];
        this.rotation = [0,0,0];

        this.mesh = new THREE.Group(); //or THREE.Mesh
    }

    getNbDOFs(){
        return this.nbDOFs;
    }


    setJointPos(q){
		this.q1 = q[0];
		this.q2 = q[1];
		this.q3 = q[2];
		this.q4 = q[3];
		this.q5 = q[4];
		this.q6 = q[5];
		this.q7 = q[6];
    }

    getJointPos(){
        return [this.q1,this.q2,this.q3,this.q4,this.q5,this.q6,this.q7];
    }

    getToolTransform(){
        return /*THREE.Matrix4*/;
    }

    setScale(scale){
        this.scale = scale;
    }
    setPosition(position){
        this.position = position;
    }
    setRotation(rotation){
        this.rotation = rotation;
    }

    update() {
        /*
        updating:
        - robot kinematics
        - axes frames
        - mesh
        */

        this.mesh.scale.set(this.scale,this.scale,this.scale);
        this.mesh.position.set(this.position[0],this.position[1],this.position[2]);
        this.mesh.rotation.set(this.rotation[0],this.rotation[1],this.rotation[2]);
        this.mesh.updateMatrix();
    }

    toggleDisplayFrames(){
        //toggle visibility of axes
    }
}

exports.AbstractRobot = AbstractRobot;
