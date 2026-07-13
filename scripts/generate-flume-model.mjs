import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.FileReader = class {
  result = null;
  onloadend = null;

  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }

  async readAsDataURL(blob) {
    const buffer = Buffer.from(await blob.arrayBuffer());
    this.result = `data:${blob.type || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
    this.onloadend?.();
  }
};

const outDir = path.resolve('models');
await fs.mkdir(outDir, { recursive: true });

const scene = new THREE.Scene();
scene.name = 'Intelligent Water Channel - multi-level flume system';

const materials = {
  steel: new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.75, roughness: 0.28 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x171717, metalness: 0.8, roughness: 0.22 }),
  pipe: new THREE.MeshStandardMaterial({ color: 0x262626, metalness: 0.9, roughness: 0.18 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x9fd7ff,
    transparent: true,
    opacity: 0.24,
    roughness: 0.02,
    metalness: 0,
    transmission: 0.45,
    thickness: 0.03
  }),
  water: new THREE.MeshPhysicalMaterial({
    color: 0x0078ff,
    transparent: true,
    opacity: 0.55,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.15
  }),
  red: new THREE.MeshStandardMaterial({ color: 0xd20b0b, metalness: 0.35, roughness: 0.25 }),
  green: new THREE.MeshStandardMaterial({ color: 0x008c28, metalness: 0.35, roughness: 0.3 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xe08100, metalness: 0.35, roughness: 0.3 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x006bd6, metalness: 0.55, roughness: 0.22 }),
  labelBlue: new THREE.MeshStandardMaterial({ color: 0x0b4488, metalness: 0.2, roughness: 0.35 }),
  labelOrange: new THREE.MeshStandardMaterial({ color: 0xd89400, metalness: 0.2, roughness: 0.35 }),
  labelGreen: new THREE.MeshStandardMaterial({ color: 0x0b7d18, metalness: 0.2, roughness: 0.35 })
};

function box(name, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  scene.add(mesh);
  return mesh;
}

function cylinder(name, radius, depth, position, rotation, material, radialSegments = 40) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, radialSegments), material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  scene.add(mesh);
  return mesh;
}

function pipeCurve(name, points, radius = 0.08) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, radius, 20, false), materials.pipe);
  mesh.name = name;
  scene.add(mesh);
  return mesh;
}

function channel(name, x, y, z, length, waterHeight, labelColor) {
  const depth = 0.52;
  const wall = 0.035;
  const height = 0.46;

  box(`${name} water body`, [length, waterHeight, depth - wall * 3], [x, y - height / 2 + waterHeight / 2 + wall, z], materials.water);
  box(`${name} glass front wall`, [length, height, wall], [x, y, z + depth / 2], materials.glass);
  box(`${name} glass back wall`, [length, height, wall], [x, y, z - depth / 2], materials.glass);
  box(`${name} glass bottom`, [length, wall, depth], [x, y - height / 2, z], materials.glass);
  box(`${name} left glass end`, [wall, height, depth], [x - length / 2, y, z], materials.glass);
  box(`${name} right glass end`, [wall, height, depth], [x + length / 2, y, z], materials.glass);

  box(`${name} steel lower rail`, [length + 0.2, 0.07, 0.08], [x, y - height / 2 - 0.06, z + depth / 2 + 0.02], materials.steel);
  box(`${name} steel rear rail`, [length + 0.2, 0.07, 0.08], [x, y - height / 2 - 0.06, z - depth / 2 - 0.02], materials.steel);
  box(`${name} label plaque`, [1.0, 0.08, 0.03], [x, y + 0.03, z + depth / 2 + 0.07], labelColor);
}

function gate(name, x, y, z, material) {
  box(`${name} gate blade`, [0.12, 0.5, 0.08], [x, y + 0.03, z + 0.33], material);
  box(`${name} gate frame left`, [0.05, 0.62, 0.08], [x - 0.11, y + 0.03, z + 0.33], material);
  box(`${name} gate frame right`, [0.05, 0.62, 0.08], [x + 0.11, y + 0.03, z + 0.33], material);
  box(`${name} gate top frame`, [0.26, 0.05, 0.08], [x, y + 0.34, z + 0.33], material);
  cylinder(`${name} hand wheel`, 0.13, 0.018, [x, y + 0.68, z + 0.33], [Math.PI / 2, 0, 0], material, 32);
  cylinder(`${name} valve stem`, 0.018, 0.42, [x, y + 0.48, z + 0.33], [0, 0, 0], material, 16);
}

function arrow(name, x, y, z, direction = 1) {
  cylinder(`${name} arrow shaft`, 0.025, 0.55, [x, y, z], [0, 0, Math.PI / 2], materials.blue, 16);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 24), materials.blue);
  cone.name = `${name} arrow head`;
  cone.position.set(x + direction * 0.34, y, z);
  cone.rotation.set(0, 0, direction > 0 ? -Math.PI / 2 : Math.PI / 2);
  scene.add(cone);
}

function labelMarker(name, x, y, z, colorMat) {
  box(`${name} marker plate`, [0.55, 0.2, 0.035], [x, y, z], colorMat);
  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 3), colorMat);
  pointer.name = `${name} pointer triangle`;
  pointer.position.set(x, y - 0.16, z);
  pointer.rotation.set(0, 0, Math.PI);
  scene.add(pointer);
}

const levels = [
  { name: 'Channel 1 L=8.0m depth=0.40m', y: 3.0, length: 8.0, water: 0.34 },
  { name: 'Channel 2 L=3.5m + Channel 3 L=4.5m slope=42%', y: 1.9, length: 7.7, water: 0.30 },
  { name: 'Channel 4 L=2.5m + Channel 5 L=5.0m depth=0.37m', y: 0.8, length: 7.2, water: 0.31 },
  { name: 'Channel 6 L=6.0m', y: -0.3, length: 6.6, water: 0.28 }
];

for (const level of levels) {
  channel(level.name, 0, level.y, 0, level.length, level.water, materials.labelBlue);
}

box('Bottom collection basin glass', [7.3, 0.42, 0.58], [0, -1.05, 0], materials.glass);
box('Bottom collection basin water', [7.0, 0.26, 0.48], [0, -1.10, 0], materials.water);
box('Base steel skid', [7.6, 0.08, 0.8], [0, -1.36, 0], materials.steel);

const postXs = [-4.15, 4.15];
for (const px of postXs) {
  box(`front vertical support ${px}`, [0.08, 4.7, 0.08], [px, 0.85, 0.38], materials.steel);
  box(`rear vertical support ${px}`, [0.08, 4.7, 0.08], [px, 0.85, -0.38], materials.steel);
}
for (const y of [3.0, 1.9, 0.8, -0.3, -1.32]) {
  box(`front cross beam y=${y}`, [8.45, 0.07, 0.08], [0, y - 0.36, 0.42], materials.steel);
  box(`rear cross beam y=${y}`, [8.45, 0.07, 0.08], [0, y - 0.36, -0.42], materials.steel);
}

gate('G0 red inlet gate', -2.9, 3.0, 0, materials.red);
gate('G1 red outlet gate', 3.65, 3.0, 0, materials.red);
gate('G2 orange middle gate', 0.45, 1.9, 0, materials.orange);
gate('G3 green branch gate', -2.8, 1.9, 0, materials.green);
gate('G4 green branch gate', -2.85, 0.8, 0, materials.green);
gate('G5 red side gate', 4.2, 0.8, 0, materials.red);
gate('G6 green inlet gate', -2.85, -0.3, 0, materials.green);
gate('G6 red outlet gate', 3.55, -0.3, 0, materials.red);

for (const level of levels) {
  cylinder(`${level.name} left nozzle`, 0.16, 0.26, [-level.length / 2 - 0.18, level.y - 0.03, 0], [0, 0, Math.PI / 2], materials.pipe);
  cylinder(`${level.name} right nozzle`, 0.16, 0.26, [level.length / 2 + 0.18, level.y - 0.03, 0], [0, 0, Math.PI / 2], materials.pipe);
}

pipeCurve('left recirculation pipe DN200', [
  [-4.65, -1.15, 0], [-4.65, -0.3, 0], [-4.55, 0.2, 0], [-4.3, 0.8, 0],
  [-4.55, 1.25, 0], [-4.65, 1.9, 0], [-4.65, 2.55, 0], [-4.4, 3.0, 0]
], 0.12);
pipeCurve('right siphon pipe 1-2 DN200', [
  [4.35, 3.0, 0], [4.75, 3.0, 0], [4.95, 2.65, 0], [4.95, 2.2, 0],
  [4.7, 1.9, 0], [4.25, 1.9, 0]
], 0.12);
pipeCurve('right siphon pipe 3-4 DN200', [
  [4.25, 0.8, 0], [4.85, 0.8, 0], [5.0, 0.35, 0], [5.0, -0.1, 0],
  [4.7, -0.3, 0], [3.55, -0.3, 0]
], 0.12);

for (const y of [-0.85, 0.35, 1.48, 2.55]) {
  cylinder(`pipe clamp y=${y}`, 0.145, 0.06, [-4.65, y, 0], [Math.PI / 2, 0, 0], materials.darkSteel, 32);
  cylinder(`right pipe clamp y=${y}`, 0.145, 0.06, [4.95, y, 0], [Math.PI / 2, 0, 0], materials.darkSteel, 32);
}

cylinder('pump motor blue ribbed cylinder', 0.33, 0.65, [-5.75, -1.18, 0], [0, 0, Math.PI / 2], materials.blue, 48);
cylinder('pump volute blue', 0.42, 0.32, [-5.25, -1.18, 0], [0, 0, Math.PI / 2], materials.blue, 48);
cylinder('pump outlet coupling', 0.16, 0.55, [-4.75, -1.18, 0], [0, 0, Math.PI / 2], materials.pipe, 32);
box('pump base plate', [1.25, 0.08, 0.75], [-5.5, -1.55, 0], materials.steel);
labelMarker('pump 32Hz green label', -6.15, -0.72, 0.45, materials.labelGreen);

labelMarker('0.40m water depth callout', 1.9, 3.62, 0.47, materials.labelBlue);
labelMarker('42 percent slope callout', 0.95, 2.48, 0.47, materials.labelOrange);
labelMarker('0.37m water depth callout', 2.2, 1.42, 0.47, materials.labelBlue);
labelMarker('0.32m basin depth callout', 1.6, -0.72, 0.47, materials.labelBlue);
labelMarker('DN50 branch and flow meter marker', 0.4, 1.0, 0.48, materials.labelGreen);
cylinder('DN50 branch flow meter', 0.1, 0.05, [0.4, 1.02, 0.55], [Math.PI / 2, 0, 0], materials.labelGreen, 32);

arrow('channel 1 flow arrow left', 0.8, 3.08, 0.34, -1);
arrow('channel 1 secondary flow arrow', 1.35, 3.08, 0.34, 1);
arrow('channel 2 flow arrow', -0.8, 1.98, 0.34, -1);
arrow('channel 3 flow arrow', 1.25, 1.98, 0.34, -1);
arrow('channel 5 flow arrow', 2.65, 0.88, 0.34, 1);
arrow('channel 6 flow arrow', 0.6, -0.22, 0.34, -1);
arrow('channel 6 long return arrow', 2.1, -0.22, 0.34, 1);

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.name = 'large soft key light';
key.position.set(-4, 7, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0x80bfff, 0.8);
fill.name = 'cool blue fill light';
fill.position.set(4, 4, -5);
scene.add(fill);

const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
camera.name = 'default inspection camera';
camera.position.set(6.6, 3.3, 5.2);
camera.lookAt(0, 0.8, 0);
scene.add(camera);

const exporter = new GLTFExporter();
const glb = await new Promise((resolve, reject) => {
  exporter.parse(
    scene,
    (result) => resolve(result),
    (error) => reject(error),
    { binary: true, trs: false, onlyVisible: true, includeCustomExtensions: false }
  );
});

await fs.writeFile(path.join(outDir, 'intelligent-water-channel.glb'), Buffer.from(glb));

const viewer = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Intelligent Water Channel 3D Model</title>
  <style>
    html, body { margin: 0; height: 100%; background: #06111c; color: #e8f4ff; font-family: Arial, sans-serif; }
    #app { width: 100%; height: 100%; }
    .hud { position: fixed; left: 16px; top: 16px; padding: 10px 12px; background: rgba(0,20,40,.72); border: 1px solid rgba(120,190,255,.35); border-radius: 8px; line-height: 1.45; }
  </style>
</head>
<body>
  <div id="app"></div>
  <div class="hud">智能水槽三维模型<br>拖动旋转，滚轮缩放，右键平移</div>
  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/"
      }
    }
  </script>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

    const app = document.querySelector('#app');
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(app.clientWidth, app.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x06111c);
    app.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x06111c, 8, 18);
    const camera = new THREE.PerspectiveCamera(45, app.clientWidth / app.clientHeight, 0.1, 100);
    camera.position.set(6.6, 3.3, 5.2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.8, 0);
    controls.update();

    scene.add(new THREE.HemisphereLight(0x9fd7ff, 0x0c1118, 1.4));
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(-4, 7, 5);
    scene.add(light);

    new GLTFLoader().load('./intelligent-water-channel.glb', (gltf) => {
      scene.add(gltf.scene);
    });

    addGrid();
    function addGrid() {
      const grid = new THREE.GridHelper(12, 24, 0x17557a, 0x0e2d42);
      grid.position.y = -1.6;
      scene.add(grid);
    }

    addLabels();
    function makeLabel(text, pos, color = '#e8f4ff') {
      const div = document.createElement('div');
      div.textContent = text;
      div.style.position = 'fixed';
      div.style.padding = '3px 6px';
      div.style.borderRadius = '4px';
      div.style.background = 'rgba(0,20,40,.75)';
      div.style.border = '1px solid rgba(120,190,255,.45)';
      div.style.color = color;
      div.style.fontSize = '13px';
      div.style.pointerEvents = 'none';
      document.body.appendChild(div);
      return { div, pos: new THREE.Vector3(...pos) };
    }
    function addLabels() {
      const labels = [
        makeLabel('G0', [-2.9, 3.82, .45]),
        makeLabel('G1', [3.65, 3.82, .45]),
        makeLabel('G2 42%', [.45, 2.62, .45], '#ffb02e'),
        makeLabel('G3', [-2.8, 2.68, .45], '#43ff6b'),
        makeLabel('G4', [-2.85, 1.58, .45], '#43ff6b'),
        makeLabel('G5', [4.2, 1.58, .45]),
        makeLabel('G6', [-2.85, .48, .45], '#43ff6b'),
        makeLabel('集水池 0.32m', [1.6, -.52, .48])
      ];
      renderer.setAnimationLoop(() => {
        for (const item of labels) {
          const p = item.pos.clone().project(camera);
          item.div.style.left = ((p.x * .5 + .5) * innerWidth) + 'px';
          item.div.style.top = ((-p.y * .5 + .5) * innerHeight) + 'px';
        }
        renderer.render(scene, camera);
      });
    }

    addEventListener('resize', () => {
      camera.aspect = app.clientWidth / app.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(app.clientWidth, app.clientHeight);
    });
  </script>
</body>
</html>`;

await fs.writeFile(path.join(outDir, 'viewer.html'), viewer);
console.log(`Generated ${path.join(outDir, 'intelligent-water-channel.glb')}`);
console.log(`Generated ${path.join(outDir, 'viewer.html')}`);
