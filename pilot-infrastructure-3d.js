import * as THREE from './vendor/three.module.js?v=1';

const colors = {
  ink: 0x102f3a,
  glass: 0x57b4c0,
  mint: 0x70ebd0,
  air: 0x51d9dd,
  energy: 0xffc569,
  water: 0x60aaff,
  structure: 0xf48778,
  neutral: 0xd5e0d9,
};

function box(parent, width, height, depth, material, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  if (options.selectable) {
    mesh.userData.infraInfo = options.selectable;
    mesh.userData.baseEmissive = material.emissive?.getHex() || 0;
  }
  mesh.castShadow = options.castShadow !== false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeBuilding(parent, options) {
  const { id, name, x, z, width, depth, floors, height, color, kind } = options;
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.28,
    roughness: 0.37,
    emissive: 0x07141a,
  });
  const meta = {
    id,
    kind,
    name,
    details: [
      ['Asset ID', id],
      ['Fungsi kawasan', kind],
      ['Tinggi model', `${floors} lantai · ${Math.round(height)} m`],
      ['Luas tapak', `${(width * depth * 100).toLocaleString('id-ID')} m²`],
      ['Sistem terhubung', 'BIM · BMS · IoT'],
      ['Status', 'Operasi normal · demo'],
    ],
  };
  const main = box(parent, width, height, depth, material, x, height / 2, z, { selectable: meta });
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x7eabb1,
    metalness: 0.7,
    roughness: 0.33,
  });
  const slabMaterial = new THREE.MeshStandardMaterial({
    color: 0x9cafa9,
    metalness: 0.16,
    roughness: 0.65,
  });
  box(parent, width + 0.4, 0.34, depth + 0.4, slabMaterial, x, 0.2, z);
  box(parent, width + 0.22, 0.22, depth + 0.22, frameMaterial, x, height + 0.1, z);

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: colors.glass,
    emissive: 0xffc77b,
    emissiveIntensity: 0.22,
    metalness: 0.35,
    roughness: 0.26,
  });
  const windowGeometry = new THREE.BoxGeometry(0.55, 0.34, 0.08);
  const windows = new THREE.InstancedMesh(windowGeometry, windowMaterial, Math.max(1, floors * 12));
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  let count = 0;
  for (let floor = 0; floor < floors; floor += 1) {
    const y = 1.3 + floor * ((height - 1.6) / floors);
    for (let column = 0; column < 3; column += 1) {
      const offset = (column - 1) * width * 0.28;
      matrix.compose(new THREE.Vector3(x + offset, y, z + depth / 2 + 0.055), rotation, new THREE.Vector3(1, 1, 1));
      windows.setMatrixAt(count++, matrix);
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
      matrix.compose(new THREE.Vector3(x + offset, y, z - depth / 2 - 0.055), rotation, new THREE.Vector3(1, 1, 1));
      windows.setMatrixAt(count++, matrix);
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
      matrix.compose(new THREE.Vector3(x + width / 2 + 0.055, y, z + offset * 0.42), rotation, new THREE.Vector3(1, 1, 1));
      windows.setMatrixAt(count++, matrix);
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
      matrix.compose(new THREE.Vector3(x - width / 2 - 0.055, y, z + offset * 0.42), rotation, new THREE.Vector3(1, 1, 1));
      windows.setMatrixAt(count++, matrix);
      rotation.identity();
    }
  }
  windows.count = count;
  windows.instanceMatrix.needsUpdate = true;
  parent.add(windows);
  return main;
}

function addSensor(parent, x, y, z, index, options) {
  const color = options.color;
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.6,
    metalness: 0.25,
    roughness: 0.28,
  });
  const sensor = new THREE.Group();
  sensor.position.set(x, y, z);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.11, options.height || 1.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x8aa9a6, metalness: 0.72, roughness: 0.38 }),
  );
  pole.position.y = (options.height || 1.2) / 2;
  sensor.add(pole);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), material);
  orb.position.y = (options.height || 1.2) + 0.16;
  orb.userData.infraInfo = {
    id: options.id,
    name: options.name,
    kind: options.kind,
    details: [
      ['Sensor ID', options.id],
      ['Jenis sensor', options.name],
      ['Nilai demo', options.reading],
      ['Status koneksi', index === 4 ? 'Perlu verifikasi gateway' : 'Terhubung'],
      ['Pembaruan', `${5 + (index * 7) % 20} detik`],
      ['Sumber data', options.source],
    ],
  };
  orb.userData.baseEmissive = material.emissive.getHex();
  const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.46 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 28), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  sensor.add(orb, ring);
  sensor.userData.pulse = { orb, ring, phase: index * 0.77 };
  parent.add(sensor);
  return sensor;
}

