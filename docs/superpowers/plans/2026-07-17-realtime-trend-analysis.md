# Realtime Trend Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four placeholder realtime Canvas tabs with a typed, configuration-driven multi-device trend workbench while preserving the existing node-water profile.

**Architecture:** Pure TypeScript configuration, filtering, range, mock-data, polling, and ECharts-option modules hold testable behavior. Focused Vue components render tabs, device selection, time controls, and the shared chart; `TrendAnalysis.vue` coordinates them and `RealtimeView.vue` only composes the page.

**Tech Stack:** Vue 3, TypeScript, ECharts 5 modular imports, Vite 5, Node test runner, vue-tsc, Playwright CLI.

---

### Task 1: TypeScript Foundation and Trend Configuration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tsconfig.json`
- Create: `src/config/trendConfig.ts`
- Create: `tests/trend-config.test.mjs`

- [ ] **Step 1: Write the failing configuration test**

Import `TREND_CONFIGS`, `TREND_DEVICES`, `getDefaultDeviceIds`, and `sortDeviceIds` directly from `.ts`; the repository's Node 23 runtime strips erasable TypeScript syntax. Assert:

```js
assert.deepEqual(Object.keys(TREND_CONFIGS), ['flow', 'level', 'pump', 'siphon']);
assert.equal(TREND_CONFIGS.siphon.unit, 'MPa');
assert.equal(TREND_DEVICES.flow.length, 3);
assert.equal(TREND_DEVICES.level.length, 6);
assert.equal(TREND_DEVICES.pump.length, 3);
assert.equal(TREND_DEVICES.siphon.length, 4);
assert.ok(getDefaultDeviceIds('flow').length > 1);
assert.deepEqual(sortDeviceIds('level', ['WL-06', 'WL-01']), ['WL-01', 'WL-06']);
```

- [ ] **Step 2: Run `npm test` and confirm the missing-module failure**

Expected: `ERR_MODULE_NOT_FOUND` for the trend configuration runtime module.

- [ ] **Step 3: Add TypeScript tooling**

Install `typescript` and `vue-tsc` as dev dependencies. Add scripts:

```json
"typecheck": "vue-tsc --noEmit",
"check": "npm test && npm run typecheck && npm run build"
```

Configure `tsconfig.json` for Vue 3, ES2022, bundler resolution, `allowJs: true`, `checkJs: false`, strict TypeScript, and `src/**/*.ts` plus `src/**/*.vue`.

- [ ] **Step 4: Implement typed configuration**

Define `TrendType`, `TrendTabKey = 'node' | TrendType`, `TrendDevice`, `TrendConfig`, `TrendPoint`, `TrendSeries`, and `TrendSnapshot`. Add four configs and 16 devices with stable colors, engineering order, locations, regions, units, and states. Implement default-online selection and physical-order sorting.

- [ ] **Step 5: Run `npm test && npm run typecheck` and commit**

```bash
git add package.json package-lock.json tsconfig.json src/config/trendConfig.ts tests/trend-config.test.mjs
git commit -m "Add typed realtime trend configuration"
```

### Task 2: Time Ranges, Filtering, and Mock Data

**Files:**
- Create: `src/data/realtime-trend-data.ts`
- Create: `tests/realtime-trend-data.test.mjs`

- [ ] **Step 1: Write failing data tests**

Test `resolveTimeRange`, `filterTrendDevices`, `toggleFilteredSelection`, `queryTrendData`, and `summarizeSeries`:

```js
assert.equal(resolveTimeRange('10m', now).startTime, now - 600_000);
assert.throws(() => resolveTimeRange('custom', now, { startTime: now, endTime: now - 1 }), /开始时间/);
assert.deepEqual(filterTrendDevices(devices, { search: 'FM-02', region: '全部' }).map(d => d.id), ['FM-02']);
assert.deepEqual(toggleFilteredSelection(['FM-01'], ['FM-02'], true), ['FM-01', 'FM-02']);
assert.ok((await queryTrendData(query)).series.every(series => series.points.length <= 121));
assert.deepEqual(await queryTrendData(query), await queryTrendData(query));
assert.equal(summarizeSeries(series).current, series.points.at(-1).value);
```

