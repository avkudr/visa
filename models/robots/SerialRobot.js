/*
base class for all robots

- change the name of the file to MyRobotClass

*/

const THREE = require('three');

class SerialRobot {
    constructor(forwardKinematics) {
        if (forwardKinematics === undefined){
            this.forwardKinematics = [
                // sigma, Ry, Rx, Tx, Rz, Tz      
                [      0,  0,  0,  0,  0, 10.0], //base -> q0      
                [      0,  0,  0,  0,  0, 15.0], //q0   -> q1	  
                [      0,  0,  0,  0,  0, 15.0], //q1   -> q2
                [      0,  0,  0,  0,  0, 15.0]  //q2   -> end-effector
            ];
        }else{
            this.forwardKinematics = forwardKinematics;
        }
        this.nbDOFs = this.forwardKinematics.length-1;

        this.jointTypes = new Array(this.nbDOFs);
        this.jointLimits = new Array(this.nbDOFs);
        for (let i = 0; i < this.nbDOFs; i++){
            this['q'+ i] = 0;
            this.jointTypes[i] = 'T';
            this.jointLimits[i] = [-20, 20];
        }

        this.scale = 1;
        this.position = [0,0,0];
        this.rotation = [0,0,0];

        this.T = new Array(this.nbDOFs); //transformation matrices for all joints
        this.updateKinematics();
        this.createMesh();
        this.createAxes();
    }

    updateKinematics(){
        for (var i = 0; i < this.nbDOFs + 1; i++){

            var Tx = new THREE.Matrix4;
            var Tz = new THREE.Matrix4;
            var Rx = new THREE.Matrix4;
            var Ry = new THREE.Matrix4;
            var Rz = new THREE.Matrix4;

            let jointT = 0;
            let jointR = 0;
            if (i < this.nbDOFs){
                if (this.jointTypes[i] == 'R') jointR = this['q'+i];
                if (this.jointTypes[i] == 'T') jointT = this['q'+i];
            }

            Ry.makeRotationY(this.forwardKinematics[i][1]);
            Rx.makeRotationX(this.forwardKinematics[i][2]);
            Tx.makeTranslation(this.forwardKinematics[i][3], 0, 0);
            Rz.makeRotationZ(this.forwardKinematics[i][4] + jointR );
            Tz.makeTranslation( 0, 0, this.forwardKinematics[i][5] + jointT);
        
            this.T[i] = new THREE.Matrix4;
            
            this.T[i].multiply(Ry);
            this.T[i].multiply(Rx);
            this.T[i].multiply(Tx);
            this.T[i].multiply(Rz);
            this.T[i].multiply(Tz);
            
            if( i != 0){
                this.T[i].premultiply(this.T[i-1]);
            }
        } 
    }

    createMesh(){
        this.mesh = new THREE.Group();
        this.mesh.matrixAutoUpdate = false;

        let geometry = new THREE.BoxGeometry( 30, 30, 10 );
        for (let v of geometry.vertices){
            v.z += 5;
        }
        let material = new THREE.MeshStandardMaterial( {color: 0xff3399} );
        this.baseMesh = new THREE.Mesh( geometry, material );
        this.baseMesh.matrixAutoUpdate = false;
        this.mesh.add(this.baseMesh);

        this.linksMeshes = new Array(this.nbDOFs);

        for (let i = 0; i < this.nbDOFs; i++){
            let geometry = new THREE.BoxGeometry( 20-2*i, 20-2*i, 15 );
            for (let v of geometry.vertices){
                v.z += 7.5;
            }

            let material = new THREE.MeshStandardMaterial( {color: 0xff9933} );
            let cube = new THREE.Mesh( geometry, material );
            this.linksMeshes[i] = cube;
            this.linksMeshes[i].matrix.copy( this.T[i]);
            this.mesh.add(this.linksMeshes[i]);
        }
    }

    updateMesh(){
        if (this.mesh !== undefined){
            for (let i = 0; i < this.nbDOFs; i++){
                if (this.linksMeshes[i] !== undefined){
                    let link = this.linksMeshes[i];
                    link.matrixAutoUpdate = false;	
                    link.matrix.copy(this.T[i]);
                    link.updateMatrixWorld(true);
                }
            }

            if ( this.baseMesh !== undefined){
                this.baseMesh.matrix.copy(this.mesh.matrix);
            }
        }
    }

    createAxes(){
        let axesSize = 1.2 * Math.max(...this.forwardKinematics[0]);
        console.log(axesSize);
        this.axes = new THREE.Group();
        this.axes.matrixAutoUpdate = false;
        this.axesVisible = true;

        this.linksAxes = new Array(this.nbDOFs + 1);
        for (let i = 0; i < this.linksAxes.length; i++){
            this.linksAxes[i] = new THREE.AxisHelper( axesSize );
            this.linksAxes[i].matrixAutoUpdate = false;
            this.linksAxes[i].visible = true;
            this.linksAxes[i].matrix.copy( this.T[i] );
            this.axes.add( this.linksAxes[i] );
        }

        this.axesRobotBase = new THREE.AxisHelper( 25 ); 
        this.axesRobotBase.matrixAutoUpdate = false;
        this.axesRobotBase.visible = true;
        this.axesRobotBase.matrix.copy( this.mesh.matrix );
        this.axes.add( this.axesRobotBase );

        this.mesh.add( this.axes );
    }

    updateAxes(){
        if (this.axesVisible){
            for (let i = 0; i < this.linksAxes.length; i++){
                if (this.linksAxes[i] !== undefined){
                    let axis = this.linksAxes[i];
                    axis.matrixAutoUpdate = false;	
                    axis.matrix.copy(this.T[i]);
                    axis.updateMatrixWorld(true);
                }
            }

            this.axesRobotBase.matrix.copy(this.mesh.matrix);
            this.axesRobotBase.updateMatrixWorld(true);
            this.axes.visible = true;
        }else{
            this.axes.visible = false;
        }
    }

    getNbDOFs(){
        return this.nbDOFs;
    }

    getJointLimits(){
        return this.jointLimits;
    }

    setJointPos(q){
        if (q.length !== this.nbDOFs){
            console.error('The size of joint values array must match the number of robot degrees of freedom');
            return;
        }
        for (let i = 0; i < this.nbDOFs; i++){
            this['q'+ i] = q[i];
        }
    }

    getJointPos(){
        let q = new Array(this.nbDOFs);
        for (let i = 0; i < this.nbDOFs; i++){
            q[i] = this['q'+ i];
        }
        return q;
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

    get endeffector(){
        let endEffectorPose = new THREE.Matrix4;
        endEffectorPose.copy(this.T[this.T.length-1]);
        endEffectorPose.premultiply(this.mesh.matrix);
        return endEffectorPose;
    }

    update() {
        this.updateKinematics();
        this.updateMesh();
        this.updateAxes();

        this.mesh.scale.set(this.scale,this.scale,this.scale);
        this.mesh.position.set(this.position[0],this.position[1],this.position[2]);
        this.mesh.rotation.set(this.rotation[0],this.rotation[1],this.rotation[2]);
        this.mesh.updateMatrix();
    }

    toggleDisplayFrames(){
        //toggle visibility of axes
    }
}

exports.SerialRobot = SerialRobot;
