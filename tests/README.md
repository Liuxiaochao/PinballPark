# 测试规范（TDD 约定）

统一运行命令：`pytest tests/numeric -q`（需先 `pip install -r requirements.txt`）

## 当前阶段：文档期

- `tests/numeric/` 存放数值断言测试：把设计文档（HTML）中的关键数值结论转成 pytest 断言。
- 仿真引擎为 `docs/numeric/sim/economy_sim.py`，由 `tests/conftest.py` 注入导入路径，测试直接 `import economy_sim`。
- **文档期 TDD 循环**：要改数值 → 先改测试使其反映新数值（跑一次确认红）→ 再改文档与 `economy_sim.py` 参数（跑一次确认绿）→ 触发 numeric-verify SKILL 出验收报告。
- 每个测试文件 docstring 首行标注 `覆盖: F-xxx`（对应 `docs/features/` 功能卡），功能卡的「关联测试」字段回指测试路径，双向可查。

## 编码期切换规则（预写，届时生效）

1. `AGENTS.md` 顶部「当前阶段」由人确认改为「编码期」后本节生效。
2. `tests/` 下平级新增 `unit/`（单元测试）与 `integration/`（集成测试），`numeric/` 保留继续守护数值。
3. 经典代码 TDD：任何新功能/修复，先写失败测试（红）→ 最小实现（绿）→ 重构。
4. 代码注释引用 `F-xxx` 编号，形成「代码 ↔ 功能卡 ↔ 测试」三向索引。
5. 统一命令扩展为 `pytest tests -q`。
