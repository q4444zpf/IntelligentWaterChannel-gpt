<template>
  <div class="flume-preview">
    <div ref="canvasHostRef" class="canvas-host"></div>

    <div
      v-if="labelGroups.length"
      class="label-visibility-control"
      @pointerdown.stop
      @wheel.stop
    >
      <Transition name="scene-tree-toggle" mode="out-in">
        <button
          v-if="!labelVisibilityOpen"
          key="trigger"
          type="button"
          class="label-visibility-trigger"
          aria-controls="label-visibility-card"
          :aria-expanded="false"
          @click="labelVisibilityOpen = true"
        >标签</button>

        <aside
          v-else
          id="label-visibility-card"
          key="panel"
          class="label-visibility-card"
          aria-label="标签分组显隐"
        >
          <header>
            <h3>标签分组</h3>
            <button
              type="button"
              class="label-visibility-close"
              aria-label="关闭标签分组显隐"
              title="关闭"
              @click="labelVisibilityOpen = false"
            >×</button>
          </header>
          <div class="label-group-list">
            <label
              v-for="(group, index) in labelGroups"
              :key="group.uuid"
              class="label-group-toggle"
            >
              <input
                type="checkbox"
                :checked="isLabelGroupVisible(group)"
                :style="{ accentColor: labelGroupColor(index) }"
                @change="setLabelGroupVisible(group, $event.currentTarget.checked)"
              >
              <span
                class="label-group-swatch"
                :style="{ backgroundColor: labelGroupColor(index) }"
                aria-hidden="true"
              ></span>
              <span class="label-group-name">{{ group.name }}</span>
            </label>
          </div>
          <div class="label-group-actions">
            <button
              type="button"
              :disabled="allLabelGroupsVisible"
              @click="setAllLabelGroupsVisible(true)"
            >全显</button>
            <button
              type="button"
              :disabled="allLabelGroupsHidden"
              @click="setAllLabelGroupsVisible(false)"
            >全隐</button>
          </div>
        </aside>
      </Transition>
    </div>

    <div
      v-if="modelGroupTree.length"
      class="scene-tree-control"
      @pointerdown.stop
      @wheel.stop
    >
      <button
        type="button"
        class="selected-model-isolation"
        :class="{ active: selectedModelIsolationEnabled }"
        :aria-pressed="selectedModelIsolationEnabled"
        title="只显示选中对象"
        @click="setSelectedModelIsolation(!selectedModelIsolationEnabled)"
      >只显示选中对象</button>
      <Transition name="scene-tree-toggle" mode="out-in">
        <button
          v-if="!sceneTreeOpen"
          key="trigger"
          type="button"
          class="scene-tree-trigger"
          aria-controls="model-scene-tree"
          :aria-expanded="false"
          @click="sceneTreeOpen = true"
        >场景树</button>

        <aside
          v-else
          id="model-scene-tree"
          key="panel"
          class="scene-tree-panel"
          aria-label="模型场景树"
        >
          <header>
            <h3>模型场景树</h3>
            <button
              type="button"
              class="scene-tree-close"
              aria-label="关闭场景树"
              title="关闭"
              @click="sceneTreeOpen = false"
            >×</button>
          </header>
          <input
            v-model="sceneTreeSearch"
            class="scene-tree-search"
            type="search"
            placeholder="搜索分组"
            aria-label="搜索模型分组"
          >
          <div class="scene-tree-body" role="tree" aria-label="模型分组">
            <p v-if="!sceneTreeRows.length" class="scene-tree-empty">没有匹配的分组</p>
            <template v-else>
              <div
                v-for="row in sceneTreeRows"
                :key="row.node.uuid"
                class="scene-tree-row"
                role="treeitem"
                :aria-level="row.depth + 1"
                :aria-expanded="row.hasChildren ? row.expanded : undefined"
                :aria-selected="selectedSceneTreeUuid === row.node.uuid"
                :class="{
                  selected: selectedSceneTreeUuid === row.node.uuid,
                  hidden: !isModelGroupVisible(row.node.uuid),
                }"
                :style="{ paddingLeft: `${4 + row.depth * 14}px` }"
              >
                <button
                  v-if="row.hasChildren"
                  type="button"
                  class="scene-tree-switcher"
                  :aria-label="`${row.expanded ? '收起' : '展开'}${row.node.name}`"
                  @click="toggleSceneTreeNode(row.node.uuid)"
                >
                  <span :class="{ expanded: row.expanded }" aria-hidden="true">›</span>
                </button>
                <span v-else class="scene-tree-switcher-placeholder" aria-hidden="true"></span>
                <button
                  type="button"
                  class="scene-tree-node"
                  :title="`定位到${row.node.name}`"
                  @click="focusSceneTreeNode(row.node.uuid)"
                >
                  <span class="scene-tree-folder" aria-hidden="true"></span>
                  <span class="scene-tree-name">{{ row.node.name }}</span>
                </button>
                <button
                  type="button"
                  class="scene-tree-visibility"
                  :class="{ hidden: !isModelGroupVisible(row.node.uuid) }"
                  :aria-label="`${isModelGroupVisible(row.node.uuid) ? '隐藏' : '显示'}${row.node.name}`"
                  :aria-pressed="isModelGroupVisible(row.node.uuid)"
                  :title="isModelGroupVisible(row.node.uuid) ? '隐藏' : '显示'"
                  :disabled="Boolean(isolatedModelGroupUuid)"
                  @click.stop="toggleModelGroupVisibility(row.node.uuid)"
                >
                  <EyeOutlined v-if="isModelGroupVisible(row.node.uuid)" aria-hidden="true" />
                  <EyeInvisibleOutlined v-else aria-hidden="true" />
                </button>
              </div>
            </template>
          </div>
        </aside>
      </Transition>
    </div>

