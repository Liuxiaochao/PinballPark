# AGENTS.md · 弹珠乐园 AI 工作规范

> 任何 AI 接手本项目，先读完本文件（约 2 分钟），再开始任务。

- **项目**：微信小游戏「弹珠乐园」——弹珠机玩法 + 广告变现 + 积分卡兑实物，纯文档与数值先行。
- **当前阶段**：`文档期`（此字段仅可由人确认后修改；切换为「编码期」时按 `tests/README.md` 的切换规则启用代码 TDD）

## 30 秒索引表

| 我要做的事 | 先读 | 用哪个 SKILL |
|---|---|---|
| 了解项目全貌 | `docs/INDEX.md` → PRD | — |
| 新增/修改任何功能或玩法规则 | 对应 `docs/features/F-xxx` 卡 | feature-dev |
| 改任何数值（倍率/RTP/发卡/频控…） | 数值文档 + F-xxx 卡 + `tests/numeric/` | feature-dev + numeric-verify |
| 验证数值改动是否破坏经济 | `docs/sim/economy_sim.py` | numeric-verify |
| 发现文档之间说法矛盾 | `docs/INDEX.md` 权威层级 | doc-sync |
| 改 UI/视觉 | ui-ux 文档 + 机台视觉稿 | feature-dev |
| 查 API 契约 | api 文档 | — |

## 工作守则

1. **先索引后动手**：任何改动前查 `docs/INDEX.md` 找到权威文档；找不到对应文档的需求，先建功能卡再干活。
2. **数值必过测试**：涉及数值的改动，必须走「先改测试（红）→ 再改文档/仿真（绿）」，统一命令 `pytest tests/numeric -q`。
3. **矛盾即停**：发现文档间矛盾 → 停下 → 触发 doc-sync SKILL → 先修文档再继续原任务。
4. **HTML 是源头**：`docs/*.html` 的实质性变更（数值/规则/玩法/流程）需人确认；错别字与样式修正除外。
5. **收尾自检**：任务结束前检查——本次改动是否触碰 INDEX 所列文档？触碰了就核对同步（功能卡/测试/INDEX 三处）。
6. **留痕**：凡修改了规范类文件（本文件/INDEX/功能卡/测试基线），在下方变更日志追加一行。

## 文档分层与权威顺序

冲突时权威顺序：**HTML 源头规范 > 功能卡 > 测试**（例外：测试挂的是已人工确认的新数值时，以测试为准回改文档）。

- `docs/*.html`：设计源头，只读格式，实质变更需人确认
- `docs/features/F-xxx-*.md`：功能细节卡，AI 可自主维护；编号永不复用，下一可用编号见 `docs/INDEX.md` 顶部
- `tests/numeric/`：数值结论的可执行固化；测试 docstring 标注 `覆盖: F-xxx`
- `docs/INDEX.md`：地图；文档增删改名必须同步

## 变更日志

条目格式：`- YYYY-MM-DD | 触发原因 | 改动摘要 | 涉及文件`

- 2026-07-30 | 工作流落地 | 建立 AGENTS/INDEX/功能卡/数值测试/SKILL 三层体系 | AGENTS.md, docs/INDEX.md, docs/features/*, tests/*, .codebuddy/skills/*
- 2026-07-30 | 验收演练 | 全链路红绿演练(×32→×30变红→还原全绿)与矛盾发现演练(功能卡25 vs 规范/测试20, doc-sync 判定回修功能卡)通过, 工作流验收完成 | AGENTS.md
