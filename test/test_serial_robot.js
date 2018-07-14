const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const chaiAlmost = require('chai-almost');
chai.use(chaiAlmost(1e-6));

global.appRootDir = () => {return __dirname + "/../"};
global.appLibsDir = () => {return global.appRootDir() + "/3rdparty"};
global.appModelsDir = () => {return global.appRootDir() + "/models"};

const {SerialRobot} = require( __dirname + "/../models/robots/SerialRobot.js" );
const {KukaIIWA} = require( __dirname + "/../models/robots/KukaIIWA/KukaIIWA.js" );
const THREE = require('three');

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
        Texpected.elements[14] = 55;
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

    it('last frame pose = tool pose', () => {   
        robot.setJointPos([0,0,0]);
        let T      = robot.getToolTransform();
        let Tframe = robot.linksAxes[robot.nbDOFs].matrix;
        assert.deepEqual(T,Tframe);
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
        Texpected.elements = [ 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1265.8,1 ];
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
});