<!--    <div-->
<!--      v-if="modelGroupTree.length"-->
<!--      class="model-expansion-controls"-->
<!--      @pointerdown.stop-->
<!--      @wheel.stop-->
<!--    >-->
<!--      <button-->
<!--        type="button"-->
<!--        class="model-expansion-control"-->
<!--        :class="{ active: modelExpanded }"-->
<!--        :aria-pressed="modelExpanded"-->
<!--        @click.stop="toggleModelExpansion"-->
<!--      >{{ modelExpanded ? '收起' : '展开' }}</button>-->
<!--      <Transition name="model-expansion-slider">-->
<!--        <div v-if="modelExpanded" class="model-expansion-slider">-->
<!--          <input-->
<!--            :value="modelExpansionProgress"-->
<!--            type="range"-->
<!--            min="0"-->
<!--            max="1"-->
<!--            step="0.01"-->
<!--            aria-label="模型展开程度"-->
<!--            title="模型展开程度"-->
<!--            @input="setModelExpansionProgress"-->
<!--          >-->
<!--        </div>-->
<!--      </Transition>-->
<!--    </div>-->

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
      <button type="button" @click="() => loadScene()">重试</button>
    </div>

    <label v-if="autoRotating" class="roaming-control">
      <span>漫游速度</span>
      <strong>{{ roamingSpeed.toFixed(1) }}x</strong>
      <input
        v-model.number="roamingSpeed"
        type="range"
        min="0.2"
        max="5"
        step="0.1"
        aria-label="自动漫游速度"
        @input="updateRoamingSpeed"
      >
    </label>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons-vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { getWebTopoScene, resolveWebTopoAssetUrl } from './webTopo.js';
import { WEB_TOPO_CONFIG } from '../../../config/webTopoConfig.js';
import {
  applyHtmlSpriteUserData,
  isHtmlSpriteHierarchyVisible,
  updateHtmlSpriteData,
  updateHtmlSpriteDirectionArrow,
} from './web-topo-html-runtime.js';
import {
  connectWebTopoMqtt,
  disconnectWebTopoMqtt,
  subscribeWebTopoMqtt,
  unsubscribeWebTopoMqtt,
} from './web-topo-mqtt.js';
import { loadWebTopoScenePackage } from './web-topo-scene-loader.js';
import {
  applyModelExpansionProgress,
  createHtmlSpriteExpansionLayout,
  createTopLevelGroupExpansionLayout,
} from './web-topo-model-expansion.js';
import {
  buildGroupTreeUnder,
  findGroupNodeByName,
  findNearestSelectableGroup,
  isolateSelectableGroup,
  restoreSelectableGroupVisibility,
} from './web-topo-scene-tree.js';
import { createWebTopoScriptRuntime } from './web-topo-script-runtime.js';

const props = defineProps({
  webTopoId: {
    type: String,
    default: WEB_TOPO_CONFIG.webTopoId,
  },
  alarmTopic: { type: String, default: '' },
});
const emit = defineEmits(['mqtt-data', 'alarm-notification', 'auto-roaming-change']);

const canvasHostRef = ref(null);
const loading = ref(true);
const loadProgress = ref(0);
const loadError = ref('');
const sceneName = ref('');
const autoRotating = ref(false);
const roamingSpeed = ref(0.8);
const htmlSprites = ref([]);
const labelGroups = ref([]);
const hiddenLabelGroupUuids = ref(new Set());
const labelVisibilityOpen = ref(false);
const modelGroupTree = ref([]);
const sceneTreeOpen = ref(false);
const sceneTreeSearch = ref('');
const expandedSceneTreeUuids = ref(new Set());
const selectedSceneTreeUuid = ref('');
const hiddenModelGroupUuids = ref(new Set());
const selectedModelIsolationEnabled = ref(false);
const isolatedModelGroupUuid = ref('');
const modelExpanded = ref(false);
const labelElements = [];
const loadingText = computed(() => sceneName.value ? `正在加载${sceneName.value}` : '正在获取三维场景');
const allLabelGroupsVisible = computed(() => hiddenLabelGroupUuids.value.size === 0);
const allLabelGroupsHidden = computed(() => (
  labelGroups.value.length > 0 && hiddenLabelGroupUuids.value.size === labelGroups.value.length
));
const sceneTreeRows = computed(() => {
  const query = sceneTreeSearch.value.trim().toLocaleLowerCase();
  const rows = [];

  function filterNodes(nodes) {
    if (!query) return nodes;
    return nodes.flatMap((node) => {
      const children = filterNodes(node.children);
      return node.name.toLocaleLowerCase().includes(query) || children.length
        ? [{ ...node, children }]
        : [];
    });
  }

  function appendRows(nodes, depth = 0) {
    nodes.forEach((node) => {
      const hasChildren = node.children.length > 0;
      const expanded = Boolean(query) || expandedSceneTreeUuids.value.has(node.uuid);
      rows.push({ node, depth, hasChildren, expanded });
      if (hasChildren && expanded) appendRows(node.children, depth + 1);
    });
  }

  appendRows(filterNodes(modelGroupTree.value));
  return rows;
});
const selectableModelGroupUuids = computed(() => {
  const uuids = new Set();
  function collectUuids(nodes) {
    nodes.forEach((node) => {
      uuids.add(node.uuid);
      collectUuids(node.children);
    });
  }
  collectUuids(modelGroupTree.value);
  return uuids;
});

const LABEL_GROUP_COLORS = ['#77bdf2', '#84c7a8', '#f0b77a', '#df9a7d', '#76c8bf', '#ef8d8d'];
const CAMERA_FOCUS_DURATION = 800;
const MODEL_EXPANSION_DURATION = 650;
const CANVAS_CLICK_TOLERANCE = 4;
const raycaster = new THREE.Raycaster();
const raycastPointer = new THREE.Vector2();
const labelCameraDirection = new THREE.Vector3();
const labelWorldPosition = new THREE.Vector3();
const labelTowardCamera = new THREE.Vector3();
const labelProjectedPosition = new THREE.Vector3();

let scene;
let camera;
let renderer;
let composer;
let renderPass;
let outlinePass;
let outputPass;
let controls;
let resizeObserver;
let abortController;
let mqttClient;
let realtimeTopic = '';
let modelCenter = new THREE.Vector3();
let modelSize = new THREE.Vector3(10, 5, 2);
let defaultCameraState;
let sceneObjectByUuid = new Map();
let isolatedModelVisibilitySnapshot;
let modelExpansionLayout = new Map();
const modelExpansionProgress = ref(0);
let modelExpansionTransition;
let cameraTransition;
let canvasPointerDown;
let scriptRuntime;
let pendingSceneTreeGroupName = '';
let disposed = false;

function setLabelRef(element, index) {
  if (element) labelElements[index] = element;
}

