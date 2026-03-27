import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ==========================================
// GLSL Shaders
// ==========================================
const ATMOSPHERE_VERTEX_SHADER = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = vec3(modelViewMatrix * vec4(position, 1.0));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
    varying vec3 vNormal; 
    varying vec3 vPosition;
    uniform vec3 color; 
    
    void main() {
        vec3 viewDir = normalize(-vPosition);
        float intensity = pow(0.55 - dot(vNormal, viewDir), 4.0);
        gl_FragColor = vec4(color, 1.0) * intensity * 0.5;
    }
`;

// ==========================================
// Astronomical Data
// ==========================================
const PLANET_DATA = {
    'sun': { title: 'The Sun', type: 'Yellow Dwarf Star', radius: '696,340 km', orbit: 'Galactic Center', temp: '5,500 °C', desc: 'The star at the center of the Solar System.' },
    'mercury': { title: 'Mercury', type: 'Terrestrial Planet', radius: '2,439 km', orbit: '88 days', temp: '167 °C', desc: 'The smallest planet in the Solar System.' },
    'venus': { title: 'Venus', type: 'Terrestrial Planet', radius: '6,051 km', orbit: '225 days', temp: '464 °C', desc: 'Often called Earth’s twin, toxic atmosphere.' },
    'earth': { title: 'Earth', type: 'Terrestrial Planet', radius: '6,371 km', orbit: '365.25 days', temp: '15 °C', desc: 'Our home planet.' },
    'moon': { title: 'The Moon', type: 'Natural Satellite', radius: '1,737 km', orbit: '27.3 days', temp: '-53 °C', desc: 'Earth’s only natural satellite.' },
    'mars': { title: 'Mars', type: 'Terrestrial Planet', radius: '3,389 km', orbit: '687 days', temp: '-65 °C', desc: 'The Red Planet.' },
    'jupiter': { title: 'Jupiter', type: 'Gas Giant', radius: '69,911 km', orbit: '12 years', temp: '-110 °C', desc: 'The largest planet in the Solar System.' },
    'saturn': { title: 'Saturn', type: 'Gas Giant', radius: '58,232 km', orbit: '29.5 years', temp: '-140 °C', desc: 'Adorned with a dazzling system of icy rings.' },
    'uranus': { title: 'Uranus', type: 'Ice Giant', radius: '25,362 km', orbit: '84 years', temp: '-195 °C', desc: 'Rotates on its side.' },
    'neptune': { title: 'Neptune', type: 'Ice Giant', radius: '24,622 km', orbit: '165 years', temp: '-200 °C', desc: 'Dark, cold, and whipped by supersonic winds.' }
};

const SolarSystemEngine = (() => {
    // ==========================================
    // Engine Configuration
    // ==========================================
    const PLANET_SIZE_SCALE = 7.5;     
    const ORBIT_DISTANCE_SCALE = 7.5;  

    let scene, camera, renderer, controls, composer;
    let maxAnisotropy, textureLoader;
    const planets = [];
    const asteroidBelts = [];
    const rotatingRings = []; 

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let focusedObject = null; 
    const targetWorldPos = new THREE.Vector3(); 
    const clickableObjects = []; 

    let isExploring = false;
    let isTransitioningToExplore = false;
    let isReturning = false;
    let exploreTargetDistance = 0;

    const DOM = {
        panel: document.getElementById('info-panel'),
        title: document.getElementById('info-title'),
        type: document.getElementById('info-type'),
        radius: document.getElementById('info-radius'),
        orbit: document.getElementById('info-orbit'),
        temp: document.getElementById('info-temp'),
        desc: document.getElementById('info-desc'),
        btnExplore: document.getElementById('btn-explore'),
        btnBack: document.getElementById('btn-back'),
        loaderOverlay: document.getElementById('loader-overlay'),
        navList: document.getElementById('nav-list'),
        navMenu: document.getElementById('nav-menu'),     
        navToggle: document.getElementById('nav-toggle')
    };

    const init = () => {
        const loadingManager = new THREE.LoadingManager();
        
        loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {};
        
        loadingManager.onLoad = () => {
            setTimeout(() => {
                DOM.loaderOverlay.classList.add('loaded');
                document.body.classList.add('ready'); 
                animate();
            }, 600);
        };

        textureLoader = new THREE.TextureLoader(loadingManager);

        scene = new THREE.Scene();
        renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // --- SHADOW MAPPING ATTIVATO ---
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
        
        document.body.appendChild(renderer.domElement);
        maxAnisotropy = renderer.capabilities.getMaxAnisotropy(); 

        textureLoader.load('assets/texture/space.jpg', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace; 
            scene.background = texture;
        });

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3500 * ORBIT_DISTANCE_SCALE);
        camera.position.set(0, 150 * ORBIT_DISTANCE_SCALE, 300 * ORBIT_DISTANCE_SCALE); 

        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.5, 0.85);
        composer.addPass(bloomPass);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.zoomSpeed = 5.0; 
        controls.panSpeed = 2.0;
        controls.minDistance = 2; 
        controls.maxDistance = 1500 * ORBIT_DISTANCE_SCALE; 

        controls.addEventListener('start', () => {
            isReturning = false; 
        });

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); 
        scene.add(ambientLight);
        
        // --- IL SOLE: FONTE DI OMBRA MASSICCIA ---
        const sunLight = new THREE.PointLight(0xffffff, 300, 0, 1);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048; // 2K shadow map for sharper shadows
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 1500 * ORBIT_DISTANCE_SCALE;
        sunLight.shadow.bias = -0.001; //Shadow acne reduction
        scene.add(sunLight);

        // --- THE SUN ---
        const sunContainer = new THREE.Group();
        scene.add(sunContainer);
        const sunRadius = 15 * PLANET_SIZE_SCALE;
        const sunGeo = new THREE.SphereGeometry(sunRadius, 64, 64);
        const sunTex = textureLoader.load('assets/texture/sun.jpg');
        sunTex.anisotropy = 4; sunTex.colorSpace = THREE.SRGBColorSpace;
        const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunContainer.add(sunMesh);

        // Dynamic Geometry Hitbox
        const sunHitboxRadius = sunRadius * 1.2;
        const sunHitGeo = new THREE.SphereGeometry(sunHitboxRadius, 32, 32);
        const sunHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        const sunHitbox = new THREE.Mesh(sunHitGeo, sunHitMat);
        sunHitbox.userData = { id: 'sun', realRadius: sunRadius }; 
        sunContainer.add(sunHitbox);
        clickableObjects.push(sunHitbox); 

        // --- PHYSICAL SOLAR SYSTEM using Kepler orbits ---
        createPlanet('mercury', 1.8, 'assets/texture/mercury.jpg', 24, 0.205, 0.02, 0.01); 
        
        const venusData = createPlanet('venus', 3.3, 'assets/texture/venus.jpg', 39, 0.007, 0.015, 0.015); 
        createAtmosphere(venusData.container, 3.3, 1.15, 0xffaa00);

        const earthData = createPlanet('earth', 3.9, 'assets/texture/earth.jpg', 57, 0.017, 0.01, 0.02); 
        createAtmosphere(earthData.container, 3.9, 1.15, 0x0088ff); 
        
        createMoon('moon', 1.2, 'assets/texture/moon.jpg', 9.0, 0.04, earthData.container); 
        
        const marsData = createPlanet('mars', 3.0, 'assets/texture/mars.jpg', 75, 0.094, 0.008, 0.018); 
        createAtmosphere(marsData.container, 3.0, 1.12, 0xff4400);

        asteroidBelts.push(createAsteroidRing(88, 96, 8000, 0x888888, 4));

        const jupiterData = createPlanet('jupiter', 8.2, 'assets/texture/jupiter.jpg', 112, 0.049, 0.004, 0.04); 
        createAtmosphere(jupiterData.container, 8.2, 1.08, 0xcca377);

        const saturnData = createPlanet('saturn', 6.7, 'assets/texture/saturn.jpg', 157, 0.057, 0.002, 0.035); 
        createSaturnRings(saturnData.container, 8.2, 16.5, 'assets/texture/saturn_ring.png', 0.005); 
        createAtmosphere(saturnData.container, 6.7, 1.08, 0xead6b8);

        const uranusData = createPlanet('uranus', 5.1, 'assets/texture/uranus.jpg', 202, 0.046, 0.0015, 0.02); 
        createAtmosphere(uranusData.container, 5.1, 1.12, 0x00ffff);

        const neptuneData = createPlanet('neptune', 4.8, 'assets/texture/neptune.jpg', 240, 0.010, 0.001, 0.025); 
        createAtmosphere(neptuneData.container, 4.8, 1.15, 0x0044ff);

        asteroidBelts.push(createAsteroidRing(260, 350, 20000, 0x888888, 12));

        // --- DYNAMIC MENU POPULATION ---
        Object.keys(PLANET_DATA).forEach(key => {
            const li = document.createElement('li');
            li.innerText = PLANET_DATA[key].title;
            li.dataset.targetId = key;
            
            li.addEventListener('click', () => {
                document.querySelectorAll('#nav-list li').forEach(el => el.classList.remove('active'));
                li.classList.add('active');

                const targetObj = clickableObjects.find(obj => obj.userData.id === key);
                if (targetObj) {
                    focusedObject = targetObj; 
                    updateInfoPanel(key);      
                    isExploring = false;       
                    isReturning = false;       
                    DOM.btnBack.classList.remove('visible');
                }
            });
            DOM.navList.appendChild(li);
        });

        // Event Listeners
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('pointerdown', onPointerDown); 
        DOM.navToggle.addEventListener('click', () => { DOM.navMenu.classList.toggle('open'); });

        DOM.btnExplore.addEventListener('click', () => {
            if (!focusedObject) return;
            isExploring = true;
            isTransitioningToExplore = true;
            exploreTargetDistance = focusedObject.userData.realRadius * 3.5; 
            DOM.panel.classList.remove('visible'); 
            DOM.btnBack.classList.add('visible');  
        });

        DOM.btnBack.addEventListener('click', () => {
            isExploring = false;
            focusedObject = null; 
            isReturning = true; 
            DOM.btnBack.classList.remove('visible');
            document.querySelectorAll('#nav-list li').forEach(el => el.classList.remove('active')); 
        });
    };

    const updateInfoPanel = (planetId) => {
        const data = PLANET_DATA[planetId];
        if (!data) return;
        DOM.title.innerText = data.title;
        DOM.type.innerText = data.type;
        DOM.radius.innerText = data.radius;
        DOM.orbit.innerText = data.orbit;
        DOM.temp.innerText = data.temp;
        DOM.desc.innerText = data.desc;
        DOM.panel.classList.add('visible'); 
    };

    const hideInfoPanel = () => { DOM.panel.classList.remove('visible'); };

    const onPointerDown = (event) => {
        if (event.target.tagName !== 'CANVAS') return;
        if (event.button === 2 || isExploring) return; 

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(clickableObjects);

        if (intersects.length > 0) {
            focusedObject = intersects[0].object; 
            const objectId = focusedObject.userData.id; 
            if (objectId) {
                updateInfoPanel(objectId);
                document.querySelectorAll('#nav-list li').forEach(el => el.classList.remove('active'));
                const activeLi = document.querySelector(`#nav-list li[data-target-id="${objectId}"]`);
                if(activeLi) activeLi.classList.add('active');
            }
        } else {
            if (focusedObject) {
                focusedObject = null;
                hideInfoPanel();
                isReturning = true; 
                document.querySelectorAll('#nav-list li').forEach(el => el.classList.remove('active'));
            }
        }
    };

    const createPlanet = (id, baseSize, texturePath, baseDistance, eccentricity, orbitSpeed, rotationSpeed) => {
        const a = baseDistance * ORBIT_DISTANCE_SCALE; 
        const c = a * eccentricity; 
        const b = a * Math.sqrt(1 - Math.pow(eccentricity, 2)); 

        const curve = new THREE.EllipseCurve( -c, 0, a, b, 0, 2 * Math.PI, false, 0 );
        const points = curve.getPoints(128);
        const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, 0, p.y)));
        const material = new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.02,  blending: THREE.AdditiveBlending,});
        const orbitLine = new THREE.Line(geometry, material);
        scene.add(orbitLine);

        const planetContainer = new THREE.Group();
        scene.add(planetContainer);

        const scaledSize = baseSize * PLANET_SIZE_SCALE;
        const mapTexture = textureLoader.load(texturePath);
        mapTexture.anisotropy = 4; mapTexture.colorSpace = THREE.SRGBColorSpace; 
        const visualMesh = new THREE.Mesh(new THREE.SphereGeometry(scaledSize, 48, 48), new THREE.MeshStandardMaterial({ map: mapTexture, roughness: 0.8 }));
        
        // --- Planet Shadows ---
        visualMesh.castShadow = true;
        visualMesh.receiveShadow = true;

        planetContainer.add(visualMesh);

        const hitboxRadius = Math.max(scaledSize * 1.5, 4.0 * PLANET_SIZE_SCALE); 
        const hitGeo = new THREE.SphereGeometry(hitboxRadius, 16, 16);
        const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        const hitbox = new THREE.Mesh(hitGeo, hitMat);
        hitbox.userData = { id: id, realRadius: scaledSize }; 
        planetContainer.add(hitbox);

        planets.push({ 
            container: planetContainer, 
            a: a, b: b, c: c, 
            orbitSpeed: orbitSpeed, 
            currentAngle: Math.random() * Math.PI * 2, 
            mesh: visualMesh, 
            rotationSpeed: rotationSpeed 
        });
        clickableObjects.push(hitbox); 
        
        return { container: planetContainer };
    };

    const createAtmosphere = (parentContainer, baseSize, scaleFactor, hexColor) => {
        const scaledSize = baseSize * scaleFactor * PLANET_SIZE_SCALE;
        const atmoGeo = new THREE.SphereGeometry(scaledSize, 32, 32);
        const atmoMat = new THREE.ShaderMaterial({
            vertexShader: ATMOSPHERE_VERTEX_SHADER,
            fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
            uniforms: { color: { value: new THREE.Color(hexColor) } },
            side: THREE.BackSide, 
            transparent: true, 
            blending: THREE.AdditiveBlending,
            depthWrite: false 
        });
        const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
        parentContainer.add(atmosphere);
    };

    const createSaturnRings = (saturnContainer, baseInner, baseOuter, texturePath, rotationSpeed) => {
        const scaledInner = baseInner * PLANET_SIZE_SCALE;
        const scaledOuter = baseOuter * PLANET_SIZE_SCALE;
        const ringGeo = new THREE.RingGeometry(scaledInner, scaledOuter, 64);
        const tex = textureLoader.load(texturePath);
        tex.anisotropy = 4; tex.colorSpace = THREE.SRGBColorSpace;
        const ringMat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 1.0, roughness: 0.5 });
        const rings = new THREE.Mesh(ringGeo, ringMat);
        
        // --- Saturn ring Shadows ---
        rings.castShadow = true;
        rings.receiveShadow = true;

        rings.rotation.x = Math.PI / 2.5; 
        rings.userData = { id: 'saturn', realRadius: 6.7 * PLANET_SIZE_SCALE }; 
        saturnContainer.add(rings);
        clickableObjects.push(rings); 
        
        rotatingRings.push({ mesh: rings, speed: rotationSpeed }); 
    };

    const createMoon = (id, baseSize, texturePath, baseDistance, orbitSpeed, parentContainer) => {
        const scaledDistance = baseDistance * ORBIT_DISTANCE_SCALE;
        
        const orbitPivot = new THREE.Group();
        parentContainer.add(orbitPivot);
        
        const orbitGeo = new THREE.RingGeometry(scaledDistance - 0.03, scaledDistance + 0.03, 64);
        const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
        const moonOrbitRing = new THREE.Mesh(orbitGeo, orbitMat);
        moonOrbitRing.rotation.x = Math.PI / 2;
        parentContainer.add(moonOrbitRing); 

        const moonContainer = new THREE.Group();
        moonContainer.position.x = scaledDistance;
        orbitPivot.add(moonContainer);

        const scaledSize = baseSize * PLANET_SIZE_SCALE;
        const geo = new THREE.SphereGeometry(scaledSize, 16, 16); 
        const moonTexture = textureLoader.load(texturePath);
        moonTexture.anisotropy = 4; moonTexture.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 0.9 });
        const visualMesh = new THREE.Mesh(geo, mat);

        // --- Moon Shadows ---
        visualMesh.castShadow = true;
        visualMesh.receiveShadow = true;

        moonContainer.add(visualMesh);

        const hitboxRadius = Math.max(scaledSize * 1.5, 3.0 * PLANET_SIZE_SCALE);
        const hitGeo = new THREE.SphereGeometry(hitboxRadius, 16, 16);
        const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        const hitbox = new THREE.Mesh(hitGeo, hitMat);
        hitbox.userData = { id: id, realRadius: scaledSize }; 
        moonContainer.add(hitbox);

        planets.push({ pivot: orbitPivot, orbitSpeed, mesh: visualMesh, rotationSpeed: 0.01 });
        clickableObjects.push(hitbox); 
    };

    const createAsteroidRing = (baseInner, baseOuter, count, hexColor, spread) => {
        const innerRadius = baseInner * ORBIT_DISTANCE_SCALE;
        const outerRadius = baseOuter * ORBIT_DISTANCE_SCALE;

        const geometry = new THREE.DodecahedronGeometry(0.3 * PLANET_SIZE_SCALE, 0); 
        const material = new THREE.MeshStandardMaterial({ color: hexColor, roughness: 0.9 , metalness: 0.2 });

        const belt = new THREE.InstancedMesh(geometry, material, count);
        
        // --- Asteroid Shadows ---
        belt.castShadow = false;
        belt.receiveShadow = false;

        const dummy = new THREE.Object3D();

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = THREE.MathUtils.randFloat(innerRadius, outerRadius);
            const yOffset = THREE.MathUtils.randFloatSpread(spread * ORBIT_DISTANCE_SCALE);

            dummy.position.set(Math.cos(angle) * distance, yOffset, Math.sin(angle) * distance);
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            
            const scale = THREE.MathUtils.randFloat(0.2, 1.5);
            dummy.scale.set(scale, scale, scale);

            dummy.updateMatrix();
            belt.setMatrixAt(i, dummy.matrix);
        }

        scene.add(belt);
        return belt; 
    };

    const onWindowResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
        requestAnimationFrame(animate);

        planets.forEach(p => {
            p.mesh.rotation.y += p.rotationSpeed; 
            
            if(p.a) { // Elliptical planetary orbit
                p.currentAngle += p.orbitSpeed;
                const x = p.a * Math.cos(p.currentAngle) - p.c; 
                const z = p.b * Math.sin(p.currentAngle);
                p.container.position.set(x, 0, z);
            } else if (p.pivot) { // Legacy circular orbit for moon
                p.pivot.rotation.y += p.orbitSpeed;
            }
        });

        asteroidBelts.forEach(belt => {
            if (belt) belt.rotation.y += 0.0003; 
        });

        rotatingRings.forEach(r => {
            r.mesh.rotation.z -= r.speed; 
        });

        if (isExploring && focusedObject) {
            focusedObject.getWorldPosition(targetWorldPos);
            const delta = targetWorldPos.clone().sub(controls.target);
            controls.target.copy(targetWorldPos);
            camera.position.add(delta);

            if (isTransitioningToExplore) {
                const offset = camera.position.clone().sub(targetWorldPos);
                const currentDist = offset.length();
                const newDist = THREE.MathUtils.lerp(currentDist, exploreTargetDistance, 0.05);
                offset.setLength(newDist);
                camera.position.copy(targetWorldPos).add(offset);
                
                if (Math.abs(newDist - exploreTargetDistance) < 0.5) {
                    isTransitioningToExplore = false; 
                }
            }
        } 
        else if (focusedObject && !isReturning) {
             focusedObject.getWorldPosition(targetWorldPos);
             controls.target.lerp(targetWorldPos, 0.05);
        }
        else if (isReturning) {
            const returnY = 150 * ORBIT_DISTANCE_SCALE;
            const returnZ = 300 * ORBIT_DISTANCE_SCALE;

            controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.08);
            camera.position.lerp(new THREE.Vector3(0, returnY, returnZ), 0.05); 
            
            if (camera.position.distanceTo(new THREE.Vector3(0, returnY, returnZ)) < (15 * ORBIT_DISTANCE_SCALE)) {
                isReturning = false; 
            }
        }

        controls.update(); 
        composer.render(); 
    };

    return { init };
})();

document.addEventListener('DOMContentLoaded', SolarSystemEngine.init);  