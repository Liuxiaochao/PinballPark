# Agent 规范与文档工作流 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地「规范 → TDD → SKILL」三层工作流，让任何 AI 接手本项目时 30 秒内定位文档、按 SOP 改动、自发修正文档矛盾。

**Architecture:** 三层结构——规范层（`AGENTS.md` + `docs/INDEX.md`）、TDD 层（`tests/numeric/` pytest 断言挂接 `docs/sim/economy_sim.py`）、SKILL 层（`.codebuddy/skills/` 三个 SOP）。现有 HTML 文档为只读源头，新增层全部 Markdown。

**Tech Stack:** Python 3.10+（本机 3.14.3）、pytest、纯 Markdown 文档。

**Spec:** `docs/superpowers/specs/2026-07-30-agent-doc-workflow-design.md`

## Global Constraints

- 现有 `docs/*.html` 文档：只读，不改格式和内容组织
- `economy_sim.py`：不改变其原有 CLI 行为（`python3 docs/sim/economy_sim.py` 输出不变）
- 统一测试命令：`pytest tests/numeric -q`
- 功能编号自 `F-001` 起永不复用，下一可用编号登记在 `docs/INDEX.md` 顶部
- 功能卡文件名格式：`F-001-ball-launch.md`（编号-英文短横线）
- 测试文件 docstring 首行标注 `覆盖: F-xxx`
- AGENTS.md 变更日志条目格式：`- YYYY-MM-DD | 触发原因 | 改动摘要 | 涉及文件`
- 不引入 CI、git hook
- 关键数值基准（来自数值文档 v1.2 与 economy_sim.py，测试断言依据）：
  - 倍率档位 = [2, 4, 6, 8, 16, 32]，权重 = [30, 22, 14, 9, 3, 1.5]，加权均倍 ≈ 5.03
  - 稳态 RTP = 0.90，命中率 = RTP / M
  - 发卡：R ≥ 40 才发卡，卡数 = min(5, floor(R/40))
  - 每日激励视频硬上限 = 20 次
  - 免费珠 = 登录 30 + 领珠视频 6×88 = 558 颗/日
  - K 扫描档 = [5, 20, 50, 80, 120]，eCPM = ¥0.30
  - 新手保护 = 前 15 局 RTP 1.5

---

### Task 1: 测试基础设施

**Files:**
- Create: `requirements.txt`
- Create: `tests/conftest.py`
- Create: `tests/README.md`
- Modify: `.gitignore`（追加 `__pycache__/`）

**Interfaces:**
- Produces: `tests/conftest.py` 将 `docs/sim` 加入 `sys.path`，后续所有测试可直接 `import economy_sim`

- [ ] **Step 1: 创建 requirements.txt**

```
pytest>=8.0
```

- [ ] **Step 2: 追加 .gitignore 条目**

在 `.gitignore` 末尾追加：

```
# Python
__pycache__/
*.pyc
.pytest_cache/
```

- [ ] **Step 3: 创建 tests/conftest.py**

```python
"""将 docs/sim 加入导入路径, 使测试可直接 import economy_sim."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "docs" / "sim"))
```

- [ ] **Step 4: 创建 tests/README.md**

```markdown
# 测试规范（TDD 约定）

统一运行命令：`pytest tests/numeric -q`（需先 `pip install -r requirements.txt`）

## 当前阶段：文档期

- `tests/numeric/` 存放数值断言测试：把设计文档（HTML）中的关键数值结论转成 pytest 断言。
- 仿真引擎为 `docs/sim/economy_sim.py`，由 `tests/conftest.py` 注入导入路径，测试直接 `import economy_sim`。
- **文档期 TDD 循环**：要改数值 → 先改测试使其反映新数值（跑一次确认红）→ 再改文档与 `economy_sim.py` 参数（跑一次确认绿）→ 触发 numeric-verify SKILL 出验收报告。
- 每个测试文件 docstring 首行标注 `覆盖: F-xxx`（对应 `docs/features/` 功能卡），功能卡的「关联测试」字段回指测试路径，双向可查。

## 编码期切换规则（预写，届时生效）

1. `AGENTS.md` 顶部「当前阶段」由人确认改为「编码期」后本节生效。
2. `tests/` 下平级新增 `unit/`（单元测试）与 `integration/`（集成测试），`numeric/` 保留继续守护数值。
3. 经典代码 TDD：任何新功能/修复，先写失败测试（红）→ 最小实现（绿）→ 重构。
4. 代码注释引用 `F-xxx` 编号，形成「代码 ↔ 功能卡 ↔ 测试」三向索引。
5. 统一命令扩展为 `pytest tests -q`。
```

