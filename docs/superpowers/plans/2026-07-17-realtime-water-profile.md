# Realtime Water Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the realtime “节点水位曲线” Canvas with an interactive, refreshing along-channel water-level profile derived from current monitoring data while retaining legacy charts for other trend tabs.

**Architecture:** A dependency-free adapter converts gate and water-level fixtures into ordered profile snapshots. A composable owns asynchronous refresh state and polling, while a focused ECharts component owns rendering and exposes reset; `RealtimeView.vue` only coordinates tabs and toolbar actions.

**Tech Stack:** Vue 3 Composition API, ECharts 5 modular imports, Vite 5, Node.js test runner, Playwright CLI.

---

### Task 1: Tested Realtime Profile Data Adapter

**Files:**
- Create: `src/realtime-water-profile.js`
- Create: `tests/realtime-water-profile.test.mjs`

- [ ] **Step 1: Write failing adapter tests**

Test `buildWaterProfileSnapshot`, `createMockWaterProfileSource`, `PROFILE_GATES`, and `PROFILE_SEGMENTS`:

```js
const snapshot = buildWaterProfileSnapshot({ gates: GATES, sensorGroups: SENSOR_GROUPS, tick: 0, timestamp: 1000 });
assert.equal(snapshot.timestamp, 1000);
assert.equal(snapshot.nodes[0].label, '前池');
assert.equal(snapshot.nodes.at(-1).label, '集水池');
assert.ok(snapshot.nodes.every((node, index, nodes) => !index || node.distance >= nodes[index - 1].distance));
assert.equal(snapshot.nodes.find((node) => node.id === 'PT-03'), undefined);
assert.equal(PROFILE_GATES.length, 7);
assert.equal(PROFILE_SEGMENTS.length, 8);
```

Assert repeated ticks change measured values within a small bounded amplitude and the source returns a Promise-compatible snapshot.

- [ ] **Step 2: Run tests and confirm missing-module failure**

Run: `npm test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/realtime-water-profile.js`.

- [ ] **Step 3: Implement profile constants and adapter**

Define distances from `0` to `830`, G0–G6 mark positions, and eight segment ranges. Build nodes from water-level sensors plus gate before/after values, preserving physical order. Convert `--` and offline readings to `null`; generate deterministic measured drift and simulated offsets from `tick`.

- [ ] **Step 4: Implement injectable mock source**

`createMockWaterProfileSource()` returns an async function that increments a private tick and resolves the next snapshot from current fixtures. This is the explicit future API replacement point.

- [ ] **Step 5: Run tests and commit**

Run: `npm test`

Expected: all tests PASS.

```bash
git add src/realtime-water-profile.js tests/realtime-water-profile.test.mjs
git commit -m "Add realtime water profile data adapter"
```

### Task 2: Realtime Refresh Composable

**Files:**
- Create: `src/realtime-water-profile-poller.js`
- Create: `tests/realtime-water-profile-poller.test.mjs`
- Create: `src/composables/useRealtimeWaterProfile.js`

- [ ] **Step 1: Write and run failing poller tests**

Cover initial loading, retained snapshot on refresh failure, concurrent refresh suppression,
pause/resume, and single-interval cleanup. Run `npm test` and confirm the missing-module failure.

- [ ] **Step 2: Implement the tested poller and composable lifecycle**

Accept `{ source, intervalMs = 5000 }`. Expose `snapshot`, `loading`, `refreshing`, `error`, `paused`, `lastUpdated`, `isEmpty`, `refresh`, `pause`, and `resume`. First mount awaits refresh then starts an interval. Failed refresh retains the previous snapshot and stores a Chinese error message. Before unmount, clear the interval.

- [ ] **Step 3: Prevent concurrent refreshes**

Ignore refresh calls while a load is in flight. `pause` clears the interval; `resume` immediately refreshes and re-establishes one interval.

- [ ] **Step 4: Verify build and commit**

Run: `npm test && npm run build`

Expected: tests and build PASS.

```bash
git add src/composables/useRealtimeWaterProfile.js
git commit -m "Add realtime water profile polling"
```

### Task 3: ECharts Along-Channel Profile Component

**Files:**
- Create: `src/realtime-water-profile-option.js`
- Create: `tests/realtime-water-profile-option.test.mjs`
- Create: `src/components/realtime/RealtimeWaterProfileChart.vue`

- [ ] **Step 1: Write and run failing chart-option tests**

