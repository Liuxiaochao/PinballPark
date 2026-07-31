# F-XXX 功能名（中文）

- 状态: draft | active | deprecated
- 上游规范: <HTML 文档名 §x.x>（可多条；无则写「无，本次新增」）
- 关联测试: tests/numeric/test_xxx.py（无则「暂无」）
- 关联代码: src/xxx.js / src/xxx.py（编码后补）
> 注意：「上游规范」只写文件名不含路径（如 `PRD-pinball-park.html`），路径统一在 `docs/INDEX.md` 查。

## 行为描述

做什么、边界条件、异常情况。一句话说不清就是设计有问题。

## 数值参数

具体数字，逐条标注来源。可配置的参数标记为 `#config`。

## 已知问题 / 决策记录

为什么这样定（含被推翻的旧方案）。技术债标记为 `#tech-debt`。

## 实现检查清单

- [ ] 数值断言（tests/numeric/）
- [ ] 仿真验证（docs/numeric/sim/economy_sim.py）
- [ ] 客户端逻辑
- [ ] 服务端逻辑
- [ ] 接入微信 API
- [ ] 埋点/日志
