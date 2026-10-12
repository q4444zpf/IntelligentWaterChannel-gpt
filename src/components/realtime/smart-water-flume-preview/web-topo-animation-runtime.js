import * as THREE from 'three';

const MAX_FRAME_DELTA_SECONDS = 0.1;
const MAX_BUBBLE_PARTICLES = 2048;

const BUBBLE_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uScale;

  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(aSize * (uScale / -mvPosition.z), 5.0 * step(0.0001, aSize));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const BUBBLE_FRAGMENT_SHADER = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float distanceToCenter = length(uv) * 2.0;
    if (distanceToCenter > 1.0) discard;

    float rim = smoothstep(0.45, 0.95, distanceToCenter);
    float highlight = 1.0 - smoothstep(0.0, 0.6, length(uv - vec2(-0.18, 0.18)) * 2.0);
    vec3 color = mix(vColor, vec3(1.0), highlight * 0.8);
    float alpha = (rim * 0.9 + highlight * 0.9 + 0.25) * vAlpha;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

function isBubbleEmitter(object) {
  const bubble = object.userData?.bubble;
  return bubble
    && Number.isFinite(bubble.rate)
    && Number.isFinite(bubble.height)
    && Number.isFinite(bubble.spread)
    && Number.isFinite(bubble.size)
    && Number.isFinite(bubble.speed);
}

function isVisibleInScene(object) {
  let current = object;
  while (current) {
    if (current.visible === false) return false;
    current = current.parent;
  }
  return true;
}

