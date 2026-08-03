# 弹珠乐园 · 文档索引（2026-08-03 修订版）

> 下一可用功能编号：**F-006**（新建功能卡取此号并顺延更新本行）
>
> 管理规则见 `docs/RULES.md`，简版见 `AGENTS.md § 文档分类管理规则`

## 目录结构

```
docs/
├── INDEX.md                   ← 本文：全部文档映射表
├── RULES.md                   ← 文档分类管理规则（新增/移动/删除操作流程）
├── design/                    # 游戏设计
├── numeric/                   # 数值与经济（含 sim/ 仿真引擎）
├── tech/                      # 技术架构 & API
├── ui/                        # 界面实现规范 & 历史视觉稿
├── ops/                       # 运营方案
├── qa/                        # 测试验收标准
├── reviews/                   # 评审与审计报告
├── features/                  # F-xxx 功能细节卡片
└── superpowers/               # 历史工作流设计文档（保留不动）
```

## 文档映射表

| 文档 | 层级 | 状态 | 一句话用途 | 最近更新 |
|---|---|---|---|---|
| **[design/](design/)** | | | | |
| [PRD-pinball-park.html](design/PRD-pinball-park.html) | 源头规范 | active | 产品需求总纲：玩法、频控、积分体系 | 2026-07-29 |
| [pinball-park-outline.html](design/pinball-park-outline.html) | 源头规范 | active | 设计文档 pipeline 大纲与导航 | 2026-07-29 |
| **[numeric/](numeric/)** | | | | |
| [numerical-design-pinball-park.html](numeric/numerical-design-pinball-park.html) | 源头规范 | active | 数值权威：倍率/RTP/发卡/K/生命线 (v1.2) | 2026-07-29 |
| [sim/economy_sim.py](numeric/sim/economy_sim.py) | 数值仿真 | active | 经济数值蒙特卡洛仿真引擎（可导入/可运行） | 2026-07-30 |
| **[tech/](tech/)** | | | | |
| [architecture-pinball-park.html](tech/architecture-pinball-park.html) | 源头规范 | active | 技术架构：前后端分层与模块划分 | 2026-07-29 |
| [api-pinball-park.html](tech/api-pinball-park.html) | 源头规范 | active | 服务端 API 契约（含 adFreq 频控） | 2026-07-29 |
| **[ui/](ui/)** | | | | |
| [game-interface.html](ui/game-interface.html) | 源头规范 | active | 游戏界面权威文档：状态机/分区/交互/动效/问题排查 | 2026-08-03 |
| [ui-ux-pinball-park.html](ui/ui-ux-pinball-park.html) | 视觉参考 | historical | 旧 UI-UX 视觉风格参考，界面权威见 game-interface.html | 2026-08-03 |
| [ui-game-machine-mockup.html](ui/ui-game-machine-mockup.html) | 视觉参考 | historical | 旧机台视觉稿，历史参考，不再作为当前界面权威 | 2026-08-03 |
| **[ops/](ops/)** | | | | |
| [operations-pinball-park.html](ops/operations-pinball-park.html) | 源头规范 | active | 上线与运营方案 | 2026-07-29 |
| **[qa/](qa/)** | | | | |
| [test-acceptance-pinball-park.html](qa/test-acceptance-pinball-park.html) | 源头规范 | active | 测试与验收标准 | 2026-07-29 |
| **[reviews/](reviews/)** | | | | |
| [review-pinball-park-2026-07-29.html](reviews/review-pinball-park-2026-07-29.html) | 源头规范 | active | 阶段评审报告（P0/P1 缺陷与修订记录） | 2026-07-29 |
| [review-doc-audit-2026-07-30.html](reviews/review-doc-audit-2026-07-30.html) | 流程 | active | 文档审查报告：发现问题与改动汇总 | 2026-07-30 |
| **[features/](features/)** | 功能卡 | active | 包含 _TEMPLATE.md + F-001 倍率 ~ F-005 频控，编号 F-006 起 | 2026-07-30 |
| **[superpowers/](superpowers/)** | 流程 | — | 历史工作流设计文档（保留不动） | 2026-07-30 |
| **根级管理文件** | | | | |
| [../AGENTS.md](../AGENTS.md) | 流程 | active | 游戏开发入口：项目状态/快速索引/管理规则 | 2026-07-30 |
| [RULES.md](RULES.md) | 流程 | active | 文档分类管理操作流程 | 2026-07-30 |
| [../tests/README.md](../tests/README.md) | 流程 | active | TDD 约定与编码期切换规则 | 2026-07-30 |

## 待补齐：游戏开发核心领域

> 以下内容尚未开始，是当前项目最大的缺口。

| 领域 | 状态 | 优先级 | 需要做什么 |
|---|---|---|---|
| 客户端原型 | ❌ 未开始 | P0 | 跑通一局弹珠机（发射→碰撞→结算） |
| 美术资源 | ❌ 未开始 | P0 | 机台/弹珠/UI 素材，包体 4MB 限制内 |
| 音效设计 | ❌ 未开始 | P1 | 碰撞 SFX / 中奖反馈 / BGM |
| 上手引导 | ❌ 未开始 | P1 | 首局引导流程，新用户 3 分钟内理解玩法 |
| 微信社交裂变 | ❌ 未开始 | P1 | 分享/排行榜/好友送心 |
| 留存与运营体系 | ❌ 未开始 | P2 | 签到/离线收益/限时活动/节日模板 |
| 兑奖后台 | ❌ 未开始 | P2 | 积分卡兑换实物流程+客服 |

## 已知经济问题

- 引入 20 次/日视频频控后，eCPM=0.30 下重度场景生命线破防（F-003 决策记录）
- 修复方向：提 eCPM / 放宽频控 / 升 K / 降 RTP，调参后重跑 `python3 docs/numeric/sim/economy_sim.py` 验证

## 层级与权威关系（保留）

- **源头规范（HTML）**：设计权威。实质性变更（数值/规则/玩法/流程）需人确认。
- **功能卡（features/F-xxx.md）**：实现细节。AI 可自主维护，须与源头规范一致。
- **测试（tests/numeric/）**：数值结论的可执行固化。与文档冲突时按「HTML > 功能卡 > 测试」定权威，除非测试挂的是已人工确认的新数值。
- **流程（AGENTS.md, RULES.md, tests/README.md）**：工作方式约定。

维护规则：任何文档的增/删/改名/移动，必须同步更新本表。

## 变更日志

- 2026-07-30 | 审查后修订 | 拆分"已就绪/待补齐"，新增美术/音效/社交/运营/兑奖，标记已知经济问题 | INDEX.md
- 2026-07-30 | 文档结构化 | 所有文档按功能分类归入子目录，新增目录结构一览，更新所有路径 | INDEX.md, RULES.md, AGENTS.md
- 2026-08-03 | 界面重构 | 新增 game-interface.html 权威文档，旧 UI 文档降级为历史视觉参考 | INDEX.md, RULES.md, AGENTS.md
