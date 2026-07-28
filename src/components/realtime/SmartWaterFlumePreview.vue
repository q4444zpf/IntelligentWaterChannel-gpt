<template>
  <div class="flume-preview">
    <div ref="canvasHostRef" class="canvas-host"></div>

    <div class="scene-labels" aria-hidden="true">
      <div
        v-for="(sprite, index) in htmlSprites"
        :key="sprite.uuid"
        :ref="(element) => setLabelRef(element, index)"
        class="scene-label"
        v-html="sprite.html"
      ></div>
    </div>

    <div v-if="loading" class="scene-state" role="status">
      <span class="loading-cube" aria-hidden="true"></span>
      <span>{{ loadingText }} {{ loadProgress }}%</span>
    </div>
    <div v-else-if="loadError" class="scene-state scene-error" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" @click="loadScene">重试</button>
    </div>

    <span v-if="autoRotating" class="roaming-state">自动漫游</span>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getWebTopoScene, resolveWebTopoAssetUrl } from '../../api/webTopo.js';
import { WEB_TOPO_CONFIG } from '../../config/webTopoConfig.js';
import { applyHtmlSpriteUserData, updateHtmlSpriteData } from '../../utils/web-topo-html-runtime.js';
import { connectWebTopoMqtt, disconnectWebTopoMqtt } from '../../utils/web-topo-mqtt.js';
import { loadWebTopoScenePackage } from '../../utils/web-topo-scene-loader.js';

const props = defineProps({
  webTopoId: {
    type: String,
    default: WEB_TOPO_CONFIG.webTopoId,
  },
});

const canvasHostRef = ref(null);
const loading = ref(true);
const loadProgress = ref(0);
const loadError = ref('');
const sceneName = ref('');
const autoRotating = ref(false);
const htmlSprites = ref([]);
const labelElements = [];
const loadingText = computed(() => sceneName.value ? `正在加载${sceneName.value}` : '正在获取三维场景');

let scene;
let camera;
let renderer;
let controls;
let resizeObserver;
let abortController;
let mqttClient;
let modelCenter = new THREE.Vector3();
let modelSize = new THREE.Vector3(10, 5, 2);
let defaultCameraState;
let disposed = false;

function setLabelRef(element, index) {
  if (element) labelElements[index] = element;
}

function applyLabelUserData() {
  htmlSprites.value.forEach((sprite, index) => {
    applyHtmlSpriteUserData(labelElements[index], sprite);
  });
}

function triggerDataUpdate(field, value) {
  htmlSprites.value.forEach((sprite, index) => {
    updateHtmlSpriteData(labelElements[index], sprite, field, value);
  });
}

function handleMqttData(payload) {
  Object.entries(payload).forEach(([field, value]) => triggerDataUpdate(field, value));
}

function stopMqtt() {
  disconnectWebTopoMqtt(mqttClient);
  mqttClient = null;
}

function startMqtt(config) {
  stopMqtt();
  mqttClient = connectWebTopoMqtt(config, handleMqttData, (error) => {
    console.warn('三维组态 MQTT 连接异常:', error);
  });
}

function createRenderer() {
  const host = canvasHostRef.value;
  if (!host) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03101d);
  camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100000);
  camera.position.set(0, 5, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', '可交互的智能水槽三维组态场景');
  host.appendChild(renderer.domElement);

  createControls(new THREE.Vector3());
  resizeObserver = new ResizeObserver(resizeScene);
  resizeObserver.observe(host);
  resizeScene();
  renderer.setAnimationLoop(renderScene);
}

function createControls(target) {
  controls?.dispose();
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.autoRotateSpeed = 0.8;
  controls.target.copy(target);
  controls.update();
}

function applyRendererConfig(config) {
  const rendererConfig = config?.renderer || {};
  renderer.shadowMap.enabled = Boolean(rendererConfig.shadows);
  if (Number.isFinite(rendererConfig.shadowType)) renderer.shadowMap.type = rendererConfig.shadowType;
  if (Number.isFinite(rendererConfig.toneMapping)) renderer.toneMapping = rendererConfig.toneMapping;
  if (Number.isFinite(rendererConfig.toneMappingExposure)) {
    renderer.toneMappingExposure = rendererConfig.toneMappingExposure;
  }
}

