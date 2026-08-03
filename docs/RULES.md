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
├── ui/                   # 界面实现规范：权威文档、历史视觉稿
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

## Cocos 工程运行规范（权威版）

> 精简版见 `AGENTS.md § Cocos Creator 运行与场景引用规范`。本节记录已发生过的真实踩坑与完整执行规范。

### 一、场景脚本组件引用（__type__）格式

Cocos Creator 场景/预制体 JSON 中，自定义脚本组件的 `__type__` 必须是该脚本 meta UUID 的压缩形式：

- 算法 = Cocos `UuidUtils.compressUUID(uuid, min=false)`：保留 UUID 前 5 位十六进制，后 27 位每 3 位 hex 压成 2 个 base64 字符，共 23 字符；
- 示例：`f0a84e37-9c03-4746-9fdf-41dea229a08b` → `f0a8443nANHRp/fQd6iKaCL`；
- 反例（会导致 `Missing class`，组件被丢弃、界面空白）：完整 UUID、整段 base64 的 22 位串（如 `8KhON5wDR0af30Heoimgiw`）、`min=true` 的 22 位形式。

执行规范：
1. 引用脚本时禁止手工输入 `__type__`；
2. 修改脚本 meta、场景或预制体后，运行 `python3 tools/sync_scene_script_refs.py --check`（`npm run check:cocos`）；
3. 校验不过 → 运行不带 `--check` 的版本自动按 meta uuid 重算，再跑 `--check` 确认；
4. 提交前 `--check` 必须全绿。

### 二、运行黑屏排查（按序执行）

1. 确认编辑器已打开目标场景：预览 `current-scene` 为空时 `launchScene` 解析成字面量 `current_scene`，引擎无场景可加载 → 黑屏；
2. 删除过 `library/`/`temp/` 时，等待资源导入与脚本编译完成（首次约 1~2 分钟，asset-db 日志无 error）再预览；
3. 浏览器控制台验证顺序：`[Main] onLoad scene=Main` → `[Main] lobby built ok` → `Success to load scene`；
4. 构建/打包日志 `grep "Missing class"`，命中先执行 §一 的校验工具；
5. 仍黑屏时检查相机：UI 相机位于内容前方（z=1000 看向 -Z）、`orthoHeight` = 设计高/2、`visibility` 含 UI_2D 层；Canvas 保持编辑器默认位置（不要用代码重置位置）。

### 三、缓存管理

- `library/`、`temp/`、`build/`、`.creator/` 均为生成物，删除后由编辑器自动重建，禁止手工编辑其中的 uuid/文件名；
- 不要手工改这些目录里的文件来"对齐"引用；引用对齐只通过 §一 的脚本或编辑器保存场景完成；
- 历史教训：曾有人手工把场景 `__type__` 改成错误压缩形式，以及手工"修"缓存文件，导致黑屏反复出现；一律以 `--check` 脚本结果为准。


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
| 2026-07-30 | ui-ux-pinball-park.html | ui/ | UI-UX 设计规范（历史参考，迁移自根目录） | 人工撰写 |
| 2026-07-30 | ui-game-machine-mockup.html | ui/ | 机台视觉稿（历史参考，迁移自根目录） | 人工撰写 |
| 2026-07-30 | operations-pinball-park.html | ops/ | 上线与运营方案（迁移自根目录） | 人工撰写 |
| 2026-07-30 | test-acceptance-pinball-park.html | qa/ | 测试验收标准（迁移自根目录） | 人工撰写 |
| 2026-07-30 | review-pinball-park-2026-07-29.html | reviews/ | 阶段评审报告（迁移自根目录） | 人工撰写 |
| 2026-07-30 | review-doc-audit-2026-07-30.html | reviews/ | 文档审查与重组报告（新建+迁移） | AI 审查 |
| 2026-07-30 | RULES.md | — | 文档分类管理规则（本文） | AI 审查 |
| 2026-08-03 | game-interface.html | ui/ | 游戏界面权威文档（界面重构后唯一实现规范） | AI 实施 |
