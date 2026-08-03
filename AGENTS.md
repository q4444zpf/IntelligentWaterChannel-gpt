# 仓库指南

## 项目结构与模块组织

本仓库包含智能水槽 / 智能水道可视化所需的资源与脚本。源脚本放在 `scripts/`，生成或可查看的 3D 资源放在 `models/`，浏览器验证截图放在 `output/`。根目录下的 `智能水槽需求.md` 保存产品需求，`智能水槽系统设计图与说明/` 存放界面原型、示意图和设计说明。不要提交 `node_modules/` 等生成的依赖目录。

关键文件：

- `scripts/generate-flume-model.mjs`：Node/Three.js 模型生成流程。
- `scripts/create_smart_water_flume_blender.py`：基于 Blender 的模型生成脚本。
- `models/viewer.html`：用于本地检查 GLB 输出的查看器。
- `models/*.glb`：生成的 3D 模型资源。

## 构建、测试与开发命令

- `npm install`：根据 `package-lock.json` 安装 Three.js 依赖。
- `npm run generate:flume-model`：运行 Node 生成脚本并更新水槽模型输出。
- `blender --background --python scripts/create_smart_water_flume_blender.py`：在已安装 Blender 且其位于 `PATH` 时，以无界面模式运行 Blender 脚本。
- 在浏览器中打开 `models/viewer.html`：可视化检查生成的 GLB 文件。

除上述资源生成脚本外，当前项目没有正式的构建流水线。

## 编码风格与命名约定

JavaScript 文件使用 ES Modules（`.mjs`），脚本文件名使用小写加连字符，例如 `generate-flume-model.mjs`。JavaScript 使用 2 空格缩进，Python 使用 4 空格缩进。对象、材质和几何体命名应尽量清晰，因为导出后的 3D 场景若保留名称，会更便于检查和调试。生成资源按用途命名，例如 `smart-water-flume-blender.glb`。

## 测试指南

当前未配置自动化测试框架。修改后应运行相关生成命令，并打开 `models/viewer.html` 进行验证。涉及视觉变化时，将截图保存或对比到 `output/`，检查模型是否能正常加载、比例是否正确，并确认预期的水槽组件没有缺失。

## 提交与 Pull Request 指南

当前检出目录不包含 Git 历史，因此请使用清晰的祈使句提交信息，例如 `Add Blender flume support` 或 `Update GLB viewer controls`。Pull Request 应说明改动内容、列出已运行的命令、标明受影响的 `models/` 或 `output/` 资源；涉及视觉或模型变化时应附截图。更新 `智能水槽需求.md` 中描述的行为时，请关联对应需求或设计说明。

## 安全与配置建议

不要提交本机路径、Blender 安装路径、临时导出文件或大型实验文件，除非它们是项目必需资源。依赖变更应同时反映在 `package.json` 和 `package-lock.json` 中。

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **IntelligentWaterChannel-gpt** (1548 symbols, 3080 relationships, 129 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/IntelligentWaterChannel-gpt/context` | Codebase overview, check index freshness |
| `gitnexus://repo/IntelligentWaterChannel-gpt/clusters` | All functional areas |
| `gitnexus://repo/IntelligentWaterChannel-gpt/processes` | All execution flows |
| `gitnexus://repo/IntelligentWaterChannel-gpt/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
