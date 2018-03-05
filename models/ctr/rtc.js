const THREE = require('three');
const Tube  = require('./tube.js').Tube;

var ConcentricTubeRobot = class {
    constructor() {
        //default joint values:
        this.alpha1 = 0; //radians
        this.alpha2 = 0;
        this.alpha3 = 0;
        this.rho1 = 0; // m
        this.rho2 = 0;
        this.rho3 = 0;

        this.initFabricationParams();
        this.updateRobotKinematics();
        this.create3Dmodel(); //create3Dmodel
        this.initJointFrames();
    }

    initFabricationParams(){
        this.E = 40e9; // Modulus of elasticity (Young's modulus)
        
        // Tubes' radii
        this.radiiInt = [ // internal   
            (2.668e-3)/2,
            (1.473e-3)/2,
            (0.96e-3)/2
        ];
        this.radiiExt = [ // external  
            (3.112e-3)/2,
            (2.032e-3)/2,
            (1.32e-3)/2
        ];

        // Tubes' moments of inertia
        this.I = new Array(3);
        for(var i = 0; i < this.I.length; i++){
            this.I[i] = Math.PI * ( Math.pow(this.radiiExt[i],4) - Math.pow(this.radiiInt[i],4)) / 4.0; 
        }

        // Fabrication parameters of tubes
        this.tubeKappa  = [0.41,7.2,9.76]; // 1/m - circular precurvatures
        this.tubeLength = [40e-3,155e-3,200e-3]; // m - lengths of curved parts
    }

    setJointPos(q){
        this.alpha1 = q[0];
        this.alpha2 = q[1];
        this.alpha3 = q[2];

        var L1 = this.tubeLength[0] + q[3];        
        var L2 = this.tubeLength[1] + q[4] - L1;        
        var L3 = this.tubeLength[2] + q[5] - L2 - L1;        

        if (L1 >= 0 && L2 >= 0 && L3 >= 0){
            this.rho1   = q[3];
            this.rho2   = q[4];
            this.rho3   = q[5];
            return 'OK';
        } else {
            return 'ERROR';
        }
    }

    getJointPos(){
        return [this.alpha1,this.alpha2,this.alpha3,this.rho1,this.rho2,this.rho3];
    }

    getToolTransform(){
        return this.T[2];
    }

    create3Dmodel(){
      
        // add tubes
        this.tubes = new Array(3);
        // for (var i = 0; i < this.tubes.length; i++){
        //     this.tubes[i] = new Tube.Tube();
        // }
        this.tubes[0] = new Tube(0.1,10,0,2,0xff5000);
        this.tubes[1] = new Tube(0.1,10,0,2,0xff6000);
        this.tubes[2] = new Tube(0.1,10,0,2,0xff8000);

        this.tubes[0].setLength   (this.L[0]        * 1);
        this.tubes[0].setRadius   (this.radiiExt[0] * 1);
        this.tubes[0].setCurvature(this.K[0]        * 1);

        this.tubes[1].setLength   (this.L[1]        * 1);
        this.tubes[1].setRadius   (this.radiiExt[1] * 1);
        this.tubes[1].setCurvature(this.K[1]        * 1);

        this.tubes[2].setLength   (this.L[2]        * 1);
        this.tubes[2].setRadius   (this.radiiExt[2] * 1);
        this.tubes[2].setCurvature(this.K[2]        * 1);
        
        // define tubes placement
        this.tubes[1].setOrigin(this.T[0]);
        this.tubes[2].setOrigin(this.T[1]);

        this.mesh = new THREE.Group();  
        this.mesh.matrixAutoUpdate = false;
        for (var i = 0; i < this.tubes.length; i++) {
            this.mesh.add(this.tubes[i].mesh);
        }
        this.update3Dmodel();
    }

    update3Dmodel(){
        // define tubes placement
        this.tubes[1].setOrigin(this.T[0]);
        this.tubes[2].setOrigin(this.T[1]);

        this.tubes[0].setPhi       ( this.P[0] );
        this.tubes[0].setLength    ( this.L[0] );
        this.tubes[0].setCurvature ( this.K[0] );
        this.tubes[1].setPhi       ( this.P[1] );
        this.tubes[1].setLength    ( this.L[1] );
        this.tubes[1].setCurvature ( this.K[1] );
        this.tubes[2].setPhi       ( this.P[2] );
        this.tubes[2].setLength    ( this.L[2] );
        this.tubes[2].setCurvature ( this.K[2] );

        this.tubes[0].updateGeometry();
        this.tubes[1].updateGeometry();
        this.tubes[2].updateGeometry();
    }

    updateRobotKinematics() {

        var Cte2 = this.E*this.I[1] + this.E*this.I[2];
        var Cte1 = this.E*this.I[0] + Cte2;

        var num2cos = (this.E*this.I[1]*this.tubeKappa[1]*Math.cos(this.alpha2)+
                       this.E*this.I[2]*this.tubeKappa[2]*Math.cos(this.alpha3));
        var num2sin = (this.E*this.I[1]*this.tubeKappa[1]*Math.sin(this.alpha2)+
                       this.E*this.I[2]*this.tubeKappa[2]*Math.sin(this.alpha3));

        // Deformed resultant curvature components
        var ksi1   = (this.E*this.I[0]*this.tubeKappa[0]*Math.cos(this.alpha1) + num2cos) / Cte1;
        var gamma1 = (this.E*this.I[0]*this.tubeKappa[0]*Math.sin(this.alpha1) + num2sin) / Cte1;
        var ksi2   = num2cos / Cte2;
        var gamma2 = num2sin / Cte2;

        // Deformed resultant curvature
        var K1 = Math.sqrt(ksi1*ksi1 + gamma1*gamma1);
        var K2 = Math.sqrt(ksi2*ksi2 + gamma2*gamma2);
        var K3 = this.tubeKappa[2];
        this.K = [K1,K2,K3];
        // Phi, rotation angle around z
        var P1 = Math.atan2(gamma1,ksi1);
        var P2 = Math.atan2(gamma2,ksi2) - P1;
        var P3 = this.alpha3 - P2 - P1;
        this.P = [P1,P2,P3];
        // Section's final lengths due to the translation rho
        var L1 = this.tubeLength[0] + this.rho1;        
        var L2 = this.tubeLength[1] + this.rho2 - L1;        
        var L3 = this.tubeLength[2] + this.rho3 - L2 - L1;        
        this.L = [L1,L2,L3];

        //console.log(this.L);
        // Transformation matrices
        this.T = new Array(3);
        for(var i = 0; i < this.T.length; i++){
            this.T[i] = new THREE.Matrix4;
            this.T[i].set (            Math.cos(this.P[i])*Math.cos(this.K[i]*this.L[i]), 
                 -Math.sin(this.P[i]), Math.cos(this.P[i])*Math.sin(this.K[i]*this.L[i]), 
                         Math.cos(this.P[i])*(1-Math.cos(this.K[i]*this.L[i]))/this.K[i],
                                       Math.sin(this.P[i])*Math.cos(this.K[i]*this.L[i]),
                                                                     Math.cos(this.P[i]), 
                                       Math.sin(this.P[i])*Math.sin(this.K[i]*this.L[i]), 
                         Math.sin(this.P[i])*(1-Math.cos(this.K[i]*this.L[i]))/this.K[i],
                                                          -Math.sin(this.K[i]*this.L[i]),  
                                                                                       0,   
                                                           Math.cos(this.K[i]*this.L[i]),   
                                                 Math.sin(this.K[i]*this.L[i])/this.K[i],
                                                                                       0,             
                                                                                       0,
                                                                                       0,
                                                                                       1);
        } 
        
        this.T[1].premultiply(this.T[0]); // end of tube 2
        this.T[2].premultiply(this.T[1]); // end of tube 3 - tool position
    }

    updateAll() {
        this.updateRobotKinematics();
        this.update3Dmodel();
        this.updateAxisFrames();

        //tranform m in px
        this.mesh.scale.set(1000,1000,1000);
        this.mesh.updateMatrix();
    }

    toggleDisplayFrames(){
        this.axisT1.visible = ! this.axisT1.visible;
        this.axisT2.visible = ! this.axisT2.visible;
        this.axisT3.visible = ! this.axisT3.visible;
    }
    initJointFrames(){
        this.axisT1 = new THREE.AxisHelper(30/1000);
        this.axisT1.matrixAutoUpdate = false;
        this.axisT1.visible = false;
        this.mesh.add(this.axisT1);
        this.axisT2 = new THREE.AxisHelper(30/1000);
        this.axisT2.matrixAutoUpdate = false;
        this.axisT2.visible = false;
        this.mesh.add(this.axisT2);
        this.axisT3 = new THREE.AxisHelper(30/1000);
        this.axisT3.matrixAutoUpdate = false;
        this.axisT3.visible = false;
        this.mesh.add(this.axisT3);
    }

    updateAxisFrames(){
        this.axisT1.matrix.copy(this.T[0]);
        this.axisT2.matrix.copy(this.T[1]);
        this.axisT3.matrix.copy(this.T[2]);
    }
}

exports.ConcentricTubeRobot = ConcentricTubeRobot;