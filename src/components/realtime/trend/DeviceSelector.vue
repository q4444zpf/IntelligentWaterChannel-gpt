<template>
  <aside class="trend-device-selector">
    <div class="selector-heading"><strong>设备选择</strong><span>{{ selectedIds.length }}/{{ devices.length }}</span></div>
    <input v-model="search" class="selector-search" type="search" placeholder="搜索设备名称或编号" aria-label="搜索设备">
    <select v-if="supportsRegion" v-model="region" class="selector-region" aria-label="渠道或区域筛选">
      <option v-for="item in regions" :key="item" :value="item">{{ item }}</option>
    </select>
    <div class="selector-bulk"><button type="button" @click="selectVisible(true)">全选</button><button type="button" @click="selectVisible(false)">取消</button><span>{{ visibleDevices.length }} 台</span></div>
    <div class="selector-list">
      <label v-for="device in visibleDevices" :key="device.id" :class="{ offline: device.state === '离线' }">
        <input type="checkbox" :checked="selectedIds.includes(device.id)" @change="toggleDevice(device.id)">
        <span class="device-color" :style="{ backgroundColor: device.color }"></span>
        <span class="device-copy"><b>{{ device.id }}</b><small>{{ device.location }}</small></span>
        <i :class="`state-${device.state}`">{{ device.state }}</i>
      </label>
    </div>
    <div class="selected-tags" aria-label="已选设备">
      <span v-for="device in selectedDevices" :key="device.id" :style="{ borderColor: device.color }">{{ device.id }}<button type="button" :title="`移除 ${device.id}`" @click="toggleDevice(device.id)">×</button></span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { TrendDevice } from '../../../config/trendConfig.ts';
import { filterTrendDevices, toggleFilteredSelection } from '../../../data/realtime-trend-data.ts';

const props = defineProps<{ devices: readonly TrendDevice[]; selectedIds: string[]; supportsRegion: boolean }>();
const emit = defineEmits<{ 'update:selectedIds': [ids: string[]] }>();
const search = ref('');
const region = ref('全部');
const regions = computed(() => ['全部', ...new Set(props.devices.map((device) => device.region))]);
const visibleDevices = computed(() => filterTrendDevices(props.devices, { search: search.value, region: region.value }));
const selectedDevices = computed(() => props.devices.filter((device) => props.selectedIds.includes(device.id)));
watch(() => props.devices, () => { search.value = ''; region.value = '全部'; });
function toggleDevice(id: string) {
  emit('update:selectedIds', props.selectedIds.includes(id) ? props.selectedIds.filter((item) => item !== id) : [...props.selectedIds, id]);
}
function selectVisible(selected: boolean) {
  emit('update:selectedIds', toggleFilteredSelection(props.selectedIds, visibleDevices.value.map((device) => device.id), selected));
}
</script>

<style scoped>
.trend-device-selector { display: flex; flex-direction: column; min-width: 0; min-height: 0; padding: 8px; border-right: 1px solid rgba(66, 143, 197, .24); background: rgba(3, 22, 39, .56); }
.selector-heading, .selector-bulk { display: flex; align-items: center; justify-content: space-between; gap: 5px; color: #8eaec8; font-size: 10px; }
.selector-heading strong { color: #e9f6ff; font-size: 12px; }
.selector-search, .selector-region { width: 100%; height: 27px; margin-top: 6px; padding: 0 7px; border: 1px solid rgba(72, 151, 207, .35); border-radius: 4px; outline: 0; background: rgba(2, 15, 28, .82); color: #d9ecff; font-size: 10px; }
.selector-search:focus, .selector-region:focus { border-color: #39a9ef; }
.selector-bulk { margin: 6px 0 4px; justify-content: flex-start; }
.selector-bulk button { padding: 3px 6px; font-size: 9px; }
.selector-bulk span { margin-left: auto; }
.selector-list { flex: 1; min-height: 56px; overflow: auto; }
.selector-list label { display: grid; grid-template-columns: 14px 7px 1fr auto; gap: 5px; align-items: center; min-height: 31px; padding: 3px 2px; border-bottom: 1px solid rgba(70, 126, 170, .12); cursor: pointer; }
.selector-list label.offline { opacity: .58; }
.selector-list input { margin: 0; accent-color: #168ee9; }
.device-color { width: 6px; height: 18px; border-radius: 2px; }
.device-copy { min-width: 0; }
.device-copy b, .device-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.device-copy b { color: #dceeff; font-size: 10px; }.device-copy small { color: #7897b3; font-size: 9px; }
.selector-list i { font-style: normal; font-size: 8px; }.state-在线 { color: #55dc83; }.state-异常 { color: #ffb24f; }.state-离线 { color: #8190a1; }
.selected-tags { display: flex; gap: 4px; min-height: 25px; padding-top: 5px; overflow-x: auto; }
.selected-tags > span { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 3px; height: 21px; padding-left: 5px; border: 1px solid; border-radius: 4px; color: #bad2e5; font-size: 9px; background: rgba(6, 34, 57, .85); }
.selected-tags button { width: 19px; height: 19px; padding: 0; border: 0; background: transparent; box-shadow: none; color: #8ca8bd; }
</style>
