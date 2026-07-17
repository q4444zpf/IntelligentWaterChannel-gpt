# History Device Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a historical-data query that directly multi-selects devices and renders one independently interactive time-series chart per device in physical process order, three charts per desktop row.

**Architecture:** Extract device metadata, deterministic sample-series generation, filtering, validation, sorting, table projection, and CSV serialization into `src/history-data.js`. Add a focused Vue/ECharts chart component for one device, while `App.vue` owns query state, the device picker, result synchronization, and actions. Keep existing realtime Canvas charts unchanged.

**Tech Stack:** Vue 3, Vite 5, Apache ECharts 5, Node.js built-in test runner, Playwright browser verification.

---

## File Map

- Create `src/history-data.js`: device catalog, process ordering, series generation, query validation, result filtering, table rows, and CSV serialization.
- Create `src/components/DeviceHistoryChart.vue`: one ECharts instance per device with tooltip, zoom, pan, restore, resize, and lifecycle cleanup.
- Create `tests/history-data.test.mjs`: deterministic unit coverage for ordering, validation, filtering, table ordering, and CSV escaping.
- Modify `src/App.vue`: replace static history filters and single Canvas with interactive query state, direct device multi-select, chart grid, empty/error/loading states, and CSV action.
- Modify `styles.css`: device picker, selected tags, three-column chart grid, chart card metadata, responsive breakpoints, and disabled/error states.
- Modify `package.json` and `package-lock.json`: add `echarts` and a Node test script.
- Create `output/history-device-charts-desktop.png` and `output/history-device-charts-narrow.png`: visual verification artifacts.

### Task 1: Historical Data Domain Module

**Files:**
- Create: `tests/history-data.test.mjs`
- Create: `src/history-data.js`
- Modify: `package.json`

- [ ] **Step 1: Add the Node test command and write failing domain tests**

Add `"test": "node --test tests/*.test.mjs"` to `package.json`. Create tests that import `DEVICES`, `sortDeviceIds`, `validateHistoryQuery`, `buildHistoryResults`, `buildHistoryRows`, and `toHistoryCsv`, then assert:

```js
assert.deepEqual(sortDeviceIds(['G2', 'WL-01', 'PT-01']), ['WL-01', 'PT-01', 'G2']);
assert.equal(validateHistoryQuery({ start: '2026-07-08T10:00', end: '2026-07-08T09:00', deviceIds: ['WL-01'] }), '开始时间不能晚于结束时间');
assert.equal(validateHistoryQuery({ start: '2026-07-08T09:00', end: '2026-07-08T10:00', deviceIds: [] }), '请至少选择一台设备');
assert.deepEqual(buildHistoryResults({ start: '2026-07-08T09:00', end: '2026-07-08T10:00', deviceIds: ['G2', 'WL-01'], intervalSeconds: 300 }).map(result => result.device.id), ['WL-01', 'G2']);
assert.ok(buildHistoryRows(results)[0].timestamp >= buildHistoryRows(results).at(-1).timestamp);
assert.match(toHistoryCsv([{ timestamp: '2026-07-08 09:00:00', type: '水位计', name: 'WL-01', location: '渠①,前段', metric: '水位', value: '0.400', unit: 'm', state: '正常' }]), /"渠①,前段"/);
```

- [ ] **Step 2: Run the tests and verify the module is missing**

Run: `npm test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/history-data.js`.

- [ ] **Step 3: Implement the domain module**

Define a frozen `DEVICES` catalog containing the existing water-level, flow, pressure, gate, and pump devices. Each item includes `id`, `type`, `location`, `order`, `metric`, `unit`, `state`, `base`, `amplitude`, and `precision`. Export:

