/**
 * @file Manages the configuration settings for the widget.
 * @author Marie Bellot, Andrey Kudryavtsev 
 */

const THREE = require('three');
const path  = require('path');

const {Loaders} = require(global.appRootDir() + '/src/loaders.js');
const {SerialRobot} = require(path.resolve(__dirname,"./../SerialRobot.js"));

class Viper650 extends SerialRobot{
    constructor(){
        // sigma, tx, ty, tz, rx, ry, rz -Math.PI/2
        super([
            [  0, 0,0,203.0,        0,0,0],	//base -> c1
            [  0,75,0,335.0-203.0,  -Math.PI/2,0,0],	//base -> c1
            [  0,270,0,0,      0,0,-Math.PI/2],
            [  0,108,-90,0,      0, Math.PI/2,0],
            [  0,0,0,295-108,      0,-Math.PI/2,0],
            [  0,52,0,0,      0,Math.PI/2,Math.PI/2],
            [  0,0,0,181.6-52,      0,0,0]
        ]);

        this.jointTypes = ['R','R','R','R','R','R'];
    }

    async createMesh(){
        let STLBase = path.resolve(__dirname,'base.stl');
        let STLLinks = [
            path.resolve(__dirname,'c1.stl'),
            path.resolve(__dirname,'c2.stl'),
            path.resolve(__dirname,'c3.stl'),
            path.resolve(__dirname,'c4.stl'),
            path.resolve(__dirname,'c5.stl'),
            path.resolve(__dirname,'c6.stl')];

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
    }

    getJointLimits(){
        let limits = [
            [Math.rad(-170),Math.rad(170)],
            [Math.rad(-190),Math.rad( 45)],
            [Math.rad( -29),Math.rad(256)],
            [Math.rad(-190),Math.rad(190)],
            [Math.rad(-120),Math.rad(120)],
            [Math.rad(-360),Math.rad(360)]
        ];
        return limits;
    }
}

exports.Viper650 = Viper650;