- [ ] **Step 5: 冒烟验证 pytest 可运行**

Run: `cd /Users/liu/Documents/Git/Game/PinballPark && pip3 install -r requirements.txt -q && pytest tests -q`
Expected: `no tests ran`（无报错即可）

- [ ] **Step 6: Commit**

```bash
git add requirements.txt .gitignore tests/conftest.py tests/README.md
git commit -m "chore: 测试基础设施——pytest 环境、conftest 导入路径、TDD 测试规范"
```

---

### Task 2: 数值参数断言测试（特征化测试）

**Files:**
- Create: `tests/numeric/test_economy_params.py`

**Interfaces:**
- Consumes: `economy_sim` 模块常量 `MULT_DIST`、`WEIGHTED_AVG_M`、`CARD_THRESHOLD`、`CARD_CAP`、`DEFAULT_DAILY_VIDEO_CAP`、`DEFAULT_NEWBIE_GAMES`、`DEFAULT_NEWBIE_RTP`

说明：本任务是**特征化测试**（固化现有已确认数值），写完应直接全绿；此后任何数值变动都会先打红这些测试，形成文档期 TDD 的锚点。

- [ ] **Step 1: 写测试文件**

```python
"""覆盖: F-001 F-003 F-005
把数值文档 v1.2 的关键数值结论固化为断言, 数值变更必须先改这里(红)再改文档与仿真(绿).
"""
import economy_sim as es


def test_multiplier_levels():
    """数值文档 §1.2: 6 档倍率 ×2/×4/×6/×8/×16/×32."""
    assert [m for m, _ in es.MULT_DIST] == [2, 4, 6, 8, 16, 32]


def test_multiplier_weights():
    """数值文档 §1.2: 权重 30/22/14/9/3/1.5, 低倍高权重."""
    assert [w for _, w in es.MULT_DIST] == [30, 22, 14, 9, 3, 1.5]


def test_weighted_avg_multiplier():
    """数值文档 §1.2: 加权平均倍数 ≈ 5.03."""
    assert abs(es.WEIGHTED_AVG_M - 5.03) < 0.01


def test_card_rule_constants():
    """数值文档 §1.3: 发卡门槛 40, 单局发卡上限 5."""
    assert es.CARD_THRESHOLD == 40
    assert es.CARD_CAP == 5


def test_daily_video_cap():
    """PRD §6.2 / API dailyTotal: 每日激励视频硬上限 20 次."""
    assert es.DEFAULT_DAILY_VIDEO_CAP == 20


def test_newbie_protection():
    """数值仿真评审修订: 新手保护前 15 局, RTP=1.5."""
    assert es.DEFAULT_NEWBIE_GAMES == 15
    assert es.DEFAULT_NEWBIE_RTP == 1.5
```

- [ ] **Step 2: 运行验证全绿**

Run: `pytest tests/numeric/test_economy_params.py -v`
Expected: 6 passed

- [ ] **Step 3: Commit**

```bash
git add tests/numeric/test_economy_params.py
git commit -m "test: 固化数值文档 v1.2 关键参数为特征化断言"
```

---

### Task 3: 发卡公式提取（经典红绿循环）

**Files:**
- Modify: `docs/sim/economy_sim.py:104-106`（提取内联发卡逻辑为函数）
- Create: `tests/numeric/test_card_formula.py`

