import * as THREE from './vendor/three.module.js?v=1';

const profiles = {
  environment: {
    title: 'Kawasan tangguh iklim',
    kind: 'LINGKUNGAN · BANJIR & KUALITAS UDARA',
    subtitle: 'Kota, DAS, sensor lingkungan, dan aset mitigasi dalam satu model kawasan.',
    metricTitles: ['Tinggi muka air', 'Curah hujan', 'Kualitas udara', 'Peringatan aktif'],
    colors: { accent: 0x51dfc1, secondary: 0x65adf5, ground: 0x294d43, glow: 0x4bdac5 },
    sensors: [['WL-DAS-04', 'Sensor tinggi muka air', '1,24 m · naik', -14, 0.3, 7, 0x4bb8ff], ['RG-KOTA-02', 'Penakar hujan otomatis', '42 mm/jam', 11, 0.3, -13, 0x70e2ce], ['AQ-PUSAT-01', 'Stasiun kualitas udara', 'AQI 68 · sedang', 14, 0.3, 10, 0xffc46b], ['DRAIN-08', 'Sensor drainase', 'Kapasitas 74%', -2, 0.3, 16, 0xff8f7c]],
    labels: ['Kawasan hijau', 'Kanal retensi', 'Pusat respons', 'Jaringan sensor'],
  },
  agriculture: {
    title: 'Lahan pertanian presisi',
    kind: 'PERTANIAN · IRIGASI & TANAMAN',
    subtitle: 'Petak lahan, rumah kaca, jaringan irigasi, dan telemetri tanaman berbasis sensor.',
    metricTitles: ['Kelembapan tanah', 'Suhu lahan', 'Kebutuhan air', 'Kesehatan tanaman'],
    colors: { accent: 0x91e47d, secondary: 0x60bbec, ground: 0x415a37, glow: 0x9ce87e },
    sensors: [['SOIL-A03', 'Sensor kelembapan tanah', '38% · kering', -14, 0.3, 8, 0xffc46b], ['WX-FARM-01', 'Stasiun cuaca lahan', '29°C · RH 71%', 13, 0.3, -12, 0x68c6ef], ['FLOW-IR-02', 'Meter debit irigasi', '18,4 L/s', 1, 0.3, 15, 0x55bbff], ['NPK-Z05', 'Probe nutrisi tanah', 'NPK seimbang', 14, 0.3, 9, 0xc99cff]],
    labels: ['Petak tanaman', 'Saluran irigasi', 'Rumah kaca', 'Stasiun cuaca'],
  },
  industry: {
    title: 'Pabrik cerdas terhubung',
    kind: 'INDUSTRI · PRODUKSI & PEMELIHARAAN',
    subtitle: 'Lini produksi, mesin, utilitas, dan sinyal pemeliharaan dalam visualisasi operasi 3D.',
    metricTitles: ['Efektivitas OEE', 'Output produksi', 'Getaran motor', 'Alarm mesin'],
    colors: { accent: 0xffbd59, secondary: 0x61c4f3, ground: 0x3d4b4b, glow: 0xffbd59 },
    sensors: [['VIB-MTR-03', 'Sensor getaran motor', '2,1 mm/s · normal', -13, 1, 7, 0x63dfc0], ['TEMP-OVN-01', 'Termokopel oven', '176°C · stabil', 11, 1, -10, 0xff985e], ['QC-LINE-02', 'Kamera inspeksi mutu', '98,6% lolos', 0, 2, 14, 0x8dc4ff], ['PWR-MAIN-01', 'Meter daya lini', '284 kW', 15, 1, 9, 0xffce66]],
    labels: ['Lini perakitan', 'Mesin CNC', 'Gudang otomatis', 'Pusat utilitas'],
  },
  waterEnergy: {
    title: 'Ekosistem air & energi',
    kind: 'AIR & ENERGI · UTILITAS TERINTEGRASI',
    subtitle: 'Instalasi air, jaringan energi terbarukan, penyimpanan, dan pemantauan beban kawasan.',
    metricTitles: ['Debit air bersih', 'Tekanan jaringan', 'Energi terbarukan', 'Stabilitas grid'],
    colors: { accent: 0x65d0fc, secondary: 0xffd36a, ground: 0x2e4c50, glow: 0x6acfff },
    sensors: [['FLOW-PLANT-01', 'Meter keluaran instalasi', '86 L/s', -14, 1, 8, 0x58bdff], ['PRES-NET-07', 'Sensor tekanan pipa', '3,4 bar', 0, 1, 15, 0x77e2d0], ['INV-PV-02', 'Inverter surya', '420 kW · aktif', 14, 1, -10, 0xffcf65], ['BATT-01', 'Sistem penyimpanan energi', '78% · siap', 14, 1, 10, 0xc19cff]],
    labels: ['Instalasi air', 'Jaringan pipa', 'Ladang surya', 'Penyimpanan energi'],
  },
};

