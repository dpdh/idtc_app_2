import * as THREE from './vendor/three.module.js?v=1';

const scenarios = {
  normal: { speed: 1, label: 'Stabil', speedText: '28', density: '42', volume: '6.240', travelTime: '18', road: 0x163d49 },
  padat: { speed: 0.38, label: 'Padat', speedText: '12', density: '81', volume: '9.180', travelTime: '42', road: 0x603b35 },
  optimasi: { speed: 1.35, label: 'Lancar', speedText: '36', density: '26', volume: '4.120', travelTime: '14', road: 0x164f49 },
};

const randomBetween = (min, max) => min + Math.random() * (max - min);

function addBox(parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function addCityBuildings(parent) {
  const colors = [0x244352, 0x2c4b59, 0x334e5a, 0x3a535d, 0x294956];
  const windowGeometry = new THREE.BoxGeometry(0.38, 0.3, 0.07);
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd99a,
    emissive: 0xc77e36,
    emissiveIntensity: 0.42,
    roughness: 0.45,
  });
  const windowTransforms = [];
  const rooftopMaterial = new THREE.MeshStandardMaterial({ color: 0x19313d, roughness: 0.82 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x98b4b3, roughness: 0.9 });
  const towerMaterials = colors.map(color => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.68,
    metalness: 0.12,
  }));
  const buildingMeshes = [];
  const sites = [-24, -8, 8, 24];
  let seed = 0;

  sites.forEach((centerX, column) => sites.forEach((centerZ, row) => {
    if ((column === 2 && row === 1) || (column === 1 && row === 2)) return;
    const parkPlot = column === 3 && row === 3;
    if (parkPlot) return;
    const buildingCount = (column + row) % 3 === 0 ? 2 : 3;
    for (let index = 0; index < buildingCount; index += 1) {
      seed += 1;
      const x = centerX + (buildingCount === 2 ? (index ? 2.4 : -2.4) : (index - 1) * 4.3);
      const z = centerZ + ((column + row + index) % 2 ? 2.4 : -2.4);
      const width = randomBetween(3.1, 4.4);
      const depth = randomBetween(3.2, 4.5);
      const floors = 4 + ((column * 3 + row * 5 + index * 2) % 12);
      const height = floors * 0.86;
      const buildingMaterial = towerMaterials[seed % towerMaterials.length].clone();
      const building = addBox(
        parent,
        new THREE.BoxGeometry(width, height, depth),
        buildingMaterial,
        x,
        height / 2,
        z,
      );
      building.castShadow = true;
      building.receiveShadow = true;
      const use = ['Menara perkantoran', 'Apartemen hunian', 'Gedung komersial', 'Fasilitas publik'][seed % 4];
      const floorArea = Math.round(width * depth * floors);
      const occupancy = 32 + (seed * 17) % 66;
      const energyIntensity = 100 + (seed * 29) % 180;
      building.userData.cityInfo = {
        title: use,
        code: `BLD-${String(seed).padStart(3, '0')}`,
        description: 'Profil aset konseptual; atribut merupakan nilai simulasi untuk contoh integrasi GIS/BIM.',
        details: [
          ['Fungsi model', use],
          ['Jumlah lantai', `${floors} lantai`],
          ['Luas lantai perkiraan', `${floorArea.toLocaleString('id-ID')} m²`],
          ['Okupansi skenario', `${occupancy}%`],
          ['Intensitas energi contoh', `${energyIntensity} kWh/m²/tahun`],
          ['Koordinat model', `X ${x.toFixed(1)} · Z ${z.toFixed(1)}`],
        ],
        originalEmissive: buildingMaterial.emissive.getHex(),
      };
      buildingMeshes.push(building);
      const roof = addBox(parent, new THREE.BoxGeometry(width + 0.12, 0.16, depth + 0.12), rooftopMaterial, x, height + 0.08, z);
      roof.castShadow = true;
      addBox(parent, new THREE.BoxGeometry(width + 0.32, 0.16, depth + 0.32), floorMaterial, x, 0.12, z);

      const floorsWithWindows = Math.max(2, Math.floor(height / 1.45));
      for (let floor = 0; floor < floorsWithWindows; floor += 1) {
        const y = 0.76 + floor * 1.35;
        if (y > height - 0.48) break;
        for (let offset = -1; offset <= 1; offset += 1) {
          const xOffset = offset * width * 0.27;
          const zOffset = offset * depth * 0.27;
          windowTransforms.push([x + xOffset, y, z + depth / 2 + 0.045, 0]);
          windowTransforms.push([x + xOffset, y, z - depth / 2 - 0.045, Math.PI]);
          windowTransforms.push([x + width / 2 + 0.045, y, z + zOffset, Math.PI / 2]);
          windowTransforms.push([x - width / 2 - 0.045, y, z + zOffset, -Math.PI / 2]);
        }
      }
    }
  }));

  const windows = new THREE.InstancedMesh(windowGeometry, windowMaterial, windowTransforms.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  windowTransforms.forEach(([x, y, z, angle], index) => {
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    matrix.compose(new THREE.Vector3(x, y, z), quaternion, new THREE.Vector3(1, 1, 1));
    windows.setMatrixAt(index, matrix);
  });
  windows.instanceMatrix.needsUpdate = true;
  parent.add(windows);
  return { count: buildingMeshes.length, meshes: buildingMeshes };
}

