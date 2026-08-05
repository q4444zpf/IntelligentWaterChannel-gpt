import * as THREE from 'three';

const SCRIPT_EVENT_NAMES = [
  'init',
  'start',
  'stop',
  'beforeUpdate',
  'update',
  'afterUpdate',
  'beforeDestroy',
  'destroy',
  'onKeydown',
  'onKeyup',
  'onPointerdown',
  'onPointerup',
  'onPointermove',
];

function createHelper(scene) {
  return {
    scene,
    objectByUuid(uuid) {
      return scene.getObjectByProperty('uuid', uuid);
    },
    moveObject(object, parent = scene, before) {
      parent.add(object);
      if (before) {
        const index = parent.children.indexOf(before);
        if (index >= 0) {
          parent.children.splice(parent.children.indexOf(object), 1);
          parent.children.splice(index, 0, object);
        }
      }
    },
    removeObject(object) {
      object?.parent?.remove(object);
    },
  };
}

function createEmitter(onListenerError) {
  const listeners = new Map();
  const emitter = {
    on(name, callback) {
      if (typeof callback !== 'function') return emitter;
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
      return emitter;
    },
    once(name, callback) {
      if (typeof callback !== 'function') return emitter;
      const onceCallback = (...args) => {
        emitter.off(name, onceCallback);
        callback(...args);
      };
      return emitter.on(name, onceCallback);
    },
    off(name, callback) {
      if (!listeners.has(name)) return emitter;
      if (callback) listeners.get(name).delete(callback);
      else listeners.delete(name);
      return emitter;
    },
    emit(name, ...args) {
      [...(listeners.get(name) || [])].forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          onListenerError(error);
        }
      });
      return emitter;
    },
    clear() {
      listeners.clear();
    },
  };
  return emitter;
}

function reportScriptError(onError, script, object, phase, error) {
  const message = `三维脚本${script.name ? `“${script.name}”` : ''}${phase}失败`;
  if (onError) onError({ error, message, object, script });
  else console.warn(message, error);
}

export function createWebTopoScriptRuntime({
  camera,
  controls,
  onError,
  renderer,
  scene,
  scripts,
  viewer,
}) {
  const events = Object.fromEntries(SCRIPT_EVENT_NAMES.map((name) => [name, []]));
  const clock = new THREE.Clock(false);
  const helper = createHelper(scene);
  const emitter = createEmitter((error) => console.warn('三维脚本事件监听器执行失败', error));
  const globalScope = typeof window === 'undefined' ? globalThis : window;
  const previousEmitter = globalScope.emitter;
  const previousViewer = globalScope.viewer;
  globalScope.emitter = emitter;
  if (viewer) globalScope.viewer = viewer;
  let disposed = false;

  function dispatch(name, payload) {
    events[name]?.forEach(({ callback, object, script }) => {
      try {
        callback(payload);
      } catch (error) {
        reportScriptError(onError, script, object, `在 ${name} 回调中`, error);
      }
    });
  }

  Object.entries(scripts || {}).forEach(([uuid, objectScripts]) => {
    const object = scene.getObjectByProperty('uuid', uuid);
    if (!object) {
      console.warn('三维预览忽略了未找到对象的脚本:', uuid);
      return;
    }

    objectScripts.forEach((script) => {
      try {
        const factory = new Function(
          'helper',
          'renderer',
          'scene',
          'camera',
          'controls',
          'clock',
          `${script.source}\nreturn { ${SCRIPT_EVENT_NAMES
            .map((name) => `${name}: typeof ${name} === 'function' ? ${name} : undefined`)
            .join(', ')} };`,
        );
        const callbacks = factory.call(object, helper, renderer, scene, camera, controls, clock);
        SCRIPT_EVENT_NAMES.forEach((name) => {
          if (typeof callbacks?.[name] === 'function') {
            events[name].push({ callback: callbacks[name].bind(object), object, script });
          }
        });
      } catch (error) {
        reportScriptError(onError, script, object, '初始化', error);
      }
    });
  });

  return {
    dispatch,
    emit(name, ...args) {
      if (!disposed) emitter.emit(name, ...args);
    },
    start() {
      if (disposed) return;
      dispatch('init');
      clock.start();
      dispatch('start');
    },
    update() {
      if (disposed) return;
      const delta = clock.getDelta();
      const frame = { time: clock.elapsedTime, delta };
      dispatch('beforeUpdate', frame);
      dispatch('update', frame);
      dispatch('afterUpdate', frame);
    },
    dispose() {
      if (disposed) return;
      dispatch('beforeDestroy');
      clock.stop();
      dispatch('destroy');
      emitter.clear();
      if (globalScope.emitter === emitter) {
        if (previousEmitter === undefined) delete globalScope.emitter;
        else globalScope.emitter = previousEmitter;
      }
      if (viewer && globalScope.viewer === viewer) {
        if (previousViewer === undefined) delete globalScope.viewer;
        else globalScope.viewer = previousViewer;
      }
      disposed = true;
    },
  };
}
