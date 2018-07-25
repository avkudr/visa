/*
base class for all robots

- change the name of the file to MyRobotClass

*/

const THREE = require('three');

class SerialRobot {
    constructor(forwardKinematics) {
        if (forwardKinematics === undefined) {
            this.forwardKinematics = [
                // sigma, Tx, Ty, Tz, Rx, Ry, Rz    
                [1, 0, 0, 10.0, 0, 0, 0], //base -> q0      
                [1, 0, 0, 15.0, 0, 0, 0], //q0   -> q1	  
                [1, 0, 0, 15.0, 0, 0, 0], //q1   -> q2
                [1, 0, 0, 15.0, 0, 0, 0]  //q2   -> end-effector
            ];
        } else {
            this.forwardKinematics = forwardKinematics;
        }
        this.nbDOFs = this.forwardKinematics.length - 1;

        this.FKmodel = (this.forwardKinematics[0].length == 5) ? "DH" : "6DOF";

        this.jointTypes = new Array(this.nbDOFs);
        this.jointLimits = new Array(this.nbDOFs);
        for (let i = 0; i < this.nbDOFs; i++) {
            this['q' + i] = 0;
            let jointType = this.forwardKinematics[i][0];
            this.jointTypes[i] = jointType == 0 ? 'R' : 'P';
            this.jointLimits[i] = jointType == 0 ? [-Math.PI, Math.PI] : [-20, 20];
        }

        this.scale = 1;
        this.position = [0, 0, 0];
        this.rotation = [0, 0, 0];
        this.T = new Array(this.nbDOFs); //transformation matrices for all joints: 0T1,0T2,0T3...
        this.isInitDone = false;
    }

    async init() {
        this.updateKinematics();
        let dummy = await this.createMesh();
        this.createAxes();
        this.isInitDone = true;
        return dummy;
    }

    updateKinematics() {
        for (var i = 0; i < this.nbDOFs + 1; i++) {

            let jointT = 0;
            let jointR = 0;
            if (i < this.nbDOFs) {
                if (this.jointTypes[i] == 'R') jointR = this['q' + i];
                if (this.jointTypes[i] == 'P') jointT = this['q' + i];
            }

            this.T[i] = new THREE.Matrix4; 

            if (this.FKmodel == "DH"){

                // Denavit-Hartenberg
                let ai     = this.forwardKinematics[i][1];
                let alphai = this.forwardKinematics[i][2];
                let di     = this.forwardKinematics[i][3];
                let thetai = this.forwardKinematics[i][4] + jointR;

                this.T[i].set ( Math.cos(thetai), -Math.sin(thetai)*Math.cos(alphai), Math.sin(thetai)*Math.sin(alphai), ai*Math.cos(thetai),
                                Math.sin(thetai),  Math.cos(thetai)*Math.cos(alphai),-Math.cos(thetai)*Math.sin(alphai), ai*Math.sin(thetai),
                                               0,                   Math.sin(alphai),                  Math.cos(alphai),                  di,
                                               0,                                  0,                                 0,                   1);
                
                if (i > 0) this.T[i].premultiply(this.T[i-1]);
                
            }else{

                var Tx = new THREE.Matrix4;
                var Ty = new THREE.Matrix4;
                var Tz = new THREE.Matrix4;
                var Rx = new THREE.Matrix4;
                var Ry = new THREE.Matrix4;
                var Rz = new THREE.Matrix4;

                let tx = this.forwardKinematics[i][1];
                let ty = this.forwardKinematics[i][2];
                let tz = this.forwardKinematics[i][3] + jointT;
                let rx = this.forwardKinematics[i][4];
                let ry = this.forwardKinematics[i][5];
                let rz = this.forwardKinematics[i][6] + jointR;

                let cx = Math.cos(rx); let sx = Math.sin(rx);
                let cy = Math.cos(ry); let sy = Math.sin(ry);
                let cz = Math.cos(rz); let sz = Math.sin(rz);

                // T[i] = Tx * Ty * Tz * Rx * Ry * Rz
                this.T[i].set(cy * cz, -cy * sz, sy, tx,
                    cx * sz + cz * sx * sy, cx * cz - sx * sy * sz, -cy * sx, ty,
                    sx * sz - cx * cz * sy, cz * sx + cx * sy * sz, cx * cy, tz,
                    0, 0, 0, 1);
                // Rx.makeRotationX(rx);
                // Ry.makeRotationY(ry);
                // Rz.makeRotationZ(rz);
                // Tx.makeTranslation(tx, 0, 0);
                // Ty.makeTranslation( 0,ty, 0);
                // Tz.makeTranslation( 0, 0,tz);

                // this.T[i].multiply(Tx);
                // this.T[i].multiply(Ty);
                // this.T[i].multiply(Tz);
                // this.T[i].multiply(Rx);
                // this.T[i].multiply(Ry);
                // this.T[i].multiply(Rz);

                // Denavit-Hartenberg
                // this.T[i].set ( Math.cos(thetai), -Math.sin(thetai)*Math.cos(alphai), Math.sin(thetai)*Math.sin(alphai), ai*Math.cos(thetai),
                //                 Math.sin(thetai),  Math.cos(thetai)*Math.cos(alphai),-Math.cos(thetai)*Math.sin(alphai), ai*Math.sin(thetai),
                //                                0,                   Math.sin(alphai),                  Math.cos(alphai),                  di,
                //                                0,                                  0,                                 0,                   1);

                // Denavit-Hartenberg modified
                // this.T[i].set (                 Math.cos(thetai),-Math.sin(thetai),0,ai,
                // Math.sin(thetai)*Math.cos(alphai), Math.cos(thetai)*Math.cos(alphai), -Math.sin(alphai), -di*Math.sin(alphai),
                // Math.sin(thetai)*Math.sin(alphai), Math.cos(thetai)*Math.sin(alphai), Math.cos(alphai),  di*Math.cos(alphai),
                //                0,                                  0,                                 0,                   1);

                if (i > 0) {
                    this.T[i].premultiply(this.T[i - 1]);
                }
            }
        }
    }

