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
