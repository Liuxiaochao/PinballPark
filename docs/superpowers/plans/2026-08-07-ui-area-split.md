# 界面按功能区域划分（弹跳区 / 发射区）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `PinballGame` 的机台界面拆成「弹跳区 bounceArea」与「发射区 launchArea」两个独立节点组，弹跳区内容（钉板/倍率/出口）全部落在 `x < 228`，不再越界到发射通道竖条（`x ∈ [228,280]`），并删除顶部「弹珠乐园」文案。

**Architecture:** 在 `board` 节点下新增两个子组节点 `bounceArea` / `launchArea`；把原本平铺在 `buildBoard()` 里的钉板/倍率/出口代码抽取为 `buildBounceArea()`，发射通道代码抽取为 `buildLaunchArea()`，分别挂到对应组。倾斜仍由「重力分量(物理) + 相机透视(视觉)」表达，节点不旋转，2D 碰撞体世界坐标不变 → 物理仿真不受影响。

**Tech Stack:** Cocos Creator 3.x TypeScript（`assets/scripts/PinballGame.ts`）、Graphics 绘制、RigidBody2D/Collider2D。

## Global Constraints

- 倾斜由 `ps.gravity = new Vec2(0, m.gravity * Math.sin(tilt))`（物理）+ 透视相机（视觉）表达；**不旋转任何节点**，否则 2D 物理布局会被投影压扁。
- 弹跳区内容右边界 = 发射通道内壁 `x = 228`；发射区占据 `x ∈ [228, 280]`。
- `addBox` 已接收 `parent` 参数；`addArcWall` 需新增 `parent` 参数。
- 出口 `binW` 与 `resolveByPosition` 落点反算必须同源：左起 `leftX = -halfW + 6 = -274`，右到 `228`，`binW = (228 - leftX) / n`。
- 数值/倍率/物理参数一律不改（见 spec §11 范围外）。
- 本次**不提交 git**（用户要求）：每个任务末尾的提交步骤省略，由用户统一提交。

---

### Task 1: 脚手架 — 新增组节点、删除标题、加分隔线

**Files:**
- Modify: `assets/scripts/PinballGame.ts`（字段声明、`buildBoard()`、`init()`）

**Interfaces:**
- Consumes: 现有 `buildBoard()` / `init()` 结构。
- Produces: 字段 `bounceArea` / `launchArea`；`buildBoard()` 末尾预留 `this.buildBounceArea()` 与 `this.buildLaunchArea()` 调用点（方法在后续任务实现，本任务先不调用以免编译失败）。

- [ ] **Step 1: 新增字段声明**

在 `PinballGame` 类的私有字段区（`private board!: Node;` 附近）新增：

```ts
  private bounceArea!: Node;
  private launchArea!: Node;
```

- [ ] **Step 2: 在 `buildBoard()` 中创建两个组节点 + 分隔线，并删除标题**

`buildBoard()` 现有开头创建 `this.board` 并 `addChild(back)`（约 110–135 行）。在 `this.board.addChild(back);` 之后插入组节点与分隔线：

```ts
    this.board.addChild(back);

    // 两个功能组：弹跳区 / 发射区（内容最后分别由 buildBounceArea / buildLaunchArea 填充）
    this.bounceArea = new Node('bounceArea');
    this.bounceArea.layer = GAME_LAYER;
    this.board.addChild(this.bounceArea);
    this.launchArea = new Node('launchArea');
    this.launchArea.layer = GAME_LAYER;
    this.board.addChild(this.launchArea);

    // 两区视觉分隔线（x=228，即发射通道内壁）
    const sep = new Node('areaDivider');
    sep.layer = GAME_LAYER;
    this.board.addChild(sep);
    const sg = sep.addComponent(Graphics);
    sg.lineWidth = 2;
    sg.strokeColor = new Color(125, 145, 195, 90);
    sg.moveTo(228, -halfH);
    sg.lineTo(228, halfH - 60);
    sg.stroke();
```

- [ ] **Step 3: 删除顶部「弹珠乐园」标题**

删除 `buildBoard()` 中以下代码（约 154–157 行）：

```ts
    const title = makeLabel(this.board, '弹珠乐园', 30, new Color(255, 210, 60));
    title.node.setPosition(0, halfH - 66, 1);
    title.node.layer = GAME_LAYER;
```