const hex = value => `#${value.toString(16).padStart(6, '0')}`;

function addBox(parent, material, x, y, z, width, height, depth, selectable) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (selectable) mesh.userData.twin = selectable;
  parent.add(mesh);
  return mesh;
}

function addSensor(scene, profile, record, index) {
  const [id, name, value, x, y, z, color] = record;
  const sensor = new THREE.Group();
  sensor.position.set(x, y, z);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.13, profile.kind.startsWith('INDUSTRI') ? 2.2 : 1.25, 8),
    new THREE.MeshStandardMaterial({ color: 0x9bb6ae, metalness: 0.66, roughness: 0.4 }),
  );
  pole.position.y = profile.kind.startsWith('INDUSTRI') ? 1.1 : 0.62;
  sensor.add(pole);
  const orbMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.8 });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), orbMaterial);
  orb.position.y = pole.position.y + 0.25;
  orb.userData.twin = { id, name, kind: 'Sensor terhubung', details: `Pembacaan sintetis ${value}; node edge tersambung.` };
  sensor.add(orb);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.035, 6, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.58 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  sensor.add(ring);
  sensor.userData.pulse = { orb, ring, phase: index * 0.87 };
  scene.add(sensor);
  return sensor;
}

function makeScene(profile, key) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1e29);
  scene.fog = new THREE.Fog(0x0b1e29, 55, 112);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: profile.colors.ground, roughness: 0.93 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ambient = new THREE.HemisphereLight(0xb8e6e3, 0x172b2a, 2.2);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffd8a1, 3.5);
  sun.position.set(-18, 35, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const accent = new THREE.PointLight(profile.colors.accent, 24, 58);
  accent.position.set(5, 13, 3);
  scene.add(accent);

  const plotMaterial = new THREE.MeshStandardMaterial({ color: 0x47735a, roughness: 1 });
  const plotCoords = [[-21, -17], [20, -17], [-21, 19], [21, 20], [0, 23]];
  plotCoords.forEach(([x, z]) => addBox(scene, plotMaterial, x, 0.06, z, 14, 0.12, 12));
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x243640, roughness: 0.88 });
  [-30, 30].forEach(z => addBox(scene, roadMaterial, 0, 0.09, z, 66, 0.16, 4.5));

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: profile.colors.accent,
    emissive: profile.colors.accent,
    emissiveIntensity: 0.35,
    metalness: 0.25,
    roughness: 0.35,
  });
  const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x668c91, metalness: 0.25, roughness: 0.4 });
  const buildingInfo = (id, name, kind) => ({ id, name, kind, details: `${kind} · aset konseptual terhubung ke jaringan sensor dan kontrol demo.` });
  const buildings = [];
  const positions = [[-12, -10], [0, -13], [12, -10], [-18, 2], [17, 0], [-11, 14], [11, 15]];

  if (key === 'agriculture') {
    const cropMat = new THREE.MeshStandardMaterial({ color: 0x6eb75c, roughness: 0.86 });
    for (let row = 0; row < 10; row += 1) {
      for (let col = 0; col < 14; col += 1) {
        const x = -17 + col * 2.5;
        const z = -16 + row * 2.2;
        addBox(scene, cropMat, x, 0.48, z, 0.12, 0.9 + (col % 3) * 0.12, 0.12);
      }
    }
    const greenhouse = new THREE.MeshStandardMaterial({ color: 0x73d8cf, transparent: true, opacity: 0.45, metalness: 0.18, roughness: 0.18 });
    addBox(scene, greenhouse, 13, 2.4, -12, 11, 4.8, 9, buildingInfo('GH-01', 'Rumah kaca cerdas', 'Greenhouse · IoT'));
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x176c91, emissive: 0x06324a, metalness: 0.25, roughness: 0.28 });
    addBox(scene, waterMat, 0, 0.16, 16, 35, 0.3, 1.4, buildingInfo('IR-CH-01', 'Kanal irigasi utama', 'Distribusi air pertanian'));
  } else if (key === 'environment') {
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x146e92, emissive: 0x082f48, metalness: 0.32, roughness: 0.24 });
    const basin = addBox(scene, waterMat, -1, 0.16, 6, 35, 0.3, 8, buildingInfo('RET-DAS-01', 'Kolam retensi kawasan', 'Pengendalian banjir'));
    basin.material.userData.baseEmissive = basin.material.emissive.getHex();
    const green = new THREE.MeshStandardMaterial({ color: 0x408653, roughness: 0.9 });
    [[-19, -14], [18, 13], [-19, 17], [20, -18]].forEach(([x, z]) => addBox(scene, green, x, 0.16, z, 8, 0.25, 7));
    const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x789392, metalness: 0.2, roughness: 0.42 });
    [[-14, -9], [12, -8], [15, 15], [-13, 16]].forEach(([x, z], index) => {
      const h = 5 + index * 1.7;
      buildings.push(addBox(scene, towerMaterial, x, h / 2, z, 4.5, h, 4, buildingInfo(`BLD-${index + 1}`, `Bangunan kawasan ${index + 1}`, 'Aset perkotaan')));
    });
  } else if (key === 'industry') {
    const factory = new THREE.MeshStandardMaterial({ color: 0x526e71, metalness: 0.38, roughness: 0.4 });
    buildings.push(addBox(scene, factory, -4, 3, -11, 18, 6, 12, buildingInfo('PLT-A-01', 'Gedung lini perakitan', 'Pabrik cerdas')));
    buildings.push(addBox(scene, factory, 12, 2.4, 7, 12, 4.8, 10, buildingInfo('WH-B-02', 'Gudang otomatis', 'Logistik manufaktur')));
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 11, 12), buildingMaterial);
    chimney.position.set(-11, 5.5, -12);
    scene.add(chimney);
    addBox(scene, accentMaterial, -3, 0.85, 0, 20, 0.35, 2.8, buildingInfo('LINE-A-03', 'Konveyor lini A-03', 'Produksi otomatis'));
    [-11, -5, 1, 7].forEach((x, i) => {
      const machine = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.6, 12), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x728e94 : 0x9a7646, metalness: 0.5, roughness: 0.36 }));
      machine.position.set(x, 2.1, 4);
      machine.userData.twin = buildingInfo(`CNC-${String(i + 1).padStart(2, '0')}`, `Mesin produksi ${i + 1}`, 'Mesin CNC · telemetry');
      scene.add(machine);
      buildings.push(machine);
    });
  } else {
    const reservoirMat = new THREE.MeshStandardMaterial({ color: 0x166b91, emissive: 0x062e48, metalness: 0.32, roughness: 0.24 });
    addBox(scene, reservoirMat, -13, 0.5, -12, 17, 1, 12, buildingInfo('WTP-01', 'Instalasi pengolahan air', 'Water treatment plant'));
    addBox(scene, buildingMaterial, 0, 3.3, -11, 14, 6.6, 10, buildingInfo('SUB-01', 'Gardu induk kawasan', 'Distribusi energi'));
    addBox(scene, accentMaterial, 0, 0.6, 3, 28, 0.35, 1.6, buildingInfo('PIPE-NET-01', 'Pipa distribusi utama', 'Jaringan air pintar'));
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x173b62, metalness: 0.55, roughness: 0.2, emissive: 0x082447 });
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        const panel = addBox(scene, panelMat, 11 + col * 1.65, 0.5, -14 + row * 2.15, 1.45, 0.16, 1.8, col === 0 && row === 0 ? buildingInfo('PV-FARM-01', 'Ladang surya', 'Energi terbarukan · fotovoltaik') : null);
        panel.rotation.x = -0.16;
      }
    }
    const turbine = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.2, 8, 24), accentMaterial);
    turbine.position.set(14, 4, 10);
    turbine.userData.twin = buildingInfo('TURB-HY-01', 'Turbin mikrohidro', 'Energi terbarukan · air');
    scene.add(turbine);
  }

  if (key !== 'environment' && key !== 'industry' && key !== 'waterEnergy') {
    positions.forEach(([x, z], index) => {
      const height = 3 + (index % 3) * 1.2;
      const info = buildingInfo(`BLD-${String(index + 1).padStart(2, '0')}`, `${profile.labels[index % profile.labels.length]} ${index + 1}`, profile.labels[index % profile.labels.length]);
      buildings.push(addBox(scene, index % 2 ? buildingMaterial : accentMaterial, x, height / 2, z, 4.3, height, 4, info));
    });
  }

  if (key === 'industry') {
    positions.slice(0, 3).forEach(([x, z], index) => {
      buildings.push(addBox(scene, buildingMaterial, x, 1.4, z, 5, 2.8, 4, buildingInfo(`UTIL-${index + 1}`, `Utilitas pabrik ${index + 1}`, 'Pusat energi & utilitas')));
    });
  }
  if (key === 'waterEnergy') {
    positions.slice(0, 3).forEach(([x, z], index) => {
      addBox(scene, buildingMaterial, x, 2.2, z, 4, 4.4, 4, buildingInfo(`NODE-${index + 1}`, `Node utilitas ${index + 1}`, 'Jaringan air & energi'));
    });
  }

  const sensors = profile.sensors.map((sensor, index) => addSensor(scene, profile, sensor, index));
  const animated = new THREE.Group();
  scene.add(animated);
  if (key === 'agriculture') {
    const tractor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.15, 1.3), new THREE.MeshStandardMaterial({ color: 0xe6a83f, metalness: 0.32, roughness: 0.35 }));
    tractor.position.set(-12, 0.85, -8);
    tractor.userData.twin = buildingInfo('AGV-F-02', 'Traktor otonom', 'Kendaraan pertanian demo');
    animated.add(tractor);
  } else if (key === 'industry') {
    const robot = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 3.2, 10), accentMaterial);
    arm.position.y = 2.1;
    arm.rotation.z = 0.36;
    robot.add(arm);
    robot.position.set(6, 0.4, 0);
    robot.userData.twin = buildingInfo('ROBOT-A-01', 'Robot perakitan', 'Lengan robot industri');
    animated.add(robot);
  } else if (key === 'waterEnergy') {
    const rotor = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.16, 8, 20), accentMaterial);
    rotor.position.set(14, 4, 10);
    animated.add(rotor);
  } else {
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.2, 12), accentMaterial);
    pump.position.set(2, 1.4, 8);
    pump.userData.twin = buildingInfo('PMP-RET-01', 'Pompa retensi', 'Pompa mitigasi banjir');
    animated.add(pump);
  }

  const grid = new THREE.GridHelper(66, 32, 0x47796f, 0x355d58);
  grid.position.y = 0.035;
  grid.material.transparent = true;
  grid.material.opacity = 0.28;
  scene.add(grid);
  const selectable = [...scene.children.flatMap(child => child.children ? child.children.filter(item => item.userData.twin) : []), ...scene.children.filter(child => child.userData.twin), ...sensors.map(sensor => sensor.children[1])];
  return { scene, sensors, animated, accentMaterial, selectable, buildings };
}