**Interfaces:**
- Produces: `economy_sim.cards_for_reward(reward) -> int`，后续 SKILL 与编码期实现均以此为发卡公式的唯一权威实现

- [ ] **Step 1: 写失败测试**

```python
"""覆盖: F-003
发卡公式: R >= 40 才发卡, 卡数 = min(5, floor(R/40)). 边界值来自数值文档 §1.3.
"""
import economy_sim as es


def test_below_threshold_no_card():
    assert es.cards_for_reward(0) == 0
    assert es.cards_for_reward(39) == 0


def test_threshold_boundaries():
    assert es.cards_for_reward(40) == 1   # 40~79 -> 1 张
    assert es.cards_for_reward(79) == 1
    assert es.cards_for_reward(80) == 2   # 80~119 -> 2 张
    assert es.cards_for_reward(119) == 2


def test_cap_at_five():
    assert es.cards_for_reward(200) == 5    # floor(200/40)=5, 恰到上限
    assert es.cards_for_reward(1500) == 5   # 数值文档: 1500+ 封顶 5 张
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/numeric/test_card_formula.py -v`
Expected: FAIL，`AttributeError: module 'economy_sim' has no attribute 'cards_for_reward'`

- [ ] **Step 3: 最小实现**

在 `economy_sim.py` 的 `roll_mult()` 函数之后新增：

```python
def cards_for_reward(reward):
    """发卡公式 (数值文档 §1.3): R >= 40 才发卡, 卡数 = min(5, floor(R/40))."""
    if reward < CARD_THRESHOLD:
        return 0
    return int(min(CARD_CAP, reward // CARD_THRESHOLD))
```

并将 `simulate_user_lifecycle` 中原内联逻辑：

```python
                if reward >= CARD_THRESHOLD:
                    cards_today += min(CARD_CAP, reward // CARD_THRESHOLD)
                    card_trig_today += 1
```

替换为：

```python
                gained = cards_for_reward(reward)
                if gained:
                    cards_today += gained
                    card_trig_today += 1
```

- [ ] **Step 4: 运行确认通过 + 回归**

Run: `pytest tests/numeric -q`
Expected: 全部 passed（Task 2 的 6 个 + 本任务 3 个）

Run: `python3 docs/sim/economy_sim.py | head -5`
Expected: 正常输出仿真头部信息（CLI 行为不变）

- [ ] **Step 5: Commit**

```bash
git add docs/sim/economy_sim.py tests/numeric/test_card_formula.py
git commit -m "refactor: 提取发卡公式 cards_for_reward 并补边界测试(红绿循环)"
```

---

### Task 4: 仿真行为测试

**Files:**
- Create: `tests/numeric/test_simulation.py`

**Interfaces:**
- Consumes: `economy_sim.roll_mult()`、`economy_sim.simulate_user_lifecycle(rtp, bet, p_double, eCPM, ..., seed)`（返回 6 元组：局数/日, 视频/日, 占位, 卡/日, 广告/日, 触发/日）

- [ ] **Step 1: 写测试文件**

```python
"""覆盖: F-002 F-005
验证仿真引擎行为符合数值文档: 抽倍合法性 / RTP 期望返还 / 每日视频上限.
"""
import random

import economy_sim as es


def test_roll_mult_only_returns_defined_levels():
    """抽出的倍数必须落在 6 档集合内."""
    random.seed(42)
    allowed = {2, 4, 6, 8, 16, 32}
    assert all(es.roll_mult() in allowed for _ in range(10000))


def test_rtp_expectation_holds():
    """数值文档 §1.1: 反解命中率下, 单位投入期望返还恒 ≈ RTP(0.90)."""
    random.seed(7)
    rtp, bet, n = 0.90, 20, 200000
    returned = 0.0
    for _ in range(n):
        m = es.roll_mult()
        if random.random() < rtp / m:
            returned += bet * m
    assert abs(returned / (bet * n) - rtp) < 0.02


def test_daily_video_cap_enforced():
    """PRD §6.2: 重度玩家场景下, 日均视频次数不得超过 20 次硬上限."""
    _, videos_per_day, _, _, _, _ = es.simulate_user_lifecycle(
        rtp=0.90, bet=20, p_double=0.7, eCPM=0.30,
        max_games_per_day=300, days=30, seed=1)
    assert videos_per_day <= 20


def test_free_beads_supply():
    """数值文档 §1.4: 免费珠 = 登录30 + 6次×88 = 558 颗/日."""
    login, max_free_videos, video_beads = 30, 6, 88
    assert login + max_free_videos * video_beads == 558
```