- [ ] **Step 4: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: 无报错（`buildBounceArea` / `buildLaunchArea` 尚未调用；其余内联内容保留，编译通过）。

---

### Task 2: 抽取钉板 + 倍率 LED 到 `buildBounceArea()`

**Files:**
- Modify: `assets/scripts/PinballGame.ts`（`buildBoard()` 内钉板/倍率段、`buildBoard()` 末尾、`buildBounceArea()` 新增）

**Interfaces:**
- Consumes: 字段 `this.laneCX`（在 `buildBoard()` 中于发射通道几何计算处赋值，见原 188 行 `this.laneCX = laneCX;`）、`GAME_LAYER`、`makePanel` / `makeLabel` / `addCircle`。
- Produces: 方法 `buildBounceArea()`；`this.multLed` 在组节点下创建。

- [ ] **Step 1: 从 `buildBoard()` 删除钉板与倍率 LED 内联代码，改为调用 `buildBounceArea()`**

删除 `buildBoard()` 中以下两段（约 283–307 行）：

```ts
    // 钉阵
    const pegColor = new Color(196, 206, 235);
    const fieldL = -halfW + 46;
    const fieldR = laneCX - tubeW / 2 - 20;
    const fieldB = -halfH + m.height * 0.42;
    const fieldT = halfH - 270;
    const colStep = (fieldR - fieldL) / (m.pegCols - 1);
    const rowStep = (fieldT - fieldB) / (m.pegRows - 1);
    for (let r = 0; r < m.pegRows; r++) {
      const y = fieldB + r * rowStep;
      const offset = (r % 2) * (colStep / 2);
      for (let c = 0; c < m.pegCols; c++) {
        const x = fieldL + c * colStep + offset;
        if (x > fieldR) continue;
        this.addCircle(this.board, x, y, m.pegRadius, pegColor);
      }
    }

    // 倍率显示（随倾斜组）
    const paytable = makePanel(this.board, W - 100, 52, new Color(12, 10, 12), 10);
    paytable.setPosition(0, -halfH + 110, 2);
    this.multLed = makeLabel(paytable, '×--', 30, new Color(255, 90, 60));
    this.multLed.node.setPosition(0, 0, 1);
    this.multLed.node.layer = GAME_LAYER;

    this.setLayerRec(this.board, GAME_LAYER);
```

- [ ] **Step 2: 在 `buildBoard()` 末尾（`setLayerRec` 之前或之后）调用 `buildBounceArea()`**

在 `buildBoard()` 最后（`this.setLayerRec(this.board, GAME_LAYER);` 这一行）替换为：

```ts
    this.buildBounceArea();
    this.setLayerRec(this.board, GAME_LAYER);
```

- [ ] **Step 3: 实现 `buildBounceArea()`（钉板 + 倍率 LED，倍率面板收进弹跳区）**

在 `buildBoard()` 方法之后新增：

```ts
  // 弹跳区：钉板 + 倍率 LED。所有内容右边界 < 发射通道内壁 228，不越界到发射区。
  private buildBounceArea() {
    const m = GameConfig.machine;
    const W = m.width;
    const halfW = W / 2;
    const halfH = m.height / 2;

    // 倍率 LED（本局倍数）：居中弹跳区，宽 480 → 右沿 ≈214 < 228，不落入发射通道
    const paytable = makePanel(this.bounceArea, 480, 52, new Color(12, 10, 12), 10);
    paytable.setPosition(-26, -halfH + 110, 2);
    this.multLed = makeLabel(paytable, '×--', 30, new Color(255, 90, 60));
    this.multLed.node.setPosition(0, 0, 1);
    this.multLed.node.layer = GAME_LAYER;

    // 钉板
    const pegColor = new Color(196, 206, 235);
    const tubeW = 52;
    const fieldL = -halfW + 46;
    const fieldR = this.laneCX - tubeW / 2 - 20;
    const fieldB = -halfH + m.height * 0.42;
    const fieldT = halfH - 270;
    const colStep = (fieldR - fieldL) / (m.pegCols - 1);
    const rowStep = (fieldT - fieldB) / (m.pegRows - 1);
    for (let r = 0; r < m.pegRows; r++) {
      const y = fieldB + r * rowStep;
      const offset = (r % 2) * (colStep / 2);
      for (let c = 0; c < m.pegCols; c++) {
        const x = fieldL + c * colStep + offset;
        if (x > fieldR) continue;
        this.addCircle(this.bounceArea, x, y, m.pegRadius, pegColor);
      }
    }
  }
```

