# 界面按功能区域划分设计（弹跳区 / 发射区）

- 日期：2026-08-07
- 状态：设计已确认（待实现）
- 范围：仅重构 `assets/scripts/PinballGame.ts` 的节点组织与两处越界绘制，不改物理、不改玩法数值。

## 1. 背景与目标

现状 `PinballGame.buildBoard()` 把机台所有内容（背景、钉板、倍率、出口、发射通道、发射杆）平铺创建在 `this.board` 本地坐标系里，没有按功能分区。由此产生两个具体问题：

1. **弹跳区内容越界到发射区**：倍率 LED 面板右沿到 `x≈230`、最右一格出口中心约 `x≈251`，都落进了发射通道竖条（`x ∈ [228, 280]`），视觉上与管壁重叠。
2. **结构不清**：弹跳相关（钉板/倍率/出口）与发射相关（通道/发射杆）混在同一函数，后续改一处容易误伤另一处。

目标：把界面拆成**弹跳区**与**发射区**两个独立节点组，内容在 `board` 本地坐标里 upright 创建后挂到倾斜板上；保证弹跳区内容不进入发射通道竖条。

## 2. 关于"倾斜板"的关键结论

- 面板后仰是物理成因：弹珠沿面板下行的加速度来自重力在面板方向的分量 `g·sin(60°)`，即现有 `setupPhysics` 的 `ps.gravity = new Vec2(0, m.gravity * Math.sin(tilt))`。相机只是把这个倾角**视觉化**，不是成因。
- **Cocos 2D 物理硬约束**：`RigidBody2D` / `Collider2D` 只在 `z=0` 平面仿真。若把 `board` 节点真的在 3D 里旋转 60°，2D 碰撞体会被投影回 `z=0` 导致布局压扁、世界重力仍竖直向下，仿真直接坏掉。
- 因此采用**方案 A**：倾斜由「重力分量(物理) + 相机透视(视觉)」表达；`board` 本地坐标系即倾斜面板坐标帧。内容在该本地坐标系 upright 创建，再挂到 `board`。后续如需真实 3D 旋转板再单独评估（物理需另走扁平层）。

## 3. 节点层级

```
board  (本地坐标系 = 倾斜面板坐标帧；重力 g·sin60 驱动物理；相机透视呈现后仰)
├─ back / arch / 四周边墙        (机台外壳，全宽，保留，不归入功能组)
├─ 分隔线 (x = 228)             (细线，强化两区视觉分界，可选但默认加)
├─ bounceArea   ← 钉板 + 倍率LED + 出口格 + 出口弹片
├─ launchArea   ← 发射通道管身/管壁 + 发射杆 + 弹珠出生点
└─ ball         (弹珠，跨两区，挂在 board 下，不归入任一功能组)
```

两个功能组节点都 `layer = GAME_LAYER`（`UI_3D`），由透视相机渲染；用 `setLayerRec` 递归设层。

## 4. 边界定义（机器尺寸：宽 560、高 980、halfW=280、halfH=490、wallThickness=20）

- 发射通道竖条：`x ∈ [228, 280]`（内壁 `vInnerX=228`、外壁 `vOuterX=280`）。
- 弹跳区可用宽度：`x ∈ [左内壁 -280, 内壁 228]`，宽 508，中心 `x=-26`。
- 分界线：`x=228`（即通道内壁所在竖线）。

## 5. 弹跳区（bounceArea）内容与边界

新增 `buildBounceArea(parent)`，`parent` 为 `bounceArea` 节点。内容：