function applyLabelUserData() {
  htmlSprites.value.forEach((sprite, index) => {
    applyHtmlSpriteUserData(labelElements[index], sprite);
  });
}

function labelGroupColor(index) {
  return LABEL_GROUP_COLORS[index % LABEL_GROUP_COLORS.length];
}

function isLabelGroupVisible(group) {
  return !hiddenLabelGroupUuids.value.has(group.uuid);
}

function indexSceneObjects(root) {
  sceneObjectByUuid = new Map();
  root?.traverse((object) => {
    if (object.uuid) sceneObjectByUuid.set(object.uuid, object);
  });
}

function toggleSceneTreeNode(uuid) {
  const expanded = new Set(expandedSceneTreeUuids.value);
  if (expanded.has(uuid)) expanded.delete(uuid);
  else expanded.add(uuid);
  expandedSceneTreeUuids.value = expanded;
}

function isModelGroupVisible(uuid) {
  return !hiddenModelGroupUuids.value.has(uuid);
}

function toggleModelGroupVisibility(uuid) {
  if (isolatedModelGroupUuid.value) return;
  const object = sceneObjectByUuid.get(uuid);
  if (!object) return;

  const visible = object.visible === false;
  object.visible = visible;
  const hiddenGroups = new Set(hiddenModelGroupUuids.value);
  if (visible) hiddenGroups.delete(uuid);
  else hiddenGroups.add(uuid);
  hiddenModelGroupUuids.value = hiddenGroups;
}

function syncHiddenModelGroupsFromScene() {
  const hiddenGroups = new Set();
  selectableModelGroupUuids.value.forEach((uuid) => {
    if (sceneObjectByUuid.get(uuid)?.visible === false) hiddenGroups.add(uuid);
  });
  hiddenModelGroupUuids.value = hiddenGroups;
}

function restoreIsolatedModelVisibility() {
  restoreSelectableGroupVisibility(isolatedModelVisibilitySnapshot, sceneObjectByUuid);
  isolatedModelVisibilitySnapshot = undefined;
  isolatedModelGroupUuid.value = '';
  syncHiddenModelGroupsFromScene();
}

function applySelectedModelIsolation(uuid) {
  if (!selectedModelIsolationEnabled.value) return;
  const selectedGroup = sceneObjectByUuid.get(uuid);
  if (!selectedGroup) return;
  restoreIsolatedModelVisibility();
  isolatedModelVisibilitySnapshot = isolateSelectableGroup(
    selectedGroup,
    selectableModelGroupUuids.value,
    sceneObjectByUuid,
  );
  isolatedModelGroupUuid.value = uuid;
  syncHiddenModelGroupsFromScene();
}

function setSelectedModelIsolation(enabled) {
  selectedModelIsolationEnabled.value = enabled;
  if (!enabled) {
    restoreIsolatedModelVisibility();
    return;
  }
  if (selectedSceneTreeUuid.value) applySelectedModelIsolation(selectedSceneTreeUuid.value);
}

function resetModelExpansion() {
  modelExpansionTransition = undefined;
  applyModelExpansionProgress(modelExpansionLayout, 0);
  modelExpansionLayout = new Map();
  modelExpansionProgress.value = 0;
  modelExpanded.value = false;
}

function toggleModelExpansion() {
  if (!modelExpansionLayout.size) {
    const modelRoot = scene?.getObjectByName('模型');
    const labelRoot = scene?.getObjectByName('标签');
    const topLevelGroups = modelGroupTree.value
      .map((node) => sceneObjectByUuid.get(node.uuid))
      .filter(Boolean);
    const labels = labelRoot
      ? htmlSprites.value.filter((sprite) => sprite.ancestorUuids?.includes(labelRoot.uuid))
      : [];
    modelExpansionLayout = new Map([
      ...createTopLevelGroupExpansionLayout(modelRoot, topLevelGroups),
      ...createHtmlSpriteExpansionLayout(modelRoot, labels),
    ]);
  }
  if (!modelExpansionLayout.size) return;

  modelExpanded.value = !modelExpanded.value;
  modelExpansionTransition = {
    startedAt: performance.now(),
    duration: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 0
      : MODEL_EXPANSION_DURATION,
    fromProgress: modelExpansionProgress.value,
    targetProgress: modelExpanded.value ? 1 : 0,
  };
}

function setModelExpansionProgress(event) {
  if (!modelExpansionLayout.size) return;
  modelExpansionTransition = undefined;
  modelExpansionProgress.value = THREE.MathUtils.clamp(
    Number(event.currentTarget.value),
    0,
    1,
  );
  applyModelExpansionProgress(modelExpansionLayout, modelExpansionProgress.value);
}

function updateModelExpansionTransition(timestamp) {
  if (!modelExpansionTransition) return;
  const progress = modelExpansionTransition.duration === 0
    ? 1
    : THREE.MathUtils.clamp(
      (timestamp - modelExpansionTransition.startedAt) / modelExpansionTransition.duration,
      0,
      1,
    );
  const eased = progress < 0.5
    ? 4 * progress ** 3
    : 1 - ((-2 * progress + 2) ** 3) / 2;
  modelExpansionProgress.value = THREE.MathUtils.lerp(
    modelExpansionTransition.fromProgress,
    modelExpansionTransition.targetProgress,
    eased,
  );
  applyModelExpansionProgress(modelExpansionLayout, modelExpansionProgress.value);
  if (progress === 1) modelExpansionTransition = undefined;
}

function cancelCameraTransition() {
  cameraTransition = undefined;
}

function focusSceneTreeNode(uuid) {
  const object = sceneObjectByUuid.get(uuid);
  if (!object || !camera || !controls || !outlinePass) return;

  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) return;
  applySelectedModelIsolation(uuid);

  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.1);
  const direction = camera.position.clone().sub(controls.target);
  let currentDistance = direction.length();
  if (currentDistance < 1e-3) {
    camera.getWorldDirection(direction).negate();
    currentDistance = camera.position.distanceTo(sphere.center);
  }
  direction.normalize();

  autoRotating.value = false;
  controls.autoRotate = false;
  selectedSceneTreeUuid.value = uuid;
  outlinePass.selectedObjects = [object];

  let targetPosition = camera.position.clone();
  let targetZoom = camera.zoom;

  if (camera.isPerspectiveCamera) {
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.18;
    targetPosition = sphere.center.clone().addScaledVector(direction, distance);
    camera.near = Math.max(distance / 1000, 0.01);
    camera.far = Math.max(camera.far, distance + radius * 10);
  } else if (camera.isOrthographicCamera) {
    const viewWidth = Math.abs(camera.right - camera.left);
    const viewHeight = Math.abs(camera.top - camera.bottom);
    targetZoom = Math.min(viewWidth, viewHeight) / (radius * 2 * 1.18);
    targetPosition = sphere.center.clone()
      .addScaledVector(direction, Math.max(currentDistance, radius * 2));
  }

  camera.updateProjectionMatrix();
  startCameraTransition(targetPosition, sphere.center, targetZoom);
}