- [ ] **Step 4: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: 无报错；钉板与倍率 LED 现在挂在 `bounceArea` 下，坐标与改动前一致（仅父节点改变）。

---

### Task 3: 合并出口到 `buildBounceArea()`，同步落点反算，删除 `buildExits()`

**Files:**
- Modify: `assets/scripts/PinballGame.ts`（`buildBounceArea()` 扩展、`buildExits()` 删除、`init()` 删除 `this.buildExits()` 调用、`resolveByPosition()` 更新）

**Interfaces:**
- Consumes: `GameConfig.exitValues`、`addBox`、`ExitTag`、`addCircle` 等。
- Produces: 出口格只铺弹跳区宽度；`this.binW` 记录新 `binW`；`resolveByPosition` 与出口布局同源。

- [ ] **Step 1: 在 `buildBounceArea()` 末尾追加出口格 + 出口弹片（只铺弹跳区宽度）**

把 `buildBounceArea()` 现有结尾（`}` 之前）扩展，加入出口逻辑（原 `buildExits()` 内容迁移，`cx` 与父节点改用弹跳区）：

```ts
    // 出口格 + 出口弹片：只铺弹跳区宽度（左 -274 → 右 228），不进入发射通道
    const n = GameConfig.exitValues.length;
    const leftX = -halfW + 6;   // -274
    const rightX = 228;          // 发射通道内壁
    const binW = (rightX - leftX) / n;
    this.binW = binW;
    for (let i = 0; i < n; i++) {
      const cx = leftX + binW * (i + 0.5);
      const bottom = this.addBox(this.bounceArea, cx, -halfH + 12, binW - 5, 24, new Color(54, 60, 96));
      this.setLayerRec(bottom, GAME_LAYER);
      const g = bottom.getComponent(Graphics)!;
      g.clear();
      g.fillColor = new Color(54, 60, 96);
      g.roundRect(-(binW - 5) / 2, -12, binW - 5, 24, 8);
      g.fill();
      g.lineWidth = 1;
      g.strokeColor = new Color(180, 195, 235, 90);
      g.roundRect(-(binW - 5) / 2, -12, binW - 5, 24, 8);
      g.stroke();
      this.binGraphics.push(bottom);

      if (i > 0) {
        const divider = this.addBox(this.bounceArea, -halfW + 6 + binW * i, -halfH + 48, 5, 68, new Color(34, 39, 70));
        this.setLayerRec(divider, GAME_LAYER);
      }

      // 出口弹片（触发结算用传感器）
      const paddle = new Node('paddle');
      paddle.setPosition(cx, -halfH + 70, 1);
      const pg = paddle.addComponent(Graphics);
      pg.fillColor = new Color(60, 120, 180);
      pg.roundRect(-(binW - 12) / 2, -3, binW - 12, 6, 3);
      pg.fill();
      pg.fillColor = new Color(180, 230, 255);
      pg.circle(0, 0, 3);
      pg.fill();
      pg.fillColor = new Color(120, 180, 230);
      pg.circle(-(binW - 12) / 2 + 4, 0, 2);
      pg.fill();
      pg.circle((binW - 12) / 2 - 4, 0, 2);
      pg.fill();
      const pcol = paddle.addComponent(BoxCollider2D);
      pcol.sensor = true;
      pcol.size = new Size(binW - 12, 8);
      pcol.apply();
      const ptag = paddle.addComponent(ExitTag);
      ptag.index = i;
      ptag.multiplier = GameConfig.exitValues[i];
      paddle.layer = GAME_LAYER;
      this.setLayerRec(paddle, GAME_LAYER);
      this.bounceArea.addChild(paddle);
      this.paddleNodes.push(paddle);

      const val = GameConfig.exitValues[i];
      const lab = makeLabel(
        bottom,
        val > 0 ? `${val}` : '沉',
        16,
        val > 0 ? new Color(215, 222, 248) : new Color(190, 120, 120)
      );
      lab.node.setPosition(0, 30, 1);
      lab.node.layer = GAME_LAYER;
    }
```

