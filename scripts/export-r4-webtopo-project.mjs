import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import JSZip from 'jszip';
import pako from 'pako';
import * as THREE from 'three';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(
  projectRoot,
  '智能水槽系统设计图与说明',
  'D3_三维交互_新两层方案_R4高保真落差展示版.html',
);
const outputPath = path.join(
  projectRoot,
  'models',
  'D3_two_layer_R4_high_fidelity-webtopo.zip',
);
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9339;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Edge needs a moment to open its debugging endpoint.
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  const opened = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  return {
    async send(method, params = {}) {
      await opened;
      const id = nextId++;
      const response = new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
      socket.send(JSON.stringify({ id, method, params }));
      return response;
    },
    close() {
      socket.close();
    },
  };
}

async function waitForScene(cdp) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `typeof THREE !== 'undefined' && typeof scene !== 'undefined' &&
        typeof world !== 'undefined' && world.children.length > 0`,
      returnByValue: true,
    });
    if (result.result?.value === true) return;
    await delay(250);
  }
  throw new Error('The R4 page did not finish building its Three.js scene.');
}

async function captureEditorJson(downloadDir) {
  const profileDir = await mkdtemp(path.join(tmpdir(), 'r4-webtopo-edge-'));
  const edge = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu-sandbox',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: 'ignore' });

  let cdp;
  try {
    const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
    const page = targets.find((target) => target.type === 'page');
    if (!page) throw new Error('Edge did not expose a debuggable page.');
    cdp = connectCdp(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir,
    });
    await cdp.send('Page.navigate', { url: pathToFileURL(sourcePath).href });
    await waitForScene(cdp);

    const exportResult = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        scene.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);
        const exportScene = scene.clone(true);
        exportScene.name = 'D3_two_layer_R4_high_fidelity';
        let index = 1;
        const convertedGeometries = new Map();
        exportScene.traverse((object) => {
          if (!object.name) object.name = 'part_' + String(index++).padStart(3, '0');
          if (object.userData && object.userData.name && !object.userData.label) {
            object.userData.label = object.userData.name;
          }
          if (object.geometry && /^(Edges|Wireframe)Geometry$/.test(object.geometry.type)) {
            if (!convertedGeometries.has(object.geometry)) {
              const geometry = new THREE.BufferGeometry().copy(object.geometry);
              geometry.name = object.geometry.name;
              convertedGeometries.set(object.geometry, geometry);
            }
            object.geometry = convertedGeometries.get(object.geometry);
          }
        });
        const editorJson = {
          metadata: {},
          project: {
            antialias: true,
            shadows: true,
            shadowType: THREE.PCFSoftShadowMap,
            xr: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05
          },
          camera: camera.toJSON(),
          scene: exportScene.toJSON(),
          scripts: {}
        };
        const blob = new Blob([JSON.stringify(editorJson)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'r4-webtopo-editor.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return { nodes: (() => { let count = 0; exportScene.traverse(() => count++); return count; })() };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exportResult.exceptionDetails) {
      throw new Error(exportResult.exceptionDetails.text || 'Scene export failed in Edge.');
    }

    const jsonPath = path.join(downloadDir, 'r4-webtopo-editor.json');
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      try {
        if ((await stat(jsonPath)).size > 0) {
          return { jsonPath, nodes: exportResult.result?.value?.nodes ?? 0 };
        }
      } catch {
        // Download is still in progress.
      }
      await delay(200);
    }
    throw new Error('Timed out waiting for the browser scene JSON download.');
  } finally {
    cdp?.close();
    if (edge.exitCode === null) {
      const exited = new Promise((resolve) => edge.once('exit', resolve));
      edge.kill();
      await Promise.race([exited, delay(5000)]);
    }
    await rm(profileDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200,
    });
  }
}

function gzipArray(value) {
  if (!Array.isArray(value)) return value;
  return Buffer.from(pako.gzip(JSON.stringify(value))).toString('base64');
}

function compressGeometries(geometries) {
  return geometries.map((geometry) => {
    if (!geometry.data) return geometry;
    for (const attribute of Object.values(geometry.data.attributes || {})) {
      attribute.array = gzipArray(attribute.array);
    }
    if (geometry.data.index) {
      geometry.data.index.array = gzipArray(geometry.data.index.array);
    }
    return geometry;
  });
}

async function normalizeEditorJson(rawJson) {
  for (const geometry of rawJson.scene.geometries || []) {
    if (geometry.type !== 'BufferGeometry' && geometry.type?.endsWith('BufferGeometry')) {
      geometry.type = geometry.type.replace(/BufferGeometry$/, 'Geometry');
    }
    const geometryClass = THREE[geometry.type];
    if (
      geometry.type !== 'BufferGeometry' &&
      geometry.type !== 'InstancedBufferGeometry' &&
      typeof geometryClass?.fromJSON !== 'function'
    ) {
      if (!geometry.data) {
        throw new Error(`Unsupported legacy geometry type: ${geometry.type}`);
      }
      geometry.type = 'BufferGeometry';
    }
  }
  const loader = new THREE.ObjectLoader();
  const [scene, camera] = await Promise.all([
    loader.parseAsync(rawJson.scene),
    loader.parseAsync(rawJson.camera),
  ]);
  return {
    metadata: {},
    project: rawJson.project,
    camera: camera.toJSON(),
    scene: scene.toJSON(),
    scripts: {},
  };
}

async function packWebTopo(editorJson) {
  const archive = new JSZip();
  const geometriesFolder = archive.folder('Geometries');
  archive.folder('Textures');
  archive.folder('Drawing');

  const geometries = editorJson.scene.geometries || [];
  editorJson.scene.geometries = [];
  const geometryFiles = [];
  for (let index = 0; index < geometries.length; index += 10) {
    geometryFiles.push({
      name: `geometries_${index / 10}.json`,
      content: JSON.stringify(compressGeometries(geometries.slice(index, index + 10))),
    });
  }

  for (let index = 0; index < geometryFiles.length; index += 10) {
    const geometryArchive = new JSZip();
    for (const file of geometryFiles.slice(index, index + 10)) {
      geometryArchive.file(file.name, file.content, {
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });
    }
    const content = await geometryArchive.generateAsync({ type: 'nodebuffer' });
    geometriesFolder.file(`geometries_${index / 10}.zip`, content, {
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });
  }

  archive.file('scene.json', JSON.stringify(editorJson), {
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  return archive.generateAsync({ type: 'nodebuffer' });
}

async function main() {
  await stat(sourcePath);
  await stat(edgePath);
  const workDir = await mkdtemp(path.join(tmpdir(), 'r4-webtopo-export-'));
  try {
    const capture = await captureEditorJson(workDir);
    const rawJson = JSON.parse(await readFile(capture.jsonPath, 'utf8'));
    const editorJson = await normalizeEditorJson(rawJson);
    const zip = await packWebTopo(editorJson);
    await writeFile(outputPath, zip);

    const materialCount = editorJson.scene.materials?.length || 0;
    const geometryCount = rawJson.scene.geometries?.length || 0;
    console.log(JSON.stringify({
      outputPath,
      bytes: zip.length,
      nodes: capture.nodes,
      geometries: geometryCount,
      materials: materialCount,
    }, null, 2));
  } finally {
    await rm(workDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200,
    });
  }
}

await main();
