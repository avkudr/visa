var THREE = require('three');

function ArcCurve(length, curvature, phi) {
    THREE.Curve.call( this );
    this.L = length;
    this.curvature = curvature;
    this.phi = phi;
}

ArcCurve.prototype = Object.create( THREE.Curve.prototype );
ArcCurve.prototype.constructor = ArcCurve;
ArcCurve.prototype.updateArc = function(length, curvature, phi){
    this.L = length;
    this.curvature = curvature;
    this.phi = phi;
}
ArcCurve.prototype.getPoint = function ( t ) {
    let tx,ty,tz;
    if ( this.curvature == 0){
        tx = 0;
        ty = 0;
        tz = this.L * t;
    }else{
        let maxAngle = this.L * this.curvature;
        let r = 1.0 / this.curvature;
        tx = r * (1 - Math.cos(maxAngle * t));
        ty = 0;
        tz = r * Math.sin(maxAngle * t);
    }
    let axis = new THREE.Vector3( 0, 0, 1); //rotate around Z

    return new THREE.Vector3( tx, ty, tz ).applyAxisAngle( axis, this.phi );
};

var Tube = class {

    constructor(curvature = 0.005, length = 100.0, phi = 0.0, radius = 2, color = 0xff8000) {
        //console.log("Creating a tube");
        this.curvature = curvature;
        this.length = length;
        this.radius = radius;
        this.color = color;
        this.phi = phi;

        this.originPosition = new THREE.Matrix4;
        this.originPosition.identity();

        //createMesh
        this.path = new ArcCurve(this.length,this.curvature,this.phi);
        this.path.verticesNeedUpdate = true;
        this.geometry = new THREE.TubeBufferGeometry( this.path, 50, this.radius, 16, false );
        this.geometry.needsUpdate = true;
        this.material = new THREE.MeshPhongMaterial( {
            color: this.color,
            emissive: 0x072534,
            side: THREE.DoubleSide
        } );
        this.mesh = new THREE.Mesh(this.geometry, this.material);
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
    }

    setCurvature(r) {
        this.curvature = r;
    }

    updateGeometry(){
        if (this.mesh !== undefined){
            if ( this.length <= 0){
                this.mesh.visible = false;
            }else{
                this.mesh.visible = true;
                this.updateGeometryMesh();
            }
        }
    }
    
    updateGeometryMesh() {
        //recalculate the spline 
        this.path.updateArc(this.length, this.curvature, this.phi);
        //this.path.applyMatrix4(this.originPosition);

        this.geometry.dispose();
        this.geometry.copy(new THREE.TubeBufferGeometry( this.path, 100, this.radius, 16, false ));
        this.geometry.applyMatrix(this.originPosition);
        this.geometry.needsUpdate = true;
    }
}

exports.Tube = Tube;