- [ ] **Step 2: 删除 `buildExits()` 方法与 `init()` 中的调用**

删除 `buildExits()` 整个方法（约 313–382 行），并修改 `init()`：

```ts
  init(backend: MockBackend, onBack: () => void, boardParent: Node, hudParent: Node) {
    this.backend = backend;
    this.onBack = onBack;
    this.boardParent = boardParent;
    this.hudParent = hudParent;
    this.buildBoard();
    this.buildHud();
    this.enterIdle();
  }
```

- [ ] **Step 3: 更新 `resolveByPosition()` 落点反算，与出口布局同源**

将 `resolveByPosition()` 改为：

```ts
  private resolveByPosition() {
    if (this.resolved || !this.ball) return;
    const m = GameConfig.machine;
    const halfW = m.width / 2;
    const n = GameConfig.exitValues.length;
    const leftX = -halfW + 6;     // -274（与 buildBounceArea 同源）
    const binW = (228 - leftX) / n;
    const x = this.ball.position.x; // 机台本地坐标，与 buildBounceArea 中出口格坐标同源
    let idx = Math.round((x - leftX) / binW - 0.5);
    idx = Math.max(0, Math.min(n - 1, idx));
    this.resolveExit(idx, GameConfig.exitValues[idx]);
  }
```

- [ ] **Step 4: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: 无报错；出口现位于 `bounceArea` 下，最右格右沿 < 228。

---

### Task 4: 抽取发射通道到 `buildLaunchArea()`，给 `addArcWall` 加 parent 参数

**Files:**
- Modify: `assets/scripts/PinballGame.ts`（`buildBoard()` 内发射通道段、`buildLaunchArea()` 新增、`addArcWall()` 签名）

**Interfaces:**
- Consumes: 字段 `this.laneCX` / `this.launchY` / `this.plungerBaseY` / `this.plunger`；`GAME_LAYER`；`addBox` / `addArcWall`。
- Produces: 方法 `buildLaunchArea()`；`addArcWall(parent, ...)` 将圆弧碰撞体挂到 `launchArea`。

- [ ] **Step 1: 从 `buildBoard()` 删除发射通道内联代码，改为调用 `buildLaunchArea()`**

删除 `buildBoard()` 中发射通道整段（约 163–282 行：从 `// 发射通道：贴边 L 形弯管` 到发射杆 `this.plungerBaseY = -halfH + 78;` 之后），并在 `buildBoard()` 中 `this.buildBounceArea();` 之后追加：

```ts
    this.buildBounceArea();
    this.buildLaunchArea();
    this.setLayerRec(this.board, GAME_LAYER);
```

注意：`buildBoard()` 中原本设置 `this.laneCX` / `this.launchY` / `this.bendY` / `this.minExitPower` 的几何计算（约 166–266 行）需**保留在 `buildBoard()` 中**（`buildLaunchArea` 与 `spawnBall` 依赖这些值），只删除管身绘制/管壁碰撞体/发射杆的创建代码。

- [ ] **Step 2: 给 `addArcWall` 增加 `parent` 参数**

将 `addArcWall` 签名与内部 `addChild` 改为：

```ts
  private addArcWall(parent: Node, cx: number, cy: number, radius: number, a0: number, a1: number, thickness: number, _color: Color) {
    const rc = thickness / 2;
    const arcLen = Math.abs(a1 - a0) * radius;
    const count = Math.max(2, Math.ceil(arcLen / (rc * 1.3)) + 1);
    for (let i = 0; i <= count; i++) {
      const a = a0 + (a1 - a0) * (i / count);
      const n = new Node('arcSeg');
      n.setPosition(cx + radius * Math.cos(a), cy + radius * Math.sin(a), 0);
      const rb = n.addComponent(RigidBody2D);
      rb.type = ERigidBody2DType.Static;
      const col = n.addComponent(CircleCollider2D);
      col.radius = rc;
      col.apply();
      parent.addChild(n);
      n.layer = GAME_LAYER;
    }
  }
```