- [ ] **Step 2: 运行验证全绿**

Run: `pytest tests/numeric -q`
Expected: 全部 passed（累计 13 个）

- [ ] **Step 3: Commit**

```bash
git add tests/numeric/test_simulation.py
git commit -m "test: 仿真行为断言——抽倍合法性/RTP期望/视频上限/免费珠供给"
```

---

### Task 5: 文档索引 `docs/INDEX.md`

**Files:**
- Create: `docs/INDEX.md`

**Interfaces:**
- Produces: 全项目文档地图；「下一可用功能编号」字段（`next: F-006`，Task 6 建 5 张卡后的下一号）

- [ ] **Step 1: 创建 INDEX.md**

```markdown
# 弹珠乐园 · 文档索引

> 下一可用功能编号：**F-006**（新建功能卡取此号并顺延更新本行）

| 文档 | 层级 | 状态 | 一句话用途 | 最近更新 |
|---|---|---|---|---|
| [PRD-pinball-park.html](PRD-pinball-park.html) | 源头规范 | active | 产品需求总纲：玩法、频控、积分体系 | 2026-07-29 |
| [numerical-design-pinball-park.html](numerical-design-pinball-park.html) | 源头规范 | active | 数值权威：倍率/RTP/发卡/K 分层/生命线 | 2026-07-29 |
| [architecture-pinball-park.html](architecture-pinball-park.html) | 源头规范 | active | 技术架构：前后端分层与模块划分 | 2026-07-29 |
| [api-pinball-park.html](api-pinball-park.html) | 源头规范 | active | 服务端 API 契约（含 adFreq 频控） | 2026-07-29 |
| [ui-ux-pinball-park.html](ui-ux-pinball-park.html) | 源头规范 | active | UI-UX 设计规范 | 2026-07-29 |
| [ui-game-machine-mockup.html](ui-game-machine-mockup.html) | 源头规范 | active | 机台视觉稿（可交互 mockup） | 2026-07-29 |
| [test-acceptance-pinball-park.html](test-acceptance-pinball-park.html) | 源头规范 | active | 测试与验收标准 | 2026-07-29 |
| [operations-pinball-park.html](operations-pinball-park.html) | 源头规范 | active | 上线与运营方案 | 2026-07-29 |
| [pinball-park-outline.html](pinball-park-outline.html) | 源头规范 | active | 七份文档 pipeline 大纲与导航 | 2026-07-29 |
| [review-pinball-park-2026-07-29.html](review-pinball-park-2026-07-29.html) | 源头规范 | active | 阶段评审报告（P0/P1 缺陷与修订记录） | 2026-07-29 |
| [sim/economy_sim.py](sim/economy_sim.py) | 测试/仿真 | active | 经济数值蒙特卡洛仿真引擎（可导入） | 2026-07-30 |
| [features/](features/) | 功能卡 | active | 功能粒度细节卡片（F-xxx），AI 可自主维护 | 2026-07-30 |
| [../tests/README.md](../tests/README.md) | 流程 | active | TDD 约定与编码期切换规则 | 2026-07-30 |
| [../AGENTS.md](../AGENTS.md) | 流程 | active | AI 接手唯一入口：索引表/守则/变更日志 | 2026-07-30 |
| [superpowers/specs/2026-07-30-agent-doc-workflow-design.md](superpowers/specs/2026-07-30-agent-doc-workflow-design.md) | 流程 | active | 本工作流的设计文档 | 2026-07-30 |

## 层级与权威关系

- **源头规范（HTML）**：设计权威。实质性变更（数值/规则/玩法/流程）需人确认。
- **功能卡（features/F-xxx.md）**：实现细节。AI 可自主维护，须与源头规范一致。
- **测试（tests/numeric/）**：数值结论的可执行固化。与文档冲突时按「HTML > 功能卡 > 测试」定权威，除非测试挂的是已人工确认的新数值。
- **流程（AGENTS.md 等）**：工作方式约定。

维护规则：任何文档的增/删/改名，必须同步更新本表。
```

