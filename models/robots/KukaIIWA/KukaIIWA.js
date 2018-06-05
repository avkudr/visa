/**
 * @file Manages the configuration settings for the widget.
 * @author Marie Bellot, Andrey Kudryavtsev 
 */

const THREE = require('three');
const path  = require('path');

var KukaIIWA = class {
    constructor() {
        //any robot must have this attributes

        this.robotModel = [
            // sigma, Ry, Rx, Tx, Rz, Tz 
            [  0,         0, 	         0,    				0, 		         0,           0],                    	//base
            [  0,         0, 	         0,    				0, 		         0,       157.0],						//c1
            [  0, Math.PI/2, 	-Math.PI/2,    		   -182.7, 		-Math.PI/2,        0.28],						//c2
            [  0,         0, 	 Math.PI/2,   			    0, 		         0, 	  216.6],						//c3
            [  0,-Math.PI/2, 	 Math.PI/2,   			183.4, 		-Math.PI/2,        -0.5],						//c4
            [  0,         0, 	-Math.PI/2,    			  0.5, 		         0,       216.6],						//c5
            [  0, Math.PI/2, 	-Math.PI/2,   		   -183.2, 		   	     0,       -60.7],						//c6
            [  0,-Math.PI/2,  	         0,    	         60.7, 		         0,          81],						//c7
            [  0,         0, 	         0,    				0, 		         0,          45]						//flasque
        ];

        this.T = new Array(this.robotModel.length);
        
        this.nbDOFs = 7;
        this.jointTypes = ['R','R','R','R','R','R','R']; // Rotoidal/Prismatic

        this.q0 = 0;
		this.q1 = 0;
		this.q2 = 0;
		this.q3 = 0;
		this.q4 = 0;
		this.q5 = 0;
		this.q6 = 0;

        this.scale = 1;
        this.position = [0,0,0];
        this.rotation = [0,0,0];

        this.STLFiles = [
            path.resolve(__dirname,'base.STL'),
            path.resolve(__dirname,'c1.STL'),
            path.resolve(__dirname,'c2.STL'),
            path.resolve(__dirname,'c3.STL'),
            path.resolve(__dirname,'c4.STL'),
            path.resolve(__dirname,'c5.STL'),
            path.resolve(__dirname,'c6.STL'),
            path.resolve(__dirname,'c7.STL')];
       
        this.axesVisible = false;

        this.updateKinematics();
        this.create3Dmodel();
        this.updateMesh();
    }

    create3Dmodel(){
        this.mesh = new THREE.Group();
        this.linksMeshes = new Array(this.robotModel.length);
        this.mesh.matrixAutoUpdate = false;

        for (let i = 0; i < this.STLFiles.length; i++){
            let loader = new THREE.STLLoader();
            loader.load(this.STLFiles[i], function ( stlModel ) {
                let material = new THREE.MeshStandardMaterial( { 
                    color: 0xff9933
                } );
                this.linksMeshes[i] = new THREE.Mesh( stlModel,  material );
                this.linksMeshes[i].matrix.copy(this.T[i]);
                this.mesh.add( this.linksMeshes[i] );
            }.bind(this).bind(i));
        }
    }

    updateMesh(){
        this.axesMeshes = new THREE.Group();
        this.linksAxes = new Array(this.robotModel.length);
        this.axesMeshes.matrixAutoUpdate = false;

        for (let i = 0; i < this.linksAxes.length; i++){
            this.linksAxes[i] = new THREE.AxisHelper( 150 );
            this.linksAxes[i].matrixAutoUpdate = false;
            this.linksAxes[i].visible = false;
            this.linksAxes[i].matrix.copy( this.T[i]);

            this.axesMeshes.add(this.linksAxes[i]);
            this.mesh.add( this.linksAxes[i] );
        }
    }

    getNbDOFs(){
        return this.nbDOFs;
    }

    getJointLimits(){
        let limits = [
            [-3.14,3.14],
            [-3.14,3.14],
            [-3.14,3.14],
            [-3.14,3.14],
            [-3.14,3.14],
            [-3.14,3.14],
            [-3.14,3.14]
        ];
        return limits;
    }

    getJointPos(){
        return [this.q0,this.q1,this.q2,this.q3,this.q4,this.q5,this.q6];
    }

    setJointPos(q){
		this.q0 = q[0];
		this.q1 = q[1];
		this.q2 = q[2];
		this.q3 = q[3];
		this.q4 = q[4];
		this.q5 = q[5];
        this.q6 = q[6];
    }

    updateKinematics(){
        for (var i = 0; i < this.robotModel.length; i++){

            var Tx = new THREE.Matrix4;
            var Tz = new THREE.Matrix4;
            var Rx = new THREE.Matrix4;
            var Ry = new THREE.Matrix4;
            var Rz = new THREE.Matrix4;
        
            // 0 ->
            // 1 -> q0
            // 2 -> q1
            // ...
            // 7 -> q6
            // 8 -> 

            let jointValue = 0;
            if ( i > 0 && i < 8 ){
                 jointValue = this['q'+(i-1)];
            }

            Ry.makeRotationY(this.robotModel[i][1]);
            Rx.makeRotationX(this.robotModel[i][2]);
            Tx.makeTranslation(this.robotModel[i][3], 0, 0);
            Rz.makeRotationZ(this.robotModel[i][4] + jointValue );
            Tz.makeTranslation( 0, 0, this.robotModel[i][5]);
        
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

    update3Dmodel(){
        for (let i = 0; i < this.linksMeshes.length; i++){
            if (this.linksMeshes[i] !== undefined){
                let link = this.linksMeshes[i];
                let axesLink = this.linksAxes[i];

                link.matrixAutoUpdate = false;	
                link.matrix.copy(this.T[i]);
                link.updateMatrixWorld(true);
            }
        }
    }

    getToolTransform(){
        //return /*THREE.Matrix4*/;
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
        this.updateKinematics();
        this.update3Dmodel();
        this.updateAxisFrames();
        
        this.mesh.scale.set(this.scale,this.scale,this.scale);
        this.mesh.position.set(this.position[0],this.position[1],this.position[2]);
        this.mesh.rotation.set(this.rotation[0],this.rotation[1],this.rotation[2]);
        this.mesh.updateMatrix();
    }

    updateAxisFrames(){
        for(let i=0; i< this.linksAxes.length; i++){
            if (this.linksAxes[i] !== undefined){
                this.linksAxes[i].matrix.copy(this.T[i]);

                if (this.axesVisible){
                    this.linksAxes[i].visible = true;
                }else{
                    this.linksAxes[i].visible = false;
                }
            }
        }
    }
}

exports.KukaIIWA = KukaIIWA;