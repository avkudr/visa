var CameraController = function(camera){
    this.camera = camera;
}

CameraController.prototype.setCamera = function(camera){
    this.camera = camera;
}

CameraController.prototype.handle = function(arg){
    const cmd  = arg[0];
    const args = arg[1];

    switch(cmd) {
        case 'GETCALIBMAT':{
            return this.camera.getCalibMatrix();
        }
        case 'GETIMAGEWIDTH':{
            return this.camera.width;
        }
        case 'GETIMAGEHEIGHT':{
            return this.camera.height;
        }
        case 'GETIMAGE':{
            return this.camera.getImage();
        }    
        default:
            return 'unknown command';
    }
}

exports.CameraController = CameraController;