- [ ] **Step 2: Commit**

```bash
git add docs/INDEX.md
git commit -m "docs: 新增文档索引 INDEX.md——地图/状态/权威层级/功能编号登记"
```

---

### Task 6: 功能卡模板与首批 5 张卡

**Files:**
- Create: `docs/features/_TEMPLATE.md`
- Create: `docs/features/F-001-multiplier-levels.md`
- Create: `docs/features/F-002-rtp-payout.md`
- Create: `docs/features/F-003-score-card.md`
- Create: `docs/features/F-004-bet-and-beads.md`
- Create: `docs/features/F-005-video-frequency-control.md`

**Interfaces:**
- Consumes: Task 2-4 的测试文件路径（关联测试字段回指）
- Produces: F-001~F-005 编号，供测试 docstring、未来代码注释引用

- [ ] **Step 1: 创建模板 _TEMPLATE.md**

```markdown
# F-XXX 功能名（中文）

- 状态: draft | active | deprecated
- 上游规范: <HTML 文档名> §x.x（可多条）
- 关联测试: tests/numeric/test_xxx.py（无则写「暂无」）

## 行为描述

做什么、边界条件、异常情况。

## 数值参数

具体数字，逐条标注来源章节。

## 已知问题 / 决策记录

为什么这样定（含被推翻的旧方案）。
```

- [ ] **Step 2: 创建 F-001-multiplier-levels.md**

```markdown
# F-001 倍率档位集合

- 状态: active
- 上游规范: numerical-design-pinball-park.html §1.2
- 关联测试: tests/numeric/test_economy_params.py, tests/numeric/test_simulation.py

## 行为描述

每局服务端先抽一个倍数 M，玩家命中则奖励 = 有效投入 × M。低倍高权重（小奖频繁）、高倍稀有（jackpot 手感）。

## 数值参数

- 档位（v1.2，6 档）：×2 / ×4 / ×6 / ×8 / ×16 / ×32（来源 §1.2）
- 权重：30 / 22 / 14 / 9 / 3 / 1.5（来源 §1.2）
- 加权平均倍数 ≈ 5.03（来源 §1.2）

## 已知问题 / 决策记录

- v1.2 由 10 档（×2~×20）改为 6 档：因 RTP 守恒、胜率近似不变，产卡与 A/C 基本持平，经济结论不动（§概览 v1.2 变更）。
```

- [ ] **Step 3: 创建 F-002-rtp-payout.md**

```markdown
# F-002 RTP 控制与赔付

- 状态: active
- 上游规范: numerical-design-pinball-park.html §1.1, PRD-pinball-park.html §4.6
- 关联测试: tests/numeric/test_simulation.py

## 行为描述

「物理为表、结果可控」：服务端抽倍数 M 后反解命中率 P(hit) = RTP / M，使单位投入期望返还恒等于 RTP，与 M 无关。命中奖励 = 投入 × M（可看视频再 ×2）；未命中投入沉没。

## 数值参数

- 稳态 RTP = 0.90（来源 §1.1）
- 整体命中率 ≈ RTP / 5.03 ≈ 17.9%（来源 §1.2）
- 各档命中率（RTP=0.9）：×2→45%，×4→22.5%，×6→15%，×8→11.3%，×16→5.6%，×32→2.8%（来源 §1.2）
- 新手保护：账号前 15 局 RTP = 1.5，其后回归稳态（来源 仿真评审修订）

## 已知问题 / 决策记录

- RTP 反解法保证期望完全可控，同时保留「常中小奖、偶中大奖」的弹珠机体感（§1.1）。
```

