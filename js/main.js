import * as CANNON from './libs/cannon.js';
import './libs/OBJLoader.js';

import './libs/cannonDebugRenderer.js';
import './libs/OrbitControls.js';

let scene, renderer, camera, car, road, turnRoad, world, controls, cannonDebugRenderer, ground, groundBody;

const ctx = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true });

let carBodys;
let roadArr = [];
let roadBodys = [];
let roadCollisions = [];

const timeStep = 1 / 60;

// 动画变量
let key = 0;
let maxKey = 10;
let movekey = 'z';
let startKey = false;

const rotating = new CANNON.Quaternion();
rotating.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -4.73);

const loopRoadConfig = {
    r1: ['r1', 'r3'],
    r2: ['r2', 'r4'],
    r3: ['r2', 'r4'],
    r4: ['r1', 'r3']
};

/**
 * 游戏主函数
 */
export default class Main {
    constructor() {
        // 初始化3D世界
        this.initThree();
        // 初始化物理世界
        this.initCannon();
        // 创建车辆
        this.createCar();
        // 创建直路
        this.createRoad();
        // 创建弯路
        this.createTurnRoad();
        // 创建地板
        this.createGroundBody();
        // 渲染
        this.loop();

        document.addEventListener('touchstart', this.handleMouseStart.bind(this), false);

        setTimeout(() => {
            startKey = true;
            this.updateMaxKey();
        }, 3000);
    }

    updateMaxKey() {
        if (!startKey) return false;
        maxKey += 1;
        setTimeout(() => {
            this.updateMaxKey();
        }, 1000);
    }

    /**
     * 初始化3D世界
     * */
    initThree() {
        scene = new THREE.Scene()
        renderer = new THREE.WebGLRenderer({ context: ctx, canvas: canvas });

        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        const cameraAspect = winWidth / winHeight;

        renderer.setSize(winWidth, winHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        console.log("屏幕尺寸: " + winWidth + " x " + winHeight);

        camera = new THREE.PerspectiveCamera(75, cameraAspect, .1, 10000000);
        camera.position.set(-16.738086885462103, 40.533387653514225, 28.513221776822927);
        camera.rotation.set(-0.9577585082113045, -0.3257201862210706, -0.42691147594250245);

        // 添加环境光
        const ambientLight = new THREE.AmbientLight(0x999999);
        scene.add(ambientLight);

        // 添加投射光
        const directionalLight = new THREE.DirectionalLight(0xcccccc);
        directionalLight.position.set(0, 1200, 1000).normalize();
        scene.add(directionalLight);

        // 摄像机调试
        controls = new THREE.OrbitControls(camera);
    }

    /**
     * 初始化物理世界
     * */
    initCannon() {
        world = new CANNON.World();
        world.quatNormalizeSkip = 0;
        world.quatNormalizeFast = false;

        // 重力设置为99
        world.gravity.set(0, -99, 0);
        world.broadphase = new CANNON.NaiveBroadphase();

        // 显示物理世界
        cannonDebugRenderer = new THREE.CannonDebugRenderer(scene, world);
    }

    /**
     * 创建地板
     * */
    createGroundBody() {
        const metal_texture = new THREE.TextureLoader().load("images/metal.jpg")
        metal_texture.wrapS = THREE.RepeatWrapping;
        metal_texture.wrapT = THREE.RepeatWrapping;
        metal_texture.repeat.set(1,1);

        // 地面
        const ground_material = new THREE.MeshBasicMaterial({ map: metal_texture })
        ground = new THREE.Mesh(new THREE.BoxGeometry(30000, 1, 30000), ground_material)
        ground.receiveShadow = true;
        ground.castShadow = true;
        scene.add(ground);

        const groundShape = new CANNON.Plane();
        groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);

        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);

