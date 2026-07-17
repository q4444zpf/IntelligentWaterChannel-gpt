import { computed, onBeforeUnmount, onMounted, reactive, toRefs } from 'vue';
import { createRealtimeWaterProfilePoller } from '../realtime-water-profile-poller.js';

export function useRealtimeWaterProfile({ source, intervalMs = 5000 }) {
  const state = reactive({
    snapshot: null,
    loading: true,
    refreshing: false,
    error: '',
    paused: false,
    lastUpdated: null
  });
  const poller = createRealtimeWaterProfilePoller({
    source,
    intervalMs,
    onChange: (nextState) => Object.assign(state, nextState)
  });

  onMounted(poller.start);
  onBeforeUnmount(poller.dispose);

  return {
    ...toRefs(state),
    isEmpty: computed(() => !state.loading && !state.snapshot?.nodes?.some((node) => node.measured !== null)),
    refresh: poller.refresh,
    pause: poller.pause,
    resume: poller.resume
  };
}