function createBubbleRuntime(root) {
  const emitters = [];
  const spawnAccumulators = new Map();
  const positions = new Float32Array(MAX_BUBBLE_PARTICLES * 3);
  const sizes = new Float32Array(MAX_BUBBLE_PARTICLES);
  const alphas = new Float32Array(MAX_BUBBLE_PARTICLES);
  const colors = new Float32Array(MAX_BUBBLE_PARTICLES * 3);
  const originX = new Float32Array(MAX_BUBBLE_PARTICLES);
  const originY = new Float32Array(MAX_BUBBLE_PARTICLES);
  const originZ = new Float32Array(MAX_BUBBLE_PARTICLES);
  const heights = new Float32Array(MAX_BUBBLE_PARTICLES);
  const targetY = new Float32Array(MAX_BUBBLE_PARTICLES);
  const speeds = new Float32Array(MAX_BUBBLE_PARTICLES);
  const swayAmplitudes = new Float32Array(MAX_BUBBLE_PARTICLES);
  const swayFrequencies = new Float32Array(MAX_BUBBLE_PARTICLES);
  const swayPhases = new Float32Array(MAX_BUBBLE_PARTICLES);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.ShaderMaterial({
    vertexShader: BUBBLE_VERTEX_SHADER,
    fragmentShader: BUBBLE_FRAGMENT_SHADER,
    uniforms: { uScale: { value: 540 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'WebTopoBubbleParticles';
  points.frustumCulled = false;
  points.renderOrder = 999;

  root?.traverse((object) => {
    // ObjectLoader 会将 BubbleEmitter 降级为 Object3D，但会保留 userData.bubble。
    if (isBubbleEmitter(object)) emitters.push(object);
  });
  if (emitters.length) root.add(points);

  let cursor = 0;
  let elapsedSeconds = 0;
  const worldPosition = new THREE.Vector3();
  const color = new THREE.Color();

  function spawn(emitter) {
    const data = emitter.userData.bubble;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * data.spread;
    const index = cursor;
    const index3 = index * 3;
    cursor = (cursor + 1) % MAX_BUBBLE_PARTICLES;

    emitter.getWorldPosition(worldPosition);
    originX[index] = worldPosition.x + Math.cos(angle) * radius;
    originY[index] = worldPosition.y;
    originZ[index] = worldPosition.z + Math.sin(angle) * radius;
    color.set(data.color || '#99d9ff');
    colors[index3] = color.r;
    colors[index3 + 1] = color.g;
    colors[index3 + 2] = color.b;
    heights[index] = data.height;
    targetY[index] = worldPosition.y + data.height;
    speeds[index] = data.speed * (0.5 + Math.random());
    sizes[index] = data.size * (0.5 + Math.random());
    swayAmplitudes[index] = sizes[index] * 0.8 * (0.5 + Math.random());
    swayFrequencies[index] = 1 + Math.random() * 2;
    swayPhases[index] = Math.random() * Math.PI * 2;
    alphas[index] = 0;
  }

  function update(delta) {
    if (!emitters.length) return false;
    elapsedSeconds += delta;
    root.updateMatrixWorld();

    emitters.forEach((emitter) => {
      if (!isVisibleInScene(emitter)) return;
      const rate = emitter.userData.bubble.rate;
      let accumulator = (spawnAccumulators.get(emitter) || 0) + rate * delta;
      while (accumulator >= 1) {
        accumulator -= 1;
        spawn(emitter);
      }
      spawnAccumulators.set(emitter, accumulator);
    });

    for (let index = 0; index < MAX_BUBBLE_PARTICLES; index += 1) {
      if (sizes[index] <= 0) continue;
      originY[index] += speeds[index] * delta;
      if (originY[index] >= targetY[index]) {
        sizes[index] = 0;
        alphas[index] = 0;
        continue;
      }

      const sway = elapsedSeconds * swayFrequencies[index] + swayPhases[index];
      const index3 = index * 3;
      positions[index3] = originX[index] + Math.sin(sway) * swayAmplitudes[index];
      positions[index3 + 1] = originY[index];
      positions[index3 + 2] = originZ[index] + Math.cos(sway * 0.9) * swayAmplitudes[index];
      const travelled = originY[index] - (targetY[index] - heights[index]);
      alphas[index] = Math.min(1, travelled / 0.15);
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
    return true;
  }

  function dispose() {
    points.removeFromParent();
    geometry.dispose();
    material.dispose();
  }

  return { dispose, update };
}

/**
 * 管理组态包中挂载到各个对象上的关键帧动画。
 * 每个对象使用独立混合器，避免同名轨道写入错误的对象。
 */
export function createWebTopoAnimationRuntime(root) {
  const bindings = new Map();
  const pathLoops = new Map();
  const bubbleRuntime = createBubbleRuntime(root);
  const pathUp = new THREE.Vector3(0, 1, 0);
  const pathDirection = new THREE.Vector3();

  root?.traverse((object) => {
    const pathLoop = object.userData?.visualPathLoop;
    if (
      Array.isArray(pathLoop?.points)
      && pathLoop.points.length >= 2
      && Number.isFinite(pathLoop.duration)
      && pathLoop.duration > 0
    ) {
      pathLoops.set(object.uuid, { object, time: 0 });
    }

    const clips = (object.animations || []).filter((clip) => clip instanceof THREE.AnimationClip);
    if (!clips.length) return;

    const mixer = new THREE.AnimationMixer(object);
    const actions = clips.map((clip) => mixer.clipAction(clip, object));
    bindings.set(object.uuid, { object, mixer, actions });
  });

  function play() {
    pathLoops.forEach((state) => {
      state.time = 0;
    });
    bindings.forEach(({ actions }) => {
      actions.forEach((action) => {
        action.reset();
        action.enabled = true;
        action.paused = false;
        action.play();
      });
    });
  }

  function update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return false;
    const delta = Math.min(deltaSeconds, MAX_FRAME_DELTA_SECONDS);
    let updated = false;

    bindings.forEach(({ mixer, actions }) => {
      if (!actions.some((action) => action.isRunning() && !action.paused)) return;
      mixer.update(delta);
      updated = true;
    });

    pathLoops.forEach((state) => {
      const config = state.object.userData?.visualPathLoop;
      const points = config?.points;
      const duration = config?.duration;
      if (!Array.isArray(points) || points.length < 2 || !Number.isFinite(duration) || duration <= 0) return;

      state.time = (state.time + delta) % duration;
      const offset = Number.isFinite(config.offset) ? config.offset : 0;
      const progress = ((state.time / duration) + offset) % 1;
      const cursor = progress * (points.length - 1);
      const index = Math.min(Math.floor(cursor), points.length - 2);
      const ratio = cursor - index;
      const start = points[index];
      const end = points[index + 1];
      if (!Array.isArray(start) || !Array.isArray(end)) return;

      state.object.position.set(
        start[0] + (end[0] - start[0]) * ratio,
        start[1] + (end[1] - start[1]) * ratio,
        start[2] + (end[2] - start[2]) * ratio,
      );
      if (config.orientToPath === true) {
        pathDirection.set(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
        if (pathDirection.lengthSq() > 0.000001) {
          state.object.quaternion.setFromUnitVectors(pathUp, pathDirection.normalize());
          state.object.matrixAutoUpdate = true;
          state.object.updateMatrix();
          state.object.matrixWorldNeedsUpdate = true;
        }
      }
      updated = true;
    });

    if (bubbleRuntime.update(delta)) updated = true;

    return updated;
  }

  function dispose() {
    bindings.forEach(({ object, mixer }) => {
      mixer.stopAllAction();
      mixer.uncacheRoot(object);
    });
    bindings.clear();
    pathLoops.clear();
    bubbleRuntime.dispose();
  }

  return {
    dispose,
    play,
    update,
  };
}