- [ ] **Step 3: 实现 `buildLaunchArea()`（发射通道管身/管壁/弯角/发射杆，全部挂 `launchArea`）**

在 `buildBounceArea()` 之后新增：

```ts
  // 发射区：发射通道（贴边 L 形弯管）+ 管壁碰撞体 + 发射杆。全部位于 x ∈ [228, 280]。
  private buildLaunchArea() {
    const m = GameConfig.machine;
    const W = m.width;
    const halfW = W / 2;
    const halfH = m.height / 2;
    const wall = m.wallThickness;
    const wallColor = new Color(46, 52, 86);

    const tubeW = 52;
    const wallT = 12;
    const botY = -halfH - wall;
    const topY = halfH - 60;
    const rightEdge = halfW;
    const vOuterX = rightEdge;
    const vInnerX = rightEdge - tubeW;
    const laneCX = (vOuterX + vInnerX) / 2;
    const hTopY = topY;
    const hBotY = topY - tubeW;
    const laneTopCY = (hTopY + hBotY) / 2;
    const exitX = 150;
    const innerR = 22;
    const Rc = tubeW / 2 + innerR;
    const outerR = Rc + tubeW / 2;
    const Cx = vInnerX - innerR;
    const Cy = hBotY - innerR;
    const bendStartY = Cy;
    const bendEndX = Cx;
    const tubeBody = new Color(19, 23, 44);
    const tubeHi = new Color(32, 38, 70);

    const tube = new Node('launchTube');
    tube.layer = GAME_LAYER;
    this.launchArea.addChild(tube);
    const tg = tube.addComponent(Graphics);
    const arcSeg = 16;
    const cl: Vec2[] = [new Vec2(laneCX, botY), new Vec2(laneCX, bendStartY)];
    for (let i = 0; i <= arcSeg; i++) {
      const a = (Math.PI / 2) * (i / arcSeg);
      cl.push(new Vec2(Cx + Rc * Math.cos(a), Cy + Rc * Math.sin(a)));
    }
    cl.push(new Vec2(exitX, laneTopCY));
    const strokePath = (w: number, col: Color) => {
      tg.lineWidth = w;
      tg.strokeColor = col;
      tg.moveTo(cl[0].x, cl[0].y);
      for (let i = 1; i < cl.length; i++) tg.lineTo(cl[i].x, cl[i].y);
      tg.stroke();
    };
    strokePath(tubeW, tubeBody);
    strokePath(tubeW - 16, tubeHi);
    const outline = new Color(125, 145, 195, 150);
    tg.lineWidth = 3;
    tg.strokeColor = outline;
    tg.moveTo(vOuterX, botY); tg.lineTo(vOuterX, bendStartY);
    for (let i = 0; i <= arcSeg; i++) {
      const a = (Math.PI / 2) * (i / arcSeg);
      if (i === 0) tg.moveTo(Cx + outerR * Math.cos(a), Cy + outerR * Math.sin(a));
      else tg.lineTo(Cx + outerR * Math.cos(a), Cy + outerR * Math.sin(a));
    }
    tg.lineTo(exitX, hTopY);
    tg.moveTo(vInnerX, botY); tg.lineTo(vInnerX, bendStartY);
    for (let i = 0; i <= arcSeg; i++) {
      const a = (Math.PI / 2) * (i / arcSeg);
      if (i === 0) tg.moveTo(Cx + innerR * Math.cos(a), Cy + innerR * Math.sin(a));
      else tg.lineTo(Cx + innerR * Math.cos(a), Cy + innerR * Math.sin(a));
    }
    tg.lineTo(exitX, hBotY);
    tg.stroke();
    tg.lineWidth = 4;
    tg.strokeColor = new Color(255, 196, 0, 180);
    tg.moveTo(exitX, laneTopCY - tubeW / 2 + 6); tg.lineTo(exitX - 26, laneTopCY - tubeW / 2 - 8);
    tg.moveTo(exitX, laneTopCY + tubeW / 2 - 6); tg.lineTo(exitX - 26, laneTopCY + tubeW / 2 + 8);
    tg.stroke();

    this.addBox(this.launchArea, vOuterX + wallT / 2, (botY + bendStartY) / 2, wallT, bendStartY - botY, wallColor);
    this.addBox(this.launchArea, vInnerX - wallT / 2, (botY + bendStartY) / 2, wallT, bendStartY - botY, wallColor);
    this.addBox(this.launchArea, (exitX + bendEndX) / 2, hTopY + wallT / 2, bendEndX - exitX, wallT, wallColor);
    this.addBox(this.launchArea, (exitX + bendEndX) / 2, hBotY - wallT / 2, bendEndX - exitX, wallT, wallColor);
    this.addArcWall(this.launchArea, Cx, Cy, innerR - wallT / 2, 0, Math.PI / 2, wallT, wallColor);
    this.addArcWall(this.launchArea, Cx, Cy, outerR + wallT / 2, 0, Math.PI / 2, wallT, wallColor);

    const plunger = new Node('plunger');
    plunger.addComponent(UITransform).setContentSize(tubeW - 16, 60);
    const pg = plunger.addComponent(Graphics);
    pg.fillColor = new Color(205, 130, 64);
    pg.roundRect(-(tubeW - 16) / 2, -30, tubeW - 16, 60, 12);
    pg.fill();
    pg.fillColor = new Color(128, 74, 40);
    pg.roundRect(-(tubeW - 16) / 2, 8, tubeW - 16, 18, 6);
    pg.fill();
    plunger.setPosition(laneCX, -halfH + 78, 0);
    this.launchArea.addChild(plunger);
    this.plunger = plunger;
    this.plungerBaseY = -halfH + 78;
  }
```

