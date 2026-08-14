import JSZip from 'jszip';
import pako from 'pako';
import * as THREE from 'three';

const GROUP_FETCH_CONCURRENCY = 10;

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('场景加载已取消', 'AbortError');
}

async function fetchZip(url, signal, cache) {
  const response = await fetch(url, { cache, signal });
  if (!response.ok) throw new Error(`场景包请求失败 (${response.status})`);
  return JSZip.loadAsync(await response.arrayBuffer());
}

function unzipGeometryValue(value) {
  if (typeof value !== 'string') return value;
  const binary = atob(value);
  const compressed = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const json = new TextDecoder().decode(pako.ungzip(compressed));
  return JSON.parse(json);
}

function restoreGeometryArrays(geometries) {
  return geometries.map((geometry) => {
    const data = geometry.data;
    if (!data) return geometry;

    Object.values(data.attributes || {}).forEach((attribute) => {
      attribute.array = unzipGeometryValue(attribute.array);
    });
    if (data.index) data.index.array = unzipGeometryValue(data.index.array);
    return geometry;
  });
}

function imageFromArchiveName(fileName, data) {
  const name = fileName.replace('Textures/', '');
  const extensionIndex = name.lastIndexOf('.');
  const baseName = extensionIndex >= 0 ? name.slice(0, extensionIndex) : name;
  const extension = extensionIndex >= 0 ? name.slice(extensionIndex + 1) : '';

  if (extension === 'env') {
    const [type, width, height, uuid] = baseName.split('!');
    return {
      uuid,
      url: { type, width: Number(width), height: Number(height), data },
    };
  }

  return { uuid: baseName, url: data };
}

async function readGeometryArchive(zipEntry) {
  const nestedZip = await JSZip.loadAsync(await zipEntry.async('arraybuffer'));
  const geometries = [];
  for (const entry of Object.values(nestedZip.files)) {
    if (!entry.dir && entry.name.endsWith('.json')) {
      geometries.push(...restoreGeometryArrays(JSON.parse(await entry.async('string'))));
    }
  }
  return geometries;
}

async function hydratePackage(zip, jsonName, imageMap) {
  const jsonEntry = zip.file(jsonName);
  if (!jsonEntry) throw new Error(`场景包缺少 ${jsonName}`);

  const wrapper = JSON.parse(await jsonEntry.async('string'));
  const resourceJson = wrapper.scene || wrapper;
  const geometries = [];

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    if (/^Geometries\/geometries_\d+\.json$/.test(entry.name)) {
      geometries.push(...restoreGeometryArrays(JSON.parse(await entry.async('string'))));
    } else if (/^Geometries\/geometries_\d+\.zip$/.test(entry.name)) {
      geometries.push(...await readGeometryArchive(entry));
    } else if (entry.name.startsWith('Textures/')) {
      const data = entry.name.endsWith('.env')
        ? await entry.async('arraybuffer')
        : await entry.async('string');
      const image = imageFromArchiveName(entry.name, data);
      imageMap.set(image.uuid, image);
    }
  }

  resourceJson.geometries = geometries;
  resourceJson.images = (resourceJson.images || []).map((image) => {
    if (typeof image !== 'string') return image;
    const fileName = image.slice(0, image.lastIndexOf('.'));
    const uuid = image.endsWith('.env') ? fileName.split('!').at(-1) : fileName;
    return imageMap.get(uuid);
  }).filter(Boolean);

  return wrapper;
}

function childGroupIds(object, result = []) {
  for (const child of object?.children || []) {
    if (typeof child === 'string') result.push(child);
    else childGroupIds(child, result);
  }
  return result;
}

function addResources(resourceMaps, json) {
  for (const key of Object.keys(resourceMaps)) {
    for (const resource of json[key] || []) {
      if (resource?.uuid) resourceMaps[key].set(resource.uuid, resource);
    }
  }
}

function inflateGroups(object, groupMap, lineage = new Set()) {
  object.children = (object.children || []).map((child) => {
    if (typeof child !== 'string') return inflateGroups(child, groupMap, lineage);
    if (lineage.has(child)) throw new Error(`组态场景存在循环分组: ${child}`);

    const group = groupMap.get(child);
    if (!group) throw new Error(`场景子包缺失: ${child}`);
    const nextLineage = new Set(lineage).add(child);
    return inflateGroups(group.object, groupMap, nextLineage);
  });
  return object;
}

function findGroupByName(object, name) {
  if (!object || typeof object === 'string') return null;
  if (object.type === 'Group' && object.name === name) return object;
  for (const child of object.children || []) {
    const matched = findGroupByName(child, name);
    if (matched) return matched;
  }
  return null;
}

export function extractLabelGroups(object) {
  const labelRoot = findGroupByName(object, '标签');
  if (!labelRoot) return [];

  return (labelRoot.children || [])
    .filter((child) => child?.type === 'Group')
    .map((group, index) => ({
      uuid: group.uuid || `label-group-${index}`,
      name: group.name?.trim() || `未命名分组 ${index + 1}`,
    }));
}

function localMatrixFromJson(object) {
  if (object.matrix) return new THREE.Matrix4().fromArray(object.matrix);
  const position = new THREE.Vector3().fromArray(object.position || [0, 0, 0]);
  const quaternion = object.quaternion
    ? new THREE.Quaternion().fromArray(object.quaternion)
    : new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(object.rotation || [0, 0, 0]));
  const scale = new THREE.Vector3().fromArray(object.scale || [1, 1, 1]);
  return new THREE.Matrix4().compose(position, quaternion, scale);
}

