
/*
    add: near far cliping distances to model.json
*/

const THREE = require('three');

THREE.Matrix4.prototype.normalizeRotations = function () {
    for (let i = 0; i < 3; i++) {

        let x = this.elements[4 * i + 0];
        let y = this.elements[4 * i + 1];
        let z = this.elements[4 * i + 2];

        let norm = Math.sqrt(x * x + y * y + z * z);

        this.elements[4 * i + 0] *= 1 / norm;
        this.elements[4 * i + 1] *= 1 / norm;
        this.elements[4 * i + 2] *= 1 / norm;
    }
}

var Camera = function () {
    this.containter = 0;
    this.renderer = 0;
    this.cam = {};

    this.height = 320;
    this.width = 240;
    this.fieldOfView = 30;
    this.near = 0.01;
    this.far = 200;

    this.cameraHelper = {};
    this.renderer = {};

    this.origin = new THREE.Matrix4();
    this.position = [0, 0, 0];
    this.rotation = [0, 0, 0];
}

Camera.prototype.setFOV = function (f) {
    this.fieldOfView = f;
}

Camera.prototype.setWidth = function (w) {
    this.width = w;
}

Camera.prototype.setHeight = function (h) {
    this.height = h;
}

Camera.prototype.setPosition = function (p) {
    this.position = p;
}

Camera.prototype.setRotation = function (r) {
    this.rotation = r;
}

Camera.prototype.init = function () {
    this.camera = new THREE.PerspectiveCamera(
        this.fieldOfView,
        this.width / this.height, this.near, this.far);

    this.camera.matrixAutoUpdate = false;
    this.cameraHelper = new THREE.CameraHelper(this.camera);
    this.cameraHelper.visible = false;

    this.renderer = new THREE.WebGLRenderer({
        preserveDrawingBuffer: true,
        antialias: true
    });

    this.renderer.domElement.id = 'camera-image';
    //this.renderer.setPixelRatio(this.width / this.height);
    this.renderer.setSize(this.width, this.height);
    this.renderer.domElement.style.padding = '0px';
    this.renderer.domElement.style.margin = '0px';
    this.renderer.domElement.style.overflow = 'hidden';
    this.renderer.setClearColor(new THREE.Color(0x222222));

    //this.cameraViewContainer.appendChild(renderer.domElement);

    console.log('Camera calib matrix:');
    console.log(this.getCalibMatrix());

    this.updatePose();
}

Camera.prototype.updatePose = function () {
    let mat1 = new THREE.Matrix4;
    mat1 = this.origin;
    let mat2 = new THREE.Matrix4;
    mat2.makeTranslation(this.position[0], this.position[1], this.position[2]);
    let mat3 = new THREE.Matrix4;
    let euler = new THREE.Euler(this.rotation[0], this.rotation[1], this.rotation[2], 'XYZ');
    mat3.makeRotationFromEuler(euler);

    //camera -> z axis looking forward
    let mat4 = new THREE.Matrix4;
    mat4.makeRotationX(Math.PI);
    let res = new THREE.Matrix4;
    res.identity();

    res.multiply(mat1);
    res.multiply(mat2);
    res.multiply(mat3);
    res.multiply(mat4);

    res.normalizeRotations();

    this.camera.matrix.copy(res);
    this.camera.updateMatrixWorld(true);
}

Camera.prototype.update = function () {
    this.updatePose();
}

Camera.prototype.toggleImageVisibility = function () {
    if (this.renderer.domElement.style.visibility == 'hidden') {
        this.renderer.domElement.style.visibility = 'visible';
    } else {
        this.renderer.domElement.style.visibility = 'hidden';
    };
}

Camera.prototype.getImage = function () {
    try {
        if (this.renderer === undefined) {
            return 'NO IMAGE TO SEND';
        } else {
            let img = this.renderer.domElement.toDataURL();
            console.log('Image length: ' + img.length);
            if (img.length < Infinity) {
                return img;
            } else {
                return 'Couldnt get image from canvas';
            }
        }
    }
    catch (e) {
        return 'ERROR';
    }
};

Camera.prototype.getCalibMatrix = function(){
    let K = new THREE.Matrix3;

    K.elements[0] = this.camera.getFocalLength() * this.width / this.camera.getFilmWidth();
    K.elements[1] = 0;
    K.elements[2] = 0;

    K.elements[3] = 0;
    K.elements[4] = this.camera.getFocalLength() * this.height / this.camera.getFilmHeight();
    K.elements[5] = 0;

    K.elements[6] = this.width / 2;
    K.elements[7] = this.height / 2;
    K.elements[8] = 1;

    console.log(K);
    return K.elements.toString();
}

exports.Camera = Camera;