- [ ] **Step 4: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: 无报错；发射通道现位于 `launchArea` 下，坐标与改动前一致。

---

### Task 5: 整体验证（类型检查 + 预览核对）

**Files:**
- 验证：手动在 Cocos Creator 编辑器预览；`pytest tests/numeric -q`（确认数值逻辑未受影响）

- [ ] **Step 1: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: 无报错。

- [ ] **Step 2: 数值测试不受影响**

Run: `pytest tests/numeric -q`

Expected: 全绿（本改动未触碰数值/物理参数）。

- [ ] **Step 3: 编辑器预览核对清单**

在 Cocos Creator 中打开 `Main.scene` 并预览，逐项确认：
1. 机台正常显示，**顶部无「弹珠乐园」文案**。
2. 钉板、倍率 LED、出口格全部位于 `x < 228`，**不与右侧发射通道竖条视觉重叠**。
3. 倍率 LED 居中于弹跳区底部，右沿 < 228。
4. 出口格只铺弹跳区宽度（最右格右沿 < 228）；`x=228` 处可见细分隔线。
5. 发射通道管身/发射杆仍在右侧 `x ∈ [228, 280]`。
6. 完整跑一局：开始 → 加珠 → 按住蓄力 → 松开发射 → 弹珠出管落入出口 → 按真实落点结算 → 结果面板；流程与改动前一致。
7. 控制台无 `Missing class` / 组件丢失警告。

---

## Self-Review

**1. Spec coverage:**
- §3 节点层级 → Task 1（组节点）+ Task 2/3/4（bounce/launch 内容）。✓
- §4 边界（228 分界）→ Task 2（LED 收进）、Task 3（出口收进）、Task 4（发射区在 228–280）。✓
- §5 弹跳区（钉板/倍率/出口）→ Task 2 + Task 3。✓
- §6 发射区（管身/壁/弯角/发射杆）→ Task 4。✓
- §7 删除标题 → Task 1。✓
- §8 逻辑同步（addBox/addCircle/addArcWall parent、resolveByPosition 同源）→ Task 2/3/4。✓
- §9 物理安全性（不旋转节点）→ 全局约束声明。✓

**2. Placeholder scan:** 无 TBD/TODO；每个代码步骤均含完整实现。✓

**3. Type consistency:** `bounceArea` / `launchArea` 字段在 Task 1 声明，Task 2–4 使用；`buildBounceArea` / `buildLaunchArea` 在 Task 1 预留调用点、Task 2/4 实现；`addArcWall(parent, ...)` 在 Task 4 改签名且调用处同步传 `this.launchArea`；`resolveByPosition` 的 `leftX` / `binW` 与 `buildBounceArea` 同源。✓
