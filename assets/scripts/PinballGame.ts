// 机台主界面：整机一体、左侧抽屉、顶部领珠、底部控制台、吐票结算带
import {
  _decorator,
  Component,
  Node,
  Vec2,
  Vec3,
  Quat,
  Color,
  Size,
  Label,
  Graphics,
  UITransform,
  RigidBody2D,
  CircleCollider2D,
  BoxCollider2D,
  ERigidBody2DType,
  Layers,
  tween,
} from 'cc';
import { GameConfig, GAME_LAYER, weightedPick } from './GameConfig';
import { MockBackend } from './MockBackend';
import { makePanel, makeButton, makeLabel, toast, Palette } from './UI';
import { ExitTag } from './ExitTag';
import { BallController } from './BallController';

const { ccclass } = _decorator;

type MachineState = 'IDLE' | 'STARTING' | 'BET_READY' | 'CHARGING' | 'SIMULATING' | 'RESULT';

// 弹珠视觉改用 Graphics 直接绘制（见 createBallVisual）：不依赖 MeshRenderer/材质/顶点色，
// 规避本机 Cocos 构建里 mesh.reset 处理 colors 属性报 "Cannot read property 'compressed' of undefined" 的问题。


@ccclass('PinballGame')
export class PinballGame extends Component {
  backend!: MockBackend;
  onBack!: () => void;

  private boardParent!: Node;
  private hudParent!: Node;
  private board!: Node;
  private bounceArea!: Node;
  private launchArea!: Node;
  private ball: Node | null = null;
  private ballVisual: Node | null = null; // 弹珠视觉节点（UI_3D 透视相机渲染）
  private ballPips: Graphics | null = null; // 表面 pip 层（每帧按滚动角重画，公转 = 滚动）
  private rollAngle = 0;                  // 累积滚动角（弧度），pip 绕球心公转模拟滚动
  private ballZ = 17;                     // 球视觉抬到机台前方（朝相机 +z），避免与同平面机台 Graphics 互相覆盖
  private binGraphics: Node[] = [];
  private paddleNodes: Node[] = [];   // 各出口弹片（触发结算的传感器）
  private binW = 0;
  private state: MachineState = 'IDLE';
  private roundId = 0;
  resolved = false;
  private currentMult = 0;
  private lastMult = 0;
  private lastBeads = 0;
  private lastCards = 0;
  private lastBet = 0;
  private doubled = false;

  private beadsLabel!: Label;
  private cardsLabel!: Label;
  private claimLabel!: Label;
  private multLed!: Label;
  private betLabel!: Label;
  private expectedLabel!: Label;
  private startBtn!: Node;
  private addBtn!: Node;
  private launchBtn!: Node;
  private powerBar!: Graphics;
  private plunger!: Node;
  private plungerBaseY = 0;
  private barWidth = 320;
  private laneCX = 0;
  private launchY = 0;
  private bendY = 0;
  private minExitPower = 1;
  private reachedArc = false;
  private ballInExitZone = false;   // 球已进入底部出口区（接触过出口格或落到底部）
  private exitZoneTimer = 0;        // 进入出口区后的计时（用于超时兜底结算）
  private settleTimer = 0;          // 球低速静止计时（连续低速才判定落定）
  private power = 0;
  private charging = false;
  private touchStart = new Vec2();
  private cancelled = false;
  private resultTray: Node | null = null;
  private drawer: Node | null = null;

  init(backend: MockBackend, onBack: () => void, boardParent: Node, hudParent: Node) {
    this.backend = backend;
    this.onBack = onBack;
    this.boardParent = boardParent;
    this.hudParent = hudParent;
    this.buildBoard();
    this.buildHud();
    this.enterIdle();
  }

  // ---------- 机台主体 ----------
  private buildBoard() {
    const m = GameConfig.machine;
    const W = m.width;
    const H = m.height;
    const halfW = W / 2;
    const halfH = H / 2;
    const wall = m.wallThickness;
    const boardColor = new Color(46, 52, 86);

    this.board = new Node('board');
    this.boardParent.addChild(this.board);
    // 整机上移，给顶部状态栏与底部控制台留出清晰间距
    this.board.setPosition(0, 150, 0);

    const back = new Node('back');
    back.addComponent(UITransform).setContentSize(W + wall * 2, H + wall * 2);
    const bg = back.addComponent(Graphics);
    bg.fillColor = new Color(68, 76, 124);
    bg.roundRect(-halfW - wall, -halfH - wall, W + wall * 2, H + wall * 2, 44);
    bg.fill();
    bg.fillColor = new Color(34, 39, 70);
    bg.roundRect(-halfW - wall + 8, -halfH - wall + 8, W + wall * 2 - 16, H + wall * 2 - 16, 36);
    bg.fill();
    bg.fillColor = new Color(16, 19, 38);
    bg.roundRect(-halfW, -halfH, W, H, 26);
    bg.fill();
    bg.fillColor = new Color(34, 41, 74, 120);
    bg.roundRect(-halfW + 4, halfH - 160, W - 8, 130, 22);
    bg.fill();
    bg.fillColor = new Color(150, 160, 205);
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) {
      bg.circle(sx * (halfW - wall / 2), sy * (halfH - wall / 2), 5);
      bg.fill();
    }
    this.board.addChild(back);