export function extractHtmlSprites(
  object,
  parentMatrix = new THREE.Matrix4(),
  sprites = [],
  parentUuids = [],
) {
  const worldMatrix = parentMatrix.clone().multiply(localMatrixFromJson(object));
  const ancestorUuids = object.uuid ? [...parentUuids, object.uuid] : parentUuids;
  object.children = (object.children || []).filter((child) => {
    if (child.type !== 'HtmlSprite') {
      extractHtmlSprites(child, worldMatrix, sprites, ancestorUuids);
      return true;
    }

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    worldMatrix.clone().multiply(localMatrixFromJson(child)).decompose(position, quaternion, scale);
    sprites.push({
      uuid: child.uuid,
      name: child.name || '',
      html: child.options?.htmlContent || '',
      position: position.toArray(),
      scale: Math.max(Math.abs(scale.x), Math.abs(scale.y)),
      visible: child.visible !== false,
      ancestorUuids,
      userData: {
        ...(child.options?.userData || {}),
        ...(child.userData || {}),
      },
      options: {
        key: child.options?.key || child.options?.cardConfig?.key || '',
        paramName: child.options?.paramName || '',
        paramField: child.options?.paramField || '',
        paramUnit: child.options?.paramUnit || '',
      },
    });
    return false;
  });
  return sprites;
}

export function extractSceneBackgroundColor(sceneJson) {
  const value = sceneJson?.scene?.object?.userData?.__webtopoBackgroundColor
    ?? sceneJson?.scene?.userData?.__webtopoBackgroundColor
    ?? sceneJson?.scene?.object?.background
    ?? sceneJson?.scene?.background;
  if (typeof value === 'string') return value.trim() || null;
  if (Number.isFinite(value)) return `#${Math.max(0, value).toString(16).padStart(6, '0')}`;
  if (!value || typeof value !== 'object') return null;

  const channels = ['r', 'g', 'b'].map((channel) => Number(value[channel]));
  if (!channels.every(Number.isFinite)) return null;
  const scale = channels.every((channel) => channel >= 0 && channel <= 1) ? 255 : 1;
  const alpha = Number(value.a ?? value.alpha ?? 1);
  return `rgba(${channels.map((channel) => Math.round(channel * scale)).join(', ')}, ${Number.isFinite(alpha) ? alpha : 1})`;
}

function parseControlsState(sceneJson) {
  try {
    return typeof sceneJson.controls?.state === 'string'
      ? JSON.parse(sceneJson.controls.state)
      : sceneJson.controls?.state;
  } catch {
    return null;
  }
}

export function extractSceneScripts(scenePackage) {
  if (!scenePackage?.scripts || typeof scenePackage.scripts !== 'object') return {};

  return Object.fromEntries(Object.entries(scenePackage.scripts)
    .filter(([, scripts]) => Array.isArray(scripts))
    .map(([uuid, scripts]) => [uuid, scripts.filter((script) => typeof script?.source === 'string')]));
}

export async function loadWebTopoScenePackage(url, options = {}) {
  const { forceReload = false, onProgress, signal } = options;
  const cache = forceReload ? 'reload' : 'default';
  throwIfAborted(signal);

  const imageMap = new Map();
  const firstZip = await fetchZip(url, signal, cache);
  const sceneJson = await hydratePackage(firstZip, 'scene.json', imageMap);
  const configEntry = firstZip.file('config.json');
  const config = configEntry ? JSON.parse(await configEntry.async('string')) : {};
  const totalPackages = Math.max(sceneJson.totalZipNumber || 1, 1);
  let loadedPackages = 1;
  onProgress?.(loadedPackages / totalPackages);

  const packageBaseUrl = url.slice(0, url.lastIndexOf('/'));
  const groupMap = new Map();
  const queued = new Set();
  const pending = childGroupIds(sceneJson.scene.object);
  pending.forEach((uuid) => queued.add(uuid));

  while (pending.length > 0) {
    throwIfAborted(signal);
    const batch = pending.splice(0, GROUP_FETCH_CONCURRENCY);
    const groups = await Promise.all(batch.map(async (uuid) => {
      const zip = await fetchZip(`${packageBaseUrl}/${uuid}.zip`, signal, cache);
      const group = await hydratePackage(zip, `${uuid}.json`, imageMap);
      return [uuid, group];
    }));

    for (const [uuid, group] of groups) {
      groupMap.set(uuid, group);
      for (const childId of childGroupIds(group.object)) {
        if (!queued.has(childId)) {
          queued.add(childId);
          pending.push(childId);
        }
      }
      loadedPackages += 1;
      onProgress?.(Math.min(loadedPackages / totalPackages, 1));
    }
  }

  throwIfAborted(signal);
  sceneJson.scene.object = inflateGroups(sceneJson.scene.object, groupMap);
  const labelGroups = extractLabelGroups(sceneJson.scene.object);
  const htmlSprites = extractHtmlSprites(sceneJson.scene.object);
  const resourceMaps = {
    geometries: new Map(),
    materials: new Map(),
    textures: new Map(),
    images: new Map(),
    skeletons: new Map(),
    animations: new Map(),
  };
  addResources(resourceMaps, sceneJson.scene);
  for (const group of groupMap.values()) addResources(resourceMaps, group);
  for (const [key, map] of Object.entries(resourceMaps)) {
    sceneJson.scene[key] = [...map.values()];
  }

  const loader = new THREE.ObjectLoader();
  const [scene, camera] = await Promise.all([
    loader.parseAsync(sceneJson.scene),
    sceneJson.camera ? loader.parseAsync(sceneJson.camera) : Promise.resolve(null),
  ]);

  return {
    scene,
    backgroundColor: extractSceneBackgroundColor(sceneJson),
    camera: camera?.isCamera ? camera : null,
    controlsState: parseControlsState(sceneJson),
    htmlSprites,
    labelGroups,
    config,
    metadata: sceneJson.metadata || {},
    scripts: extractSceneScripts(sceneJson),
  };
}
