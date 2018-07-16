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

    it('tool transform (fMe)', async () => {  
        robot.setJointPos([0,-1.570000052,3.029999971,0,1.539999962,0]);
        await robot.init();
        let M = robot.getToolTransform();
        let fMe = new THREE.Matrix4();

        fMe.set (-0.9899924798,    -0,   0.1411201261,   0.3840822861,
                             0,     1,              0,              0,
                 -0.1411201261,     0,  -0.9899924798,   0.5472835408,
                             0,     0,              0,              1);

        expect(M).to.be.deep.almost(fMe);
    });

    it('robot geometric jacobian values #1 (fJe)', async () => {  
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

    it('robot geometric jacobian values #2 (fJe)', async () => {  
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

    // it('robot analytical jacobian values (eJe)', async () => {  
    //     robot.setJointPos([0.43,-2.64,4.10,-0.27,1.2828,-0.424]);
    //     await robot.init();
    //     let J = robot.get_eJe();
    //     let fJe = new Array(6);
    //     for (let i = 0; i < 6; i++){
    //         fJe[i] = new Array(robot.nbDOFs);        
    //     }

    //     eJe[0] = [-0.09681829508,0.4639377997,0.4564989342,0.01007839076,0.08075052911,8.67361738e-18];
    //     eJe[1] = [0.3893926229,0.1170785409,0.1320629325,0.005003325821,-0.1626588825,-6.938893904e-18];
    //     eJe[2] = [-0.0207377694,-0.1761878417,0.0932933845,0,0,0];
    //     eJe[3] = [-0.3383154983,-0.2658925564,-0.2658925564,-0.02755135364,0.895698692,0];
    //     eJe[4] = [-0.03403499934,0.9620811498,0.9620811498,0.05549774649,0.4446615039,4.163336342e-17];
    //     eJe[5] = [0.9404170577,-0.0608359248,-0.0608359248,0.9980786157,5.551115123e-17,1];

    //     expect(J).to.be.deep.almost(eJe);
    // });
});