# Realtime Trend Single-Device Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify realtime trends to ordered category-based node water and top-mounted single-device selection, with pump fixed to P1.

**Architecture:** Keep the existing chart/data boundaries but narrow selection state from arrays to one device per time-trend tab. Replace the selector sidebar with a focused select component, and change the node profile adapter/option from distance values to ordered category labels.

**Tech Stack:** Vue 3, TypeScript, ECharts 5, Node test runner, vue-tsc, Vite, Playwright CLI.

---

### Task 1: Ordered Node Categories

**Files:**
- Modify: `tests/realtime-water-profile.test.mjs`
- Modify: `tests/realtime-water-profile-option.test.mjs`
- Modify: `src/realtime-water-profile.js`
- Modify: `src/realtime-water-profile-option.js`
- Modify: `src/components/realtime/RealtimeWaterProfileChart.vue`

- [ ] **Step 1: Change tests to the new category contract**

Assert every node has an increasing `order`, no `distance`, X axis type is `category`, X axis data equals node labels, and `dataZoom` is absent:

```js
assert.ok(snapshot.nodes.every((node, index, nodes) => !index || node.order > nodes[index - 1].order));
assert.equal('distance' in snapshot.nodes[0], false);
assert.equal(option.xAxis.type, 'category');
assert.deepEqual(option.xAxis.data, snapshot.nodes.map(node => node.label));
assert.equal(option.dataZoom, undefined);
```

- [ ] **Step 2: Run `npm test` and confirm failures reference distance/value-axis behavior**

- [ ] **Step 3: Implement explicit process ordering**

Replace distance constants with ordered gate/segment metadata. Emit `{ id, label, order, measured, simulated, state }`. Build category series as scalar values, place gate mark lines by category label, and express channel bands with category boundaries. Remove distance text from Tooltip and remove DataZoom registration/import from the node component.

- [ ] **Step 4: Run tests, typecheck, build, and commit**

```bash
git add src/realtime-water-profile.js src/realtime-water-profile-option.js src/components/realtime/RealtimeWaterProfileChart.vue tests/realtime-water-profile.test.mjs tests/realtime-water-profile-option.test.mjs
git commit -m "Simplify node water profile axis"
```

### Task 2: Single-Device State and Catalog

**Files:**
- Modify: `src/config/trendConfig.ts`
- Modify: `src/realtime-trend-controller.ts`
- Modify: `src/composables/useRealtimeTrends.ts`
- Modify: `tests/trend-config.test.mjs`
- Modify: `tests/realtime-trend-controller.test.mjs`
- Modify: `tests/realtime-trend-option.test.mjs`

- [ ] **Step 1: Write failing single-device tests**

Assert pump catalog equals `['P1']`; controller state exposes `selectedDeviceId`; each tab restores its single selection; source receives exactly one ID; and chart options contain one series.

- [ ] **Step 2: Run tests and confirm failures reference the old multi-select contract**

- [ ] **Step 3: Narrow controller and composable APIs**

Replace `selectedIds` with `selectedDeviceId`, `setSelectedIds` with `setSelectedDeviceId`, and preferences with one ID per type. Query with `deviceIds: [selectedDeviceId]`. Default to the first online catalog device. Remove P2 and P3 from configuration.

- [ ] **Step 4: Run tests/typecheck and commit**

```bash
git add src/config/trendConfig.ts src/realtime-trend-controller.ts src/composables/useRealtimeTrends.ts tests/trend-config.test.mjs tests/realtime-trend-controller.test.mjs tests/realtime-trend-option.test.mjs
git commit -m "Use single-device realtime trends"
```

### Task 3: Top Device Select and Full-Width Chart

**Files:**
- Create: `src/components/realtime/trend/TrendDeviceSelect.vue`
- Modify: `src/components/realtime/trend/TrendAnalysis.vue`
- Delete: `src/components/realtime/trend/DeviceSelector.vue`

- [ ] **Step 1: Implement `TrendDeviceSelect.vue`**

Accept `devices` and `modelValue`; emit `update:modelValue`. Render a labelled native select with options formatted as `ID · location`. Keep a fixed compact width and accessible label.

- [ ] **Step 2: Replace the workbench sidebar**

Render the device select above flow/level/siphon charts. For pump render static `设备：P1 一号变频泵`. Keep time picker and statistics in the same toolbar. Remove sidebar grid and make `TrendChart` consume the full body width.

- [ ] **Step 3: Delete the unused multi-selector and verify**

Run `rg "DeviceSelector|selectedIds|setSelectedIds" src tests` and expect no old selection references. Run `npm run check`.

- [ ] **Step 4: Commit**

```bash
git add src/components/realtime/trend/TrendAnalysis.vue src/components/realtime/trend/TrendDeviceSelect.vue src/components/realtime/trend/DeviceSelector.vue
git commit -m "Move trend device selection above chart"
```

### Task 4: Browser and Final Verification

**Files:**
- Create: `output/realtime-trends-single-desktop.png`
- Create: `output/realtime-trends-single-narrow.png`
- Modify only files implicated by browser failures

- [ ] **Step 1: Verify node profile**

Confirm ordered labels, no distance axis text, no bottom slider, two series, gates, segments, pause/refresh/reset, and nonblank Canvas pixels.

- [ ] **Step 2: Verify single-device tabs**

Confirm flow/level/siphon dropdown changes the sole legend/curve immediately. Confirm pump has only P1 text and no select. Verify time presets, custom range, pause/continue, Tooltip, zoom, brush, and reset.

- [ ] **Step 3: Verify 1920×1080 and 1024×900**

Confirm panel scroll dimensions equal client dimensions, labels do not overlap, console has zero errors/warnings, and save the two screenshots.

- [ ] **Step 4: Run final commands and commit**

```bash
npm test
npm run typecheck
npm run build
git diff --check
git add src tests output/realtime-trends-single-desktop.png output/realtime-trends-single-narrow.png
git commit -m "Verify single-device realtime trends"
```
