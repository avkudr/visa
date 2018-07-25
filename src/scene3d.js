const THREE = require('three');
const TrackballControls = require('three-trackballcontrols');
const fs = require('fs');
const path = require('path');

const Stats = require('stats-js');

var stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms
 
// Align top-left
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';
 
document.body.appendChild( stats.domElement );

const {Loaders} = require('./loaders.js');

var Scene3D = function(container){
    this.container = container;
    // add main renderer window
    this.mainRenderer = new THREE.WebGLRenderer({alpha: true, antialias:true });
    this.mainRenderer.setPixelRatio(window.devicePixelRatio);
    this.mainRenderer.setSize(window.innerWidth, window.innerHeight);
    this.mainRenderer.autoClear = false;
    this.mainRenderer.setClearColor(0x000000, 0.0);
    this.mainRenderer.setViewport( 0, 0, this.container.offsetWidth, this.container.offsetHeight);
    this.container.appendChild(this.mainRenderer.domElement);
    this.init();

    window.addEventListener( 'resize', this.onWindowResize.bind(this), false );

    this.robots = [];
    this.cameras = [];

    this.relatives = []; // this structure with hold the information about the objects with relative poses
    this.animate();
}

Scene3D.prototype.init = function(){

    // general configuration of the scene
    this.scene = new THREE.Scene();

    // add external camera
    this.mainCamera = new THREE.PerspectiveCamera(
        45,this.container.offsetWidth / this.container.offsetHeight, 1, 2000);

    this.mainCamera.position.set(400, -70, 241);
    this.mainCamera.up.set( 0, 0, 1 );
	
    this.trackballControls = new TrackballControls(this.mainCamera, this.mainRenderer.domElement);
    this.trackballControls.minDistance = 0.01;
    this.trackballControls.maxDistance = 1000;

    this.scene.add(new THREE.AmbientLight(0xaaaaaa));
    var light1 = new THREE.PointLight(0xaaaaaa);
    light1.position.set( 400, -400, 400);
    var light2 = new THREE.PointLight(0xaaaaaa);
    light2.position.set( 400,  400, 400);
    var light3 = new THREE.PointLight(0xaaaaaa);
    light3.position.set(-400,    0, 400);
    this.scene.add(light1);
    this.scene.add(light2);
    this.scene.add(light3);

    // background grid
    var helper = new THREE.GridHelper(200, 40);
    helper.rotation.x = Math.PI / 2;
    this.scene.add(helper);
}

Scene3D.prototype.animate = function(){
    
    stats.begin();
    requestAnimationFrame( this.animate.bind(this) ); //loop animation

    //update relative positionning
    for (let links of this.relatives){
        links.dest.origin = links.src[links.srcProperty];
    }

    for (let camera of this.cameras){
        camera.update();      
        camera.render(this.scene);
    }

    for (let robot of this.robots){
        robot.update();
    }

    this.trackballControls.update();
    this.mainRenderer.render(this.scene, this.mainCamera);   
    
    stats.end();
}

Scene3D.prototype.onWindowResize =  function(){
    this.mainCamera.aspect = this.container.offsetWidth / this.container.offsetHeight;
    this.mainCamera.updateProjectionMatrix();
    this.mainRenderer.setSize( this.container.offsetWidth, this.container.offsetHeight );
}

Scene3D.prototype.clearScene = function(){
    //console.log(this.scene);
    this.relatives = [];

    for (let i = this.scene.children.length-1; i >= 0; i--) {
        let elt = this.scene.children[i];
        if (elt instanceof THREE.Mesh){
            disposeHierarchy(elt, disposeNode);
            this.scene.remove(elt); 
        } else if (elt instanceof THREE.Group){
            for (let j = elt.children.length-1; j >= 0; j--){           
                let eltJ = elt.children[j];
                if (eltJ instanceof THREE.Mesh){
                    disposeHierarchy(eltJ, disposeNode);
                    elt.remove(eltJ); 
                }
            }
            this.scene.remove(elt); 
        } else {
            this.scene.remove(elt); 
        }
    }    
    this.mainRenderer.renderLists.dispose();
    this.init();
    //console.log(this.scene);
}

