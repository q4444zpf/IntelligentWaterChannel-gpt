import * as THREE from 'three';

const MAX_FRAME_DELTA_SECONDS = 0.1;

/**
 * 管理组态包中挂载到各个对象上的关键帧动画。
 * 每个对象使用独立混合器，避免同名轨道写入错误的对象。
 */
export function createWebTopoAnimationRuntime(root) {
  const bindings = new Map();
  const pathLoops = new Map();
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

    return updated;
  }

  function dispose() {
    bindings.forEach(({ object, mixer }) => {
      mixer.stopAllAction();
      mixer.uncacheRoot(object);
    });
    bindings.clear();
    pathLoops.clear();
  }

  return {
    dispose,
    play,
    update,
  };
}