    async createMesh() {
        this.mesh = new THREE.Group();
        this.mesh.matrixAutoUpdate = false;

        let geometry = new THREE.BoxGeometry(30, 30, 10);
        for (let v of geometry.vertices) {
            v.z += 5;
        }
        let material = new THREE.MeshStandardMaterial({ color: 0xff3399 });
        this.baseMesh = new THREE.Mesh(geometry, material);
        this.baseMesh.matrixAutoUpdate = false;
        this.mesh.add(this.baseMesh);

        this.linksMeshes = new Array(this.nbDOFs);

        for (let i = 0; i < this.nbDOFs; i++) {
            let geometry = new THREE.BoxGeometry(20 - 2 * i, 20 - 2 * i, 15);
            for (let v of geometry.vertices) {
                v.z += 7.5;
            }

            let material = new THREE.MeshStandardMaterial({ color: 0xff9933 });
            let cube = new THREE.Mesh(geometry, material);
            this.linksMeshes[i] = cube;
            this.linksMeshes[i].matrix.copy(this.T[i]);
            this.mesh.add(this.linksMeshes[i]);
        }
    }

    updateMesh() {
        if (this.mesh !== undefined) {
            for (let i = 0; i < this.nbDOFs; i++) {
                if (this.linksMeshes[i] !== undefined) {
                    let link = this.linksMeshes[i];
                    link.matrixAutoUpdate = false;
                    link.matrix.copy(this.T[i]);
                    link.updateMatrixWorld(true);
                }
            }

            if (this.baseMesh !== undefined) {
                this.baseMesh.matrix.copy(this.mesh.matrix);
            }
        }
    }

    createAxes() {
        let axesSize = 1.2 * Math.max(...this.forwardKinematics[0]);
        this.axes = new THREE.Group();
        this.axes.matrixAutoUpdate = false;
        this.axesVisible = true;

        this.linksAxes = new Array(this.nbDOFs + 1);
        for (let i = 0; i < this.linksAxes.length; i++) {
            this.linksAxes[i] = new THREE.AxisHelper(axesSize);
            this.linksAxes[i].matrixAutoUpdate = false;
            this.linksAxes[i].visible = true;
            this.linksAxes[i].matrix.copy(this.T[i]);
            this.axes.add(this.linksAxes[i]);
        }

        this.axesRobotBase = new THREE.AxisHelper(25);
        this.axesRobotBase.matrixAutoUpdate = false;
        this.axesRobotBase.visible = true;
        this.axesRobotBase.matrix.copy(this.mesh.matrix);
        this.axes.add(this.axesRobotBase);

        this.mesh.add(this.axes);
    }