function applyControlsState(state) {
  if (!state) return;
  if (Array.isArray(state.position)) camera.position.fromArray(state.position);
  if (Array.isArray(state.target)) controls.target.fromArray(state.target);
  for (const key of ['minDistance', 'maxDistance', 'minPolarAngle', 'maxPolarAngle', 'minAzimuthAngle', 'maxAzimuthAngle']) {
    if (Number.isFinite(state[key])) controls[key] = state[key];
  }
  controls.update();
}

async function loadScene() {
  abortController?.abort();
  stopMqtt();
  abortController = new AbortController();
  loading.value = true;
  loadError.value = '';
  loadProgress.value = 0;
  sceneName.value = '';
  htmlSprites.value = [];
  labelElements.length = 0;

  try {
    const info = await getWebTopoScene(props.webTopoId);
    if (!info.zipUrl) throw new Error('该三维组态场景没有场景包');
    sceneName.value = info.sceneName || '';
    loadProgress.value = 1;

    const loaded = await loadWebTopoScenePackage(resolveWebTopoAssetUrl(info.zipUrl), {
      signal: abortController.signal,
      onProgress: (progress) => {
        loadProgress.value = Math.max(1, Math.round(progress * 100));
      },
    });
    if (disposed) return;

    disposeObject(scene);
    scene = loaded.scene;
    camera = loaded.camera || camera;
    applyRendererConfig(loaded.config);
    createControls(new THREE.Vector3());
    applyControlsState(loaded.controlsState);

    const bounds = new THREE.Box3().setFromObject(scene);
    if (!bounds.isEmpty()) {
      bounds.getCenter(modelCenter);
      bounds.getSize(modelSize);
    }
    defaultCameraState = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      up: camera.up.clone(),
      target: controls.target.clone(),
    };
    htmlSprites.value = loaded.htmlSprites;
    loading.value = false;
    loadProgress.value = 100;
    await nextTick();
    applyLabelUserData();
    startMqtt(loaded.config?.mqtt);
    resizeScene();
  } catch (error) {
    if (error?.name === 'AbortError' || disposed) return;
    loading.value = false;
    loadError.value = error?.message || '三维场景加载失败';
  }
}

function resizeScene() {
  const host = canvasHostRef.value;
  if (!host || !camera || !renderer) return;
  const width = Math.max(host.clientWidth, 1);
  const height = Math.max(host.clientHeight, 1);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function distanceForView(horizontalSize, verticalSize) {
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const verticalDistance = verticalSize / (2 * Math.tan(verticalFov / 2));
  const horizontalDistance = horizontalSize / (2 * Math.tan(verticalFov / 2) * camera.aspect);
  return Math.max(verticalDistance, horizontalDistance) * 1.12;
}

function applyView(direction, horizontalSize, verticalSize, up = new THREE.Vector3(0, 1, 0)) {
  if (!camera || !controls || !defaultCameraState) return;
  const distance = distanceForView(horizontalSize, verticalSize);
  camera.up.copy(up);
  camera.position.copy(modelCenter).add(direction.clone().normalize().multiplyScalar(distance));
  camera.near = Math.max(distance / 1000, 0.01);
  camera.far = Math.max(distance * 100, 1000);
  camera.lookAt(modelCenter);
  camera.updateProjectionMatrix();
  controls.target.copy(modelCenter);
  controls.update();
}

function setView(action) {
  if (!camera || !controls || !defaultCameraState) return;
  if (action !== '自动漫游') {
    autoRotating.value = false;
    controls.autoRotate = false;
  }

  switch (action) {
    case '俯视图':
      applyView(new THREE.Vector3(0, 1, 0.001), modelSize.x, modelSize.z, new THREE.Vector3(0, 0, -1));
      break;
    case '正视图':
      applyView(new THREE.Vector3(0, 0, 1), modelSize.x, modelSize.y);
      break;
    case '左视图':
      applyView(new THREE.Vector3(-1, 0, 0), modelSize.z, modelSize.y);
      break;
    case '右视图':
      applyView(new THREE.Vector3(1, 0, 0), modelSize.z, modelSize.y);
      break;
    case '自动漫游':
      autoRotating.value = !autoRotating.value;
      controls.autoRotate = autoRotating.value;
      break;
    case '复位':
    case '默认视角':
    default:
      camera.position.copy(defaultCameraState.position);
      camera.quaternion.copy(defaultCameraState.quaternion);
      camera.up.copy(defaultCameraState.up);
      controls.target.copy(defaultCameraState.target);
      controls.update();
      break;
  }
}

function updateLabels() {
  if (!camera || !canvasHostRef.value || loading.value) return;
  const width = canvasHostRef.value.clientWidth;
  const height = canvasHostRef.value.clientHeight;
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  htmlSprites.value.forEach((sprite, index) => {
    const element = labelElements[index];
    if (!element) return;
    const worldPosition = new THREE.Vector3().fromArray(sprite.position);
    const towardLabel = worldPosition.clone().sub(camera.position);
    const projected = worldPosition.clone().project(camera);
    const visible = cameraDirection.dot(towardLabel) > 0 && projected.z > -1 && projected.z < 1;
    const distance = Math.max(camera.position.distanceTo(worldPosition), 0.01);
    const pixelsPerUnit = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance);
    const scale = THREE.MathUtils.clamp(sprite.scale * pixelsPerUnit, 0.35, 1.5);
    element.style.opacity = visible ? '1' : '0';
    element.style.transform = `translate(-50%, -50%) translate(${(projected.x * 0.5 + 0.5) * width}px, ${(-projected.y * 0.5 + 0.5) * height}px) scale(${scale})`;
  });
}