function addTrees(parent) {
  const trunks = [];
  const canopies = [];
  [-32, -16, 0, 16, 32].forEach((road, index) => {
    for (let offset = -28; offset <= 28; offset += 4) {
      if (Math.abs(offset - road) < 2.5) continue;
      trunks.push([road + (index % 2 ? -2.1 : 2.1), 0.6, offset]);
      canopies.push([road + (index % 2 ? -2.1 : 2.1), 1.55, offset]);
      trunks.push([offset, 0.6, road + (index % 2 ? 2.1 : -2.1)]);
      canopies.push([offset, 1.55, road + (index % 2 ? 2.1 : -2.1)]);
    }
  });
  const trunkGeometry = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6);
  const canopyGeometry = new THREE.IcosahedronGeometry(0.72, 1);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x76553a, roughness: 1 });
  const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0x4a9d78, roughness: 0.86 });
  [[trunks, trunkGeometry, trunkMaterial], [canopies, canopyGeometry, canopyMaterial]].forEach(([positions, geometry, material]) => {
    const trees = new THREE.InstancedMesh(geometry, material, positions.length);
    const matrix = new THREE.Matrix4();
    positions.forEach(([x, y, z], index) => {
      const scale = geometry === canopyGeometry ? randomBetween(0.72, 1.1) : 1;
      matrix.compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale, scale),
      );
      trees.setMatrixAt(index, matrix);
    });
    trees.instanceMatrix.needsUpdate = true;
    parent.add(trees);
  });
}

function addRoadNetwork(parent) {
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x172e39, roughness: 0.94 });
  const laneMaterial = new THREE.MeshBasicMaterial({ color: 0xd5ddcb, transparent: true, opacity: 0.56 });
  const centerMaterial = new THREE.MeshBasicMaterial({ color: 0xf5bd64, transparent: true, opacity: 0.78 });
  const roadWidth = 2.5;
  [-32, -16, 0, 16, 32].forEach(position => {
    const width = position === 0 ? 4.2 : roadWidth;
    addBox(parent, new THREE.BoxGeometry(76, 0.08, width), roadMaterial, 0, 0.02, position);
    addBox(parent, new THREE.BoxGeometry(width, 0.08, 76), roadMaterial, position, 0.025, 0);
    const divider = position === 0 ? centerMaterial : laneMaterial;
    for (let offset = -35; offset <= 35; offset += 4) {
      addBox(parent, new THREE.BoxGeometry(1.7, 0.025, 0.045), divider, offset, 0.075, position);
      addBox(parent, new THREE.BoxGeometry(0.045, 0.025, 1.7), divider, position, 0.08, offset);
    }
  });
  const crossingMaterial = new THREE.MeshBasicMaterial({ color: 0xdce8e4, transparent: true, opacity: 0.72 });
  [-16, 0, 16].forEach(x => [-16, 0, 16].forEach(z => {
    if (x === 0 && z === 0) return;
    for (let stripe = -2; stripe <= 2; stripe += 1) {
      addBox(parent, new THREE.BoxGeometry(0.24, 0.025, 2.6), crossingMaterial, x + stripe * 0.42, 0.09, z - 3.5);
      addBox(parent, new THREE.BoxGeometry(2.6, 0.025, 0.24), crossingMaterial, x - 3.5, 0.095, z + stripe * 0.42);
    }
  }));
}