- [ ] **Step 4: 创建 F-003-score-card.md**

```markdown
# F-003 积分卡发卡与兑换 K 分层

- 状态: active
- 上游规范: numerical-design-pinball-park.html §1.3 §3.2
- 关联测试: tests/numeric/test_card_formula.py, tests/numeric/test_economy_params.py

## 行为描述

双向设计：卡负责反馈频次（易触达），K 负责经济平衡。单局命中奖励珠 R 达门槛即发卡；实物奖品按 K 张卡兑换，平台调 K 保生命线。

## 数值参数

- 发卡公式：R ≥ 40 才发卡，卡数 = min(5, floor(R/40))；R < 40 得 0 张（来源 §1.3）
- 1 张积分卡 = 10 积分（来源 §1.3，沿用 PRD）
- K 档位：{5, 20, 50, 80, 120}（来源 §3.2 / PRD §7.1）
- 权威实现：`docs/sim/economy_sim.py::cards_for_reward()`

## 已知问题 / 决策记录

- v1.1 推翻 v1.0「阈值 300」方案：300 下重度仅 2.6 张/日，卡触达不到；改为「门槛 40 + K 兜底」解耦反馈与经济（§1.3）。
- [评审修订 v1.3] 含 20 次/日视频频控后，eCPM=0.30 下生命线破防，需调参（提 eCPM/放宽频控/升 K/降 RTP）后重验（§3.1 §3.2）。
```

- [ ] **Step 5: 创建 F-004-bet-and-beads.md**

```markdown
# F-004 投注与免费珠供给

- 状态: active
- 上游规范: numerical-design-pinball-park.html §1.4 §2
- 关联测试: tests/numeric/test_simulation.py

## 行为描述

玩家用弹珠投注开局；弹珠不足时可看激励视频领珠（受频控）。免费供给保证轻度玩家无付费也能持续游玩。

## 数值参数

- 默认投注 = 20 颗/局，最低有效投入 5 颗（来源 §2 仿真口径）
- 每日登录赠 30 颗，1 次/日（来源 §1.4）
- 领珠视频 88 颗/次，≤6 次/日（来源 §1.4，PRD 指定）
- 免费珠合计 = 30 + 6×88 = 558 颗/日（来源 §1.4）

## 已知问题 / 决策记录

- 领珠视频与翻倍视频共享每日 20 次总上限（见 F-005），额度用尽后当日无法再获珠。
```

- [ ] **Step 6: 创建 F-005-video-frequency-control.md**

```markdown
# F-005 激励视频频控

- 状态: active
- 上游规范: PRD-pinball-park.html §6.2, api-pinball-park.html（adFreq.dailyTotal）, numerical-design-pinball-park.html §2
- 关联测试: tests/numeric/test_economy_params.py, tests/numeric/test_simulation.py

## 行为描述

所有激励视频（领珠 + 命中后翻倍）共享每日总次数硬上限；额度用尽后不再通过视频获珠或翻倍。服务端为权威计数方。

## 数值参数

- 每日激励视频总上限 = 20 次（来源 PRD §6.2 / API adFreq.dailyTotal）
- 领珠视频子上限 = 6 次/日（来源 §1.4）
- 翻倍概率假设 p_double = 0.7（来源 §2 仿真口径）
- eCPM ≈ ¥0.30/次，区间 ¥0.2~0.5（来源 §1.4）

## 已知问题 / 决策记录

- [评审修订] 原仿真无视 20 次上限导致广告收益高估（重度实测 52 次/日）；修订后重度视频 18.4 次/日、广告 ¥5.53/日，生命线结论被推翻，是当前最重要的待解经济问题（§3.1）。
```

- [ ] **Step 7: Commit**

```bash
git add docs/features/
git commit -m "docs: 功能卡模板 + 首批 5 张卡(F-001~F-005), 三向索引挂接测试"
```

