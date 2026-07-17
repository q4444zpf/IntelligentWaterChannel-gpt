# App.vue 组件化重构设计

## 目标

将当前约 790 行的 `App.vue` 按页面、业务状态、公共 UI、静态数据和绘图工具拆分。重构后 `App.vue` 仅负责应用组合与少量跨页面状态，所有现有页面效果、查询、图表、报警弹窗、CSV 导出和响应式行为保持不变。

## 约束

- 不改变现有数据结构、模拟数据含义、页面文案和交互流程。
- 不引入 Pinia、Vue Router或新的状态管理依赖。
- 项目当前使用 JavaScript，不在本次结构重构中迁移 TypeScript。
- 单个新建 Vue 文件控制在 300 行以内；纯绘图工具可按职责拆分并保持易读。
- 组件通过 props 和 emits 通信，不通过 DOM 查询或隐式全局变量耦合。
- 现有 `CombinedHistoryChart` 和 `DeviceHistoryChart` 保持独立图表组件，仅移动到更明确的目录。

## 目标目录

```text
src/
├── App.vue
├── layouts/
│   └── AppShell.vue
├── views/
│   ├── RealtimeView.vue
│   ├── HistoryView.vue
│   └── AlarmView.vue
├── components/
│   ├── AppHeader.vue
│   ├── common/
│   │   ├── QueryField.vue
│   │   └── StatusText.vue
│   ├── alarm/
│   │   └── AlarmDetailModal.vue
│   └── history/
│       ├── CombinedHistoryChart.vue
│       └── DeviceHistoryChart.vue
├── composables/
│   ├── useHistoryQuery.js
│   └── useCanvasChart.js
├── data/
│   └── monitoring-data.js
└── utils/
    └── canvas-charts.js
```

## 组件职责

### App.vue

- 保存当前主页面 `activePage`。
- 保存当前选中的报警 `selectedAlarm` 和弹窗开关。
- 组合 `AppShell`、三个页面 View 和 `AlarmDetailModal`。
- 接收子页面的导航、查看曲线和打开报警事件。
- 不保留查询状态、模拟数据、Canvas 绘图实现或大段页面模板。

### AppShell.vue

- 提供应用最外层容器、`AppHeader` 和主内容插槽。
- 接收当前页面并向上转发导航事件。
- 不保存业务数据。

### AppHeader.vue

- 展示标题、三个主导航按钮、系统元信息、连接状态和时间。
- 通过 `activePage` prop 渲染选中态。
- 通过 `navigate` emit 请求页面切换。

### RealtimeView.vue

- 包含实时监控页三列布局：闸门、传感器、三维工艺图、实时趋势、控制与报警摘要。
- 从 `monitoring-data.js` 读取闸门、传感器和报警数据。
- 使用 `useCanvasChart` 管理实时趋势 Canvas。
- 通过 `navigate` emit 打开报警页，通过 `open-alarm` emit 打开报警详情。

### HistoryView.vue

- 管理历史页面内部的“查询分析 / 时序回放”一级 Tab。
- 管理“综合曲线 / 分设备曲线 / 数据表格”结果 Tab。
- 使用 `useHistoryQuery` 提供全部历史查询状态和操作。
- 使用历史图表组件渲染查询结果。
- 使用 `useCanvasChart` 管理节点水位空间剖面 Canvas。
- 保留设备选择器的 Escape 和外部点击关闭行为。

### AlarmView.vue

- 展示报警查询区、统计卡片和报警列表。
- 从 `monitoring-data.js` 读取报警数据和查询配置。
- 通过 `open-alarm`、`navigate` emits 请求弹窗、实时定位和历史曲线。

### AlarmDetailModal.vue

- 接收 `alarm` prop；无报警时不渲染。
- 内部保存处理说明输入值。
- 使用 `useCanvasChart` 管理关联曲线。
- 通过 `close`、`confirm`、`locate` 和 `view-history` emits 与 `App.vue` 通信。

### 公共组件

- `StatusText.vue`：状态圆点与文字，使用共享状态映射。
- `QueryField.vue`：只读查询字段展示，保留现有 HTML 标签内容能力。

## 状态与逻辑归属

### useHistoryQuery.js

负责以下状态和方法：

- 草稿查询条件和已应用查询条件。
- 设备搜索、已选设备、过滤设备列表。
- 查询结果、表格行、记录数和时间范围标签。
- 查询校验、查询、刷新、重置、全选、清空、设备切换和 CSV 导出。
- 不负责设备选择器 DOM 开关，避免 composable 依赖具体页面结构。

### useCanvasChart.js

- 接收绘制函数和 Canvas ref。
- 在组件挂载及尺寸变化时调用绘制函数。
- 在组件卸载时移除监听。
- 对弹窗或条件渲染组件使用挂载后绘制，避免隐藏 Canvas 尺寸为零。

### monitoring-data.js

保存页面静态配置与示例数据：主导航、视图操作、实时曲线标签、闸门、传感器、报警、报警统计、报警查询、历史回放查询和回放表格数据。

### canvas-charts.js

保存不依赖 Vue 的 Canvas 绘图函数，包括实时折线、报警关联曲线、空间剖面、网格、图例、阈值和报警点。对外只暴露页面需要的高层绘制函数。

## 通信关系

- `AppHeader -> AppShell -> App.vue`：`navigate(page)`。
- `RealtimeView -> App.vue`：`navigate(page)`、`open-alarm(alarm)`。
- `AlarmView -> App.vue`：`navigate(page)`、`open-alarm(alarm)`。
- `AlarmDetailModal -> App.vue`：关闭、确认、定位实时页面、查看历史页面。
- `HistoryView` 的查询状态完全局部，不向 `App.vue` 暴露内部实现。

## 样式策略

现有全局 `styles.css` 在本次重构中保持为统一样式入口，避免迁移模板的同时改变 CSS 优先级。仅为移动后的组件补充必要的类名兼容，不进行视觉改版或无关样式整理。

## 测试与验收

1. `App.vue` 控制在约 100 行以内，不包含业务数据和 Canvas 算法。
2. 所有新建 Vue 页面和业务组件不超过 300 行。
3. `npm test` 全部通过，历史数据与多轴模型测试不回退。
4. `npm run build` 成功，无导入、模板或组件解析错误。
5. 实时、历史、报警三个主页面可正常切换。
6. 历史查询、设备搜索多选、三种结果 Tab、刷新、重置和 CSV 导出保持正常。
7. 报警详情可打开、关闭、确认、定位实时页和打开历史页。
8. 实时趋势、空间剖面、报警关联曲线及 ECharts 均为非空画布。
9. 1920x1080 与 1024x900 页面视觉与重构前一致，无新增重叠或横向溢出。
10. 浏览器控制台无错误和隐藏画布尺寸警告。
