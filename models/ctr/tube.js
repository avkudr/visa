var THREE = require('three');

var Tube = class {

    constructor(curvature = 0.005, length = 100.0, phi = 0.0, radius = 2, color = 0xff8000) {
        console.log("Creating a tube");
        this.curvature = curvature;
        this.length = length;
        this.radius = radius;
        this.color = color;
        this.phi = phi;

        this.originPosition = new THREE.Matrix4;
        this.originPosition.identity();

        this.updateBevelObject();
        //spline
        this.nbPtsSpline = 15;
        var geometry = this.getGeometry();
        //createMesh
        this.material = new THREE.MeshLambertMaterial({ color: this.color, wireframe: false });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.matrixAutoUpdate = false;
    }

    setOrigin(mat){
        this.originPosition = mat;
    }

    setPhi(phi) {
        this.phi = phi;
    }

    setLength(l) { 
        this.length = l;
    }

    setRadius(r) { 
        this.radius = r * 1; 
        this.updateBevelObject();
    }

    setCurvature(r) {
        this.curvature = r;
    }

    updateBevelObject() {
        //bevel object
        var pts = [], numPts = 5;
        for (var i = 0; i < numPts * 2; i++) {
            var a = i / numPts * Math.PI;
            pts.push(new THREE.Vector2(Math.cos(a) * this.radius, Math.sin(a) * this.radius));
        }
        this.circle = new THREE.Shape(pts);
    }

    updateGeometry(){
        if (this.mesh !== undefined){
            if ( this.length <= 0){
                this.mesh.visible = false;
            }else{
                this.mesh.visible = true;
                this.mesh.geometry = this.getGeometry();
            }
        }
    }
    
    getGeometry() {
        //recalculate the spline 
        
        var maxAngle = this.length * this.curvature;
        var R = 1 / this.curvature;

        var Rz = new THREE.Matrix4().makeRotationZ(this.phi);

        var splinePts = [];
        if (maxAngle != 0.0){
            for (var i = 0; i < 0.95*maxAngle; i += maxAngle / this.nbPtsSpline) {
                var curvePoint = 
                    new THREE.Vector3(R * (1 - Math.cos(i)), 0, R * Math.sin(i))
                    .applyMatrix4(Rz)
                    .applyMatrix4(this.originPosition);
                splinePts.push(new THREE.Vector3(curvePoint.x,curvePoint.y,curvePoint.z));
            }
        } else {
            console.error("Zero curvature is not implemented... yet");
        }

        var curvePoint = new THREE.Vector3(R * (1 - Math.cos(maxAngle)), 0, R * Math.sin(maxAngle));
        curvePoint.applyMatrix4(Rz).applyMatrix4(this.originPosition);
        splinePts.push(new THREE.Vector3(curvePoint.x,curvePoint.y,curvePoint.z));

        this.spline = new THREE.CatmullRomCurve3(splinePts);

        this.extrudeSettings = {
            steps: 20,
            amount: 16,
            bevelEnabled: true,
            extrudePath: this.spline
        };

        return new THREE.ExtrudeGeometry(this.circle, this.extrudeSettings);
    }
}

exports.Tube = Tube;