---
name: feature-dev
description: 新增或修改弹珠乐园的任何功能、玩法规则或数值时使用。触发词：新增功能、修改玩法、调整数值、改规则、加特性。
---

# 功能开发 SOP（文档期）

## 步骤

1. **查索引**：读 `docs/INDEX.md`，定位权威 HTML 文档章节。
2. **定位功能卡**：在 `docs/features/` 找对应 F-xxx 卡；没有则复制 `_TEMPLATE.md` 新建，编号取 INDEX 顶部「下一可用功能编号」并顺延更新该行。
3. **TDD 红**：涉及数值/规则的，先修改或新增 `tests/numeric/` 断言反映目标状态，运行 `pytest tests/numeric -q` 确认相关用例变红。
4. **改文档（绿）**：
   - 功能卡：直接更新（AI 可自主维护）。
   - HTML 源头：实质性变更（数值/规则/玩法/流程）先向用户确认，确认后修改。
   - 更新 `docs/numeric/sim/economy_sim.py` 中对应参数（如涉及）。
   - 重跑 `pytest tests/numeric -q` 确认全绿。
5. **数值验收**：涉及数值的，接着执行 numeric-verify SKILL。
6. **回写**：更新功能卡「状态/数值参数/决策记录」，同步 INDEX「最近更新」列。
7. **留痕**：在 `AGENTS.md` 变更日志追加一行（格式见该文件）。

## 自发调整闭环

此规则的权威版本在 `docs/RULES.md § 自发调整闭环`，此处不再重复抄写。执行时请直接参照。
