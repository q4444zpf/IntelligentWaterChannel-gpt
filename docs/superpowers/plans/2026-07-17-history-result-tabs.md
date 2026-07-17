# History Result Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vertically stacked history charts and table with a three-tab result panel that defaults to an all-device multi-axis chart while preserving per-device charts and the data table.

**Architecture:** Add a pure option-model builder that groups selected results by unit and assigns deterministic Y-axis positions, offsets, and series indices. A new combined ECharts component consumes that model; `App.vue` owns only the active result tab and conditionally mounts the selected view so hidden charts never initialize at zero size.

**Tech Stack:** Vue 3, Apache ECharts 5, Node.js built-in test runner, Vite, Playwright CLI.

---

## File Map

- Create `src/history-chart-options.js`: colors, unit grouping, Y-axis layout, grid margins, legend names, and series-to-axis mapping.
- Create `tests/history-chart-options.test.mjs`: deterministic tests for shared units, independent axes, left/right offsets, percentage bounds, and series mapping.
- Create `src/components/CombinedHistoryChart.vue`: full-width combined ECharts instance with scroll legend, multi-axis tooltip, data zoom, restore, resize, and cleanup.
- Modify `src/App.vue`: three-tab result state, default/reset-on-page-entry behavior, one shared result panel, and conditional mounting for each view.
- Modify `styles.css`: result tabs, active/focus states, shared panel spacing, combined chart height, responsive layout, and table-only overflow.
- Create `output/history-result-tabs-desktop.png` and `output/history-result-tabs-table.png`: visual evidence for combined and table tabs.

### Task 1: Testable Multi-Axis Model

**Files:**
- Create: `tests/history-chart-options.test.mjs`
- Create: `src/history-chart-options.js`

- [ ] **Step 1: Write failing option-model tests**

Create representative results for two water-level devices (`m`), one gate (`%`), and one pressure sensor (`MPa`). Import `buildCombinedChartModel` and assert:

```js
const model = buildCombinedChartModel(results);
assert.equal(model.yAxes.length, 3);
assert.deepEqual(model.series.map((series) => series.yAxisIndex), [0, 0, 1, 2]);
assert.deepEqual(model.yAxes.map((axis) => axis.position), ['left', 'right', 'left']);
assert.deepEqual(model.yAxes.map((axis) => axis.offset), [0, 0, 64]);
assert.deepEqual({ min: model.yAxes[1].min, max: model.yAxes[1].max }, { min: 0, max: 100 });
assert.deepEqual(model.legendNames, ['WL-01 水位', 'WL-02 水位', 'G2 开度', 'PT-01 压力']);
assert.ok(model.grid.left >= 126);
```

- [ ] **Step 2: Run tests and confirm the module is missing**

Run: `npm test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/history-chart-options.js`.

- [ ] **Step 3: Implement the pure chart model**

Export `buildCombinedChartModel(results)`. Preserve result order, group axes by unit, assign alternating positions, increment offsets by `64`, bind every series to its unit axis, and calculate grid margins from the maximum offset on each side. Return `yAxes`, `series`, `legendNames`, and `grid`. Use a stable device-type palette and include each point as `[timestamp, value]`.

- [ ] **Step 4: Run tests and confirm green**

Run: `npm test`

Expected: all existing and new tests PASS.

- [ ] **Step 5: Commit the model**

```bash
git add src/history-chart-options.js tests/history-chart-options.test.mjs
git commit -m "Add combined history chart model"
```

### Task 2: Combined Chart and Three-Tab Result Panel

**Files:**
- Create: `src/components/CombinedHistoryChart.vue`
- Modify: `src/App.vue`
- Modify: `styles.css`

- [ ] **Step 1: Create the combined chart component**

Accept `results` and `rangeLabel` props. Build its option with `buildCombinedChartModel(results)` and configure:

