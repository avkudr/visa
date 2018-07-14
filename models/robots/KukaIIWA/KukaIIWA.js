/**
 * @file Manages the configuration settings for the widget.
 * @author Marie Bellot, Andrey Kudryavtsev 
 */

const THREE = require('three');
const path  = require('path');

const {Loaders} = require(global.appRootDir() + '/src/loaders.js');
const {SerialRobot} = require(path.resolve(__dirname,"./../SerialRobot.js"));

class KukaIIWA extends SerialRobot{
    constructor(){
        super([ //Tx, Ty, Tz, Rx, Ry, Rz,    
            [  0, 		0,      0,  157.0,          0,           0,          0],	//base -> c1
            [  0,       0,      0,  183.0, -Math.PI/2,           0,          0],	//c1 -> c2
            [  0,	    0, -216.6,      0,  Math.PI/2,           0,          0],	//c2 -> c3
            [  0,       0,      0,  183.4,  Math.PI/2,           0,          0],	//c3 -> c4
            [  0, 	    0,  216.6,      0, -Math.PI/2,           0,          0],	//c4 -> c5
            [  0,       0,  -60.7,  183.2, -Math.PI/2,           0,  Math.PI/2],	//c5 -> c6
            [  0,   -81.0,      0,   60.7, 	        0,  -Math.PI/2,          0],	//c6 -> c7
            [  0, 		0,      0,     45,          0,           0,          0]	//c7 -> end-effector
        ]);

        this.jointLimits = [
            [ Math.rad(-170), Math.rad(170)],
            [ Math.rad(-120), Math.rad(120)],
            [ Math.rad(-170), Math.rad(170)],
            [ Math.rad(-120), Math.rad(120)],
            [ Math.rad(-170), Math.rad(170)],
            [ Math.rad(-120), Math.rad(120)],
            [ Math.rad(-175), Math.rad(175)]
        ];
    }

    async createMesh(){
        try {
            let STLBase = path.resolve(__dirname,'base.STL');
            let STLLinks = [
                path.resolve(__dirname,'c1.STL'),
                path.resolve(__dirname,'c2.STL'),
                path.resolve(__dirname,'c3.STL'),
                path.resolve(__dirname,'c4.STL'),
                path.resolve(__dirname,'c5.STL'),
                path.resolve(__dirname,'c6.STL'),
                path.resolve(__dirname,'c7.STL')];

            this.mesh = new THREE.Group();
            this.mesh.matrixAutoUpdate = false;
        
            this.baseMesh = await Loaders.stl(STLBase, 0xff9933);
            this.baseMesh.matrix.copy(this.mesh.matrix);
            this.mesh.add( this.baseMesh );

            this.linksMeshes = new Array(this.nbDOFs);
            for (let i = 0; i < STLLinks.length; i++){
                this.linksMeshes[i] = await Loaders.stl( STLLinks[i], 0xff9933 );
                this.linksMeshes[i].matrix.copy(this.T[i]);
                this.mesh.add( this.linksMeshes[i] );
            }
        }catch(error){
            //console.error(error);
        }
    }
}

exports.KukaIIWA = KukaIIWA;