- **钉板**：沿用现有循环（`fieldL=-halfW+46=-234`，`fieldR=laneCX - tubeW/2 - 20 = 208`）。`fieldR=208 < 228` 本就在界内，仅把创建代码搬入本函数，坐标不变；`addCircle` 父节点改为 `bounceArea`。
- **倍率 LED（本局倍数面板）**：现位于 `(0, -380)`、宽 `460`（右沿≈230，越界 2px）。改为居中弹跳区：中心 `x=-26`、宽 `480`（右沿≈214 < 228），`y` 保持 `-380`。
- **出口格 + 出口弹片**：现 12 格铺满全宽（最右格心≈251，越界）。改为只铺弹跳区宽度：
  - 左起 `leftX = -halfW + 6 = -274`，右到 `rightX = vInnerX = 228`。
  - `binW = (rightX - leftX) / n`，`n = exitValues.length`（12）。
  - 第 `i` 格中心 `cx = leftX + binW * (i + 0.5)`。
  - 出口格底盒、分隔条、出口弹片（含 `ExitTag` 传感器）均按新 `cx` 创建，父节点 `bounceArea`。
  - `this.binW` 记录新 `binW`，供 `highlightBins` 使用。

## 6. 发射区（launchArea）内容与边界

新增 `buildLaunchArea(parent)`，`parent` 为 `launchArea` 节点。把 `buildBoard` 中发射通道相关代码整体搬入，坐标不变（本就在 228–280）：

- 管身描边（`tube` 节点 + `strokePath` + 内外壁轮廓 + 出口喇叭口）。
- 4 段 `addBox` 管壁（竖直内外壁、水平顶底壁），父节点改 `launchArea`。
- 2 段 `addArcWall` 弯角圆弧，父节点改 `launchArea`。
- 发射杆 `plunger`（位于 `laneCX=254`）。
- 弹珠出生点坐标 `laneCX=254`、`launchY` 仅作为引用保留（实际弹珠在 `spawnBall` 动态创建，挂 `board`）。

`buildBoard` 中保留：背景 `back`、拱门 `arch`、四周边墙、分隔线；随后调用 `buildBounceArea(this.bounceArea)` 与 `buildLaunchArea(this.launchArea)`。

## 7. 删除项

- 移除顶部标题 `makeLabel(this.board, '弹珠乐园', 30, ...)`（及其 `setPosition` / `layer` 设置，约 `PinballGame.ts` 154–157 行）。

## 8. 需同步修改的逻辑点

- `addBox(parent, ...)` / `addCircle(parent, ...)` / `addArcWall(...)`：增加/改用 `parent` 参数，分别挂到对应功能组节点。
- `buildExits()`：合并进 `buildBounceArea`，出口 `binW` 与 `cx` 改用弹跳区宽度（见 §5）。
- `resolveByPosition()`：落点反算必须与 `buildExits` 同源：
  - `binW = (228 - (-274)) / n`（`n=12`）。
  - 左偏移 `leftX = -274`。
  - `idx = Math.round((x - leftX) / binW - 0.5)`，再 `clamp(0, n-1)`。
- `spawnBall()` / `returnBallToPlunger()`：仍用 `laneCX=254`（属发射区），逻辑不变，仅节点归属调整（弹珠挂 `board`，不挂 `launchArea`）。

## 9. 物理安全性

本次改动只是**节点层级重组 + 两处绘制坐标收边**，没有任何节点旋转，2D 碰撞体世界坐标完全不变 → 现有弹珠仿真、出管判定、出口结算逻辑不受影响。

## 10. 测试 / 验收

- 运行预览：机台正常显示，顶部无"弹珠乐园"文案。
- 弹跳区内容（钉板、倍率 LED、出口格）全部位于 `x < 228`，不与发射通道竖条视觉重叠。
- 发射通道管身/发射杆仍在右侧 `x ∈ [228, 280]`。
- `x=228` 处可见细分隔线。
- 完整跑一局：开始 → 加珠 → 蓄力发射 → 弹珠出管落入出口 → 按真实落点结算 → 结果面板，流程与改动前一致。
- 控制台无 `Missing class` / 组件丢失警告。

## 11. 范围外（本次不做）

- 不接真实 3D 旋转板（方案 B）。
- 不改倍率分布、出口倍率值、物理参数、经济数值。
- 不加裁剪 Mask（方案 B 的"双保险"未采纳）。
- 不调整机台外壳视觉风格。