function addLandscape(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(82, 82),
    new THREE.MeshStandardMaterial({ color: 0x203d3d, roughness: 0.96 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const plot = new THREE.MeshStandardMaterial({ color: 0x315848, roughness: 1 });
  [[-22, -18], [20, -18], [-22, 19], [23, 20], [0, 24]].forEach(([x, z]) => {
    box(scene, 15, 0.12, 13, plot, x, 0.04, z, { castShadow: false });
  });
  const road = new THREE.MeshStandardMaterial({ color: 0x172a34, roughness: 0.92 });
  [-31, 31].forEach(z => {
    box(scene, 82, 0.12, 5.2, road, 0, 0.09, z, { castShadow: false });
    for (let x = -37; x <= 37; x += 5) {
      box(scene, 2.2, 0.03, 0.08, new THREE.MeshBasicMaterial({ color: 0xc9d8cd }), x, 0.17, z, { castShadow: false });
    }
  });
  box(scene, 5, 0.12, 54, road, 0, 0.1, 0, { castShadow: false });
  const lawn = new THREE.MeshStandardMaterial({ color: 0x3f7753, roughness: 1 });
  const trees = new THREE.Group();
  const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.24, 1.3, 7);
  const canopyGeometry = new THREE.IcosahedronGeometry(0.9, 1);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x76563d, roughness: 1 });
  const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0x62a574, roughness: 0.87 });
  const trunkInstances = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, 30);
  const canopyInstances = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, 30);
  const matrix = new THREE.Matrix4();
  let treeCount = 0;
  for (let z = -26; z <= 25; z += 8) {
    for (const x of [-28, -22, 21, 28]) {
      if (Math.abs(z) < 14 && Math.abs(x) < 20) continue;
      matrix.compose(new THREE.Vector3(x, 0.72, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      trunkInstances.setMatrixAt(treeCount, matrix);
      matrix.compose(new THREE.Vector3(x, 1.9, z), new THREE.Quaternion(), new THREE.Vector3(0.8, 0.8, 0.8));
      canopyInstances.setMatrixAt(treeCount, matrix);
      treeCount += 1;
    }
  }
  trunkInstances.count = treeCount;
  canopyInstances.count = treeCount;
  trees.add(trunkInstances, canopyInstances);
  scene.add(trees);
  box(scene, 14, 0.08, 12, lawn, 16, 0.16, 14, { castShadow: false });
  box(scene, 0.16, 0.12, 11, new THREE.MeshStandardMaterial({ color: 0x52aab1, metalness: 0.38, roughness: 0.28 }), 16, 0.23, 14, { castShadow: false });
}

function addMechanicalPlant(parent) {
  const equipment = new THREE.Group();
  const housing = new THREE.MeshStandardMaterial({ color: 0x697d7d, metalness: 0.46, roughness: 0.48 });
  const fanMaterial = new THREE.MeshStandardMaterial({
    color: 0xffc569,
    emissive: 0x5a3c16,
    metalness: 0.35,
    roughness: 0.4,
  });
  const hvac = box(equipment, 3.5, 1.5, 2.8, housing.clone(), -2.4, 0, 0, {
    selectable: {
      id: 'AHU-ROOF-01',
      name: 'Air Handling Unit',
      kind: 'HVAC · atap',
      details: [['Asset ID', 'AHU-ROOF-01'], ['Lantai', 'Atap · zona A'], ['Mode', 'Otomatis · simulasi'], ['Filter', '78% usia pakai'], ['BMS', 'BACnet/IP · demo'], ['Kapasitas', '22.000 m³/jam']],
    },
  });
  hvac.position.y = 0.9;
  for (let index = 0; index < 3; index += 1) {
    const fan = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 7, 20), fanMaterial);
    fan.rotation.x = Math.PI / 2;
    fan.position.set(-3.1 + index * 0.68, 1.71, 0);
    equipment.add(fan);
  }
  const chiller = box(equipment, 2.8, 1.35, 2.6, housing.clone(), 2.5, 0.75, 0.2, {
    selectable: {
      id: 'CHW-LOOP-01',
      name: 'Chilled water plant',
      kind: 'Utilitas · cooling',
      details: [['Asset ID', 'CHW-LOOP-01'], ['Kapasitas', '450 RT · demo'], ['Supply / return', '7 / 12 °C'], ['Pompa sirkulasi', 'PMP-B02'], ['Efisiensi model', '0,72 kW/RT'], ['Status', 'Terkoneksi ke BMS']],
    },
  });
  chiller.position.y = 0.82;
  const ventMaterial = new THREE.MeshStandardMaterial({ color: colors.air, emissive: colors.air, emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.34 });
  const vent = box(equipment, 1.05, 0.14, 0.82, ventMaterial, -2.4, 0, 2.3, {
    selectable: {
      id: 'AHU-02-IAQ',
      name: 'Ventilasi udara segar',
      kind: 'IAQ · atap',
      details: [['Asset ID', 'AHU-02-IAQ'], ['Udara segar', '68% · demo'], ['CO₂ zona', '642 ppm · demo'], ['Mode', 'Normal'], ['Filter', 'HEPA + karbon'], ['Status', 'Sensor IAQ terhubung']],
    },
  });
  vent.position.y = 1.75;
  parent.add(equipment);
  return { equipment, hvac, chiller, vent, fanMaterial, ventMaterial };
}