- [ ] **Step 2: Run tests and confirm the missing-module failure**

- [ ] **Step 3: Implement range and selection helpers**

Resolve 10m/1h/24h/custom ranges and 10s/1m/20m/adaptive sample intervals. Filter case-insensitively by ID/name/location and exact region. Make select-all operations affect only filtered IDs while preserving physical order at the caller boundary.

- [ ] **Step 4: Implement injectable deterministic source**

Generate bounded values by type and device seed. Add `running` for pumps, set stopped frequency to zero, and generate `null` for offline devices. Return series in requested device order. Export `createRealtimeTrendSource()` as the future API replacement point.

- [ ] **Step 5: Run tests and commit**

```bash
git add src/data/realtime-trend-data.ts tests/realtime-trend-data.test.mjs
git commit -m "Add realtime trend data source"
```

### Task 3: Tested Polling and Selection Composable

**Files:**
- Create: `src/realtime-trend-controller.ts`
- Create: `src/composables/useRealtimeTrends.ts`
- Create: `tests/realtime-trend-controller.test.mjs`

- [ ] **Step 1: Write failing controller tests**

Use a fake scheduler and deferred source. Verify independent per-tab selections and ranges, empty-selection suppression, first load, concurrent refresh suppression, retained data on failure, pause, immediate resume, and disposal of the single interval.

- [ ] **Step 2: Run tests and confirm missing-module failure**

- [ ] **Step 3: Implement the framework-independent controller**

Expose `state`, `setTrendType`, `setSelectedIds`, `setRange`, `refresh`, `pause`, `resume`, and `dispose`. Store flow/level/pump/siphon preferences independently. Use one interval for the currently active time-trend tab.

- [ ] **Step 4: Wrap the controller in Vue reactivity**

`useRealtimeTrends({ source, intervalMs: 5000 })` maps controller state to refs/computed values and lifecycle hooks. Expose current devices, selected IDs, range, snapshot, loading, refreshing, error, paused, statistics, and actions.

- [ ] **Step 5: Run `npm test && npm run typecheck` and commit**

```bash
git add src/realtime-trend-controller.ts src/composables/useRealtimeTrends.ts tests/realtime-trend-controller.test.mjs
git commit -m "Add realtime trend state management"
```

### Task 4: Generic ECharts Option and Chart Component

**Files:**
- Create: `src/realtime-trend-option.ts`
- Create: `tests/realtime-trend-option.test.mjs`
- Create: `src/components/realtime/trend/TrendChart.vue`

- [ ] **Step 1: Write failing option tests**

Assert a time X axis, configured Y unit, physical-order series, confined Tooltip, scroll legend, inside/slider zoom, brush toolbox, null gaps, stable colors, formatted device values, and pump stopped mark areas.

- [ ] **Step 2: Run tests and confirm missing-module failure**

- [ ] **Step 3: Implement `buildRealtimeTrendOption`**

Accept config, snapshot, and compact mode. Build one line per device, shared axis Tooltip, DataZoom, Toolbox brush/zoom/restore, and pump stopped areas. Use current SCADA palette and safe grid margins.

- [ ] **Step 4: Implement `TrendChart.vue`**

Accept snapshot/config/loading/refreshing/error. Render loading, empty, retained-error, and refreshing states. Initialize only in a visible element, resize with `ResizeObserver`, dispose on unmount, and expose `resetZoom()`.

- [ ] **Step 5: Run tests, typecheck, build, and commit**

```bash
git add src/realtime-trend-option.ts tests/realtime-trend-option.test.mjs src/components/realtime/trend/TrendChart.vue
git commit -m "Add generic realtime trend chart"
```

### Task 5: Focused UI Controls

**Files:**
- Create: `src/components/realtime/trend/TrendTabs.vue`
- Create: `src/components/realtime/trend/DeviceSelector.vue`
- Create: `src/components/realtime/trend/TimeRangePicker.vue`

- [ ] **Step 1: Implement `TrendTabs.vue`**

