// 机台主界面：整机一体、左侧抽屉、顶部领珠、底部控制台、吐票结算带
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

type MachineState = 'IDLE' | 'STARTING' | 'BET_READY' | 'CHARGING' | 'SIMULATING' | 'RESULT';

@ccclass('PinballGame')
export class PinballGame extends Component {
  backend!: MockBackend;
  onBack!: () => void;

  private boardParent!: Node;
  private hudParent!: Node;
  private board!: Node;
  private ball: Node | null = null;
  private binGraphics: Node[] = [];
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
    this.buildExits();
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

    const title = makeLabel(this.board, '弹珠乐园', 30, new Color(255, 210, 60));
    title.node.setPosition(0, halfH - 66, 1);
    title.node.layer = GAME_LAYER;

    this.addBox(this.board, 0, halfH - 60 + wall / 2, W + wall * 2, wall, boardColor);
    this.addBox(this.board, -halfW - wall / 2, 0, wall, H, boardColor);
    this.addBox(this.board, halfW + wall / 2, 0, wall, H, boardColor);
    this.addBox(this.board, 0, -halfH - wall / 2 + 2, W + wall * 2, wall, boardColor);

    // 发射通道
    const laneW = m.laneWidth;
    const laneTop = -halfH + H * m.laneTopRatio;
    const laneX = halfW - laneW / 2;
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

    const laneInnerX = halfW - laneW - 10;
    const innerH = laneTop + halfH - 64;
    this.addBox(this.board, laneInnerX, (-halfH + 64 + laneTop) / 2, 14, innerH, boardColor);

    const bumpR = 45;
    const bump = this.addCircle(this.board, halfW, laneTop + 86, bumpR, new Color(52, 60, 104));
    const bumpG = bump.getComponent(Graphics)!;
    bumpG.lineWidth = 4;
    bumpG.strokeColor = new Color(185, 200, 240, 170);
    bumpG.circle(0, 0, bumpR - 2);
    bumpG.stroke();
    bumpG.fillColor = new Color(30, 35, 62);
    bumpG.circle(0, 0, bumpR - 14);
    bumpG.fill();

    this.addBox(this.board, laneX, -halfH + 38, laneW, 16, new Color(38, 44, 78));

    const plunger = new Node('plunger');
    plunger.addComponent(UITransform).setContentSize(laneW - 16, 64);
    const pg = plunger.addComponent(Graphics);
    pg.fillColor = new Color(205, 130, 64);
    pg.roundRect(-(laneW - 16) / 2, -32, laneW - 16, 64, 12);
    pg.fill();
    pg.fillColor = new Color(128, 74, 40);
    pg.roundRect(-(laneW - 16) / 2, 10, laneW - 16, 20, 6);
    pg.fill();
    plunger.setPosition(laneX, -halfH + 78, 0);
    this.board.addChild(plunger);
    this.plunger = plunger;
    this.plungerBaseY = -halfH + 78;

    // 钉阵
    const pegColor = new Color(196, 206, 235);
    const fieldL = -halfW + 46;
    const fieldR = laneInnerX - 20;
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
  }

  // 亮灯出口与出珠盒：屏幕正向，不随倾斜组旋转
  private buildExits() {
    const m = GameConfig.machine;
    const W = m.width;
    const H = m.height;
    const halfW = W / 2;
    const halfH = H / 2;
    const n = GameConfig.exitValues.length;
    const binW = (W - 12) / n;
    this.binW = binW;
    const root = new Node('exitsRoot');
    root.layer = Layers.Enum.UI_2D;
    this.hudParent.addChild(root);
    for (let i = 0; i < n; i++) {
      const cx = -halfW + 6 + binW * (i + 0.5);
      const bottom = this.addBox(root, cx, -halfH + 12, binW - 5, 24, new Color(54, 60, 96));
      this.setLayerRec(bottom, Layers.Enum.UI_2D);
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

      if (i > 0) {
        const divider = this.addBox(root, -halfW + 6 + binW * i, -halfH + 48, 5, 68, new Color(34, 39, 70));
        this.setLayerRec(divider, Layers.Enum.UI_2D);
      }
      const val = GameConfig.exitValues[i];
      const lab = makeLabel(
        bottom,
        val > 0 ? `${val}` : '沉',
        16,
        val > 0 ? new Color(215, 222, 248) : new Color(190, 120, 120)
      );
      lab.node.setPosition(0, 30, 1);
      lab.node.layer = Layers.Enum.UI_2D;
    }
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

    // 底部控制台
    const deck = makePanel(hud, W - 36, 232, Palette.panel, 18);
    deck.setPosition(0, -H / 2 + 136, 40);
    this.betLabel = makeLabel(deck, '', 26, Palette.text);
    this.betLabel.node.setPosition(-230, 56, 1);
    this.expectedLabel = makeLabel(deck, '', 20, Palette.sub);
    this.expectedLabel.node.setPosition(-230, 8, 1);

    this.startBtn = makeButton(deck, '开始游戏', 300, 96, () => this.startRound(), Palette.accent);
    this.startBtn.setPosition(0, -30, 1);

    this.addBtn = makeButton(deck, '加珠 +1', 180, 88, () => this.addBead(), Palette.accent2);
    this.addBtn.setPosition(-130, -36, 1);

    this.launchBtn = makeButton(deck, '按住拉杆\n松开发射', 300, 92, () => {}, Palette.accent);
    this.launchBtn.setPosition(140, -36, 1);
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

    // 蓄力条
    const barW = 330;
    const barBg = makePanel(hud, barW, 14, new Color(8, 10, 20), 7);
    barBg.setPosition(0, -H / 2 + 34, 40);
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

    const myId = this.roundId;
    this.scheduleOnce(() => {
      if (this.roundId === myId && !this.resolved) this.resolveExit(-1, 0);
    }, 15);
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
    if (this.cancelled || p < 0.04) {
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
    const r = Math.round(80 + this.power * 175);
    const gg = Math.round(200 - this.power * 4);
    const b = Math.round(255 - this.power * 255);
    g.fillColor = new Color(r, gg, b, 255);
    const w = Math.max(2, Math.round(this.barWidth * this.power));
    g.fillRect(-this.barWidth / 2, -6, w, 12);
  }

  private launch(power: number) {
    if (!this.ball) return;
    this.state = 'SIMULATING';
    this.launchBtn.active = false;
    this.addBtn.active = false;
    const m = GameConfig.machine;
    const vx = -(30 + 10 * power) + (Math.random() * 2 - 1) * m.launchSpeedX;
    const vy = m.launchSpeedMin + (m.launchSpeedMax - m.launchSpeedMin) * power;
    const rb = this.ball.getComponent(RigidBody2D)!;
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

  update(dt: number) {
    if (!this.charging) return;
    this.power = Math.min(1, this.power + dt / GameConfig.machine.chargeTime);
    this.updateChargeVisual();
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
    tray.setPosition(0, -H / 2 - 120, 60);
    this.resultTray = tray;
    tween(tray)
      .to(0.26, { position: new Vec3(0, -H / 2 + 252, 60) }, { easing: 'quadOut' })
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
    this.resultTray?.destroy();
    this.resultTray = null;
    this.resolved = false;
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