Assert business title/units, two series, seven gate markers, eight channel segments,
thresholds, Tooltip content, and zoom configuration. Run `npm test` and confirm the
missing-module failure.

- [ ] **Step 2: Build component states and public API**

Accept `snapshot`, `loading`, `refreshing`, and `error`. Render loading, empty, retained-error, and refreshing states. Expose `resetZoom()` with `defineExpose`.

- [ ] **Step 3: Build ECharts option**

Use two line series over value X/Y axes, `DataZoomComponent`, scroll legend, axis tooltip, thresholds, and G0–G6 mark lines. Use ECharts graphic elements or mark areas for channel segments. Format Tooltip with node label, distance, measured/simulated water level, state, and snapshot time.

- [ ] **Step 4: Match reference and current visual styles**

Measured line: cyan `#39f6ff`, width 3, glow shadow, circle symbols. Simulated line: blue `#4f93ff`, width 2, dashed. Use current dark panel background/grid colors, upper/lower threshold colors, stable chart height, and compact responsive labels.

- [ ] **Step 5: Implement lifecycle**

Initialize after mount, update on snapshot changes, resize through `ResizeObserver`, and dispose before unmount. Never initialize in a hidden container.

- [ ] **Step 6: Verify build and commit**

Run: `npm run build`

Expected: Vite build succeeds.

```bash
git add src/components/realtime/RealtimeWaterProfileChart.vue
git commit -m "Add realtime water profile chart"
```

### Task 4: Trend Module Integration

**Files:**
- Modify: `src/views/RealtimeView.vue`
- Modify: `src/data/monitoring-data.js`
- Modify: `styles.css`

- [ ] **Step 1: Add functional trend tabs**

Store `activeTrendTab`, defaulting to `节点水位曲线`. Clicking each existing tab changes the active state. Mount `RealtimeWaterProfileChart` only for the node-water tab; use the existing Canvas for all other tabs and redraw it after switching.

- [ ] **Step 2: Connect refresh composable**

Create the mock source once and pass it to `useRealtimeWaterProfile`. Bind snapshot and state props. Wire toolbar actions: status text `5秒刷新`, pause/resume, immediate refresh, and component `resetZoom`.

- [ ] **Step 3: Preserve legacy toolbars**

For non-node tabs, keep `REALTIME_CHART_ACTIONS` and the current Canvas. Do not change realtime page grids, 3D area, control panel, or alarm summary.

- [ ] **Step 4: Add scoped profile layout styling**

Give the profile chart the same margin and panel footprint as the old Canvas. Stabilize toolbar width, disabled/update states, and narrow-screen label behavior without changing unrelated selectors.

- [ ] **Step 5: Run automated verification and commit**

Run: `npm test && npm run build`

Expected: tests PASS and build succeeds.

```bash
git add src/views/RealtimeView.vue src/data/monitoring-data.js styles.css
git commit -m "Integrate node water profile trend"
```

### Task 5: Browser Interaction and Responsive Verification

**Files:**
- Create: `output/realtime-water-profile-desktop.png`
- Create: `output/realtime-water-profile-narrow.png`
- Modify as required by verified failures: realtime profile source, composable, chart, view, or styles

- [ ] **Step 1: Verify first render at 1920x1080**

Confirm node-water tab is active, chart canvas is nonblank, two series and seven gate labels are visible, axes/units are correct, and Tooltip is contained.

- [ ] **Step 2: Verify live controls**

Observe at least one 5-second update and confirm data/last-updated changes. Verify pause prevents updates, resume restarts them, immediate refresh changes data, and reset restores full X range.

- [ ] **Step 3: Verify states and legacy tabs**

Exercise loading and retained error state through browser inspection or controlled source behavior. Switch to another trend tab and confirm legacy Canvas is nonblank with original toolbar, then switch back without ECharts size warnings.

- [ ] **Step 4: Verify responsive layout and capture screenshots**

At 1024x900 verify chart labels, gate markers, legend, toolbar, and Tooltip do not overlap incoherently. Capture desktop and narrow screenshots.

- [ ] **Step 5: Run final verification**

Run: `npm test && npm run build && git diff --check`

Expected: tests PASS, build succeeds, diff check is empty, and browser console has zero errors/warnings.

- [ ] **Step 6: Commit verified artifacts and fixes**

```bash
git add src output/realtime-water-profile-desktop.png output/realtime-water-profile-narrow.png
git commit -m "Verify realtime water profile"
```
