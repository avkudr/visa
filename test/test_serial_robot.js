const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const chaiAlmost = require('chai-almost');
chai.use(chaiAlmost(1e-3));

global.appRootDir = () => {return __dirname + "/../"};
global.appLibsDir = () => {return global.appRootDir() + "/3rdparty"};
global.appModelsDir = () => {return global.appRootDir() + "/models"};

const {SerialRobot} = require( __dirname + "/../models/robots/SerialRobot.js" );
const {KukaIIWA} = require( __dirname + "/../models/robots/KukaIIWA/KukaIIWA.js" );
const {Viper650} = require( __dirname + "/../models/robots/Viper650/Viper650.js" );
const THREE = require('three');

//---------------------------------------------------------------------- */
//            default serial robot
//---------------------------------------------------------------------- */

describe('Serial robot: default', () => {

    let robot = new SerialRobot([
        // sigma, Tx, Ty, Tz, Rx, Ry, Rz    
        [1, 0, 0, 10.0, 0, 0, 0], //base -> q0      
        [1, 0, 0, 15.0, 0, 0, 0], //q0   -> q1	  
        [1, 0, 0, 15.0, 0, 0, 0], //q1   -> q2
        [1, 0, 0, 15.0, 0, 0, 0]  //q2   -> end-effector
    ]);
    
    let tmp = robot.init();

    it('has 3 dofs', () => {    
        assert.equal(3, robot.nbDOFs);
        assert.property(robot,'q0');
        assert.property(robot,'q1');
        assert.property(robot,'q2');
    });

    it('tool in right position', () => {    
        robot.setJointPos([0,0,0]);
        let T = robot.getToolTransform();
        let Texpected = new THREE.Matrix4();
        Texpected.elements[14] = 55 / 1000;
        expect(T).to.be.deep.almost(Texpected);
    }); 

    it('tool pose is independent of scale', () => {    
        robot.setJointPos([0,0,0]);
        robot.setScale(0.1);
        let T = robot.getToolTransform();

        robot.setScale(1);
        robot.init();
        let T1 = robot.getToolTransform();

        assert.deepEqual(T,T1);
    }); 

    it('respecting limits', () => {   
        let pos = [0,0,0]; 
        robot.setJointPos(pos);
        robot.setJointPos([50000,-23434,0.64]);
        pos[0] = robot.jointLimits[0][1];
        pos[1] = robot.jointLimits[0][0];
        pos[2] = 0.64;
        assert.deepEqual(robot.getJointPos(),pos);
    });
});

//---------------------------------------------------------------------- */
//            KUKA iiwa
//---------------------------------------------------------------------- */

describe('Serial robot: KukaIIWA', () => {

    let robot;

    before( async () =>{
        // runs before all tests in this block
        robot = new KukaIIWA();
        await robot.init();
    });

    it('has 7 dofs', () => {    
        assert.equal(7, robot.nbDOFs);
        assert.property(robot,'q0');
        assert.property(robot,'q6');
    });

    it('tool in right position', () => {    
        robot.setJointPos([0,0,0,0,0,0,0]);
        let T = robot.getToolTransform();
        let Texpected = new THREE.Matrix4();
        Texpected.elements = [ 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1.2658,1 ];
        expect(T.elements).to.be.deep.almost(Texpected.elements);
    }); 

    it('tool pose is independent of scale', async () => {    
        robot.setJointPos([0.24,-0.48,0,1.57,0.03,1.72,0]);
        robot.setScale(0.1);
        await robot.init();
        let T = robot.getToolTransform();

        robot.setScale(1);
        await robot.init();
        let T1 = robot.getToolTransform();

        assert.deepEqual(T,T1);
    }); 

    it('right size of Jacobian matrix', () => {    
        let J = robot.get_fJe();
        expect(J.length).to.be.equal(6);
        expect(J[0].length).to.be.equal(robot.nbDOFs);
    }); 
});

//---------------------------------------------------------------------- */
//            VIPER-650
//---------------------------------------------------------------------- */

describe('Serial robot: Viper650', () => {

    let robot;

    before( async () =>{
        // runs before all tests in this block
        robot = new Viper650();
        await robot.init();
    });

    it('robot Jacobian values #1 (fJe)', async () => {  
        robot.setJointPos([0,0,0,0,0,0]);
        await robot.init();
        let J = robot.get_fJe();
        let fJe = new Array(6);
        for (let i = 0; i < 6; i++){
            fJe[i] = new Array(robot.nbDOFs);        
        }

        fJe[0] = [0,0.4766,0.4766,0,0.1816,0];
        fJe[1] = [0.255,0,0,0,0,0];
        fJe[2] = [0,-0.18,0.09,0,0,0];
        fJe[3] = [0,0,0,0,0,0];
        fJe[4] = [0,1,1,0,1,0];
        fJe[5] = [1,0,0,1,0,1];

        expect(J).to.be.deep.almost(fJe);
    }); 

    it('robot Jacobian values #2 (fJe)', async () => {  
        robot.setJointPos([0,-1.570000052,3.029999971,0,1.539999962,0]);
        await robot.init();
        let J = robot.get_fJe();
        let fJe = new Array(6);
        for (let i = 0; i < 6; i++){
            fJe[i] = new Array(robot.nbDOFs);        
        }

        fJe[0] = [0,0.2122835408,-0.05771637361,0,-0.1797826343,0];
        fJe[1] = [0.3840822861,0,0,0.1815138906,0,0];
        fJe[2] = [0,-0.3090822861,-0.308867292,0,-0.0256274149,0];
        fJe[3] = [0,0,0,0.9938683544,0,0.1411201261];
        fJe[4] = [0,1,1,0,1,0];
        fJe[5] = [1,0,0,0.1105698604,0,-0.9899924798];

        expect(J).to.be.deep.almost(fJe);
    }); 

    // it('robot Jacobian values (eJe)', async () => {  
    //     robot.setJointPos([0,-1.570000052,3.029999971,0,1.539999962,0]);
    //     await robot.init();
    //     let eJe = robot.get_eJe();

    //     let eJe_ = new Array(6);
    //     for (let i = 0; i < 6; i++){
    //         eJe_[i] = new Array(robot.nbDOFs);        
    //     }

    //     eJe_[0][0] = [0,-0.1665413778,0.100726167,0,0.1816,0];
    //     eJe_[1][0] = [0.3840822861,0,0,0.1815138906,0,0];
    //     eJe_[2][0] = [0,0.3359466189,0.2976313544,0,0,0];
    //     eJe_[3][0] = [-0.1411201261,0,0,-0.9995258294,0,0];
    //     eJe_[4][0] = [0,1,1,0,1,0];
    //     eJe_[5][0] = [-0.9899924798,0,0,0.03079149721,0,1];

    //     expect(eJe).to.be.deep.almost(eJe_);
    // }); 

});