Render the five fixed labels from typed config, bind `activeKey`, emit `update:activeKey`, and use buttons with `aria-selected` and tab roles.

- [ ] **Step 2: Implement `DeviceSelector.vue`**

Accept devices, selected IDs, search, region, and filter capability. Emit updates and select-all intent. Render search, optional region select, visible/selected counts, checkboxes, state dots, and removable selected tags in process order.

- [ ] **Step 3: Implement `TimeRangePicker.vue`**

Render segmented preset controls and two `datetime-local` inputs for custom range. Validate start before end and emit only valid ranges. Keep control dimensions stable.

- [ ] **Step 4: Run typecheck/build and commit**

```bash
git add src/components/realtime/trend/TrendTabs.vue src/components/realtime/trend/DeviceSelector.vue src/components/realtime/trend/TimeRangePicker.vue
git commit -m "Add realtime trend controls"
```

### Task 6: Trend Workbench and Page Integration

**Files:**
- Create: `src/components/realtime/trend/TrendAnalysis.vue`
- Modify: `src/views/RealtimeView.vue`
- Modify: `src/data/monitoring-data.js`
- Modify: `styles.css`

- [ ] **Step 1: Compose `TrendAnalysis.vue`**

Own the five-tab active key. For `node`, reuse `RealtimeWaterProfileChart` and `useRealtimeWaterProfile`. For time tabs, compose `DeviceSelector`, `TimeRangePicker`, statistics, common actions, and `TrendChart`. Wire pause/continue, immediate refresh, reset, filters, tags, and tab-specific retained state.

- [ ] **Step 2: Reduce `RealtimeView.vue`**

Replace the current inline chart panel, Canvas composable, profile polling, and trend constants with `<TrendAnalysis />`. Preserve every other page section and navigation emit.

- [ ] **Step 3: Remove obsolete realtime Canvas constants only**

Delete `REALTIME_CHART_ACTIONS` and `REALTIME_PROFILE_ACTIONS` when no consumer remains. Keep unrelated fixtures and `drawRealtimeChart` for any remaining consumers.

- [ ] **Step 4: Add scoped workbench styling**

Use a 24/76 selector/chart split, stable header and chart heights, compact tags, clear focus/disabled states, and the existing industrial palette. At viewport widths up to 1400px, reduce selector width and arrange controls in two rows without overflow.

- [ ] **Step 5: Run `npm run check` and commit**

```bash
git add src/components/realtime/trend/TrendAnalysis.vue src/views/RealtimeView.vue src/data/monitoring-data.js styles.css
git commit -m "Integrate realtime trend workbench"
```

### Task 7: Browser and Final Verification

**Files:**
- Create: `output/realtime-trends-desktop.png`
- Create: `output/realtime-trends-narrow.png`
- Modify only files implicated by verified failures

- [ ] **Step 1: Start Vite and verify node profile regression**

At 1920×1080 confirm node profile remains nonblank with two lines, seven gates, eight segments, pause/continue, refresh, reset, and no time slider.

- [ ] **Step 2: Verify all four time tabs**

Confirm correct axes/units, multiple colored series, search, all/none, region filtering, tag removal, presets, custom dates, statistics, pump status, siphon pressure-only behavior, legend, Tooltip, zoom, brush, reset, refresh, and pause.

- [ ] **Step 3: Exercise loading, empty, and retained-error states**

Use controlled browser state or source interception without leaving test hooks in production. Confirm empty selection suppresses queries and a failed refresh retains the previous chart.

- [ ] **Step 4: Verify pixels and responsive layout**

Check Canvas nonblank pixels and panel overflow at 1920×1080 and 1024×900. Save the two screenshots named above. Confirm console has zero errors and zero ECharts size warnings.

- [ ] **Step 5: Run fresh final verification**

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: all tests pass, typecheck and build exit 0, diff check emits no output. The known Vite bundle-size advisory may remain.

- [ ] **Step 6: Commit verified fixes and artifacts**

```bash
git add src tests package.json package-lock.json tsconfig.json output/realtime-trends-desktop.png output/realtime-trends-narrow.png
git commit -m "Verify realtime trend analysis"
```
