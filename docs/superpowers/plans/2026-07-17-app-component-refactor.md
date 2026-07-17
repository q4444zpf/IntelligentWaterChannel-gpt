# App Component Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `App.vue` to an application composition container while preserving every realtime, history, alarm, chart, export, modal, and responsive behavior.

**Architecture:** Move static fixtures and Canvas algorithms into dependency-free modules, then move stateful logic into composables and page-level views. Cross-page navigation and selected-alarm state remain in `App.vue`; views communicate only through props and emits, and existing CSS selectors remain stable to prevent visual regressions.

**Tech Stack:** Vue 3 Composition API, JavaScript ES modules, ECharts 5, Vite 5, Node.js test runner, Playwright CLI.

---

### Task 1: Static Data and Canvas Utilities

**Files:**
- Create: `src/data/monitoring-data.js`
- Create: `src/utils/canvas-charts.js`
- Create: `tests/monitoring-data.test.mjs`
- Create: `tests/canvas-charts.test.mjs`
- Modify: `src/App.vue`

- [ ] **Step 1: Write failing module tests**

Assert exported fixtures include seven gates, ordered alarm records, grouped sensors, replay rows, navigation metadata, and query definitions. Assert `canvas-charts.js` exports `drawRealtimeChart`, `drawAlarmChart`, and `drawProfileChart`.

```js
assert.equal(GATES.length, 7);
assert.equal(SENSOR_GROUPS[0].name, '水位计');
assert.equal(ALARMS[0].code, 'ALM-20260708-0001');
assert.equal(typeof drawRealtimeChart, 'function');
assert.equal(typeof drawAlarmChart, 'function');
assert.equal(typeof drawProfileChart, 'function');
```

- [ ] **Step 2: Run tests and confirm missing-module failures**

Run: `npm test`

Expected: FAIL because the two target modules do not exist.

- [ ] **Step 3: Extract static fixtures**

Move `pageTabs`, view actions, chart labels/actions, gates, sensors, alarms, alarm stats, replay rows, replay query, and alarm query into named immutable exports. Export already-shaped `SENSOR_GROUPS` so views do not repeat mapping logic.

- [ ] **Step 4: Extract Canvas algorithms**

Move the existing grid, series, threshold, legend, alarm marker, mapping, line-chart, and profile-chart functions without changing constants. Export high-level wrappers:

```js
export const drawRealtimeChart = (canvas) => drawLineChart(canvas);
export const drawAlarmChart = (canvas) => drawLineChart(canvas, { drop: true, labels: ['开度反馈(%)', '设定开度(%)'], alarm: true });
export const drawProfileChart = (canvas) => { /* existing profile implementation */ };
```

- [ ] **Step 5: Run tests and build**

Run: `npm test && npm run build`

Expected: all tests PASS and Vite builds.

- [ ] **Step 6: Commit utility extraction**

```bash
git add src/data/monitoring-data.js src/utils/canvas-charts.js tests/monitoring-data.test.mjs tests/canvas-charts.test.mjs src/App.vue
git commit -m "Extract monitoring data and chart utilities"
```

### Task 2: Shared UI and Canvas Composable

**Files:**
- Create: `src/components/common/StatusText.vue`
- Create: `src/components/common/QueryField.vue`
- Create: `src/composables/useCanvasChart.js`
- Create: `src/components/AppHeader.vue`
- Create: `src/layouts/AppShell.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Create common presentation components**

`StatusText.vue` accepts required `value`, maps online/normal to `ok`, offline to `off`, otherwise `bad`, and renders the existing `.dot` markup. `QueryField.vue` accepts a required field object and renders the existing `.query-field` and `.fake-input` markup with `v-html` for existing tag content.

- [ ] **Step 2: Create Canvas lifecycle composable**

Export `useCanvasChart(draw)` returning `canvasRef` and `redraw`. On mount, call draw after `nextTick`; register a resize listener; remove it before unmount.

```js
export function useCanvasChart(draw) {
  const canvasRef = ref(null);
  const redraw = () => draw(canvasRef.value);
  onMounted(() => nextTick(redraw));
  onBeforeUnmount(() => window.removeEventListener('resize', redraw));
  return { canvasRef, redraw };
}
```

- [ ] **Step 3: Extract header and shell**

`AppHeader.vue` accepts `activePage` and emits `navigate`. `AppShell.vue` accepts `activePage`, forwards header navigation, and renders a default slot inside `<main>`.

- [ ] **Step 4: Replace inline header/common definitions in App.vue**

Use imported components with the same CSS classes and emitted page keys. Keep page content temporarily in `App.vue` so this migration remains buildable.

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run build`

Expected: tests and build PASS.

```bash
git add src/components/common src/composables/useCanvasChart.js src/components/AppHeader.vue src/layouts/AppShell.vue src/App.vue
git commit -m "Extract shared application components"
```

### Task 3: History View and Query Composable