function addParks(parent) {
  const lawn = new THREE.MeshStandardMaterial({ color: 0x285744, roughness: 1 });
  const path = new THREE.MeshStandardMaterial({ color: 0x889487, roughness: 0.9 });
  const water = new THREE.MeshStandardMaterial({ color: 0x247f89, roughness: 0.3, metalness: 0.24 });
  addBox(parent, new THREE.BoxGeometry(11.5, 0.09, 11.5), lawn, 8, 0.04, -8);
  addBox(parent, new THREE.BoxGeometry(1.4, 0.04, 11), path, 8, 0.11, -8);
  addBox(parent, new THREE.BoxGeometry(11, 0.04, 1.4), path, 8, 0.12, -8);
  addBox(parent, new THREE.BoxGeometry(7.4, 0.12, 4.8), water, -8, 0.08, 8);
  const waterEdge = new THREE.MeshStandardMaterial({ color: 0x798b7e, roughness: 0.96 });
  addBox(parent, new THREE.BoxGeometry(8.2, 0.12, 0.36), waterEdge, -8, 0.13, 10.55);
  addBox(parent, new THREE.BoxGeometry(8.2, 0.12, 0.36), waterEdge, -8, 0.13, 5.45);
}

function addTraffic(parent) {
  const traffic = new THREE.Group();
  parent.add(traffic);
  const route = [[-32, -32], [-32, 32], [32, 32], [32, -32], [-32, -32]];
  const points = route.map(([x, z]) => new THREE.Vector3(x, 0.13, z));
  const routeMaterial = new THREE.MeshBasicMaterial({ color: 0x62f1cf, transparent: true, opacity: 0.78 });
  const routeLine = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 160, 0.075, 6, false), routeMaterial);
  traffic.add(routeLine);

  const vehicles = [];
  const colors = [0xf4a66a, 0x55d3c1, 0xdbe7e0, 0xf4cf75, 0x71a7ed, 0xee806a];
  colors.forEach((color, index) => {
    const vehicle = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.34, roughness: 0.38 });
    const window = new THREE.MeshStandardMaterial({ color: 0x8dc3cb, metalness: 0.2, roughness: 0.24 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x101a20, roughness: 0.8 });
    addBox(vehicle, new THREE.BoxGeometry(0.94, 0.48, 1.8), paint, 0, 0.49, 0);
    addBox(vehicle, new THREE.BoxGeometry(0.76, 0.38, 0.82), window, 0, 0.88, -0.06);
    const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.13, 10);
    [-1, 1].forEach(side => [-0.55, 0.55].forEach(along => {
      const wheel = addBox(vehicle, wheelGeometry, rubber, side * 0.49, 0.26, along);
      wheel.rotation.z = Math.PI / 2;
    }));
    vehicle.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    traffic.add(vehicle);
    vehicles.push({ group: vehicle, offset: index / colors.length });
  });
  return { group: traffic, vehicles, route };
}