    const arch = new Node('arch');
    arch.addComponent(UITransform).setContentSize(W, 118);
    const ag = arch.addComponent(Graphics);
    ag.fillColor = new Color(22, 26, 50);
    ag.roundRect(-halfW, halfH - 118, W, 118, 56);
    ag.fill();
    ag.lineWidth = 3;
    ag.strokeColor = new Color(255, 196, 0, 130);
    ag.roundRect(-halfW + 6, halfH - 112, W - 12, 106, 50);
    ag.stroke();
    ag.fillColor = new Color(255, 210, 60, 220);
    for (let i = 0; i < 14; i++) {
      ag.circle(-halfW + 34 + i * ((W - 68) / 13), halfH - 103, 3);
      ag.fill();
    }
    this.board.addChild(arch);

    // 两个功能组：弹跳区 / 发射区（内容由 buildBounceArea / buildLaunchArea 填充）
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

    this.addBox(this.board, 0, halfH - 60 + wall / 2, W + wall * 2, wall, boardColor);
    this.addBox(this.board, -halfW - wall / 2, 0, wall, H, boardColor);
    this.addBox(this.board, halfW + wall / 2, 0, wall, H, boardColor);
    this.addBox(this.board, 0, -halfH - wall / 2 + 2, W + wall * 2, wall, boardColor);

