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
