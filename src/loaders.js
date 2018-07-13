const THREE = require('three');
const path = require('path');

const MTLLoader = require(global.appLibsDir() + '/MTLLoader.js');
const OBJLoader = require(global.appLibsDir() + '/OBJLoader.js');
const STLLoader = require(global.appLibsDir() + '/STLLoader.js');
const ColladaLoader = require(global.appLibsDir() + '/ColladaLoader.js');

// Converts from degrees to radians.
Math.rad = function(degrees) {
    return degrees * Math.PI / 180;
};

// Converts from radians to degrees.
Math.deg = function(radians) {
    return radians * 180 / Math.PI;
};

const Loaders = {

    obj: async function(file){
        let promise = new Promise(function(resolve, reject) {
            let loaderOBJ = new THREE.OBJLoader();
            let filepath = path.dirname(file) + '/';
            let filename = path.basename(file, '.obj');
    
            var mtlLoader = new THREE.MTLLoader();
            mtlLoader.setPath( filepath );
            mtlLoader.setTexturePath( filepath + "textures/" );
    
            mtlLoader.load( filename + '.mtl', function( materials ) {
                materials.preload();
                materials.side = THREE.DoubleSide;
                var objLoader = new THREE.OBJLoader();
                objLoader.setMaterials( materials );
                objLoader.setPath( filepath );
                objLoader.load( filename + '.obj', function ( mesh ) {
                    resolve(mesh);
                });
            });
        });
        let mesh = await promise;
        return mesh;
    },

    stl: async function(file,objectColor){

        let promise = new Promise(function(resolve, reject) {
            let loaderSTL = new THREE.STLLoader();
            loaderSTL.load( file, function ( geometry ) {
                let clr = (objectColor == undefined) ? 0x1258c9 : objectColor;
                let material = new THREE.MeshPhongMaterial( { color: clr } );
                let mesh = new THREE.Mesh( geometry, material );
                resolve(mesh);
            });
        });
        let mesh = await promise;
        return mesh;
    },

    dae: async function(file){
        let promise = new Promise(function(resolve, reject) {
            let loader = new THREE.ColladaLoader();
            loader.load( file , function ( collada ) {
                let mesh = collada.scene;
                resolve(mesh);
            });
        });
        let mesh = await promise;
        return mesh;
    }
}

exports.Loaders = Loaders;