function addPowerUtility(parent) {
  const utilities = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x708486, metalness: 0.55, roughness: 0.42 });
  const energy = box(utilities, 3.8, 1.4, 2.4, material.clone(), 0, 0.82, 12, {
    selectable: {
      id: 'MTR-MAIN-01',
      name: 'Meter energi utama',
      kind: 'Energi · gardu kawasan',
      details: [['Asset ID', 'MTR-MAIN-01'], ['Daya aktif', '486 kW · simulasi'], ['Energi harian', '8,42 MWh · demo'], ['Faktor daya', '0,96'], ['Koneksi', 'Modbus/TCP · demo'], ['Status', 'Normal']],
    },
  });
  const pump = box(utilities, 2.2, 1.2, 1.7, material.clone(), -9, 0.7, 15, {
    selectable: {
      id: 'PMP-B02',
      name: 'Pompa loop air',
      kind: 'Air · basement',
      details: [['Asset ID', 'PMP-B02'], ['Tekanan', '3,2 bar · demo'], ['Debit', '12,8 L/s · demo'], ['Daya', '11 kW · simulasi'], ['Status', 'Aktif'], ['Kontrol', 'VFD · simulasi']],
    },
  });
  box(utilities, 0.15, 0.06, 1.2, new THREE.MeshBasicMaterial({ color: colors.energy }), -1.15, 1.58, 12);
  parent.add(utilities);
  return { group: utilities, energy, pump };
}

function addElevator(parent, tower) {
  const shaftMaterial = new THREE.MeshStandardMaterial({
    color: 0x243c46,
    metalness: 0.54,
    roughness: 0.3,
    emissive: 0x286c67,
    emissiveIntensity: 0.2,
  });
  const lift = box(parent, 0.95, 1.22, 0.84, shaftMaterial, tower.x + tower.width / 2 + 0.65, 7, tower.z, {
    selectable: {
      id: 'CORE-02-LIFT',
      name: 'Lift penumpang',
      kind: 'Transport vertikal',
      details: [['Asset ID', 'CORE-02-LIFT'], ['Lantai model', '08 / 18'], ['Waktu tunggu', '24 detik · demo'], ['Status', 'Beroperasi'], ['Kontrol', 'BMS · simulasi'], ['Keamanan', 'Interlock · mock']],
    },
  });
  return lift;
}

function createInfrastructureScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1c27);
  scene.fog = new THREE.Fog(0x0a1c27, 65, 125);
  const ambient = new THREE.HemisphereLight(0xa9e5dc, 0x172a36, 2.15);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(0xffd7aa, 3.4);
  keyLight.position.set(-30, 45, 26);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -48;
  keyLight.shadow.camera.right = 48;
  keyLight.shadow.camera.top = 48;
  keyLight.shadow.camera.bottom = -48;
  scene.add(keyLight);

  const district = new THREE.Group();
  scene.add(district);
  addLandscape(district);
  const mainTowerOptions = { id: 'BLD-A-01', name: 'Menara A · kantor terpadu', x: 0, z: -1, width: 13, depth: 11, floors: 18, height: 25, color: 0x254452, kind: 'Kantor · kawasan terpadu' };
  const mainTower = makeBuilding(district, mainTowerOptions);
  box(district, 22, 3.2, 18, new THREE.MeshStandardMaterial({ color: 0x334f57, metalness: 0.32, roughness: 0.46 }), 0, 1.65, -1, {
    selectable: {
      id: 'POD-A-01',
      name: 'Podium kawasan · retail & transit',
      kind: 'Podium · 3 lantai',
      details: [['Asset ID', 'POD-A-01'], ['Fungsi', 'Retail · lobby · transit'], ['Luas model', '3.240 m²'], ['Arus pengunjung', '2.180 orang/hari · demo'], ['AC retail', 'AHU-POD-01'], ['Status', 'Operasional · mock']],
    },
  });
  const eastTower = makeBuilding(district, { id: 'BLD-B-02', name: 'Menara B · hunian vertikal', x: 18, z: -1, width: 8, depth: 9, floors: 12, height: 17, color: 0x315761, kind: 'Hunian · apartemen' });
  const westBuilding = makeBuilding(district, { id: 'BLD-C-03', name: 'Gedung C · fasilitas publik', x: -18, z: -2, width: 10, depth: 11, floors: 7, height: 11, color: 0x3b565b, kind: 'Fasilitas publik · kesehatan' });
  const annex = makeBuilding(district, { id: 'BLD-D-04', name: 'Gedung D · pusat komunitas', x: 17, z: 17, width: 10, depth: 8, floors: 5, height: 8.5, color: 0x38505d, kind: 'Pendidikan · komunitas' });
  const neighbor = makeBuilding(district, { id: 'BLD-E-05', name: 'Gedung E · komersial', x: -18, z: 17, width: 11, depth: 9, floors: 9, height: 13, color: 0x2b4958, kind: 'Komersial · perkantoran' });

  const roof = new THREE.Group();
  roof.position.set(0, 25, -1);
  district.add(roof);
  const roofBase = new THREE.MeshStandardMaterial({ color: 0x21343b, metalness: 0.5, roughness: 0.48 });
  const plant = addMechanicalPlant(roof);
  box(roof, 4.4, 0.18, 3.4, roofBase, 0, 0.09, -4.5);
  const solarMaterial = new THREE.MeshStandardMaterial({ color: 0x19778a, metalness: 0.7, roughness: 0.24, emissive: 0x052d3a });
  const solar = [];
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      solar.push(box(roof, 1.05, 0.12, 1.35, solarMaterial, -4.2 + col * 1.28, 0.72, 2.3 + row * 1.62));
    }
  }
  const roofInfo = {
    id: 'ROOF-A-01',
    name: 'Atap biru · PV & utilitas',
    kind: 'Energi terbarukan · HVAC',
    details: [['Asset ID', 'ROOF-A-01'], ['Panel surya', '72 kWp · demo'], ['Produksi sesaat', '48 kW · simulasi'], ['AHU rooftop', '3 unit · mock'], ['Sistem', 'BMS · PV inverter'], ['Status', 'Produksi normal']],
  };
  solar[0].userData.infraInfo = roofInfo;
  solar[0].userData.baseEmissive = solarMaterial.emissive.getHex();

  const utility = addPowerUtility(district);
  const towerForLift = { x: mainTowerOptions.x, z: mainTowerOptions.z, width: mainTowerOptions.width };
  const lift = addElevator(district, towerForLift);
  const sensorGroup = new THREE.Group();
  district.add(sensorGroup);
  const sensors = [
    addSensor(sensorGroup, -5.4, 2.2, -1.2, 0, { id: 'IAQ-A-L08', name: 'Sensor CO₂ & suhu', kind: 'Indoor air quality', reading: '23,8 °C · 642 ppm', source: 'AHU-02 · Lantai 08', color: colors.air }),
    addSensor(sensorGroup, 5.4, 12, -1.2, 1, { id: 'IAQ-A-L15', name: 'Sensor CO₂ & okupansi', kind: 'IAQ · ruang kerja', reading: '24,1 °C · 711 ppm', source: 'Zona meeting · Lantai 15', color: colors.air }),
    addSensor(sensorGroup, 6.9, 27, -1.2, 2, { id: 'TH-A-ROOF', name: 'Sensor cuaca atap', kind: 'Suhu · kelembapan', reading: '31,4 °C · 68% RH', source: 'Mast cuaca · rooftop', color: colors.energy, height: 1.55 }),
    addSensor(sensorGroup, -3.2, 26.6, -1.3, 3, { id: 'VIB-A-01', name: 'Akselerometer struktur', kind: 'Structural health monitoring', reading: '1,8 mm/s · normal', source: 'Core struktur · rooftop', color: colors.structure, height: 1.3 }),
    addSensor(sensorGroup, -9.4, 1.4, 15, 4, { id: 'PRES-B02', name: 'Sensor tekanan air', kind: 'Utilitas · hidronik', reading: '3,2 bar · stabil', source: 'PMP-B02 · basement', color: colors.water }),
    addSensor(sensorGroup, 0, 1.7, 12, 5, { id: 'MTR-MAIN-01', name: 'Submeter energi', kind: 'Energi · listrik', reading: '486 kW · faktor daya 0,96', source: 'Gardu kawasan · LVMDP', color: colors.energy }),
    addSensor(sensorGroup, 1, 2.2, -6.5, 6, { id: 'SMK-A-L02', name: 'Detektor asap & panas', kind: 'Keselamatan kebakaran', reading: 'Siaga · normal', source: 'FACP-01 · Zona Podium', color: colors.structure }),
    addSensor(sensorGroup, -16.6, 1.4, -3, 7, { id: 'IAQ-EXT-01', name: 'Sensor kualitas udara luar', kind: 'Lingkungan · perimeter', reading: 'AQI 36 · baik', source: 'Perimeter barat', color: colors.air }),
  ];
  sensors[4].children[1].userData.infraInfo.details[0] = ['Sensor ID', 'PRES-B02'];

  const linkMaterial = new THREE.LineBasicMaterial({ color: 0x69d9cb, transparent: true, opacity: 0.62 });
  const gateway = new THREE.Group();
  gateway.position.set(9, 0, 10);
  district.add(gateway);
  const gatewayBox = new THREE.MeshStandardMaterial({ color: 0x173e49, metalness: 0.54, roughness: 0.32, emissive: 0x075b59, emissiveIntensity: 0.72 });
  const hub = box(gateway, 1.8, 2.4, 1.8, gatewayBox, 0, 1.3, 0, {
    selectable: {
      id: 'DT-GW-01',
      name: 'Gateway Digital Twin',
      kind: 'Edge · BMS · IoT',
      details: [['Asset ID', 'DT-GW-01'], ['Node terhubung', '12 / 12 · demo'], ['Protokol', 'BACnet · MQTT · Modbus'], ['Latensi model', '240 ms'], ['Status', 'Online'], ['Keamanan', 'Segmentasi OT · mock']],
    },
  });
  sensors.forEach(sensor => {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(sensor.position.x, sensor.position.y + 1.1, sensor.position.z),
        new THREE.Vector3(gateway.position.x, 1.5, gateway.position.z),
      ]),
      linkMaterial,
    );
    district.add(line);
  });

  const roadVehicleGroup = new THREE.Group();
  const vehicleMaterial = new THREE.MeshStandardMaterial({ color: 0x8fe8dc, emissive: 0x2ca99c, emissiveIntensity: 1.1, metalness: 0.34, roughness: 0.34 });
  const vehicle = box(roadVehicleGroup, 0.9, 0.45, 1.7, vehicleMaterial, -34, 0.45, 31, { castShadow: true });
  vehicle.userData.infraInfo = {
    id: 'LOG-01',
    name: 'Kendaraan inspeksi kawasan',
    kind: 'Operasi · pemeliharaan',
    details: [['Asset ID', 'LOG-01'], ['Tugas', 'Patroli aset · demo'], ['Rute', 'Perimeter kawasan'], ['Status', 'Bergerak'], ['Koneksi', 'IoT telemetry'], ['Sumber', 'Simulasi lokal']],
  };
  district.add(roadVehicleGroup);

  const backgroundMaterial = new THREE.MeshStandardMaterial({ color: 0x1b303c, roughness: 0.82 });
  for (let index = 0; index < 20; index += 1) {
    const angle = (index / 20) * Math.PI * 2;
    const x = Math.cos(angle) * 52;
    const z = Math.sin(angle) * 52;
    const height = 6 + (index * 13 % 16);
    box(district, 4.5, height, 4.5, backgroundMaterial, x, height / 2, z, { castShadow: false });
  }
  const selectable = [mainTower, eastTower, westBuilding, annex, neighbor, plant.hvac, plant.chiller, plant.vent, utility.energy, utility.pump, lift, hub, vehicle, solar[0], ...sensors.map(sensor => sensor.children[1])];
  return {
    scene,
    district,
    sensors,
    sensorMeshes: sensors.map(sensor => sensor.children[1]),
    selectable,
    plant,
    utility,
    lift,
    solar,
    windows: plant.hvac.material,
    roadVehicleGroup,
    roadVehicle: vehicle,
    mainTower,
    skyLight: ambient,
  };
}

