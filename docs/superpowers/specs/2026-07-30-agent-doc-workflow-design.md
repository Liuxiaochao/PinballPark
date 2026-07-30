# 弹珠乐园 · Agent 规范与文档工作流设计（规范 → TDD → SKILL）

- 日期：2026-07-30
- 状态：已评审通过（用户确认）
- 适用阶段：长期演进（文档期 → 编码期 → 上线迭代）
- 工具环境：CodeBuddy 为主；规范正文写成工具中立的 `AGENTS.md`，`.codebuddy` 仅做引用

## 1. 目标

让任何 AI 接手本项目时能够：

1. 30 秒内定位「该看哪份文档、该用哪个 SKILL」
2. 按统一 SOP 完成改动，且改动必然经过测试验证（TDD）
3. 发现文档矛盾时自发修正并留痕（自调整闭环）

## 2. 目录结构总览

```
PinballPark/
├── AGENTS.md                      # AI 接手唯一入口（核心规范）
├── .codebuddy/
│   ├── rules/project.md           # 一行引用：先读 AGENTS.md
│   └── skills/                    # 项目级 SKILL
│       ├── feature-dev/SKILL.md   # 新增/修改功能 SOP
│       ├── numeric-verify/SKILL.md# 数值验收 SOP
│       └── doc-sync/SKILL.md      # 文档同步检查 SOP
├── docs/
│   ├── INDEX.md                   # 文档索引：地图 + 状态 + 适用场景
│   ├── *.html                     # 现有 10 份 HTML 文档（源头规范，不改格式）
│   ├── features/                  # 功能细节文档（Markdown 卡片）
│   │   ├── _TEMPLATE.md
│   │   └── F-xxx-<功能名>.md
│   └── sim/economy_sim.py         # 现有数值仿真引擎
└── tests/
    ├── README.md                  # 测试规范（TDD 约定，含编码期切换规则）
    └── numeric/test_*.py          # 数值断言测试（现阶段）
```

原则：现有 HTML 文档只读不改格式，作为「源头规范」；新增的机器友好层全部用 Markdown。

### 2.1 `docs/INDEX.md` 字段定义

每份文档一行，表格字段：

| 字段 | 说明 |
|---|---|
| 文档 | 相对路径（可点击链接） |
| 层级 | 源头规范（HTML）/ 功能卡 / 测试 / 流程 |
| 状态 | active / draft / deprecated |
| 一句话用途 | 什么问题来查这份文档 |
| 最近更新 | YYYY-MM-DD |

INDEX.md 顶部另设「**下一可用功能编号**」字段（如 `next: F-009`），作为 F-xxx 编号的唯一登记处，防止编号冲突。

## 3. 规范层 — `AGENTS.md`

AI 接手的第一入口，控制在约 150 行内，包含：

1. **项目一句话** + 当前阶段（文档期 / 编码期）
2. **30 秒索引表**：「我要做 X → 先读哪份文档 → 用哪个 SKILL」的映射表
3. **工作守则**：
   - 任何改动前先查 `docs/INDEX.md` 找到权威文档
   - 数值类改动必须先跑 `tests/numeric/` 通过
   - 发现文档间矛盾 → 触发 doc-sync SKILL，先修文档再干活
4. **文档分层规则**：
   - HTML = 设计源头，**实质性变更需人确认**（数值、规则、玩法、流程的改动；错别字/样式修正除外）
   - `features/*.md` = 实现细节，AI 可自主维护
   - `INDEX.md` = 地图，每次增删文档必须同步
5. **变更日志**：末尾追加式记录，条目格式固定为：
   `- YYYY-MM-DD | 触发原因 | 改动摘要 | 涉及文件`
6. **阶段切换机制**：AGENTS.md 顶部「当前阶段」字段（文档期 / 编码期）只能由人确认后修改；切换到编码期时按 `tests/README.md` 预写的规则启用经典代码 TDD

`.codebuddy/rules/project.md` 只写一句：「开始任何任务前必须先读根目录 AGENTS.md」。其他工具入口（如 `CLAUDE.md`）不预建，未来需要时同样只写这一行引用。

## 4. 功能细节文档层 — `docs/features/`

现有 HTML 是章节式大文档，AI 检索成本高。功能卡片将其切成功能粒度，模板字段：

```markdown
# F-001 弹珠发射
状态: draft | active | deprecated
上游规范: PRD §x.x / 数值文档 §x.x      ← 回链到 HTML 源头
关联测试: tests/numeric/test_launch.py   ← TDD 挂钩

## 行为描述（做什么、边界条件）
## 数值参数（具体数字，标注来源）
## 已知问题 / 决策记录（为什么这样定）
```