        world.add(groundBody);
    }

    /**
     * 创建车模型
     */
    createCar() {
        const material = "https://static.cdn.24haowan.com/24haowan/test/js/car2.png";
        const model = 'https://static.cdn.24haowan.com/24haowan/test/js/car4.obj';

        this.createObj(model, material, (obj) => {
            car = obj;

            car.scale.set(1, 1, 1);

            car.position.set(13, 15, 0);
            // car.position.x = 40;
            // car.position.z = 5;

            // Create boxes
            var mass = 5;
            var boxShape = new CANNON.Box(new CANNON.Vec3(3, 3, 5));

            let metal_texture = new THREE.TextureLoader().load("images/metal.jpg")

            carBodys = new CANNON.Body({ mass: 2, shape: boxShape });
            carBodys.position.set(car.position.x, car.position.y, 0);

            world.add(carBodys);

            scene.add(car);
        });
    }

    /**
     * 创建直线道路
     */
    createRoad() {
        const material = "https://static.cdn.24haowan.com/24haowan/test/js/road01.jpg";
        const model = 'https://static.cdn.24haowan.com/24haowan/test/js/newroad.obj';

        this.createObj(model, material, (obj) => {
            road = obj;

            road.scale.set(3, 3, 3);
        });
    }

    /**
     * 创建转弯道路
     */
    createTurnRoad() {
        const material = "https://static.cdn.24haowan.com/24haowan/test/js/road01.jpg";
        const model = 'https://static.cdn.24haowan.com/24haowan/test/js/turnRoad22.obj';

        this.createObj(model, material, (obj) => {
            turnRoad = obj;
            turnRoad.scale.set(3, 3, 3);
        });
    }

    /**
     * 创建模型
     */
    createObj(model, material, callback) {
        // const manager = new THREE.LoadingManager();
        // manager.onProgress = (item, loaded, total) => {
        //   console.log(item, loaded, total);
        // };

        // const texture = new THREE.Texture();
        // const imgLoader = new THREE.ImageLoader(manager);
        // imgLoader.load(material, (image) => {
        //   texture.image = image;
        //   texture.needsUpdate = true;
        // });

        var texture = THREE.ImageUtils.loadTexture(material);

        const objLoader = new THREE.OBJLoader();
        objLoader.load(model, (obj) => {
            console.log('加载模型: ', model);
            // var materialObj = new THREE.MeshBasicMaterial({
            //   vertexColors: THREE.FaceColors,
            //   overdraw: 0.5
            // });

            obj.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.material.map = texture;
                }
            });

            callback(obj);
        }, (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        }, (err) => {
            console.log('发生了错误: ', model, err);
        });
    }

    /**
     * 获取最后未知的元素
     */
    getLastRoad() {
        try {
            const lastRoad = roadArr[roadArr.length - 1];
            const position = lastRoad.position;
            const size = lastRoad.size;
            const rang = lastRoad.rang;
            const boxType = lastRoad.boxType;

            return {
                position,
                size,
                rang,
                boxType
            }
        } catch (err) {
            return {
                position: { x: 0, y: 0, z: 0 },
                size: { width: 0, height: 0 },
                rang: { x: 0, z: 0 },
                boxType: 'r1'
            }
        }
    }

    /**
     * 返回r模型(直路)
     */
    r() {
        const roadObj = road.clone();

        const roadBodyShape = new CANNON.Box(new CANNON.Vec3(17, 1.5, 12.5));
        const roadLeftShape = new CANNON.Box(new CANNON.Vec3(1.5, 5, 12.5));
        const roadRightShape = new CANNON.Box(new CANNON.Vec3(1.5, 5, 12.5));

        const roadBody = new CANNON.Body({ mass: 0, shape: roadBodyShape, position: new CANNON.Vec3(roadObj.position.x, 2.2, roadObj.position.z) });
        const roadBoths = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(roadObj.position.x, 5, roadObj.position.z) });
        roadBoths.addShape(roadLeftShape, new CANNON.Vec3(-18.5, 0, 0));
        roadBoths.addShape(roadRightShape, new CANNON.Vec3(17, 0, 0));

        roadBoths.addEventListener("collide", function (e) {
            startKey = false;
            console.log('boom!');
        });

        world.add(roadBody);
        world.add(roadBoths);

        roadBodys.push(roadBody);
        roadCollisions.push(roadBoths);
        roadArr.push(roadObj);

        scene.add(roadObj);

        return {
            body: roadObj,
            physical: {
                floor: roadBody,
                boths: roadBoths
            }
        }
    }

    /**
     * 返回t模型(弯路)
     */
    t() {
        const roadObj = turnRoad.clone();

        const roadBody1Shape = new CANNON.Box(new CANNON.Vec3(17, 1.5, 37));
        const roadBody2Shape = new CANNON.Box(new CANNON.Vec3(17, 1.5, 27));

        const collide1Shape = new CANNON.Box(new CANNON.Vec3(1.5, 5, 36));
        const collide2Shape = new CANNON.Box(new CANNON.Vec3(1.5, 5, 20.5));
        const collide3Shape = new CANNON.Box(new CANNON.Vec3(1.5, 5, 26));
        const collide4Shape = new CANNON.Box(new CANNON.Vec3(1.5, 5, 44));

        const roadBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(0, 2.2, 0) });
        const roadBoths = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(0, 5, roadObj.position.z - .5) });

        roadBody.addShape(roadBody1Shape, new CANNON.Vec3(0, 0, -12));
        roadBody.addShape(roadBody2Shape, new CANNON.Vec3(42, 0, -30), rotating);
        roadBoths.addShape(collide1Shape, new CANNON.Vec3(-18.5, 0, -11));
        roadBoths.addShape(collide2Shape, new CANNON.Vec3(17, 0, 5));
        roadBoths.addShape(collide3Shape, new CANNON.Vec3(43, 0, -14), rotating);
        roadBoths.addShape(collide4Shape, new CANNON.Vec3(25, 0, -50), rotating);

        roadBoths.addEventListener("collide", function (e) {
            startKey = false;
            console.log('boom!');
        });

        world.add(roadBody);
        world.add(roadBoths);

        roadBodys.push(roadBody);
        roadCollisions.push(roadBoths);
        roadArr.push(roadObj);

        scene.add(roadObj);

        return {
            body: roadObj,
            physical: {
                floor: roadBody,
                boths: roadBoths
            }
        }
    }

    /**
     * 直路竖向模型
     */
    r1(key) {
        const { size, position, rang, boxType } = this.getLastRoad();
        const { body, physical: { floor, boths } } = this.r();

        // 模型原点偏移量
        body.rang = { x: 15, z: -7 };
        // 模型尺寸(根据原点位置)
        body.size = { width: 38.5, height: 25 };

        let x = position.x - rang.x + body.rang.x - body.size.width;
        let z = position.z - rang.z + body.rang.z - size.height;

        x += key === 0 ? body.size.width : size.width;

        body.position.set(x, 0, z);
        floor.position.set(x, floor.position.y, z);
        boths.position.set(x, boths.position.y, z);
        body.boxType = 'r1';
    }


    /**
     * 直路横向模型
     */
    r2(key) {
        const { size, position, rang, boxType } = this.getLastRoad();
        const { body, physical: { floor, boths } } = this.r();
        body.size = { width: 25, height: 38.5 };
        body.rang = { x: 7, z: -13.5 };
        body.boxType = 'r2';

        // console.log(size, position, rang, boxType);

        const x = position.x - rang.x + body.rang.x - body.size.width + size.width + body.size.width;
        const z = body.rang.z + body.size.height + position.z - rang.z - size.height;

        body.position.set(x, 0, z);
        body.rotation.set(0, 4.73, 0);

        floor.position.set(x, floor.position.y, z);
        boths.position.set(x, boths.position.y, z);

        floor.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -4.7);
        boths.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -4.7);
    }

    /**
     * 弯道直向模型
     */
    r3(key) {
        const { size, position, rang, boxType } = this.getLastRoad();
        const { body, physical: { floor, boths } } = this.t();

        // console.log(size, position, rang, boxType);

        body.size = { width: 89, height: 76 };
        body.rang = { x: 15, z: -20 };
        body.boxType = 'r3';

        let x = position.x - rang.x + body.rang.x;
        const z = body.rang.z + body.size.height + position.z - rang.z - size.height - body.size.height;

        boxType === 'r4' && (x +=  size.width - size.width2);

        body.position.set(x, 0, z);
        floor.position.set(x, floor.position.y, z);
        boths.position.set(x, boths.position.y, z);

    }
    /**
     * 弯道横向模型
     */
    r4(key) {
        const { size, position, rang, boxType } = this.getLastRoad();
        const { body, physical: { floor, boths } } = this.t();
        body.size = { width: 89, width2: 39, height: 76, height2: 38 };
        body.rang = { x: 64, z: -46 };
        body.boxType = 'r4';

        // console.log(key, size, position, rang, boxType);

        body.rotation.set(0, 3.14, 0);

        const x = position.x - rang.x + body.rang.x + size.width;
        const z = body.rang.z + body.size.height2 + position.z - rang.z - size.height;

        floor.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -3.14);
        boths.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -3.14);

        // 第一赛道偏移量28
        body.position.set(x, 0, z);
        floor.position.set(x, floor.position.y, z);
        boths.position.set(x, boths.position.y, z);
    }

    /**
     * 更新路路面
     */
    updateRoad() {
        if (road && turnRoad && key < maxKey) {
            const { boxType } = this.getLastRoad();
            const currentRoadConfig = loopRoadConfig[boxType];
            const random = Math.round(Math.random(0, 1));
            this[currentRoadConfig[random]](key);

            // if (key < 1) {
            //     this.r3(key);
            // } else if (key === 1) {
            //     this.r4(key);
            // } else if (key === 2) {
            //     this.r4(key);
            // } else if (key === 3) {
            //     this.r3(key);
            // } else if (key === 4) {
            //     this.r2(key);
            // } else if (key === 5) {
            //     this.r4(key);
            // } else if (key === 6) {
            //     this.r3(key);
            // } else if (key === 7) {
            //     this.r2(key);
            // } else if (key === 8) {
            //     this.r2(key);
            // } else {
            //     this.r4(key);
            // }

            key += 1;
        }
    }

    /**
     * 点击转弯函数
     */
    handleMouseStart() {
        if (startKey) {
            if (movekey === 'x') {
                carBodys.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
                movekey = 'z';
            } else {
                carBodys.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 4.73);
                movekey = 'x';
            }
        }
    }

    /**
     * 更新车辆和摄像机未知
     */
    updateAnimation() {
        if (startKey) {
            if (movekey === 'x') {
                car.position.x += 0.5;
                carBodys.position.x += 0.5;
                camera.position.x += 0.5;
            } else {
                car.position.z -= 0.5;
                carBodys.position.z -= 0.5;
                camera.position.z -= 0.5;
            }

            // carBodys.position.x += 1;
        }

        cannonDebugRenderer.update();

        renderer.setClearColor('#428bca', 1.0);
        renderer.render(scene, camera)
    }

    updateWorld() {
        world.step(timeStep);
        // ground.position.copy(groundBody.position);
        // ground.quaternion.copy(groundBody.quaternion);
        if (car) {
            // console.log(car.position, carBodys.position);
            car.position.copy(carBodys.position);
            car.quaternion.copy(carBodys.quaternion);
        }
    }

    // 实现帧循环
    loop() {
        this.updateWorld();
        this.updateRoad();
        this.updateAnimation();

        requestAnimationFrame(this.loop.bind(this), canvas);
    }
}