---

### Task 7: `AGENTS.md` 与 `.codebuddy/rules/project.md`

**Files:**
- Create: `AGENTS.md`
- Create: `.codebuddy/rules/project.md`

**Interfaces:**
- Consumes: `docs/INDEX.md`（Task 5）、F-001~F-005（Task 6）、`pytest tests/numeric -q`（Task 1-4）、三个 SKILL 名（Task 8 将创建，此处引用名称：feature-dev / numeric-verify / doc-sync）

- [ ] **Step 1: 创建 AGENTS.md**

```markdown
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
```

- [ ] **Step 2: 创建 .codebuddy/rules/project.md**

```markdown
开始任何任务前，必须先读根目录 `AGENTS.md` 并遵循其中的索引表与工作守则。
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md .codebuddy/rules/project.md
git commit -m "docs: AGENTS.md AI 接手入口 + codebuddy 规则引用"
```

---

### Task 8: 三个 SKILL

**Files:**
- Create: `.codebuddy/skills/feature-dev/SKILL.md`
- Create: `.codebuddy/skills/numeric-verify/SKILL.md`
- Create: `.codebuddy/skills/doc-sync/SKILL.md`

**Interfaces:**
- Consumes: AGENTS.md 守则、INDEX 权威层级、`pytest tests/numeric -q`、`cards_for_reward` 等前序产物

每个 SKILL 末尾必须含统一的「自发调整闭环」段（见各文件末段，三处文字一致）。

- [ ] **Step 1: 创建 feature-dev/SKILL.md**

```markdown
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
   - 更新 `docs/sim/economy_sim.py` 中对应参数（如涉及）。
   - 重跑 `pytest tests/numeric -q` 确认全绿。
5. **数值验收**：涉及数值的，接着执行 numeric-verify SKILL。
6. **回写**：更新功能卡「状态/数值参数/决策记录」，同步 INDEX「最近更新」列。
7. **留痕**：在 `AGENTS.md` 变更日志追加一行（格式见该文件）。

## 自发调整闭环（固定段）

执行中若发现文档与现实不符：停下 → 按「HTML > 功能卡 > 测试」判断权威层（例外：测试挂的是已人工确认的新数值时以测试为准）→ 修正非权威层 → 在 AGENTS.md 变更日志登记 → 再继续原任务。
```

- [ ] **Step 2: 创建 numeric-verify/SKILL.md**

```markdown
---
name: numeric-verify
description: 任何数值变动（倍率、RTP、发卡、频控、K 档、eCPM 等）之后必须使用，输出经济验收结论。触发词：数值验收、验证经济、跑仿真、生命线检查。
---

# 数值验收 SOP

## 步骤

1. **跑断言**：`pytest tests/numeric -q`，必须全绿；有红先回 feature-dev 流程处理。
2. **跑仿真**：`python3 docs/sim/economy_sim.py`，记录关键输出：
   - 重度/轻度玩家的 游戏/日、视频/日、广告¥/日、卡/日、A/C
   - K 扫描表中各档「可持续单价」与「重度比值(×1.2)」的 OK/破防 标记
3. **对照生命线**：判据 = 广告收益 ≥ 积分成本 × 1.2（数值文档 §1.5）。
4. **出结论**（三选一，写进对话回复）：
   - 通过：所有目标 K 档 OK → 可以合入。
   - 有条件通过：部分档破防但属已知问题（见 F-003 决策记录）→ 说明影响面，由用户裁决。
   - 不通过：新改动使原本 OK 的档位破防 → 回退改动或调参（提 eCPM / 放宽频控 / 升 K / 降 RTP）后重跑。
5. **留痕**：结论涉及文档修改的，同步功能卡与 AGENTS.md 变更日志。

## 自发调整闭环（固定段）

执行中若发现文档与现实不符：停下 → 按「HTML > 功能卡 > 测试」判断权威层（例外：测试挂的是已人工确认的新数值时以测试为准）→ 修正非权威层 → 在 AGENTS.md 变更日志登记 → 再继续原任务。
```