export function mountPilotInfrastructureScene(root) {
  const dashboard = root.closest('.pilot-infra-simulation') || root;
  const lowPower = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches
    || (Number(navigator.deviceMemory) > 0 && Number(navigator.deviceMemory) <= 4);
  const targetFrameMs = lowPower ? 1000 / 24 : 1000 / 30;
  const status = root.querySelector('[data-infra-scene-status]');
  const canvas = document.createElement('canvas');
  canvas.className = 'pilot-city-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Digital Twin 3D kawasan gedung dengan sensor suhu, udara, energi, air, getaran, dan keselamatan. Seret untuk orbit; pilih aset untuk detail.');
  canvas.tabIndex = 0;
  root.prepend(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: false, powerPreference: 'low-power' });
  } catch (error) {
    canvas.remove();
    if (status) status.textContent = 'Perangkat ini belum mendukung WebGL. Panel monitoring dan simulasi kontrol tetap dapat digunakan.';
    console.error('WebGL tidak tersedia untuk simulasi infrastruktur.', error);
    return () => {};
  }

  let model;
  try {
    model = createInfrastructureScene();
  } catch (error) {
    renderer.dispose();
    canvas.remove();
    if (status) status.textContent = 'Model kawasan tidak dapat disiapkan. Panel monitoring dan kontrol demo tetap dapat digunakan.';
    console.error('Model 3D infrastruktur gagal dibuat.', error);
    return () => {};
  }
  const { scene, district } = model;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
  const target = new THREE.Vector3(0, 8, 0);
  let theta = -0.72;
  let phi = 0.94;
  let radius = 65;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.15 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const readingElements = Object.fromEntries(
    ['temperature', 'air', 'power', 'water', 'vibration', 'alarms'].map(key => [key, dashboard.querySelector(`[data-infra-reading="${key}"]`)]),
  );
  const selectedName = dashboard.querySelector('[data-infra-selected-name]');
  const selectedDetail = dashboard.querySelector('[data-infra-selected-detail]');
  const selectedMeta = dashboard.querySelector('[data-infra-selected-meta]');
  const controls = {
    hvacState: dashboard.querySelector('[data-infra-hvac-state]'),
    lightingState: dashboard.querySelector('[data-infra-light-state]'),
    pumpState: dashboard.querySelector('[data-infra-pump-state]'),
    liftState: dashboard.querySelector('[data-infra-lift-state]'),
    ventState: dashboard.querySelector('[data-infra-vent-state]'),
    fireState: dashboard.querySelector('[data-infra-fire-state]'),
    setpointInput: dashboard.querySelector('[data-infra-setpoint]'),
    setpointLabel: dashboard.querySelector('[data-infra-setpoint-label]'),
    lightingInput: dashboard.querySelector('[data-infra-lighting]'),
    lightingLabel: dashboard.querySelector('[data-infra-light-label]'),
    hvacBadge: dashboard.querySelector('[data-infra-equipment="hvac"]'),
    lightBadge: dashboard.querySelector('[data-infra-equipment="lighting"]'),
    pumpBadge: dashboard.querySelector('[data-infra-equipment="pump"]'),
    liftBadge: dashboard.querySelector('[data-infra-equipment="lift"]'),
    ventBadge: dashboard.querySelector('[data-infra-equipment="ventilation"]'),
    fireBadge: dashboard.querySelector('[data-infra-equipment="fire"]'),
    pressure: dashboard.querySelector('[data-infra-pressure]'),
    flow: dashboard.querySelector('[data-infra-flow]'),
    liftFloor: dashboard.querySelector('[data-infra-lift-floor]'),
    liftWait: dashboard.querySelector('[data-infra-lift-wait]'),
    freshAir: dashboard.querySelector('[data-infra-fresh-air]'),
    co2: dashboard.querySelector('[data-infra-co2]'),
    fireZone: dashboard.querySelector('[data-infra-fire-zone]'),
    alerts: dashboard.querySelector('[data-infra-alerts]'),
    fireAlert: dashboard.querySelector('[data-infra-fire-alert]'),
    connection: dashboard.querySelector('[data-infra-connection]'),
    clock: dashboard.querySelector('[data-infra-clock]'),
  };

  const state = {
    hvac: 'auto',
    setpoint: 23,
    lighting: 72,
    pump: true,
    liftFloor: 8,
    vent: 'normal',
    fireTest: false,
    paused: false,
    selected: null,
    elapsed: 0,
    temperature: 23.8,
    co2: 642,
    power: 486,
    water: 12.8,
    vibration: 1.8,
  };
  let frameId = 0;
  let lastTime = 0;
  let metricTimer = 0;
  let elapsedSeconds = 0;
  let active = true;
  let pointerDown = null;
  let dragged = false;
  let lastPointer = null;
  let selectedMesh = null;
  let disposed = false;
  const pointers = new Map();
  let pinchDistance = 0;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function updateCamera() {
    const sine = Math.sin(phi);
    camera.position.set(
      target.x + radius * sine * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * sine * Math.cos(theta),
    );
    camera.lookAt(target);
  }

  function draw() {
    if (disposed) return;
    updateCamera();
    renderer.render(scene, camera);
  }

  function resize() {
    const { width, height } = root.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  }

  function setBadge(element, text, on) {
    element.textContent = text;
    element.classList.toggle('state-on', on);
    element.classList.toggle('state-off', !on);
  }

  function setSelected(object) {
    if (selectedMesh?.material?.emissive) selectedMesh.material.emissive.setHex(selectedMesh.userData.baseEmissive || 0);
    selectedMesh = object || null;
    state.selected = object?.userData.infraInfo || null;
    if (!state.selected) {
      selectedName.textContent = 'Kawasan Digital Twin';
      selectedDetail.textContent = 'Pilih gedung, sensor, atau utilitas pada model untuk melihat identitas dan statusnya.';
      selectedMeta.textContent = 'DT-KAWASAN-01 · BMS TERHUBUNG · 12 GEDUNG';
      draw();
      return;
    }
    if (selectedMesh.material?.emissive) {
      selectedMesh.material.emissive.setHex(0x397f70);
    }
    selectedName.textContent = `${state.selected.id} · ${state.selected.name}`;
    selectedDetail.textContent = `${state.selected.kind} · informasi aset demonstrasi`;
    selectedMeta.replaceChildren();
    state.selected.details.forEach(([label, value], index) => {
      if (index > 0) selectedMeta.append(document.createTextNode(' · '));
      const item = document.createElement('span');
      item.textContent = `${label}: ${value}`;
      selectedMeta.append(item);
    });
    draw();
  }

  function showInfraView(view) {
    dashboard.querySelectorAll('[data-infra-view]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.infraView === view));
    });
    if (view === 'building') {
      target.set(0, 11, -1);
      theta = -0.7;
      phi = 0.88;
      radius = 41;
    } else {
      target.set(0, 8, 0);
      theta = -0.72;
      phi = 0.94;
      radius = 65;
    }
    draw();
  }

  function renderMetrics() {
    state.elapsed += 1;
    const hvacLoad = state.hvac === 'off' ? 0 : state.hvac === 'eco' ? 0.56 : 0.82;
    const lightLoad = state.lighting / 100 * 0.19;
    const airLoad = state.vent === 'boost' ? 0.13 : 0.07;
    state.power = Math.round((146 + hvacLoad * 310 + lightLoad * 160 + airLoad * 70 + Math.sin(state.elapsed / 6) * 4) * 10) / 10;
    state.temperature += state.hvac === 'off' ? 0.015 : (state.setpoint - state.temperature) * (state.hvac === 'eco' ? 0.025 : 0.07);
    state.co2 += state.vent === 'boost' ? -2.4 : 0.45;
    state.co2 = THREE.MathUtils.clamp(state.co2, 418, 920);
    state.water = state.pump ? 12.8 + Math.sin(state.elapsed / 8) * 0.6 : 0;
    state.vibration = 1.8 + Math.sin(state.elapsed / 9) * 0.12;
    const fixed = value => value.toFixed(1).replace('.', ',');
    readingElements.temperature.innerHTML = `${fixed(state.temperature)} <small>°C</small>`;
    readingElements.air.innerHTML = `${Math.round(state.co2)} <small>ppm CO₂</small>`;
    readingElements.power.innerHTML = `${Math.round(state.power)} <small>kW</small>`;
    readingElements.water.innerHTML = `${fixed(state.water)} <small>L/s</small>`;
    readingElements.vibration.innerHTML = `${fixed(state.vibration)} <small>mm/s</small>`;
    readingElements.alarms.innerHTML = `${state.fireTest ? '3' : '2'} <small>perlu ditinjau</small>`;
    controls.pressure.textContent = state.pump ? '3,2 bar' : '0,0 bar';
    controls.flow.textContent = `${fixed(state.water)} L/s`;
    controls.co2.textContent = `${Math.round(state.co2)} ppm`;
    controls.connection.textContent = state.fireTest ? '12/12 node · uji alarm aktif' : '12/12 node terhubung';
    dashboard.querySelector('[data-infra-alarm-summary]').textContent = state.fireTest
      ? '1 kenyamanan · 1 pemeliharaan · uji FACP'
      : '1 kenyamanan · 1 pemeliharaan';
    controls.fireAlert.hidden = !state.fireTest;
    controls.clock.textContent = new Date().toLocaleTimeString('id-ID', { hour12: false });
    dashboard.querySelector('.pilot-infra-spark.spark-energy i').style.height = `${34 + (Math.round(state.power) % 54)}%`;
    dashboard.querySelector('.pilot-infra-spark.spark-air i').style.height = `${30 + (Math.round(state.co2) % 56)}%`;
    dashboard.querySelector('.pilot-infra-spark.spark-temp i').style.height = `${34 + (Math.round(state.temperature * 7) % 52)}%`;
    dashboard.querySelector('.pilot-infra-spark.spark-water i').style.height = `${25 + (Math.round(state.water * 4) % 58)}%`;
    dashboard.querySelector('.pilot-infra-spark.spark-vibration i').style.height = `${30 + (Math.round(state.vibration * 11) % 42)}%`;
  }

  function updateHvac(mode) {
    if (!['auto', 'eco', 'off'].includes(mode)) return;
    state.hvac = mode;
    dashboard.querySelectorAll('[data-infra-hvac]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.infraHvac === mode)));
    const active = mode !== 'off';
    setBadge(controls.hvacBadge, active ? 'AKTIF' : 'NONAKTIF', active);
    controls.hvacState.textContent = mode === 'auto' ? 'Mode otomatis · aktif' : mode === 'eco' ? 'Mode hemat · aktif' : 'Unit dihentikan · simulasi';
    model.plant.hvac.material.emissive.setHex(active ? colors.mint : 0x241f19);
    renderMetrics();
    draw();
  }

  function updateLighting(value) {
    state.lighting = Number(value);
    controls.lightingLabel.textContent = `${state.lighting}%`;
    const active = state.lighting > 0;
    setBadge(controls.lightBadge, active ? 'AKTIF' : 'PADAM', active);
    controls.lightingState.textContent = active ? `Intensitas ${state.lighting}% · simulasi` : 'Lampu padam · simulasi';
    model.plant.fanMaterial.emissiveIntensity = 0.16 + state.lighting / 100 * 0.75;
    renderMetrics();
    draw();
  }

  function setPump(active) {
    state.pump = active;
    dashboard.querySelector('[data-infra-pump-toggle]').setAttribute('aria-pressed', String(active));
    dashboard.querySelector('[data-infra-pump-toggle]').textContent = active ? 'Matikan pompa simulasi' : 'Nyalakan pompa simulasi';
    setBadge(controls.pumpBadge, active ? 'AKTIF' : 'MATI', active);
    controls.pumpState.textContent = active ? 'Tekanan loop normal' : 'Pompa berhenti · simulasi';
    model.utility.pump.material.emissive.setHex(active ? colors.water : 0x102027);
    renderMetrics();
    draw();
  }

  function setVent(mode) {
    state.vent = mode;
    dashboard.querySelectorAll('[data-infra-vent]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.infraVent === mode)));
    const boost = mode === 'boost';
    setBadge(controls.ventBadge, boost ? 'BOOST' : 'AUTO', true);
    controls.ventState.textContent = boost ? 'Pasokan udara segar ditingkatkan · demo' : 'Pasokan udara segar · normal';
    controls.freshAir.textContent = boost ? '92%' : '68%';
    model.plant.ventMaterial.emissiveIntensity = boost ? 1.3 : 0.4;
    renderMetrics();
    draw();
  }

  function setFireTest(active) {
    state.fireTest = active;
    dashboard.classList.toggle('is-fire-test', active);
    setBadge(controls.fireBadge, active ? 'UJI AKTIF' : 'SIAGA', true);
    controls.fireState.textContent = active ? 'Uji alarm simulasi · zona A-08' : 'Sistem siaga · seluruh zona normal';
    controls.fireZone.textContent = active ? 'A-08 · uji' : '0';
    controls.fireAlert.hidden = !active;
    const button = dashboard.querySelector('[data-infra-fire-test]');
    button.textContent = active ? 'Akhiri uji simulasi' : 'Uji alarm simulasi';
    button.setAttribute('aria-pressed', String(active));
    renderMetrics();
    draw();
  }

  function moveLift() {
    state.liftFloor = state.liftFloor >= 18 ? 2 : state.liftFloor + 3;
    controls.liftFloor.textContent = `${String(state.liftFloor).padStart(2, '0')} / 18`;
    controls.liftWait.textContent = `${12 + (state.liftFloor * 7) % 21} dtk`;
    controls.liftState.textContent = `Bergerak ke lantai ${state.liftFloor} · simulasi`;
    model.lift.position.y = 2 + state.liftFloor / 18 * 23;
    model.lift.material.emissive.setHex(0x38bfa7);
    draw();
  }

  function onControlClick(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-infra-hvac], [data-infra-light-preset], [data-infra-pump-toggle], [data-infra-lift-call], [data-infra-vent], [data-infra-fire-test], [data-infra-view]');
    if (!button || !dashboard.contains(button)) return;
    if (button.dataset.infraHvac) updateHvac(button.dataset.infraHvac);
    else if (button.dataset.infraLightPreset) updateLighting(button.dataset.infraLightPreset === 'saving' ? 38 : 76);
    else if (button.matches('[data-infra-pump-toggle]')) setPump(!state.pump);
    else if (button.matches('[data-infra-lift-call]')) moveLift();
    else if (button.dataset.infraVent) setVent(button.dataset.infraVent);
    else if (button.matches('[data-infra-fire-test]')) setFireTest(!state.fireTest);
    else if (button.dataset.infraView) showInfraView(button.dataset.infraView);
  }

  function onControlInput(event) {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (event.target.matches('[data-infra-setpoint]')) {
      state.setpoint = Number(event.target.value);
      controls.setpointLabel.textContent = `${state.setpoint.toFixed(1).replace('.', ',')} °C`;
      renderMetrics();
    } else if (event.target.matches('[data-infra-lighting]')) updateLighting(event.target.value);
  }

  function pickObject(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(model.selectable, false)[0]?.object;
    setSelected(hit?.userData.infraInfo ? hit : null);
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      pointerDown = { x: event.clientX, y: event.clientY };
      lastPointer = pointerDown;
      dragged = false;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      dragged = true;
    }
  }

  function onPointerMove(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 6) dragged = true;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance > 0 && distance > 0) radius = THREE.MathUtils.clamp(radius * pinchDistance / distance, 35, 96);
      pinchDistance = distance;
    } else if (lastPointer) {
      theta -= (event.clientX - lastPointer.x) * 0.008;
      phi = THREE.MathUtils.clamp(phi + (event.clientY - lastPointer.y) * 0.006, 0.4, 1.34);
    }
    lastPointer = { x: event.clientX, y: event.clientY };
    draw();
  }

  function onPointerUp(event) {
    if (pointers.has(event.pointerId) && !dragged && pointers.size === 1) pickObject(event.clientX, event.clientY);
    pointers.delete(event.pointerId);
    pointerDown = null;
    lastPointer = null;
    pinchDistance = 0;
  }

  function onWheel(event) {
    event.preventDefault();
    radius = THREE.MathUtils.clamp(radius + event.deltaY * 0.035, 35, 96);
    draw();
  }

  function onKeyDown(event) {
    const actions = {
      ArrowLeft: () => { theta -= 0.12; },
      ArrowRight: () => { theta += 0.12; },
      ArrowUp: () => { phi = THREE.MathUtils.clamp(phi - 0.08, 0.4, 1.34); },
      ArrowDown: () => { phi = THREE.MathUtils.clamp(phi + 0.08, 0.4, 1.34); },
      '+': () => { radius = Math.max(35, radius - 4); },
      '=': () => { radius = Math.max(35, radius - 4); },
      '-': () => { radius = Math.min(96, radius + 4); },
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
    if (lastTime && time - lastTime < targetFrameMs) {
      frameId = requestAnimationFrame(animate);
      return;
    }
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    state.elapsed += delta;
    model.sensors.forEach(sensor => {
      const pulse = sensor.userData.pulse;
      const scale = 1 + Math.sin(state.elapsed * 2 + pulse.phase) * 0.13;
      pulse.orb.scale.setScalar(scale);
      pulse.ring.material.opacity = 0.24 + (Math.sin(state.elapsed * 2 + pulse.phase) + 1) * 0.12;
    });
    model.roadVehicleGroup.position.x = 0.2 + Math.sin(state.elapsed * 0.15) * 20;
    if (Math.floor(state.elapsed * 12) !== elapsedSeconds) {
      elapsedSeconds = Math.floor(state.elapsed * 12);
      renderer.render(scene, camera);
    }
    frameId = requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (!frameId && !disposed && active && !document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lastTime = 0;
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
      if (!metricTimer && !document.hidden) metricTimer = window.setInterval(renderMetrics, 1700);
    } else {
      cancelAnimationFrame(frameId);
      frameId = 0;
      clearInterval(metricTimer);
      metricTimer = 0;
    }
  }, { threshold: 0.02 });
  intersectionObserver.observe(root);
  dashboard.addEventListener('click', onControlClick);
  dashboard.addEventListener('input', onControlInput);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('keydown', onKeyDown);

  const onVisibilityChange = () => {
    if (document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = 0;
      clearInterval(metricTimer);
      metricTimer = 0;
    } else if (active) {
      startAnimation();
      if (!metricTimer) metricTimer = window.setInterval(renderMetrics, 1700);
      renderMetrics();
      draw();
    }
  };
  const onMotionChange = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cancelAnimationFrame(frameId);
      frameId = 0;
      draw();
    } else startAnimation();
  };
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('visibilitychange', onVisibilityChange);
  media.addEventListener('change', onMotionChange);
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
    dashboard.removeEventListener('click', onControlClick);
    dashboard.removeEventListener('input', onControlInput);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    media.removeEventListener('change', onMotionChange);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('keydown', onKeyDown);
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