export function mountPilotDomainScene(root, key) {
  const profile = profiles[key];
  if (!profile) throw new Error(`Domain Digital Twin tidak dikenal: ${key}`);
  const dashboard = root.closest('.pilot-domain-simulation') || root;
  const lowPower = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches
    || (Number(navigator.deviceMemory) > 0 && Number(navigator.deviceMemory) <= 4);
  const targetFrameMs = lowPower ? 1000 / 24 : 1000 / 30;
  const canvas = document.createElement('canvas');
  canvas.className = 'pilot-city-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Digital Twin 3D ${profile.title}. Geser untuk orbit, cubit atau gulir untuk zoom, pilih objek untuk detail.`);
  canvas.tabIndex = 0;
  root.prepend(canvas);
  const status = root.querySelector('[data-domain-status]');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: false, powerPreference: 'low-power' });
  } catch (error) {
    canvas.remove();
    if (status) status.textContent = 'WebGL tidak tersedia pada perangkat ini. Panel monitoring dan kontrol simulasi tetap dapat digunakan.';
    console.error(`WebGL tidak tersedia untuk simulasi ${key}.`, error);
    return () => {};
  }

  let model;
  try {
    model = makeScene(profile, key);
  } catch (error) {
    renderer.dispose();
    canvas.remove();
    if (status) status.textContent = 'Model kawasan tidak dapat disiapkan. Panel monitoring dan kontrol simulasi tetap tersedia.';
    console.error(`Model 3D ${key} gagal dibuat.`, error);
    return () => {};
  }
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 150);
  const target = new THREE.Vector3(0, 4, 0);
  let theta = -0.72;
  let phi = 0.92;
  let radius = 57;
  let frameId = 0;
  let metricTimer = 0;
  let elapsed = 0;
  let lastFrame = 0;
  let active = true;
  let disposed = false;
  let pointerStart = null;
  let previousPointer = null;
  let dragged = false;
  let selected = null;
  let rainfall = 0;
  let irrigation = true;
  let lineRunning = true;
  let waterFlow = true;
  let renewableShare = 68;
  let demand = 64;
  let mitigation = 65;
  let irrigationAmount = 66;
  let productionSpeed = 84;
  const pointers = new Map();
  let pinchDistance = 0;
  const state = { a: 0, b: 0, c: 0, alarms: 1 };
  const infoName = dashboard.querySelector('[data-domain-selected-name]');
  const infoText = dashboard.querySelector('[data-domain-selected-text]');
  const clock = dashboard.querySelector('[data-domain-clock]');
  const metricEls = [...dashboard.querySelectorAll('[data-domain-metric]')];

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.15 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  function updateCamera() {
    const sine = Math.sin(phi);
    camera.position.set(target.x + radius * sine * Math.sin(theta), target.y + radius * Math.cos(phi), target.z + radius * sine * Math.cos(theta));
    camera.lookAt(target);
  }
  function draw() {
    if (disposed) return;
    updateCamera();
    renderer.render(model.scene, camera);
  }
  function resize() {
    const { width, height } = root.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  }
  function renderMetrics() {
    const wave = Math.sin(elapsed * 0.65);
    let readings;
    if (key === 'environment') readings = [`${(1.24 + rainfall * 0.18 * (1 - mitigation / 150) + wave * 0.03).toFixed(2)} m`, `${rainfall ? '68' : '12'} mm/jam`, `AQI ${Math.round(68 + wave * 5)}`, rainfall ? '3 event' : '1 event'];
    else if (key === 'agriculture') readings = [`${Math.round((irrigation ? 27 + irrigationAmount * 0.17 : 31) + wave * 2)}%`, `${(29 + wave * 0.8).toFixed(1)} °C`, `${irrigation ? (irrigationAmount * 0.28).toFixed(1) : '0,0'} L/s`, `${Math.round(84 + wave * 2)} /100`];
    else if (key === 'industry') readings = [`${(lineRunning ? productionSpeed : 0) + wave * (lineRunning ? 1.2 : 0)}%`, `${lineRunning ? Math.round(15 * productionSpeed + wave * 20) : 0} unit/jam`, `${(2.1 + wave * 0.14).toFixed(1)} mm/s`, lineRunning ? '1 perlu cek' : '2 berhenti'];
    else readings = [`${waterFlow ? Math.round(86 * demand / 64 + wave * 4) : 0} L/s`, `${waterFlow ? (3.4 - (demand - 64) * 0.007 + wave * 0.08).toFixed(1) : '0,0'} bar`, `${Math.round(renewableShare + wave * 3)}%`, `${Math.round(96 - (demand - 64) * 0.09 + (renewableShare - 68) * 0.06 + wave * 0.4)} /100`];
    readings.forEach((reading, index) => { if (metricEls[index]) metricEls[index].textContent = reading; });
    dashboard.querySelectorAll('[data-domain-spark] i').forEach((bar, index) => {
      bar.style.height = `${30 + ((index * 17 + Math.round(elapsed * 9)) % 58)}%`;
    });
    const alarm = dashboard.querySelector('.pilot-infra-alerts [data-domain-alarm]');
    if (alarm) alarm.textContent = rainfall ? 'Siaga hujan deras · pantau DAS' : key === 'industry' && !lineRunning ? 'Lini produksi dihentikan' : 'Tidak ada alarm kritis';
    const controlState = dashboard.querySelector('[data-domain-control-state]');
    if (controlState) {
      if (key === 'environment') controlState.textContent = rainfall ? 'Peringatan hujan · pompa mitigasi siaga' : 'Siaga · pemantauan otomatis';
      else if (key === 'agriculture') controlState.textContent = irrigation ? 'Jadwal irigasi aktif · demo' : 'Irigasi dijeda · simulasi';
      else if (key === 'industry') controlState.textContent = lineRunning ? 'Lini produksi beroperasi' : 'Lini dihentikan · pemeliharaan';
      else controlState.textContent = waterFlow ? 'Tekanan jaringan stabil · demo' : 'Aliran dihentikan · simulasi';
    }
    const equipment = dashboard.querySelector('[data-domain-equipment]');
    if (equipment) {
      equipment.textContent = lineRunning ? 'BERJALAN' : 'STOP';
      equipment.classList.toggle('state-on', lineRunning);
      equipment.classList.toggle('state-off', !lineRunning);
    }
    clock.textContent = new Date().toLocaleTimeString('id-ID', { hour12: false });
  }
  function setSelected(object) {
    selected = object?.userData.twin || null;
    infoName.textContent = selected ? `${selected.id} · ${selected.name}` : 'Kawasan Digital Twin';
    infoText.textContent = selected ? `${selected.kind} · ${selected.details}` : 'Pilih aset atau sensor pada model untuk melihat profil demonstrasi.';
    draw();
  }
  function handleClick(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-domain-action], [data-domain-mode]');
    if (!button || !dashboard.contains(button)) return;
    const action = button.dataset.domainAction;
    if (action === 'rain') {
      rainfall = rainfall ? 0 : 1;
      dashboard.classList.toggle('domain-alert-active', Boolean(rainfall));
      button.setAttribute('aria-pressed', String(Boolean(rainfall)));
      button.textContent = rainfall ? 'Akhiri simulasi hujan' : 'Simulasikan hujan deras';
      const waterObject = model.scene.children.find(child => child.userData.twin?.id === 'RET-DAS-01');
      if (waterObject) waterObject.material.emissive.setHex(rainfall ? 0x0c6891 : waterObject.material.userData.baseEmissive);
    } else if (action === 'irrigation') {
      irrigation = !irrigation;
      button.setAttribute('aria-pressed', String(irrigation));
      button.textContent = irrigation ? 'Matikan irigasi demo' : 'Aktifkan irigasi demo';
    } else if (action === 'production') {
      lineRunning = !lineRunning;
      button.setAttribute('aria-pressed', String(lineRunning));
      button.textContent = lineRunning ? 'Hentikan lini demo' : 'Jalankan lini demo';
    } else if (action === 'water') {
      waterFlow = !waterFlow;
      button.setAttribute('aria-pressed', String(waterFlow));
      button.textContent = waterFlow ? 'Tutup katup demo' : 'Buka katup demo';
    } else if (action === 'renewable') {
      renewableShare = renewableShare === 68 ? 88 : 68;
      button.setAttribute('aria-pressed', String(renewableShare > 68));
      button.textContent = renewableShare > 68 ? 'Pulihkan bauran normal' : 'Maksimalkan energi surya';
    } else if (button.dataset.domainMode) {
      dashboard.querySelectorAll('[data-domain-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      if (key === 'agriculture') irrigation = button.dataset.domainMode !== 'pause';
      else if (key === 'waterEnergy') demand = button.dataset.domainMode === 'peak' ? 90 : button.dataset.domainMode === 'saving' ? 38 : 64;
      else if (key === 'industry') lineRunning = button.dataset.domainMode !== 'maintenance';
      else rainfall = button.dataset.domainMode === 'storm' ? 1 : 0;
    }
    if (key === 'environment') {
      const basin = model.scene.children.find(child => child.userData.twin?.id === 'RET-DAS-01');
      if (basin) basin.material.emissive.setHex(rainfall ? 0x0c6891 : basin.material.userData.baseEmissive);
    }
    const rainButton = dashboard.querySelector('[data-domain-action="rain"]');
    dashboard.classList.toggle('domain-alert-active', Boolean(rainfall));
    if (rainButton) {
      rainButton.setAttribute('aria-pressed', String(Boolean(rainfall)));
      rainButton.textContent = rainfall ? 'Akhiri simulasi hujan' : 'Simulasikan hujan deras';
    }
    const irrigationButton = dashboard.querySelector('[data-domain-action="irrigation"]');
    if (irrigationButton) {
      irrigationButton.setAttribute('aria-pressed', String(irrigation));
      irrigationButton.textContent = irrigation ? 'Matikan irigasi demo' : 'Aktifkan irigasi demo';
    }
    const productionButton = dashboard.querySelector('[data-domain-action="production"]');
    if (productionButton) {
      productionButton.setAttribute('aria-pressed', String(lineRunning));
      productionButton.textContent = lineRunning ? 'Hentikan lini demo' : 'Jalankan lini demo';
    }
    const waterButton = dashboard.querySelector('[data-domain-action="water"]');
    if (waterButton) {
      waterButton.setAttribute('aria-pressed', String(waterFlow));
      waterButton.textContent = waterFlow ? 'Tutup katup demo' : 'Buka katup demo';
    }
    const renewableButton = dashboard.querySelector('[data-domain-action="renewable"]');
    if (renewableButton) {
      renewableButton.setAttribute('aria-pressed', String(renewableShare > 68));
      renewableButton.textContent = renewableShare > 68 ? 'Pulihkan bauran normal' : 'Maksimalkan energi surya';
    }
    if (key === 'waterEnergy') {
      const demandInput = dashboard.querySelector('[data-domain-range="demand"]');
      const demandOutput = dashboard.querySelector('[data-domain-output="demand"]');
      if (demandInput && demandOutput && event.target.matches('[data-domain-mode]')) {
        demandInput.value = String(demand);
        demandOutput.textContent = `${demand}%`;
      }
    }
    if (key === 'agriculture' && event.target.matches('[data-domain-mode]')) {
      const irrigationInput = dashboard.querySelector('[data-domain-range="irrigation"]');
      if (irrigationInput && irrigation === false) irrigationInput.value = '0';
      else if (irrigationInput && irrigationInput.value === '0') irrigationInput.value = '66';
      const irrigationOutput = dashboard.querySelector('[data-domain-output="irrigation"]');
      if (irrigationInput && irrigationOutput) {
        irrigationAmount = Number(irrigationInput.value);
        irrigationOutput.textContent = `${irrigationAmount}%`;
      }
    }
    renderMetrics();
    draw();
  }
  function handleInput(event) {
    if (!(event.target instanceof HTMLInputElement)) return;
    const { domainRange } = event.target.dataset;
    if (!domainRange) return;
    if (domainRange === 'mitigation') mitigation = Number(event.target.value);
    if (domainRange === 'irrigation') {
      irrigationAmount = Number(event.target.value);
      irrigation = irrigationAmount > 0;
    }
    if (domainRange === 'renewable') renewableShare = Number(event.target.value);
    if (domainRange === 'demand') demand = Number(event.target.value);
    if (domainRange === 'speed') productionSpeed = Number(event.target.value);
    const output = dashboard.querySelector(`[data-domain-output="${domainRange}"]`);
    if (output) output.textContent = `${event.target.value}${['mitigation', 'irrigation', 'renewable', 'demand', 'speed'].includes(domainRange) ? '%' : ''}`;
    renderMetrics();
    draw();
  }
  function pickObject(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    setSelected(raycaster.intersectObjects(model.selectable, false)[0]?.object || null);
  }
  function pointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      pointerStart = { x: event.clientX, y: event.clientY };
      previousPointer = pointerStart;
      dragged = false;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      dragged = true;
    }
  }
  function pointerMove(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) dragged = true;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance && distance) radius = THREE.MathUtils.clamp(radius * pinchDistance / distance, 32, 88);
      pinchDistance = distance;
    } else if (previousPointer) {
      theta -= (event.clientX - previousPointer.x) * 0.008;
      phi = THREE.MathUtils.clamp(phi + (event.clientY - previousPointer.y) * 0.006, 0.38, 1.38);
    }
    previousPointer = { x: event.clientX, y: event.clientY };
    draw();
  }
  function pointerUp(event) {
    if (pointers.has(event.pointerId) && !dragged && pointers.size === 1) pickObject(event.clientX, event.clientY);
    pointers.delete(event.pointerId);
    pointerStart = null;
    previousPointer = null;
    pinchDistance = 0;
  }
  function wheel(event) {
    event.preventDefault();
    radius = THREE.MathUtils.clamp(radius + event.deltaY * 0.035, 32, 88);
    draw();
  }
  function keydown(event) {
    const actions = {
      ArrowLeft: () => { theta -= 0.12; },
      ArrowRight: () => { theta += 0.12; },
      ArrowUp: () => { phi = THREE.MathUtils.clamp(phi - 0.08, 0.38, 1.38); },
      ArrowDown: () => { phi = THREE.MathUtils.clamp(phi + 0.08, 0.38, 1.38); },
      '+': () => { radius = Math.max(32, radius - 4); },
      '=': () => { radius = Math.max(32, radius - 4); },
      '-': () => { radius = Math.min(88, radius + 4); },
    };
    if (!actions[event.key]) return;
    event.preventDefault();
    actions[event.key]();
    draw();
  }
  function animate(time) {
    if (disposed || !active || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frameId = 0;
      return;
    }
    if (lastFrame && time - lastFrame < targetFrameMs) {
      frameId = requestAnimationFrame(animate);
      return;
    }
    const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.05) : 0;
    lastFrame = time;
    elapsed += delta;
    model.sensors.forEach(sensor => {
      const { orb, ring, phase } = sensor.userData.pulse;
      orb.scale.setScalar(1 + Math.sin(elapsed * 2 + phase) * 0.14);
      ring.material.opacity = 0.3 + (Math.sin(elapsed * 2 + phase) + 1) * 0.13;
    });
    model.animated.rotation.y = key === 'waterEnergy' ? elapsed * 0.55 : 0;
    if (key === 'industry') model.animated.children[0].rotation.y = Math.sin(elapsed * 1.3) * 0.5;
    if (key === 'agriculture') model.animated.children[0].position.x = -12 + Math.sin(elapsed * 0.1) * 2;
    renderer.render(model.scene, camera);
    frameId = requestAnimationFrame(animate);
  }
  function startAnimation() {
    if (!frameId && !disposed && active && !document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lastFrame = 0;
      frameId = requestAnimationFrame(animate);
    }
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);
  const intersectionObserver = new IntersectionObserver(entries => {
    active = Boolean(entries[0]?.isIntersecting);
    if (active) {
      resize();
      startAnimation();
      if (!metricTimer && !document.hidden) metricTimer = window.setInterval(renderMetrics, 1800);
    } else {
      cancelAnimationFrame(frameId);
      frameId = 0;
      clearInterval(metricTimer);
      metricTimer = 0;
    }
  }, { threshold: 0.02 });
  intersectionObserver.observe(root);
  dashboard.addEventListener('click', handleClick);
  dashboard.addEventListener('input', handleInput);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('keydown', keydown);
  function onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = 0;
      clearInterval(metricTimer);
      metricTimer = 0;
    } else if (active) {
      startAnimation();
      if (!metricTimer) metricTimer = window.setInterval(renderMetrics, 1800);
      renderMetrics();
    }
  }
  document.addEventListener('visibilitychange', onVisibility);
  updateCamera();
  renderMetrics();
  draw();
  if (status) status.hidden = true;
  return () => {
    disposed = true;
    cancelAnimationFrame(frameId);
    clearInterval(metricTimer);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    dashboard.removeEventListener('click', handleClick);
    dashboard.removeEventListener('input', handleInput);
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerUp);
    canvas.removeEventListener('wheel', wheel);
    canvas.removeEventListener('keydown', keydown);
    document.removeEventListener('visibilitychange', onVisibility);
    model.scene.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material.dispose();
    });
    renderer.dispose();
    canvas.remove();
  };
}