function addSensors(parent) {
  const sensors = new THREE.Group();
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x75dcc3, emissive: 0x164e48, emissiveIntensity: 0.8 });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x6cffe0, transparent: true, opacity: 0.7 });
  const bulbMaterial = new THREE.MeshStandardMaterial({ color: 0x9effe8, emissive: 0x3cdab6, emissiveIntensity: 2.3 });
  const sensorMeshes = [];
  [[-16, -16], [0, -16], [16, -16], [-16, 0], [16, 0], [-16, 16], [0, 16], [16, 16], [0, 0]].forEach(([x, z], index) => {
    const point = new THREE.Group();
    point.position.set(x + (index % 2 ? 0.9 : -0.9), 0.12, z + 0.95);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.09, 1.2, 8), poleMaterial);
    pole.position.y = 0.62;
    point.add(pole);
    const sensorMaterial = bulbMaterial.clone();
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8), sensorMaterial);
    bulb.position.y = 1.26;
    const sensorType = index % 3 === 0 ? 'Sensor arus lalu lintas' : index % 3 === 1 ? 'Sensor waktu tempuh' : 'Sensor kondisi persimpangan';
    bulb.userData.cityInfo = {
      title: sensorType,
      code: `SEN-${String(index + 1).padStart(2, '0')}`,
      description: 'Node sensor konseptual untuk menghubungkan observasi lapangan dengan model kawasan.',
      details: [
        ['Jenis sensor', sensorType],
        ['Status model', index % 4 === 0 ? 'Perlu pemeriksaan' : 'Terhubung'],
        ['Kecepatan terukur', `${22 + (index * 7) % 24} km/jam`],
        ['Arus model', `${420 + (index * 163) % 880} kendaraan/jam`],
        ['Pembaruan data', `${15 + (index * 11) % 45} detik`],
        ['Koordinat model', `X ${x} · Z ${z}`],
      ],
      originalEmissive: sensorMaterial.emissive.getHex(),
    };
    sensorMeshes.push(bulb);
    point.add(bulb);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 6, 28), ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    point.add(ring);
    sensors.add(point);
  });
  parent.add(sensors);
  return { group: sensors, meshes: sensorMeshes };
}

function getRoutePosition(route, progress) {
  const segmentCount = route.length - 1;
  const segment = Math.min(segmentCount - 1, Math.floor(progress * segmentCount));
  const amount = progress * segmentCount - segment;
  const start = route[segment];
  const end = route[segment + 1];
  const x = THREE.MathUtils.lerp(start[0], end[0], amount);
  const z = THREE.MathUtils.lerp(start[1], end[1], amount);
  const heading = Math.atan2(end[0] - start[0], end[1] - start[1]);
  return { x, z, heading };
}

