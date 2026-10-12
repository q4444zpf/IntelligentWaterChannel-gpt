import * as THREE from 'three';

const MAX_FRAME_DELTA_SECONDS = 0.1;

/**
 * 管理组态包中挂载到各个对象上的关键帧动画。
 * 每个对象使用独立混合器，避免同名轨道写入错误的对象。
 */
export function createWebTopoAnimationRuntime(root) {
  const bindings = new Map();

  root?.traverse((object) => {
    const clips = (object.animations || []).filter((clip) => clip instanceof THREE.AnimationClip);
    if (!clips.length) return;

    const mixer = new THREE.AnimationMixer(object);
    const actions = clips.map((clip) => mixer.clipAction(clip, object));
    bindings.set(object.uuid, { object, mixer, actions });
  });

  function play() {
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

    return updated;
  }

  function dispose() {
    bindings.forEach(({ object, mixer }) => {
      mixer.stopAllAction();
      mixer.uncacheRoot(object);
    });
    bindings.clear();
  }

  return {
    dispose,
    play,
    update,
  };
}