function focusSceneTreeGroupByName(groupName) {
  const name = String(groupName || '').trim();
  if (!name) return false;

  const node = findGroupNodeByName(modelGroupTree.value, name);
  if (!node) {
    pendingSceneTreeGroupName = loading.value ? name : '';
    return false;
  }

  pendingSceneTreeGroupName = '';
  const expanded = new Set(expandedSceneTreeUuids.value);
  let ancestor = sceneObjectByUuid.get(node.uuid)?.parent;
  while (ancestor) {
    if (selectableModelGroupUuids.value.has(ancestor.uuid)) expanded.add(ancestor.uuid);
    ancestor = ancestor.parent;
  }
  expandedSceneTreeUuids.value = expanded;
  sceneTreeSearch.value = '';
  sceneTreeOpen.value = true;
  focusSceneTreeNode(node.uuid);
  return true;
}

function isObjectHierarchyPickable(object) {
  if (object.isLineSegments || object.type === 'LineSegments') return false;
  let current = object;
  while (current) {
    if (current.visible === false || current.ignore || current.userData?.ignore) return false;
    current = current.parent;
  }
  return true;
}

function clearModelGroupSelection() {
  restoreIsolatedModelVisibility();
  selectedSceneTreeUuid.value = '';
  cancelCameraTransition();
  if (outlinePass) outlinePass.selectedObjects = [];
}

function selectModelGroupAtPointer(event) {
  if (!scene || !camera || !renderer) return;
  const bounds = renderer.domElement.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;

  raycastPointer.set(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
  );
  scene.updateMatrixWorld();
  camera.updateMatrixWorld();
  raycaster.setFromCamera(raycastPointer, camera);

  const selectedGroup = raycaster.intersectObject(scene, true)
    .filter((intersection) => isObjectHierarchyPickable(intersection.object))
    .map((intersection) => findNearestSelectableGroup(
      intersection.object,
      selectableModelGroupUuids.value,
    ))
    .find(Boolean);

  if (!selectedGroup) {
    clearModelGroupSelection();
    return;
  }

  const expanded = new Set(expandedSceneTreeUuids.value);
  let ancestor = selectedGroup.parent;
  while (ancestor) {
    if (selectableModelGroupUuids.value.has(ancestor.uuid)) expanded.add(ancestor.uuid);
    ancestor = ancestor.parent;
  }
  expandedSceneTreeUuids.value = expanded;
  focusSceneTreeNode(selectedGroup.uuid);
}

function handleCanvasPointerDown(event) {
  scriptRuntime?.dispatch('onPointerdown', event);
  if (event.button !== 0 || !event.isPrimary) {
    canvasPointerDown = undefined;
    return;
  }
  canvasPointerDown = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
}

function handleCanvasPointerUp(event) {
  scriptRuntime?.dispatch('onPointerup', event);
  const pointerDown = canvasPointerDown;
  canvasPointerDown = undefined;
  if (!pointerDown || pointerDown.pointerId !== event.pointerId) return;
  if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > CANVAS_CLICK_TOLERANCE) return;
  selectModelGroupAtPointer(event);
}

function handleCanvasPointerCancel() {
  canvasPointerDown = undefined;
}

function handleCanvasPointerMove(event) {
  scriptRuntime?.dispatch('onPointermove', event);
}

function handleWindowKeyDown(event) {
  scriptRuntime?.dispatch('onKeydown', event);
}

function handleWindowKeyUp(event) {
  scriptRuntime?.dispatch('onKeyup', event);
}

function setLabelGroupVisible(group, visible) {
  const hiddenGroups = new Set(hiddenLabelGroupUuids.value);
  if (visible) hiddenGroups.delete(group.uuid);
  else hiddenGroups.add(group.uuid);
  hiddenLabelGroupUuids.value = hiddenGroups;
  const groupObject = sceneObjectByUuid.get(group.uuid);
  if (groupObject) groupObject.visible = visible;
}

function setAllLabelGroupsVisible(visible) {
  hiddenLabelGroupUuids.value = visible
    ? new Set()
    : new Set(labelGroups.value.map((group) => group.uuid));
  labelGroups.value.forEach((group) => {
    const groupObject = sceneObjectByUuid.get(group.uuid);
    if (groupObject) groupObject.visible = visible;
  });
}

function triggerDataUpdate(field, value) {
  htmlSprites.value.forEach((sprite, index) => {
    updateHtmlSpriteData(labelElements[index], sprite, field, value);
  });
}

function handleMqttData(payload, receivedTopic, rawMessage) {
  if (receivedTopic === props.alarmTopic.trim()) {
    emit('alarm-notification', payload ?? rawMessage);
    return;
  }
  if (!payload) return;
  Object.entries(payload).forEach(([field, value]) => {
    triggerDataUpdate(field, value);
    scriptRuntime?.emit(field, value);
  });
  scriptRuntime?.emit('mqttMessage', payload);
  emit('mqtt-data', payload);
}

function handleMqttError(error) {
  console.warn('三维组态 MQTT 连接异常:', error);
}

function stopMqtt() {
  disconnectWebTopoMqtt(mqttClient);
  mqttClient = null;
  realtimeTopic = '';
}

function startMqtt(config) {
  stopMqtt();
  realtimeTopic = config?.topic?.trim() || '';
  mqttClient = connectWebTopoMqtt(config, handleMqttData, handleMqttError);
  if (props.alarmTopic.trim() && props.alarmTopic.trim() !== realtimeTopic) {
    subscribeWebTopoMqtt(mqttClient, props.alarmTopic, handleMqttError);
  }
}