规则：

- 功能编号自 `F-001` 起，永不复用；下一可用编号登记在 `INDEX.md` 顶部
- 文件命名：`F-001-ball-launch.md`（编号-英文短横线名），标题内用中文
- HTML 文档变更 → 对应功能卡必须同步（由 doc-sync SKILL 检查）
- 测试文件与功能卡关联：测试文件 docstring 首行标注 `覆盖: F-001`，功能卡「关联测试」字段回指测试路径，双向可查
- 编码期代码注释引用 `F-xxx` 编号，形成「代码 ↔ 文档 ↔ 测试」三向索引

首批建卡（从数值文档与 PRD 提取，约 5-8 张，编号在实施时按此顺序分配）：

1. 倍率档位集合（×2/×4/×6/×8/×16/×32）
2. RTP 与赔付表
3. 投注档位与加注
4. 弹珠发射与钉板判定
5. 结算与派彩流程
6. （备选）跑马灯/LED 表现规则、机台布局约束

## 5. TDD 层 — `tests/`

**文档期（现阶段）**：把文档中的关键数值结论转成 pytest 断言，例如：

- 倍率集合 = {×2, ×4, ×6, ×8, ×16, ×32}
- RTP 仿真值落在数值文档声明区间
- 赔付表与投注档乘算结果符合数值文档

`economy_sim.py` 保持为仿真引擎，测试调用它做断言。
**文档改数值 = 先改测试（红）→ 改文档/仿真参数（绿）**，即文档期 TDD。

**编码期（未来）**：`tests/` 平级扩展 `unit/`、`integration/`，沿用「先测试后实现」约定。切换规则预写在 `tests/README.md`，届时无需重新设计。

### 5.1 运行环境与依赖

- Python 3.10+，测试框架 pytest；依赖清单写入根目录 `requirements.txt`（现阶段仅 `pytest`）
- 统一运行命令：`pytest tests/numeric -q`（写入 AGENTS.md 与 tests/README.md）
- `economy_sim.py` 需可被测试导入：若当前仅支持脚本运行，实施时补充可导入的参数/函数入口（不改变其原有 CLI 行为）
- `__pycache__` 等产物由 `.gitignore` 排除（已有 .gitignore，实施时核对）

## 6. SKILL 层 — `.codebuddy/skills/`

首批 3 个 SKILL，每个是一份 SOP 式 `SKILL.md`，需含 frontmatter（`name`、`description`，description 写明触发时机以便 AI 自动匹配）：

| SKILL | 触发时机 | 核心步骤 |
|---|---|---|
| `feature-dev` | 新增/修改任何功能 | 查 INDEX → 读/建 F-xxx 卡 → 写/改测试（红）→ 改文档或实现（绿）→ 回写卡片状态 → 登记 AGENTS.md 日志 |
| `numeric-verify` | 任何数值变动后 | 跑 economy_sim + tests/numeric → 输出验收报告 → 不过则回退或修文档 |
| `doc-sync` | 发现矛盾 / HTML 文档变更后 | 对照 INDEX 检查 HTML ↔ 功能卡 ↔ 测试三层一致性 → 列出差异 → 修复并登记 |

## 7. 自发调整闭环

1. **每个 SKILL 末尾固定一段**：执行中若发现文档与现实不符 → 停下 → 判断哪层是权威（HTML > 功能卡 > 测试，除非测试挂的是已确认数值）→ 修正非权威层 → AGENTS.md 日志登记
2. **AGENTS.md 工作守则强制自检**：任务结束前检查「本次改动是否触碰 INDEX 所列文档？触碰了就检查同步」
3. **升级路径**：若约定不足以维持闭环（如 AI 经常忘记回写），再局部加 git hook 卡关；设计预留，现在不做

## 8. 边界与不做的事

- 不改现有 HTML 文档的格式和内容组织
- 不引入 CI、git hook（预留升级位）
- 不做多人协作的评审状态机
- SKILL 先落 3 个高频场景，后续按需增补

## 9. 验收标准

1. `AGENTS.md`、`.codebuddy/rules/project.md`、`docs/INDEX.md`、`docs/features/`（模板 + 首批卡片）、`requirements.txt`、`tests/README.md`、`tests/numeric/`（`pytest tests/numeric -q` 全绿）、3 个 SKILL 全部就位
2. 模拟场景验证：让 AI 从零接手执行「修改一个倍率档位」，能沿 索引 → 功能卡 → 测试红绿 → 回写日志 全链路走通
3. 故意制造一处文档矛盾，doc-sync SKILL 能发现并按权威层级修正