**Files:**
- Create: `src/composables/useHistoryQuery.js`
- Create: `src/views/HistoryView.vue`
- Move: `src/components/CombinedHistoryChart.vue` to `src/components/history/CombinedHistoryChart.vue`
- Move: `src/components/DeviceHistoryChart.vue` to `src/components/history/DeviceHistoryChart.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Extract history query composable**

Move default query creation, draft/applied state, loading/error, search, results, rows, selected/filtered devices, range label, export availability, device selection, validation, query, refresh, reset, and CSV download. Return each ref/computed and action under its current name so template behavior stays stable.

- [ ] **Step 2: Move chart components and repair relative imports**

Move both components to `components/history/`. Update `CombinedHistoryChart.vue` imports to `../../history-chart-options.js` and update consumers.

- [ ] **Step 3: Create HistoryView.vue**

Move both history top-level tabs, query controls, device picker, result tabs, chart views, replay controls, profile Canvas, and replay table. Keep result-tab reset local when the view mounts. Retain Escape/outside-click listeners and clean them on unmount.

- [ ] **Step 4: Replace history template/state in App.vue**

Render `<HistoryView v-if="activePage === 'history'" />`. Remove all history refs, computed state, query functions, picker event handlers, CSV code, and profile-chart lifecycle from `App.vue`.

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run build`

Expected: tests and build PASS.

```bash
git add src/composables/useHistoryQuery.js src/views/HistoryView.vue src/components/history src/App.vue
git commit -m "Extract historical data view"
```

### Task 4: Realtime, Alarm, and Modal Views

**Files:**
- Create: `src/views/RealtimeView.vue`
- Create: `src/views/AlarmView.vue`
- Create: `src/components/alarm/AlarmDetailModal.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Create RealtimeView.vue**

Move the complete realtime three-column template. Import fixtures and common status component, own the realtime Canvas through `useCanvasChart(drawRealtimeChart)`, emit `navigate` for “查看全部”, and preserve all existing class names.

- [ ] **Step 2: Create AlarmView.vue**

Move alarm query, statistics, and list. Import fixtures, `QueryField`, and `StatusText`. Emit `open-alarm` with the row object and `navigate` with `realtime` or `history`.

- [ ] **Step 3: Create AlarmDetailModal.vue**

Accept required `alarm`, initialize the existing remark text, draw the alarm chart with `useCanvasChart(drawAlarmChart)`, and emit `close`, `confirm`, `locate`, and `view-history`. Preserve Teleport, backdrop closing, dialog semantics, and classes.

- [ ] **Step 4: Reduce App.vue to composition state**

Keep only `activePage`, `selectedAlarm`, navigation, open/close alarm handlers, and component composition:

```vue
<AppShell :active-page="activePage" @navigate="showPage">
  <RealtimeView v-if="activePage === 'realtime'" @navigate="showPage" />
  <HistoryView v-else-if="activePage === 'history'" />
  <AlarmView v-else @navigate="showPage" @open-alarm="openAlarm" />
  <AlarmDetailModal v-if="selectedAlarm" :alarm="selectedAlarm" ... />
</AppShell>
```

- [ ] **Step 5: Verify file-size and build constraints**

Run: `npm test && npm run build`

Expected: tests/build PASS; `App.vue` under 100 lines; each new Vue file under 300 lines.

- [ ] **Step 6: Commit page extraction**

```bash
git add src/views src/components/alarm src/App.vue
git commit -m "Split application into page views"
```

### Task 5: Browser Regression and Final Cleanup

**Files:**
- Modify as needed: extracted source files
- Create: `output/app-refactor-realtime.png`
- Create: `output/app-refactor-history.png`
- Create: `output/app-refactor-alarm.png`

- [ ] **Step 1: Run development server and browser smoke test**

Run: `npm run dev`

Verify main navigation, realtime Canvas, history query/picker/results/replay, alarm list, modal actions, and cross-page navigation.

- [ ] **Step 2: Verify Canvas and ECharts rendering**

At 1920x1080, assert every visible canvas has nonzero dimensions and nonblank sampled pixels. Check console has zero errors and zero size warnings.

- [ ] **Step 3: Verify responsive behavior**

At 1024x900, verify history has no horizontal page overflow and result tabs/charts remain readable. Confirm realtime retains its existing minimum desktop layout behavior.

- [ ] **Step 4: Capture visual artifacts**

Save the three main page screenshots in `output/` using the filenames above and compare structure against existing reference screenshots.

- [ ] **Step 5: Remove obsolete code and verify imports**

Search for obsolete inline component definitions, duplicated fixture constants, unused drawing helpers, and imports from old chart component paths. Remove only confirmed dead code.

- [ ] **Step 6: Run final verification**

Run: `npm test && npm run build && git diff --check`

Expected: all tests PASS, build succeeds, and diff check returns no output.

- [ ] **Step 7: Commit verified refactor**

```bash
git add src output/app-refactor-realtime.png output/app-refactor-history.png output/app-refactor-alarm.png
git commit -m "Verify componentized application"
```