function createRenderer() {
  const host = canvasHostRef.value;
  if (!host) return;

  scene = new THREE.Scene();
  scene.background = null;
  camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100000);
  camera.position.set(0, 5, 10);

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', '可交互的智能水槽三维组态场景');
  renderer.domElement.addEventListener('pointerdown', handleCanvasPointerDown);
  renderer.domElement.addEventListener('pointerup', handleCanvasPointerUp);
  renderer.domElement.addEventListener('pointercancel', handleCanvasPointerCancel);
  renderer.domElement.addEventListener('pointermove', handleCanvasPointerMove);
  window.addEventListener('keydown', handleWindowKeyDown);
  window.addEventListener('keyup', handleWindowKeyUp);
  host.appendChild(renderer.domElement);

  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  outlinePass = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
  outlinePass.visibleEdgeColor.set(0x35c8ff);
  outlinePass.hiddenEdgeColor.set(0x075477);
  outlinePass.edgeStrength = 5;
  outlinePass.edgeGlow = 0.35;
  outlinePass.edgeThickness = 1.2;
  outlinePass.selectedObjects = [];
  outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(outlinePass);
  composer.addPass(outputPass);

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
  controls.autoRotateSpeed = roamingSpeed.value;
  controls.target.copy(target);
  controls.addEventListener('start', cancelCameraTransition);
  controls.update();
}