```js
{
  legend: { type: 'scroll', top: 8, data: model.legendNames },
  tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
  grid: { ...model.grid, top: 72, bottom: 66 },
  xAxis: { type: 'time', name: '时间', splitNumber: 8 },
  yAxis: model.yAxes,
  dataZoom: [{ type: 'inside', filterMode: 'none' }, { type: 'slider', bottom: 10 }],
  series: model.series
}
```

Format tooltip rows with each series device id, metric, real value, and unit. Add a header showing the range, device count, unit count, and a `重置视图` button. Initialize on mount, update on prop changes, resize with `ResizeObserver`, and dispose before unmount.

- [ ] **Step 2: Add result-tab state and page-entry reset**

Add `historyResultTab = ref('combined')`. Update `showPage(page)` so entering `history` from another page sets it to `combined`; switching history subtabs or querying does not change it.

- [ ] **Step 3: Merge the result views into one panel**

Replace the existing chart panel and table panel with one `.history-results-panel`. Render three buttons with `role="tab"`, active state, counts, `aria-selected`, and `aria-controls`:

```vue
<button @click="historyResultTab = 'combined'">综合曲线 <span>{{ historyResults.length }}</span></button>
<button @click="historyResultTab = 'devices'">分设备曲线 <span>{{ historyResults.length }}</span></button>
<button @click="historyResultTab = 'table'">数据表格 <span>{{ historyRows.length }}</span></button>
```

Use `v-if` for `CombinedHistoryChart`, `v-else-if` for the existing `DeviceHistoryChart` grid, and `v-else` for the existing table so only the visible chart mode mounts.

- [ ] **Step 4: Add shared panel and tab styles**

Style the tab list as a restrained segmented strip within the result panel header. Give the combined chart a stable `430px` desktop height and `500px` below `1100px`. Keep the per-device three/two/one-column breakpoints and wrap only the table view in horizontal overflow.

- [ ] **Step 5: Run automated verification**

Run: `npm test && npm run build`

Expected: all tests PASS and Vite production build succeeds.

- [ ] **Step 6: Commit the component and tabs**

```bash
git add src/components/CombinedHistoryChart.vue src/App.vue styles.css
git commit -m "Add history result view tabs"
```

### Task 3: Browser Regression and Visual Verification

**Files:**
- Create: `output/history-result-tabs-desktop.png`
- Create: `output/history-result-tabs-table.png`
- Modify as required by discovered failures: `src/components/CombinedHistoryChart.vue`, `src/App.vue`, `styles.css`

- [ ] **Step 1: Start or reuse the Vite server**

Run: `npm run dev`

Expected: Vite serves `http://127.0.0.1:4173/`.

- [ ] **Step 2: Verify default combined mode at 1920x1080**

Open history data and confirm `综合曲线` is selected, one nonblank chart exists, five default device series exist, and the axes are `m`, `Hz`, and `%` with no overlap. Toggle a legend series, use data zoom, and restore the view.

- [ ] **Step 3: Verify view switching and state retention**

Switch to `分设备曲线` and confirm five independent chart cards mount in physical order. Switch to `数据表格` and confirm 65 rows are represented with 50 visible. Change device selection, query, and confirm all three Tab counts update without changing the active Tab.

- [ ] **Step 4: Verify page-entry reset and lifecycle**

While on the table Tab, navigate to realtime and back to history. Confirm `综合曲线` becomes active and browser console reports zero errors and zero ECharts size warnings.

- [ ] **Step 5: Capture visual artifacts and inspect responsive layout**

Capture the combined view to `output/history-result-tabs-desktop.png` and the table view to `output/history-result-tabs-table.png`. At 1024x900 confirm no horizontal page overflow, result tabs fit, and the combined chart remains readable.

- [ ] **Step 6: Run final verification and commit**

Run: `npm test && npm run build && git diff --check`

Expected: all tests PASS, build succeeds, and diff check is empty.

```bash
git add output/history-result-tabs-desktop.png output/history-result-tabs-table.png src/components/CombinedHistoryChart.vue src/App.vue styles.css
git commit -m "Verify history result tabs"
```
