# 弹珠乐园 · 文档分类管理规则

> 任何新增/移动/删除文档前先读本文。规则在 `AGENTS.md` § 文档分类管理规则 有精简版，这里放完整执行规范。

## 目录结构（权威版）

```
docs/
├── INDEX.md              # 文档映射表（必须同步）
├── RULES.md              # ⬅ 本文：分类管理规则
├── design/               # 游戏设计：PRD、GDD、玩法概览
├── numeric/              # 数值与经济：数值文档、仿真引擎 (sim/)
├── tech/                 # 技术架构：架构图、API 契约
├── ui/                   # UI/UX：设计规范、机台视觉稿
├── ops/                  # 运营：上线方案、运营计划、活动模板
├── qa/                   # 测试验收：测试策略、验收标准
├── reviews/              # 评审审计：阶段性评审、专项审查
├── features/             # 功能卡片：F-xxx 系列（已有）
└── superpowers/          # 历史工作流文档（保留不动）
```

## 自发调整闭环（权威版本）

执行任何文档操作时，若发现文档与现实不符：
→ 停下 → 按「HTML > 功能卡 > 测试」判断权威层
  （例外：测试挂的是已人工确认的新数值时以测试为准）
→ 修正非权威层 → 在 AGENTS.md 变更日志登记 → 继续原任务。

此规则在 `.codebuddy/skills/*/SKILL.md` 中不再重复抄写，统一引用此处。

## 新增文件操作流程

```
1. 判断内容属于哪个功能分类
   ├─ 明确对应一个分类 → 放入该目录
   ├─ 跨分类 → 放主分类，INDEX.md 注明关联分类
   └─ 不确定 → 放 design/（默认），在 INDEX.md 标注"待定分类"

2. 命名
   ├─ 全小写英文短横线
   ├─ 不加项目名前缀（"pinball-park" 冗余）
   ├─ 需要编号的用前缀：review-xxx、F-xxx、tpl-xxx（模板）
   └─ 示例：retention-model.md、tpl-weekend-event.md

3. 登记
   ├─ 在 docs/RULES.md 末尾表格追加一行（见下方§登记表）
   └─ 在 docs/INDEX.md 映射表追加一行

4. 引用
   ├─ 功能卡"上游规范"写文档名即可（如 PRD-pinball-park.html §x.x）
   ├─ 代码注释引用 docs/ 时用项目根相对路径
   └─ 文档内跨文件链接用相对于目标文件的路径
```

## 文件变更操作流程

```
移动文件：
  1. git mv 到新目录
  2. 更新 docs/INDEX.md 路径
  3. 检查所有引用旧路径的文件并更新
  4. 在变更日志登记

删除文件（废弃）：
  1. INDEX.md 标注 deprecated（不删文件，保留可追溯）
  2. 确定要物理删除的，先确认无引用
  3. git rm + 更新 INDEX.md

重命名文件：
  1. git mv
  2. 更新所有引用 + INDEX.md
  3. 变更日志登记
```


- [ ] `docs/INDEX.md` 已同步
- [ ] `docs/RULES.md` 登记表（新增时）已更新
- [ ] 如需新增分类，检查 AGENTS.md 快速索引是否需加行
- [ ] 旧路径引用（`grep -rn '旧文件名' . --include='*.md' --include='*.html' --include='*.py'`）已全部更新
- [ ] `pytest tests/numeric -q` 全绿（如涉及数值文档）

### 搜索命令参考

| 场景 | 命令 |
|---|---|
| 找旧路径引用 | `grep -rn '旧文件名' . --include='*.md' --include='*.html' --include='*.py'` |
| 排除 superpowers | 追加 `--exclude-dir=superpowers` |
| 只看结果路径 | 追加 `| grep -v 'Binary\|__pycache__'` |

## 文档登记表

| 日期 | 文件名 | 分类 | 用途 | 操作人 |
|---|---|---|---|---|
| 2026-07-30 | PRD-pinball-park.html | design/ | 产品需求文档（迁移自根目录） | 人工撰写 |
| 2026-07-30 | pinball-park-outline.html | design/ | 文档 pipeline 大纲（迁移自根目录） | 人工撰写 |
| 2026-07-30 | numerical-design-pinball-park.html | numeric/ | 玩法数值设计（迁移自根目录） | 人工撰写 |
| 2026-07-30 | economy_sim.py | numeric/sim/ | 经济数值仿真引擎（迁移自 docs/sim/） | 人工撰写 |
| 2026-07-30 | architecture-pinball-park.html | tech/ | 技术架构（迁移自根目录） | 人工撰写 |
| 2026-07-30 | api-pinball-park.html | tech/ | API 契约（迁移自根目录） | 人工撰写 |
| 2026-07-30 | ui-ux-pinball-park.html | ui/ | UI-UX 设计规范（迁移自根目录） | 人工撰写 |
| 2026-07-30 | ui-game-machine-mockup.html | ui/ | 机台视觉稿（迁移自根目录） | 人工撰写 |
| 2026-07-30 | operations-pinball-park.html | ops/ | 上线与运营方案（迁移自根目录） | 人工撰写 |
| 2026-07-30 | test-acceptance-pinball-park.html | qa/ | 测试验收标准（迁移自根目录） | 人工撰写 |
| 2026-07-30 | review-pinball-park-2026-07-29.html | reviews/ | 阶段评审报告（迁移自根目录） | 人工撰写 |
| 2026-07-30 | review-doc-audit-2026-07-30.html | reviews/ | 文档审查与重组报告（新建+迁移） | AI 审查 |
| 2026-07-30 | RULES.md | — | 文档分类管理规则（本文） | AI 审查 |