Scene3D.prototype.loadModel = async function(path){
    this.clearScene();
    this.loadingDone = false;
    
    let data = fs.readFileSync(path, 'utf8');
    data = JSON.parse(data);

    if (data["global"] !== undefined){
        if (data["global"]["camera"] !== undefined){
            let params = data["global"]["camera"];
            let fov  = (params.fov  === undefined) ?   45 : params.fov;
            let near = (params.near === undefined) ?  0.1 : params.near;
            let far  = (params.far  === undefined) ? 2000 : params.far;

            let t = (params.position  === undefined) ? [400, -70, 241] : params.position;

            this.mainCamera = new THREE.PerspectiveCamera(
                fov,this.container.offsetWidth / this.container.offsetHeight, near, far);
            
            this.mainCamera.position.set(t[0], t[1], t[2]);
            this.mainCamera.up.set( 0, 0, 1 );


            this.trackballControls = new TrackballControls(this.mainCamera, this.mainRenderer.domElement);
            this.trackballControls.minDistance = 0.01;
            this.trackballControls.maxDistance = 1000;

            if (params.lookAt === undefined){
                this.trackballControls.target.set( 0, 0, 0 );
            }else{
                this.trackballControls.target.set(params.lookAt[0],params.lookAt[1],params.lookAt[2]);
            }
        }
    }
    //load objects    
    if (data["objects"] !== undefined){
        this.nbObjectsToLoad = data["objects"].length;
        for (let i = 0; i < data["objects"].length; i++) {

            let object = data["objects"][i];        
            let extension = object.file.split('.').pop();
            
            if (object.hasOwnProperty('relativeTo')) {
                console.warn('Only cameras may have relative positionning!');
            }
            
            switch(extension){
                case 'stl': await this.loadSTL(object); break;
                case 'obj': await this.loadOBJ(object); break; 
                case 'dae': await this.loadDAE(object); break;
                default:
                    alert("Unknown extension " + extension + " in : " + object.file + ". Currently supported are stl, obj/mtl, dae");
            }
            
        }
    }


    //load robots
    this.robots = [];
    if (data["robots"] !== undefined){
        if (data["robots"].length > 1){
            console.warn('TODO: server communcation is not implemented for more than 1 robot yet. All your commands will be received by robots[0]');
        }
        for (let i = 0; i < data["robots"].length; i++) {
            let robotInfo = data["robots"][i];
            const robotSrc = require(global.appModelsDir() + "/robots/" + robotInfo.type + "/" + robotInfo.type + ".js");
            const robotClass = robotSrc[robotInfo.type];

            let robot = new robotClass();
            await robot.init();
            
            robot.setScale((robotInfo.scale == undefined) ? 1 : robotInfo.scale);
            robot.setPosition((robotInfo.position == undefined) ? [0,0,0] : robotInfo.position);
            robot.setRotation((robotInfo.rotation == undefined) ? [0,0,0] : robotInfo.rotation);

            let jointPos = Array.apply(null, Array(robot.getNbDOFs())).map(Number.prototype.valueOf,0);
            robot.setJointPos((robotInfo.jointValues == undefined) ? jointPos : robotInfo.jointValues);
            if (robot.hasOwnProperty('tubeLength')){
                robot.initFabricationParams(robotInfo.tubeLengths,robotInfo.tubeCurvatures)
            }

            this.robots.push(robot);

            if (robotInfo.hasOwnProperty('relativeTo')) {
                console.warn('Only cameras may have relative positionning!');
            }

            this.scene.add(robot.mesh);
        }
    }

    //console.log(this.robots);

    this.cameras = [];
    if (data["cameras"] !== undefined){
        const Camera = require('./camera.js').Camera;

        if (data["cameras"].length > 1){
            console.warn('TODO: <server communcation> and <view container> is not implemented for more than 1 camera yet. All your commands will be received by cameras[0]');
        }

        for (let i = 0; i < data["cameras"].length; i++) {
            let camInfo = data["cameras"][i];

            let w = camInfo.width;
            let h = camInfo.height;
            let camera = new Camera(w,h);
            camera.setFOV((camInfo.fieldOfView == undefined) ? 30 : camInfo.fieldOfView);
            //camera.setOrigin()
            camera.setPosition((camInfo.position == undefined) ? [0,0,0] : camInfo.position);
            camera.setRotation((camInfo.rotation == undefined) ? [0,0,0] : camInfo.rotation);
            camera.init();

            this.cameras.push(camera);

            if (camInfo.hasOwnProperty('relativeTo')) {
                // Updating objects with relative positionning;
                let params = camInfo.relativeTo.split('.');
                let relative = {};
                relative.dest = this.cameras[i];
                relative.src  = this[params[0]][params[1]];
                relative.srcProperty = params[2];
                this.relatives.push(relative);
            }

            this.scene.add(camera.camera);
            this.scene.add(camera.cameraHelper);
        }
    }

    this.loadingDone = true;
}