function renderScene() {
  if (!renderer || !scene || !camera) return;
  controls?.update();
  updateLabels();
  renderer.render(scene, camera);
}

function disposeObject(root) {
  const disposedTextures = new Set();
  const disposedMaterials = new Set();
  root?.traverse((object) => {
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => {
      if (disposedMaterials.has(material)) return;
      disposedMaterials.add(material);
      Object.values(material).forEach((value) => {
        if (value?.isTexture && !disposedTextures.has(value)) {
          disposedTextures.add(value);
          value.dispose();
        }
      });
      material.dispose();
    });
  });
  if (root?.background?.isTexture && !disposedTextures.has(root.background)) root.background.dispose();
  if (root?.environment?.isTexture && !disposedTextures.has(root.environment)) root.environment.dispose();
}

onMounted(async () => {
  await nextTick();
  createRenderer();
  loadScene();
});

onBeforeUnmount(() => {
  disposed = true;
  abortController?.abort();
  resizeObserver?.disconnect();
  controls?.dispose();
  stopMqtt();
  renderer?.setAnimationLoop(null);
  disposeObject(scene);
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer?.domElement.remove();
});

defineExpose({ handleAction: setView, reload: loadScene, triggerDataUpdate });
</script>

<style scoped>
.flume-preview,
.canvas-host,
.scene-labels {
  position: absolute;
  inset: 0;
}

.flume-preview {
  overflow: hidden;
  background: #03101d;
}

.canvas-host {
  z-index: 1;
}

.canvas-host :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.scene-labels {
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}

.scene-label {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: center;
  transition: opacity 0.16s ease;
  //will-change: transform;
}

.scene-state {
  position: absolute;
  z-index: 3;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(3, 16, 29, 0.94);
  color: #bde5ff;
  font-size: 13px;
}

.loading-cube {
  width: 18px;
  height: 18px;
  border: 2px solid #2fa5ff;
  animation: cube-loading 1.1s ease-in-out infinite;
}

.scene-error {
  flex-direction: column;
  color: #ff9b9b;
  text-align: center;
}

.scene-error button {
  border: 1px solid #258dd9;
  border-radius: 4px;
  background: #06365d;
  color: #dff3ff;
  cursor: pointer;
  padding: 5px 12px;
}

.roaming-state {
  position: absolute;
  z-index: 3;
  right: 10px;
  bottom: 10px;
  padding: 4px 8px;
  border: 1px solid rgba(47, 165, 255, 0.65);
  border-radius: 4px;
  background: rgba(3, 30, 52, 0.88);
  color: #9fd8ff;
  font-size: 11px;
}

@keyframes cube-loading {
  0% { transform: rotate(0deg) scale(0.8); }
  50% { transform: rotate(180deg) scale(1); }
  100% { transform: rotate(360deg) scale(0.8); }
}

@media (prefers-reduced-motion: reduce) {
  .loading-cube {
    animation: none;
  }
}
</style>