```js
export const DEFAULT_DEVICE_IDS = ['WL-01', 'WL-02', 'WL-03', 'G2', 'P1'];
export function sortDeviceIds(ids) { /* catalog order, then natural id order */ }
export function validateHistoryQuery(query) { /* empty devices and invalid range */ }
export function buildHistoryResults(query) { /* deterministic points within range */ }
export function buildHistoryRows(results) { /* descending time, then process order */ }
export function toHistoryCsv(rows) { /* UTF-8 BOM, header, RFC-style escaping */ }
```

Use a fixed sine/cosine signal derived from the point index and device order so refreshes are stable and tests remain deterministic. Cap generated points per device at 240 while preserving the selected range.

- [ ] **Step 4: Run domain tests**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit the domain module**

```bash
git add package.json src/history-data.js tests/history-data.test.mjs
git commit -m "Add historical device data model"
```

### Task 2: Reusable Single-Device ECharts Component

**Files:**
- Create: `src/components/DeviceHistoryChart.vue`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install ECharts**

Run: `npm install echarts@^5.6.0`

Expected: `echarts` appears in dependencies and the lockfile changes without unrelated dependency removal.

- [ ] **Step 2: Create the chart component**

Implement props `result` and `rangeLabel`. Render a header with device id/type/location, metric/unit, state, point count, latest value, and a restore icon button. Initialize ECharts on mount and set an option containing:

```js
{
  tooltip: { trigger: 'axis' },
  grid: { left: 54, right: 18, top: 24, bottom: 58 },
  xAxis: { type: 'time', name: '时间' },
  yAxis: { type: 'value', name: `${device.metric} (${device.unit})`, scale: true },
  dataZoom: [
    { type: 'inside', filterMode: 'none' },
    { type: 'slider', height: 18, bottom: 8 }
  ],
  series: [{ type: 'line', showSymbol: false, smooth: 0.18, data: points.map(point => [point.timestamp, point.value]) }]
}
```

Watch `result` deeply and update the option. Use `ResizeObserver` for resize, `dispatchAction({ type: 'dataZoom', start: 0, end: 100 })` for reset, and dispose the chart and observer before unmount.

- [ ] **Step 3: Verify production compilation**

Run: `npm run build`

Expected: Vite build succeeds and reports generated assets.

- [ ] **Step 4: Commit the chart component and dependency**

```bash
git add package.json package-lock.json src/components/DeviceHistoryChart.vue
git commit -m "Add single-device history chart"
```

### Task 3: Historical Query and Result UI

**Files:**
- Modify: `src/App.vue`
- Modify: `styles.css`

- [ ] **Step 1: Replace static history query state**

Import `DeviceHistoryChart` and the domain exports. Add refs for draft and applied query values, picker visibility/search, validation message, loading state, results, and rows. Computed values must provide filtered device options, selected device records sorted by process order, range label, and export availability.

- [ ] **Step 2: Build the direct multi-select control**

Replace the `historyQuery` loop with semantic start/end `datetime-local` inputs, a custom searchable device checklist, selected removable tags, `全选`, `清空`, data interval select, and data status select. Add click handlers that never infer a device type filter.

- [ ] **Step 3: Wire query actions and validation**

Implement `runHistoryQuery`, `resetHistoryQuery`, and `refreshHistoryQuery`. Validate before replacing results, show `正在查询...` during the short simulated request, preserve filters on refresh, and restore defaults on reset. Disable query for empty selection and prevent invalid time ranges from changing displayed results.

- [ ] **Step 4: Replace the single chart with the ordered grid**

Remove the history chart tabs and `historyChart` Canvas ref. Render:

```vue
<div v-if="historyResults.length" class="history-chart-grid">
  <DeviceHistoryChart
    v-for="result in historyResults"
    :key="result.device.id"
    :result="result"
    :range-label="historyRangeLabel"
  />
</div>
<div v-else class="history-empty">当前条件下没有历史数据</div>
```

Keep realtime and alarm Canvas drawing functions intact, and remove only the obsolete history Canvas draw call.

- [ ] **Step 5: Make the history table derive from applied results**