Scene3D.prototype.loadOBJ = async function(object){
    let mesh = await Loaders.obj(global.appRootDir() + "/models/objects/" + object.file);
    this.setMeshObjectProperties(mesh,object);
    this.scene.add( mesh );
}

Scene3D.prototype.loadSTL = async function(object){
    let mesh = await Loaders.stl(global.appRootDir() + "/models/objects/" + object.file, object.color);
    this.setMeshObjectProperties(mesh,object);
    this.scene.add( mesh );
}

Scene3D.prototype.loadDAE = async function(object){
    let mesh = await Loaders.dae(global.appRootDir() + "/models/objects/" + object.file);
    this.setMeshObjectProperties(mesh,object);
    this.scene.add( mesh );
}

Scene3D.prototype.setMeshObjectProperties = function(mesh,object){
    if (object.scale){
        mesh.scale.set(object.scale[0],object.scale[1],object.scale[2]);
    }

    if (object.position){
        mesh.position.set(object.position[0],object.position[1],object.position[2]);
    }

    if (object.rotation){
        mesh.rotation.set(object.rotation[0],object.rotation[1],object.rotation[2]);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
}

exports.Scene3D = Scene3D;

// code from 
// https://stackoverflow.com/questions/33152132/three-js-collada-whats-the-proper-way-to-dispose-and-release-memory-garbag

function disposeNode (node)
{
    if (node instanceof THREE.Mesh)
    {
        if (node.geometry)
        {
            node.geometry.dispose ();
        }

        if (node.material)
        {
            if (node.material instanceof THREE.MeshFaceMaterial)
            {
                for(let i = node.material.materials.length-1; i >=0; i--)
                {
                    let mtrl = node.material.materials[i];
                    if (mtrl.map)           mtrl.map.dispose ();
                    if (mtrl.lightMap)      mtrl.lightMap.dispose ();
                    if (mtrl.bumpMap)       mtrl.bumpMap.dispose ();
                    if (mtrl.normalMap)     mtrl.normalMap.dispose ();
                    if (mtrl.specularMap)   mtrl.specularMap.dispose ();
                    if (mtrl.envMap)        mtrl.envMap.dispose ();

                    mtrl.dispose ();    // disposes any programs associated with the material
                };
            }
            else
            {
                if (node.material.map)          node.material.map.dispose ();
                if (node.material.lightMap)     node.material.lightMap.dispose ();
                if (node.material.bumpMap)      node.material.bumpMap.dispose ();
                if (node.material.normalMap)    node.material.normalMap.dispose ();
                if (node.material.specularMap)  node.material.specularMap.dispose ();
                if (node.material.envMap)       node.material.envMap.dispose ();

                node.material.dispose ();   // disposes any programs associated with the material
            }
        }
    }
}   // disposeNode

function disposeHierarchy (node, callback)
{
    for (var i = node.children.length - 1; i >= 0; i--)
    {
        var child = node.children[i];
        disposeHierarchy (child, callback);
        callback (child);
    }
}