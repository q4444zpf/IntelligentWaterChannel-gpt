const defaultScheduler = {
  setInterval: (...args) => globalThis.setInterval(...args),
  clearInterval: (id) => globalThis.clearInterval(id)
};

export function createRealtimeWaterProfilePoller({
  source,
  intervalMs = 5000,
  scheduler = defaultScheduler,
  onChange = () => {}
}) {
  if (typeof source !== 'function') throw new TypeError('source must be a function');

  const state = {
    snapshot: null,
    loading: true,
    refreshing: false,
    error: '',
    paused: false,
    lastUpdated: null
  };
  let intervalId = null;
  let inFlight = null;

  const notify = () => onChange({ ...state });
  const stopInterval = () => {
    if (intervalId !== null) scheduler.clearInterval(intervalId);
    intervalId = null;
  };
  const startInterval = () => {
    stopInterval();
    if (!state.paused) intervalId = scheduler.setInterval(() => refresh(), intervalMs);
  };

  function refresh() {
    if (inFlight) return inFlight;
    state.loading = state.snapshot === null;
    state.refreshing = state.snapshot !== null;
    state.error = '';
    notify();
    let sourceResult;
    try {
      sourceResult = source();
    } catch (error) {
      sourceResult = Promise.reject(error);
    }
    inFlight = Promise.resolve(sourceResult)
      .then((snapshot) => {
        state.snapshot = snapshot;
        state.lastUpdated = snapshot?.timestamp ?? Date.now();
      })
      .catch(() => {
        state.error = '数据刷新失败，已保留上次有效数据';
      })
      .finally(() => {
        state.loading = false;
        state.refreshing = false;
        inFlight = null;
        notify();
      });
    return inFlight;
  }

  async function start() {
    await refresh();
    startInterval();
  }

  function pause() {
    state.paused = true;
    stopInterval();
    notify();
  }

  async function resume() {
    state.paused = false;
    notify();
    await refresh();
    startInterval();
  }

  function dispose() {
    stopInterval();
  }

  return { state, start, refresh, pause, resume, dispose };
}
