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
