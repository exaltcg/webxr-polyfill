import ARKitWrapper from '../../polyfill/platform/ARKitWrapper.js'
import EditControls from './EditControls.js'
import GeoConverter from './GeoConverter.js'
import API from './mrs_api/src/api/index.js'

const MRS_URL = 'http://13.88.19.161:3000';
const MRS_API = new API(MRS_URL);

const CUBE_SIZE = 0.1;

class App {
    constructor(canvasId) {
        this.showMessage('LOADING...');
        this.mode = EditControls.MODE_VIEW;
        
        this.isDebug = false;
        this.isGalleryLoaded = false;
        this.isObjectsLoaded = false;
        this.deviceId = null;
        this.geoConverter = new GeoConverter();

        this.orientation = null;
        this.fixOrientationMatrix = new THREE.Matrix4();
        this.orientationAngle = 0;

        this.clock = new THREE.Clock();
        this.initScene(canvasId);

        this.cubesNum = 0;
        this.protos = {};
        this.dataOfUser = null;

        this.initAR();

        this.raycaster = new THREE.Raycaster();
        this.registerUIEvents();
    }
    run() {
        let render = (time) => {
            this.render(time);
            window.requestAnimationFrame(render);
        };
        render();
    }
    setMode(mode) {
        this.mode = mode;
        switch (mode) {
            case EditControls.MODE_VIEW:
                document.querySelector('#removeObject').style.display = 'none';
                document.querySelector('#rotate').style.display = 'none';
                if (this.editControls.pickedMesh) {
                    this.updateMRSPosition(this.editControls.pickedMesh);
                }
                break;
            case EditControls.MODE_EDIT_TRANSLATE:
                document.querySelector('#removeObject').style.display = '';
                document.querySelector('#rotate').style.display = '';
                break;
        }
    }
    removePickedMesh() {
        const userData = this.editControls.pickedMesh.userData;
        this.editControls.removePickedMesh();
        this.getPickableMeshes(true);
        if (userData.anchorId && userData.poseId) {
            MRS_API.deleteObject(userData.anchorId, userData.poseId);
        }
    }
    initAR() {
        this.ar = ARKitWrapper.GetOrCreate();
        this.ar.init({
            ui: {
                arkit: {
                    statistics: this.isDebug,
                    plane: true,
                    focus: false,
                    anchors: false,
                    points: false
                },
                custom: {
                    rec: true,
                    rec_time: true,
                    mic: true,
                    build: false,
                    warnings: false,
                    debug: false,
                    browser: false,
                    showUIAtOnce: true
                }
            }
        }).then(this.onARInit.bind(this));

        this.auth();

        this.ar.addEventListener(ARKitWrapper.WATCH_EVENT, this.onARWatch.bind(this));

        this.ar.addEventListener(ARKitWrapper.RECORD_START_EVENT, () => {
            // do something when recording is started
        });

        this.ar.addEventListener(ARKitWrapper.RECORD_STOP_EVENT, () => {
            // do something when recording is stopped
        });

        this.ar.addEventListener(ARKitWrapper.DID_MOVE_BACKGROUND_EVENT, () => {
            this.onARDidMoveBackground();
        });

        this.ar.addEventListener(ARKitWrapper.WILL_ENTER_FOREGROUND_EVENT, () => {
            this.onARWillEnterForeground();
        });

        this.ar.addEventListener(ARKitWrapper.INTERRUPTION_EVENT, () => {
            // do something on interruption event
        });

        this.ar.addEventListener(ARKitWrapper.INTERRUPTION_ENDED_EVENT, () => {
            // do something on interruption event ended
        });

        this.ar.addEventListener(ARKitWrapper.MEMORY_WARNING_EVENT, () => {
            // do something on memory warning
        });

        this.ar.addEventListener(ARKitWrapper.ENTER_REGION_EVENT, (e) => {
            // do something when enter a region
            console.log('ENTER_REGION_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.EXIT_REGION_EVENT, (e) => {
            // do something when leave a region
            console.log('EXIT_REGION_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.SESSION_FAILS_EVENT, (e) => {
            // do something when the session fails
            console.log('SESSION_FAILS_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.TRACKING_CHANGED_EVENT, (e) => {
            // do something when tracking status is changed
            console.log('TRACKING_CHANGED_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.HEADING_UPDATED_EVENT, (e) => {
            // do something when heading is updated
            console.log('HEADING_UPDATED_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.SIZE_CHANGED_EVENT, (e) => {
            this.resize(e.detail.size.width, e.detail.size.height);
        });

        this.ar.addEventListener(ARKitWrapper.PLAINS_ADDED_EVENT, (e) => {
            // do something when new plains appear
            console.log('PLAINS_ADDED_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.PLAINS_REMOVED_EVENT, (e) => {
            // do something when plains are removed
            console.log('PLAINS_REMOVED_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.ANCHORS_UPDATED_EVENT, (e) => {
            // do something when anchors are updated
            console.log('ANCHORS_UPDATED_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.LOCATION_UPDATED_EVENT, (e) => {
            if (this.isObjectsLoaded) {
                return;
            }
            this.isObjectsLoaded = true;
            var self = this;
            function getLayerAndAnchors(location) {
                if (self.dataOfUser) {
                    self.loadMRSObjects(location);
                } else {
                    setTimeout(() => {
                        getLayerAndAnchors(location)
                    }, 200);
                }
            }
            getLayerAndAnchors(e.detail.location);
        });

        this.ar.addEventListener(ARKitWrapper.SHOW_DEBUG_EVENT, e => {
            const options = e.detail;
            this.isDebug = Boolean(options.debug);

            this.fpsStats.domElement.style.display = this.isDebug ? '' : 'none';
        });

        this.ar.addEventListener(ARKitWrapper.ORIENTATION_CHANGED_EVENT, e => {
            this.updateOrientation(e.detail.orientation);
        });
    }

    addNewAnchor(modelId) {
        this.raycaster.setFromCamera(
            {x: 0, y: 0},
            this.camera
        );
        let objPos = this.raycaster.ray.origin.clone();
        objPos.add(this.raycaster.ray.direction);
        let transform = new THREE.Matrix4();
        transform.makeTranslation(objPos.x, objPos.y, objPos.z);
        transform.scale(new THREE.Vector3(0.1, 0.1, 0.1));

        let fixRotationMatrix = new THREE.Matrix4();
        fixRotationMatrix.makeRotationX(-Math.PI / 2);
        transform.multiply(fixRotationMatrix);

        transform = transform.toArray();
        transform = this.ar.createARMatrix(transform);

        this.ar.addAnchor(
            null,
            transform
        ).then(info => this.onARAddNewObject(info, modelId));
    }

    loadMRSObjects(location) {
        this.geoConverter.setOriginFromDegrees(
            location.longitude,
            location.latitude,
            location.altitude
        );
        const layersAnchors = MRS_API.getLayersAnchors({
            id: this.dataOfUser.layer.id,
            latitude: location.latitude,
            longitude: location.longitude,
            elevation: location.altitude,
            radius: 100,
            page: 1
        })
        .then(anchors => {
            anchors.forEach(anchor => {
                this.addLoadedAnchor(anchor);
            });
        });
    }

    addAnchorByPosition(position) {
        let transform = new THREE.Matrix4();
        transform.makeTranslation(position.x, position.y, position.z);
        transform = transform.toArray();
        transform = this.ar.createARMatrix(transform);
        this.ar.addAnchor(
            null,
            transform
        ).then(info => this.onARAddObject(info));
    }

    addLoadedAnchor(anchor) {
        let position = this.geoConverter.llaToEastUpSouth(anchor.lon, anchor.lat, anchor.elevation);
        this.addAnchorByPosition(position);
    }

    getGallery() {
        const swiperWrapper = document.getElementsByClassName('swiper-wrapper')[0];
        const loader = new THREE.GLTFLoader();

        MRS_API.getGalleries(1)
            .then((res) => {
                return res;
            })
            .then(gallery => gallery[0].id)
            .then(id => MRS_API.getGalleryModels(id, 1))
            .then(models => {
                    models = [models[1]];
                    models.forEach(model => {
                            console.log('model', model);
                            let swiperSlide = document.createElement('div');
                            swiperSlide.classList.add('swiper-slide');
                            let div = document.createElement('div');
                            div.classList.add('imageHolder');
                            let url = MRS_URL + '/' + model.Model.thumbPath;
                            div.style.backgroundImage = `url('${url}')`;
                            div.setAttribute('modelId', model.modelId);
                            swiperSlide.appendChild(div);
                            swiperWrapper.appendChild(swiperSlide);
                        });
                    return models;
                }
            )
            .then(models => {
                    let model = models[0];
                    let url = MRS_URL + '/' + model.Model.modelPath;
                    loader.load(url, (gltf) => {
                        const mesh = gltf.scene.children[0];
                        mesh.position.set(0, 0, 0);
                        mesh.scale.set(0.1, 0.1, 0.1);
                        mesh.rotation.set(0, 0, 0);
                        this.protos[model.modelId] = mesh;
                        if (models.length == Object.keys(this.protos).length) {
                            this.isGalleryLoaded = true;
                            this.onGalleryLoaded();
                        }
                    });
                }
            );
    }
    onGalleryLoaded() {
        this.hideMessage();
        document.querySelector('#ui').style.display = '';
        document.querySelector('.swiper-container').style.display = '';
        this.getPickableMeshes(true);
    }
    auth() {
        // @todo: this logic should be inside MRS class
        if (window.localStorage.apiKey) {
            MRS_API.getUser(window.localStorage.apiKey)
                .then((res) => {
                    this.dataOfUser = res;
                    this.dataOfUser.layer = {id: window.localStorage.layerId};
                    this.getGallery();
                });
        } else {
            MRS_API.createUser({ username: 'test', email: 'mail@test.com' })
                .then((res) => {
                    window.localStorage.setItem('apiKey', MRS_API.apiKey);
                    window.localStorage.setItem('layerId', res.layer.id);
                    this.dataOfUser = res;
                    this.getGallery();
                })
        }
    }

    updateOrientation(orientation) {
        this.orientation = orientation;
        switch (this.orientation) {
            case ARKitWrapper.ORIENTATION_PORTRAIT:
                this.orientationAngle = Math.PI / 2;
                break;
            case ARKitWrapper.ORIENTATION_UPSIDE_DOWN:
                this.orientationAngle = -Math.PI / 2;
                break;
            case ARKitWrapper.ORIENTATION_LANDSCAPE_LEFT:
                this.orientationAngle = -Math.PI;
                break;
            default:
                this.orientationAngle = 0;
                break;
        }
    }

    createCube(name) {
        let geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
        let material = new THREE.MeshLambertMaterial({color: 0x7d4db2, reflectivity: 0, wireframe: false, opacity: 0.8});
        let cubeMesh = new THREE.Mesh(geometry, material);
        cubeMesh.name = name;

        return cubeMesh;
    }
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.engine.setSize(width, height, false);
    }
    initScene(canvasId) {
        this.canvas = document.getElementById(canvasId);

        this.scene = new THREE.Scene();
        this.engine = new THREE.WebGLRenderer({
            antialias: true,
            canvas: this.canvas,
            alpha: true
        });
        this.resize(window.innerWidth, window.innerHeight);

        this.engine.setClearColor('#000', 0);

        this.camera = new THREE.PerspectiveCamera(37.94, this.width / this.height, 0.001, 1000);

        this.camera.position.set(0, 1.6, 10);
        this.camera.lookAt(new THREE.Vector3(0, 1.6, -100));

        this.scene.add(this.camera);

        let light = new THREE.PointLight(0xffffff, 2, 0);
        this.camera.add(light);

        this.camera.matrixAutoUpdate = false;

        this.fpsStats = new Stats();
        this.fpsStats.setMode(0);
        this.fpsStats.domElement.style.display = 'none';
        this.fpsStats.domElement.style.left = 'auto';
        this.fpsStats.domElement.style.right = '0px';
        document.body.appendChild(this.fpsStats.domElement);
    }

    cleanScene() {
        let children2Remove = [];

        this.scene.children.forEach(child => {
            if (!child.isCamera) {
                children2Remove.push(child);
            }
        });

        children2Remove.forEach(child => {
            child.parent.remove(child);
        });

        this.cubesNum = 0;
    }

    registerUIEvents() {
        this.tapPos = {x: 0, y: 0};

        document.querySelector('#message').onclick = function() {
            this.style.display = 'none';
        }
        
        this.editControls = new EditControls(this);
    }
    
    requestAnimationFrame() {
        window.requestAnimationFrame(this.render.bind(this));
    }

    watchAR() {
        this.ar.watch({
            location: {
                accuracy: ARKitWrapper.LOCATION_ACCURACY_HUNDRED_METERS
            },
            camera: true,
            anchors: true,
            planes: true,
            lightEstimate: true,
            heading: {
                accuracy: 360
            }
        });
    }

    render(time) {
        let deltaTime = Math.max(0.001, Math.min(this.clock.getDelta(), 1));

        if (this.isDebug) {
            this.fpsStats.begin();
        }

        this.engine.render(this.scene, this.camera);

        if (this.isDebug) {
            this.fpsStats.end();
        }
    }
    onARHitTest(data) {
        let info;
        let planeResults = [];
        let planeExistingUsingExtentResults = [];
        let planeExistingResults = [];

        if (data.planes.length) {
            // search for planes
            planeResults = data.planes;

            planeExistingUsingExtentResults = planeResults.filter(
                hitTestResult => hitTestResult.point.type == ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT
            );
            planeExistingResults = planeResults.filter(
                hitTestResult => hitTestResult.point.type == ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE
            );

            if (planeExistingUsingExtentResults.length) {
                // existing planes using extent first
                planeExistingUsingExtentResults = planeExistingUsingExtentResults.sort((a, b) => a.point.distance - b.point.distance);
                info = planeExistingUsingExtentResults[0].point;
            } else if (planeExistingResults.length) {
                // then other existing planes
                planeExistingResults = planeExistingResults.sort((a, b) => a.point.distance - b.point.distance);
                info = planeExistingResults[0].point;
            } else {
                // other plane types
                planeResults = planeResults.sort((a, b) => a.point.distance - b.point.distance);
                info = planeResults[0].point;
            }
        } else if (data.points.length) {
            // feature points if any
            info = data.points[0];
        }

        let transform;
        if (info) {
            // if hit testing is positive
            transform = info.worldTransform;
        } else {
            // if hit testing is negative put object at distance 1m from camera
            this.raycaster.setFromCamera(
                {x: this.tapPos.x, y: this.tapPos.y},
                this.camera
            );

            let objPos = this.raycaster.ray.origin.clone();
            objPos.add(this.raycaster.ray.direction);
            transform = new THREE.Matrix4();
            transform.makeTranslation(objPos.x, objPos.y, objPos.z);
            transform = transform.toArray();
            transform = this.ar.createARMatrix(transform);
        }
        this.ar.addAnchor(
            null,
            transform
        ).then(info => this.onARAddObject(info));
    }

  updateMRSPosition(mesh) {
        let transform = mesh.matrix.toArray();
        return MRS_API.updateObject({
            id: mesh.userData.anchorId,
            modelPoseId: mesh.userData.poseId,
            transform: transform
        });
    }

    createMRSAnchorAndPosition(mesh) {
        let position = new THREE.Vector3();
        position.setFromMatrixPosition(mesh.matrix);
        let lla = this.geoConverter.eastUpSouthToLla(position.x, position.y, position.z);

        return MRS_API.createAnchor({
            layerId: this.dataOfUser.layer.id,
            orientation: (new THREE.Matrix4()).toArray(),
            lat: lla.latitude,
            lon: lla.longitude,
            elevation: lla.elevation
        }).then(anchor => {
            return MRS_API.createObject({
                modelId: mesh.userData.modelId,
                transform: (new THREE.Matrix4()).toArray(),
                id: anchor.id
            });
        }).then(pose => {
            console.log('pose and anchor are created', pose);
            mesh.userData.anchorId = pose.anchorId;
            mesh.userData.poseId = pose.id;
        });
    }

    onARAddNewObject(info, modelId) {
        let mesh = this.protos[modelId];
        if (!mesh) {
            return;
        }
        mesh = mesh.clone(true);
        mesh.name = info.uuid;
        mesh.matrixAutoUpdate = false;
        mesh.matrix.fromArray(this.ar.flattenARMatrix(info.transform));
        mesh.userData.modelId = modelId;

        this.createMRSAnchorAndPosition(mesh);

        this.scene.add(mesh);
        this.cubesNum++;

        this.getPickableMeshes(true);
        this.requestAnimationFrame();
    }

    onARAddObject(info, modelId) {
        let mesh;
        if (modelId) {
            mesh = this.protos[modelId];
            if (!mesh) {
                return;
            }
            mesh = mesh.clone(true);
            mesh.name = info.uuid;
        } else {
            mesh = this.createCube(info.uuid);
            info.transform.v3.y += CUBE_SIZE / 2;
        }
        mesh.matrixAutoUpdate = false;

        mesh.matrix.fromArray(this.ar.flattenARMatrix(info.transform));
        this.scene.add(mesh);

        this.cubesNum++;

        this.getPickableMeshes(true);
        this.requestAnimationFrame();
    }

    onARDidMoveBackground() {
        this.ar.stop().then(() => {
            this.cleanScene();
        });
    }

    onARWillEnterForeground() {
        this.watchAR();
    }

    onARInit(e) {
        if (!this.ar.deviceInfo || !this.ar.deviceInfo.uuid) {
            return;
        }

        this.deviceId = this.ar.deviceInfo.uuid;
        this.updateOrientation(this.ar.deviceInfo.orientation);

        this.resize(
            this.ar.deviceInfo.viewportSize.width,
            this.ar.deviceInfo.viewportSize.height
        );

        this.watchAR();

    }

    onARWatch() {
        const camera = this.ar.getData('camera');
        if (!camera) return;

        if (this.orientationAngle != 0) {
            this.fixOrientationMatrix.makeRotationZ(this.orientationAngle);
            this.camera.matrix.fromArray(
                this.ar.flattenARMatrix(camera.cameraTransform)
            ).multiply(this.fixOrientationMatrix);
        } else {
            this.camera.matrix.fromArray(
                this.ar.flattenARMatrix(camera.cameraTransform)
            );
        }

        this.camera.projectionMatrix.fromArray(
            this.ar.flattenARMatrix(camera.projectionCamera)
        );

        this.requestAnimationFrame();
    }

    pick(pos) {
        let pickInfo = {};
        this.raycaster.setFromCamera(
            {x: pos.ndcX, y: pos.ndcY},
            this.camera
        );
        const intersects = this.raycaster.intersectObjects(this.getPickableMeshes(), true);
        if (!intersects.length) {
            pickInfo.hit = false;
            return pickInfo;
        }
        let pickedObject = intersects[0].object;
        if (pickedObject.type == 'Mesh') {
            pickedObject = this.getObjectFirstParent(pickedObject);
        }
        pickInfo.hit = true;
        pickInfo.pickedMesh = pickedObject;
        pickInfo.pickedPoint = intersects[0].point;
        pickInfo.pointerX = pos.x;
        pickInfo.pointerY = pos.y;
        pickInfo.ndcX = pos.ndcX;
        pickInfo.ndcY = pos.ndcY;
        return pickInfo;
    }
    getObjectFirstParent(obj) {
        if (obj.parent.type == 'Scene') {
            return obj;
        }
        return this.getObjectFirstParent(obj.parent);
    }
    getPickableMeshes(forceUpdate) {
        if (this.pickableMeshes && !forceUpdate) {
            return this.pickableMeshes;
        }
        this.pickableMeshes = [];
        var cnt = this.scene.children.length;
        for (var i = 0; i < cnt; i++) {
            const mesh = this.scene.children[i];
            if (mesh.type != 'Mesh' && mesh.type != 'Object3D') {
                continue;
            }
            
            this.pickableMeshes.push(mesh);
        }
        return this.pickableMeshes;
    }

    showMessage(txt) {
        document.querySelector('#message').textContent = txt;
        document.querySelector('#message').style.display = 'block';
    }
    hideMessage() {
        document.querySelector('#message').style.display = 'none';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App('app-canvas');
});