Render `historyRows` with stable composite keys, show the current result count, and render an empty table state when no rows exist. The displayed rows must be sorted by timestamp descending and then physical process order.

- [ ] **Step 6: Add scoped responsive styling**

Use `grid-template-columns: repeat(3, minmax(0, 1fr))` for wide desktop, two columns below `1500px`, and one column below `980px`. Add stable chart height, picker dropdown layering, tag wrapping, field focus, disabled actions, errors, metadata, and empty states. Do not alter the realtime three-column operational layout.

- [ ] **Step 7: Run unit and build verification**

Run: `npm test`

Expected: all domain tests PASS.

Run: `npm run build`

Expected: Vite build succeeds without Vue template or import errors.

- [ ] **Step 8: Commit the query UI**

```bash
git add src/App.vue styles.css
git commit -m "Build multi-device history query"
```

### Task 4: CSV Export and Interaction Completion

**Files:**
- Modify: `src/App.vue`
- Modify: `tests/history-data.test.mjs`

- [ ] **Step 1: Expand CSV unit coverage**

Assert the export begins with a BOM, contains the eight Chinese headers, escapes embedded quotes by doubling them, and emits the same number of data lines as input rows.

- [ ] **Step 2: Run the focused test and observe failure if serialization is incomplete**

Run: `node --test tests/history-data.test.mjs`

Expected: any missing BOM/header/escape assertion FAILS before adjustment.

- [ ] **Step 3: Wire browser download**

Implement `exportHistoryCsv` using `toHistoryCsv(historyRows.value)`, `Blob`, `URL.createObjectURL`, a temporary anchor with a time-range filename, and `URL.revokeObjectURL`. Disable export when no current rows exist.

- [ ] **Step 4: Complete keyboard and outside-click behavior**

Add Escape-to-close for the picker, close it on outside pointer events, use checkbox labels with visible focus, and add `aria-expanded`, `aria-controls`, and status messaging. Remove global listeners in `onBeforeUnmount`.

- [ ] **Step 5: Re-run automated verification**

Run: `npm test && npm run build`

Expected: tests PASS and production build succeeds.

- [ ] **Step 6: Commit export and accessibility behavior**

```bash
git add src/App.vue tests/history-data.test.mjs
git commit -m "Complete history export interactions"
```

### Task 5: Browser and Visual Verification

**Files:**
- Create: `output/history-device-charts-desktop.png`
- Create: `output/history-device-charts-narrow.png`
- Modify as needed: `src/App.vue`, `src/components/DeviceHistoryChart.vue`, `styles.css`

- [ ] **Step 1: Start the development server**

Run: `npm run dev -- --host 127.0.0.1 --port 4173`

Expected: Vite reports `http://127.0.0.1:4173/`.

- [ ] **Step 2: Verify the full desktop workflow at 1920x1080**

Open the history page, confirm no device-type field exists, search for and select mixed device types, query, and verify each selected device has its own chart. Confirm three charts in the first row, physical ordering, correct Y-axis metric/unit, tooltip, independent zoom, reset, table synchronization, refresh, reset, and CSV download.

- [ ] **Step 3: Capture desktop and narrow screenshots**

Save 1920x1080 to `output/history-device-charts-desktop.png` and 1024x900 to `output/history-device-charts-narrow.png`. Confirm charts reduce to two columns at 1024px with no overlap or clipped controls.

- [ ] **Step 4: Inspect runtime quality**

Verify browser console has no errors, every chart canvas has nonzero dimensions and nonblank pixels, the picker is not clipped behind panels, and no labels overflow their controls.

- [ ] **Step 5: Run final verification**

Run: `npm test && npm run build`

Expected: all tests PASS and Vite build succeeds.

- [ ] **Step 6: Commit visual artifacts and any verified fixes**

```bash
git add output/history-device-charts-desktop.png output/history-device-charts-narrow.png src/App.vue src/components/DeviceHistoryChart.vue styles.css
git commit -m "Verify historical device charts"
```