export function mountPilotCityScene(root) {
  const controlsRoot = root.closest('.pilot-city-simulation') || root;
  const lowPower = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches
    || (Number(navigator.deviceMemory) > 0 && Number(navigator.deviceMemory) <= 4);
  const targetFrameMs = lowPower ? 1000 / 24 : 1000 / 30;
  const canvas = document.createElement('canvas');
  canvas.className = 'pilot-city-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Simulasi 3D konseptual koridor kota. Seret untuk memutar; pilih bangunan atau sensor untuk melihat informasinya.');
  canvas.tabIndex = 0;
  root.prepend(canvas);
  const status = root.querySelector('[data-pilot-city-status]');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.15 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1e29);
  scene.fog = new THREE.Fog(0x0b1e29, 52, 110);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
  const target = new THREE.Vector3(0, 4.2, 0);
  let theta = -0.74;
  let phi = 0.98;
  let radius = 79;

  scene.add(new THREE.HemisphereLight(0xb2e7e2, 0x183040, 2.1));
  const sunlight = new THREE.DirectionalLight(0xffd09a, 3.3);
  sunlight.position.set(-24, 38, 16);
  sunlight.castShadow = !lowPower;
  sunlight.shadow.mapSize.set(1024, 1024);
  sunlight.shadow.camera.left = -48;
  sunlight.shadow.camera.right = 48;
  sunlight.shadow.camera.top = 48;
  sunlight.shadow.camera.bottom = -48;
  scene.add(sunlight);

  const city = new THREE.Group();
  scene.add(city);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(88, 88),
    new THREE.MeshStandardMaterial({ color: 0x183b3b, roughness: 0.98 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  city.add(ground);
  const parcel = new THREE.MeshStandardMaterial({ color: 0x285043, roughness: 1 });
  [-24, -8, 8, 24].forEach(x => [-24, -8, 8, 24].forEach(z => {
    addBox(city, new THREE.BoxGeometry(14, 0.04, 14), parcel, x, 0.01, z);
  }));
  addRoadNetwork(city);
  addParks(city);
  const buildingLayer = new THREE.Group();
  city.add(buildingLayer);
  const buildingData = addCityBuildings(buildingLayer);
  addTrees(city);
  const trafficLayer = addTraffic(city);
  const sensorData = addSensors(city);
  const sensorLayer = sensorData.group;

  const skylineMaterial = new THREE.MeshStandardMaterial({ color: 0x1a303b, roughness: 0.9 });
  for (let index = 0; index < 25; index += 1) {
    const angle = index / 25 * Math.PI * 2;
    const distance = randomBetween(47, 62);
    const height = randomBetween(5, 19);
    addBox(
      city,
      new THREE.BoxGeometry(randomBetween(3.5, 6.5), height, randomBetween(3.5, 6)),
      skylineMaterial,
      Math.cos(angle) * distance,
      height / 2,
      Math.sin(angle) * distance,
    );
  }

  const speedOutput = controlsRoot.querySelector('[data-city-speed]');
  const densityOutput = controlsRoot.querySelector('[data-city-density]');
  const statusOutput = controlsRoot.querySelector('[data-city-status-label]');
  const volumeOutput = controlsRoot.querySelector('[data-city-volume]');
  const travelTimeOutput = controlsRoot.querySelector('[data-city-travel-time]');
  const mobilityNote = controlsRoot.querySelector('[data-city-mobility-note]');
  const objectTitle = controlsRoot.querySelector('[data-city-object-title]');
  const objectDescription = controlsRoot.querySelector('[data-city-object-description]');
  const objectDetails = controlsRoot.querySelector('[data-city-object-details]');
  const infoTabs = [...controlsRoot.querySelectorAll('[data-city-info-tab]')];
  const infoPanels = [...controlsRoot.querySelectorAll('[data-city-info-panel]')];
  const buildingCount = controlsRoot.querySelector('[data-city-building-count]');
  if (buildingCount) buildingCount.textContent = String(buildingData.count);
  const clockOutput = root.querySelector('[data-pilot-city-clock]');
  let activeMode = 'normal';
  let elapsed = 0;
  let previousTime = 0;
  let frame = 0;
  let animationFrame = 0;
  let active = true;
  let disposed = false;
  let dragging = false;
  let pointerMoved = false;
  let pointerStart = null;
  let lastPointer = null;
  let selectedMesh = null;
  const pointers = new Map();
  let pinchDistance = 0;
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const updateCamera = () => {
    const sinPhi = Math.sin(phi);
    camera.position.set(
      target.x + radius * sinPhi * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * sinPhi * Math.cos(theta),
    );
    camera.lookAt(target);
  };

  const resize = () => {
    const { width, height } = root.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderFrame();
  };

  const renderFrame = () => {
    if (disposed) return;
    updateCamera();
    renderer.render(scene, camera);
  };

  const updateScenario = mode => {
    if (!scenarios[mode]) return;
    activeMode = mode;
    const settings = scenarios[mode];
    controlsRoot.querySelectorAll('[data-city-scenario]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.cityScenario === mode)));
    speedOutput.innerHTML = `${settings.speedText} <small>km/jam</small>`;
    densityOutput.innerHTML = `${settings.density}<small>/100</small>`;
    statusOutput.textContent = settings.label;
    volumeOutput.innerHTML = `${settings.volume} <small>kendaraan/jam</small>`;
    travelTimeOutput.innerHTML = `${settings.travelTime} <small>menit</small>`;
    mobilityNote.textContent = `Skenario ${settings.label.toLocaleLowerCase('id-ID')}: estimasi arus ${settings.volume} kendaraan/jam dan waktu tempuh ${settings.travelTime} menit pada segmen model.`;
    const routeMaterial = trafficLayer.group.children[0].material;
    routeMaterial.color.setHex(mode === 'padat' ? 0xff8b63 : mode === 'optimasi' ? 0x71f4bd : 0x62f1cf);
    trafficLayer.group.children.slice(1).forEach(vehicle => {
      vehicle.traverse(node => {
        if (node.isMesh && node.material?.emissive) {
          node.material.emissive.setHex(mode === 'padat' ? 0x37150f : 0x000000);
        }
      });
    });
    renderFrame();
  };

  const setLayerVisibility = (button, visible) => {
    const layer = button.dataset.cityLayer;
    const group = layer === 'buildings' ? buildingLayer : layer === 'traffic' ? trafficLayer.group : sensorLayer;
    group.visible = visible;
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', `${visible ? 'Sembunyikan' : 'Tampilkan'} lapisan ${button.textContent.trim()}`);
    const selectedLayerHidden = (layer === 'buildings' && buildingData.meshes.includes(selectedMesh))
      || (layer === 'sensors' && sensorData.meshes.includes(selectedMesh));
    if (!visible && selectedMesh && selectedLayerHidden) {
      selectedMesh.material.emissive.setHex(selectedMesh.userData.cityInfo.originalEmissive);
      selectedMesh = null;
      objectTitle.textContent = 'Jelajahi bangunan dan sensor';
      objectDescription.textContent = 'Pilih gedung atau titik sensor pada model 3D untuk melihat profil objek.';
      objectDetails.replaceChildren();
      objectDetails.hidden = true;
    }
    renderFrame();
  };
  const setActiveInfoTab = tab => {
    const selected = tab.dataset.cityInfoTab;
    infoTabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    infoPanels.forEach(panel => { panel.hidden = panel.dataset.cityInfoPanel !== selected; });
  };
  const onInfoTabKeyDown = event => {
    if (!(event.target instanceof Element) || !event.target.matches('[data-city-info-tab]')) return;
    const currentIndex = infoTabs.indexOf(event.target);
    const nextIndex = event.key === 'ArrowRight' ? (currentIndex + 1) % infoTabs.length
      : event.key === 'ArrowLeft' ? (currentIndex - 1 + infoTabs.length) % infoTabs.length
        : event.key === 'Home' ? 0
          : event.key === 'End' ? infoTabs.length - 1
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    infoTabs[nextIndex].focus();
    setActiveInfoTab(infoTabs[nextIndex]);
  };
  const selectCityObject = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const candidates = [
      ...(buildingLayer.visible ? buildingData.meshes : []),
      ...(sensorLayer.visible ? sensorData.meshes : []),
    ];
    const hit = raycaster.intersectObjects(candidates, false)[0]?.object;
    if (!hit?.userData.cityInfo) return;
    if (selectedMesh) selectedMesh.material.emissive.setHex(selectedMesh.userData.cityInfo.originalEmissive);
    selectedMesh = hit;
    selectedMesh.material.emissive.setHex(0x167a66);
    const info = hit.userData.cityInfo;
    objectTitle.textContent = `${info.code} · ${info.title}`;
    objectDescription.textContent = info.description;
    objectDetails.replaceChildren();
    info.details.forEach(([label, value]) => {
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      objectDetails.append(term, detail);
    });
    objectDetails.hidden = false;
    setActiveInfoTab(infoTabs.find(tab => tab.dataset.cityInfoTab === (info.code.startsWith('SEN-') ? 'mobility' : 'buildings')));
  };
  const onControlClick = event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-city-scenario], [data-city-layer], [data-city-info-tab]');
    if (!button || !controlsRoot.contains(button)) return;
    if (button.matches('[data-city-scenario]')) updateScenario(button.dataset.cityScenario);
    else if (button.matches('[data-city-layer]')) setLayerVisibility(button, button.getAttribute('aria-pressed') !== 'true');
    else setActiveInfoTab(button);
  };

  const animate = time => {
    if (disposed || !active || document.hidden || mediaQuery.matches) {
      animationFrame = 0;
      return;
    }
    if (previousTime && time - previousTime < targetFrameMs) {
      animationFrame = requestAnimationFrame(animate);
      return;
    }
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
    previousTime = time;
    elapsed += delta * scenarios[activeMode].speed;
    trafficLayer.vehicles.forEach(vehicle => {
      const position = getRoutePosition(trafficLayer.route, (vehicle.offset + elapsed / 56) % 1);
      vehicle.group.position.set(position.x, 0.06, position.z);
      vehicle.group.rotation.y = position.heading;
    });
    frame += 1;
    if (frame % 2 === 0) renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  };

  const onPointerDown = event => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      dragging = true;
      pointerMoved = false;
      pointerStart = { x: event.clientX, y: event.clientY };
      lastPointer = { x: event.clientX, y: event.clientY };
    } else if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      pinchDistance = Math.hypot(first.x - second.x, first.y - second.y);
      dragging = false;
      pointerMoved = true;
    }
  };

  const onPointerMove = event => {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) pointerMoved = true;
    if (pointers.size >= 2) {
      const [first, second] = [...pointers.values()];
      const nextDistance = Math.hypot(first.x - second.x, first.y - second.y);
      if (pinchDistance > 0) radius = THREE.MathUtils.clamp(radius * pinchDistance / nextDistance, 48, 104);
      pinchDistance = nextDistance;
    } else if (dragging && lastPointer) {
      theta -= (event.clientX - lastPointer.x) * 0.008;
      phi = THREE.MathUtils.clamp(phi + (event.clientY - lastPointer.y) * 0.006, 0.42, 1.3);
      lastPointer = { x: event.clientX, y: event.clientY };
    }
    renderFrame();
    if (previous) event.preventDefault();
  };

  const onPointerUp = event => {
    if (pointers.has(event.pointerId) && !pointerMoved && pointers.size === 1) {
      selectCityObject(event.clientX, event.clientY);
    }
    pointers.delete(event.pointerId);
    dragging = false;
    pointerStart = null;
    lastPointer = null;
    pinchDistance = 0;
  };

  const onWheel = event => {
    event.preventDefault();
    radius = THREE.MathUtils.clamp(radius + event.deltaY * 0.035, 48, 104);
    renderFrame();
  };

  const onKeyDown = event => {
    const keyActions = {
      ArrowLeft: () => { theta -= 0.12; },
      ArrowRight: () => { theta += 0.12; },
      ArrowUp: () => { phi = THREE.MathUtils.clamp(phi - 0.08, 0.42, 1.3); },
      ArrowDown: () => { phi = THREE.MathUtils.clamp(phi + 0.08, 0.42, 1.3); },
      '+': () => { radius = Math.max(48, radius - 4); },
      '=': () => { radius = Math.max(48, radius - 4); },
      '-': () => { radius = Math.min(104, radius + 4); },
    };
    if (!keyActions[event.key]) return;
    event.preventDefault();
    keyActions[event.key]();
    renderFrame();
  };

  const updateClock = () => {
    const minutes = Math.floor(elapsed * 0.7);
    const hour = 8 + Math.floor((30 + minutes) / 60);
    const minute = (30 + minutes) % 60;
    clockOutput.textContent = `${String(hour % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')} WIB`;
  };
  const clockTimer = window.setInterval(updateClock, 1000);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);
  const intersectionObserver = new IntersectionObserver(entries => {
    active = Boolean(entries[0]?.isIntersecting);
    if (active) {
      resize();
      startAnimation();
    } else {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }, { threshold: 0.02 });
  intersectionObserver.observe(root);
  controlsRoot.addEventListener('click', onControlClick);
  controlsRoot.addEventListener('keydown', onInfoTabKeyDown);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('keydown', onKeyDown);
  const startAnimation = () => {
    if (!animationFrame && !disposed && active && !document.hidden && !mediaQuery.matches) {
      previousTime = 0;
      animationFrame = requestAnimationFrame(animate);
    }
  };
  const onMotionChange = () => {
    if (mediaQuery.matches) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      renderFrame();
    } else startAnimation();
  };
  const onVisibilityChange = () => {
    if (document.hidden) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    } else {
      renderFrame();
      startAnimation();
    }
  };
  mediaQuery.addEventListener('change', onMotionChange);
  document.addEventListener('visibilitychange', onVisibilityChange);

  resize();
  updateCamera();
  updateClock();
  if (status) status.hidden = true;
  startAnimation();

  return () => {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    clearInterval(clockTimer);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    controlsRoot.removeEventListener('click', onControlClick);
    controlsRoot.removeEventListener('keydown', onInfoTabKeyDown);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('keydown', onKeyDown);
    mediaQuery.removeEventListener('change', onMotionChange);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    scene.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material.dispose();
    });
    renderer.dispose();
    canvas.remove();
  };
}