- [ ] **Step 3: 创建 doc-sync/SKILL.md**

```markdown
---
name: doc-sync
description: 发现文档间矛盾、或任何 HTML 源头文档变更后使用，检查三层一致性并修复。触发词：文档矛盾、文档同步、一致性检查、说法不一致。
---

# 文档同步检查 SOP

## 步骤

1. **圈定范围**：确定涉及的 HTML 文档章节，通过 `docs/INDEX.md` 与功能卡「上游规范」字段找出所有关联的 F-xxx 卡和测试文件。
2. **三层比对**，逐项列出差异清单（无差异也要明说）：
   - HTML 源头 vs 功能卡：数值、规则描述是否一致
   - 功能卡 vs 测试：「关联测试」是否存在、测试断言值是否与卡上数值一致
   - INDEX：状态/最近更新列是否过期，「下一可用功能编号」是否正确
3. **定权威**：按「HTML > 功能卡 > 测试」判断以谁为准（例外：测试挂的是已人工确认的新数值时以测试为准回改文档）。
4. **修复**：修正非权威层。涉及 HTML 实质性变更的，先向用户确认。
5. **验证**：`pytest tests/numeric -q` 全绿。
6. **留痕**：差异清单与修复结果写入 AGENTS.md 变更日志（一行摘要即可）。

## 自发调整闭环（固定段）

执行中若发现文档与现实不符：停下 → 按「HTML > 功能卡 > 测试」判断权威层（例外：测试挂的是已人工确认的新数值时以测试为准）→ 修正非权威层 → 在 AGENTS.md 变更日志登记 → 再继续原任务。
```

- [ ] **Step 4: Commit**

```bash
git add .codebuddy/skills/
git commit -m "docs: 三个项目 SKILL——feature-dev/numeric-verify/doc-sync, 内置自调整闭环"
```

---

### Task 9: 端到端验收演练

**Files:**
- 无新建文件（演练性任务，验证设计文档 §9 验收标准 2 和 3）

**Interfaces:**
- Consumes: 前 8 个任务的全部产物

- [ ] **Step 1: 全量回归**

Run: `pytest tests/numeric -q && python3 docs/sim/economy_sim.py | head -8`
Expected: 测试全绿；仿真正常输出

- [ ] **Step 2: 演练验收标准 2（修改倍率档位走全链路，只演练不合入）**

按 feature-dev SOP 模拟「把 ×32 改为 ×30」：

1. 查 `docs/INDEX.md` → 定位数值文档 §1.2 与 F-001 卡 → 确认路径可达
2. 修改 `tests/numeric/test_economy_params.py::test_multiplier_levels` 期望值为 `[2, 4, 6, 8, 16, 30]`
3. Run: `pytest tests/numeric -q` → Expected: 至少 1 failed（红，链路有效）
4. **还原测试文件**（`git checkout -- tests/numeric/test_economy_params.py`）
5. Run: `pytest tests/numeric -q` → Expected: 全绿

- [ ] **Step 3: 演练验收标准 3（制造矛盾，验证 doc-sync 可发现）**

1. 临时把 `docs/features/F-005-video-frequency-control.md` 中「20 次」改为「25 次」
2. 按 doc-sync SOP 步骤 2 三层比对：应发现 功能卡(25) 与 HTML/PRD(20)、测试断言(20) 不一致，权威判定为 HTML → 应修功能卡
3. 还原：`git checkout -- docs/features/F-005-video-frequency-control.md`

- [ ] **Step 4: 演练结果登记**

在 `AGENTS.md` 变更日志追加：

```markdown
- 2026-07-30 | 验收演练 | 全链路红绿演练与矛盾发现演练通过, 工作流验收完成 | AGENTS.md
```

- [ ] **Step 5: 最终提交**

```bash
git add AGENTS.md
git commit -m "docs: 工作流端到端验收演练通过, 登记日志"
```