    updateAxes() {
        if (this.axesVisible) {
            for (let i = 0; i < this.linksAxes.length; i++) {
                if (this.linksAxes[i] !== undefined) {
                    let axis = this.linksAxes[i];
                    axis.matrixAutoUpdate = false;
                    axis.matrix.copy(this.T[i]);
                    axis.updateMatrixWorld(true);
                }
            }

            this.axesRobotBase.matrix.copy(this.mesh.matrix);
            this.axesRobotBase.updateMatrixWorld(true);
            this.axes.visible = true;
        } else {
            this.axes.visible = false;
        }
    }

    getNbDOFs() {
        return this.nbDOFs;
    }

    getJointLimits() {
        return this.jointLimits;
    }

    setJointPos(q) {
        if (q.length !== this.nbDOFs) {
            console.error('The size of joint values array must match the number of robot degrees of freedom');
            return;
        }

        for (let i = 0; i < this.nbDOFs; i++) {
            if ( q[i] > this.jointLimits[i][1] ){
                q[i] = this.jointLimits[i][1];
                //console.warn(this.constructor.name + ": axis " + i + " is in high limit");
            }else if ( q[i] < this.jointLimits[i][0] ){
                q[i] = this.jointLimits[i][0];
                //console.warn(this.constructor.name + ": axis " + i + " is in low limit");
            }
            this['q' + i] = q[i];
        }
    }

    getJointPos() {
        let q = new Array(this.nbDOFs);
        for (let i = 0; i < this.nbDOFs; i++) {
            q[i] = this['q' + i];
        }
        return q;
    }

    setScale(scale) {
        this.scale = scale;
    }
    setPosition(position) {
        this.position = position;
    }
    setRotation(rotation) {
        this.rotation = rotation;
    }

    getJointTransform(i){
        let T = this.T[i].clone();
        T.elements[12] *= 0.001;
        T.elements[13] *= 0.001;
        T.elements[14] *= 0.001;
        return T;
    }

    getToolTransform(){
        return this.getJointTransform(this.T.length - 1);
    }

    get_fJe(){
        let J = new Array(6);
        for (var i = 0; i < J.length; i++) {
            J[i] = new Array(this.nbDOFs);
        }

        let T = this.getToolTransform();
        let On = [T.elements[12], T.elements[13], T.elements[14]];

        for (let i = 0; i < this.nbDOFs; i++){
            let Ti = this.getJointTransform(i);
            let zi = new THREE.Vector3( Ti.elements[8], Ti.elements[9], Ti.elements[10]);

            if (this.jointTypes[i] == 'R'){
                let Oi = [Ti.elements[12], Ti.elements[13], Ti.elements[14]];
                
                let O = {
                    x: On[0] - Oi[0],
                    y: On[1] - Oi[1],
                    z: On[2] - Oi[2]
                };
                let crossProd = {
                    x: zi.y * O.z - zi.z * O.y,
                    y: zi.z * O.x - zi.x * O.z,
                    z: zi.x * O.y - zi.y * O.x,
                };
                
                J[0][i] = Math.round( crossProd.x * 1e5) / 1e5;
                J[1][i] = Math.round( crossProd.y * 1e5) / 1e5;
                J[2][i] = Math.round( crossProd.z * 1e5) / 1e5;
                J[3][i] = Math.round( zi.x * 1e5) / 1e5;
                J[4][i] = Math.round( zi.y * 1e5) / 1e5;
                J[5][i] = Math.round( zi.z * 1e5) / 1e5; 
            }else{
                J[0][i] = Math.round( zi.x * 1e5) / 1e5;
                J[1][i] = Math.round( zi.y * 1e5) / 1e5;
                J[2][i] = Math.round( zi.z * 1e5) / 1e5;
                J[3][i] = 0;
                J[4][i] = 0;
                J[5][i] = 0; 
            } 
        }

        return J;
    }

    get endeffector() {
        let endEffectorPose = new THREE.Matrix4;
        endEffectorPose.copy(this.T[this.T.length - 1]);
        endEffectorPose.premultiply(this.mesh.matrix);
        return endEffectorPose;
    }

    update() {
        if (this.isInitDone) {
            this.updateKinematics();
            this.updateMesh();
            this.updateAxes();

            this.mesh.scale.set(this.scale, this.scale, this.scale);
            this.mesh.position.set(this.position[0], this.position[1], this.position[2]);
            this.mesh.rotation.set(this.rotation[0], this.rotation[1], this.rotation[2]);
            this.mesh.updateMatrix();
        }
    }

    toggleDisplayFrames() {
        //toggle visibility of axes
    }
}

exports.SerialRobot = SerialRobot;
