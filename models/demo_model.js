var THREE = require('three');

var scene3d = document.getElementById("container");

// SCENE

scene = new THREE.Scene();

// CAMERA 

camera = new THREE.PerspectiveCamera(45, scene3d.offsetWidth / scene3d.offsetHeight, 0.1, 100);
camera.position.x = 17;
camera.position.y = 12;
camera.position.z = 13;
camera.lookAt(scene.position);

// RENDERER

renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0x000, 1.0);
renderer.setSize(scene3d.offsetWidth, scene3d.offsetHeight);

// GEOMETRY & MATERIALS

var cubeGeometry = new THREE.BoxGeometry(3, 3, 3);
var cubeMaterial = new THREE.MeshLambertMaterial({color: 0xff55ff});
var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);
cube.position.z = 4;

var floorGeometry = new THREE.BoxGeometry(30, 1, 30);
var floorMaterial = new THREE.MeshBasicMaterial({color: 0x656587});
var floor = new THREE.Mesh(floorGeometry, floorMaterial);
scene.add(floor);
floor.position.y = -3;
floor.receiveShadow = true;

// LIGHT

var spot1 = new THREE.SpotLight(0xffffff);
spot1.position.set(10, 100, -50);
scene.add(spot1);

// FINISH SCENE SETUP

// document.body.appendChild(scene3d.domElement);
scene3d.appendChild(renderer.domElement);
renderer.render(scene, camera);

// Render Loop
var render = function () {
  requestAnimationFrame( render );

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  // Render the scene
  renderer.render(scene, camera);
};

window.addEventListener( 'resize', onWindowResize, false );
function onWindowResize(){
    camera.aspect = scene3d.offsetWidth / scene3d.offsetHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( scene3d.offsetWidth, scene3d.offsetHeight );
}


render();

var updateModel = function(arg){
  cmd = arg[0];
  if (cmd == 'SETPOS'){
    cube.position.x = arg[1];
  }
}

exports.updateModel = updateModel;