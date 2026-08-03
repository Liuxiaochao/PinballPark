// 对局闭环：机台（60° 后仰透视渲染）/ 发射通道（顶部圆角朝左出）/ 蓄力发射 /
// 本局倍数展示 / 出口结算 / 看视频×2 / 发卡 / 再来一局
import {
  _decorator,
  Component,
  Node,
  Vec2,
  Vec3,
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

@ccclass('PinballGame')
export class PinballGame extends Component {
  backend!: MockBackend;
  onBack!: () => void;

  private board!: Node;
  private boardParent!: Node;
  private hudParent!: Node;
  private ball: Node | null = null;
  private resolved = false;
  private waitLaunch = false;
  private roundId = 0;
  private currentMult = 0;
  private lastMult = 0;
  private lastBeads = 0;
  private lastCards = 0;
  private doubled = false;
  private binGraphics: Node[] = [];
  private binW = 0;
  private hudBeads!: Label;
  private multLed!: Label;
  private launchBtn!: Node;
  private powerBar!: Graphics;
  private plunger!: Node;
  private overlay: Node | null = null;

  // 蓄力状态
  private power = 0;
  private charging = false;
  private plungerBaseY = 0;
  private barWidth = 296;

  init(backend: MockBackend, onBack: () => void, boardParent: Node, hudParent: Node) {
    this.backend = backend;
    this.onBack = onBack;
    this.boardParent = boardParent;
    this.hudParent = hudParent;
    this.buildBoard();
    this.buildHud();
    this.startRound();
  }

  // ---------- 机台 ----------
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

    // 外框 + 背板（圆角，模拟机台厚度）
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
    // 面板顶部高光（渐隐条）
    bg.fillColor = new Color(34, 41, 74, 120);
    bg.roundRect(-halfW + 4, halfH - 160, W - 8, 130, 22);
    bg.fill();
    // 四角螺丝装饰
    bg.fillColor = new Color(150, 160, 205);
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) {
      bg.circle(sx * (halfW - wall / 2), sy * (halfH - wall / 2), 5);
      bg.fill();
    }
    this.board.addChild(back);

    // 顶部拱门（机台头部，圆顶）
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
    // LED 跑马灯点
    ag.fillColor = new Color(255, 210, 60, 220);
    for (let i = 0; i < 14; i++) {
      ag.circle(-halfW + 34 + i * ((W - 68) / 13), halfH - 103, 3);
      ag.fill();
    }
    this.board.addChild(arch);

    // 机台标题
    const title = makeLabel(this.board, '弹珠乐园', 30, new Color(255, 210, 60));
    title.node.setPosition(0, halfH - 66, 1);
    title.node.layer = GAME_LAYER;

    // 外墙（上 / 左 / 右 / 下）
    this.addBox(this.board, 0, halfH - 60 + wall / 2, W + wall * 2, wall, boardColor);
    this.addBox(this.board, -halfW - wall / 2, 0, wall, H, boardColor);
    this.addBox(this.board, halfW + wall / 2, 0, wall, H, boardColor);
    this.addBox(this.board, 0, -halfH - wall / 2 + 2, W + wall * 2, wall, boardColor);

    // ---------- 发射通道（右侧，顶部圆角朝左出） ----------
    const laneW = m.laneWidth;
    const laneTop = -halfH + H * m.laneTopRatio; // 通道顶部高度
    const laneX = halfW - laneW / 2; // 通道中心 x

    // 通道底板（圆角胶囊）
    const lane = new Node('lane');
    lane.addComponent(UITransform).setContentSize(laneW + 22, laneTop + halfH + 26);
    const lg = lane.addComponent(Graphics);
    lg.fillColor = new Color(19, 23, 44);
    lg.roundRect(-(laneW + 22) / 2, -26, laneW + 22, laneTop + halfH + 26, 16);
    lg.fill();
    lg.lineWidth = 2;
    lg.strokeColor = new Color(125, 145, 195, 140);
    lg.roundRect(-(laneW + 22) / 2 + 3, -23, laneW + 16, laneTop + halfH + 20, 13);
    lg.stroke();
    lane.setPosition(halfW, -halfH, 0);
    this.board.addChild(lane);

    // 内侧导墙（下段竖直）
    const laneInnerX = halfW - laneW - 10;
    const innerH = laneTop + halfH - 64;
    this.addBox(this.board, laneInnerX, (-halfH + 64 + laneTop) / 2, 14, innerH, boardColor);
    // 内墙顶圆头（纯装饰，无碰撞体）：弹珠沿通道上升后从圆角顶部向左弧线进场
    const cap = new Node('capTop');
    cap.setPosition(laneInnerX + 7, laneTop, 0);
    cap.addComponent(UITransform).setContentSize(28, 28);
    const capG = cap.addComponent(Graphics);
    capG.fillColor = boardColor;
    capG.circle(0, 0, 14);
    capG.fill();
    capG.lineWidth = 2;
    capG.strokeColor = new Color(170, 188, 228, 150);
    capG.circle(0, 0, 13);
    capG.stroke();
    this.board.addChild(cap);
    cap.layer = GAME_LAYER;

    // 通道顶部转向圆头（碰撞体）：弹珠上升擦过圆头左下侧，被硬性导向左方进入钉阵。
    // 位置/尺寸已按 60fps 弹道验证：接触点高于内墙顶，任何帧率都无法穿透（90px 直径）。
    const bumpR = 45;
    const bump = this.addCircle(
      this.board,
      halfW,
      laneTop + 86,
      bumpR,
      new Color(52, 60, 104)
    );
    const bumpG = bump.getComponent(Graphics)!;
    bumpG.lineWidth = 4;
    bumpG.strokeColor = new Color(185, 200, 240, 170);
    bumpG.circle(0, 0, bumpR - 2);
    bumpG.stroke();
    bumpG.fillColor = new Color(30, 35, 62);
    bumpG.circle(0, 0, bumpR - 14);
    bumpG.fill();

    // 通道底板（弹珠停靠位）
    this.addBox(this.board, laneX, -halfH + 38, laneW, 16, new Color(38, 44, 78));

    // 发射杆（蓄力时后拉）
    const plunger = new Node('plunger');
    plunger.addComponent(UITransform).setContentSize(laneW - 16, 64);
    const pg = plunger.addComponent(Graphics);
    pg.fillColor = new Color(205, 130, 64);
    pg.roundRect(-(laneW - 16) / 2, -32, laneW - 16, 64, 12);
    pg.fill();
    pg.fillColor = new Color(128, 74, 40);
    pg.roundRect(-(laneW - 16) / 2, 10, laneW - 16, 20, 6);
    pg.fill();
    pg.lineWidth = 2;
    pg.strokeColor = new Color(60, 32, 16, 160);
    pg.roundRect(-(laneW - 16) / 2, -32, laneW - 16, 64, 12);
    pg.stroke();
    plunger.setPosition(laneX, -halfH + 78, 0);
    this.board.addChild(plunger);
    this.plunger = plunger;
    this.plungerBaseY = -halfH + 78;

    // 弹簧装饰
    const spring = new Node('spring');
    spring.addComponent(UITransform).setContentSize(30, 86);
    const sg = spring.addComponent(Graphics);
    sg.lineWidth = 4;
    sg.strokeColor = new Color(205, 215, 240, 190);
    let sy = -10;
    for (let i = 0; i < 4; i++) {
      sg.moveTo(-9, sy);
      sg.lineTo(9, sy + 11);
      sg.lineTo(-9, sy + 22);
      sy += 22;
    }
    sg.stroke();
    spring.setPosition(laneX, -halfH + 50, 0);
    this.board.addChild(spring);

    // ---------- 钉阵 ----------
    const pegColor = new Color(196, 206, 235);
    const fieldL = -halfW + 46;
    const fieldR = laneInnerX - 20;
    const fieldB = -halfH + m.height * 0.42;
    // 顶部留出下落区（发射入口在左上，先自由下落再进钉阵）
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

    // ---------- 底部出口（12 格：圆角槽 + 倍率数字） ----------
    const n = GameConfig.exitValues.length;
    const binW = (W - 12) / n;
    this.binW = binW;
    for (let i = 0; i < n; i++) {
      const cx = -halfW + 6 + binW * (i + 0.5);
      const bottom = this.addBox(this.board, cx, -halfH + 12, binW - 5, 24, new Color(54, 60, 96));
      const g = bottom.getComponent(Graphics)!;
      g.clear();
      g.fillColor = new Color(54, 60, 96);
      g.roundRect(-(binW - 5) / 2, -12, binW - 5, 24, 8);
      g.fill();
      g.lineWidth = 1;
      g.strokeColor = new Color(180, 195, 235, 90);
      g.roundRect(-(binW - 5) / 2, -12, binW - 5, 24, 8);
      g.stroke();
      const tag = bottom.addComponent(ExitTag);
      tag.index = i;
      tag.multiplier = GameConfig.exitValues[i];
      this.binGraphics.push(bottom);

      // 格间分隔壁
      if (i > 0) {
        this.addBox(this.board, -halfW + 6 + binW * i, -halfH + 48, 5, 68, boardColor);
      }
      // 倍率数字
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

    this.setLayerRec(this.board, GAME_LAYER);
  }

  // ---------- HUD（正交相机，直立渲染） ----------
  private buildHud() {
    const W = GameConfig.designWidth;
    const H = GameConfig.designHeight;
    const hud = new Node('hud');
    this.hudParent.addChild(hud);

    const back = makeButton(hud, '返回', 130, 58, () => this.back(), Palette.panelHi);
    back.setPosition(-W / 2 + 88, H / 2 - 60, 50);

    this.hudBeads = makeLabel(hud, '', 24, Palette.text);
    this.hudBeads.node.setPosition(W / 2 - 130, H / 2 - 60, 50);

    // 本局倍数 LED 面板
    const led = makePanel(hud, 330, 112, new Color(14, 16, 32), 18);
    led.setPosition(0, H / 2 - 92, 50);
    const ledG = led.getComponent(Graphics)!;
    ledG.lineWidth = 2;
    ledG.strokeColor = new Color(255, 196, 0, 110);
    ledG.roundRect(-165, -56, 330, 112, 18);
    ledG.stroke();
    makeLabel(led, '本局倍数', 18, new Color(150, 160, 200)).node.setPosition(0, 30, 1);
    this.multLed = makeLabel(led, '×2', 44, new Color(255, 210, 60));
    this.multLed.node.setPosition(0, -18, 1);

    // 发射控制：按住蓄力，松开发射（无开始按钮，直接发射）
    const launch = makeButton(
      hud,
      '按住蓄力\n松开发射',
      330,
      118,
      () => {},
      new Color(30, 58, 110)
    );
    launch.setPosition(0, -H / 2 + 158, 50);
    const lbl = launch.getChildByName('label')!.getComponent(Label)!;
    lbl.fontSize = 24;
    lbl.lineHeight = 36;
    launch.on(Node.EventType.TOUCH_START, () => this.startCharge(), launch);
    launch.on(Node.EventType.TOUCH_END, () => this.releaseCharge(), launch);
    launch.on(Node.EventType.TOUCH_CANCEL, () => this.releaseCharge(), launch);
    this.launchBtn = launch;

    // 蓄力条
    const barW = 330;
    const barBg = makePanel(hud, barW, 16, new Color(8, 10, 20), 8);
    barBg.setPosition(0, -H / 2 + 96, 50);
    const fill = new Node('powerFill');
    fill.layer = Layers.Enum.UI_2D;
    fill.addComponent(UITransform).setContentSize(barW - 4, 12);
    this.powerBar = fill.addComponent(Graphics);
    barBg.addChild(fill);
    this.barWidth = barW - 6;
    this.updateChargeVisual();

    makeLabel(hud, '发射弹珠消耗 1 颗', 16, Palette.sub).node.setPosition(0, -H / 2 + 62, 50);
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

  private setLayerRec(node: Node, layer: number) {
    node.layer = layer;
    for (const c of node.children) this.setLayerRec(c, layer);
  }

  // ---------- 回合流程 ----------
  private startRound() {
    // 投珠：每局消耗 1 颗弹珠
    const bet = this.backend.spendBet();
    if (!bet.ok) {
      toast(this.hudParent, bet.msg);
      this.back();
      return;
    }

    this.resolved = false;
    this.doubled = false;
    this.waitLaunch = true;
    this.roundId++;

    const M = weightedPick(GameConfig.multiplierLevels, GameConfig.multiplierWeights);
    this.currentMult = M;
    this.lastMult = M;
    this.highlightBins(M);
    this.multLed.string = `×${M}`;
    this.updateHudBeads();
    this.spawnBall();
    this.launchBtn.active = true;
    this.launchBtn.setScale(1, 1, 1);
    this.power = 0;
    this.charging = false;
    this.plunger.setPosition(this.plunger.position.x, this.plungerBaseY, 0);
    this.updateChargeVisual();

    const myId = this.roundId;
    this.scheduleOnce(() => {
      if (this.roundId === myId && !this.resolved) this.resolveExit(-1, 0);
    }, 15);
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
    const laneX = m.width / 2 - m.laneWidth / 2;
    const y = -m.height / 2 + 110;

    const n = new Node('ball');
    n.setPosition(laneX, y, 0);
    n.addComponent(UITransform).setContentSize(m.ballRadius * 2, m.ballRadius * 2);
    const rb = n.addComponent(RigidBody2D);
    rb.type = ERigidBody2DType.Dynamic;
    rb.gravityScale = 1;
    rb.linearDamping = m.linearDamping;
    rb.bullet = true;
    const col = n.addComponent(CircleCollider2D);
    col.radius = m.ballRadius;
    (col as any).restitution = m.restitution;
    (col as any).friction = 0.2;
    // 监听开关在刚体上：不开启则 onBeginContact 永不触发（历史大坑）
    rb.enabledContactListener = true;
    col.apply();
    const g = n.addComponent(Graphics);
    g.fillColor = new Color(255, 224, 120);
    g.circle(0, 0, m.ballRadius);
    g.fill();
    g.lineWidth = 2;
    g.strokeColor = new Color(200, 150, 50, 200);
    g.circle(0, 0, m.ballRadius - 1);
    g.stroke();
    const ctrl = n.addComponent(BallController);
    ctrl.game = this;
    this.board.addChild(n);
    n.layer = GAME_LAYER;
    this.ball = n;
  }

  // ---------- 蓄力发射 ----------
  update(dt: number) {
    if (!this.charging) return;
    this.power = Math.min(1, this.power + dt / GameConfig.machine.chargeTime);
    this.updateChargeVisual();
  }

  private startCharge() {
    if (!this.waitLaunch || !this.ball) return;
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
    if (p < 0.04 || !this.waitLaunch || !this.ball) return;
    this.launch(p);
  }

  private updateChargeVisual() {
    const m = GameConfig.machine;
    const pull = this.power * m.plungerPull;
    this.plunger.setPosition(this.plunger.position.x, this.plungerBaseY - pull, 0);
    const g = this.powerBar;
    g.clear();
    const r = Math.round(80 + this.power * 175);
    const gg = Math.round(200 - this.power * 4);
    const b = Math.round(255 - this.power * 255);
    g.fillColor = new Color(r, gg, b, 255);
    const w = Math.max(2, Math.round(this.barWidth * this.power));
    g.fillRect(-this.barWidth / 2, -6, w, 12);
  }

  private launch(power: number) {
    if (!this.ball) return;
    this.waitLaunch = false;
    this.launchBtn.active = false;
    const m = GameConfig.machine;
    // 轻微左向速度：弹珠在通道内上升时自然越过内墙顶，从圆角顶部弧线进入钉阵
    const vx = -(30 + 10 * power) + (Math.random() * 2 - 1) * m.launchSpeedX;
    const vy = m.launchSpeedMin + (m.launchSpeedMax - m.launchSpeedMin) * power;
    const rb = this.ball.getComponent(RigidBody2D)!;
    rb.linearVelocity = new Vec2(vx, vy);
    // 发射杆回弹动画
    this.plunger.setPosition(this.plunger.position.x, this.plungerBaseY, 0);
    tween(this.plunger)
      .to(0.06, { scale: new Vec3(1.08, 0.94, 1) })
      .to(0.12, { scale: Vec3.ONE })
      .start();
  }

  resolveExit(index: number, multiplier: number) {
    if (this.resolved) return;
    this.resolved = true;
    const bet = GameConfig.bet.beadsPerRound;
    let beads = 0;
    let cards = 0;
    if (multiplier > 0) {
      beads = bet * multiplier;
      if (multiplier >= GameConfig.cardDropMultiplierThreshold) cards = 1;
    }
    this.lastBeads = beads;
    this.lastCards = cards;
    this.backend.settle(beads, cards);
    this.updateHudBeads();
    this.scheduleOnce(() => {
      if (this.ball) {
        this.ball.destroy();
        this.ball = null;
      }
    }, 0.25);
    this.showResult(beads, cards, multiplier, multiplier > 0);
  }

  private showResult(beads: number, cards: number, mult: number, allowDouble: boolean) {
    const W = GameConfig.designWidth;
    const H = GameConfig.designHeight;
    const ov = new Node('result');
    this.hudParent.addChild(ov);
    this.overlay = ov;

    makePanel(ov, W, H, new Color(0, 0, 0, 150), 0).setPosition(0, 0, 100);
    const panel = makePanel(ov, W - 120, 580, Palette.panel, 22);
    panel.setPosition(0, 0, 101);
    const pg = panel.getComponent(Graphics)!;
    pg.lineWidth = 2;
    pg.strokeColor = new Color(255, 196, 0, 100);
    pg.roundRect(-(W - 120) / 2, -290, W - 120, 580, 22);
    pg.stroke();

    const title = mult > 0 ? `命中！×${mult}` : GameConfig.sinkLabel;
    makeLabel(panel, title, 46, mult > 0 ? Palette.good : Palette.danger).node.setPosition(0, 220, 1);

    let line = mult > 0 ? `获得 ${beads} 颗弹珠` : '未中奖，弹珠已沉没';
    if (mult > 0 && cards > 0) line += `\n并获得 ${cards} 张积分卡`;
    makeLabel(panel, line, 30, Palette.text).node.setPosition(0, 130, 1);

    if (allowDouble) {
      const adBtn = makeButton(panel, '看视频 ×2', 380, 90, () => this.adDouble(), Palette.accent2);
      adBtn.setPosition(0, 20, 1);
    }
    const again = makeButton(panel, '再来一局', 380, 84, () => this.nextRound(), Palette.accent);
    again.setPosition(0, -90, 1);
    const shop = makeButton(panel, '去商城', 380, 78, () => this.back(), Palette.panelHi);
    shop.setPosition(0, -190, 1);
  }

  private adDouble() {
    if (this.lastBeads <= 0 || this.doubled) return;
    const r = this.backend.watchAdDouble();
    if (!r.ok) {
      toast(this.hudParent, r.msg);
      return;
    }
    this.backend.settle(this.lastBeads, 0);
    this.lastBeads *= 2;
    this.doubled = true;
    this.updateHudBeads();
    this.overlay?.destroy();
    this.overlay = null;
    this.showResult(this.lastBeads, this.lastCards, this.lastMult, false);
  }

  private nextRound() {
    if (this.ball) {
      this.ball.destroy();
      this.ball = null;
    }
    this.overlay?.destroy();
    this.overlay = null;
    if (this.backend.getState().beads < GameConfig.bet.beadsPerRound) {
      toast(this.hudParent, '弹珠不足');
      this.back();
      return;
    }
    this.startRound();
  }

  private back() {
    if (this.ball) {
      this.ball.destroy();
      this.ball = null;
    }
    this.overlay?.destroy();
    this.overlay = null;
    this.onBack();
  }

  private updateHudBeads() {
    const s = this.backend.getState();
    this.hudBeads.string = `弹珠 ${s.beads}`;
  }
}
