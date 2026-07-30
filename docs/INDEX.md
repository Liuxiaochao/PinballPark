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