function updateRoamingSpeed(event) {
  const speed = Number(event.currentTarget.value);
  if (!Number.isFinite(speed)) return;
  roamingSpeed.value = speed;
  if (controls) controls.autoRotateSpeed = speed;
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

function applySceneBackgroundColor(value) {
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(String(value || '').trim());
  const color = match ? `#${match[1]}` : '#000000';
  const alpha = match?.[2] ? parseInt(match[2], 16) / 255 : 0;
  renderer.setClearColor(color, alpha);
  renderPass.clearColor = new THREE.Color(color);
  renderPass.clearAlpha = alpha;
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

async function loadScene({ forceReload = false } = {}) {
  scriptRuntime?.dispose();
  scriptRuntime = undefined;
  resetModelExpansion();
  restoreIsolatedModelVisibility();
  abortController?.abort();
  stopMqtt();
  abortController = new AbortController();
  loading.value = true;
  loadError.value = '';
  applySceneBackgroundColor();
  loadProgress.value = 0;
  sceneName.value = '';
  htmlSprites.value = [];
  labelGroups.value = [];
  hiddenLabelGroupUuids.value = new Set();
  labelVisibilityOpen.value = false;
  modelGroupTree.value = [];
  sceneTreeOpen.value = false;
  sceneTreeSearch.value = '';
  expandedSceneTreeUuids.value = new Set();
  selectedSceneTreeUuid.value = '';
  hiddenModelGroupUuids.value = new Set();
  selectedModelIsolationEnabled.value = false;
  cancelCameraTransition();
  if (outlinePass) outlinePass.selectedObjects = [];
  sceneObjectByUuid = new Map();
  labelElements.length = 0;

  try {
    const info = await getWebTopoScene(props.webTopoId, { forceReload });
    if (!info.zipUrl) throw new Error('该三维组态场景没有场景包');
    sceneName.value = info.sceneName || '';
    loadProgress.value = 1;

    const loaded = await loadWebTopoScenePackage(resolveWebTopoAssetUrl(info.zipUrl), {
      forceReload,
      signal: abortController.signal,
      onProgress: (progress) => {
        loadProgress.value = Math.max(1, Math.round(progress * 100));
      },
    });
    if (disposed) return;

    disposeObject(scene);
    scene = loaded.scene;
    scene.background = null;
    applySceneBackgroundColor(loaded.backgroundColor);
    indexSceneObjects(scene);
    modelGroupTree.value = buildGroupTreeUnder(scene, '模型');
    expandedSceneTreeUuids.value = new Set(modelGroupTree.value.map((node) => node.uuid));
    camera = loaded.camera || camera;
    renderPass.scene = scene;
    renderPass.camera = camera;
    outlinePass.renderScene = scene;
    outlinePass.renderCamera = camera;
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
    labelGroups.value = loaded.labelGroups;
    hiddenLabelGroupUuids.value = new Set(labelGroups.value
      .filter((group) => sceneObjectByUuid.get(group.uuid)?.visible === false)
      .map((group) => group.uuid));
    loading.value = false;
    loadProgress.value = 100;
    await nextTick();
    applyLabelUserData();
    scriptRuntime = createWebTopoScriptRuntime({
      camera,
      controls,
      renderer,
      scene,
      scripts: loaded.scripts,
      viewer: {
        camera,
        controls,
        modules: { controls },
        render: renderCurrentScene,
        renderer,
        scene,
      },
      onError: ({ message, error }) => console.warn(message, error),
    });
    scriptRuntime.start();
    startMqtt(loaded.config?.mqtt);
    resizeScene();
    if (pendingSceneTreeGroupName) focusSceneTreeGroupByName(pendingSceneTreeGroupName);
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
  composer?.setSize(width, height);
}

function distanceForView(horizontalSize, verticalSize, depthSize) {
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const verticalDistance = verticalSize / (2 * Math.tan(verticalFov / 2));
  const horizontalDistance = horizontalSize / (2 * Math.tan(verticalFov / 2) * camera.aspect);
  return depthSize / 2 + Math.max(verticalDistance, horizontalDistance) * 1.12;
}

function startCameraTransition(targetPosition, targetTarget, targetZoom = camera?.zoom ?? 1) {
  if (!camera || !controls) return;
  const fromTarget = controls.target.clone();
  const fromOffset = camera.position.clone().sub(fromTarget);
  const targetOffset = targetPosition.clone().sub(targetTarget);
  const fromDistance = fromOffset.length();
  const targetDistance = targetOffset.length();
  const fromDirection = fromDistance > 1e-3
    ? fromOffset.clone().multiplyScalar(1 / fromDistance)
    : new THREE.Vector3(0, 0, 1);
  const targetDirection = targetDistance > 1e-3
    ? targetOffset.clone().multiplyScalar(1 / targetDistance)
    : fromDirection.clone();
  const directionRotation = new THREE.Quaternion();
  const directionDot = THREE.MathUtils.clamp(fromDirection.dot(targetDirection), -1, 1);

  if (directionDot < -0.9995) {
    // Slerp has no unique shortest path for opposite directions. Use the
    // camera up axis so left/right changes arc around the model instead of
    // crossing its center.
    const rotationAxis = camera.up.clone().normalize();
    if (Math.abs(rotationAxis.dot(fromDirection)) > 0.95) {
      rotationAxis.set(0, 1, 0);
      if (Math.abs(rotationAxis.dot(fromDirection)) > 0.95) rotationAxis.set(1, 0, 0);
    }
    directionRotation.setFromAxisAngle(rotationAxis, Math.PI);
  } else {
    directionRotation.setFromUnitVectors(fromDirection, targetDirection);
  }

  const modelRadius = modelSize.length() * 0.5;
  const transitionClearance = Math.max(modelRadius * 0.08, 0.25);
  // Add a small mid-arc clearance when a view change passes the model.
  const safeDistance = modelRadius + transitionClearance;
  cameraTransition = {
    startedAt: performance.now(),
    duration: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 0
      : CAMERA_FOCUS_DURATION,
    fromPosition: camera.position.clone(),
    targetPosition: targetPosition.clone(),
    fromTarget,
    target: targetTarget.clone(),
    fromZoom: camera.zoom,
    targetZoom,
    fromDirection,
    targetDirection,
    directionRotation,
    fromDistance,
    targetDistance,
    safeDistance,
  };
}

function applyView(direction, horizontalSize, verticalSize, depthSize, up = new THREE.Vector3(0, 1, 0)) {
  if (!camera || !controls || !defaultCameraState) return;
  const distance = distanceForView(horizontalSize, verticalSize, depthSize);
  const targetPosition = modelCenter.clone().add(direction.clone().normalize().multiplyScalar(distance));
  camera.up.copy(up);
  camera.near = Math.max(distance / 1000, 0.01);
  camera.far = Math.max(distance * 100, 1000);
  camera.updateProjectionMatrix();
  startCameraTransition(targetPosition, modelCenter, camera.zoom);
}

function setView(action) {
  if (!camera || !controls || !defaultCameraState) return;
  cancelCameraTransition();
  if (action !== '自动漫游') {
    autoRotating.value = false;
    controls.autoRotate = false;
  }

  switch (action) {
    case '俯视图':
      // Keep Y as the orbit axis and avoid the exact overhead singularity.
      applyView(new THREE.Vector3(0, 1, 0.2), modelSize.x, modelSize.z, modelSize.y);
      break;
    case '正视图':
      applyView(new THREE.Vector3(0, 0, 1), modelSize.x, modelSize.y, modelSize.z);
      break;
    case '左视图':
      applyView(new THREE.Vector3(-1, 0, 0), modelSize.z, modelSize.y, modelSize.x);
      break;
    case '右视图':
      applyView(new THREE.Vector3(1, 0, 0), modelSize.z, modelSize.y, modelSize.x);
      break;
    case '自动漫游':
      autoRotating.value = !autoRotating.value;
      controls.autoRotate = autoRotating.value;
      break;
    case '复位':
    case '默认视角':
    default:
      startCameraTransition(defaultCameraState.position, defaultCameraState.target, camera.zoom);
      break;
  }
}

function updateLabels() {
  if (!camera || !canvasHostRef.value || loading.value) return;
  const width = canvasHostRef.value.clientWidth;
  const height = canvasHostRef.value.clientHeight;
  camera.updateMatrixWorld();
  camera.getWorldDirection(labelCameraDirection);

  htmlSprites.value.forEach((sprite, index) => {
    const element = labelElements[index];
    if (!element) return;
    const hierarchyVisible = isHtmlSpriteHierarchyVisible(sprite, sceneObjectByUuid);
    element.hidden = !hierarchyVisible;
    if (!hierarchyVisible) return;
    labelWorldPosition.fromArray(sprite.position);
    labelTowardCamera.copy(labelWorldPosition).sub(camera.position);
    labelProjectedPosition.copy(labelWorldPosition).project(camera);
    const visible = labelCameraDirection.dot(labelTowardCamera) > 0
      && labelProjectedPosition.z > -1
      && labelProjectedPosition.z < 1;
    const distance = Math.max(camera.position.distanceTo(labelWorldPosition), 0.01);
    const pixelsPerUnit = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance);
    const scale = THREE.MathUtils.clamp(sprite.scale * pixelsPerUnit, 0.35, 1.5);
    element.style.opacity = visible ? '1' : '0';
    element.style.transform = `translate(-50%, -50%) translate(${(labelProjectedPosition.x * 0.5 + 0.5) * width}px, ${(-labelProjectedPosition.y * 0.5 + 0.5) * height}px) scale(${scale})`;
    updateHtmlSpriteDirectionArrow(element, sprite, camera, width, height);
  });
}

function updateCameraTransition(timestamp) {
  if (!cameraTransition || !camera || !controls) return;

  const progress = cameraTransition.duration === 0
    ? 1
    : THREE.MathUtils.clamp(
      (timestamp - cameraTransition.startedAt) / cameraTransition.duration,
      0,
      1,
    );
  const eased = progress < 0.5
    ? 4 * progress ** 3
    : 1 - ((-2 * progress + 2) ** 3) / 2;

  controls.target.lerpVectors(cameraTransition.fromTarget, cameraTransition.target, eased);
  const radius = THREE.MathUtils.lerp(
    cameraTransition.fromDistance,
    cameraTransition.targetDistance,
    eased,
  );
  const detour = Math.sin(progress * Math.PI)
    * Math.max(0, cameraTransition.safeDistance - radius);
  const direction = cameraTransition.fromDirection.clone();
  direction.applyQuaternion(
    new THREE.Quaternion().slerpQuaternions(
      new THREE.Quaternion(),
      cameraTransition.directionRotation,
      eased,
    ),
  );
  camera.position.copy(controls.target).addScaledVector(direction, radius + detour);
  if (camera.isOrthographicCamera) {
    camera.zoom = THREE.MathUtils.lerp(
      cameraTransition.fromZoom,
      cameraTransition.targetZoom,
      eased,
    );
    camera.updateProjectionMatrix();
  }
  if (progress === 1) {
    camera.position.copy(cameraTransition.targetPosition);
    controls.target.copy(cameraTransition.target);
    cancelCameraTransition();
  }
}

function renderCurrentScene() {
  if (!composer || !scene || !camera) return;
  updateLabels();
  composer.render();
}

function reloadScene() {
  return loadScene({ forceReload: true });
}

function renderScene(timestamp = performance.now()) {
  if (!composer || !scene || !camera) return;
  updateModelExpansionTransition(timestamp);
  updateCameraTransition(timestamp);
  scriptRuntime?.update();
  controls?.update();
  renderCurrentScene();
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

watch(() => props.alarmTopic, (nextTopic, previousTopic) => {
  const previous = previousTopic?.trim();
  const next = nextTopic?.trim();
  if (previous && previous !== realtimeTopic) {
    unsubscribeWebTopoMqtt(mqttClient, previous, handleMqttError);
  }
  if (next && next !== realtimeTopic) {
    subscribeWebTopoMqtt(mqttClient, next, handleMqttError);
  }
});

watch(autoRotating, (enabled) => {
  emit('auto-roaming-change', enabled);
});

onMounted(async () => {
  await nextTick();
  createRenderer();
  loadScene();
});

onBeforeUnmount(() => {
  disposed = true;
  scriptRuntime?.dispose();
  scriptRuntime = undefined;
  abortController?.abort();
  resizeObserver?.disconnect();
  controls?.dispose();
  stopMqtt();
  renderer?.setAnimationLoop(null);
  disposeObject(scene);
  outlinePass?.dispose();
  outputPass?.dispose();
  composer?.dispose();
  renderer?.domElement.removeEventListener('pointerdown', handleCanvasPointerDown);
  renderer?.domElement.removeEventListener('pointerup', handleCanvasPointerUp);
  renderer?.domElement.removeEventListener('pointercancel', handleCanvasPointerCancel);
  renderer?.domElement.removeEventListener('pointermove', handleCanvasPointerMove);
  window.removeEventListener('keydown', handleWindowKeyDown);
  window.removeEventListener('keyup', handleWindowKeyUp);
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer?.domElement.remove();
});

defineExpose({
  focusSceneTreeGroupByName,
  handleAction: setView,
  reload: reloadScene,
  triggerDataUpdate,
});
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
  /* will-change: transform; */
}

.model-expansion-controls {
  position: absolute;
  z-index: 4;
  bottom: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  gap: 8px;
  align-items: center;
  pointer-events: none;
}

.model-expansion-control {
  flex: 0 0 70px;
  width: 70px;
  height: 34px;
  border: 1px solid rgba(47, 165, 255, 0.58);
  border-radius: 5px;
  background: rgba(3, 25, 44, 0.94);
  box-shadow: 0 7px 20px rgba(0, 8, 16, 0.42);
  color: #c7eaff;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.model-expansion-control:hover,
.model-expansion-control.active {
  border-color: #7bd4ff;
  background: #0a5d96;
  color: #fff;
}

.model-expansion-control.active {
  box-shadow: 0 7px 20px rgba(0, 8, 16, 0.42), inset 0 0 0 1px rgba(123, 212, 255, 0.35);
}

.model-expansion-slider {
  display: flex;
  flex: 0 1 180px;
  align-items: center;
  box-sizing: border-box;
  min-width: 96px;
  max-width: 180px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid rgba(47, 165, 255, 0.58);
  border-radius: 5px;
  background: rgba(3, 25, 44, 0.94);
  box-shadow: 0 7px 20px rgba(0, 8, 16, 0.42);
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.model-expansion-slider input {
  min-width: 0;
  width: 100%;
  height: 14px;
  margin: 0;
  cursor: pointer;
  accent-color: #2fa5ff;
}

.model-expansion-slider-enter-active,
.model-expansion-slider-leave-active {
  transition: opacity 0.16s ease, transform 0.2s ease;
}

.model-expansion-slider-enter-from,
.model-expansion-slider-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}

.label-visibility-control {
  position: absolute;
  z-index: 4;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
  width: min(130px, calc(100% - 20px));
  pointer-events: none;
}

.label-visibility-trigger,
.label-visibility-card {
  border: 1px solid rgba(47, 165, 255, 0.55);
  background: rgba(3, 25, 44, 0.92);
  box-shadow: 0 7px 20px rgba(0, 8, 16, 0.42);
  color: #c7eaff;
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.label-visibility-trigger {
  width: 70px;
  height: 34px;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
}

.label-visibility-trigger:hover {
  border-color: #63c4ff;
  background: #084b7d;
  color: #fff;
}

.label-visibility-card {
  box-sizing: border-box;
  width: 100%;
  padding: 9px;
  border-radius: 6px;
  font-size: 11px;
}

.label-visibility-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
  margin-bottom: 7px;
}

.label-visibility-card h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
}

.label-visibility-close {
  display: inline-grid;
  place-items: center;
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #9fd8ff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.label-visibility-close:hover {
  color: #fff;
}

.label-group-list {
  display: grid;
  gap: 4px;
}

.label-group-toggle {
  display: grid;
  grid-template-columns: 13px 7px minmax(0, 1fr);
  gap: 5px;
  align-items: center;
  min-height: 23px;
  padding: 2px 6px;
  border: 1px solid rgba(83, 151, 199, 0.38);
  border-radius: 5px;
  background: rgba(5, 43, 72, 0.78);
  cursor: pointer;
}

.label-group-toggle:hover {
  border-color: #55b6f5;
  background: rgba(7, 57, 94, 0.95);
}

.label-group-toggle input {
  width: 13px;
  height: 13px;
  margin: 0;
  cursor: pointer;
}

.label-group-swatch {
  width: 7px;
  height: 7px;
  border-radius: 2px;
}

.label-group-name {
  min-width: 0;
  overflow: hidden;
  color: #a9d8f5;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.label-group-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 7px;
}

.label-group-actions button {
  min-height: 25px;
  border: 1px solid #327fad;
  border-radius: 5px;
  background: #06365d;
  color: #dff3ff;
  font: inherit;
  cursor: pointer;
}

.label-group-actions button:hover:not(:disabled) {
  border-color: #63c4ff;
  background: #084b7d;
  color: #fff;
}

.label-group-actions button:disabled {
  opacity: 0.45;
  cursor: default;
}

.scene-tree-control {
  position: absolute;
  z-index: 4;
  top: 10px;
  right: 10px;
  bottom: 10px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: flex-end;
  width: min(396px, calc(100% - 20px));
  pointer-events: none;
}

.selected-model-isolation {
  display: flex;
  flex: 0 0 128px;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 34px;
  padding: 0 5px;
  border: 1px solid rgba(47, 165, 255, 0.58);
  border-radius: 5px;
  background: rgba(3, 25, 44, 0.94);
  box-shadow: 0 7px 20px rgba(0, 8, 16, 0.42);
  color: #9fcde9;
  font-family: inherit;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  backdrop-filter: blur(8px);
  pointer-events: auto;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.selected-model-isolation:hover {
  border-color: #63c4ff;
  background: #084b7d;
  color: #fff;
}

.selected-model-isolation.active {
  border-color: #7bd4ff;
  background: #0a5d96;
  box-shadow: 0 7px 20px rgba(0, 8, 16, 0.42), inset 0 0 0 1px rgba(123, 212, 255, 0.35);
  color: #fff;
}

.selected-model-isolation:focus-visible {
  outline: 2px solid #63c4ff;
  outline-offset: 2px;
}

.scene-tree-trigger,
.scene-tree-panel {
  border: 1px solid rgba(47, 165, 255, 0.58);
  background: rgba(3, 25, 44, 0.94);
  box-shadow: 0 7px 20px rgba(0, 8, 16, 0.42);
  color: #c7eaff;
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.scene-tree-trigger {
  width: 70px;
  height: 34px;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
}

.scene-tree-trigger:hover {
  border-color: #63c4ff;
  background: #084b7d;
  color: #fff;
}

.scene-tree-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  box-sizing: border-box;
  width: min(260px, calc(100% - 136px));
  max-height: min(420px, 100%);
  padding: 10px;
  border-radius: 6px;
  overflow: hidden;
}

.scene-tree-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 26px;
  margin-bottom: 8px;
}

.scene-tree-panel h3 {
  margin: 0;
  font-size: 13px;
  line-height: 1.3;
}

.scene-tree-close,
.scene-tree-switcher {
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #9fd8ff;
  cursor: pointer;
}

.scene-tree-close {
  width: 24px;
  height: 24px;
  font-size: 20px;
  line-height: 1;
}

.scene-tree-close:hover,
.scene-tree-switcher:hover {
  color: #fff;
}

.scene-tree-search {
  box-sizing: border-box;
  width: 100%;
  height: 30px;
  margin: 0 0 8px;
  padding: 0 8px;
  border: 1px solid rgba(83, 151, 199, 0.5);
  border-radius: 4px;
  outline: none;
  background: rgba(5, 43, 72, 0.82);
  color: #dff3ff;
  font: inherit;
}

.scene-tree-search::placeholder {
  color: #739bb7;
}

.scene-tree-search:focus {
  border-color: #63c4ff;
  box-shadow: 0 0 0 2px rgba(47, 165, 255, 0.18);
}

.scene-tree-body {
  min-height: 0;
  overflow: auto;
  scrollbar-color: #327fad rgba(3, 25, 44, 0.6);
}

.scene-tree-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 24px;
  gap: 4px;
  align-items: center;
  min-height: 28px;
  padding: 1px 5px;
  border-radius: 3px;
}

.scene-tree-row:hover,
.scene-tree-row.selected {
  background: rgba(31, 116, 171, 0.24);
}

.scene-tree-row.selected {
  box-shadow: inset 2px 0 #35c8ff;
}

.scene-tree-row.hidden .scene-tree-folder,
.scene-tree-row.hidden .scene-tree-name {
  opacity: 0.5;
}

.scene-tree-switcher {
  width: 18px;
  height: 24px;
}

.scene-tree-switcher span {
  font-size: 18px;
  transform: rotate(0deg);
  transition: transform 0.16s ease;
}

.scene-tree-switcher span.expanded {
  transform: rotate(90deg);
}

.scene-tree-switcher-placeholder {
  width: 18px;
}

.scene-tree-node {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 4px;
  align-items: center;
  min-width: 0;
  min-height: 26px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.scene-tree-node:focus-visible {
  border-radius: 3px;
  outline: 1px solid #63c4ff;
  outline-offset: 1px;
}

.scene-tree-visibility {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: #8bcdf5;
  font-size: 14px;
  cursor: pointer;
}

.scene-tree-visibility:hover,
.scene-tree-visibility:focus-visible {
  outline: none;
  background: rgba(47, 165, 255, 0.18);
  color: #fff;
}

.scene-tree-visibility.hidden {
  color: #607f94;
}

.scene-tree-visibility:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.scene-tree-folder {
  position: relative;
  width: 13px;
  height: 9px;
  border: 1px solid #6fc1f2;
  border-radius: 2px;
  background: rgba(47, 165, 255, 0.16);
}

.scene-tree-folder::before {
  position: absolute;
  top: -4px;
  left: 1px;
  width: 6px;
  height: 3px;
  border: 1px solid #6fc1f2;
  border-bottom: 0;
  border-radius: 2px 2px 0 0;
  content: '';
}

.scene-tree-name {
  min-width: 0;
  overflow: hidden;
  color: #b9ddf4;
  font-size: 12px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-tree-empty {
  margin: 18px 0;
  color: #739bb7;
  font-size: 12px;
  text-align: center;
}

.scene-tree-toggle-enter-active,
.scene-tree-toggle-leave-active {
  transition: opacity 0.16s ease, transform 0.2s ease;
}

.scene-tree-toggle-enter-from,
.scene-tree-toggle-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
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

.roaming-control {
  position: absolute;
  z-index: 3;
  right: 10px;
  bottom: 10px;
  display: grid;
  grid-template-columns: auto auto;
  gap: 5px 8px;
  align-items: center;
  width: min(190px, calc(100% - 20px));
  padding: 6px 8px;
  border: 1px solid rgba(47, 165, 255, 0.65);
  border-radius: 4px;
  background: rgba(3, 30, 52, 0.88);
  color: #9fd8ff;
  font-size: 11px;
}

.roaming-control strong {
  justify-self: end;
  color: #dff5ff;
  font-size: 11px;
}

.roaming-control input {
  grid-column: 1 / -1;
  width: 100%;
  height: 14px;
  margin: 0;
  cursor: pointer;
  accent-color: #2fa5ff;
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

  .scene-tree-switcher span,
  .scene-tree-toggle-enter-active,
  .scene-tree-toggle-leave-active,
  .model-expansion-slider-enter-active,
  .model-expansion-slider-leave-active {
    transition: none;
  }
}
</style>