    // 发射通道几何与发射逻辑所需字段在 buildLaunchArea 内计算（单一来源），此处仅按顺序构建两个功能组
    this.buildLaunchArea();
    this.buildBounceArea();
    this.setLayerRec(this.board, GAME_LAYER);
  }

  // 弹跳区：钉板 + 倍率 LED + 出口格 + 出口弹片。所有内容右边界 < 发射通道内壁 228，不越界到发射区。
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

      // 出口弹片（触发结算用传感器）：挂在每个出口开口处，球压过即触发结算并给出结果
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
  }

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

    // --- 弯管描边（管身：竖直 → 四分之一圆弧 → 水平 中心线） ---
    const tube = new Node('launchTube');
    tube.layer = GAME_LAYER;
    this.launchArea.addChild(tube);
    const tg = tube.addComponent(Graphics);
    const arcSeg = 16;
    const cl: Vec2[] = [new Vec2(laneCX, botY), new Vec2(laneCX, bendStartY)];
    for (let i = 0; i <= arcSeg; i++) {
      const a = (Math.PI / 2) * (i / arcSeg); // 0° → 90°：绕弯角圆心左转
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
    // 内外壁轮廓（圆角 L 形：竖直段 + 同心圆弧 + 水平段）
    const outline = new Color(125, 145, 195, 150);
    tg.lineWidth = 3;
    tg.strokeColor = outline;
    // 外（右墙 + 外侧圆弧 + 顶墙）
    tg.moveTo(vOuterX, botY); tg.lineTo(vOuterX, bendStartY);
    for (let i = 0; i <= arcSeg; i++) {
      const a = (Math.PI / 2) * (i / arcSeg);
      if (i === 0) tg.moveTo(Cx + outerR * Math.cos(a), Cy + outerR * Math.sin(a));
      else tg.lineTo(Cx + outerR * Math.cos(a), Cy + outerR * Math.sin(a));
    }
    tg.lineTo(exitX, hTopY);
    // 内（左墙 + 内侧圆弧 + 底墙）
    tg.moveTo(vInnerX, botY); tg.lineTo(vInnerX, bendStartY);
    for (let i = 0; i <= arcSeg; i++) {
      const a = (Math.PI / 2) * (i / arcSeg);
      if (i === 0) tg.moveTo(Cx + innerR * Math.cos(a), Cy + innerR * Math.sin(a));
      else tg.lineTo(Cx + innerR * Math.cos(a), Cy + innerR * Math.sin(a));
    }
    tg.lineTo(exitX, hBotY);
    tg.stroke();
    // 出口喇叭口（朝左，提示弹珠水平飞出）
    tg.lineWidth = 4;
    tg.strokeColor = new Color(255, 196, 0, 180);
    tg.moveTo(exitX, laneTopCY - tubeW / 2 + 6); tg.lineTo(exitX - 26, laneTopCY - tubeW / 2 - 8);
    tg.moveTo(exitX, laneTopCY + tubeW / 2 - 6); tg.lineTo(exitX - 26, laneTopCY + tubeW / 2 + 8);
    tg.stroke();

    // --- 弯管物理墙体（圆角 L 形：竖直内外壁 + 圆弧内外壁 + 水平顶底壁；通道净宽始终 = tubeW） ---
    this.addBox(this.launchArea, vOuterX + wallT / 2, (botY + bendStartY) / 2, wallT, bendStartY - botY, wallColor);
    this.addBox(this.launchArea, vInnerX - wallT / 2, (botY + bendStartY) / 2, wallT, bendStartY - botY, wallColor);
    this.addBox(this.launchArea, (exitX + bendEndX) / 2, hTopY + wallT / 2, bendEndX - exitX, wallT, wallColor);
    this.addBox(this.launchArea, (exitX + bendEndX) / 2, hBotY - wallT / 2, bendEndX - exitX, wallT, wallColor);
    this.addArcWall(this.launchArea, Cx, Cy, innerR - wallT / 2, 0, Math.PI / 2, wallT, wallColor);
    this.addArcWall(this.launchArea, Cx, Cy, outerR + wallT / 2, 0, Math.PI / 2, wallT, wallColor);

    // 发射杆（蓄力时后拉）
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

    // 发射逻辑所需几何（与 buildBounceArea 共用 this.laneCX；minExitPower 由物理反解）
    this.laneCX = laneCX;
    this.launchY = -halfH + 110;
    this.bendY = bendStartY;
    const g = -m.gravity;
    const vyNeed = Math.sqrt(2 * g * (this.bendY - this.launchY));
    this.minExitPower = Math.max(
      0,
      Math.min(1, ((vyNeed - m.launchSpeedMin) / (m.launchSpeedMax - m.launchSpeedMin)) * 1.05)
    );
  }

  // ---------- HUD / 机台外壳 ----------
  private buildHud() {
    const W = GameConfig.designWidth;
    const H = GameConfig.designHeight;
    const hud = new Node('hud');
    this.hudParent.addChild(hud);

    // 顶部状态行
    const top = makePanel(hud, W - 36, 76, Palette.panel, 16);
    top.setPosition(0, H / 2 - 64, 40);
    this.beadsLabel = makeLabel(top, '', 24, Palette.text);
    this.beadsLabel.node.setPosition(-150, 0, 1);
    this.cardsLabel = makeLabel(top, '', 22, new Color(210, 190, 255));
    this.cardsLabel.node.setPosition(10, 0, 1);
    this.claimLabel = makeLabel(top, '', 16, Palette.accent2);
    this.claimLabel.node.setPosition(180, 0, 1);
    top.on(Node.EventType.TOUCH_END, () => this.claimBeads(), top);

    // 左抽屉触发边
    const drawerBtn = makeButton(hud, '菜单', 72, 92, () => this.toggleDrawer(), Palette.panelHi);
    drawerBtn.setPosition(-W / 2 + 48, 0, 40);

    // 底部控制台：下沉到屏幕底部，与上方机台/落球出口留足间距
    const deck = makePanel(hud, W - 36, 280, Palette.panel, 18);
    deck.setPosition(0, -H / 2 + 140, 40);
    this.betLabel = makeLabel(deck, '', 26, Palette.text);
    this.betLabel.node.setPosition(-230, 80, 1);
    this.expectedLabel = makeLabel(deck, '', 20, Palette.sub);
    this.expectedLabel.node.setPosition(-230, 45, 1);

    this.startBtn = makeButton(deck, '开始游戏', 300, 84, () => this.startRound(), Palette.accent);
    this.startBtn.setPosition(0, -30, 1);

    this.addBtn = makeButton(deck, '加珠 +1', 170, 80, () => this.addBead(), Palette.accent2);
    this.addBtn.setPosition(-128, -30, 1);

    this.launchBtn = makeButton(deck, '按住拉杆\n松开发射', 300, 80, () => {}, Palette.accent);
    this.launchBtn.setPosition(142, -30, 1);
    this.launchBtn.on(Node.EventType.TOUCH_START, (e: any) => {
      const p = e.getUILocation() as Vec2;
      this.touchStart.set(p.x, p.y);
      this.cancelled = false;
      this.startCharge();
    }, this.launchBtn);
    this.launchBtn.on(Node.EventType.TOUCH_MOVE, (e: any) => {
      const p = e.getUILocation() as Vec2;
      const dx = p.x - this.touchStart.x;
      const dy = p.y - this.touchStart.y;
      if (dx * dx + dy * dy > 120 * 120) this.cancelled = true;
    }, this.launchBtn);
    this.launchBtn.on(Node.EventType.TOUCH_END, () => this.releaseCharge(), this.launchBtn);
    this.launchBtn.on(Node.EventType.TOUCH_CANCEL, () => this.releaseCharge(), this.launchBtn);

    // 蓄力条：内嵌在控制台底部，避免与面板分离重叠
    const barW = 330;
    const barBg = makePanel(deck, barW, 14, new Color(8, 10, 20), 7);
    barBg.setPosition(0, -110, 1);
    const fill = new Node('powerFill');
    fill.layer = Layers.Enum.UI_2D;
    fill.addComponent(UITransform).setContentSize(barW - 4, 10);
    this.powerBar = fill.addComponent(Graphics);
    barBg.addChild(fill);
    this.barWidth = barW - 6;
    this.updateChargeVisual();
  }

  private addBox(parent: Node, x: number, y: number, w: number, h: number, color: Color): Node {
    const n = new Node('box');
    n.setPosition(x, y, 0);
    n.addComponent(UITransform).setContentSize(w, h);
    const rb = n.addComponent(RigidBody2D);
    rb.type = ERigidBody2DType.Static;
    const col = n.addComponent(BoxCollider2D);
    col.size = new Size(w, h);
    col.apply();
    const g = n.addComponent(Graphics);
    g.fillColor = color;
    g.fillRect(-w / 2, -h / 2, w, h);
    parent.addChild(n);
    n.layer = GAME_LAYER;
    return n;
  }

  private addCircle(parent: Node, x: number, y: number, r: number, color: Color): Node {
    const n = new Node('peg');
    n.setPosition(x, y, 0);
    n.addComponent(UITransform).setContentSize(r * 2, r * 2);
    const rb = n.addComponent(RigidBody2D);
    rb.type = ERigidBody2DType.Static;
    const col = n.addComponent(CircleCollider2D);
    col.radius = r;
    col.apply();
    const g = n.addComponent(Graphics);
    g.fillColor = color;
    g.circle(0, 0, r);
    g.fill();
    parent.addChild(n);
    n.layer = GAME_LAYER;
    return n;
  }

  // 沿圆弧铺设一串重叠的静态圆形碰撞体，构成光滑的弯管圆弧墙体（圆对圆永远光滑，无分段盒棱角）。
  // radius 是「圆心所在半径」：调用方已按 直墙内面所在半径 ± thickness/2 传入，保证圆弧与直墙在衔接处对齐。
  // 仅建物理碰撞体、不画图形，避免视觉噪点（管身由上方 Graphics 描边统一渲染）。
  private addArcWall(parent: Node, cx: number, cy: number, radius: number, a0: number, a1: number, thickness: number, _color: Color) {
    const rc = thickness / 2;
    const arcLen = Math.abs(a1 - a0) * radius;
    const count = Math.max(2, Math.ceil(arcLen / (rc * 1.3)) + 1); // 间距 < 直径，保证圆与圆重叠无缺口
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

  private setLayerRec(node: Node, layer: number) {
    node.layer = layer;
    for (const c of node.children) this.setLayerRec(c, layer);
  }

  // ---------- 状态机 ----------
  private enterIdle() {
    this.state = 'IDLE';
    this.clearRound();
    this.startBtn.active = true;
    this.addBtn.active = false;
    this.launchBtn.active = false;
    this.multLed.string = '×--';
    this.betLabel.string = `投入 ${GameConfig.bet.beadsPerRound}`;
    this.expectedLabel.string = '预计得珠 --';
    this.highlightBins(-1);
    this.updateHud();
  }

  private startRound() {
    if (this.state !== 'IDLE' && this.state !== 'RESULT') return;
    const r = this.backend.beginRound();
    if (!r.ok) {
      toast(this.hudParent, r.msg);
      this.enterIdle();
      return;
    }
    this.state = 'STARTING';
    this.startBtn.active = false;
    this.addBtn.active = false;
    this.launchBtn.active = false;
    this.resolved = false;
    this.doubled = false;
    this.roundId++;
    this.currentMult = weightedPick(GameConfig.multiplierLevels, GameConfig.multiplierWeights);
    this.lastMult = this.currentMult;
    this.highlightBins(this.currentMult);
    this.multLed.string = `×${this.currentMult}`;
    this.spawnBall();
    this.enterBetReady();
  }

  private enterBetReady() {
    this.state = 'BET_READY';
    this.startBtn.active = false;
    this.addBtn.active = true;
    this.launchBtn.active = true;
    this.launchBtn.setScale(1, 1, 1);
    this.power = 0;
    this.charging = false;
    this.cancelled = false;
    if (this.plunger) this.plunger.setPosition(this.plunger.position.x, this.plungerBaseY, 0);
    this.updateBetLabels();
    this.updateChargeVisual();
  }

  private addBead() {
    if (this.state !== 'BET_READY') return;
    const r = this.backend.addBeads();
    if (!r.ok) {
      toast(this.hudParent, r.msg);
      return;
    }
    this.updateBetLabels();
    this.updateHud();
  }

  private updateBetLabels() {
    const active = this.backend.getActiveBet();
    this.betLabel.string = `投入 ${active}`;
    this.expectedLabel.string = `预计得珠 ${active * this.currentMult}`;
  }

  private startCharge() {
    if (this.state !== 'BET_READY' || !this.ball) return;
    this.charging = true;
    this.power = 0;
    this.updateChargeVisual();
  }

  private releaseCharge() {
    if (!this.charging) return;
    this.charging = false;
    const p = this.power;
    this.power = 0;
    this.updateChargeVisual();
    if (this.state !== 'BET_READY' || !this.ball) return;
    if (this.cancelled || p < 0.03) {
      this.cancelled = false;
      this.enterBetReady();
      toast(this.hudParent, '已取消发射');
      return;
    }
    this.launch(p);
  }

  private updateChargeVisual() {
    if (!this.powerBar) return;
    const m = GameConfig.machine;
    const pull = this.power * m.plungerPull;
    if (this.plunger) this.plunger.setPosition(this.plunger.position.x, this.plungerBaseY - pull, 0);
    const g = this.powerBar;
    g.clear();
    let col: Color;
    if (this.power < this.minExitPower) {
      col = new Color(196, 72, 72); // 蓄力不足：弹珠出不了弯管
    } else {
      const r = Math.round(90 + this.power * 165);
      const gg = Math.round(214 - this.power * 34);
      const b = Math.round(120 - this.power * 120);
      col = new Color(r, gg, b, 255);
    }
    g.fillColor = col;
    const w = Math.max(2, Math.round(this.barWidth * this.power));
    g.fillRect(-this.barWidth / 2, -6, w, 12);
  }

  private launch(power: number) {
    if (!this.ball) return;
    this.state = 'SIMULATING';
    this.reachedArc = false;
    this.ballInExitZone = false;
    this.exitZoneTimer = 0;
    this.settleTimer = 0;
    this.launchBtn.active = false;
    this.addBtn.active = false;
    const m = GameConfig.machine;
    const rb = this.ball.getComponent(RigidBody2D)!;
    rb.gravityScale = 1; // 发射后恢复重力
    const vx = -(12 + 6 * power) + (Math.random() * 2 - 1) * m.launchSpeedX;
    const vy = m.launchSpeedMin + (m.launchSpeedMax - m.launchSpeedMin) * power;
    rb.linearVelocity = new Vec2(vx, vy);
    this.plunger.setPosition(this.plunger.position.x, this.plungerBaseY, 0);
    tween(this.plunger)
      .to(0.06, { scale: new Vec3(1.08, 0.94, 1) })
      .to(0.12, { scale: Vec3.ONE })
      .start();
  }

  private highlightBins(M: number) {
    for (let i = 0; i < this.binGraphics.length; i++) {
      const g = this.binGraphics[i].getComponent(Graphics)!;
      g.clear();
      const val = GameConfig.exitValues[i];
      const col =
        val === M
          ? new Color(255, 196, 0)
          : val === 0
          ? new Color(120, 60, 60)
          : new Color(54, 60, 96);
      g.fillColor = col;
      g.roundRect(-(this.binW - 5) / 2, -12, this.binW - 5, 24, 8);
      g.fill();
      g.lineWidth = val === M ? 3 : 1;
      g.strokeColor = val === M ? new Color(255, 240, 160, 230) : new Color(180, 195, 235, 90);
      g.roundRect(-(this.binW - 5) / 2, -12, this.binW - 5, 24, 8);
      g.stroke();
    }
  }

  private spawnBall() {
    const m = GameConfig.machine;
    const laneX = this.laneCX;
    const y = this.launchY;
    const n = new Node('ball');
    n.setPosition(laneX, y, 0);
    n.addComponent(UITransform).setContentSize(m.ballRadius * 2, m.ballRadius * 2);
    const rb = n.addComponent(RigidBody2D);
    rb.type = ERigidBody2DType.Dynamic;
    rb.gravityScale = 0; // 等待发射时不收重力，弹珠停在弹射平面上，不往下掉
    rb.linearDamping = m.linearDamping;
    rb.bullet = true;
    const col = n.addComponent(CircleCollider2D);
    col.radius = m.ballRadius;
    (col as any).restitution = m.restitution;
    (col as any).friction = 0.2;
    rb.enabledContactListener = true;
    col.apply();
    const ctrl = n.addComponent(BallController);
    ctrl.game = this;
    this.board.addChild(n);
    n.layer = GAME_LAYER;
    this.ball = n;
    // 弹珠视觉：独立节点挂 board 下；每帧跟随位置并按线速度滚动（pip 公转）
    this.ballVisual?.destroy();
    this.rollAngle = 0;
    this.ballVisual = this.createBallVisual();
    this.board.addChild(this.ballVisual);
  }

  // 生成弹珠视觉：用 Graphics 画「带光影的球体」（径向明暗 + 左上高光 + 描边），再单独一层画随滚动公转的 pip。
  // 不依赖 MeshRenderer/材质/贴图，纯 2D 绘制在 UI_3D 透视相机下也呈现立体球 + 滚动效果，且绝不崩
  // （规避 mesh.reset 在部分 Cocos 构建里对 colors 顶点色属性报 'compressed of undefined' 的坑）。
  private createBallVisual(): Node {
    const m = GameConfig.machine;
    const r = m.ballRadius;
    const grp = new Node('ballVisual');
    grp.layer = GAME_LAYER; // UI_3D，由透视相机渲染

    // 球体明暗层（画一次）：同心圆从外暗到内亮 + 左上高光 + 描边 → 立体球面
    const shade = grp.addComponent(Graphics);
    const bands = 10;
    for (let i = bands; i >= 1; i--) {
      const t = i / bands;
      const k = 0.28 + 0.72 * (1 - t); // 越靠边越暗
      shade.fillColor = new Color(255 * k, 214 * k, 92 * k);
      shade.circle(0, 0, r * (0.3 + 0.7 * t));
      shade.fill();
    }
    // 左上高光（固定光源方向，不随滚动移动 → 球面才有稳定立体感）
    shade.fillColor = new Color(255, 255, 255, 210);
    shade.circle(-r * 0.34, r * 0.34, r * 0.26);
    shade.fill();
    shade.lineWidth = 2;
    shade.strokeColor = new Color(200, 150, 50, 230);
    shade.circle(0, 0, r - 1);
    shade.stroke();

    // pip 层（每帧重画，按 rollAngle 公转 → 滚动/旋转感）
    const pips = new Node('ballPips');
    pips.layer = GAME_LAYER;
    this.ballPips = pips.addComponent(Graphics);
    grp.addChild(pips);
    this.drawBallPips();
    return grp;
  }

  // 在 pip 层按当前 rollAngle 画几个不同色小球，绕球心公转 → 明显的滚动/旋转效果
  private drawBallPips() {
    const g = this.ballPips;
    if (!g) return;
    const m = GameConfig.machine;
    const r = m.ballRadius;
    g.clear();
    const orbit = r * 0.52;
    const pipDefs: Array<{ c: Color; rr: number; base: number }> = [
      { c: new Color(196, 64, 38), rr: r * 0.26, base: 0 },
      { c: new Color(60, 84, 170), rr: r * 0.22, base: (Math.PI * 2) / 3 },
      { c: new Color(238, 238, 248), rr: r * 0.18, base: (Math.PI * 4) / 3 },
    ];
    for (const def of pipDefs) {
      const a = def.base + this.rollAngle;
      g.fillColor = def.c;
      g.circle(Math.cos(a) * orbit, Math.sin(a) * orbit, def.rr);
      g.fill();
    }
  }

  // 每帧：弹珠视觉跟随物理球位置；按线速度累积滚动角，并重画 pip 层（绕球心公转）模拟滚动/旋转
  private syncBallVisual(dt: number) {
    const b = this.ball;
    if (!b || !this.ballVisual) return;
    const m = GameConfig.machine;
    const p = b.position;
    this.ballVisual.setPosition(p.x, p.y, this.ballZ); // 抬到机台前方，避免被同平面机台 Graphics 覆盖
    const rb = b.getComponent(RigidBody2D);
    if (rb) {
      const v = rb.linearVelocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > 1e-3) {
        // 滚动角速度 = 线速度 / 半径；符号让 pip 朝运动反方向流动（自然滚动观感）
        this.rollAngle -= (speed / m.ballRadius) * dt;
        this.drawBallPips();
      }
    }
  }

  update(dt: number) {
    this.syncBallVisual(dt);
    if (!this.charging) {
      // 蓄力不足、弹珠没能冲出弯管（从未到达圆弧顶）而落回通道：退回发射杆，不结算、不结束
      if (this.state === 'SIMULATING' && this.ball) {
        if (this.ball.position.y > this.bendY) this.reachedArc = true;
        if (!this.reachedArc && this.ball.position.y < this.launchY) {
          this.returnBallToPlunger();
          return;
        }
        // 出管后进入底部出口区：等球基本静止再按“实际落点”结算，
        // 避免弹跳途中擦到邻格就误判命中，导致不管掉哪个出口都显示成功。
        if (this.reachedArc && this.ball.position.y < -GameConfig.machine.height / 2 + 90) {
          this.ballInExitZone = true;
        }
        if (this.ballInExitZone) {
          this.exitZoneTimer += dt;
          const rb = this.ball.getComponent(RigidBody2D);
          const speed = rb ? Math.hypot(rb.linearVelocity.x, rb.linearVelocity.y) : 0;
          if (speed < 50) this.settleTimer += dt;
          else this.settleTimer = 0;
          if (this.settleTimer > 0.2 || this.exitZoneTimer > 3) {
            this.resolveByPosition();
          }
        }
      }
      return;
    }
    this.power = Math.min(1, this.power + dt / GameConfig.machine.chargeTime);
    this.updateChargeVisual();
  }

  // 弱发射落回通道：弹珠退回发射杆，重新等待发射（不结算、不沉没、不结束本局）
  private returnBallToPlunger() {
    const b = this.ball;
    if (!b) return;
    const rb = b.getComponent(RigidBody2D)!;
    rb.gravityScale = 0; // 停住，不再下落
    rb.linearVelocity = Vec2.ZERO;
    b.setPosition(this.laneCX, this.launchY, 0);
    this.reachedArc = false;
    toast(this.hudParent, '蓄力不足，弹珠退回通道');
    this.enterBetReady();
  }

  // 球压过出口弹片时由 BallController 回调：以该弹片所在出口结算并给出结果，
  // 同时播放弹片下压反馈。弹片是每个出口专属的传感器，球压过即代表落入该出口，
  // 因此命中/沉没由真实落点决定，不会因弹跳擦到邻格而误判。
  resolveByPaddle(index: number, multiplier: number) {
    if (this.resolved) return;
    const p = this.paddleNodes[index];
    if (p && p.isValid) {
      p.setScale(1, 0.35, 1);
      this.scheduleOnce(() => { if (p.isValid) p.setScale(1, 1, 1); }, 0.15);
    }
    this.resolveExit(index, multiplier);
  }

  // 兜底：极少数情况球未压到任何弹片却停在底部时，按“实际落点 x 坐标”反推出口结算。
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

  resolveExit(index: number, multiplier: number) {
    if (this.resolved) return;
    this.resolved = true;
    const bet = this.backend.getActiveBet();
    const beads = multiplier > 0 ? bet * multiplier : 0;
    let cards = 0;
    if (multiplier > 0 && beads >= GameConfig.card.threshold) {
      cards = Math.min(GameConfig.card.maxPerRound, Math.floor(beads / GameConfig.card.threshold));
    }
    this.lastBet = bet;
    this.lastBeads = beads;
    this.lastCards = cards;
    this.backend.settle(beads, cards);
    this.updateHud();
    this.scheduleOnce(() => {
      if (this.ball) {
        this.ball.destroy();
        this.ball = null;
      }
      if (this.ballVisual) {
        this.ballVisual.destroy();
        this.ballVisual = null;
        this.ballPips = null;
      }
    }, 0.25);
    this.showResult(beads, cards, multiplier, multiplier > 0);
  }

  private showResult(beads: number, cards: number, mult: number, allowDouble: boolean) {
    this.state = 'RESULT';
    this.startBtn.active = false;
    this.addBtn.active = false;
    this.launchBtn.active = false;
    this.resultTray?.destroy();
    const W = GameConfig.designWidth;
    const H = GameConfig.designHeight;
    const tray = makePanel(this.hudParent, W - 44, 430, Palette.panel, 20);
    tray.setPosition(0, -H / 2 - 200, 60);
    this.resultTray = tray;
    tween(tray)
      .to(0.26, { position: new Vec3(0, -H / 2 + 340, 60) }, { easing: 'quadOut' })
      .start();

    const title = mult > 0 ? `命中！×${mult}` : GameConfig.sinkLabel;
    makeLabel(tray, title, 42, mult > 0 ? Palette.good : Palette.danger).node.setPosition(0, 160, 1);
    const line = mult > 0 ? `获得 ${beads} 颗弹珠` : `本局投入 ${this.lastBet} 颗已沉没`;
    makeLabel(tray, line, 28, Palette.text).node.setPosition(0, 86, 1);
    if (cards > 0) {
      makeLabel(tray, `+${cards} 张积分卡`, 24, new Color(210, 190, 255)).node.setPosition(0, 40, 1);
    }

    if (allowDouble) {
      const adBtn = makeButton(tray, '看视频 ×2', 360, 84, () => this.adDouble(), Palette.accent2);
      adBtn.setPosition(0, -30, 1);
    }
    const again = makeButton(tray, '再来一局', 360, 78, () => this.nextRound(), Palette.accent);
    again.setPosition(0, allowDouble ? -122 : -70, 1);
    const shop = makeButton(tray, '去商城', 360, 72, () => toast(this.hudParent, '商城后续版本开放'), Palette.panelHi);
    shop.setPosition(0, allowDouble ? -210 : -158, 1);
  }

  private adDouble() {
    if (this.state !== 'RESULT' || this.lastBeads <= 0 || this.doubled) return;
    const r = this.backend.watchAdDouble();
    if (!r.ok) {
      toast(this.hudParent, r.msg);
      return;
    }
    this.backend.settle(this.lastBeads, 0);
    this.lastBeads *= 2;
    this.doubled = true;
    this.updateHud();
    this.showResult(this.lastBeads, this.lastCards, this.lastMult, false);
  }

  private nextRound() {
    this.state = 'IDLE';
    this.clearRound();
    this.startRound();
  }

  private clearRound() {
    if (this.ball) {
      this.ball.destroy();
      this.ball = null;
    }
    if (this.ballVisual) {
      this.ballVisual.destroy();
      this.ballVisual = null;
      this.ballPips = null;
    }
    this.resultTray?.destroy();
    this.resultTray = null;
    this.resolved = false;
    this.ballInExitZone = false;
    this.exitZoneTimer = 0;
    this.settleTimer = 0;
    this.lastBeads = 0;
    this.lastCards = 0;
    this.lastBet = 0;
    this.power = 0;
    this.charging = false;
  }

  // ---------- 顶部领珠 ----------
  private claimBeads() {
    const r = this.backend.watchAdForBeads();
    toast(this.hudParent, r.msg);
    this.updateHud();
  }

  // ---------- 左抽屉 ----------
  private toggleDrawer() {
    if (this.state === 'CHARGING' || this.state === 'SIMULATING') return;
    if (this.drawer) {
      this.drawer.destroy();
      this.drawer = null;
      return;
    }
    const W = GameConfig.designWidth;
    const H = GameConfig.designHeight;
    const root = new Node('drawerRoot');
    this.hudParent.addChild(root);
    const mask = makePanel(root, W, H, new Color(0, 0, 0, 150), 0);
    mask.setPosition(0, 0, 80);
    mask.on(Node.EventType.TOUCH_END, () => this.closeDrawer(), mask);
    const panel = makePanel(root, 360, H - 120, Palette.panel, 18);
    panel.setPosition(-(W / 2 - 180), 0, 81);
    panel.on(Node.EventType.TOUCH_END, (e: any) => {
      e.propagationStopped = true;
    }, panel);
    makeLabel(panel, '机台菜单', 34, Palette.accent).node.setPosition(0, H / 2 - 130, 1);
    const entries = ['每日任务', '商城', '概率公示', '设置'];
    entries.forEach((name, i) => {
      const btn = makeButton(panel, name, 280, 84, () => {
        if (name === '概率公示') {
          this.showProbability();
        } else {
          toast(this.hudParent, `${name} 后续版本开放`);
        }
      }, Palette.panelHi);
      btn.setPosition(0, H / 2 - 240 - i * 110, 1);
    });
    const close = makeButton(panel, '关闭', 280, 80, () => this.closeDrawer(), Palette.accent);
    close.setPosition(0, -H / 2 + 130, 1);
    this.drawer = root;
  }

  private closeDrawer() {
    this.drawer?.destroy();
    this.drawer = null;
  }

  private showProbability() {
    const W = GameConfig.designWidth;
    const H = GameConfig.designHeight;
    const root = new Node('probability');
    this.hudParent.addChild(root);
    const mask = makePanel(root, W, H, new Color(0, 0, 0, 180), 0);
    mask.setPosition(0, 0, 90);
    mask.on(Node.EventType.TOUCH_END, () => root.destroy(), mask);
    const panel = makePanel(mask, W - 100, 720, Palette.panel, 18);
    panel.on(Node.EventType.TOUCH_END, (e: any) => {
      e.propagationStopped = true;
    }, panel);
    makeLabel(panel, '概率公示', 38, new Color(255, 210, 60)).node.setPosition(0, 310, 1);
    const lv = GameConfig.multiplierLevels;
    const wt = GameConfig.multiplierWeights;
    const total = wt.reduce((a, b) => a + b, 0);
    let lines = '倍率      出现概率\n';
    for (let i = 0; i < lv.length; i++) {
      lines += `×${lv[i]}\t\t${((wt[i] / total) * 100).toFixed(1)}%\n`;
    }
    lines += '\n底部出口：10 个倍率格 + 2 个暗口(沉没)';
    makeLabel(panel, lines, 26, Palette.text).node.setPosition(0, 40, 1);
    makeButton(panel, '关闭', 240, 80, () => root.destroy(), Palette.accent).setPosition(0, -300, 1);
  }

  private updateHud() {
    const s = this.backend.getState();
    this.beadsLabel.string = `弹珠 ${s.beads}`;
    this.cardsLabel.string = `积分卡 ${s.cards}`;
    this.claimLabel.string = `领珠 +${GameConfig.bead.videoReward} (${s.videoRedeemToday}/${GameConfig.bead.maxVideoRedeemPerDay})`;
  }
}
